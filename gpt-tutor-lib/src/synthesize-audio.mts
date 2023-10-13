import { writeFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";
import inquirer from "inquirer";
import { SpeechConfig } from "microsoft-cognitiveservices-speech-sdk";
import { convertAudioFormat, synthesizeAudio } from "./lib/synthesize-audio.js";

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

const outputDir = `./output/${new Date().toISOString()}`;
const speechConfig: SpeechConfig = SpeechConfig.fromSubscription(
  azureSpeechKey!,
  azureSpeechRegion!
);

const transcript = `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xmlns:mstts="http://www.w3.org/2001/mstts" xml:lang="en-US">
<voice name="en-US-RyanMultilingualNeural">
  <lang xml:lang="en-US">
    Here is a sentence example: "Please show me the menu." In Japanese, this would be:
  </lang>
</voice>
<voice name="en-US-RyanMultilingualNeural">
  <lang xml:lang="ja-JP">
    <break time='1s'/>
    <mstts:prosody rate="-20%">
          メニューを見せてください
        </mstts:prosody>
  </lang>
</voice>
<voice name="en-US-RyanMultilingualNeural">
  <lang xml:lang="en-US">
    <break time='1s'/>
    . Again, that's:
  </lang>
</voice>
<voice name="en-US-RyanMultilingualNeural">
  <lang xml:lang="ja-JP">
    <break time='1s'/>
    メニューを見せてください
  </lang>
</voice>
<voice name="en-US-RyanMultilingualNeural">
  <lang xml:lang="en-US">
    <break time='1s'/>
    Now let's move on to "reservation". In Japanese, this is:
  </lang>
</voice>
<voice name="en-US-RyanMultilingualNeural">
  <lang xml:lang="ja-JP">
    <mstts:prosody rate="-20%">
          予約
        </mstts:prosody>
    <break time='2s'/>
    予約
  </lang>
</voice>
</speak>`;
const audio = await synthesizeAudio(transcript, speechConfig);
const mp3Buffer = await convertAudioFormat(
  Buffer.from(audio.audioData),
  "wav",
  "mp3"
);
if (!existsSync(outputDir)) {
  console.log("Creating output dir", outputDir);
  mkdirSync(outputDir, { recursive: true });
}
writeFileSync(join(outputDir, "test.mp3"), mp3Buffer);
