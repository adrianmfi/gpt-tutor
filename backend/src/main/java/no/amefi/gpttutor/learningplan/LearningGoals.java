package no.amefi.gpttutor.learningplan;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record LearningGoals(
                Long id,
                // base language is assumed to be english
                @NotBlank String targetLanguage,
                @NotNull Integer numberOfLessons,
                @NotBlank String lessonDuration,
                @NotBlank String targetLanguageLevel) {
}