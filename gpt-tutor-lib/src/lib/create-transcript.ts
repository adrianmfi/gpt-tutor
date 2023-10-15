import { OpenAI } from "openai";
import { ChatCompletionCreateParamsNonStreaming } from "openai/resources/chat/index.mjs";
import {
  LearningGoals,
  LessonDescription,
  LearningPlan,
} from "./create-learning-plan.js";
import { ValidationError, XMLValidator } from "fast-xml-parser";

export async function createTranscript(
  openAIClient: OpenAI,
  learningPlan: LearningPlan,
  lesson: LessonDescription,
  goals: LearningGoals,
  model: ChatCompletionCreateParamsNonStreaming["model"] = "gpt-4",
  numRetries = 3
): Promise<string> {
  let retryCount = 0;
  while (retryCount < numRetries) {
    const systemPrompt = createSystemPrompt(learningPlan, lesson, goals);
    console.log(systemPrompt);
    const completion = await openAIClient.chat.completions.create({
      model,
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
      ],
    });
    let response = completion.choices[0].message.content;
    if (!response) {
      throw new Error("No response from OpenAI");
    }
    try {
      const parsed = JSON.parse(response);
      return convertToSSML(parsed);
    } catch (e) {
      console.log("Failed parsing, retrying", e);
      console.log(response);
    }
    retryCount++;
  }
  throw new Error("Unable to generate a valid transcript");
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

function createSystemPrompt(
  learningPlan: LearningPlan,
  lesson: LessonDescription,
  goals: LearningGoals
) {
  const introMessage =
    'something like "Now, let\'s learn ...", or "We will now ..."';
  const lessonIndex = learningPlan.lessons.findIndex(
    (learningPlanLesson) => learningPlanLesson.title === lesson.title
  );
  const priorLessons = learningPlan.lessons.slice(0, lessonIndex);
  const priorLessonsMessage =
    priorLessons.length === 0
      ? ""
      : `The lessons has already covered ${priorLessons
          .map((l) => l.details)
          .join(", ")}`;
  return `
You are a bot designed to create transcripts for audio listening lessons for learning a specified language.
The transcripts will be parsed and converted to audio by a text to speech system.
The base language is english (en-US), and you should use both english and the target language in the lesson.
Here are the supported target languages, you can only use one of these: ar-EG, ar-SA, ca-ES, cs-CZ, da-DK, de-AT, de-CH, de-DE, en-AU, en-CA, en-GB, en-HK, en-IE, en-IN, en-US, es-ES, es-MX, fi-FI, fr-BE, fr-CA, fr-CH, fr-FR, hi-IN, hu-HU, id-ID, it-IT, ja-JP, ko-KR, nb-NO, nl-BE, nl-NL, pl-PL, pt-BR, pt-PT, ru-RU, sv-SE, th-TH, tr-TR, zh-CN, zh-HK, zh-TW

You should return your lessons in JSON format. Here is the schema:
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

Your response should be able to parse with JSON.parse.
Don't add unnecessary whitespace. If you want to add newlines in a text, use \\\\n

Never, ever mix foreign and english words in the same lang. 
If you want to say a word or an example in the foreign language, you must use a new LanguagePart
You should NEVER mix the foreign language with english language, always use a new lang tag. Otherwise the text to speech system will fail, as it is not able to read "Tabemasu" properly with lang="en-US".
In other words, NEVER EVER do this:
[{"lang":"en-US","parts":[{"text":"It is pronounced as O-gen-ki desu ka?."}]}]
Instead, do something like this, where japanese is contained in an object with japanese "lang" statement
[{"lang":"en-US","parts":[{"text":"It is pronounced as: "}]},{"lang":"ja-JP","parts":[{"text":"お元気ですか？"}]}]
Use the target language's characters / grammar, for example for japanese: Instead of "Tabemasu", write 食べます

Keep "fluff" to a minimum, remember that this is a course for learning the language. 
Don't give a long introduction to the lesson.
Don't mention the users prior knowledge / learning goals etc. 
Start by saying ${introMessage}.
End the lesson by briefly summarizing, for example "In this lesson we've learned to say...".

Remember that a lesson typically contains repetition and pauses.
Don't repeat every word by saying "that's" and "once again", be more varied.
Don't ask/command the user to repeat a word, e.g. no sentences like "Repeat after me, are you ready".
After learning new words, consider repeating them again later in the lesson. For example:
"In norwegian, book is "bok"" ... and then a bit later in the lesson, after learning other things, something like "Remember, book is "bok""
When learning a new word, it can be helpful to include a sentence including the word.
When speaking a sentence, it can be helpful to explain each part of the sentence, e.g. something like:
"To say "How do I get there", you can say "Hvordan kommer jeg meg dit?". "Hvordan" - How, "Kommer jeg meg" - Do i get, "Dit" - there.
If the listener is learning very simple words they might not be ready for sentences yet.
Don't give the user compliments on their effort, e.g. no "good job!".

You can add breaks between words and sentences. Add a break when repeating a word.
Consider speaking a bit slower when teaching a word or sentence for the first time.

This concludes the specification. 
Here comes some example outputs. Keep in mind that these are short and simple examples, your transcript should be much longer and more varied.

Example:
[{"lang":"en-US","parts":[{"text":"Thank you!"}]},
{"lang":"ja-JP","parts":[{"break":"1s"},{"rate":"-20%","text":"ありがとうございます"}]}]

Another example:
[
{"lang":"en-US","parts":[{"text":"Here is a sentence example: \\"Please show me the menu.\\" In Japanese, this would be:"}]},
{"lang":"ja-JP","parts":[{"break":"1s"},{"rate":"-20%","text":"メニューを見せてください"}]},
{"lang":"en-US","parts":[{"break":"1s"},{"text":". Again, that's:"}]},
{"lang":"ja-JP","parts":[{"break":"1s"},{"text":"メニューを見せてください"}]},
{"lang":"en-US","parts":[{"break":"1s"},{"text":"Now let's move on to \\"reservation\\". In Japanese, this is:"}]},
{"lang":"ja-JP","parts":[{"rate":"-20%","text":"予約"},{"break":"1s"},{"text":"予約"}]}
]

The lesson description is:
The lesson is a part of a series for learning ${goals.targetLanguage}.
${priorLessonsMessage}
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
        Parsing this:
        ${transcript}
        
        failed with:
        ${error}

        Now, give me the corrected version (only give the corrected data, no other text or characters):
        `,
      },
    ],
  };
}
