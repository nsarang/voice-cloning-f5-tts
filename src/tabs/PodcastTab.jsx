import React, { useCallback, useState } from "react";

import { AudioInput, useAudioInput } from "../audio_input";
import { AudioPlayer } from "../audio_player";
import { emptySegment } from "../core/audio";
import { RawAudio } from "../core/tjs/utils/audio";
import * as torch from "../core/tjs/utils/torch";
import { useModel } from "../engine/ModelContext";
import Logger from "../logging";
import { Button, ProgressBar, TextInput, useObjectURLManager, useProgress } from "../shared";
import { AdvancedSettings, useAdvancedSettings } from "./utils/AdvancedSettings";
import { DEFAULT_SETTINGS } from "./utils/defaults";
import { DescriptionBox } from "./utils/DescriptionBox";
import { handleAudioReady, handleTranscription, podcastGeneration } from "./utils/inference";
import { SectionHeader } from "./utils/SectionHeader";

const LOG = Logger.get("PodcastTab");

const MemoizedAudioInput = React.memo(AudioInput);
const MemoizedAdvancedSettings = React.memo(AdvancedSettings);

export const PodcastTab = () => {
  // User inputs
  const audioInputState1 = useAudioInput();
  const audioInputState2 = useAudioInput();

  const [speakers, setSpeakers] = useState({
    speaker1: { name: "", refAudio: null, refText: "" },
    speaker2: { name: "", refAudio: null, refText: "" },
  });

  const [script, setScript] = useState("");

  // State management
  const [generatedAudioUrl, setGeneratedAudioUrl] = useState(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);

  // Custom hooks
  const { progress, updateProgress, isLoading: isInProgress } = useProgress();
  const { getOrCreateModel } = useModel();
  const { settings, updateSettings } = useAdvancedSettings(DEFAULT_SETTINGS);
  const { createBlobUrl, revokeBlobUrl } = useObjectURLManager();

  const updateSpeaker = useCallback((speakerId, field, value) => {
    setSpeakers((prev) => ({
      ...prev,
      [speakerId]: { ...prev[speakerId], [field]: value },
    }));
  }, []);

  const onLoadDemo = useCallback(() => {
    audioInputState1.loadFromUrl(
      "https://static.wikia.nocookie.net/dota2_gamepedia/images/c/c6/Vo_dark_willow_sylph_hero_intro_04.mp3"
    );
    audioInputState2.loadFromUrl(
      "https://static.wikia.nocookie.net/dota2_gamepedia/images/c/c0/Vo_sniper_snip_kill_blade_03.mp3"
    );
    setSpeakers({
      speaker1: {
        name: "Alice",
        refText: "",
        // refText: "Hello, I'm Alice. I love discussing technology and innovation.",
      },
      speaker2: {
        name: "Bob",
        refText: "",
        // refText: "Hi, I'm Bob. I'm passionate about AI and its impact on society.",
      },
    });
    setScript(
      `Alice: Welcome to our podcast! Today we're discussing the latest developments in AI technology.
Bob: Thanks for having me. It's exciting to see how rapidly this field is evolving.
Alice: Absolutely! Let's dive into some recent breakthroughs.`
    );
  }, [audioInputState1, audioInputState2]);

  const onGenerate = useCallback(async () => {
    setIsGenerating(true);

    if (generatedAudioUrl) {
      revokeBlobUrl(generatedAudioUrl);
      setGeneratedAudioUrl(null);
    }

    try {
      // Transcribe if needed
      let refText_S1 = speakers.speaker1.refText.trim();
      if (!refText_S1) {
        setIsTranscribing("Speaker 1");
        refText_S1 = await handleTranscription(
          speakers.speaker1.refAudio,
          getOrCreateModel,
          updateProgress
        );
        updateSpeaker("speaker1", "refText", refText_S1);
        setIsTranscribing(null);
      }
      let refText_S2 = speakers.speaker2.refText.trim();
      if (!refText_S2) {
        setIsTranscribing("Speaker 2");
        refText_S2 = await handleTranscription(
          speakers.speaker2.refAudio,
          getOrCreateModel,
          updateProgress
        );
        updateSpeaker("speaker2", "refText", refText_S2);
        setIsTranscribing(null);
      }

      // TTS inference
      const result = await podcastGeneration({
        script,
        speakers: {
          [speakers.speaker1.name]: { refAudio: speakers.speaker1.refAudio, refText: refText_S1 },
          [speakers.speaker2.name]: { refAudio: speakers.speaker2.refAudio, refText: refText_S2 },
        },
        settings,
        onProgress: updateProgress,
        getOrCreateModel,
      });

      const silence = emptySegment({ durationMs: 300, sampleRate: 24000 });
      const interleavedResult = result.flatMap((item, index) =>
        index < result.length - 1 ? [item, silence] : [item]
      );
      const audioTensor = torch.cat(interleavedResult, 0);

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
    speakers,
    script,
    settings,
    updateSpeaker,
    updateProgress,
    createBlobUrl,
    revokeBlobUrl,
    generatedAudioUrl,
    getOrCreateModel,
  ]);

  // Memoized values
  const isGenerateDisabled = React.useMemo(
    () =>
      isGenerating ||
      isInProgress ||
      !speakers.speaker1.name.trim() ||
      !speakers.speaker1.refAudio ||
      !speakers.speaker2.name.trim() ||
      !speakers.speaker2.refAudio ||
      !script.trim(),
    [isGenerating, isInProgress, speakers, script]
  );
  const allowedModes = React.useMemo(() => ["file", "url", "record"], []);
  const onToggleAdvanced = useCallback(() => setShowAdvanced((prev) => !prev), []);

  const onAudioReady1 = useCallback(
    async (file) => updateSpeaker("speaker1", "refAudio", await handleAudioReady(file)),
    [updateSpeaker]
  );
  const onAudioReady2 = useCallback(
    async (file) => updateSpeaker("speaker2", "refAudio", await handleAudioReady(file)),
    [updateSpeaker]
  );

  return (
    <div className="space-y-6">
      <SectionHeader title="Multi-Speaker Podcast Generation" onDemo={onLoadDemo} />
      <DescriptionBox>
        Generate conversations between two different cloned voices. You need to upload a reference
        audio for each speaker, provide names, and then write the script in "Speaker Name: dialogue"
        format.
      </DescriptionBox>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Speaker 1 */}
        <SpeakerSection
          speakerNumber={1}
          name={speakers.speaker1.name}
          onNameChange={(name) => updateSpeaker("speaker1", "name", name)}
          audioInput={audioInputState1}
          onAudioReady={onAudioReady1}
          allowedModes={allowedModes}
          refText={speakers.speaker1.refText}
          onRefTextChange={(text) => updateSpeaker("speaker1", "refText", text)}
          accentColor="cyan"
          refTextDisabled={isTranscribing === "Speaker 1"}
        />

        {/* Speaker 2 */}
        <SpeakerSection
          speakerNumber={2}
          name={speakers.speaker2.name}
          onNameChange={(name) => updateSpeaker("speaker2", "name", name)}
          audioInput={audioInputState2}
          onAudioReady={onAudioReady2}
          allowedModes={allowedModes}
          refText={speakers.speaker2.refText}
          onRefTextChange={(text) => updateSpeaker("speaker2", "refText", text)}
          accentColor="purple"
          refTextDisabled={isTranscribing === "Speaker 2"}
        />
      </div>

      <TextInput
        label="Podcast Script"
        value={script}
        onChange={setScript}
        placeholder={
          "Enter the podcast script. Example:\n\nSpeaker 1: Hello, I'm Speaker 1.\nSpeaker 2: Hi, I'm Speaker 2."
        }
        accentColor="emerald"
        icon="📜"
        multiline
        rows={6}
      />

      <MemoizedAdvancedSettings
        settings={settings}
        onSettingsChange={updateSettings}
        showAdvanced={showAdvanced}
        onToggleAdvanced={onToggleAdvanced}
      />

      <Button
        buttonText="Generate Podcast"
        onClick={onGenerate}
        disabled={isGenerateDisabled}
        loading={isGenerating}
      />

      <ProgressBar progress={progress} isLoading={isInProgress} />

      <AudioPlayer
        audioUrl={generatedAudioUrl}
        filename="generated_speech.wav"
        title="Generated Audio"
      />
    </div>
  );
};

const SpeakerSection = ({
  speakerNumber,
  name,
  onNameChange,
  audioInput,
  onAudioReady,
  allowedModes,
  refText,
  onRefTextChange,
  accentColor,
  refTextDisabled,
}) => (
  <div className="space-y-4">
    <TextInput
      label={`Speaker ${speakerNumber}`}
      value={name}
      onChange={onNameChange}
      placeholder={`Enter Speaker ${speakerNumber}'s name...`}
      accentColor={accentColor}
      icon="👤"
      multiline={false}
    />
    <MemoizedAudioInput
      audioInput={audioInput}
      onAudioReady={onAudioReady}
      allowedModes={allowedModes}
    />
    <TextInput
      label={`Reference Text for Speaker ${speakerNumber}`}
      value={refText}
      onChange={onRefTextChange}
      placeholder={`Optional: Reference text for the input audio...\nLeave blank to auto-transcribe.`}
      accentColor={accentColor}
      icon="📝"
      multiline
      rows={4}
      disabled={refTextDisabled}
    />
  </div>
);
