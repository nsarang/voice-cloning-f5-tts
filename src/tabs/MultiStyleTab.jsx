import React, { useState, useCallback, useEffect } from 'react';
import { useTTS } from '../contexts';
import { AudioUploadArea, AdvancedSettings, AudioPlayer } from '../components';
import { useAudioSettings, useAudioProcessor } from '../hooks';
import { RawAudio } from '../tjs/utils/audio';

export const MultiStyleTab = () => {
  const { getF5TTS, loading, setProgress, createBlobUrl, revokeBlobUrl } = useTTS();
  const { settings, updateSettings } = useAudioSettings();
  const { processAudioFile } = useAudioProcessor();
  
  // Regular style state
  const [regularAudio, setRegularAudio] = useState(null);
  const [regularText, setRegularText] = useState('');
  
  // Multi-style state
  const [speechTypes, setSpeechTypes] = useState([]);
  const [emotionalText, setEmotionalText] = useState('');
  const [emotionalAudioUrl, setEmotionalAudioUrl] = useState(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Cleanup blob URL
  useEffect(() => {
    return () => {
      if (emotionalAudioUrl) {
        revokeBlobUrl(emotionalAudioUrl);
      }
    };
  }, [emotionalAudioUrl, revokeBlobUrl]);

  const handleAudioUpload = useCallback(async (file, setter) => {
    if (!file) return;
    
    try {
      const processedAudio = await processAudioFile(file);
      setter(processedAudio);
    } catch (error) {
      console.error('Audio processing failed:', error);
    }
  }, [processAudioFile]);

  const addSpeechType = useCallback(() => {
    setSpeechTypes(prev => [...prev, { 
      id: Date.now(), // Add unique ID for React key
      name: '', 
      audio: null, 
      text: '' 
    }]);
  }, []);

  const removeSpeechType = useCallback((id) => {
    setSpeechTypes(prev => prev.filter(item => item.id !== id));
  }, []);

  const updateSpeechType = useCallback((id, field, value) => {
    setSpeechTypes(prev => prev.map(item =>
      item.id === id ? { ...item, [field]: value } : item
    ));
  }, []);

  const parseEmotionalText = useCallback((text) => {
    // Parse text with emotion tags like: (Regular) Hello! (Excited) Wow!
    const segments = [];
    const regex = /\(([^)]+)\)\s*([^(]*)/g;
    let match;
    
    while ((match = regex.exec(text)) !== null) {
      const [, emotion, content] = match;
      if (content.trim()) {
        segments.push({ emotion, text: content.trim() });
      }
    }
    
    // If no tags found, treat entire text as regular
    if (segments.length === 0 && text.trim()) {
      segments.push({ emotion: 'Regular', text: text.trim() });
    }
    
    return segments;
  }, []);

  const handleEmotionalGeneration = useCallback(async () => {
    if (!regularAudio || !emotionalText.trim()) {
      alert('Please provide regular audio and text to generate');
      return;
    }

    // Clean up previous audio
    if (emotionalAudioUrl) {
      revokeBlobUrl(emotionalAudioUrl);
      setEmotionalAudioUrl(null);
    }

    setProgress({ value: 0, message: 'Generating multi-style speech...' });

    try {
      const f5tts = await getF5TTS();
      const segments = parseEmotionalText(emotionalText);
      const audioSegments = [];

      for (let i = 0; i < segments.length; i++) {
        const segment = segments[i];
        setProgress({ 
          value: Math.round((i / segments.length) * 100), 
          message: `Generating ${segment.emotion} segment...` 
        });

        // Find matching speech type or use regular
        const speechType = speechTypes.find(
          st => st.name.toLowerCase() === segment.emotion.toLowerCase()
        );
        
        const refAudio = speechType?.audio || regularAudio;
        const refText = speechType?.text || regularText;

        const audioTensor = await f5tts.generateSpeech({
          refAudio,
          refText,
          genText: segment.text,
          onProgress: (progress) => {
            setProgress({ 
              value: Math.round(((i + progress/100) / segments.length) * 100),
              message: `Generating ${segment.emotion} segment...`
            });
          },
          speed: settings.speed,
          nfeSteps: settings.nfeSteps,
          enableChunking: settings.enableChunking,
        });

        audioSegments.push(audioTensor);
      }

      // Concatenate all segments
      const concatenated = audioSegments.reduce((acc, curr) => {
        const combined = new Float32Array(acc.data.length + curr.data.length);
        combined.set(acc.data);
        combined.set(curr.data, acc.data.length);
        return { data: combined };
      });

      const wavBlob = new RawAudio(concatenated.data, 24000).toBlob();
      const url = createBlobUrl(wavBlob);
      setEmotionalAudioUrl(url);
      setProgress({ value: 100, message: 'Multi-style speech complete' });
    } catch (error) {
      console.error('Emotional generation failed:', error);
      setProgress({ value: 0, message: `Generation error: ${error.message}` });
    }
  }, [
    regularAudio, regularText, emotionalText, speechTypes, settings,
    getF5TTS, setProgress, createBlobUrl, revokeBlobUrl, emotionalAudioUrl, parseEmotionalText
  ]);

  const isGenerateDisabled = loading || !regularAudio || !emotionalText.trim();

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold text-white mb-6">Multi-Style Speech Generation</h2>

      <div className="bg-slate-700/30 rounded-xl p-4 border border-slate-600/30">
        <p className="text-slate-300 text-sm">
          Use emotion tags in your text like: (Regular) Hello there! (Excited) This is amazing! (Sad) I'm feeling down...
        </p>
      </div>

      {/* Regular Style Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-orange-400">Regular Style (Required)</h3>
        <AudioUploadArea
          onUpload={(file) => handleAudioUpload(file, setRegularAudio)}
          label="Regular Reference Audio"
          audio={regularAudio}
        />
        <textarea
          value={regularText}
          onChange={(e) => setRegularText(e.target.value)}
          placeholder="Reference text for regular style..."
          className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-400/50 resize-none h-20"
        />
      </div>

      {/* Additional Speech Types */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-pink-400">Additional Speech Types</h3>
          <button
            onClick={addSpeechType}
            className="px-4 py-2 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-lg font-medium hover:from-pink-600 hover:to-rose-600 transition-all"
          >
            Add Speech Type
          </button>
        </div>

        {speechTypes.map((speechType) => (
          <SpeechTypeSection
            key={speechType.id}
            speechType={speechType}
            onUpdate={updateSpeechType}
            onRemove={removeSpeechType}
            onAudioUpload={(file) => {
              handleAudioUpload(file, (audio) => 
                updateSpeechType(speechType.id, 'audio', audio)
              );
            }}
          />
        ))}
      </div>

      {/* Text with Emotion Tags */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-300">Text with Emotion Tags</label>
        <textarea
          value={emotionalText}
          onChange={(e) => setEmotionalText(e.target.value)}
          placeholder="(Regular) Hello there! (Excited) This is amazing! (Sad) But sometimes I feel down..."
          className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-pink-400/50 resize-none h-32"
        />
      </div>

      <AdvancedSettings
        settings={settings}
        onSettingsChange={updateSettings}
        showAdvanced={showAdvanced}
        onToggleAdvanced={() => setShowAdvanced(!showAdvanced)}
      />

      <button
        onClick={handleEmotionalGeneration}
        disabled={isGenerateDisabled}
        className={`w-full py-4 px-6 rounded-xl font-semibold text-white transition-all transform ${
          isGenerateDisabled
            ? 'bg-slate-600 cursor-not-allowed'
            : 'bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 hover:scale-105 shadow-lg hover:shadow-xl'
        }`}
      >
        {loading ? 'Generating...' : 'Generate Emotional Speech'}
      </button>

      <AudioPlayer 
        audioUrl={emotionalAudioUrl}
        filename="emotional_speech.wav"
        title="Generated Emotional Speech"
      />
    </div>
  );
};

// Sub-component for individual speech type
const SpeechTypeSection = ({ speechType, onUpdate, onRemove, onAudioUpload }) => (
  <div className="p-4 bg-slate-700/30 rounded-xl border border-slate-600/30 space-y-3">
    <div className="flex items-center justify-between">
      <input
        type="text"
        value={speechType.name}
        onChange={(e) => onUpdate(speechType.id, 'name', e.target.value)}
        placeholder="Speech type name (e.g., Excited, Sad)"
        className="flex-1 px-3 py-2 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-pink-400/50"
      />
      <button
        onClick={() => onRemove(speechType.id)}
        className="ml-3 px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all"
      >
        Remove
      </button>
    </div>
    <AudioUploadArea
      onUpload={onAudioUpload}
      label={`${speechType.name || 'Speech Type'} Audio`}
      audio={speechType.audio}
    />
    <textarea
      value={speechType.text}
      onChange={(e) => onUpdate(speechType.id, 'text', e.target.value)}
      placeholder={`Reference text for ${speechType.name || 'this speech type'}...`}
      className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-pink-400/50 resize-none h-16"
    />
  </div>
);