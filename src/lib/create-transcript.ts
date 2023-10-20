import { OpenAI } from "openai";
import { ChatCompletionCreateParamsNonStreaming } from "openai/resources/chat/index.mjs";
import {
  LearningGoals,
  LessonDescription,
  LearningPlan,
} from "./create-learning-plan.js";

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
    retryCount++;

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
    console.log(response);
    if (!response) {
      throw new Error("No response from OpenAI");
    }
    try {
      const parsed = parseTranscript(response);
      return convertToSSML(parsed);
    } catch (e) {
      console.log("Failed parsing, retrying", e);
      console.log(response);
    }
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
  const parsed: Transcript = [];
  let startPos = 0;
  while (true) {
    const nextOccurrence = transcript.indexOf("<lang", startPos);
    if (nextOccurrence === -1) {
      parsed.push({
        lang: "en-US",
        parts: [{ text: transcript.slice(startPos) }],
      });
      break;
    } else {
      parsed.push({
        lang: "en-US",
        parts: [
          { break: "1s" },
          { text: transcript.slice(startPos, nextOccurrence) },
          { break: "1s" },
        ],
      });
      const beginLang = nextOccurrence + '<lang lang="'.length;
      const endLang = transcript.indexOf('"', beginLang);
      const lang = transcript.slice(beginLang, endLang);

      const beginText = transcript.indexOf(">", nextOccurrence) + 1;
      const endText = transcript.indexOf("</lang>", beginText);
      parsed.push({
        lang,
        parts: [{ text: transcript.slice(beginText, endText), rate: "-20%" }],
      });
      startPos = endText + "</lang>".length;
    }
  }
  return parsed;
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
  const lessonIndex = learningPlan.lessons.findIndex(
    (learningPlanLesson) => learningPlanLesson.title === lesson.title
  );
  const priorLessons = learningPlan.lessons.slice(0, lessonIndex);
  const priorLessonsMessage =
    priorLessons.length === 0
      ? ""
      : `Most recently, lessons have covered: "${priorLessons
          .slice(-5)
          .map((l) => l.details)
          .join(", ")}"`;

  const supportedLanguages =
    "ar-EG, ar-SA, ca-ES, cs-CZ, da-DK, de-AT, de-CH, de-DE, en-AU, en-CA, en-GB, en-HK, en-IE, en-IN, en-US, es-ES, es-MX, fi-FI, fr-BE, fr-CA, fr-CH, fr-FR, hi-IN, hu-HU, id-ID, it-IT, ja-JP, ko-KR, nb-NO, nl-BE, nl-NL, pl-PL, pt-BR, pt-PT, ru-RU, sv-SE, th-TH, tr-TR, zh-CN, zh-HK, zh-TW";
  return `You are a bot tasked with generating a transcript personalized audio lesson.
Your transcript will be converted to audio by a text-to-speech API without human intervention.
The lesson is a part of a series of lessons for a user learning a specified language.
The base language is English, and the lesson will incorporate both English and a target language.
Here are the supported languages: ${supportedLanguages}

An audio lesson could for example include:
* Introduction of new vocabulary, contextualized and potentially illustrated through a sample sentence.
* Consideration of the listener's current skill level and progress; avoid complex examples when introducing basic terms and skip elementary explanations in an intermediate lesson.
* For sentence instruction at beginner levels, dissect the sentence to explain each word's meaning and usage. Intermediate lessons may not require this level of detail.

The transcript should read as a regular text, with one notable exception: enclose any foreign words in <lang lang="name-of-language"></lang> tags to ensure correct pronunciation. This is vital for text-to-speech to work.

Here are some shortened examples:
* Example 1 - Words for directions:
Let's go through the words for 'left' and 'right'.

First up is the word for 'left', which in Japanese is: <lang lang="ja-JP">左</lang>.
Once more, 'left' is: <lang lang="ja-JP">左</lang>.
You could for example say "Go left" which translates to: <lang lang="ja-JP">左に行って下さい</lang>.
Again, 'Go left' is: <lang lang="ja-JP">左に行って下さい</lang>.

Now we will learn the word 'right'. In Japanese, right is: <lang lang="ja-JP">右</lang>.
Again, 'right' is: <lang lang="ja-JP">右</lang>.
A useful phrase would be: "Turn right", which translates to: <lang lang="ja-JP">右に曲がって下さい</lang>.
And again, 'Turn right' is: <lang lang="ja-JP">右に曲がって下さい</lang>.

We have now learned how to say 'left' as <lang lang="ja-JP">左</lang>, 'right' as <lang lang="ja-JP">右</lang>

* Example 2 - Conversation at the Restaurant:
We will now practice a conversation in a Norwegian restaurant setting.
Imagine you're at a restaurant in Oslo. You're about to order your meal.

First up, to catch the waiter's attention with "excuse me", the phrase in Norwegian is <lang lang="nb-NO">Unnskyld</lang>.
Once more: <lang lang="nb-NO">Unnskyld</lang>.

Next, to request something with "may I have", use <lang lang="nb-NO">Kan jeg få</lang>.
Go ahead and practice: <lang lang="nb-NO">Kan jeg få</lang>.

Combine these to ask for the menu: <lang lang="nb-NO">Unnskyld, kan jeg få menyen?</lang>.
Again: <lang lang="nb-NO">Unnskyld, kan jeg få menyen?</lang>.

To which the waiter might respond "Here you go", or in Norwegian <lang lang="nb-NO">Vær så god</lang>.
Repeating the waiter's response: <lang lang="nb-NO">Vær så god</lang>.

This concludes the conversation at the restaurant.

Consider the examples for inspiration, but tailor your transcript to the specific lesson's context. For instance, offer pertinent details about word or sentence usage, and adjust the introductory message based on the lesson's subject matter. Don't hesitate to create longer lessons or conversations.

Strictly adhere to the following rules:
* Never refer to the lesson as "Today's lesson" because the user may consume multiple lessons in one day.
* Always use the target language's native writing system, such as using 食べます instead of Tabemasu.
* Initiate each lesson with a concise introductory sentence outlining the lesson's content.
* If including a conclusion, keep it exceptionally brief.
* Generate fully formed, example-based sentences. Do NOT, NEVER, IN ANY WAY include any form of placeholders, empty values or variables (such as ..., ~, [name], ___ or similar), as they are incompatible with the text-to-speech system we are using.
* ALWAYS enclose target language text within mandatory <lang lang="lang-to-speak">Target language words to speak</lang> tags. For example: In Italian, "hello" is <lang lang="it-IT">ciao</lang>.
* DO NOT, NEVER anglice foreign words and place them in the English sections, as this affects text-to-speech pronunciation accuracy.
* ALWAYS keep English text outside of <lang/> tags, to prevent text-to-speech pronunciation issues.

Remember that your transcript will be passed directly to an (unintelligent) text-to-speech system.
Do not add placeholders or variables (such as ..., ~, [name], ___ or similar) to the transcript. Make up a suitable example instead.
Do not add placeholders or variables (such as ..., ~, [name], ___ or similar) to the transcript. Make up a suitable example instead.

Current lesson objective:
The target language is ${goals.targetLanguage}.
The user has prior knowledge: ${goals.priorKnowledge}
${priorLessonsMessage}
The lesson should talk about: Learning ${goals.targetLanguage} lesson ${lesson.title}: ${lesson.details}
Now provide the transcript to feed to the text-to-speech-system:`;
}
