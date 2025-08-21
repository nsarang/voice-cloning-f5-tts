/**
 * F5-TTS implementation matching Python ONNX version exactly
 */

import * as ort from 'onnxruntime-web';

export class F5TTS {
  constructor() {
    this.sessionA = null;
    this.sessionB = null;
    this.sessionC = null;
    this.vocabMap = null;
    this.nfeStep = 32;
    this.hopLength = 256;
    this.targetSampleRate = 24000;
    this.targetRMS = 0.1;
  }

  saveDebugData(data, name, step = null) {
    let dataDict;

    try {
      if (data instanceof Float32Array || data instanceof Int32Array || data instanceof Int16Array) {
        dataDict = {
          shape: [data.length],
          dtype: data.constructor.name,
          data: Array.from(data.slice(0, 100))
        };
      } else if (data instanceof BigInt64Array) {
        dataDict = {
          shape: [data.length],
          dtype: 'BigInt64Array',
          data: Array.from(data.slice(0, 100)).map(x => Number(x))  // Convert BigInt to Number
        };
      } else if (data && data.data) {  // ONNX tensor
        let tensorData;
        if (data.data instanceof BigInt64Array) {
          tensorData = Array.from(data.data.slice(0, 100)).map(x => Number(x));
        } else {
          tensorData = Array.from(data.data.slice(0, 100));
        }

        dataDict = {
          shape: data.dims || [],
          dtype: data.type || 'unknown',
          data: tensorData
        };
      } else if (typeof data === 'bigint') {
        dataDict = { value: Number(data) };  // Convert single BigInt
      } else {
        dataDict = { value: data };
      }

      const filename = `debug_${name}${step !== null ? '_' + step : ''}.json`;
      console.log(filename, dataDict);
      localStorage.setItem(filename, JSON.stringify(dataDict));

    } catch (error) {
      console.warn(`Failed to save debug data for ${name}:`, error.message);
      // Try minimal fallback
      try {
        const fallback = {
          name: name,
          type: typeof data,
          constructor: data?.constructor?.name || 'unknown',
          error: error.message
        };
        localStorage.setItem(`debug_${name}_error.json`, JSON.stringify(fallback));
      } catch (e) {
        console.error(`Complete failure saving debug data for ${name}`);
      }
    }
  }

  async loadModels(modelPaths) {
    // Configure ONNX Runtime with WebGPU support
    const providers = ['webgpu', 'cpu'];
    const sessionOptions = {
      executionProviders: providers,
      graphOptimizationLevel: 'all',
      enableMemPattern: true,
      enableCpuMemArena: true,
      extra: {
        session: {
          intra_op_num_threads: 8,
          inter_op_num_threads: 8,
          allow_profiling: false
        }
      }
    };

    // CPU-only options for preprocess and decode
    const cpuOptions = {
      executionProviders: ['cpu'],
      graphOptimizationLevel: 'all',
      enableMemPattern: true,
      enableCpuMemArena: true
    };

    try {
      // Load models
      this.sessionA = await ort.InferenceSession.create(modelPaths.preprocess, cpuOptions);
      this.sessionB = await ort.InferenceSession.create(modelPaths.transformer, sessionOptions);
      this.sessionC = await ort.InferenceSession.create(modelPaths.decode, cpuOptions);

      // Load vocabulary
      const vocabResponse = await fetch(modelPaths.vocab);
      const vocabText = await vocabResponse.text();
      this.vocabMap = {};

      vocabText.split('\n').forEach((char, idx) => {
        if (char.trim()) {
          this.vocabMap[char.trim()] = idx;
        }
      });

      console.log('Models loaded successfully');
      console.log('Transformer providers:', this.sessionB.inputNames);
    } catch (error) {
      throw new Error(`Failed to load models: ${error.message}`);
    }
  }

  // Audio processing functions
  async loadAudio(file) {
    const buffer = await file.arrayBuffer();
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const audio = await ctx.decodeAudioData(buffer);
    await ctx.close();
    return audio;
  }

  toMono(audioBuffer) {
    if (audioBuffer.numberOfChannels === 1) return audioBuffer;

    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const mono = ctx.createBuffer(1, audioBuffer.length, audioBuffer.sampleRate);
    const output = mono.getChannelData(0);

    for (let i = 0; i < audioBuffer.length; i++) {
      let sum = 0;
      for (let ch = 0; ch < audioBuffer.numberOfChannels; ch++) {
        sum += audioBuffer.getChannelData(ch)[i];
      }
      output[i] = sum / audioBuffer.numberOfChannels;
    }

    ctx.close();
    return mono;
  }

