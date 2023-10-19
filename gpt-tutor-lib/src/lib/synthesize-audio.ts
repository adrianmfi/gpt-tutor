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
import fs from "fs";
import { temporaryFile, temporaryDirectory } from "tempy";

ffmpeg.setFfmpegPath(ffmpegPath as unknown as string);

export async function synthesizeAudio(
  transcript: string,
  speechConfig: SpeechConfig
): Promise<Buffer> {
  let result: Buffer | undefined = undefined;

  const splitted = splitTranscript(transcript);
  for (const split of splitted) {
    const pullAudioStream = PullAudioOutputStream.createPullStream();
    const audioConfig = AudioConfig.fromStreamOutput(pullAudioStream);

    const synthesizer = new SpeechSynthesizer(speechConfig, audioConfig);

    const synthesisResult: SpeechSynthesisResult = await new Promise(
      (resolve, reject) =>
        synthesizer.speakSsmlAsync(
          split,
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
              console.log(split);
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

    if (result) {
      result = await mergeWavFiles(
        result,
        Buffer.from(synthesisResult.audioData)
      );
    } else {
      result = Buffer.from(synthesisResult.audioData);
    }
  }
  if (!result) {
    throw new Error("no audio data");
  }

  return result;
}

// Azure supports at most 50 voices in a transcript
function splitTranscript(transcript: string): string[] {
  const numberOfVoices = (transcript.match(/<voice/g) || []).length;
  if (numberOfVoices === 0) {
    throw new Error("No voices");
  }

  const maxVoices = 50;
  let currentCount = 0;
  let startIndex = transcript.indexOf("<voice");
  let currIndex = startIndex;
  const result = [];

  const start = transcript.substring(0, transcript.indexOf(">") + 1);
  const end = "\n</speak>";

  for (let i = 0; i < numberOfVoices; i++) {
    currentCount++;
    currIndex = transcript.indexOf("</voice>", currIndex) + 8; // 8 is the length of "</voice>"
    if (currentCount === maxVoices || i === numberOfVoices - 1) {
      const voices = transcript.substring(startIndex, currIndex);
      const newTranscript = `${start}${voices}${end}`;
      result.push(newTranscript);

      currentCount = 0;
      startIndex = currIndex;
    }
  }

  return result;
}

function mergeWavFiles(buffer1: Buffer, buffer2: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const tempFile1 = temporaryFile({ extension: "wav" });
    const tempFile2 = temporaryFile({ extension: "wav" });
    const tempFileOutput = temporaryFile({ extension: "wav" });

    fs.writeFileSync(tempFile1, buffer1);
    fs.writeFileSync(tempFile2, buffer2);

    ffmpeg()
      .input(tempFile1)
      .input(tempFile2)

      .on("end", () => {
        const mergedBuffer = fs.readFileSync(tempFileOutput);
        fs.unlinkSync(tempFile1);
        fs.unlinkSync(tempFile2);
        fs.unlinkSync(tempFileOutput);
        console.log(
          "merged",
          buffer1.byteLength,
          buffer2.byteLength,
          mergedBuffer.byteLength
        );
        resolve(mergedBuffer);
      })
      .on("error", (err) => {
        fs.unlinkSync(tempFile1);
        fs.unlinkSync(tempFile2);
        reject(err);
      })
      .mergeToFile(tempFileOutput, temporaryDirectory());
  });
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
