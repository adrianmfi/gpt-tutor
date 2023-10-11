import { ChatCompletionCreateParamsNonStreaming } from "openai/resources/chat/completions.js";
import { Database } from "../_shared/database.types.ts";

export function createSystemPrompt() {
  return `You are a bot designed to create audio lessons for learning a specified language.`;
}

export type TranscriptParams = {
  baseLanguageVoice: string;
  targetLanguageVoice: string;
};

export function createUserPrompt(
  learningPlan: Database["public"]["Tables"]["learning_plans"]["Row"],
  learningPlanItem: Database["public"]["Tables"]["learning_plan_items"]["Row"],
  transcriptParams: TranscriptParams
) {
  return `
  You are given a lesson description, and will from that return the transcript for a self-contained audio lesson.
  The transcript must be given in the in the Speech Synthesis Markup Language (SSML).
  The base language is english, but you should use both english and the target language in the lesson.
  Remember that a typical listening lesson might contain repetition, explaining of words in english, pauses and more.

  The lesson description is:
  The lesson is a part of a series of ${learningPlan.number_of_lessons} lessons for learning ${learningPlan.target_language}.
  The listener already knows ${learningPlan.target_language_level}.
  The lesson must be close to ${learningPlan.lesson_duration} long.
  A multilingual voice is used, so use the same voice for english and the target language. The voice is: ${transcriptParams.baseLanguageVoice}
  Switch between languages with the xml:lang attribute.
  The lesson should talk about:
  Title: ${learningPlanItem.title}
  ${learningPlanItem.details}



  Important: 
  * Get the total transcribed audio length close to the desired duration.

  The SSML should begin with:
  <speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xmlns:mstts="https://www.w3.org/2001/mstts" xml:lang="string">
  An very simple example SSML:
  <speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xmlns:mstts="https://www.w3.org/2001/mstts" xml:lang="en-US">
    <voice name="en-US-JennyMultilingualNeural">
        <lang xml:lang="es-MX">
            ¡Esperamos trabajar con usted!
        </lang>
        <lang xml:lang="en-US">
           We look forward to working with you!
        </lang>
    </voice>
  </speak>

  Begin SSML for lesson:
  `;
}

export function createLessonChatCompletionRequest(
  learningPlan: Database["public"]["Tables"]["learning_plans"]["Row"],
  learningPlanItem: Database["public"]["Tables"]["learning_plan_items"]["Row"],
  transcriptParams: TranscriptParams
): ChatCompletionCreateParamsNonStreaming {
  return {
    model: "gpt-4",
    messages: [
      {
        role: "system",
        content: createSystemPrompt(),
      },
      {
        role: "user",
        content: createUserPrompt(
          learningPlan,
          learningPlanItem,
          transcriptParams
        ),
      },
    ],
  };
}
