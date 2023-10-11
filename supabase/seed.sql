INSERT INTO learning_plans(target_language, number_of_lessons, lesson_duration, target_language_level)
    VALUES ('English', 10, '30 minutes', 'Some spanish');

INSERT INTO learning_plan_items(learning_plan_id, title, details)
    VALUES (1, 'Item 1', 'Details 1');

INSERT INTO learning_plan_items(learning_plan_id, title, details)
    VALUES (1, 'Item 2', 'Details 2');

INSERT INTO lessons(learning_plan_item_id, transcript)
    VALUES (1, 'This is the transcript of lesson 1');

