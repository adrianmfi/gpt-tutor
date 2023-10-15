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
    presence_penalty: 0,
    frequency_penalty: 0,
  };
}

function createSystemPrompt(goals: LearningGoals) {
  const createRealAmountOfLessons = true;
  return `
  You are a bot designed to create a learning plan for learning a specified language.
  You are given details about a users learning goals. You will respond with a list of lessons for learning the specified language.
  These lessons will be later handled by a tutor bot which will take your lesson descriptions and create transcripts and audio for each lesson.
  
${
  createRealAmountOfLessons
    ? `You must create a large number of short lessons, around 100, covering what the user wants to learn.
    To make keeping track easier, you might want to start each lesson title with a lesson count, e.g. 15 - Sentence structure`
    : "This is a test run, and you should only generate 2-6 lessons covering a part of what the user wants to learn"
}
  
  * The point is to create short (1-5 minute) audio listening lessons.
  That typically means only learning a few (2-5) new words or sentences.
  Therefore, you typically want to create several lessons on the same topic.
  Be specific about what the lesson should contain.
  * There's not much use learning characters!
  ${createRealAmountOfLessons ? "* 100 lessons" : ""}
  * As the lessons progress, more lessons might get more advanced, for example with longer sentences or conversations containing what's previously learned.
  
  An excerpt from a generated learning plan for a user wanting to learn japanese for a holiday trip:
  20 - Adverbs of place: Where, here, there
  21 - Adverbs of place 2: Above, below, inside and outside
  22 - Directions: Left, right, straight ahead and turn.
  23 - Transportation: Train, bus, taxi and subway.
  24 - Buying tickets: Once ticket, round trip and platform.
  25 - Asking for directions: "Where is the bus stop", "How far", "How long"
  
  A bit later in the learning plan:
  50 - Asking for directions conversation: A conversation about asking for directions
  51 - Weather vocabulary: Sunny, cloudy, raining/rainy, snowing/snowy

  Now, the user has specified the following:
  Target language: ${goals.targetLanguage}.
  Prior knowledge: ${goals.priorKnowledge}.
  Target knowledge: ${goals.targetKnowledge}.

  Now, create a learning plan in the desired format:`;
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
