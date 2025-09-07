/**
 * Audio processing utilities for F5-TTS
 */

import * as torch from "./tjs/utils/torch";

/**
 * Loads an audio file and returns the decoded audio data.
 * @param {File} file - The audio file to load.
 * @param {number} targetRate - The target sample rate for the audio.
 * @returns {Promise<torch.Tensor>} The decoded audio data as a Tensor.
 */
export async function loadAudio({ file, targetRate }) {
  const buffer = await file.arrayBuffer();
  const ctx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: targetRate });
  const audio = await ctx.decodeAudioData(buffer);
  ctx.close();

  // convert to tensor
  const channels = audio.numberOfChannels;
  const length = audio.length;
  const concat = new Float32Array(length * channels);
  for (let ch = 0; ch < channels; ch++) {
    concat.set(audio.getChannelData(ch), ch * length);
  }
  const output = new torch.Tensor("float32", concat, [channels, length]);
  return output;
}

/**
 * Calculates the RMS (Root Mean Square) of a tensor.
 * @param {torch.Tensor} tensor - The input tensor.
 * @returns {number} The RMS value.
 */
export function calculateRMS(tensor) {
  return tensor.pow(2).mean().pow(0.5).item();
}

/**
 * Normalizes a tensor to the int16 range [-32768, 32767].
 * @param {torch.Tensor} tensor - The input tensor.
 * @param {number} [quantile=0.99] - The quantile for scaling.
 * @returns {torch.Tensor} The normalized tensor.
 */
export function normalizeToInt16(tensor, quantile = 0.999) {
  const maxVal = tensor.abs().quantile(quantile).item();
  const scale = maxVal > 0 ? 32767 / maxVal : 1;
  const scaled = tensor.mul(scale).round().clamp(-32768, 32767).to("int16");
  return scaled;
}

export function msToSamples(ms, sampleRate) {
  return Math.floor((ms * sampleRate) / 1000);
}

/**
 * Detects silent regions in an audio tensor based on RMS and a silence threshold.
 * @param {Object} params - The parameters for silence detection.
 * @param {torch.Tensor} audioTensor - The input audio tensor.
 * @param {number} [sampleRate=24000] - The sample rate of the audio.
 * @param {number} [minSilenceMs=100] - Minimum duration of silence in milliseconds.
 * @param {number} [silenceThresh=-16] - Silence threshold in decibels.
 * @param {number} [seekStepMs=10] - Step size in milliseconds for searching silence.
 * @returns {Array<Array<number>>} An array of silent ranges as [start, end] pairs.
 */
export function detectSilence({
  audioTensor,
  sampleRate = 24000,
  minSilenceMs = 100,
  silenceThresh = -16,
  seekStepMs = 10,
}) {
  const minSilenceSamples = msToSamples(minSilenceMs, sampleRate);
  const seekStep = msToSamples(seekStepMs, sampleRate);

  if (audioTensor.size < minSilenceSamples) return [];

  // decibels to linear
  const silenceThreshFloat = Math.pow(10, silenceThresh / 20);
  const silenceStarts = [];

  for (let i = 0; i <= audioTensor.size - minSilenceSamples; i += seekStep) {
    const windowEnd = Math.min(i + minSilenceSamples, audioTensor.size);
    const window = audioTensor.slice([i, windowEnd]);
    const rms = calculateRMS(window);

    if (rms <= silenceThreshFloat) {
      silenceStarts.push(i);
    }
  }

  if (!silenceStarts.length) return [];

  // Merge consecutive silent ranges
  const silentRanges = [];
  let currentStart = silenceStarts[0];
  let currentEnd = currentStart + minSilenceSamples;

  for (const pos of silenceStarts.slice(1)) {
    if (pos <= currentEnd) {
      currentEnd = pos + minSilenceSamples;
    } else {
      // Gap found, save current range and start new one
      silentRanges.push([currentStart, currentEnd]);
      currentStart = pos;
      currentEnd = pos + minSilenceSamples;
    }
  }
  silentRanges.push([currentStart, Math.min(currentEnd, audioTensor.size)]);

  return silentRanges;
}

/**
 * Splits an audio tensor into segments based on silent regions.
 * @param {Object} params - The parameters for splitting.
 * @param {torch.Tensor} audioTensor - The input audio tensor.
 * @param {number} [sampleRate=24000] - The sample rate of the audio.
 * @param {number} [minSilenceMs=1000] - Minimum duration of silence in milliseconds.
 * @param {number} [silenceThresh=-16] - Silence threshold in decibels.
 * @param {number} [padMs=100] - Padding duration in milliseconds to include before and after segments.
 * @param {number} [seekStepMs=1] - Step size in milliseconds for searching silence.
 * @returns {Array<torch.Tensor>} An array of audio segments as tensors.
 */
export function split_on_silence({
  audioTensor,
  sampleRate = 24000,
  minSilenceMs = 1000,
  silenceThresh = -16,
  padMs = 100,
  seekStepMs = 1,
}) {
  if (2 * padMs > minSilenceMs) {
    throw new Error("Padding duration must be less than half of the minimum silence duration.");
  }
  const padMsSamples = msToSamples(padMs, sampleRate);

  const silentRanges = detectSilence({
    audioTensor,
    sampleRate,
    minSilenceMs,
    silenceThresh,
    seekStepMs,
  });
  const paddedRanges = [[null, 0], ...silentRanges, [audioTensor.size, null]];
  const segments = [];

  for (let i = 0; i < paddedRanges.length - 1; i++) {
    const end1 = paddedRanges[i][1];
    const start2 = paddedRanges[i + 1][0];
    if (start2 > end1) {
      const range = [
        Math.max(end1 - padMsSamples, 0),
        Math.min(start2 + padMsSamples, audioTensor.size),
      ];
      segments.push(audioTensor.slice(range));
    }
  }
  return segments;
}

/**
 * Removes silent regions from an audio tensor.
 * @param {...any} args - Arguments to pass to `split_on_silence`.
 * @returns {torch.Tensor} The concatenated tensor with silence removed.
 */
export function remove_silence(...args) {
  return torch.cat(split_on_silence(...args));
}

/**
 * Creates an empty (silent) audio segment of the specified duration.
 * @param {number} durationMs - The duration of the silent segment in milliseconds.
 * @param {number} sampleRate - The sample rate of the audio.
 * @returns {torch.Tensor} A tensor representing the silent audio segment.
 */
export function emptySegment({ durationMs = 500, sampleRate = 24000 }) {
  const length = msToSamples(durationMs, sampleRate);
  return new torch.zeros([length]).to("float32");
}
