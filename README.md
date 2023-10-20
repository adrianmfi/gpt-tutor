# GPT Tutor

Generate personalized audio lessons with GPT and Azure AI speech.
Examples: [Japanese course](./lessons/japanese/)

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

## License

MIT
