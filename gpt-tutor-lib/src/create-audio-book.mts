import OpenAI from "openai";
import { join } from "path";
import {
  existsSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  readdirSync,
} from "fs";
import inquirer from "inquirer";
import {
  LearningGoals,
  LearningPlan,
  LessonDescription,
  createLearningPlan,
} from "./lib/create-learning-plan.js";
import { createTranscript } from "./lib/create-transcript.js";
import { convertAudioFormat, synthesizeAudio } from "./lib/synthesize-audio.js";
import { SpeechConfig } from "microsoft-cognitiveservices-speech-sdk";
import { Command } from "commander";

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
  type: "list",
  choices: ["gpt-3.5-turbo-16k", "gpt-4"],
  name: "model",
  message: "Enter GPT model",
  default: "gpt-3.5-turbo-16k",
});
const gptModel = gptModelPrompt.model;

const learningGoals: LearningGoals = {
  targetLanguage: "japanese",
  priorKnowledge: `I've done 100 lessons on duolingo, so i know some words like hello, goodbye, 
   some sentences like where is, my name is, some colors like white, red, how to say where and there, and some more simple stuff`,
  targetKnowledge:
    "As much as possible to be able to enjoy a three week vacation",
};

// const learningGoals: LearningGoals = {
//   targetLanguage: "italian",
//   priorKnowledge: `I am able to speak simple italian, as I have been there many times before and studied spanish.`,
//   targetKnowledge: "I want to be able to speak italian comfortably.",
// };

const program = new Command();
program.option(
  "-o, --output <path>",
  "output path to write to or resume from",
  `./output/${new Date().toISOString()}`
);
program.option("--skip-synth", "skip synthesizing");
program.parse();

const skipSynthesizing = program.getOptionValue("skipSynth");
const outputDir = program.getOptionValue("output");

const learningPlanFilename = "learning_plan.json";
const openAIClient = new OpenAI({ apiKey: openAIApiKey });
const speechConfig: SpeechConfig = SpeechConfig.fromSubscription(
  azureSpeechKey!,
  azureSpeechRegion!
);

if (!existsSync(outputDir)) {
  console.log("Creating output dir", outputDir);
  mkdirSync(outputDir, { recursive: true });
}

let learningPlan: LearningPlan;
let remainingLessons: LessonDescription[];

const learningPlanPath = join(outputDir, learningPlanFilename);
if (existsSync(learningPlanPath)) {
  learningPlan = JSON.parse(readFileSync(learningPlanPath, "utf-8"));

  const existingResults = readdirSync(outputDir);
  remainingLessons = learningPlan.lessons.filter(
    (lesson) => !existingResults.includes(lesson.title + ".mp3")
  );
  console.log(
    "Resuming with learning plan",
    remainingLessons.map((lesson) => lesson.title)
  );
} else {
  console.log("Generating learning plan...");
  learningPlan = await createLearningPlan(
    openAIClient,
    learningGoals,
    gptModel
  );
  console.log(
    "Generated learning plan:",
    learningPlan.lessons.map((lesson) => lesson.title)
  );
  writeFileSync(
    learningPlanPath,
    JSON.stringify(learningPlan, null, 2),
    "utf-8"
  );
  remainingLessons = learningPlan.lessons;
}

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

for (const lesson of remainingLessons) {
  console.log(`Creating lesson ${lesson.title}:${lesson.details}...`);
  const transcriptFilename = join(outputDir, lesson.title + ".xml");
  let transcript: string;
  if (existsSync(transcriptFilename)) {
    console.log("Reusing transcript");
    transcript = readFileSync(transcriptFilename, "utf-8");
  } else {
    console.log("Generating transcript");
    transcript = await createTranscript(
      openAIClient,
      learningPlan,
      lesson,
      learningGoals,
      gptModel
    );
    writeFileSync(transcriptFilename, transcript, "utf-8");
  }

  if (!skipSynthesizing) {
    console.log("Synthesizing audio");

    const audio = await synthesizeAudio(transcript, speechConfig);
    const mp3Buffer = await convertAudioFormat(
      Buffer.from(audio.audioData),
      "wav",
      "mp3"
    );
    writeFileSync(join(outputDir, lesson.title + ".mp3"), mp3Buffer);
  }
}

console.log("Complete. Files and transcripts are available in", outputDir);
