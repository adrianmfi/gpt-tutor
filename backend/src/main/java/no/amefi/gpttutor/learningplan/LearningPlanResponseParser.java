package no.amefi.gpttutor.learningplan;

import java.util.ArrayList;
import java.util.List;

class LearningPlanResponseParser {

        private LearningPlanResponseParser() {
        }

        public static LearningPlan parse(String response) {
                List<LearningPlanItem> items = new ArrayList<>();
                String[] sections = response.split("\n\n");
                // todo: more robust schema
                for (String section : sections) {
                        String[] sectionSplit = section.split("\n", 2);
                        var title = sectionSplit[0];
                        var details = sectionSplit[1];
                        items.add(new LearningPlanItem(null, title, details));
                }
                return new LearningPlan(null, items);

        }
}
