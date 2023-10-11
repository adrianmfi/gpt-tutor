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
  createLearningPlan,
} from "./create-learning-plan.js";
import { createTranscript } from "./create-transcript.js";
import { convertAudioFormat, synthesizeAudio } from "./synthesize-audio.js";
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
  type: "input",
  name: "model",
  message: "Enter GPT model",
  default: "gpt-3.5-turbo",
});
const gptModel = gptModelPrompt.model;

const learningGoals: LearningGoals = {
  targetLanguage: "japanese",
  priorKnowledge: "basically nothing",
  targetKnowledge: "tourist level japanese for a three week vacation",
};

const program = new Command();
program.option("-r, --resume <path>", "resume from path");
program.option("--skip-synth", "skip synthesizing");
program.parse();
const resume = program.getOptionValue("resume");
const skipSynthesizing = program.getOptionValue("skip-synth");

const outputDir = resume ?? `./output/${new Date().toISOString()}`;

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
let lessonStartIndex = 0;

if (resume) {
  learningPlan = JSON.parse(
    readFileSync(join(resume, learningPlanFilename), "utf-8")
  );
  console.log(
    "Resuming with learning plan:",
    learningPlan.lessons.map((lesson) => lesson.title)
  );
  const existingResults = readdirSync(resume);
  for (let i = 0; i < learningPlan.lessons.length; i++) {
    const lesson = learningPlan.lessons[i];
    if (!existingResults.includes(lesson.title + ".mp3")) {
      console.log("starting at ", lesson.title);
      lessonStartIndex = i;
      break;
    }
  }
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
    join(outputDir, learningPlanFilename),
    JSON.stringify(learningPlan),
    "utf-8"
  );
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

for (let i = lessonStartIndex; i < learningPlan.lessons.length; i++) {
  const lesson = learningPlan.lessons[i];
  console.log(`Creating lesson ${lesson.title}:${lesson.details}...`);
  const transcript = await createTranscript(
    openAIClient,
    lesson,
    learningGoals,
    gptModel
  );
  writeFileSync(join(outputDir, lesson.title + ".xml"), transcript, "utf-8");

  if (!skipSynthesizing) {
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
