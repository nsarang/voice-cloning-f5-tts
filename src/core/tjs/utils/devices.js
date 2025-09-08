import { apis } from "../env.js";

/**
 * The list of devices supported by Transformers.js
 */
export const DEVICE_TYPES = Object.freeze({
  auto: "auto", // Auto-detect based on device and environment
  gpu: "gpu", // Auto-detect GPU
  cpu: "cpu", // CPU
  wasm: "wasm", // WebAssembly
  webgpu: "webgpu", // WebGPU
  cuda: "cuda", // CUDA
  dml: "dml", // DirectML

  webnn: "webnn", // WebNN (default)
  "webnn-npu": "webnn-npu", // WebNN NPU
  "webnn-gpu": "webnn-gpu", // WebNN GPU
  "webnn-cpu": "webnn-cpu", // WebNN CPU
});

/**
 * @typedef {keyof typeof DEVICE_TYPES} DeviceType
 */

/**
 * Checks if WebGPU is available in the current environment.
 * @returns {boolean} True if WebGPU is available, false otherwise.
 */
export function isWebGpuAvailable() {
  try {
    const adapter = navigator.gpu.requestAdapter();
    const device = adapter?.requestDevice();
    return !!(adapter && device);
  } catch (e) {
    return false;
  }
}

// TODO: Use the adapter from `env.backends.onnx.webgpu.adapter` to check for `shader-f16` support,
// when available in https://github.com/microsoft/onnxruntime/pull/19940.
// For more information, see https://github.com/microsoft/onnxruntime/pull/19857#issuecomment-1999984753

/**
 * Checks if WebGPU fp16 support is available in the current environment.
 */
export const isWebGpuFp16Supported = (function () {
  /** @type {boolean} */
  let cachedResult;

  return async function () {
    if (cachedResult === undefined) {
      if (!apis.IS_WEBGPU_AVAILABLE) {
        cachedResult = false;
      } else {
        try {
          const adapter = await navigator.gpu.requestAdapter();
          cachedResult = adapter.features.has("shader-f16");
        } catch (e) {
          cachedResult = false;
        }
      }
    }
    return cachedResult;
  };
})();
