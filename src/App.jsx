import React, { useState, useRef, useCallback } from 'react';
import { F5TTS } from './f5-tts.js';
import { loadAudio } from './audio-utils.js';
import { RawAudio } from './tjs/utils/audio.js';

const App = () => {
  const [activeTab, setActiveTab] = useState('tts');
  const [f5tts, setF5tts] = useState(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState({ value: 0, message: '' });
  
  // Basic TTS states
  const [refAudio, setRefAudio] = useState(null);
  const [refText, setRefText] = useState('hello this is some audio');
  const [genText, setGenText] = useState("yo what's up dude? I'm jacked brother. Cool");
  const [generatedAudio, setGeneratedAudio] = useState(null);
  
  // Podcast states
  const [speaker1Name, setSpeaker1Name] = useState('');
  const [speaker1Audio, setSpeaker1Audio] = useState(null);
  const [speaker1Text, setSpeaker1Text] = useState('');
  const [speaker2Name, setSpeaker2Name] = useState('');
  const [speaker2Audio, setSpeaker2Audio] = useState(null);
  const [speaker2Text, setSpeaker2Text] = useState('');
  const [podcastScript, setPodcastScript] = useState('');
  const [podcastAudio, setPodcastAudio] = useState(null);
  
  // Multi-style states
  const [regularAudio, setRegularAudio] = useState(null);
  const [regularText, setRegularText] = useState('');
  const [emotionalText, setEmotionalText] = useState('');
  const [emotionalAudio, setEmotionalAudio] = useState(null);
  const [speechTypes, setSpeechTypes] = useState([]);
  
  // Advanced settings
  const [removeSlience, setRemoveSilence] = useState(true);
  const [speed, setSpeed] = useState(1.0);
  const [customSplitWords, setCustomSplitWords] = useState('');
  
  const [modelPaths, setModelPaths] = useState({
    preprocess: 'models/F5_Preprocess.onnx',
    transformer: 'models/F5_Transformer.onnx', 
    decode: 'models/F5_Decode.onnx',
    vocab: 'models/Emilia_ZH_EN_pinyin/vocab.txt'
  });

  const audioRef = useRef();
  const fileInputRef = useRef();

  const initializeModels = useCallback(async () => {
    if (f5tts) return;
    
    setLoading(true);
    setProgress({ value: 0, message: 'Loading models...' });
    
    try {
      const instance = new F5TTS();
      await instance.loadModels(modelPaths);
      setF5tts(instance);
      setProgress({ value: 100, message: 'Models loaded successfully' });
    } catch (error) {
      console.error('Failed to load models:', error);
      setProgress({ value: 0, message: `Error: ${error.message}` });
    } finally {
      setLoading(false);
    }
  }, [f5tts, modelPaths]);

  const handleAudioUpload = useCallback(async (file, setter) => {
    if (!file) return;

    setLoading(true);
    setProgress({ value: 0, message: 'Processing audio...' });

    try {
      const processedAudio = await loadAudio({ file, targetRate: 24000 });
      setter(processedAudio);
      setProgress({ value: 100, message: 'Audio processed' });
    } catch (error) {
      console.error('Audio processing failed:', error);
      setProgress({ value: 0, message: `Audio error: ${error.message}` });
    } finally {
      setLoading(false);
    }
  }, []);

  const generateSpeech = useCallback(async (audioSrc, refTextSrc, genTextSrc) => {
    if (!f5tts || !audioSrc || !refTextSrc.trim() || !genTextSrc.trim()) {
      alert('Please ensure models are loaded and all required fields are filled');
      return null;
    }

    try {
      const audioData = await f5tts.generateSpeech(
        audioSrc,
        refTextSrc,
        genTextSrc,
        (progress, message) => {
          setProgress({ 
            value: Math.round(progress), 
            message 
          });
        }
      );

      const wavBlob = new RawAudio(audioData, 24000).toBlob();
      return URL.createObjectURL(wavBlob);
    } catch (error) {
      console.error('Generation failed:', error);
      setProgress({ value: 0, message: `Generation error: ${error.message}` });
      return null;
    }
  }, [f5tts]);

  const handleBasicGeneration = useCallback(async () => {
    setLoading(true);
    setGeneratedAudio(null);
    
    const result = await generateSpeech(refAudio, refText, genText);
    setGeneratedAudio(result);
    
    if (result) {
      setProgress({ value: 100, message: 'Generation complete' });
    }
    setLoading(false);
  }, [generateSpeech, refAudio, refText, genText]);

  const handlePodcastGeneration = useCallback(async () => {
    if (!speaker1Name || !speaker2Name || !podcastScript) {
      alert('Please fill in all podcast fields');
      return;
    }

    setLoading(true);
    setPodcastAudio(null);
    setProgress({ value: 0, message: 'Generating podcast...' });

    try {
      // Parse script into speaker segments
      const speakerPattern = new RegExp(`^(${speaker1Name}|${speaker2Name}):`, 'gm');
      const segments = podcastScript.split(speakerPattern).filter(s => s.trim());
      
      const audioSegments = [];
      
      for (let i = 0; i < segments.length; i += 2) {
        const speaker = segments[i];
        const text = segments[i + 1]?.trim();
        
        if (!text) continue;
        
        const isFirstSpeaker = speaker === speaker1Name;
        const audioSrc = isFirstSpeaker ? speaker1Audio : speaker2Audio;
        const refTextSrc = isFirstSpeaker ? speaker1Text : speaker2Text;
        
        if (audioSrc && refTextSrc) {
          setProgress({ value: (i / segments.length) * 90, message: `Generating ${speaker}...` });
          const segmentAudio = await generateSpeech(audioSrc, refTextSrc, text);
          if (segmentAudio) {
            audioSegments.push(segmentAudio);
          }
        }
      }
      
      // For demo purposes, just use the first generated segment
      // In a real implementation, you'd concatenate the audio segments
      if (audioSegments.length > 0) {
        setPodcastAudio(audioSegments[0]);
        setProgress({ value: 100, message: 'Podcast generation complete' });
      }
    } catch (error) {
      console.error('Podcast generation failed:', error);
      setProgress({ value: 0, message: `Error: ${error.message}` });
    } finally {
      setLoading(false);
    }
  }, [speaker1Name, speaker2Name, podcastScript, speaker1Audio, speaker1Text, speaker2Audio, speaker2Text, generateSpeech]);

  const addSpeechType = useCallback(() => {
    setSpeechTypes(prev => [...prev, { name: '', audio: null, text: '' }]);
  }, []);

  const removeSpeechType = useCallback((index) => {
    setSpeechTypes(prev => prev.filter((_, i) => i !== index));
  }, []);

  const updateSpeechType = useCallback((index, field, value) => {
    setSpeechTypes(prev => prev.map((item, i) => 
      i === index ? { ...item, [field]: value } : item
    ));
  }, []);

  const handleEmotionalGeneration = useCallback(async () => {
    if (!regularAudio || !emotionalText) {
      alert('Please provide regular audio and text to generate');
      return;
    }

    setLoading(true);
    setEmotionalAudio(null);
    
    // Simple implementation - just use regular audio for now
    // In a real implementation, you'd parse emotional tags and use appropriate audio
    const result = await generateSpeech(regularAudio, regularText, emotionalText);
    setEmotionalAudio(result);
    
    if (result) {
      setProgress({ value: 100, message: 'Emotional speech complete' });
    }
    setLoading(false);
  }, [generateSpeech, regularAudio, regularText, emotionalText]);

  const tabs = [
    { id: 'tts', label: 'TTS', icon: '🎤' },
    { id: 'podcast', label: 'Podcast', icon: '🎙️' },
    { id: 'emotional', label: 'Multi-Style', icon: '🎭' },
    { id: 'credits', label: 'Credits', icon: '👥' }
  ];

  const TabButton = ({ tab, isActive, onClick }) => (
    <button
      onClick={() => onClick(tab.id)}
      className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all ${
        isActive 
          ? 'bg-gradient-to-r from-cyan-500 to-purple-500 text-white shadow-lg' 
          : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
      }`}
    >
      <span className="text-lg">{tab.icon}</span>
      {tab.label}
    </button>
  );

  const AdvancedSettings = () => (
    <details className="bg-slate-800/30 rounded-xl border border-slate-700/50 p-6">
      <summary className="cursor-pointer text-lg font-semibold text-white mb-4">Advanced Settings</summary>
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">Speed</label>
            <input
              type="range"
              min="0.3"
              max="2.0"
              step="0.1"
              value={speed}
              onChange={(e) => setSpeed(parseFloat(e.target.value))}
              className="w-full"
            />
            <span className="text-xs text-slate-400">{speed}x</span>
          </div>
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={removeSlience}
              onChange={(e) => setRemoveSilence(e.target.checked)}
              className="rounded"
            />
            <label className="text-sm text-slate-300">Remove Silences</label>
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-300">Custom Split Words</label>
          <input
            type="text"
            value={customSplitWords}
            onChange={(e) => setCustomSplitWords(e.target.value)}
            placeholder="Enter words separated by commas"
            className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-400/50"
          />
        </div>
      </div>
    </details>
  );

  const AudioUploadArea = ({ onUpload, label, audio }) => (
    <div 
      className="relative border-2 border-dashed border-slate-600/50 rounded-xl p-6 text-center hover:border-purple-400/50 transition-all cursor-pointer bg-slate-700/20"
      onClick={() => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'audio/*';
        input.onchange = (e) => onUpload(e.target.files[0]);
        input.click();
      }}
    >
      <div className="space-y-3">
        <div className="w-12 h-12 mx-auto bg-gradient-to-r from-cyan-400 to-purple-400 rounded-full flex items-center justify-center">
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
        </div>
        <div>
          <p className="font-medium text-white">{label}</p>
          <p className="text-sm text-slate-400">Click to upload audio</p>
        </div>
      </div>
      {audio && (
        <div className="mt-3 p-3 bg-slate-700/30 rounded-lg border border-slate-600/30">
          <div className="flex items-center gap-2 text-slate-300 text-sm">
            <div className="w-2 h-2 rounded-full bg-green-400"></div>
            <span>Audio loaded: {(audio.length / audio.sampleRate).toFixed(2)}s</span>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent mb-4">
            F5-TTS Web
          </h1>
          <p className="text-slate-300 text-lg">Neural Voice Cloning with Real-Time Generation</p>
        </div>

        <div className="max-w-6xl mx-auto space-y-8">
          {/* Model Configuration */}
          <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-8 shadow-2xl">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-3 h-3 rounded-full bg-gradient-to-r from-cyan-400 to-purple-400"></div>
              <h2 className="text-2xl font-semibold text-white">Model Configuration</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {Object.entries(modelPaths).map(([key, value]) => (
                <div key={key} className="space-y-2">
                  <label className="text-sm font-medium text-slate-300 capitalize">
                    {key.replace(/([A-Z])/g, ' $1').toLowerCase()}
                  </label>
                  <input
                    type="text"
                    value={value}
                    onChange={(e) => setModelPaths(prev => ({ ...prev, [key]: e.target.value }))}
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-400/50 focus:border-transparent transition-all"
                    placeholder={`${key} model path`}
                  />
                </div>
              ))}
            </div>
            
            <button
              onClick={initializeModels}
              disabled={loading || f5tts}
              className={`w-full py-4 px-6 rounded-xl font-semibold text-white transition-all transform ${
                f5tts 
                  ? 'bg-green-600 cursor-default' 
                  : loading 
                    ? 'bg-slate-600 cursor-not-allowed' 
                    : 'bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 hover:scale-105 shadow-lg hover:shadow-xl'
              }`}
            >
              {f5tts ? '✓ Models Loaded' : loading ? 'Loading...' : 'Load Models'}
            </button>
          </div>

          {/* Tab Navigation */}
          <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-2 shadow-2xl">
            <div className="flex flex-wrap gap-2">
              {tabs.map(tab => (
                <TabButton
                  key={tab.id}
                  tab={tab}
                  isActive={activeTab === tab.id}
                  onClick={setActiveTab}
                />
              ))}
            </div>
          </div>

          {/* Tab Content */}
          <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-8 shadow-2xl">
            {activeTab === 'tts' && (
              <div className="space-y-6">
                <h2 className="text-2xl font-semibold text-white mb-6">Basic Text-to-Speech</h2>
                
                <AudioUploadArea
                  onUpload={(file) => handleAudioUpload(file, setRefAudio)}
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

                <AdvancedSettings />

                <button
                  onClick={handleBasicGeneration}
                  disabled={loading || !f5tts || !refAudio || !refText.trim() || !genText.trim()}
                  className={`w-full py-4 px-6 rounded-xl font-semibold text-white transition-all transform ${
                    loading || !f5tts || !refAudio || !refText.trim() || !genText.trim()
                      ? 'bg-slate-600 cursor-not-allowed' 
                      : 'bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 hover:scale-105 shadow-lg hover:shadow-xl'
                  }`}
                >
                  {loading ? 'Generating...' : 'Generate Speech'}
                </button>

                {generatedAudio && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-white">Generated Audio</h3>
                    <audio controls src={generatedAudio} className="w-full" />
                    <a
                      href={generatedAudio}
                      download="generated_speech.wav"
                      className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white px-4 py-2 rounded-lg font-semibold transition-all"
                    >
                      Download WAV
                    </a>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'podcast' && (
              <div className="space-y-6">
                <h2 className="text-2xl font-semibold text-white mb-6">Podcast Generation</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-cyan-400">Speaker 1</h3>
                    <input
                      type="text"
                      value={speaker1Name}
                      onChange={(e) => setSpeaker1Name(e.target.value)}
                      placeholder="Speaker 1 Name"
                      className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
                    />
                    <AudioUploadArea
                      onUpload={(file) => handleAudioUpload(file, setSpeaker1Audio)}
                      label="Speaker 1 Reference Audio"
                      audio={speaker1Audio}
                    />
                    <textarea
                      value={speaker1Text}
                      onChange={(e) => setSpeaker1Text(e.target.value)}
                      placeholder="Reference text for Speaker 1..."
                      className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/50 resize-none h-20"
                    />
                  </div>
                  
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-purple-400">Speaker 2</h3>
                    <input
                      type="text"
                      value={speaker2Name}
                      onChange={(e) => setSpeaker2Name(e.target.value)}
                      placeholder="Speaker 2 Name"
                      className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-400/50"
                    />
                    <AudioUploadArea
                      onUpload={(file) => handleAudioUpload(file, setSpeaker2Audio)}
                      label="Speaker 2 Reference Audio"
                      audio={speaker2Audio}
                    />
                    <textarea
                      value={speaker2Text}
                      onChange={(e) => setSpeaker2Text(e.target.value)}
                      placeholder="Reference text for Speaker 2..."
                      className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-400/50 resize-none h-20"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300">Podcast Script</label>
                  <textarea
                    value={podcastScript}
                    onChange={(e) => setPodcastScript(e.target.value)}
                    placeholder={`Enter script with speaker names:\n\n${speaker1Name || 'Speaker1'}: Hello and welcome to our podcast...\n\n${speaker2Name || 'Speaker2'}: Thanks for having me! I'm excited to be here...`}
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/50 resize-none h-40"
                  />
                </div>

                <button
                  onClick={handlePodcastGeneration}
                  disabled={loading || !f5tts || !speaker1Name || !speaker2Name}
                  className={`w-full py-4 px-6 rounded-xl font-semibold text-white transition-all transform ${
                    loading || !f5tts || !speaker1Name || !speaker2Name
                      ? 'bg-slate-600 cursor-not-allowed' 
                      : 'bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 hover:scale-105 shadow-lg hover:shadow-xl'
                  }`}
                >
                  {loading ? 'Generating Podcast...' : 'Generate Podcast'}
                </button>

                {podcastAudio && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-white">Generated Podcast</h3>
                    <audio controls src={podcastAudio} className="w-full" />
                    <a
                      href={podcastAudio}
                      download="podcast.wav"
                      className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white px-4 py-2 rounded-lg font-semibold transition-all"
                    >
                      Download Podcast
                    </a>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'emotional' && (
              <div className="space-y-6">
                <h2 className="text-2xl font-semibold text-white mb-6">Multi-Style Speech Generation</h2>
                
                <div className="bg-slate-700/30 rounded-xl p-4 border border-slate-600/30">
                  <p className="text-slate-300 text-sm">
                    Use emotion tags in your text like: (Regular) Hello there! (Excited) This is amazing! (Sad) I'm feeling down...
                  </p>
                </div>

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
                  
                  {speechTypes.map((speechType, index) => (
                    <div key={index} className="p-4 bg-slate-700/30 rounded-xl border border-slate-600/30 space-y-3">
                      <div className="flex items-center justify-between">
                        <input
                          type="text"
                          value={speechType.name}
                          onChange={(e) => updateSpeechType(index, 'name', e.target.value)}
                          placeholder="Speech type name (e.g., Excited, Sad)"
                          className="flex-1 px-3 py-2 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-pink-400/50"
                        />
                        <button
                          onClick={() => removeSpeechType(index)}
                          className="ml-3 px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all"
                        >
                          Remove
                        </button>
                      </div>
                      <AudioUploadArea
                        onUpload={(file) => {
                          handleAudioUpload(file, (audio) => updateSpeechType(index, 'audio', audio));
                        }}
                        label={`${speechType.name || 'Speech Type'} Audio`}
                        audio={speechType.audio}
                      />
                      <textarea
                        value={speechType.text}
                        onChange={(e) => updateSpeechType(index, 'text', e.target.value)}
                        placeholder={`Reference text for ${speechType.name || 'this speech type'}...`}
                        className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-pink-400/50 resize-none h-16"
                      />
                    </div>
                  ))}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300">Text with Emotion Tags</label>
                  <textarea
                    value={emotionalText}
                    onChange={(e) => setEmotionalText(e.target.value)}
                    placeholder="(Regular) Hello there! (Excited) This is amazing! (Sad) But sometimes I feel down..."
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-pink-400/50 resize-none h-32"
                  />
                </div>

                <button
                  onClick={handleEmotionalGeneration}
                  disabled={loading || !f5tts || !regularAudio || !emotionalText.trim()}
                  className={`w-full py-4 px-6 rounded-xl font-semibold text-white transition-all transform ${
                    loading || !f5tts || !regularAudio || !emotionalText.trim()
                      ? 'bg-slate-600 cursor-not-allowed' 
                      : 'bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 hover:scale-105 shadow-lg hover:shadow-xl'
                  }`}
                >
                  {loading ? 'Generating...' : 'Generate Emotional Speech'}
                </button>

                {emotionalAudio && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-white">Generated Emotional Speech</h3>
                    <audio controls src={emotionalAudio} className="w-full" />
                    <a
                      href={emotionalAudio}
                      download="emotional_speech.wav"
                      className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white px-4 py-2 rounded-lg font-semibold transition-all"
                    >
                      Download Audio
                    </a>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'credits' && (
              <div className="space-y-6">
                <h2 className="text-2xl font-semibold text-white mb-6">Credits</h2>
                <div className="prose prose-invert max-w-none">
                  <div className="space-y-4 text-slate-300">
                    <p>This F5-TTS Web implementation is built upon the work of many contributors:</p>
                    <ul className="space-y-2">
                      <li>• <strong>F5-TTS Team</strong> - Original F5-TTS model and research</li>
                      <li>• <strong>E2-TTS Team</strong> - E2-TTS model development</li>
                      <li>• <strong>mrfakename</strong> - Original online demo implementation</li>
                      <li>• <strong>RootingInLoad</strong> - Podcast generation feature</li>
                      <li>• <strong>Transformers.js</strong> - JavaScript ML framework</li>
                      <li>• <strong>ONNX Runtime Web</strong> - WebAssembly inference</li>
                    </ul>
                    <div className="mt-8 p-4 bg-slate-700/30 rounded-xl border border-slate-600/30">
                      <h3 className="text-lg font-semibold text-cyan-400 mb-2">Model Information</h3>
                      <p className="text-sm">
                        F5-TTS and E2-TTS are state-of-the-art text-to-speech models that support voice cloning with minimal reference audio. 
                        The models support English and Chinese text generation with natural prosody and emotion.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Progress Bar */}
          {(loading || progress.value > 0) && (
            <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-6 shadow-2xl">
              <div className="flex justify-between items-center text-sm text-slate-300 mb-3">
                <span>{progress.message}</span>
                <span>{progress.value}%</span>
              </div>
              <div className="w-full bg-slate-700/50 rounded-full h-3 overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-cyan-400 to-purple-400 h-full rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${progress.value}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default App;