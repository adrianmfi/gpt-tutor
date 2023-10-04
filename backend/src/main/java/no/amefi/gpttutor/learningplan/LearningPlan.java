package no.amefi.gpttutor.learningplan;

import java.util.List;

public record LearningPlan(Long id, List<LearningPlanItem> learningPlanItems) {

}
