import { OpenAI } from "openai";
import { serve } from "server.ts";

import { corsHeaders } from "../_shared/cors.ts";
import {
  createAdminClient,
  createUserClient,
} from "../_shared/supabase-client.ts";
import {
  TranscriptParams,
  createLessonChatCompletionRequest,
} from "./prompts.ts";
import { CreateLessonRequest, Lesson } from "./types.ts";
import { Database } from "../_shared/database.types.ts";

const openai = new OpenAI({
  apiKey: "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",
});

serve(async (req) => {
  // todo: add auth
  // const authorization = req.headers.get("authorization");
  // if (!authorization) {
  //   return new Response(null, {
  //     status: 401,
  //     statusText: "Unauthorized",
  //     headers: corsHeaders,
  //   });
  // }

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(null, {
      status: 405,
      statusText: "Method Not Allowed",
      headers: corsHeaders,
    });
  }

  let createLessonRequest: CreateLessonRequest;
  try {
    createLessonRequest = await parseRequest(req);
  } catch {
    return new Response(null, {
      status: 400,
      statusText: "Unable to parse request",
      headers: corsHeaders,
    });
  }

  try {
    // todo: add auth
    const supabaseClient = await createAdminClient();

    const lesson = await createLesson(createLessonRequest, supabaseClient);
    const result = await saveLesson(
      supabaseClient,
      lesson,
      createLessonRequest.learningPlanItemId
    );

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error(e);
    return new Response(null, {
      status: 500,
      statusText: "Internal Server Error",
      headers: corsHeaders,
    });
  }
});

function isCreateLessonRequest(
  request: unknown
): request is CreateLessonRequest {
  return (
    typeof request === "object" &&
    request !== null &&
    typeof (request as CreateLessonRequest).learningPlanItemId === "number"
  );
}

async function parseRequest(req: Request): Promise<CreateLessonRequest> {
  const result = await req.json();
  if (!isCreateLessonRequest(result)) {
    throw new Error("Invalid request");
  }
  return result;
}

async function createLesson(
  createLessonRequest: CreateLessonRequest,
  supabaseClient: ReturnType<typeof createUserClient>
): Promise<Lesson> {
  const learningPlanItemQuery = await supabaseClient
    .from("learning_plan_items")
    .select("*, learning_plans(*)")
    .eq("id", createLessonRequest.learningPlanItemId);

  const learningPlanItem = learningPlanItemQuery?.data?.[0];
  if (!learningPlanItem || !learningPlanItem.learning_plans) {
    throw new Error("Could not find learning plan item");
  }

  const transcriptParams: TranscriptParams = {
    // todo: Avoid hardcoding
    // https://learn.microsoft.com/en-gb/azure/ai-services/speech-service/speech-synthesis-markup-voice
    // https://techcommunity.microsoft.com/t5/azure-ai-services-blog/azure-text-to-speech-updates-at-build-2021/ba-p/2382981
    baseLanguageVoice: "en-US-JennyNeural",
    targetLanguageVoice: "en-US-JennyNeural",
  };

  const completion = await openai.chat.completions.create(
    createLessonChatCompletionRequest(
      learningPlanItem.learning_plans,
      learningPlanItem,
      transcriptParams
    ),
    {
      timeout: 60000, // 60 seconds
    }
  );
  const answer = completion.choices[0].message.content;
  if (!answer) {
    throw new Error("No answer from OpenAI");
  }

  return {
    learningPlanItemId: createLessonRequest.learningPlanItemId,
    transcript: answer,
  };
}

async function saveLesson(
  supabaseClient: ReturnType<typeof createUserClient>,
  lesson: Lesson,
  learningPlanItemId: number
): Promise<Lesson> {
  // Should be done in a transaction, but Supabase doesn't support transactions yet..

  // Insert learning plan with goals and items
  const { data: lessonsData, error: lessonsError } = await supabaseClient
    .from("lessons")
    .insert({
      learning_plan_item_id: learningPlanItemId,
      transcript: lesson.transcript,
    })
    .select();

  const lessonId = lessonsData?.[0]?.id;
  if (lessonsError || !lessonId) {
    throw new Error("Error inserting learning plan");
  }

  return { ...lesson, id: lessonId };
}
