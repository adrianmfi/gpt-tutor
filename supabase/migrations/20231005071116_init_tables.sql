CREATE TABLE learning_plans(
    id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    number_of_lessons integer NOT NULL,
    lesson_duration text NOT NULL,
    target_language text NOT NULL,
    target_language_level text NOT NULL
    -- todo rls
    -- user_id integer NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE
);

CREATE TABLE learning_plan_items(
    id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    learning_plan_id integer NOT NULL REFERENCES learning_plans(id) ON DELETE CASCADE,
    title text NOT NULL,
    details text NOT NULL
);

CREATE INDEX learning_plan_items_learning_plan_id_idx ON learning_plan_items(learning_plan_id);

CREATE TABLE lessons(
    id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    learning_plan_item_id integer NOT NULL REFERENCES learning_plan_items(id) ON DELETE CASCADE,
    transcript text NOT NULL
);