  resample(audioBuffer, targetRate = this.targetSampleRate) {
    if (audioBuffer.sampleRate === targetRate) return audioBuffer;

    const ratio = audioBuffer.sampleRate / targetRate;
    const newLength = Math.round(audioBuffer.length / ratio);
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const resampled = ctx.createBuffer(1, newLength, targetRate);

    const input = audioBuffer.getChannelData(0);
    const output = resampled.getChannelData(0);

    for (let i = 0; i < newLength; i++) {
      const pos = i * ratio;
      const idx = Math.floor(pos);
      const frac = pos - idx;

      if (idx + 1 < input.length) {
        output[i] = input[idx] * (1 - frac) + input[idx + 1] * frac;
      } else {
        output[i] = input[idx] || 0;
      }
    }

    ctx.close();
    return resampled;
  }

  calculateRMS(audioBuffer) {
    const samples = audioBuffer.getChannelData(0);
    let sum = 0;
    for (let i = 0; i < samples.length; i++) {
      sum += samples[i] * samples[i];
    }
    return Math.sqrt(sum / samples.length);
  }

  normalizeRMS(audioBuffer, targetRMS = this.targetRMS) {
    const currentRMS = this.calculateRMS(audioBuffer);
    if (currentRMS >= targetRMS) return audioBuffer;

    const scale = targetRMS / currentRMS;
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const normalized = ctx.createBuffer(1, audioBuffer.length, audioBuffer.sampleRate);

    const input = audioBuffer.getChannelData(0);
    const output = normalized.getChannelData(0);

    for (let i = 0; i < input.length; i++) {
      output[i] = input[i] * scale;
    }

    ctx.close();
    return normalized;
  }

  removeSilence(audioBuffer, threshDb = -50, minSilenceMs = 1000, keepMs = 500) {
    const samples = audioBuffer.getChannelData(0);
    const sampleRate = audioBuffer.sampleRate;
    const windowSize = Math.floor(sampleRate * 0.01);
    const linearThresh = Math.pow(10, threshDb / 20);
    const minSilenceSamples = (minSilenceMs / 1000) * sampleRate;

    const silenceSegments = [];
    let silenceStart = null;

    for (let i = 0; i < samples.length; i += windowSize) {
      let sum = 0;
      const end = Math.min(i + windowSize, samples.length);
      for (let j = i; j < end; j++) {
        sum += samples[j] * samples[j];
      }
      const rms = Math.sqrt(sum / (end - i));

      if (rms < linearThresh) {
        if (silenceStart === null) silenceStart = i;
      } else {
        if (silenceStart !== null) {
          const duration = i - silenceStart;
          if (duration >= minSilenceSamples) {
            silenceSegments.push([silenceStart, i]);
          }
          silenceStart = null;
        }
      }
    }

    if (silenceSegments.length === 0) return audioBuffer;

    const keepSamples = Math.floor((keepMs / 1000) * sampleRate);
    let newLength = audioBuffer.length;
    for (const [start, end] of silenceSegments) {
      newLength -= Math.max(0, end - start - keepSamples);
    }

    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const processed = ctx.createBuffer(1, newLength, sampleRate);
    const input = audioBuffer.getChannelData(0);
    const output = processed.getChannelData(0);

    let outputIdx = 0;
    let inputIdx = 0;

    for (const [silenceStart, silenceEnd] of silenceSegments) {
      while (inputIdx < silenceStart) {
        output[outputIdx++] = input[inputIdx++];
      }

      const silenceLength = silenceEnd - silenceStart;
      const keepLength = Math.min(keepSamples, silenceLength);
      for (let i = 0; i < keepLength; i++) {
        output[outputIdx++] = input[inputIdx + i];
      }

      inputIdx = silenceEnd;
    }

    while (inputIdx < input.length) {
      output[outputIdx++] = input[inputIdx++];
    }

    ctx.close();
    return processed;
  }

  limitDuration(audioBuffer, maxSeconds = 15) {
    const maxSamples = Math.floor(maxSeconds * audioBuffer.sampleRate);
    if (audioBuffer.length <= maxSamples) return audioBuffer;

    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const limited = ctx.createBuffer(1, maxSamples, audioBuffer.sampleRate);
    const input = audioBuffer.getChannelData(0);
    const output = limited.getChannelData(0);

    for (let i = 0; i < maxSamples; i++) {
      output[i] = input[i];
    }

    ctx.close();
    return limited;
  }

