/**
 * F5-TTS implementation matching Python ONNX version exactly
 */

import * as ort from "onnxruntime-web";

import Logger from "../logging";
import { calculateRMS, normalizeToInt16 } from "./audio";
import { createInferenceSession, deviceToExecutionProviders } from "./tjs/backends/onnx";
import { Tensor } from "./tjs/utils/torch";

const LOG = Logger.get("F5TTS");

export class F5TTS {
  constructor(rootPath = "") {
    this.rootPath = rootPath;
    this.sessionA = null;
    this.sessionB = null;
    this.sessionC = null;
    this.vocabMap = null;
    this.hopLength = 256;
    this.targetSampleRate = 24000;
    this.targetRMS = 0.1;
  }

  async load() {
    const modelPaths = {
      preprocess: `${this.rootPath}/models/F5_Preprocess.onnx`,
      transformer: `${this.rootPath}/models/F5_Transformer.onnx`,
      decode: `${this.rootPath}/models/F5_Decode.onnx`,
      vocab: `${this.rootPath}/models/Emilia_ZH_EN_pinyin/vocab.txt`,
    };

    const providers = deviceToExecutionProviders("auto");

    // If WebGPU is detected, configure it for high performance
    const webgpuProviderIndex = providers.findIndex(
      (p) =>
        (typeof p === "string" && p === "webgpu") || (typeof p === "object" && p.name === "webgpu")
    );

    if (webgpuProviderIndex !== -1) {
      try {
        const adapter = await navigator.gpu.requestAdapter({
          powerPreference: "high-performance",
          forceFallbackAdapter: false,
        });

        if (adapter) {
          const device = await adapter.requestDevice();
          providers[webgpuProviderIndex] = {
            name: "webgpu",
            device: device,
            powerPreference: "high-performance",
          };
          LOG.debug("WebGPU configured with high-performance adapter");
        }
      } catch (e) {
        LOG.debug("High-performance GPU setup failed, using default WebGPU");
      }
    }

    LOG.debug("Detected providers:", providers);
    // if (!providers.includes("cpu")) {
    //   providers.push("cpu");
    // }

    const sessionOptions = {
      executionProviders: providers,
      graphOptimizationLevel: "all",
      enableMemPattern: true,
      enableCpuMemArena: true,
      // logSeverityLevel: 0,
      extra: {
        session: {
          intra_op_num_threads: 8,
          inter_op_num_threads: 8,
          allow_profiling: false,
          // disable_cpu_ep_fallback: true
        },
      },
    };
    const sessionConfig = {};

    try {
      // Load models
      this.sessionA = await createInferenceSession(
        modelPaths.preprocess,
        sessionOptions,
        sessionConfig
      );
      this.sessionB = await createInferenceSession(
        modelPaths.transformer,
        sessionOptions,
        sessionConfig
      );
      this.sessionC = await createInferenceSession(
        modelPaths.decode,
        sessionOptions,
        sessionConfig
      );

      // Load vocabulary
      const vocabResponse = await fetch(modelPaths.vocab);
      const vocabText = await vocabResponse.text();
      this.vocabMap = {};

      vocabText.split("\n").forEach((char, idx) => {
        if (char.trim()) {
          this.vocabMap[char.trim()] = idx;
        }
      });

      LOG.debug("Models loaded successfully");
    } catch (error) {
      throw new Error(`Failed to load models: ${error.message}`);
    }
  }

  tokenizeText(text) {
    const chars = text.split("");
    const tokens = chars.map((char) => this.vocabMap[char] || 0);
    return tokens;
  }

  /**
   * Generate speech audio from text using the F5TTS model.
   * @param {Tensor} refAudio - The reference audio data.
   * @param {string} refText - The reference text for the audio.
   * @param {string} genText - The text to generate audio for.
   * @param {Function} onProgress - Callback for progress updates.
   * @param {number} speed - The speed of the generated speech.
   * @param {number} nfeSteps - The number of NFE steps for generation.
   * @returns {Promise<Float32Array>} - The generated speech audio data.
   */
  async inference({ refAudio, refText, genText, onProgress, speed, nfeSteps }) {
    if (!this.sessionA || !this.sessionB || !this.sessionC) {
      throw new Error("Models not loaded");
    }

    const refRMS = calculateRMS(refAudio);
    if (refRMS < this.targetRMS) {
      refAudio = refAudio.div(refRMS * this.targetRMS);
    }

    const audioTensor = normalizeToInt16(refAudio).reshape(1, 1, -1);

    // Prepare text
    const combinedText = refText + " " + genText;
    const textTokens = this.tokenizeText(combinedText);
    const textTensor = new Tensor("int32", Int32Array.from(textTokens), [1, textTokens.length]);

    // Calculate duration - matching Python
    const refAudioLen = Math.trunc(refAudio.size / this.hopLength);
    const duration =
      refAudioLen + Math.trunc(((refAudioLen / (refText.length + 1)) * genText.length) / speed);
    const durationTensor = new Tensor("int64", new BigInt64Array([BigInt(duration)]), [1]);

    // Stage A: Preprocess - exact input names from Python
    const preprocessInputs = {
      [this.sessionA.inputNames[0]]: audioTensor.ort,
      [this.sessionA.inputNames[1]]: textTensor.ort,
      [this.sessionA.inputNames[2]]: durationTensor.ort,
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

    // Stage B: Transformer NFE steps - exact Python loop
    let timeStep = new ort.Tensor("int32", new Int32Array([0]), [1]);

    // to Float16
    // noise = torch.to(noise, "float16");
    // ropeCosQ = torch.to(ropeCosQ, "float16");
    // ropeSinQ = torch.to(ropeSinQ, "float16");
    // ropeCosK = torch.to(ropeCosK, "float16");
    // ropeSinK = torch.to(ropeSinK, "float16");
    // catMelText = torch.to(catMelText, "float16");
    // catMelTextDrop = torch.to(catMelTextDrop, "float16");

    for (let step = 0; step < nfeSteps - 1; step++) {
      const transformerInputs = {
        [this.sessionB.inputNames[0]]: noise,
        [this.sessionB.inputNames[1]]: ropeCosQ,
        [this.sessionB.inputNames[2]]: ropeSinQ,
        [this.sessionB.inputNames[3]]: ropeCosK,
        [this.sessionB.inputNames[4]]: ropeSinK,
        [this.sessionB.inputNames[5]]: catMelText,
        [this.sessionB.inputNames[6]]: catMelTextDrop,
        [this.sessionB.inputNames[7]]: timeStep,
      };

      const transformerOutputs = await this.sessionB.run(transformerInputs);
      noise = transformerOutputs[this.sessionB.outputNames[0]];
      timeStep = transformerOutputs[this.sessionB.outputNames[1]];

      if (onProgress) {
        onProgress({
          value: ((step + 1) / nfeSteps) * 100,
          message: `NFE Step ${step + 1}/${nfeSteps}`,
        });
      }
    }

    // Stage C: Decode
    const decodeInputs = {
      [this.sessionC.inputNames[0]]: noise,
      [this.sessionC.inputNames[1]]: refSignalLen,
    };

    const decodeOutputs = await this.sessionC.run(decodeInputs);
    const generatedSignal = decodeOutputs[this.sessionC.outputNames[0]];

    let normalizedTensor = new Tensor(generatedSignal).to("float32").div(32767.0).reshape(-1);

    // Revert back to original RMS
    if (refRMS < this.targetRMS) {
      normalizedTensor = normalizedTensor.mul(refRMS / this.targetRMS);
    }

    return normalizedTensor;
  }
}
