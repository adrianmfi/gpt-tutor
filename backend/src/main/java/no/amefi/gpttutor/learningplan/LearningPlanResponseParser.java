package no.amefi.gpttutor.learningplan;

import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

class LearningPlanResponseParser {

        private LearningPlanResponseParser() {
        }

        public static LearningPlan parse(String response) {
                List<LearningPlanItem> items = new ArrayList<>();
                Matcher matcher = Pattern.compile("Lesson: (.*?)\\n(.*?)(?=\\n+|\\z)", Pattern.DOTALL)
                                .matcher(response);
                while (matcher.find()) {
                        items.add(new LearningPlanItem(null, matcher.group(1).trim(), matcher.group(2).trim()));
                }
                return new LearningPlan(null, items);

        }
}
