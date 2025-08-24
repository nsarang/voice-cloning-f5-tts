import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

import { F5TTS } from "../f5-tts";

const TTSContext = createContext(null);

export const TTSProvider = ({ children }) => {
  const [isLoaded, setIsLoaded] = useState(false);

  // Singleton F5TTS instance - only one in entire app
  const f5ttsRef = useRef(null);

  // Track if we're currently initializing to prevent duplicate calls
  const initializingRef = useRef(false);

  // Clean up blob URLs
  const blobUrlsRef = useRef(new Set());

  useEffect(() => {
    return () => {
      // Cleanup blob URLs on unmount
      blobUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));

      // Clean up F5TTS instance if needed
      if (f5ttsRef.current) {
        console.log("Cleaning up F5TTS instance");
        // Add any cleanup methods if F5TTS has them
      }
    };
  }, []);

  const modelPaths = {
    preprocess: "models/F5_Preprocess.onnx",
    transformer: "models/F5_Transformer.onnx",
    decode: "models/F5_Decode.onnx",
    vocab: "models/Emilia_ZH_EN_pinyin/vocab.txt",
  };

  const initializeModels = useCallback(
    async ({ onProgress } = {}) => {
      // Return existing instance if already loaded
      if (f5ttsRef.current) {
        console.log("F5TTS already loaded, returning existing instance");
        return f5ttsRef.current;
      }

      // Prevent duplicate initialization
      if (initializingRef.current) {
        console.log("F5TTS initialization already in progress, waiting...");
        // Wait for the existing initialization to complete
        while (initializingRef.current) {
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
        return f5ttsRef.current;
      }

      initializingRef.current = true;
      if (onProgress) onProgress({ value: 0, message: "Loading models..." });

      try {
        console.log("Creating new F5TTS instance");
        const instance = new F5TTS();

        // Add progress tracking for model loading
        const startTime = Date.now();
        await instance.loadModels(modelPaths);
        const loadTime = ((Date.now() - startTime) / 1000).toFixed(2);

        f5ttsRef.current = instance;
        setIsLoaded(true);
        if (onProgress)
          onProgress({ value: 100, message: `Models loaded successfully in ${loadTime}s` });
        console.log(`F5TTS models loaded in ${loadTime}s`);

        return instance;
      } catch (error) {
        console.error("Failed to load F5TTS models:", error);
        if (onProgress) onProgress({ value: 0, message: `Error: ${error.message}` });
        throw error;
      } finally {
        // TODO: reset progress?
        initializingRef.current = false;
      }
    },
    [modelPaths]
  );

  const getF5TTS = useCallback(
    async (callbacks) => {
      if (!f5ttsRef.current) {
        return await initializeModels(callbacks);
      }
      return f5ttsRef.current;
    },
    [initializeModels]
  );

  const value = {
    // F5TTS instance management
    f5tts: f5ttsRef.current,
    getF5TTS,
    isLoaded,

    // Model management
    initializeModels,
  };

  return <TTSContext.Provider value={value}>{children}</TTSContext.Provider>;
};

export const useTTS = () => {
  const context = useContext(TTSContext);
  if (!context) {
    throw new Error("useTTS must be used within TTSProvider");
  }
  return context;
};
