package no.amefi.gpttutor.lesson;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.web.bind.annotation.RequestParam;

import com.theokanning.openai.completion.chat.ChatCompletionRequest;
import com.theokanning.openai.completion.chat.ChatMessage;
import com.theokanning.openai.service.OpenAiService;

import no.amefi.gpttutor.learningplan.repository.LearningPlanRepository;

@Service
class LessonService {

        private final OpenAiService openAiService;
        private final LearningPlanRepository learningPlanRepository;

        LessonService(OpenAiService openAiService, LearningPlanRepository learningPlanRepository) {
                this.openAiService = openAiService;
                this.learningPlanRepository = learningPlanRepository;
        }

        public Lesson createLesson(long learningPlanId, long learningPlanItemId) {
                var lessonItem = learningPlanRepository.findById(learningPlanId).orElseThrow()
                                .getLearningPlanItems().stream().filter(item -> item.getId() == learningPlanItemId)
                                .findFirst()
                                .orElseThrow();

                String userPrompt = String.format(
                                LessonPrompts.CREATE_LESSON_USER_PROMPT,
                                // todo: avoid hardcoding
                                "15 minute", "japanese", "some hiragana and katakana, basic sentence structure",
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
