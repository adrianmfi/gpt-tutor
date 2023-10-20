import { writeFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";
import inquirer from "inquirer";
import { SpeechConfig } from "microsoft-cognitiveservices-speech-sdk";
import { convertAudioFormat, synthesizeAudio } from "./lib/synthesize-audio.js";
import { parseTranscript, convertToSSML } from "./lib/create-transcript.js";
let azureSpeechKey = process.env.AZURE_SPEECH_KEY;
if (!azureSpeechKey) {
  const prompt = await inquirer.prompt({
    type: "password",
    name: "key",
    message: "Enter Azure speech key",
    validate: (value) => value.length > 0,
  });

  azureSpeechKey = prompt.key!;
}

let azureSpeechRegion = process.env.AZURE_SPEECH_REGION;
if (!azureSpeechRegion) {
  const prompt = await inquirer.prompt({
    type: "input",
    name: "region",
    message: "Enter Azure speech region",
    validate: (value) => value.length > 0,
  });

  azureSpeechRegion = prompt.region!;
}

const outputDir = `./output/synth`;
const speechConfig: SpeechConfig = SpeechConfig.fromSubscription(
  azureSpeechKey!,
  azureSpeechRegion!
);

const response = `Now, let's review the vocabularies we learned in lesson 9 about accommodation and sightseeing. We will reinforce our memory with some repetition and examples.

First, let's recall the word for 'hotel', which in Japanese is: <lang lang="ja-JP">ホテル</lang>.
Please repeat, 'hotel' in Japanese: <lang lang="ja-JP">ホテル</lang>.
An example sentence: "Please let me know where the hotel is" translates to: <lang lang="ja-JP">ホテルの場所を教えてください</lang>.
Repeating that sentence: <lang lang="ja-JP">ホテルの場所を教えてください</lang>.

The Japanese for 'room' is: <lang lang="ja-JP">部屋</lang>.
Please repeat the word 'room': <lang lang="ja-JP">部屋</lang>.
An example phrase: "This room is too hot" would translate to: <lang lang="ja-JP">この部屋はとても暑いです</lang>.
Let's repeat that: <lang lang="ja-JP">この部屋はとても暑いです</lang>.

The word for 'reservation' is: <lang lang="ja-JP">予約</lang>.
Once more, 'reservation' in Japanese is: <lang lang="ja-JP">予約</lang>.
If you want to say "I would like to make a reservation", you can say: <lang lang="ja-JP">予約をしたいです</lang>.
Let's repeat: <lang lang="ja-JP">予約をしたいです</lang>.

Next, we will review the phrase 'entrance', which in Japanese is: <lang lang="ja-JP">入口</lang>.
Repeat after me, 'entrance' in Japanese is: <lang lang="ja-JP">入口</lang>.
Here's a usage example: "Where is the entrance?" translates to: <lang lang="ja-JP">入口はどこですか</lang>.
And again, "Where is the entrance?" is: <lang lang="ja-JP">入口はどこですか</lang>.

Lastly, the word 'exit' in Japanese is: <lang lang="ja-JP">出口</lang>.
To reiterate, 'exit' is: <lang lang="ja-JP">出口</lang>.
For instance, "Where is the exit?" in Japanese would be: <lang lang="ja-JP">出口はどこですか</lang>.
Repeating, "Where is the exit?" is: <lang lang="ja-JP">出口はどこですか</lang>.

Now let's recap what we've rehearsed:
Hotel: <lang lang="ja-JP">ホテル</lang>.
Room: <lang lang="ja-JP">部屋</lang>.
Reservation: <lang lang="ja-JP">予約</lang>.
Entrance: <lang lang="ja-JP">入口</lang>.
Exit: <lang lang="ja-JP">出口</lang>.

In this lesson, we have reviewed the words and phrases related to accommodation and sightseeing in Japanese. Stay consistent with your practice and all will become familiar before you know it!`;
const parsed = parseTranscript(response);
let transcript = convertToSSML(parsed);

transcript = `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xmlns:mstts="http://www.w3.org/2001/mstts" xml:lang="en-US">
<voice name="en-US-RyanMultilingualNeural">
  <lang xml:lang="en-US">
    <break time='1s'/>
    So let's start by saying I am in our context. So let's start by saying "I am" in our context.
    <break time='1s'/>
  </lang>
</voice>

</speak>`;

const audio = await synthesizeAudio(transcript, speechConfig);
const mp3Buffer = await convertAudioFormat(Buffer.from(audio), "wav", "mp3");
if (!existsSync(outputDir)) {
  console.log("Creating output dir", outputDir);
  mkdirSync(outputDir, { recursive: true });
}
writeFileSync(join(outputDir, `${new Date().toISOString()}.mp3`), mp3Buffer);
