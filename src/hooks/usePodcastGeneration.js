import { useState, useCallback } from 'react';
import { useTTS } from '../contexts/TTSContext';
import { generatePodcast } from '../podcast';
import { RawAudio } from '../tjs/utils/audio';

export const usePodcastGeneration = () => {
  const [generating, setGenerating] = useState(false);
  const { getF5TTS, setProgress, createBlobUrl } = useTTS();

  const generatePodcastAudio = useCallback(async ({
    script,
    speakers,
    settings
  }) => {
    setGenerating(true);
    setProgress({ value: 0, message: 'Generating podcast...' });

    try {
      const f5tts = await getF5TTS();
      const audioTensor = await generatePodcast({
        f5tts,
        script,
        speakers,
        onProgress: (progress, message) => {
          setProgress({ value: Math.round(progress), message });
        },
        speed: settings.speed,
        nfeSteps: settings.nfeSteps,
        enableChunking: settings.enableChunking
      });

      if (!audioTensor) {
        throw new Error('No audio segments generated');
      }

      const wavBlob = new RawAudio(audioTensor.data, 24000).toBlob();
      const url = createBlobUrl(wavBlob);
      setProgress({ value: 100, message: 'Podcast generation complete' });
      return url;
    } catch (error) {
      console.error('Podcast generation failed:', error);
      setProgress({ value: 0, message: `Error: ${error.message}` });
      throw error;
    } finally {
      setGenerating(false);
    }
  }, [getF5TTS, setProgress, createBlobUrl]);

  return { generatePodcastAudio, generating };
};