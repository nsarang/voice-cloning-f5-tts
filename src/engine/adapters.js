import { F5TTSAdapter, Transcriber } from "../core";

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
  f5tts: (config, onProgress) => new F5TTSAdapter(config, onProgress),
  transcriber: (config, onProgress) => new Transcriber(config, onProgress),
};

export const MESSAGES = {
  INITIALIZE: "initialize",
  PROCESS: "process",
  EVENT: "event",
  DISPOSE: "dispose",
  READY: "ready",
  RESULT: "result",
  PROGRESS: "progress",
  ERROR: "error",
};
