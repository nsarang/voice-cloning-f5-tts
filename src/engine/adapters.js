import { F5TTS, Transcriber } from "../core";

export class ModelAdapter {
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

export class F5TTSAdapter {
  constructor({ rootPath = "", emit = () => {} }) {
    this.rootPath = rootPath;
    this.emit = emit;
    this.ttsEngine = null;
  }

  async initialize() {
    this.emit("progress", { value: 0, message: "Loading TTS model..." });
    this.ttsEngine = new F5TTS(this.rootPath);
    await this.ttsEngine.load();
    this.emit("progress", { value: 100, message: "TTS model loaded successfully" });
  }

  async process(input = {}) {
    if (!this.ttsEngine) throw new Error("F5TTS engine not initialized");

    return await this.ttsEngine.inference({
      ...input,
      onProgress: ({ value, message }) => {
        this.emit("progress", { value, message });
      },
    });
  }

  async dispose() {
    this.ttsEngine = null;
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
