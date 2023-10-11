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
  targetLanguage: "japanese",
  priorKnowledge: "basically nothing",
  targetKnowledge: "tourist level japanese for a three week vacation",
};
const outputDir = `./output/${new Date().toISOString()}`;
const speechConfig: SpeechConfig = SpeechConfig.fromSubscription(
  azureSpeechKey!,
  azureSpeechRegion!
);

console.log("Generating learning plan...");
const learningPlan = await createLearningPlan(
  openAIClient,
  learningGoals,
  gptModel
);

console.log(
  "Generated learning plan:",
  learningPlan.lessons.map((lesson) => lesson.title)
);

if (!existsSync(outputDir)) {
  mkdirSync(outputDir, { recursive: true });
}

writeFileSync(
  outputDir + "/learning_plan.json",
  JSON.stringify(learningPlan),
  "utf-8"
);

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

for (const lesson of learningPlan.lessons) {
  console.log(`Creating lesson ${lesson.title}:${lesson.details}...`);
  const transcript = await createTranscript(
    openAIClient,
    lesson,
    learningGoals,
    gptModel
  );
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
