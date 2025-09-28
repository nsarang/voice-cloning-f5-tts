export const createWebGPUDevice = (() => {
  const cache = new Map();

  return (adapterDesc) => {
    const key = JSON.stringify(adapterDesc || {});
    if (!cache.has(key)) {
      cache.set(
        key,
        (async () => {
          const result = {};
          try {
            const adapter = await navigator.gpu.requestAdapter(adapterDesc);
            if (adapter) {
              result.adapter = adapter;
              result.info = {
                fp16_support: adapter.features.has("shader-f16"),
                vendor: adapter.info.vendor,
                architecture: adapter.info.architecture,
              };
              const device = await adapter.requestDevice();
              result.device = device;
              result.info.maxBufferSize = device.limits.maxBufferSize;
            }
          } catch (e) {
            result.error = (e.message || e).toString();
          }
          return result;
        })()
      );
    }
    return cache.get(key);
  };
})();

export async function getWasmInfo() {
  const info = {
    simd: false,
    threads: false,
  };

  try {
    // A minimalist, valid Wasm module that uses a SIMD instruction.
    // It defines a function that does an i32x4.splat (create a SIMD vector)
    // and then immediately drops it.
    // prettier-ignore
    const simdModule = new Uint8Array([
        0x00, 0x61, 0x73, 0x6d, // \0asm
        0x01, 0x00, 0x00, 0x00, // version 1
        0x01, 0x05, 0x01, 0x60, 0x01, 0x7f, 0x00, // type section: func(i32) -> ()
        0x03, 0x02, 0x01, 0x00, // function section
        0x0a, 0x09, 0x01, 0x07, 0x00, 0x20, 0x00, // code section
        0xfd, 0x0f, 0x1a, 0x0b, // i32x4.splat, drop, end
    ]);
    await WebAssembly.compile(simdModule);
    info.simd = true;
  } catch (e) {
    // pass
  }

  try {
    // Check for SharedArrayBuffer and cross-origin isolation, which are required for threads.
    if (typeof SharedArrayBuffer !== "undefined" && self.crossOriginIsolated) {
      // A minimal module declaring a shared memory.
      // prettier-ignore
      const threadsModule = new Uint8Array([
            0x00, 0x61, 0x73, 0x6d, // \0asm
            0x01, 0x00, 0x00, 0x00, // version 1
            0x05, 0x04, 0x01, 0x03, 0x01, 0x01 // memory section (shared, min 1 page)
      ]);
      if (WebAssembly.validate(threadsModule)) {
        info.threads = true;
      }
    }
  } catch (e) {
    // pass
  }

  return info;
}
