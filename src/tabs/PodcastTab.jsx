import React, { useState, useCallback, useEffect } from 'react';

import { useTTS } from '../contexts';
import { AudioUploadArea, AdvancedSettings, AudioPlayer } from '../components';
import { useAudioSettings, useAudioProcessor, usePodcastGeneration } from '../hooks';

export const PodcastTab = () => {
  const { revokeBlobUrl } = useTTS();
  const { settings, updateSettings } = useAudioSettings();
  const { processAudioFile } = useAudioProcessor();
  const { generatePodcastAudio, generating } = usePodcastGeneration();
  
  // Speaker 1 state
  const [speaker1Name, setSpeaker1Name] = useState('Nima');
  const [speaker1Audio, setSpeaker1Audio] = useState(null);
  const [speaker1Text, setSpeaker1Text] = useState('hello this is my voice');
  
  // Speaker 2 state
  const [speaker2Name, setSpeaker2Name] = useState('Bita');
  const [speaker2Audio, setSpeaker2Audio] = useState(null);
  const [speaker2Text, setSpeaker2Text] = useState('hello this is my voice');
  
  // Podcast state
  const [podcastScript, setPodcastScript] = useState('Nima: yo what\'s good sir?\n\nBita: I\'m good thank you!');
  const [podcastAudioUrl, setPodcastAudioUrl] = useState(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Cleanup blob URL
  useEffect(() => {
    return () => {
      if (podcastAudioUrl) {
        revokeBlobUrl(podcastAudioUrl);
      }
    };
  }, [podcastAudioUrl, revokeBlobUrl]);

  const handleSpeakerAudioUpload = useCallback(async (file, setter) => {
    if (!file) return;
    
    try {
      const processedAudio = await processAudioFile(file);
      setter(processedAudio);
    } catch (error) {
      console.error('Speaker audio processing failed:', error);
    }
  }, [processAudioFile]);

  const handlePodcastGeneration = useCallback(async () => {
    if (!speaker1Name || !speaker2Name || !podcastScript || 
        !speaker1Audio || !speaker1Text || !speaker2Audio || !speaker2Text) {
      alert('Please fill in all podcast fields');
      return;
    }

    // Clean up previous audio
    if (podcastAudioUrl) {
      revokeBlobUrl(podcastAudioUrl);
      setPodcastAudioUrl(null);
    }

    try {
      const speakers = {
        [speaker1Name]: {
          audio: speaker1Audio,
          refText: speaker1Text
        },
        [speaker2Name]: {
          audio: speaker2Audio,
          refText: speaker2Text
        }
      };

      const url = await generatePodcastAudio({
        script: podcastScript,
        speakers,
        settings
      });

      setPodcastAudioUrl(url);
    } catch (error) {
      console.error('Podcast generation failed:', error);
    }
  }, [
    speaker1Name, speaker2Name, podcastScript,
    speaker1Audio, speaker1Text, speaker2Audio, speaker2Text,
    settings, generatePodcastAudio, podcastAudioUrl, revokeBlobUrl
  ]);

  const isGenerateDisabled = generating || !speaker1Name || !speaker2Name || 
                            !speaker1Audio || !speaker2Audio;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold text-white mb-6">Podcast Generation</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Speaker 1 */}
        <SpeakerSection
          speakerNumber={1}
          name={speaker1Name}
          onNameChange={setSpeaker1Name}
          audio={speaker1Audio}
          onAudioUpload={(file) => handleSpeakerAudioUpload(file, setSpeaker1Audio)}
          refText={speaker1Text}
          onRefTextChange={setSpeaker1Text}
          accentColor="cyan"
        />

        {/* Speaker 2 */}
        <SpeakerSection
          speakerNumber={2}
          name={speaker2Name}
          onNameChange={setSpeaker2Name}
          audio={speaker2Audio}
          onAudioUpload={(file) => handleSpeakerAudioUpload(file, setSpeaker2Audio)}
          refText={speaker2Text}
          onRefTextChange={setSpeaker2Text}
          accentColor="purple"
        />
      </div>

      {/* Podcast Script */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-300">Podcast Script</label>
        <textarea
          value={podcastScript}
          onChange={(e) => setPodcastScript(e.target.value)}
          placeholder={`Enter script with speaker names:\n\n${speaker1Name || 'Speaker1'}: Hello and welcome to our podcast...\n\n${speaker2Name || 'Speaker2'}: Thanks for having me! I'm excited to be here...`}
          className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/50 resize-none h-40"
        />
      </div>

      <AdvancedSettings
        settings={settings}
        onSettingsChange={updateSettings}
        showAdvanced={showAdvanced}
        onToggleAdvanced={() => setShowAdvanced(!showAdvanced)}
      />

      <button
        onClick={handlePodcastGeneration}
        disabled={isGenerateDisabled}
        className={`w-full py-4 px-6 rounded-xl font-semibold text-white transition-all transform ${
          isGenerateDisabled
            ? 'bg-slate-600 cursor-not-allowed'
            : 'bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 hover:scale-105 shadow-lg hover:shadow-xl'
        }`}
      >
        {generating ? 'Generating Podcast...' : 'Generate Podcast'}
      </button>

      <AudioPlayer 
        audioUrl={podcastAudioUrl}
        filename="podcast.wav"
        title="Generated Podcast"
      />
    </div>
  );
};

// Sub-component for speaker section
const SpeakerSection = ({ 
  speakerNumber, 
  name, 
  onNameChange, 
  audio, 
  onAudioUpload, 
  refText, 
  onRefTextChange,
  accentColor 
}) => (
  <div className="space-y-4">
    <h3 className={`text-lg font-semibold text-${accentColor}-400`}>
      Speaker {speakerNumber}
    </h3>
    <input
      type="text"
      value={name}
      onChange={(e) => onNameChange(e.target.value)}
      placeholder={`Speaker ${speakerNumber} Name`}
      className={`w-full px-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-${accentColor}-400/50`}
    />
    <AudioUploadArea
      onUpload={onAudioUpload}
      label={`Speaker ${speakerNumber} Reference Audio`}
      audio={audio}
    />
    <textarea
      value={refText}
      onChange={(e) => onRefTextChange(e.target.value)}
      placeholder={`Reference text for Speaker ${speakerNumber}...`}
      className={`w-full px-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-${accentColor}-400/50 resize-none h-20`}
    />
  </div>
);