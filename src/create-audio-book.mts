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

let openAIApiKey = process.env.OPENAI_API_KEY;
if (!openAIApiKey) {
  const prompt = await inquirer.prompt({
    type: "password",
    name: "key",
    message: "Enter OpenAI API key",
    validate: (value) => value.length > 0,
  });
  openAIApiKey = prompt.key as string;
}

let azureSpeechKey = process.env.AZURE_SPEECH_KEY;
if (!azureSpeechKey) {
  const prompt = await inquirer.prompt({
    type: "password",
    name: "key",
    message: "Enter Azure speech key",
    validate: (value) => value.length > 0,
  });
  azureSpeechKey = prompt.key as string;
}

let azureSpeechRegion = process.env.AZURE_SPEECH_REGION;
if (!azureSpeechRegion) {
  const prompt = await inquirer.prompt({
    type: "input",
    name: "region",
    message: "Enter Azure speech region",
    validate: (value) => value.length > 0,
  });
  azureSpeechRegion = prompt.region as string;
}

const outputDirPrompt = await inquirer.prompt({
  type: "input",
  name: "outputDir",
  message: `Where should the output be placed / path to resume from`,
  default: `./lessons/${new Date().toISOString()}`,
});

const outputDir = outputDirPrompt.outputDir;

const gptModelPrompt = await inquirer.prompt({
  type: "list",
  choices: ["gpt-3.5-turbo-16k", "gpt-4", "gpt-4-turbo", "gpt-4o"],
  name: "model",
  message: "Enter GPT model",
  default: "gpt-4o",
});
const gptModel = gptModelPrompt.model;

if (!existsSync(outputDir)) {
  console.log("Creating output dir", outputDir);
  mkdirSync(outputDir, { recursive: true });
}

const learningGoalsFilename = "learning_goals.json";
const learningGoalsPath = join(outputDir, learningGoalsFilename);
let learningGoals: LearningGoals;
if (existsSync(learningGoalsPath)) {
  learningGoals = JSON.parse(readFileSync(learningGoalsPath, "utf-8"));
} else {
  const targetLanguagePrompt = await inquirer.prompt({
    type: "input",
    name: "targetLanguage",
    message: "Which language do you want to learn?",
    default: "Japanese",
  });
  const targetLanguage = targetLanguagePrompt.targetLanguage;

  const priorKnowledgePrompt = await inquirer.prompt({
    type: "input",
    name: "priorKnowledge",
    message: `Describe your current knowledge of ${targetLanguage}`,
    default: `I've done 100 lessons on duolingo, so i know some words like hello, goodbye, 
  some sentences like where is, my name is, some colors like white, red, how to say where and there, and some more simple stuff`,
  });
  const priorKnowledge = priorKnowledgePrompt.priorKnowledge;

  const targetKnowledgePrompt = await inquirer.prompt({
    type: "input",
    name: "targetKnowledge",
    message: `What do you want to learn?`,
    default: "As much as possible to be able to enjoy a three week vacation",
  });

  const targetKnowledge = targetKnowledgePrompt.targetKnowledge;

  const numberOfLessonsPrompt = await inquirer.prompt({
    type: "number",
    name: "numberOfLessons",
    message: `How many lessons to generate?`,
    default: 100,
  });

  const numberOfLessons = numberOfLessonsPrompt.numberOfLessons;

  learningGoals = {
    targetKnowledge,
    targetLanguage,
    priorKnowledge,
    numberOfLessons,
  };
  writeFileSync(
    learningGoalsPath,
    JSON.stringify(learningGoals, null, 2),
    "utf-8"
  );
}
const openAIClient = new OpenAI({ apiKey: openAIApiKey });
const speechConfig: SpeechConfig = SpeechConfig.fromSubscription(
  azureSpeechKey,
  azureSpeechRegion
);

let learningPlan: LearningPlan;
let remainingLessons: LessonDescription[];

const learningPlanFilename = "learning_plan.json";
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

  console.log("Synthesizing audio");

  const audio = await synthesizeAudio(transcript, speechConfig);

  const mp3Buffer = await convertAudioFormat(audio, "wav", "mp3");
  writeFileSync(join(outputDir, lesson.title + ".mp3"), mp3Buffer);
}

console.log("Complete. Files and transcripts are available in", outputDir);
