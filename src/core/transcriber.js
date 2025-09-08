import { pipeline } from "@huggingface/transformers";

import Logger from "../logging";
import { Tensor } from "./tjs/utils/torch";
import { defaultDownloadProgressCallback } from "./utils";

const LOG = Logger.get("Transcriber");

export class Transcriber {
  constructor({ dtype = "fp32", emit = LOG.trace }) {
    this.dtype = dtype;
    this.emit = emit;
    this.instance = null;
  }

  async initialize() {
    if (this.instance) {
      return;
    }
    this.emit("initialize", { value: 0, message: "Loading transcription model..." });
    const progressCallback = defaultDownloadProgressCallback(this.emit);

    this.instance = await pipeline(
      "automatic-speech-recognition",
      "nsarang/distil-whisper-small.en",
      {
        progress_callback: progressCallback,
        dtype: this.dtype,
      }
    );
    this.emit("initialize", { value: 100, message: "Transcriber loaded successfully" });
  }

  /**
   * Transcribes audio data into text using the Whisper model.
   *
   * @param {Tensor} audioData - Raw audio waveform data as a float32 Tensor.
   * @param {number} [sampleRate=24000] - Audio sample rate in Hz (default: 24000).
   * @returns {Promise<Object>} - Transcription result with text and metadata.
   */
  async inference({ audioData, sampleRate = 24000, chunk_length_s = 30, stride_length_s = 5 }) {
    this.emit("inference", { value: 0, message: "Transcribing audio..." });
    if (!this.instance) {
      throw new Error("Model not loaded");
    }
    if (this.dtype === "fp16") {
      audioData = audioData.to("float16");
    }
    const result = await this.instance(audioData.data, {
      chunk_length_s: chunk_length_s,
      stride_length_s: stride_length_s,
      sampling_rate: sampleRate,
    });
    this.emit("inference", { value: 100, message: "Transcription complete" });
    return result.text;
  }

  async dispose() {
    this.instance = null;
  }
}
