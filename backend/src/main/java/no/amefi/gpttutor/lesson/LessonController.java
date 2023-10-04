package no.amefi.gpttutor.lesson;

import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping(path = "lessons")
public class LessonController {
    private final LessonService lessonService;

    LessonController(LessonService lessonService) {
        this.lessonService = lessonService;
    }

    @PostMapping
    public Lesson createLessonForLearningPlan(
            @RequestParam int learningPlanId, @RequestParam int learningPlanItemId) {
        return lessonService.createLesson(learningPlanId, learningPlanItemId);
    }

}
