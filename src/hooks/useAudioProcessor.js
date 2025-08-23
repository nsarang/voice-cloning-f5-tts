import { useState, useCallback } from 'react';
import { loadAudio } from '../audio';
import { useTTS } from '../contexts/TTSContext';

export const useAudioProcessor = () => {
  const [processing, setProcessing] = useState(false);
  const { setProgress } = useTTS();

  const processAudioFile = useCallback(async (file, targetRate = 24000) => {
    if (!file) return null;

    setProcessing(true);
    setProgress({ value: 0, message: 'Processing audio...' });

    try {
      const processedAudio = await loadAudio({ file, targetRate });
      setProgress({ value: 100, message: 'Audio processed' });
      return processedAudio;
    } catch (error) {
      console.error('Audio processing failed:', error);
      setProgress({ value: 0, message: `Audio error: ${error.message}` });
      throw error;
    } finally {
      setProcessing(false);
    }
  }, [setProgress]);

  return { processAudioFile, processing };
};