import React, { useState, useCallback, useEffect } from 'react';

import { useTTS } from '../contexts';
import { AudioUploadArea, AdvancedSettings, AudioPlayer } from '../components';
import { useAudioSettings, useAudioProcessor } from '../hooks';
import { RawAudio } from '../tjs/utils/audio';


export const TTSTab = () => {
  const { getF5TTS, loading, setProgress, createBlobUrl, revokeBlobUrl } = useTTS();
  const { settings, updateSettings } = useAudioSettings();
  const { processAudioFile } = useAudioProcessor();
  
  // Local state for this tab
  const [refAudio, setRefAudio] = useState(null);
  const [refText, setRefText] = useState('hello this is some audio');
  const [genText, setGenText] = useState("yo what's up dude? I'm jacked brother. Cool");
  const [generatedAudioUrl, setGeneratedAudioUrl] = useState(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Cleanup blob URL when component unmounts or audio changes
  useEffect(() => {
    return () => {
      if (generatedAudioUrl) {
        revokeBlobUrl(generatedAudioUrl);
      }
    };
  }, [generatedAudioUrl, revokeBlobUrl]);

  const handleAudioUpload = useCallback(async (file) => {
    if (!file) return;
    
    try {
      const processedAudio = await processAudioFile(file);
      setRefAudio(processedAudio);
    } catch (error) {
      console.error('Audio processing failed:', error);
      setProgress({ value: 0, message: `Audio error: ${error.message}` });
    }
  }, [processAudioFile, setProgress]);

  const handleGeneration = useCallback(async () => {
    if (!refAudio || !refText.trim() || !genText.trim()) {
      alert('Please ensure all required fields are filled');
      return;
    }

    // Clean up previous audio URL
    if (generatedAudioUrl) {
      revokeBlobUrl(generatedAudioUrl);
      setGeneratedAudioUrl(null);
    }

    setProgress({ value: 0, message: 'Generating audio...' });

    try {
      const f5tts = await getF5TTS();
      const audioTensor = await f5tts.generateSpeech({
        refAudio,
        refText,
        genText,
        onProgress: (progress, message) => {
          setProgress({ value: Math.round(progress), message });
        },
        speed: settings.speed,
        nfeSteps: settings.nfeSteps,
        enableChunking: settings.enableChunking,
      });

      const wavBlob = new RawAudio(audioTensor.data, 24000).toBlob();
      const url = createBlobUrl(wavBlob);
      setGeneratedAudioUrl(url);
      setProgress({ value: 100, message: 'Generation complete' });
    } catch (error) {
      console.error('Generation failed:', error);
      setProgress({ value: 0, message: `Generation error: ${error.message}` });
    }
  }, [refAudio, refText, genText, settings, getF5TTS, setProgress, createBlobUrl, revokeBlobUrl, generatedAudioUrl]);

  const isGenerateDisabled = loading || !refAudio || !refText.trim() || !genText.trim();

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold text-white mb-6">Basic Text-to-Speech</h2>

      <AudioUploadArea
        onUpload={handleAudioUpload}
        label="Upload Reference Audio"
        audio={refAudio}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-300">Reference Text</label>
          <textarea
            value={refText}
            onChange={(e) => setRefText(e.target.value)}
            placeholder="Text that matches your reference audio..."
            className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-400/50 resize-none h-24"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-300">Text to Generate</label>
          <textarea
            value={genText}
            onChange={(e) => setGenText(e.target.value)}
            placeholder="Text you want to generate speech for..."
            className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-pink-400/50 resize-none h-24"
          />
        </div>
      </div>

      <AdvancedSettings
        settings={settings}
        onSettingsChange={updateSettings}
        showAdvanced={showAdvanced}
        onToggleAdvanced={() => setShowAdvanced(!showAdvanced)}
      />

      <button
        onClick={handleGeneration}
        disabled={isGenerateDisabled}
        className={`w-full py-4 px-6 rounded-xl font-semibold text-white transition-all transform ${
          isGenerateDisabled
            ? 'bg-slate-600 cursor-not-allowed'
            : 'bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 hover:scale-105 shadow-lg hover:shadow-xl'
        }`}
      >
        {loading ? 'Generating...' : 'Generate Speech'}
      </button>

      <AudioPlayer 
        audioUrl={generatedAudioUrl}
        filename="generated_speech.wav"
        title="Generated Audio"
      />
    </div>
  );
};