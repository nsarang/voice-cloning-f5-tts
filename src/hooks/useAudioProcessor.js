import { useCallback, useState } from "react";

import { loadAudio } from "../audio";

export const useAudioProcessor = () => {
  const [processing, setProcessing] = useState(false);

  const processAudioFile = useCallback(
    async ({ file, targetRate = 24000, onProgress = null }) => {
      if (!file) return null;

      setProcessing(true);
      if (onProgress) onProgress({ value: 0, message: "Processing audio..." });

      try {
        const processedAudio = await loadAudio({ file, targetRate });
        if (onProgress) onProgress({ value: 100, message: "Audio processed" });
        return processedAudio;
      } catch (error) {
        console.error("Audio processing failed:", error);
        if (onProgress) onProgress({ value: 0, message: `Audio error: ${error.message}` });
        throw error;
      } finally {
        setProcessing(false);
      }
    },
    [setProcessing]
  );

  return { processAudioFile, processing };
};
