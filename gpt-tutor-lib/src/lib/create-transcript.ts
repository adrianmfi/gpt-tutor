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
  const introMessage =
    'something like "Now, let\'s learn ...", or "We will now ..."';
  const lessonIndex = learningPlan.lessons.findIndex(
    (learningPlanLesson) => learningPlanLesson.title === lesson.title
  );
  const priorLessons = learningPlan.lessons.slice(0, lessonIndex);
  const priorLessonsMessage =
    priorLessons.length === 0
      ? ""
      : `The lessons have already covered: "${priorLessons
          .map((l) => l.details)
          .join(", ")}"`;

  const supportedLanguages =
    "ar-EG, ar-SA, ca-ES, cs-CZ, da-DK, de-AT, de-CH, de-DE, en-AU, en-CA, en-GB, en-HK, en-IE, en-IN, en-US, es-ES, es-MX, fi-FI, fr-BE, fr-CA, fr-CH, fr-FR, hi-IN, hu-HU, id-ID, it-IT, ja-JP, ko-KR, nb-NO, nl-BE, nl-NL, pl-PL, pt-BR, pt-PT, ru-RU, sv-SE, th-TH, tr-TR, zh-CN, zh-HK, zh-TW";
  return `You are tasked with creating transcripts for audio lessons targeting language learners.
  These transcripts will be converted to audio via a text-to-speech system.
  The base language is English, and the lesson will incorporate both English and a target language.
  Here are the supported languages: ${supportedLanguages}

  Instructions:
  * Always wrap the foreign language with <lang language-to-speak>Foreign language to speak</lang>.
  * Use the target language's writing system. Instead of "Tabemasu", write "食べます". For japanese, use hiragana and katakana over kanji.
  * Start lessons with ${introMessage}.
  * Conclude by summarizing, e.g., "In this lesson, we've learned...", but keep it brief
  * Introduce new words with context and possibly a sentence for usage. When using a sentence, explain the sentence part by part.
  * Avoid lengthy introductions, assumptions about user knowledge, or praising the user.

  Example Outputs:
  * Example 1 - Words for directions:
  Now we're going to learn the words for 'left', 'right', 'straight ahead', and 'turn'.
  First up is the word for 'left', which in Japanese is: <lang lang="ja-JP">左</lang>.
  Once more, 'left' is: <lang lang="ja-JP">左</lang>.
  A helpful phrase would be: "Go left" which translates to: <lang lang="ja-JP">左に行って下さい</lang>.
  And again, 'Go left' is: <lang lang="ja-JP">左に行って下さい</lang>.

  Now we will learn the word 'right'. In Japanese, right is: <lang lang="ja-JP">右</lang>.
  Once more, 'right' is: <lang lang="ja-JP">右</lang>.
  A useful phrase would be: "Turn right", which translates to: <lang lang="ja-JP">右に曲がって下さい</lang>.
  And again, 'Turn right' is: <lang lang="ja-JP">右に曲がって下さい</lang>.

  Next, we'll tackle the phrase 'straight ahead'. In Japanese, straight ahead is: <lang lang="ja-JP">まっすぐ</lang>.
  Once more, 'straight ahead' is: <lang lang="ja-JP">まっすぐ</lang>.
  A phrase would be: "Go straight ahead", which translates to: <lang lang="ja-JP">まっすぐ進んで下さい</lang>.
  And again, 'Go straight ahead' is: <lang lang="ja-JP">まっすぐ進んで下さい</lang>.

  Lastly, let's learn the word for 'turn'. In Japanese, 'turn' is: <lang lang="ja-JP">曲がる</lang>.
  To reiterate, 'turn' is: <lang lang="ja-JP">曲がる</lang>.
  For instance, "Turn at the corner" in Japanese would be: <lang lang="ja-JP">角で曲がって下さい</lang>.
  Repeating, "Turn at the corner" is: <lang lang="ja-JP">角で曲がって下さい</lang>.
  
  To summarize:
  Left: <lang lang="ja-JP">左</lang>.
  Right: <lang lang="ja-JP">右</lang>.
  Straight ahead: <lang lang="ja-JP">まっすぐ</lang>.
  Turn: <lang lang="ja-JP">曲がる</lang>.

  In this lesson, we learned how to say 'left' as <lang lang="ja-JP">左</lang>, 'right' as <lang lang="ja-JP">右</lang>, 'straight ahead' as <lang lang="ja-JP">まっすぐ</lang>, and 'turn' as <lang lang="ja-JP">曲がる</lang>. Keep practicing and soon these words will become second nature to you!
  
  * Example 2 - At the Restaurant Conversation:
  In this lesson, we will practice a conversation in a Norwegian restaurant setting using vocabulary and phrases you've already learned.
  Imagine you're at a restaurant in Oslo. You're about to order your meal.
  
  First up, to catch the waiter's attention with "excuse me", the phrase in Norwegian is <lang lang="nb-NO">Unnskyld</lang>.
  Try saying it out loud: <lang lang="nb-NO">Unnskyld</lang>.
  
  Next, to request something with "may I have", use <lang lang="nb-NO">Kan jeg få</lang>.
  Go ahead and practice: <lang lang="nb-NO">Kan jeg få</lang>.
  
  Combine these to ask for the menu: <lang lang="nb-NO">Unnskyld, kan jeg få menyen?</lang>.
  Let's hear you say it: <lang lang="nb-NO">Unnskyld, kan jeg få menyen?</lang>.
  
  To which the waiter replies "Here you go", or in Norwegian <lang lang="nb-NO">Vær så god</lang>.
  Practice the waiter's response: <lang lang="nb-NO">Vær så god</lang>.
  
  When you're ready to order and want to say "I would like", use <lang lang="nb-NO">Jeg vil gjerne ha</lang>.
  Give it a try: <lang lang="nb-NO">Jeg vil gjerne ha</lang>.
  
  If the waiter asks "Is everything okay?", the phrase in Norwegian is <lang lang="nb-NO">Er alt i orden?</lang>.
  Mimic the waiter: <lang lang="nb-NO">Er alt i orden?</lang>.
  
  To respond with "Yes, thank you", say <lang lang="nb-NO">Ja, takk</lang>.
  Your turn: <lang lang="nb-NO">Ja, takk</lang>.
  
  Finally, to ask for the bill, the phrase is <lang lang="nb-NO">Kan jeg få regningen</lang>.
  Last one for now: <lang lang="nb-NO">Kan jeg få regningen</lang>.
  
  The waiter might say "Certainly", which translates to <lang lang="nb-NO">Selvfølgelig</lang>.
  Learn the waiter's line: <lang lang="nb-NO">Selvfølgelig</lang>.
  
  This concludes the lesson. You're now equipped with key phrases for a restaurant experience in Norway.

  Lesson objective:
  The lesson is a part of a series for learning ${goals.targetLanguage}.
  ${priorLessonsMessage}
  The lesson should talk about: Learning ${goals.targetLanguage} ${lesson.title}: ${lesson.details}
  Provide the transcript for the lesson:`;
}
