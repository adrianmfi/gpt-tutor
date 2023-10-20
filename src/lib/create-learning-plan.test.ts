import { describe, expect, it } from "@jest/globals";
import { OpenAI } from "openai";
import { createLearningPlan, LearningGoals } from "./create-learning-plan";

function mockClient(response: string): OpenAI {
  return {
    chat: {
      completions: {
        create: async () => ({
          choices: [
            {
              message: {
                content: response,
              },
            },
          ],
        }),
      },
    },
  } as unknown as OpenAI;
}

describe("createLearningPlan", () => {
  it("should return a learning plan", async () => {
    const openAIClient = mockClient("Lesson: Title\nDetails");
    const learningGoals: LearningGoals = {
      targetLanguage: "Spanish",
      priorKnowledge: "not much",
      targetKnowledge: "i want to learn enough so that i can live there",
    };

    const result = await createLearningPlan(openAIClient, learningGoals);

    expect(result).toEqual({
      lessons: [
        {
          title: "Title",
          details: "Details",
        },
      ],
    });
  });
});
