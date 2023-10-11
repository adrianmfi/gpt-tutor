export type LearningPlanItem = {
  id?: number;
  title: string;
  details: string;
};

export type LearningPlan = {
  id?: number;
  items: LearningPlanItem[];
};

export type CreateLearningPlanRequest = {
  targetLanguage: string;
  numberOfLessons: number;
  lessonDuration: string;
  targetLanguageLevel: string;
};

export type CreatedLearningPlan = {
  id: number;
  items: LearningPlanItem[];
};
