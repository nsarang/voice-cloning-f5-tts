# Voice Cloning w/ F5-TTS

Source code for the following project: [Voice Cloning in Browser with F5-TTS](https://nimasarang.com/project/2025-09-28-tts/)

Browser-based text-to-speech with voice cloning using F5-TTS (Flow Matching with Diffusion Transformer) via ONNX Runtime. All processing runs locally using WebGPU/WASM.

## Features

- Voice cloning from 5-10 second reference audio samples
- Multi-speaker podcast generation
- Automatic transcription via Distil Whisper
- Local inference without server dependencies

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
├── core/                   # ML implementation
│   ├── f5-tts.js           # F5-TTS ONNX inference (3-stage pipeline)
│   ├── transcriber.js      # Whisper transcription
│   ├── audio.js            # RMS normalization, silence detection
│   ├── inference.js        # Inference orchestration & batching
│   ├── device.js           # WebGPU capability detection
│   ├── utils.js            # Text chunking, progress tracking
│   └── tjs/                # Tensor library (from Transformers.js)
│       ├── backends/       # ONNX Runtime integration
│       ├── ops/            # Custom operations
│       └── utils/
│           ├── torch.js    # Tensor class with autograd-style API
│           ├── audio.js    # Mel spectrogram, STFT, audio I/O
│           ├── maths.js    # FFT, interpolation, statistical ops
│           ├── hub.js      # HuggingFace Hub integration
│           └── devices.js  # Device types & FP16 detection
│
├── engine/                 # Model execution infrastructure
│   ├── ModelContext.jsx    # Model lifecycle management
│   ├── worker.js           # Web Worker entry point
│   ├── adapters.js         # Model adapter registry
│   └── serialization.js    # Tensor serialization for Comlink
│
├── tabs/                   # UI components
│   ├── TTSTab.jsx          # Single-voice generation
│   ├── PodcastTab.jsx      # Multi-speaker dialogue
│   ├── CreditsTab.jsx      # Attribution
│   └── utils/
│       ├── AdvancedSettings.tsx  # Speed, NFE steps, chunking controls
│       ├── DeviceInfoCard.jsx    # Capability display
│       └── defaults.js           # Default parameters
│
├── audio_input/            # Audio input handling
│   ├── components.jsx      # File upload, URL, microphone UI
│   └── hook.js             # useAudioInput hook
│
├── audio_player/           # Playback with waveform
│   └── AudioPlayer.jsx     # WaveSurfer.js integration
│
└── shared/                 # Reusable components
    ├── Button.tsx          # Generate button
    ├── TextInput.tsx       # Text/textarea input
    ├── ProgressBar.jsx     # Progress display
    └── useURLManager.js    # Blob URL lifecycle
```

**Implementation Details:**

- All model inference runs in Web Workers to prevent UI blocking
- Models load on-demand and cache for subsequent use
- Custom Tensor serialization enables thread communication via Comlink
- Unified adapter interface for F5TTS and Transcriber with event-driven progress reporting

F5-TTS inference pipeline:
1. **Encoder**: Processes reference audio + text into latent representations with RoPE embeddings
2. **Transformer**: Iterative denoising via Neural Flow Matching (NFE steps)
3. **Decoder**: Converts latent mel-spectrogram to waveform
