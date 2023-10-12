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
    const validationResult = XMLValidator.validate(response);
    if (validationResult === true) {
      return response;
    }
    console.log(
      "XML validation did not succeed, retrying",
      response,
      validationResult
    );

    const fixCompletion = await openAIClient.chat.completions.create(
      fixTranscriptCompletionRequest(response, validationResult, model)
    );
    response = fixCompletion.choices[0].message.content as string | null;
    if (!response) {
      throw new Error("No response from OpenAI");
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

function createSystemPrompt(lesson: LessonDescription, goals: LearningGoals) {
  const voiceName = "en-US-RyanMultilingualNeural";
  return `
You are a bot designed to create audio listening lessons for learning a specified language.

You are given a lesson description, and will from that return the transcript for a self-contained audio lesson.
The transcript must be given in the Speech Synthesis Markup Language (SSML).
The base language is english, but you should use both english and the target language in the lesson.
A multilingual voice is used, so use the same voice for english and the target language. The voice is: ${voiceName}
Prefer the target language's characters when using foreign words. 
Keep "fluff" to a minimum. Start by saying "Welcome. This lesson will talk about...".  
End the lesson by summarizing.
"This lesson we've learned..."

Remember that a lesson typically contains repetition and pauses.
When learning a new word, it is helpful to include a sentence including the word.

You should NEVER speak the foreign language with english pronunciation.
This is therefore bad:
<lang xml:lang="en-US">
    Let's start with the verb "to eat", which in Japanese is "Tabemasu". 
</lang>
This is better:
<lang xml:lang="en-US">Let's start with the verb "to eat", which in Japanese is: </lang><lang xml:lang="ja-JP"> 食べます </lang>.

The SSML should begin with:
\`<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xmlns:mstts="https://www.w3.org/2001/mstts" xml:lang="string">\`

Here are the supported languages, you can only use one of these: ar-EG, ar-SA, ca-ES, cs-CZ, da-DK, de-AT, de-CH, de-DE, en-AU, en-CA, en-GB, en-HK, en-IE, en-IN, en-US, es-ES, es-MX, fi-FI, fr-BE, fr-CA, fr-CH, fr-FR, hi-IN, hu-HU, id-ID, it-IT, ja-JP, ko-KR, nb-NO, nl-BE, nl-NL, pl-PL, pt-BR, pt-PT, ru-RU, sv-SE, th-TH, tr-TR, zh-CN, zh-HK, zh-TW

Remember to add breaks between words and sentences, especially when changing languages. Add breaks between sentences by using periods and colon. Add breaks between repetitions in the same language with line breaks. 
An simple example:
<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis"
    xmlns:mstts="https://www.w3.org/2001/mstts" xml:lang="en-US">
    <voice name="en-US-RyanMultilingualNeural">
        <lang xml:lang="en-US">
            Welcome. This lesson will talk about the Japanese verbs "to eat" and "to drink".
            First, let's learn the phrase for "please". In Japanese, we say:
        </lang>
        <lang xml:lang="ja-JP">お願いします</lang>
        <lang xml:lang="en-US">. That's: </lang>
        <lang xml:lang="ja-JP">お願いします</lang>
        <lang xml:lang="en-US">. Once again:</lang>
        <lang xml:lang="ja-JP">
            お願いします
        </lang>
    </voice>
</speak>

The real transcript should be much longer than the simple example.
Keep in mind that this is just an example, your output should be more varied. Don't repeat every word by saying "that's" and "once again".


Remember to NOT use foreign and english words in the same <lang/>.

Now, the lesson description is:
The lesson is a part of a series for learning ${goals.targetLanguage}.
The listener has prior knowledge: ${goals.priorKnowledge}.
The lesson should talk about: ${lesson.title}: ${lesson.details}

Now, give me the SSML for the lesson:`;
}

function fixTranscriptCompletionRequest(
  transcript: string,
  validationError: ValidationError,
  model: ChatCompletionCreateParamsNonStreaming["model"]
): ChatCompletionCreateParamsNonStreaming {
  return {
    model,
    messages: [
      {
        role: "system",
        content: `
        Parsing the following XML vailed with:
        ${JSON.stringify(validationError)}

        Give me a corrected XML of this XML:
        ${transcript}
        `,
      },
    ],
  };
}
