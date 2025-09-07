import { pipeline } from "@huggingface/transformers";

export class Transcriber {
  constructor({ dtype = "fp32", emit = () => {} }) {
    this.dtype = dtype;
    this.emit = emit;
    this.instance = null;
  }

  async initialize() {
    this.emit("progress", { value: 0, message: "Loading transcription model..." });
    this.instance = await pipeline(
      "automatic-speech-recognition",
      "nsarang/distil-whisper-small.en",
      {
        progress_callback: (progress) => {
          this.emit("progress", { value: progress, message: "Loading the transcription model..." });
        },
        dtype: this.dtype,
      }
    );
    this.emit("progress", { value: 100, message: "Transcriber loaded successfully" });
  }

  /**
   * Transcribes audio data into text using the Whisper model.
   *
   * @param {Float32Array} audioData - Raw audio waveform data as a Float32Array.
   * @param {number} [sampleRate=24000] - Audio sample rate in Hz (default: 24000).
   * @returns {Promise<Object>} - Transcription result with text and metadata.
   */
  async process({ audioData, sampleRate = 24000, chunk_length_s = 30, stride_length_s = 5 }) {
    if (!this.instance) {
      throw new Error("Model not loaded");
    }
    const result = await this.instance(audioData, {
      chunk_length_s: chunk_length_s,
      stride_length_s: stride_length_s,
      sampling_rate: sampleRate,
    });
    return result.text;
  }

  async dispose() {
    this.instance = null;
  }
}