  async processReferenceAudio(file) {
    let audio = await this.loadAudio(file);
    audio = this.toMono(audio);
    audio = this.limitDuration(audio, 15);
    audio = this.removeSilence(audio);
    audio = this.normalizeRMS(audio);
    audio = this.resample(audio);
    return audio;
  }

  // Text processing (simplified English-only)
  tokenizeText(text) {
    const chars = text.toLowerCase().split('');
    const tokens = chars.map(char => this.vocabMap[char] || 0);
    return new Int32Array(tokens);
  }

  splitTextIntoBatches(text, maxChars = 200) {
    if (new Blob([text]).size <= maxChars) return [text];

    if (!text.match(/[.!?]$/)) text += '.';

    const sentences = text.split(/([.!?])/).reduce((acc, curr, i) => {
      if (i % 2 === 0) acc.push(curr);
      else acc[acc.length - 1] += curr;
      return acc;
    }, []).filter(s => s.trim());

    const batches = [];
    let current = "";

    for (const sentence of sentences) {
      if (new Blob([current + sentence]).size <= maxChars) {
        current += sentence;
      } else {
        if (current) batches.push(current);
        current = sentence;
      }
    }

    if (current) batches.push(current);
    return batches;
  }

  // calculateDuration(refText, genText, refAudioLen, speed = 1.0) {
  //   const zhPausePunc = /[。，、；：？！]/g;
    
  //   const refTextLen = new TextEncoder().encode(refText).length + 
  //                     3 * (refText.match(zhPausePunc) || []).length;
  //   const genTextLen = new TextEncoder().encode(genText).length + 
  //                     3 * (genText.match(zhPausePunc) || []).length;
    
  //   return refAudioLen + Math.floor(refAudioLen / refTextLen * genTextLen / speed);
  // }

  normalizeToInt16(audio) {
    const maxVal = Math.max(...audio.map(Math.abs));
    const scale = maxVal > 0 ? 32767 / maxVal : 1;
    return new Int16Array(audio.map(x => Math.round(x * scale)));
  }

