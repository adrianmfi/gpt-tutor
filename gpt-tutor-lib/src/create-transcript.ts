import { OpenAI } from "openai";
import { ChatCompletionCreateParamsNonStreaming } from "openai/resources/chat/index.mjs";
import { LearningGoals, LessonDescription } from "./create-learning-plan.js";
import { ValidationError, XMLValidator } from "fast-xml-parser";

export async function createTranscript(
  openAIClient: OpenAI,
  lesson: LessonDescription,
  goals: LearningGoals,
  model: ChatCompletionCreateParamsNonStreaming["model"] = "gpt-4",
  numRetries = 3
): Promise<string> {
  const completion = await openAIClient.chat.completions.create(
    createTranscriptCompletionRequest(lesson, goals, model)
  );
  let response = completion.choices[0].message.content;
  if (!response) {
    throw new Error("No response from OpenAI");
  }

  let retryCount = 0;
  while (retryCount < numRetries) {
    try {
      const parsed = JSON.parse(response);
      return convertToSSML(parsed);
    } catch (e) {
      console.log("Failed parsing, retrying", e);
      const fixCompletion = await openAIClient.chat.completions.create(
        fixTranscriptCompletionRequest(response, JSON.stringify(e), model)
      );
      response = fixCompletion.choices[0].message.content as string | null;
      if (!response) {
        throw new Error("No response from OpenAI");
      }
    }
  }
  throw new Error("Unable to generate a valid transcript");
}

function createTranscriptCompletionRequest(
  lesson: LessonDescription,
  goals: LearningGoals,
  model: ChatCompletionCreateParamsNonStreaming["model"]
): ChatCompletionCreateParamsNonStreaming {
  return {
    model,
    messages: [
      {
        role: "system",
        content: createSystemPrompt(lesson, goals),
      },
    ],
  };
}

type LanguagePart =
  | {
      text: string;
      rate?: string;
    }
  | {
      break: string;
    };

type Transcript = {
  lang: string;
  parts: LanguagePart[];
}[];

export function parseTranscript(transcript: string): Transcript {
  return JSON.parse(transcript);
}

export function convertToSSML(parsed: Transcript): string {
  const voiceName = "en-US-RyanMultilingualNeural";
  let ssml = `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xmlns:mstts="http://www.w3.org/2001/mstts" xml:lang="en-US">\n`;

  for (const item of parsed) {
    ssml += `  <voice name="${voiceName}">\n`;
    ssml += `    <lang xml:lang="${item.lang}">\n`;

    for (const part of item.parts) {
      if ("text" in part) {
        if (part.rate) {
          ssml += `      <mstts:prosody rate="${part.rate}">
          ${part.text}
        </mstts:prosody>\n`;
        } else {
          ssml += `      ${part.text}\n`;
        }
      } else if ("break" in part) {
        ssml += `      <break time='${part.break}'/>\n`;
      }
    }

    ssml += `    </lang>\n  </voice>\n`;
  }

  ssml += `</speak>`;
  return ssml;
}

function createSystemPrompt(lesson: LessonDescription, goals: LearningGoals) {
  const introMessage = '"Welcome. This lesson will talk about..."';
  return `
You are a bot designed to create transcripts for audio listening lessons for learning a specified language.
The transcripts will be parsed and converted to audio by a text to speech system.

You are given a lesson description, and will from that return the transcript for a self-contained audio lesson.
The base language is english, and you should use both english and the target language in the lesson.
Here are the supported languages, you can only use one of these: ar-EG, ar-SA, ca-ES, cs-CZ, da-DK, de-AT, de-CH, de-DE, en-AU, en-CA, en-GB, en-HK, en-IE, en-IN, en-US, es-ES, es-MX, fi-FI, fr-BE, fr-CA, fr-CH, fr-FR, hi-IN, hu-HU, id-ID, it-IT, ja-JP, ko-KR, nb-NO, nl-BE, nl-NL, pl-PL, pt-BR, pt-PT, ru-RU, sv-SE, th-TH, tr-TR, zh-CN, zh-HK, zh-TW

Here is the schema which will be parsed with JSON.parse:
type LanguagePart =
  | {
      text: string;
      rate?: string;
    }
  | {
      break: string;
    };

type Transcript = {
  lang: string;
  parts: LanguagePart[];
}[];

Examples
\`\`\`
[{"lang":"en-US","parts":[{"text":"Thank you!"}]},
{"lang":"ja-JP","parts":[{"break":"1s"},{"rate":"-20%","text":"ありがとうございます"}]}]
\`\`\`
In other words, a modifier line starts with >. These lines modify the text that comes after. 
Lines without a modifier line is the text to read. You can have multiple successive text lines without a modifier.

Another example:
\`\`\`
[
{"lang":"en-US","parts":[{"text":"Here is a sentence example: \\"Please show me the menu.\\" In Japanese, this would be:"}]},
{"lang":"ja-JP","parts":[{"break":"1s"},{"rate":"-20%","text":"メニューを見せてください"}]},
{"lang":"en-US","parts":[{"break":"1s"},{"text":". Again, that's:"}]},
{"lang":"ja-JP","parts":[{"break":"1s"},{"text":"メニューを見せてください"}]},
{"lang":"en-US","parts":[{"break":"1s"},{"text":"Now let's move on to \\"reservation\\". In Japanese, this is:"}]},
{"lang":"ja-JP","parts":[{"rate":"-20%","text":"予約"},{"break":"1s"},{"text":"予約"}]}
]
\`\`\`

Don't add unnecessary whitespace. If you want to add newlines in a text, use \\\\n

Don't include the triple backticks in your output, these are just placed here to mark example boundaries.
The real transcript should be much longer than the simple example.
Keep in mind that these are short and simple examples, your output should be much longer and more varied.
Don't repeat every word by saying "that's" and "once again".
Remember to NOT mix foreign and english words in the same lang.

Start by saying ${introMessage}.
End the lesson by summarizing, for example "In this lesson we've learned...".

Keep "fluff" to a minimum. Don't mention the users prior knowledge / learning goals etc.
Don't ask/command the user to repeat a word, e.g. no sentences like "Repeat after me, are you ready".
Don't give the user compliments on their effort, as you don't know that they're actually repeating out loud.

When learning a new word, it is helpful to include a sentence including the word.
Remember that a lesson typically contains repetition and pauses.

Use the target language's characters / grammar, for example for japanese: Instead of "Tabemasu", write 食べます
You should NEVER speak the foreign language with english pronunciation, always use a new lang. Otherwise the text to speech system will

You can add breaks between words and sentences. Add a break when repeating a word.
Consider speaking a bit slower when teaching a word or sentence for the first time.


This concludes the specification.
The lesson description is:
The lesson is a part of a series for learning ${goals.targetLanguage}.
The listener has prior knowledge: ${goals.priorKnowledge}.
The lesson should talk about: ${lesson.title}: ${lesson.details}

Now, give me the transcript for the lesson:`;
}

function fixTranscriptCompletionRequest(
  transcript: string,
  error: string,
  model: ChatCompletionCreateParamsNonStreaming["model"]
): ChatCompletionCreateParamsNonStreaming {
  return {
    model,
    messages: [
      {
        role: "system",
        content: `
        Parsing the following vailed with:
        ${error}

        Give me a corrected version:
        ${transcript}
        `,
      },
    ],
  };
}
