# GPT Tutor

Generate personalized audio lessons with GPT and Azure AI speech. <br>
A generated Japanese course can be found [here](./lessons/japanese/), or as a [single .mp3](https://github.com/adrianmfi/gpt-tutor/raw/main/lessons/japanese/all_lessons.mp3).

https://github.com/adrianmfi/gpt-tutor/assets/12783483/f3afdb59-ceda-4db7-b85b-d96e0b56d88d



## Installation

```bash
git clone https://github.com/adrianmfi/gpt-tutor.git
cd gpt-tutor
npm install
```

## Usage

* Get an API Key from OpenAI.
  * If you want to use GPT-4 for the first time, you might have to prepurchase credits to get access.
* Create a speech resource as described [here](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/get-started-text-to-speech?tabs=macos%2Cterminal&pivots=programming-language-javascript#prerequisites)
  * The resource must be in East US, West Europe, or Southeast Asia as currently only these regions support the Multilingual voice 


Run with:

```bash
npx ts-node ./src/create-audio-book.mts
```

or:
```bash
OPENAI_API_KEY=... AZURE_SPEECH_KEY=... AZURE_SPEECH_REGION=... npx ts-node ./src/create-audio-book.mts
```

Concatenate all generated .mp3 files in a directory into a single file for easier download (Tested on macOS): <br>

```bash
ffmpeg -f concat -safe 0 -i <(for f in *.mp3; do echo "file '$PWD/$f'"; done | sort -V) -c copy output.mp3
```

## License

MIT
