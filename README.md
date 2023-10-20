# GPT Tutor TODO

Create audio lessons



## Installation

```bash
npm install estimate-fundamental-frequency
```

## Usage

```typescript
import { estimateFundamentalFrequency } from "estimate-fundamental-frequency";

const data = new Float32Array(1024);

const sampleRate = 44100;
const frequency = 440;

for (let i = 0; i < data.length; i++) {
  data[i] = Math.sin((2 * Math.PI * frequency * i) / sampleRate);
}

const estimatedFrequency = estimateFundamentalFrequency(data, 44100);
```

## License

MIT
