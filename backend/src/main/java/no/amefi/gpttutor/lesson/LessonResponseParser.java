package no.amefi.gpttutor.lesson;

class LessonResponseParser {

        private LessonResponseParser() {
        }

        public static Lesson parse(String response) {
                return new Lesson(response);
        }

}
