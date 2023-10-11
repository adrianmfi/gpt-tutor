import { OpenAI } from "openai";
import { ChatCompletionCreateParamsNonStreaming } from "openai/resources/chat/index.mjs";

export type LearningGoals = {
  targetLanguage: string;
  priorKnowledge: string;
  targetKnowledge: string;
};

export type LearningPlan = {
  lessons: LessonDescription[];
};

export type LessonDescription = {
  title: string;
  details: string;
};

/**
 * Creates a learning plan based on the provided learning goals.
 *
 * @remarks
 * This function communicates with the OpenAI API to generate a list of lessons tailored to the user's learning goals. The resulting lessons are used for language learning and are intended to be further processed by a tutor bot.
 *
 * @param openAIClient - The OpenAI client instance for interacting with the OpenAI API.
 * @param learningGoals - An object specifying the user's learning goals, including the target language, number of lessons, lesson duration, and language proficiency level.
 *
 * @returns A promise that resolves to a `LearningPlan`, which contains an array of `LessonDescription` objects detailing the lessons.
 *
 * @throws Throws an error if the OpenAI API fails to provide a response.
 *
 * @example
 * ```typescript
 * const learningGoals = {
 *   targetLanguage: "Spanish",
 *   priorKnowledge: "not much"
 *   targetKnowledge: "Be able to converse with the locals"
 * };
 * const openAIClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
 * const plan = await createLearningPlan(openAIClient, learningGoals);
 * ```
 */
export async function createLearningPlan(
  openAIClient: OpenAI,
  learningGoals: LearningGoals,
  model: ChatCompletionCreateParamsNonStreaming["model"] = "gpt-4"
): Promise<LearningPlan> {
  const completion = await openAIClient.chat.completions.create(
    createLearningPlanCompletionRequest(learningGoals, model)
  );
  const response = completion.choices[0].message.content;
  if (!response) {
    throw new Error("No response from OpenAI");
  }
  return parseLearningPlan(response);
}

function createLearningPlanCompletionRequest(
  goals: LearningGoals,
  model: ChatCompletionCreateParamsNonStreaming["model"]
): ChatCompletionCreateParamsNonStreaming {
  return {
    model,
    temperature: 0.2,
    messages: [
      {
        role: "system",
        content: createSystemPrompt(goals),
      },
    ],
  };
}

function createSystemPrompt(goals: LearningGoals) {
  const createRealAmountOfLessons = false;
  return `
  You are a bot designed to create a learning plan for learning a specified language.
  You are given details about a users learning goals. You will respond with a list of lessons for learning the specified language.
  These lessons will be later handled by a tutor bot which will take your lesson descriptions and create detailed transcripts and audio for each lesson.
  The lessons will use english as the base language, and switch between speaking english and the language to learn.
  You must reply in the following format.
  \`\`\`
  {Lesson X title}: {Lesson X contents}
  {Lesson Y title}: {Lesson Y contents}
  {...and so on...}
  \`\`\`

  An excerpt from a generated learning plan for a user wanting to learn japanese for a holiday trip:
  \`\`\`
  ...
  Introduction to Japanese numbers: learn how to count from 1 to 20 in Japanese.
  Numbers part two: Learn the numbers 20 through 100 and how to express your age in Japanese
  To do and to see: Introduce common Japanese verbs "to eat" (Tabemasu), "to drink" (Nomimasu).
  ...
  \`\`\`
In other words, one lesson per line, and no whitespace between lines.

  
${
  createRealAmountOfLessons
    ? "You should create a large number of lessons, typically somewhere between 50-200, covering what the user wants to learn."
    : "This is a test run, and you should only generate 2-6 lessons covering a part of what the user wants to learn"
}
  
  Remember that the point is to create short (1-5 minute) audio listening lessons.
  That typically means only learning a few (2-5) new words or sentences. Be specific about what to learn!
  There's not much use learning characters!


  Now, the user has specified the following:
  Target language: ${goals.targetLanguage}.
  Prior knowledge: ${goals.priorKnowledge}.
  Target knowledge: ${goals.targetKnowledge}.

  Now, create a learning plan in the desired format:
    `;
}

function parseLearningPlan(response: string): LearningPlan {
  const lessons = response
    .trim()
    .split("\n")
    .map((line) => {
      const [title, details] = line.split(": ");
      if (title && details)
        return {
          title,
          details,
        };
    })
    .filter((lesson): lesson is LessonDescription => !!lesson);

  return {
    lessons,
  };
}
