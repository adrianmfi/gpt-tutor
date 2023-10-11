"use client";
import { supabaseClient } from "@/lib/supabase-client";
import { useState } from "react";

export function TestButton() {
  const [s, setS] = useState<number>(8);
  const [c, setC] = useState<number>(1);

  return (
    <>
      <button
        onClick={async () => {
          const foo = await supabaseClient.functions.invoke(
            "create-learning-plan",
            {
              method: "POST",
              body: JSON.stringify({
                lessonDuration: "5 minutes",
                numberOfLessons: 3,
                targetLanguage: "Japanese",
                targetLanguageLevel:
                  "some simple greetings, how to say my name, hiragana characters",
              }),
            }
          );
          console.log("foo", foo);
          setS(foo.data.items[0].id);
        }}
      >
        TESTING!
      </button>
      <button
        onClick={async () => {
          const foo = await supabaseClient.functions.invoke("create-lesson", {
            method: "POST",
            body: JSON.stringify({
              learningPlanItemId: s,
            }),
          });
          console.log("foo", foo);
          setC(foo.data.id);
        }}
      >
        TESTING 2!
      </button>
      <button
        onClick={async () => {
          const foo = await supabaseClient.functions.invoke(
            "create-audio-lesson",
            {
              method: "POST",
              body: JSON.stringify({
                lessonId: c,
              }),
            }
          );
          console.log("foo", foo);
        }}
      >
        TESTING 3!
      </button>
    </>
  );
}
