import { serve } from "server.ts";

import { corsHeaders } from "../_shared/cors.ts";
import {
  createAdminClient,
  createUserClient,
} from "../_shared/supabase-client.ts";

import * as speechSdk from "microsoft-cognitiveservices-speech-sdk";
import { CreateAudioRequest } from "./types.ts";

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

  let createLessonRequest: CreateAudioRequest;
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

    const lesson = await createAudio(createLessonRequest, supabaseClient);
    const result = await saveAudio(
      supabaseClient,
      lesson.result,
      createLessonRequest.lessonId
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
): request is CreateAudioRequest {
  return (
    typeof request === "object" &&
    request !== null &&
    typeof (request as CreateAudioRequest).lessonId === "number"
  );
}

async function parseRequest(req: Request): Promise<CreateAudioRequest> {
  const result = await req.json();
  if (!isCreateLessonRequest(result)) {
    throw new Error("Invalid request");
  }
  return result;
}

type AudioResponse = {
  result: speechSdk.SpeechSynthesisResult;
};

async function createAudio(
  createAudioRequest: CreateAudioRequest,
  supabaseClient: ReturnType<typeof createUserClient>
): Promise<AudioResponse> {
  const lessonQuery = await supabaseClient
    .from("lessons")
    .select("transcript")
    .eq("id", createAudioRequest.lessonId);

  const lessonItem = lessonQuery?.data?.[0];
  if (!lessonItem) {
    throw new Error("Could not find lesson");
  }

  const speechConfig = speechSdk.SpeechConfig.fromSubscription(
    Deno.env.get("AZURE_SPEECH_KEY")!,
    Deno.env.get("AZURE_SPEECH_REGION")!
  );

  const pullAudioStream = speechSdk.PullAudioOutputStream.createPullStream();
  const audioConfig = speechSdk.AudioConfig.fromStreamOutput(pullAudioStream);
  speechConfig.speechSynthesisVoiceName = "en-US-RyanMultilingualNeural";

  const synthesizer = new speechSdk.SpeechSynthesizer(
    speechConfig,
    audioConfig
  );

  const text = `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xmlns:mstts="https://www.w3.org/2001/mstts" xml:lang="en-US">
  <voice name="en-US-RyanMultilingualNeural">
      <lang xml:lang="en-US">
          Welcome to our series of Japanese lessons. Today, we will be focusing on basic Japanese verbs and their conjugation in the present tense. 
      </lang>
      <break time="2s"/>
      <lang xml:lang="en-US">
          Let's start with the verb "to eat", which in Japanese is "Tabemasu". 
      </lang>
      <lang xml:lang="ja-JP">
          Tabemasu.
      </lang>
      <break time="2s"/>
      <lang xml:lang="en-US">
          Repeat after me, "Tabemasu".
      </lang>
      <break time="4s"/>
      <lang xml:lang="en-US">
          Excellent. The next verb is "to drink", or "Nomimasu" in Japanese.
      </lang>
      <lang xml:lang="ja-JP">
          Nomimasu.
      </lang>
      <break time="2s"/>
      <lang xml:lang="en-US">
          Please repeat, "Nomimasu".
      </lang>
      <break time="4s"/>
      <lang xml:lang="en-US">
          Great job. Now let's move on to the verb "to go", which is "Ikimasu" in Japanese.
      </lang>
      <lang xml:lang="ja-JP">
          Ikimasu.
      </lang>
      <break time="2s"/>
      <lang xml:lang="en-US">
          Please say, "Ikimasu".
      </lang>
      <break time="4s"/>
      <lang xml:lang="en-US">
          Well done. The next verb is "to see", or "Mimasu" in Japanese.
      </lang>
      <lang xml:lang="ja-JP">
          Mimasu.
      </lang>
      <break time="2s"/>
      <lang xml:lang="en-US">
          Repeat after me, "Mimasu".
      </lang>
      <break time="4s"/>
      <lang xml:lang="en-US">
          Excellent. The last verb for today is "to do", which is "Shimasu" in Japanese.
      </lang>
      <lang xml:lang="ja-JP">
          Shimasu.
      </lang>
      <break time="2s"/>
      <lang xml:lang="en-US">
          Please say, "Shimasu".
      </lang>
      <break time="4s"/>
      <lang xml:lang="en-US">
          Great job. Now, let's practice using these verbs in sentences. For example, if you want to say "I eat sushi", you would say "Watashi wa sushi o tabemasu" in Japanese.
      </lang>
      <lang xml:lang="ja-JP">
          Watashi wa sushi o tabemasu.
      </lang>
      <break time="2s"/>
      <lang xml:lang="en-US">
          Please repeat, "Watashi wa sushi o tabemasu".
      </lang>
      <break time="4s"/>
      <lang xml:lang="en-US">
          Excellent. Remember, practice makes perfect. Keep practicing these verbs and their conjugations and you'll be speaking Japanese in no time. 
      </lang>
      <break time="2s"/>
      <lang xml:lang="en-US">
          That's all for today's lesson. See you next time.
      </lang>
  </voice>
</speak>`;

  const result: speechSdk.SpeechSynthesisResult = await new Promise(
    (resolve, reject) =>
      //https://learn.microsoft.com/en-us/azure/ai-services/speech-service/how-to-speech-synthesis?tabs=browserjs%2Cterminal&pivots=programming-language-javascript#use-ssml-to-customize-speech-characteristics
      synthesizer.speakSsmlAsync(
        text,
        function (result) {
          if (
            result.reason === speechSdk.ResultReason.SynthesizingAudioCompleted
          ) {
            console.log("synthesis finished.");
            resolve(result);
          } else {
            console.error(
              "Speech synthesis canceled, " +
                result.errorDetails +
                "\nDid you set the speech resource key and region values?"
            );
            reject();
          }
          synthesizer.close();
        },
        function (err) {
          console.error("err - " + err);
          synthesizer.close();
          reject();
        }
      )
  );
  return {
    result,
  };
}

type SavedAudio = {};
async function saveAudio(
  supabaseClient: ReturnType<typeof createUserClient>,
  audio: speechSdk.SpeechSynthesisResult,
  lessonId: number
): Promise<SavedAudio> {
  // TODO: Add RLS
  const bucketId = "audio";
  const { data: bucketsData, error: bucketsError } =
    await supabaseClient.storage.listBuckets();
  if (!bucketsData?.find((b) => b.id === bucketId)) {
    const { data: createBucketData, error: createBucketError } =
      await supabaseClient.storage.createBucket(bucketId);
    console.log("creating bucket");
    if (createBucketError) {
      throw new Error("Error creating bucket");
    }
  }

  const { data: bucketData, error: bucketError } = await supabaseClient.storage
    .from(bucketId)
    .upload(`public/${new Date().toISOString()}.wav`, audio.audioData);

  return {};
}
