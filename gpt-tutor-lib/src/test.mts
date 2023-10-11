import OpenAI from "openai";
import { existsSync, mkdirSync, writeFileSync } from "fs";
import inquirer from "inquirer";
import { LearningGoals, createLearningPlan } from "./create-learning-plan.js";
import { createTranscript } from "./create-transcript.js";
import { convertAudioFormat, synthesizeAudio } from "./synthesize-audio.js";
import { SpeechConfig } from "microsoft-cognitiveservices-speech-sdk";

let openAIApiKey = process.env.OPENAI_API_KEY;
if (!openAIApiKey) {
  const prompt = await inquirer.prompt({
    type: "password",
    name: "key",
    message: "Enter OpenAI API key",
    validate: (value) => value.length > 0,
  });

  openAIApiKey = prompt.key!;
}

let azureSpeechKey = process.env.AZURE_SPEECH_KEY;
if (!azureSpeechKey) {
  const prompt = await inquirer.prompt({
    type: "password",
    name: "key",
    message: "Enter Azure speech key",
    validate: (value) => value.length > 0,
  });

  azureSpeechKey = prompt.key!;
}

let azureSpeechRegion = process.env.AZURE_SPEECH_REGION;
if (!azureSpeechRegion) {
  const prompt = await inquirer.prompt({
    type: "input",
    name: "region",
    message: "Enter Azure speech region",
    validate: (value) => value.length > 0,
  });

  azureSpeechRegion = prompt.region!;
}

const gptModelPrompt = await inquirer.prompt({
  type: "input",
  name: "model",
  message: "Enter GPT model",
  default: "gpt-3.5-turbo",
});

const gptModel = gptModelPrompt.model;

const openAIClient = new OpenAI({ apiKey: openAIApiKey });
const learningGoals: LearningGoals = {
  targetLanguage: "norwegian",
  priorKnowledge: "basically nothing",
  targetKnowledge: "tourist level norwegian for a two week vacation",
};
const outputDir = `./output/${new Date().toISOString()}`;
const speechConfig: SpeechConfig = SpeechConfig.fromSubscription(
  azureSpeechKey!,
  azureSpeechRegion!
);

console.log("Generating learning plan...");
// const learningPlan = await createLearningPlan(
//   openAIClient,
//   learningGoals,
//   gptModel
// );

// console.log(
//   "Generated learning plan:",
//   learningPlan.lessons.map((lesson) => lesson.title)
// );

if (!existsSync(outputDir)) {
  mkdirSync(outputDir, { recursive: true });
}

// writeFileSync(
//   outputDir + "/learning_plan.json",
//   JSON.stringify(learningPlan),
//   "utf-8"
// );

const answers = await inquirer.prompt<{
  confirm: boolean;
}>([
  {
    type: "confirm",
    name: "confirm",
    message: "Create lessons",
  },
]);

if (!answers.confirm) {
  process.exit(0);
}

const learningPlan = {
  lessons: [
    {
      title: "Foobar",
      details: "vaz",
      transcript: `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xmlns:mstts="https://www.w3.org/2001/mstts" xml:lang="en-US">
      <voice name="en-US-RyanMultilingualNeural">
        <prosody rate="-10%">
          <lang xml:lang="en-US">
            Welcome to Adrian's AI lessons. This lesson will talk about an introduction to Norwegian greetings. We'll learn to say "Hello", "Goodbye", "Please", and "Thank you" in Norwegian.
          </lang>
        <break time="2s"/>
      
        <lang xml:lang="en-US">
          Let's start with "Hello", which in Norwegian is
        </lang>
        </prosody>
        <prosody rate="-20%">
        <lang xml:lang="nb-NO">
          Hallo
        </lang>
        </prosody>
      
        <prosody rate="-10%">
        <break time="1s"/>
        <lang xml:lang="en-US">
          That's 
        </lang>
        <lang xml:lang="nb-NO">Hallo</lang>
        </prosody>
        <break time="1s"/>
      
        <prosody rate="-10%">
        <lang xml:lang="en-US">
          Again, "Hello" in Norwegian is
        </lang>
        </prosody>
        
        <prosody rate="-20%">
        <lang xml:lang="nb-NO">
          Hallo
        </lang>
        </prosody>
      
        <prosody rate="-10%">
        <break time="2s"/>
        <lang xml:lang="en-US">
          Great, now let's move on to "Goodbye". In Norwegian, you would say
        </lang>
        </prosody>
          
        <prosody rate="-20%">
        <lang xml:lang="nb-NO">
          Ha det
        </lang>
        </prosody>
      
        <prosody rate="-10%"><break time="1s"/><lang xml:lang="en-US">
          Let's repeat that. "Goodbye" in Norwegian is
        </lang></prosody>
      
        <prosody rate="-20%">
        <lang xml:lang="nb-NO">
          Ha det
        </lang>
        </prosody>
      
        <prosody rate="-10%"><break time="2s"/><lang xml:lang="en-US">
          Now, let's learn "Please". "Please" in Norwegian is
        </lang></prosody>
      
        <prosody rate="-20%">
        <lang xml:lang="nb-NO">Vennligst</lang></prosody>
        
        <prosody rate="-10%"><break time="1s"/><lang xml:lang="en-US">
          Again, "Please" in Norwegian is
        </lang></prosody>
      
        <prosody rate="-20%">
        <lang xml:lang="nb-NO">Vennligst</lang></prosody>
      
        <prosody rate="-10%"><break time="2s"/><lang xml:lang="en-US">
          Lastly, let's learn "Thank you". "Thank you" in Norwegian is
        </lang></prosody>
      
        <prosody rate="-20%">
        <lang xml:lang="nb-NO">Takk</lang></prosody>
      
        <prosody rate="-10%"><break time="1s"/><lang xml:lang="en-US">
          Let's repeat that one more time. "Thank you" in Norwegian is
        </lang></prosody>
      
        <prosody rate="-20%">
        <lang xml:lang="nb-NO">Takk</lang></prosody>
      
        <prosody rate="-10%"><break time="2s"/><lang xml:lang="en-US">
          This lesson we've learned to say "Hello", "Goodbye", "Please", and "Thank you" in Norwegian. Keep practicing with these greetings and you'll be sure to impress any Norwegian speaker you meet. Remember, repetition is key to learning. So, once again: "Hello" is <lang xml:lang="nb-NO">Hallo</lang>, "Goodbye" is <lang xml:lang="nb-NO">Ha det</lang>, "Please" is <lang xml:lang="nb-NO">Vennligst</lang>, and "Thank you" is <lang xml:lang="nb-NO">Takk</lang>. We hope this lesson has been helpful to you. 
        </lang></prosody>   
      </voice>
      </speak>`,
    },
  ],
};

for (const lesson of learningPlan.lessons) {
  console.log(`Creating lesson ${lesson.title}:${lesson.details}...`);
  // const transcript = await createTranscript(
  //   openAIClient,
  //   lesson,
  //   learningGoals,
  //   gptModel
  // );
  const transcript = lesson.transcript;
  writeFileSync(outputDir + "/" + lesson.title + ".txt", transcript, "utf-8");

  const audio = await synthesizeAudio(transcript, speechConfig);
  const mp3Buffer = await convertAudioFormat(
    Buffer.from(audio.audioData),
    "wav",
    "mp3"
  );
  writeFileSync(outputDir + "/" + lesson.title + ".mp3", mp3Buffer);
}

console.log("Complete. Files and transcripts are available in", outputDir);
