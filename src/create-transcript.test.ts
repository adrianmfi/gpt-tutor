import { parseTranscript } from "./lib/create-transcript";
import { describe, expect, it } from "@jest/globals";

describe("parseTranscript", () => {
  it("should parse transcript", async () => {
    const transcript = `Today, we're focusing on three foundational Japanese expressions: 'I'm sorry', 'yes', and 'no'.

      Firstly, let's tackle 'I'm sorry'. In Japanese, this is: <lang lang="ja-JP">ごめんなさい</lang>.
      Remember, 'I'm sorry' translates to <lang lang="ja-JP">ごめんなさい</lang>.
      It's an expression of regret, commonly used to apologize. Let's say it again: 'I'm sorry' is <lang lang="ja-JP">ごめんなさい</lang>.
      There's also a shorter version, <lang lang="ja-JP">ごめん</lang>, frequently used informally among friends. Once more, a casual 'I'm sorry' can be <lang lang="ja-JP">ごめん</lang>.
      
      Next, we have 'yes'. In Japanese, 'yes' is: <lang lang="ja-JP">はい</lang>.
      Did you catch that? 'Yes' is <lang lang="ja-JP">はい</lang>.
      It's a universal affirmative response, used in many daily situations. Let's reinforce that: 'Yes' in Japanese is <lang lang="ja-JP">はい</lang>.
      
      Lastly, we'll cover 'no'. The Japanese word for 'no' is: <lang lang="ja-JP">いいえ</lang>.
      Once again, 'no' translates to <lang lang="ja-JP">いいえ</lang>.
      In Japanese culture, directly saying 'no' can be seen as impolite, making <lang lang="ja-JP">いいえ</lang> a more tactful choice. Let's repeat for clarity: 'no' is <lang lang="ja-JP">いいえ</lang>.
      
      To summarize and reinforce:
      'I'm sorry' in Japanese is: <lang lang="ja-JP">ごめんなさい</lang>. Repeat it: <lang lang="ja-JP">ごめんなさい</lang>.
      The word 'Yes' is: <lang lang="ja-JP">はい</lang>. Say it again: <lang lang="ja-JP">はい</lang>.
      For 'No', we have: <lang lang="ja-JP">いいえ</lang>. One more time: <lang lang="ja-JP">いいえ</lang>.
      
      Consistent practice of these fundamental phrases will enhance your fluency. Keep practicing, repetition is the key!
      `;
    const result = await parseTranscript(transcript);

    expect(result).toEqual({
      lessons: [
        {
          title: "Title",
          details: "Details",
        },
      ],
    });
  });
});
