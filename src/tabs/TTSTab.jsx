import React, { useCallback, useState } from "react";

import { AudioInput, useAudioInput } from "../audio_input";
import { AudioPlayer } from "../audio_player";
import { RawAudio } from "../core/tjs/utils/audio";
import { useModel } from "../engine/ModelContext";
import Logger from "../logging";
import { Button, ProgressBar, TextInput, useObjectURLManager, useProgress } from "../shared";
import { AdvancedSettings, useAdvancedSettings } from "./utils/AdvancedSettings";
import { DEFAULT_SETTINGS } from "./utils/defaults";
import { DescriptionBox } from "./utils/DescriptionBox";
import { batchInference, handleAudioReady, handleTranscription } from "./utils/inference";
import { SectionHeader } from "./utils/SectionHeader";

const LOG = Logger.get("TTSTab");

const MemoizedAudioInput = React.memo(AudioInput);
const MemoizedAdvancedSettings = React.memo(AdvancedSettings);

export const TTSTab = () => {
  // State management
  const [refAudio, setRefAudio] = useState(null);
  const audioInputState = useAudioInput();

  const [refText, setRefText] = useState("");
  const [genText, setGenText] = useState("");

  const [generatedAudioUrl, setGeneratedAudioUrl] = useState(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);

  // Custom hooks
  const { progress, updateProgress, isLoading: isInProgress } = useProgress();
  const { getOrCreateModel } = useModel();
  const { settings, updateSettings } = useAdvancedSettings(DEFAULT_SETTINGS);
  const { createBlobUrl, revokeBlobUrl } = useObjectURLManager();

  const onLoadDemo = useCallback(() => {
    audioInputState.loadFromUrl(
      "https://static.wikia.nocookie.net/dota2_gamepedia/images/e/e0/Vo_sniper_snip_spawn_05.mp3"
    );
    setGenText(`This is a sample text from my favorite book. It has several sentences, and I want to see how it gets split into batches based on the defined rules.
The book is about a young wizard's journey to master his craft and confront the dark forces that threaten his world.
Granted, the journey is fraught with challenges, but the young wizard is determined to succeed.`);
  }, [audioInputState, setGenText]);

  const onAudioReady = useCallback(async (file) => setRefAudio(await handleAudioReady(file)), []);

  const onGenerate = useCallback(async () => {
    if (!refAudio || !genText.trim()) {
      alert("Please ensure all required fields are filled");
      return;
    }
    setIsGenerating(true);

    if (generatedAudioUrl) {
      revokeBlobUrl(generatedAudioUrl);
      setGeneratedAudioUrl(null);
    }

    try {
      // Transcribe if needed
      let refText2 = refText.trim();
      if (!refText2) {
        setIsTranscribing(true);
        refText2 = await handleTranscription(refAudio, getOrCreateModel, updateProgress);
        setRefText(refText2);
        setIsTranscribing(false);
      }

      // TTS inference
      const result = await batchInference({
        segments: [
          {
            refAudio,
            refText: refText2,
            genText,
          },
        ],
        settings,
        onProgress: updateProgress,
        getOrCreateModel,
      });
      const audioTensor = result[0];

      const wavBlob = new RawAudio(audioTensor.data, 24000).toBlob();
      const url = createBlobUrl(wavBlob);
      setGeneratedAudioUrl(url);
    } catch (error) {
      LOG.error("Generation failed:", error);
      updateProgress({ value: 0, message: `Generation error: ${error.message}` });
    } finally {
      setIsGenerating(false);
    }
  }, [
    refAudio,
    refText,
    genText,
    settings,
    updateProgress,
    createBlobUrl,
    revokeBlobUrl,
    generatedAudioUrl,
    getOrCreateModel,
  ]);

  // Memoized values
  const isGenerateDisabled = React.useMemo(
    () => isGenerating || isInProgress || !refAudio || !genText.trim(),
    [isGenerating, isInProgress, refAudio, genText]
  );

  const allowedModes = React.useMemo(() => ["file", "url", "record"], []);
  const onToggleAdvanced = useCallback(() => setShowAdvanced((prev) => !prev), []);

  return (
    <div className="space-y-6">
      <SectionHeader title="Voice Cloning Text-to-Speech" onDemo={onLoadDemo} />
      <DescriptionBox>
        Clone any voice using a short audio sample. Upload a reference audio, optionally provide
        transcription and then generate speech for any text in that voice style.
      </DescriptionBox>

      <MemoizedAudioInput
        audioInput={audioInputState}
        onAudioReady={onAudioReady}
        showDemo={false}
        allowedModes={allowedModes}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <TextInput
          label="Reference Text"
          value={refText}
          onChange={setRefText}
          placeholder="Transcription of the reference audio. Leave blank to auto-transcribe."
          accentColor="orange"
          icon="📝"
          multiline={true}
          disabled={isTranscribing}
        />

        <TextInput
          label="Text to Generate"
          value={genText}
          onChange={setGenText}
          placeholder="Text you want to generate speech for..."
          accentColor="pink"
          icon="🎤"
          multiline={true}
        />
      </div>

      <MemoizedAdvancedSettings
        settings={settings}
        onSettingsChange={updateSettings}
        showAdvanced={showAdvanced}
        onToggleAdvanced={onToggleAdvanced}
      />

      <Button onClick={onGenerate} disabled={isGenerateDisabled} loading={isGenerating} />

      <ProgressBar progress={progress} isLoading={isInProgress} />

      <AudioPlayer
        audioUrl={generatedAudioUrl}
        filename="generated_speech.wav"
        title="Generated Audio"
      />
    </div>
  );
};
