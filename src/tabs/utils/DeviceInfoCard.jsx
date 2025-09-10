import React, { useEffect, useState } from "react";
import { FaCheckCircle, FaMemory, FaMicrochip, FaTimesCircle } from "react-icons/fa";

import { createWebGPUDevice, getWasmInfo } from "../../core/device";

export const DeviceInfoCard = () => {
  const [deviceInfo, setDeviceInfo] = useState(null);
  const [showDetails, setShowDetails] = useState(true);

  useEffect(() => {
    const fetchDeviceInfo = async () => {
      try {
        const gpuInfo = await createWebGPUDevice({ powerPreference: "high-performance" });
        if (gpuInfo.device) {
          setDeviceInfo({
            backend: "WebGPU",
            info: {
              vendorAndArch: `${gpuInfo.info.vendor || "Unknown Vendor"} (${gpuInfo.info.architecture || "Unknown Architecture"})`,
              maxBufferSize: gpuInfo.info.maxBufferSize
                ? (gpuInfo.info.maxBufferSize / 1024 ** 3).toFixed(2) + " GB"
                : "Unknown",
              fp16: gpuInfo.info.fp16_support || false,
            },
          });
          return;
        }

        const wasmInfo = await getWasmInfo();
        setDeviceInfo({
          backend: "WebAssembly",
          info: {
            simd: wasmInfo.simd,
            threads: wasmInfo.threads,
          },
        });
      } catch (error) {
        console.error("Failed to fetch device info:", error);
      }
    };

    fetchDeviceInfo();
  }, []);

  if (!deviceInfo) return null;

  const { backend, info } = deviceInfo;

  return (
    <div className="bg-slate-800/30 rounded-xl border border-slate-700/50 p-6">
      <button
        onClick={() => setShowDetails((prev) => !prev)}
        className="w-full flex items-center justify-between cursor-pointer text-lg font-semibold text-white mb-4 hover:text-cyan-400 transition-colors"
      >
        <span>Device Information</span>
        <svg
          className={`w-5 h-5 transform transition-transform ${showDetails ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {showDetails && (
        <div className="space-y-4 text-slate-300 text-sm">
          <div className="flex items-center gap-2">
            <FaMicrochip className="text-cyan-400" />
            <span className="font-medium text-slate-200">Backend:</span> {backend}
          </div>
          {backend === "WebGPU" ? (
            <>
              <div className="flex items-center gap-2">
                <FaMemory className="text-purple-400" />
                <span className="font-medium text-slate-200">Device:</span> {info.vendorAndArch}
              </div>
              <div className="flex items-center gap-2">
                <FaMemory className="text-green-400" />
                <span className="font-medium text-slate-200">Max Buffer Size:</span>{" "}
                {info.maxBufferSize}
              </div>
              <div className="flex items-center gap-2">
                {info.fp16 ? (
                  <FaCheckCircle className="text-green-400" />
                ) : (
                  <FaTimesCircle className="text-red-400" />
                )}
                <span className="font-medium text-slate-200">FP16 Support:</span>{" "}
                {info.fp16 ? "Yes" : "No"}
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <FaMemory className="text-purple-400" />
                <span className="font-medium text-slate-200">Device:</span> {"CPU"}
              </div>
              <div className="flex items-center gap-2">
                {info.simd ? (
                  <FaCheckCircle className="text-green-400" />
                ) : (
                  <FaTimesCircle className="text-red-400" />
                )}
                <span className="font-medium text-slate-200">SIMD Support:</span>{" "}
                {info.simd ? "Yes" : "No"}
              </div>
              <div className="flex items-center gap-2">
                {info.threads ? (
                  <FaCheckCircle className="text-green-400" />
                ) : (
                  <FaTimesCircle className="text-red-400" />
                )}
                <span className="font-medium text-slate-200">Threads Support:</span>{" "}
                {info.threads ? "Yes" : "No"}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};
