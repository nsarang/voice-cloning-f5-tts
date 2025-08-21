# F5-TTS Web

A web-based implementation of F5-TTS using ONNX Runtime with WebGPU acceleration for fast, browser-native text-to-speech synthesis.

## Features

- **ONNX-optimized F5-TTS inference** with WebGPU acceleration
- **Modular React architecture** with proper component separation
- **Real-time audio processing** with silence detection and RMS normalization
- **Batch text processing** for long-form generation
- **WebGPU/CPU fallback** for maximum compatibility
- **Zero backend required** - runs entirely in the browser

## Project Structure

```
f5-tts-web/
├── package.json
├── vite.config.js
├── index.html
├── src/
│   ├── main.jsx           # Entry point
│   ├── App.jsx            # Main React component
│   ├── index.css          # Tailwind CSS
│   ├── f5-tts.js          # ONNX inference engine
│   └── audio-utils.js     # Audio processing utilities
└── public/
    └── models/            # ONNX model files (you provide)
        ├── F5_Preprocess.onnx
        ├── F5_Transformer.onnx
        ├── F5_Decode.onnx
        └── vocab.txt
```

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Add ONNX Models

You need to convert the F5-TTS PyTorch models to ONNX format and place them in `public/models/`:

- `F5_Preprocess.onnx` - Audio preprocessing model (CPU-optimized)
- `F5_Transformer.onnx` - Main transformer model (WebGPU-accelerated)
- `F5_Decode.onnx` - Audio generation model with integrated Vocos (CPU-optimized)
- `vocab.txt` - Character vocabulary file

### 3. Run Development Server

```bash
npm run dev
```

Open http://localhost:5173 in your browser.

### 4. Build for Production

```bash
npm run build
npm run preview
```

## Usage

1. **Load Models**: Click "Load Models" to initialize the ONNX runtime
2. **Upload Reference Audio**: Provide a clean audio sample (< 15 seconds)
3. **Enter Reference Text**: Type what the reference audio says
4. **Enter Generation Text**: Type what you want to synthesize
5. **Generate**: Click "Generate Speech" and wait for processing

## Technical Details

### Audio Processing Pipeline

1. **Load & Convert**: Decode uploaded audio to AudioBuffer
2. **Mono Conversion**: Average multi-channel audio to mono
3. **Duration Limiting**: Clip to 15 seconds maximum
4. **Silence Removal**: Remove quiet segments while preserving speech
5. **RMS Normalization**: Adjust volume to target level (0.1)
6. **Resampling**: Convert to 24kHz using linear interpolation

### ONNX Inference Pipeline

1. **Stage A (Preprocess)**: Convert audio/text to model inputs
2. **Stage B (Transformer)**: Run NFE diffusion steps (32 iterations)
3. **Stage C (Decode)**: Generate final audio with integrated Vocos

### Performance Optimizations

- **WebGPU acceleration** for transformer model
- **CPU processing** for lighter preprocessing/decode models
- **Batch processing** for long text inputs
- **Memory-efficient** tensor operations
- **Progressive loading** with real-time progress feedback

## Browser Compatibility

### Supported Browsers
- **Chrome/Edge 113+** (WebGPU supported)
- **Firefox 110+** (CPU fallback)
- **Safari 16+** (CPU fallback)

### Requirements
- Modern browser with ES6 modules support
- AudioContext API support
- ONNX Runtime Web compatibility

## Performance Expectations

### With WebGPU (Recommended)
- **Model Loading**: 5-10 seconds
- **Audio Processing**: 1-2 seconds
- **Generation**: 3-5 seconds per batch

### CPU Fallback
- **Model Loading**: 10-15 seconds  
- **Audio Processing**: 2-3 seconds
- **Generation**: 15-30 seconds per batch

## Troubleshooting

### Model Loading Issues
- Ensure ONNX files are in `public/models/` directory
- Check browser console for detailed error messages
- Verify model files are not corrupted
- Try refreshing the page

### WebGPU Issues
- Check if WebGPU is enabled in browser flags
- Update to latest browser version
- App will automatically fall back to CPU

### Audio Quality Issues
- Use high-quality reference audio (clear speech, no background noise)
- Keep reference audio under 15 seconds
- Ensure reference text exactly matches the audio
- Try different reference audio if quality is poor

### Memory Issues
- Close other browser tabs
- Use shorter text inputs
- Refresh page if app becomes unresponsive

## Development

### Adding New Features

The modular architecture makes it easy to extend:

- **Audio processing**: Modify `src/audio-utils.js`
- **Model inference**: Update `src/f5-tts.js`
- **UI components**: Edit `src/App.jsx`

### Testing Audio Processing

Each utility function can be tested independently:

```javascript
import { calculateRMS, resample } from './src/audio-utils.js';

// Test RMS calculation
const rms = calculateRMS(audioBuffer);
console.log('RMS:', rms);

// Test resampling
const resampled = resample(audioBuffer, 24000);
console.log('Resampled rate:', resampled.sampleRate);
```

## License

This project is based on the original F5-TTS implementation. Refer to the original repository for licensing details.

## Credits

- [F5-TTS](https://github.com/SWivid/F5-TTS) - Original implementation
- [ONNX Runtime Web](https://onnxruntime.ai/docs/get-started/with-javascript.html) - Browser inference
- [Vocos](https://github.com/charactr-platform/vocos) - Neural vocoder