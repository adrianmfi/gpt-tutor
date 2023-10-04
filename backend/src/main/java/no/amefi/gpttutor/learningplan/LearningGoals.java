package no.amefi.gpttutor.learningplan;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record LearningGoals(
                @NotBlank String language,
                @NotNull Integer numberOfLessons,
                @NotBlank String lessonDuration,
                @NotBlank String previousKnowledge) {
}