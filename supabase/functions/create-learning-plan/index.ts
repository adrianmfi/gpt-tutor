import { OpenAI } from "openai";
import { serve } from "server.ts";

import { corsHeaders } from "../_shared/cors.ts";
import {
  createLearningPlanChatCompletionRequest,
  parseLearningPlan,
} from "./prompts.ts";
import {
  createAdminClient,
  createUserClient,
} from "../_shared/supabase-client.ts";
import {
  CreateLearningPlanRequest,
  CreatedLearningPlan,
  LearningPlan,
} from "./types.ts";

const openai = new OpenAI({});

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

  let learningGoalsRequest;
  try {
    learningGoalsRequest = await parseRequest(req);
  } catch {
    return new Response(null, {
      status: 400,
      statusText: "Unable to parse request",
      headers: corsHeaders,
    });
  }

  try {
    const learningPlan = await createLearningPlan(learningGoalsRequest);
    // todo: add auth
    const supabaseClient = await createAdminClient();
    const result: CreatedLearningPlan = await saveLearningPlan(
      supabaseClient,
      learningGoalsRequest,
      learningPlan
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

function isCreateLearningPlanRequest(
  request: unknown
): request is CreateLearningPlanRequest {
  return (
    typeof request === "object" &&
    request !== null &&
    typeof (request as CreateLearningPlanRequest).targetLanguage === "string" &&
    typeof (request as CreateLearningPlanRequest).numberOfLessons ===
      "number" &&
    typeof (request as CreateLearningPlanRequest).lessonDuration === "string" &&
    typeof (request as CreateLearningPlanRequest).targetLanguageLevel ===
      "string"
  );
}

async function parseRequest(req: Request): Promise<CreateLearningPlanRequest> {
  const result = await req.json();
  if (!isCreateLearningPlanRequest(result)) {
    throw new Error("Invalid request");
  }
  return result;
}

async function createLearningPlan(
  learningGoals: CreateLearningPlanRequest
): Promise<LearningPlan> {
  const completion = await openai.chat.completions.create(
    createLearningPlanChatCompletionRequest(learningGoals),
    {
      timeout: 60000, // 60 seconds
    }
  );
  const answer = completion.choices[0].message.content;
  if (!answer) {
    throw new Error("No answer from OpenAI");
  }

  return parseLearningPlan(answer);
}

async function saveLearningPlan(
  supabaseClient: ReturnType<typeof createUserClient>,
  learningGoals: CreateLearningPlanRequest,
  learningPlan: LearningPlan
): Promise<CreatedLearningPlan> {
  // Should be done in a transaction, but Supabase doesn't support transactions yet..

  // Insert learning plan with goals and items
  const { data: learningPlansData, error: learningPlansError } =
    await supabaseClient
      .from("learning_plans")
      .insert({
        lesson_duration: learningGoals.lessonDuration,
        number_of_lessons: learningGoals.numberOfLessons,
        target_language: learningGoals.targetLanguage,
        target_language_level: learningGoals.targetLanguageLevel,
      })
      .select();

  const learningPlanId = learningPlansData?.[0]?.id;
  if (learningPlansError || !learningPlanId) {
    throw new Error("Error inserting learning plan");
  }

  const { data: learningPlanItemsData, error: learningPlanItemsError } =
    await supabaseClient
      .from("learning_plan_items")
      .insert(
        learningPlan.items.map((item) => ({
          learning_plan_id: learningPlanId,
          title: item.title,
          details: item.details,
        }))
      )
      .select();

  if (learningPlanItemsError) {
    // try reverting
    await supabaseClient
      .from("learning_plans")
      .delete()
      .eq("id", learningPlanId);
    throw new Error("Error inserting learning plan items");
  }
  return { id: learningPlanId, items: learningPlanItemsData };
}
