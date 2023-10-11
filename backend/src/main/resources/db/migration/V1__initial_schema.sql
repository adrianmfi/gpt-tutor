CREATE TABLE learning_plans(
    id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY
);

CREATE TABLE learning_plan_items(
    id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    learning_plan_id integer NOT NULL REFERENCES learning_plans(id) ON DELETE CASCADE,
    title text NOT NULL,
    details text NOT NULL
);

CREATE TABLE learning_goals(
    id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    learning_plan_id integer NOT NULL REFERENCES learning_plans(id) ON DELETE CASCADE,
    number_of_lessons integer NOT NULL,
    lesson_duration text NOT NULL,
    target_language_level text NOT NULL target_language text NOT NULL,
);

