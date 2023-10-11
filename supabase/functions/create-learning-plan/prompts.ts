import {
  CreateLearningPlanRequest,
  LearningPlan,
  LearningPlanItem,
} from "./types.ts";
import { ChatCompletionCreateParamsNonStreaming } from "openai/resources/chat/completions.js";

export function parseLearningPlan(response: string): LearningPlan {
  const items: LearningPlanItem[] = [];
  const regex = /Lesson: (.*?)\n(.*?)(?=\n+|$)/gs;
  let match;
  while ((match = regex.exec(response)) !== null) {
    items.push({ title: match[1].trim(), details: match[2].trim() });
  }
  return { items };
}

export function createSystemPrompt() {
  return `
  You are a bot designed to create audio lessons for learning a specified language.
`;
}

export function createUserPrompt(goals: CreateLearningPlanRequest) {
  return `
  You are given details about a users learning goals, such as their current knowledge, and how long they want each lessons to last.
  You will respond with a list of lessons for learning the specified language.
  These lessons will be later handled by a tutor bot which will take your lesson descriptions and create transcripts for each lesson, lasting for the specified duration.
  Be detailed enough such that the tutor bot will be able to create a lesson lasting the specified duration from the lesson description and learning goals alone.
  The lessons will use english as the base language, and switch between speaking english and the language to learn.
  You must reply in the following format:
  Lesson: {Lesson title}
  {Lesson description}

  Lesson: {Lesson 2 title}
  {Lession 2 description}
  ...and so on

  The user has specified the following:
  I want to learn ${goals.targetLanguage}. I know ${goals.targetLanguageLevel}.
  I want each lesson to last ${goals.lessonDuration}
  I want ${goals.numberOfLessons} lessons.
  
  Now, create a learning plan in the desired format:
    `;
}

export function createLearningPlanChatCompletionRequest(
  goals: CreateLearningPlanRequest
): ChatCompletionCreateParamsNonStreaming {
  return {
    model: "gpt-3.5-turbo",
    messages: [
      {
        role: "system",
        content: createSystemPrompt(),
      },
      {
        role: "user",
        content: createUserPrompt(goals),
      },
    ],
  };
}
