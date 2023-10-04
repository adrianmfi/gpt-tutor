package no.amefi.gpttutor.learningplan;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

public class LearningPlanResponseParserTest {

    @Test
    void parse_shouldStripLeadingAndTrailingWhitespace() {
        String response = """

                Lesson: Introduction
                This is the introduction to the course.

                """;

        LearningPlan plan = LearningPlanResponseParser.parse(response);

        assertEquals(1, plan.learningPlanItems().size());

        LearningPlanItem item = plan.learningPlanItems().get(0);
        assertEquals("Introduction", item.title());
        assertEquals("This is the introduction to the course.", item.details());
    }

    @Test
    void parse_shouldStripIntermediateWhitespace() {
        String response = """
                Lesson: Introduction
                This is the introduction to the course.


                Lesson: Getting Started
                In this lesson, you will learn how to get started with the course.
                """;

        LearningPlan plan = LearningPlanResponseParser.parse(response);

        assertEquals(2, plan.learningPlanItems().size());

        LearningPlanItem item1 = plan.learningPlanItems().get(0);
        assertEquals("Introduction", item1.title());
        assertEquals("This is the introduction to the course.", item1.details());

        LearningPlanItem item2 = plan.learningPlanItems().get(1);
        assertEquals("Getting Started", item2.title());
        assertEquals("In this lesson, you will learn how to get started with the course.", item2.details());
    }

    @Test
    void parse_shouldHandleNoIntermediateWhitespace() {
        String response = """
                Lesson: Introduction
                This is the introduction to the course.
                Lesson: Getting Started
                In this lesson, you will learn how to get started with the course.
                """;

        LearningPlan plan = LearningPlanResponseParser.parse(response);

        assertEquals(2, plan.learningPlanItems().size());

        LearningPlanItem item1 = plan.learningPlanItems().get(0);
        assertEquals("Introduction", item1.title());
        assertEquals("This is the introduction to the course.", item1.details());

        LearningPlanItem item2 = plan.learningPlanItems().get(1);
        assertEquals("Getting Started", item2.title());
        assertEquals("In this lesson, you will learn how to get started with the course.", item2.details());
    }

    @Test
    void parse_shouldReturnLearningPlanWithCorrectItems() {

        String response = """
                Lesson: Introduction
                This is the introduction to the course.

                Lesson: Getting Started
                In this lesson, you will learn how to get started with the course.

                Lesson: Conclusion
                This is the conclusion of the course.
                """;

        LearningPlan plan = LearningPlanResponseParser.parse(response);

        assertEquals(3, plan.learningPlanItems().size());

        LearningPlanItem item1 = plan.learningPlanItems().get(0);
        assertEquals("Introduction", item1.title());
        assertEquals("This is the introduction to the course.", item1.details());

        LearningPlanItem item2 = plan.learningPlanItems().get(1);
        assertEquals("Getting Started", item2.title());
        assertEquals("In this lesson, you will learn how to get started with the course.", item2.details());

        LearningPlanItem item3 = plan.learningPlanItems().get(2);
        assertEquals("Conclusion", item3.title());
        assertEquals("This is the conclusion of the course.", item3.details());
    }
}