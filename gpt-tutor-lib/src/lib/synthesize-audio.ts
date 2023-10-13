import {
  SpeechConfig,
  SpeechSynthesisResult,
  PullAudioOutputStream,
  AudioConfig,
  SpeechSynthesizer,
  ResultReason,
} from "microsoft-cognitiveservices-speech-sdk";
import { Readable, PassThrough } from "stream";
import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "ffmpeg-static";

console.log(ffmpegPath);
ffmpeg.setFfmpegPath(ffmpegPath as unknown as string);

export async function synthesizeAudio(
  transcript: string,
  speechConfig: SpeechConfig
): Promise<SpeechSynthesisResult> {
  const pullAudioStream = PullAudioOutputStream.createPullStream();
  const audioConfig = AudioConfig.fromStreamOutput(pullAudioStream);

  const synthesizer = new SpeechSynthesizer(speechConfig, audioConfig);

  const result: SpeechSynthesisResult = await new Promise((resolve, reject) =>
    synthesizer.speakSsmlAsync(
      transcript,
      function (result) {
        if (result.reason === ResultReason.SynthesizingAudioCompleted) {
          console.log("synthesis finished.");
          resolve(result);
        } else {
          console.error(
            "Speech synthesis canceled, ",
            result,
            JSON.stringify(result),
            result.reason
          );
          reject();
        }
        synthesizer.close();
      },
      function (err) {
        console.error("err - " + err);
        synthesizer.close();
        reject();
      }
    )
  );
  return result;
}

export function convertAudioFormat(
  buffer: Buffer,
  inputFormat: string,
  outputFormat: string
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const audioStream = new Readable({
      read() {
        this.push(buffer);
        this.push(null);
      },
    });

    const output = new PassThrough();
    let outputBuffer = Buffer.alloc(0);

    output.on("data", (chunk) => {
      outputBuffer = Buffer.concat([outputBuffer, chunk]);
    });

    output.on("end", () => {
      resolve(outputBuffer);
    });

    ffmpeg(audioStream)
      .inputFormat(inputFormat)
      .outputFormat(outputFormat)
      .on("error", (err) => {
        reject(err);
      })
      .pipe(output);
  });
}
