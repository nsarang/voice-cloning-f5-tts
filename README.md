# Voice Cloning w/ F5-TTS

Source code for the following project: [Voice Cloning in Browser with F5-TTS](https://nimasarang.com/project/2025-09-28-tts/)

A fully browser-based text-to-speech system with voice cloning capabilities. This implementation brings the F5-TTS model (Flow Matching with Diffusion Transformer) to the web using ONNX Runtime. Think of it as real-time neural voice synthesis without server dependencies.

## Features

- Voice Cloning: Generate speech in any voice using a 5-10 second reference audio sample
- Multi-Speaker Podcasts: Create conversations between different cloned voices
- Automatic Transcription: Built-in Distil Whisper model for reference audio transcription
- Zero-Latency After Load: All processing happens locally in the browser using WebGPU/WASM

## Technical Stack

**Models:**

- F5-TTS transformer (ONNX-optimized, ~200MB FP16)
- Distil Whisper small.en (transcription)

**Inference Engine:**

- ONNX Runtime Web with WebGPU/WASM backends
- FP16 support for GPU acceleration
- Custom tensor and audio processing pipelines

**Core Dependencies:**

- Transformers.js 3.7 (transcription pipeline)
- Comlink 4.x (Web Worker communication)
- React 19.x + Tailwind CSS (UI)

## Architecture

```
src/
├── core/                   # ML implementation layer
│   ├── f5-tts.js           # F5-TTS ONNX inference with 3-stage pipeline
│   ├── transcriber.js      # Whisper-based transcription
│   ├── audio.js            # Audio processing (RMS normalization, silence detection)
│   ├── inference.js        # High-level inference orchestration & batching
│   ├── device.js           # WebGPU device detection & capability checking
│   ├── utils.js            # Text chunking, progress tracking
│   └── tjs/                # Tensor library adopted from Transformers.js
│       ├── backends/       # ONNX Runtime integration & device mapping
│       ├── ops/            # Custom operations not in ORT
│       └── utils/
│           ├── torch.js    # Tensor class with autograd-style API
│           ├── audio.js    # Mel spectrogram, STFT, audio I/O
│           ├── maths.js    # FFT, interpolation, statistical ops
│           ├── hub.js      # HuggingFace Hub file loading & caching
│           └── devices.js  # Device type definitions & FP16 detection
│
├── engine/                 # Model execution infrastructure
│   ├── ModelContext.jsx    # React context for model lifecycle management
│   ├── worker.js           # Web Worker entry point for model execution
│   ├── adapters.js         # Adapter registry (f5tts, transcriber)
│   └── serialization.js    # Custom Tensor serialization for Comlink
│
├── tabs/                   # Feature-specific UI components
│   ├── TTSTab.jsx          # Single-voice TTS generation
│   ├── PodcastTab.jsx      # Multi-speaker dialogue generation
│   ├── CreditsTab.jsx      # Attribution & technical info
│   └── utils/              # Shared tab components
│       ├── AdvancedSettings.tsx  # Speed, NFE steps, chunking controls
│       ├── DeviceInfoCard.jsx    # WebGPU/WASM capability display
│       └── defaults.js           # Default TTS parameters
│
├── audio_input/            # Unified audio input handling
│   ├── components.jsx      # File upload, URL, microphone recording UI
│   └── hook.js             # useAudioInput state management hook
│
├── audio_player/           # Audio playback with waveform
│   └── AudioPlayer.jsx     # WaveSurfer.js integration
│
└── shared/                 # Reusable UI components
    ├── Button.tsx          # Animated generate button
    ├── TextInput.tsx       # Styled text/textarea input
    ├── ProgressBar.jsx     # Download/inference progress display
    └── useURLManager.js    # Blob URL lifecycle management
```

**Key Design Patterns:**

- Worker-based Execution: All model inference runs in dedicated Web Workers to prevent UI blocking
- Adapter Pattern: Unified interface for F5TTS and Transcriber models with event-driven progress reporting
- Lazy Initialization: Models are loaded on-demand and cached for subsequent use
- Tensor Serialization: Custom serialization handlers enable efficient transfer of Tensor objects between main thread and workers using Comlink

The F5-TTS inference follows a 3-stage pipeline:

- Encoder: Processes reference audio + text into latent representations with RoPE embeddings
- Transformer: Iterative denoising using Neural Flow Matching (NFE steps)
- Decoder: Converts latent mel-spectrogram to waveform
