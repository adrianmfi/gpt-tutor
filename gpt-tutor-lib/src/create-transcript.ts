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
You are a bot designed to create audio lessons for learning a specified language.

You are given a lesson description, and will from that return the transcript for a self-contained audio lesson.
The transcript must be given in the Speech Synthesis Markup Language (SSML).
The base language is english, but you should use both english and the target language in the lesson.
A multilingual voice is used, so use the same voice for english and the target language. The voice is: ${voiceName}
Prefer the target language's characters when using foreign words. 
Keep "fluff" to a minimum. Start by saying "Welcome to Adrian's AI lessons. This lesson will talk about...".  
End the lesson by summarizing.
"This lesson we've learned..."

Remember that a lesson typically contains repetition and pauses, and is spoken slower than a regular conversation, so include this in the output. 
When learning a new word, it is helpful to include a sentence including the word.
A word and sentence should typically be repeated several times, repetition is key to learning. Don't be terse, lessons should last for a while.

You should NEVER  speak the foreign language with english pronunciation.
This is therefore bad SSML:
\`\`\`
<lang xml:lang="en-US">
    Let's start with the verb "to eat", which in Japanese is "Tabemasu". 
</lang>
\`\`\`
This is better:
\`\`\`
<lang xml:lang="en-US">Let's start with the verb "to eat", which in Japanese is </lang><lang xml:lang="ja-JP"> 食べます </lang>
\`\`\`

The SSML should begin with:
\`<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xmlns:mstts="https://www.w3.org/2001/mstts" xml:lang="string">\`

You can use the \`prosody\` tag to adjust pronunciation and speaking rate. A good default amount might be -10%.

Here are the supported languages, you can only use one of these: ar-EG, ar-SA, ca-ES, cs-CZ, da-DK, de-AT, de-CH, de-DE, en-AU, en-CA, en-GB, en-HK, en-IE, en-IN, en-US, es-ES, es-MX, fi-FI, fr-BE, fr-CA, fr-CH, fr-FR, hi-IN, hu-HU, id-ID, it-IT, ja-JP, ko-KR, nb-NO, nl-BE, nl-NL, pl-PL, pt-BR, pt-PT, ru-RU, sv-SE, th-TH, tr-TR, zh-CN, zh-HK, zh-TW

An simple example of an SSML document:
\`\`\`
<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xmlns:mstts="https://www.w3.org/2001/mstts" xml:lang="en-US">
<voice name="${voiceName}">
  <prosody rate="-10%">
      <lang xml:lang="en-US">
        Welcome to Adrian's AI lessons. This lesson will talk about the Japanese verbs "to eat" and "to drink".
      </lang>
      <break time="1s"/>
      <lang xml:lang="en-US">
        Let's start with the verb "to eat", which in Japanese is 
      </lang>
    </prosody>
    <prosody rate="-20%">
      <lang xml:lang="ja-JP">
        食べます
      </lang>
    </prosody>
    <prosody rate="-10%">
      <break time="1s"/>
      <lang xml:lang="en-US">
          That's 
      </lang>
      <lang xml:lang="ja-JP">食べます</lang>
    </prosody>
  </voice>
</speak>
\`\`\`
Your transcript should be much longer than the simple example.

Extra Important:
Remember to repeat new words up to several times! Also, remember say new words extra slow, especially the first time(s) they are introduced! Finally, remember to not foreign and english words within the same <lang>.
 

Now, the lesson description is:
The lesson is a part of a series for learning ${goals.targetLanguage}.
The listener has prior knowledge: ${goals.priorKnowledge}.

The lesson should talk about: ${lesson.title}: ${lesson.details}

Begin SSML for lesson:
    `;
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
