import { F5TTS, Transcriber } from "../core";

export class ModelAdapterBase {
  constructor({ emit = () => {}, ...config }) {
    this.config = config;
    this.emit = emit;
  }

  async initialize() {
    throw new Error("initialize() must be implemented");
  }

  async process() {
    throw new Error("process() must be implemented");
  }

  async dispose() {
    // Optional cleanup
  }
}

export const adapterRegistry = {
  f5tts: F5TTS,
  transcriber: Transcriber,
};
