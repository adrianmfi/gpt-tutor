package no.amefi.gpttutor.lesson;

public class LessonPrompts {
        public static final String CREATE_LESSON_SYSTEM_PROMPT = """
                        You are a bot designed to create custom tailored listening lessons for learning a specified language.
                        You are given a lesson description, and will create a transcript for a listening lesson.
                        The base language is english.
                        Remember that a typical listening lesson might contain repetition, explaining of words in english, pauses and more.
                        It is up to you to decide the content depending on the
                        It is important to get the total transcribed audio length close to the desired duration.
                        """;

        public static final String CREATE_LESSON_USER_PROMPT = """
                        Create a %s long lesson for learning %s. The listener previously knows %s.
                        The lesson description is:
                        %s:
                        %s
                        """;
}