  async inference(refAudio, refText, genText, onProgress, speed = 1.0) {
    if (!this.sessionA || !this.sessionB || !this.sessionC) {
      throw new Error('Models not loaded');
    }

    // Prepare audio - exact Python implementation
    const audioSamples = Array.from(refAudio.getChannelData(0));
    const audioInt16 = this.normalizeToInt16(audioSamples);
    const audioTensor = new ort.Tensor('int16', new Int16Array(audioInt16), [1, 1, audioInt16.length]);

    // Prepare text
    const combinedText = refText + " " + genText;
    const textTokens = this.tokenizeText(combinedText);
    const textTensor = new ort.Tensor('int32', textTokens, [1, textTokens.length]);

    // Calculate duration - matching Python
    const refAudioLen = Math.floor(audioSamples.length / this.hopLength);
    const refTextLen = refText.length;
    const genTextLen = genText.length;
    const duration = refAudioLen + Math.trunc(refAudioLen / refTextLen * genTextLen / speed);
    const durationTensor = new ort.Tensor('int64', new BigInt64Array([BigInt(duration)]), [1]);

    this.saveDebugData(textTensor, "text_tensor");

    // Stage A: Preprocess - exact input names from Python
    const preprocessInputs = {
      [this.sessionA.inputNames[0]]: audioTensor,
      [this.sessionA.inputNames[1]]: textTensor,
      [this.sessionA.inputNames[2]]: durationTensor
    };

    const preprocessOutputs = await this.sessionA.run(preprocessInputs);

    let noise = preprocessOutputs[this.sessionA.outputNames[0]];
    const ropeCosQ = preprocessOutputs[this.sessionA.outputNames[1]];
    const ropeSinQ = preprocessOutputs[this.sessionA.outputNames[2]];
    const ropeCosK = preprocessOutputs[this.sessionA.outputNames[3]];
    const ropeSinK = preprocessOutputs[this.sessionA.outputNames[4]];
    const catMelText = preprocessOutputs[this.sessionA.outputNames[5]];
    const catMelTextDrop = preprocessOutputs[this.sessionA.outputNames[6]];
    const refSignalLen = preprocessOutputs[this.sessionA.outputNames[7]];
    this.saveDebugData(noise, "stage_a_noise");
    this.saveDebugData(refSignalLen, "stage_a_ref_signal_len");

    // Stage B: Transformer NFE steps - exact Python loop
    let timeStep = new ort.Tensor('int32', new Int32Array([0]), [1]);

    for (let step = 0; step < this.nfeStep - 1; step++) {
      const transformerInputs = {
        [this.sessionB.inputNames[0]]: noise,
        [this.sessionB.inputNames[1]]: ropeCosQ,
        [this.sessionB.inputNames[2]]: ropeSinQ,
        [this.sessionB.inputNames[3]]: ropeCosK,
        [this.sessionB.inputNames[4]]: ropeSinK,
        [this.sessionB.inputNames[5]]: catMelText,
        [this.sessionB.inputNames[6]]: catMelTextDrop,
        [this.sessionB.inputNames[7]]: timeStep
      };

      const transformerOutputs = await this.sessionB.run(transformerInputs);
      noise = transformerOutputs[this.sessionB.outputNames[0]];
      timeStep = transformerOutputs[this.sessionB.outputNames[1]];

      this.saveDebugData(noise, "stage_b_noise", step);
      this.saveDebugData(timeStep, "stage_b_timestep", step);

      if (onProgress) {
        onProgress(((step + 1) / this.nfeStep) * 100, `NFE Step ${step + 1}/${this.nfeStep}`);
      }
    }

    // Stage C: Decode
    const decodeInputs = {
      [this.sessionC.inputNames[0]]: noise,
      [this.sessionC.inputNames[1]]: refSignalLen
    };

    const decodeOutputs = await this.sessionC.run(decodeInputs);
    const generatedSignal = decodeOutputs[this.sessionC.outputNames[0]];

    this.saveDebugData(generatedSignal, "stage_c_output");

    // Convert int16 to float32 - exact Python conversion
    const int16Data = generatedSignal.data;
    const float32Data = new Float32Array(int16Data.length);
    for (let i = 0; i < int16Data.length; i++) {
      float32Data[i] = int16Data[i] / 32767.0;
    }

    const generatedFloat32 = new Float32Array(int16Data.length);
    for (let i = 0; i < int16Data.length; i++) {
      generatedFloat32[i] = int16Data[i] / 32767.0;
    }

    // Apply RMS adjustment if reference was quiet
    const refRMS = this.calculateRMS(refAudio);
    if (refRMS < this.targetRMS) {
      const currentRMS = Math.sqrt(generatedFloat32.reduce((sum, x) => sum + x * x, 0) / generatedFloat32.length);
      if (currentRMS > 0) {
        const scale = refRMS / this.targetRMS;
        for (let i = 0; i < generatedFloat32.length; i++) {
          generatedFloat32[i] *= scale;
        }
      }
    }

    this.saveDebugData(audioInt16, "audio_processed");
    this.saveDebugData(audioSamples.length, "audio_len");
    // this.saveDebugData(textIds, "text_ids");
    this.saveDebugData(duration, "duration");

    return generatedFloat32;
  }

  async generateSpeech(refAudio, refText, genText, onProgress, speed = 1.0) {
    // Calculate max chars based on reference audio
    const refDuration = refAudio.length / refAudio.sampleRate;
    const maxChars = Math.trunc(new TextEncoder().encode(refText).length / (refAudio.length / refAudio.sampleRate) * (30 - refAudio.length / refAudio.sampleRate));

    const textBatches = this.splitTextIntoBatches(genText, Math.max(maxChars, 100));

    if (textBatches.length === 1) {
      return await this.inference(refAudio, refText, genText, onProgress);
    }

    // Batch processing
    const results = [];
    const total = textBatches.length * this.nfeStep;
    let current = 0;

    for (let i = 0; i < textBatches.length; i++) {
      const result = await this.inference(
        refAudio,
        refText,
        textBatches[i],
        (progress, message) => {
          if (onProgress) {
            const overall = (current + progress) / total * 100;
            onProgress(overall, `Batch ${i + 1}/${textBatches.length}: ${message}`);
          }
        }
      );

      results.push(result);
      current += this.nfeStep;
    }

    // Concatenate results
    const totalLength = results.reduce((sum, arr) => sum + arr.length, 0);
    const combined = new Float32Array(totalLength);
    let offset = 0;

    for (const result of results) {
      combined.set(result, offset);
      offset += result.length;
    }

    return combined;
  }
}