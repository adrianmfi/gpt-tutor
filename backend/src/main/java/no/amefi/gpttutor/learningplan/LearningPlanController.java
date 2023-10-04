package no.amefi.gpttutor.learningplan;

import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import jakarta.validation.Valid;

@RestController
@RequestMapping(path = "plans")
public class LearningPlanController {
    private final LearningPlanService learningPlanService;

    LearningPlanController(LearningPlanService learningPlanService) {
        this.learningPlanService = learningPlanService;
    }

    @PostMapping
    public LearningPlan createLearningPlan(
            @RequestBody @Valid LearningGoals goals) {
        return learningPlanService.createLearningPlan(goals);
    }

}
