package no.amefi.gpttutor.lesson;

import java.util.List;

import org.springframework.stereotype.Service;

import com.theokanning.openai.completion.chat.ChatCompletionRequest;
import com.theokanning.openai.completion.chat.ChatMessage;
import com.theokanning.openai.service.OpenAiService;

import no.amefi.gpttutor.learningplan.repository.LearningPlanItemRepository;

@Service
class LessonService {

        private final OpenAiService openAiService;
        private final LearningPlanItemRepository learningPlanItemRepository;

        LessonService(OpenAiService openAiService, LearningPlanItemRepository learningPlanItemRepository) {
                this.openAiService = openAiService;
                this.learningPlanItemRepository = learningPlanItemRepository;
        }

        public Lesson createLesson(long learningPlanId, long learningPlanItemId) {
                var lessonItem = learningPlanItemRepository.findById(learningPlanItemId).orElseThrow();
                var learningGoals = lessonItem.getLearningPlan().getLearningGoals();

                String userPrompt = String.format(
                                LessonPrompts.CREATE_LESSON_USER_PROMPT,
                                learningGoals.getLessonDuration(), learningGoals.getTargetLanguage(),
                                learningGoals.gettargetLanguageLevel(),
                                lessonItem.getTitle(), lessonItem.getDetails());

                var completionRequest = ChatCompletionRequest.builder()
                                .model("gpt-3.5-turbo")
                                .messages(List.of(
                                                new ChatMessage("system",
                                                                LessonPrompts.CREATE_LESSON_SYSTEM_PROMPT),
                                                new ChatMessage("user", userPrompt)))
                                .build();
                String response = openAiService.createChatCompletion(completionRequest).getChoices().get(0).getMessage()
                                .getContent();

                // todo: OpenAI API doesn't support audio yet
                // todo: insert into DB

                return LessonResponseParser.parse(response);
        }

}
