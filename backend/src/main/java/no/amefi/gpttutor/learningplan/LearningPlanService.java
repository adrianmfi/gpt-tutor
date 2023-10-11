package no.amefi.gpttutor.learningplan;

import java.util.List;

import org.springframework.stereotype.Service;

import com.theokanning.openai.completion.chat.ChatCompletionRequest;
import com.theokanning.openai.completion.chat.ChatMessage;
import com.theokanning.openai.service.OpenAiService;

import no.amefi.gpttutor.learningplan.repository.LearningPlanEntity;
import no.amefi.gpttutor.learningplan.repository.LearningPlanItemEntity;
import no.amefi.gpttutor.learningplan.repository.LearningPlanMapper;
import no.amefi.gpttutor.learningplan.repository.LearningPlanRepository;

@Service
class LearningPlanService {

        private final OpenAiService openAiService;
        private final LearningPlanRepository learningPlanRepository;
        private final LearningPlanMapper learningPlanMapper;

        LearningPlanService(OpenAiService openAiService, LearningPlanRepository learningPlanRepository,
                        LearningPlanMapper learningPlanMapper) {
                this.openAiService = openAiService;
                this.learningPlanRepository = learningPlanRepository;
                this.learningPlanMapper = learningPlanMapper;
        }

        public LearningPlan createLearningPlan(LearningGoals goals) {
                String userPrompt = String.format(
                                LearningPlanPrompts.CREATE_PLAN_USER_PROMPT,
                                goals.targetLanguage(), goals.targetLanguageLevel(),
                                goals.lessonDuration(),
                                goals.numberOfLessons());

                var completionRequest = ChatCompletionRequest.builder()
                                .model("gpt-3.5-turbo")
                                .messages(List.of(
                                                new ChatMessage("system",
                                                                LearningPlanPrompts.CREATE_PLAN_SYSTEM_PROMPT),
                                                new ChatMessage("user", userPrompt)))
                                .build();
                String response = openAiService.createChatCompletion(completionRequest).getChoices().get(0).getMessage()
                                .getContent();

                var parsed = LearningPlanResponseParser.parse(response);
                var entity = learningPlanMapper.toEntity(parsed, goals);
                var saved = learningPlanRepository.save(entity);
                return learningPlanMapper.toDomain(saved);
        }

}
