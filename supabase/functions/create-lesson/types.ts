export type CreateLessonRequest = {
  learningPlanItemId: number;
};

export type Lesson = {
  id?: number;
  learningPlanItemId: number;
  transcript: string;
};
