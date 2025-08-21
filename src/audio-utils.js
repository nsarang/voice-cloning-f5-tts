/**
 * Audio processing utilities for F5-TTS
 */

export async function loadAudio(file) {
  const buffer = await file.arrayBuffer();
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const audio = await ctx.decodeAudioData(buffer);
  ctx.close();
  return audio;
}

export function toMono(audioBuffer) {
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

export function resample(audioBuffer, targetRate = 24000) {
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

export function calculateRMS(audioBuffer) {
  const samples = audioBuffer.getChannelData(0);
  let sum = 0;
  for (let i = 0; i < samples.length; i++) {
    sum += samples[i] * samples[i];
  }
  return Math.sqrt(sum / samples.length);
}

export function normalizeRMS(audioBuffer, targetRMS = 0.1) {
  const currentRMS = calculateRMS(audioBuffer);
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

export function removeSilence(audioBuffer, threshDb = -50, minSilenceMs = 1000, keepMs = 500) {
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

export function limitDuration(audioBuffer, maxSeconds = 15) {
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

export async function processReferenceAudio(file) {
  let audio = await loadAudio(file);
  audio = toMono(audio);
  audio = limitDuration(audio, 15);
  audio = removeSilence(audio);
  audio = normalizeRMS(audio);
  audio = resample(audio);
  return audio;
}