/**
 * F5-TTS implementation matching Python ONNX version exactly
 */

import * as ort from "onnxruntime-web";

import Logger from "../logging";
import { calculateRMS, normalizeToInt16 } from "./audio";
import { createInferenceSession, deviceToExecutionProviders } from "./tjs/backends/onnx";
import { isWebGpuFp16Supported } from "./tjs/utils/devices";
import { getModelFile, getModelText } from "./tjs/utils/hub";
import { Tensor } from "./tjs/utils/torch";
import * as torch from "./tjs/utils/torch";
import { defaultDownloadProgressCallback } from "./utils";

const LOG = Logger.get("F5TTS");

export class F5TTS {
  constructor({ repoName = "", rootPath = "", useFP16 = true, emit = LOG.trace }) {
    this.repoName = repoName;
    this.rootPath = rootPath;
    this.useFP16 = useFP16;
    this.emit = emit;

    this.sessions = {
      encoder: null,
      transformer: null,
      decoder: null,
    };
    this.hopLength = 256;
    this.targetSampleRate = 24000;
    this.targetRMS = 0.1;

    this.modelPaths = {
      preprocess: `${this.rootPath}onnx/encoder_fp32.onnx`,
      transformer: `${this.rootPath}onnx/transformer_fp32.onnx`,
      transformer_fp16: `${this.rootPath}onnx/transformer_fp16.onnx`,
      decode: `${this.rootPath}onnx/decoder_fp32.onnx`,
      vocab: `${this.rootPath}vocab.txt`,
    };
  }

  async initialize() {
    this.emit("initialize", { value: 0, message: "Loading TTS model..." });
    const providers = deviceToExecutionProviders("auto");
    let transformerPath = this.useFP16
      ? this.modelPaths.transformer_fp16
      : this.modelPaths.transformer;

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

          if (this.useFP16 && !(await isWebGpuFp16Supported())) {
            LOG.warn("WebGPU fp16 is not supported on this device. Falling back to fp32 model");
            this.useFP16 = false;
            transformerPath = this.modelPaths.transformer;
          }
        }
      } catch (e) {
        LOG.debug("High-performance GPU setup failed, using default WebGPU");
      }
    }

    LOG.debug("Detected providers:", providers);

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

    // Load models
    const progressCallback = defaultDownloadProgressCallback({
      emit: this.emit,
      messagePrefix: "TTS: Downloading model files",
    });
    const [encoderModel, transformerModel, decoderModel] = await Promise.all(
      [this.modelPaths.preprocess, transformerPath, this.modelPaths.decode].map((path) =>
        getModelFile(this.repoName, path, true, { progress_callback: progressCallback })
      )
    );
    this.sessions.encoder = await createInferenceSession(
      encoderModel,
      sessionOptions,
      sessionConfig
    );
    this.sessions.transformer = await createInferenceSession(
      transformerModel,
      sessionOptions,
      sessionConfig
    );
    this.sessions.decoder = await createInferenceSession(
      decoderModel,
      sessionOptions,
      sessionConfig
    );

    // Load vocabulary
    const vocabText = await getModelText(this.repoName, this.modelPaths.vocab);
    this.vocabMap = {};

    vocabText.split("\n").forEach((char, idx) => {
      if (char.trim()) {
        this.vocabMap[char.trim()] = idx;
      }
    });

    LOG.debug("Models loaded successfully");
    this.emit("initialize", { value: 100, message: "TTS model loaded successfully" });
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
   * @param {number} speed - The speed of the generated speech.
   * @param {number} nfeSteps - The number of NFE steps for generation.
   * @returns {Promise<Float32Array>} - The generated speech audio data.
   */
  async inference({ refAudio, refText, genText, speed, nfeSteps }) {
    if (Object.values(this.sessions).some((s) => !s)) {
      throw new Error("Models not loaded");
    }
    const { encoder, transformer, decoder } = this.sessions;

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
    LOG.debug(
      "Ref audio length (frames):",
      refAudioLen,
      "Duration (frames):",
      duration,
      "Speed:",
      speed
    );

    // Stage A: Preprocess - exact input names from Python
    const preprocessInputs = {
      [encoder.inputNames[0]]: audioTensor.ort,
      [encoder.inputNames[1]]: textTensor.ort,
      [encoder.inputNames[2]]: durationTensor.ort,
    };

    const preprocessOutputs = await encoder.run(preprocessInputs);

    let noise = preprocessOutputs[encoder.outputNames[0]];
    let ropeCosQ = preprocessOutputs[encoder.outputNames[1]];
    let ropeSinQ = preprocessOutputs[encoder.outputNames[2]];
    let ropeCosK = preprocessOutputs[encoder.outputNames[3]];
    let ropeSinK = preprocessOutputs[encoder.outputNames[4]];
    let catMelText = preprocessOutputs[encoder.outputNames[5]];
    let catMelTextDrop = preprocessOutputs[encoder.outputNames[6]];
    const refSignalLen = preprocessOutputs[encoder.outputNames[7]];

    // Stage B: Transformer NFE steps - exact Python loop
    let timeStep = new ort.Tensor("int32", new Int32Array([0]), [1]);

    if (this.useFP16) {
      noise = torch.to(noise, "float16");
      ropeCosQ = torch.to(ropeCosQ, "float16");
      ropeSinQ = torch.to(ropeSinQ, "float16");
      ropeCosK = torch.to(ropeCosK, "float16");
      ropeSinK = torch.to(ropeSinK, "float16");
      catMelText = torch.to(catMelText, "float16");
      catMelTextDrop = torch.to(catMelTextDrop, "float16");
    }

    for (let step = 0; step < nfeSteps - 1; step++) {
      const transformerInputs = {
        [transformer.inputNames[0]]: noise,
        [transformer.inputNames[1]]: ropeCosQ,
        [transformer.inputNames[2]]: ropeSinQ,
        [transformer.inputNames[3]]: ropeCosK,
        [transformer.inputNames[4]]: ropeSinK,
        [transformer.inputNames[5]]: catMelText,
        [transformer.inputNames[6]]: catMelTextDrop,
        [transformer.inputNames[7]]: timeStep,
      };

      const transformerOutputs = await transformer.run(transformerInputs);
      noise = transformerOutputs[transformer.outputNames[0]];
      timeStep = transformerOutputs[transformer.outputNames[1]];

      this.emit("inference", {
        value: ((step + 1) / nfeSteps) * 100,
        message: `Generating: NFE Step ${step + 1}/${nfeSteps}`,
      });
    }

    // Stage C: Decode
    if (this.useFP16) {
      noise = torch.to(noise, "float32");
    }

    const decodeInputs = {
      [decoder.inputNames[0]]: noise,
      [decoder.inputNames[1]]: refSignalLen,
    };

    const decodeOutputs = await decoder.run(decodeInputs);
    const generatedSignal = decodeOutputs[decoder.outputNames[0]];

    let normalizedTensor = new Tensor(generatedSignal).to("float32").div(32767.0).reshape(-1);

    // Revert back to original RMS
    if (refRMS < this.targetRMS) {
      normalizedTensor = normalizedTensor.mul(refRMS / this.targetRMS);
    }

    return normalizedTensor;
  }

  async dispose() {
    for (const [key, session] of Object.entries(this.sessions)) {
      if (session?.dispose) {
        await session.dispose();
      }
      this.sessions[key] = null;
    }
  }
}
