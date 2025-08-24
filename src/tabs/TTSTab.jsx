import {
  AdvancedSettings,
  AudioInputManager,
  AudioPlayer,
  GenerateButton,
  ProgressBar,
  TextInputArea,
} from "components";
import { useProgress } from "hooks/useProgress";
import React, { useCallback, useEffect, useState } from "react";

import { loadAudio } from "../audio";
import { useTTS } from "../contexts";
import { useAudioSettings, useObjectURLManager } from "../hooks";
import { RawAudio } from "../tjs/utils/audio";

export const TTSTab = () => {
  const { progress, updateProgress, reupdateProgress, isLoading } = useProgress();
  const { getF5TTS } = useTTS();
  const { settings, updateSettings } = useAudioSettings();
  const { createBlobUrl, revokeBlobUrl } = useObjectURLManager();

  const [refAudio, setRefAudio] = useState(null);
  const [refText, setRefText] = useState("hello this is some audio");
  const [genText, setGenText] = useState("yo what's up dude? I'm jacked brother. Cool");
  const [generatedAudioUrl, setGeneratedAudioUrl] = useState(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const audio2Tensor = useCallback(async (file) => {
    if (!file) return null;
    const audioTensor = await loadAudio({ file, targetRate: 24000 });
    setRefAudio(audioTensor);
  }, []);

  const handleGeneration = useCallback(async () => {
    if (!refAudio || !refText.trim() || !genText.trim()) {
      alert("Please ensure all required fields are filled");
      return;
    }

    if (generatedAudioUrl) {
      revokeBlobUrl(generatedAudioUrl);
      setGeneratedAudioUrl(null);
    }

    updateProgress({ value: 0, message: "Generating audio..." });

    try {
      const f5tts = await getF5TTS({ onProgress: updateProgress });
      const audioTensor = await f5tts.generateSpeech({
        refAudio,
        refText,
        genText,
        onProgress: updateProgress,
        speed: settings.speed,
        nfeSteps: settings.nfeSteps,
        enableChunking: settings.enableChunking,
      });

      const wavBlob = new RawAudio(audioTensor.data, 24000).toBlob();
      const url = createBlobUrl(wavBlob);
      setGeneratedAudioUrl(url);
      updateProgress({ value: 100, message: "Generation complete" });
    } catch (error) {
      console.error("Generation failed:", error);
      updateProgress({ value: 0, message: `Generation error: ${error.message}` });
    }
  }, [
    refAudio,
    refText,
    genText,
    settings,
    getF5TTS,
    updateProgress,
    createBlobUrl,
    revokeBlobUrl,
    generatedAudioUrl,
  ]);

  const isGenerateDisabled = isLoading || !refAudio || !refText.trim() || !genText.trim();

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold text-white mb-6">Basic Text-to-Speech</h2>

      <AudioInputManager
        onAudioReady={audio2Tensor}
        currentAudio={refAudio}
        showDemo={true}
        allowedModes={["file", "url", "record"]}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <TextInputArea
          label="Reference Text"
          value={refText}
          onChange={setRefText}
          placeholder="Text that matches your reference audio..."
          accentColor="orange"
          icon="📝"
        />

        <TextInputArea
          label="Text to Generate"
          value={genText}
          onChange={setGenText}
          placeholder="Text you want to generate speech for..."
          accentColor="pink"
          icon="🎤"
        />
      </div>

      <AdvancedSettings
        settings={settings}
        onSettingsChange={updateSettings}
        showAdvanced={showAdvanced}
        onToggleAdvanced={() => setShowAdvanced(!showAdvanced)}
      />

      <GenerateButton
        onClick={handleGeneration}
        disabled={isGenerateDisabled}
        loading={isLoading}
      />

      <ProgressBar progress={progress} isLoading={isLoading} />

      <AudioPlayer
        audioUrl={generatedAudioUrl}
        filename="generated_speech.wav"
        title="Generated Audio"
      />
    </div>
  );
};
