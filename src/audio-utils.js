/**
 * Audio processing utilities for F5-TTS
 */

import { Tensor } from './tjs/utils/torch.js';
import { interpolate_data } from './tjs/utils/maths.js';


/**
 * Loads an audio file and returns the decoded audio data.
 * @param {File} file - The audio file to load.
 * @param {number} targetRate - The target sample rate for the audio.
 * @returns {Promise<Tensor>} The decoded audio data as a Tensor.
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
  const output = new Tensor('float32', concat, [channels, length]);
  return output;
}


/**
 * Calculates the RMS (Root Mean Square) of a tensor.
 * @param {Tensor} tensor - The input tensor.
 * @returns {number} The RMS value.
 */
export function calculateRMS(tensor) {
  const rms = tensor.norm(2).item() / Math.sqrt(tensor.size);
  return rms;
}

export function normalizeToInt16(tensor) {
  const maxVal = tensor.abs().max().item();
  const scale = maxVal > 0 ? 32767 / maxVal : 1;
  const scaled = tensor.mul(scale).round().clamp(-32768, 32767).to("int16")
  return scaled
}