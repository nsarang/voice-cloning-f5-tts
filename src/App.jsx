import React, { useState, useRef, useCallback } from 'react';
import { F5TTS } from './f5-tts.js';
import { processReferenceAudio } from './audio-utils.js';

const App = () => {
  const [f5tts, setF5tts] = useState(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState({ value: 0, message: '' });
  const [refAudio, setRefAudio] = useState(null);
  const [refText, setRefText] = useState('');
  const [genText, setGenText] = useState('');
  const [generatedAudio, setGeneratedAudio] = useState(null);
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

  const handleAudioUpload = useCallback(async (e) => {
    const file = e.target.files[0];
    if (!file || !f5tts) return;

    setLoading(true);
    setProgress({ value: 0, message: 'Processing reference audio...' });

    try {
      const processedAudio = await processReferenceAudio(file);
      setRefAudio(processedAudio);
      setProgress({ value: 100, message: 'Reference audio processed' });
    } catch (error) {
      console.error('Audio processing failed:', error);
      setProgress({ value: 0, message: `Audio error: ${error.message}` });
    } finally {
      setLoading(false);
    }
  }, [f5tts]);

  const generateSpeech = useCallback(async () => {
    if (!f5tts || !refAudio || !refText.trim() || !genText.trim()) {
      alert('Please load models, upload reference audio, and provide both reference and generation text');
      return;
    }

    setLoading(true);
    setGeneratedAudio(null);

    try {
      const audioData = await f5tts.generateSpeech(
        refAudio,
        refText,
        genText,
        (progress, message) => {
          setProgress({ 
            value: Math.round(progress), 
            message 
          });
        }
      );

      // Create WAV blob
      const wavBlob = audioBufferToWav(audioData, 24000);
      setGeneratedAudio(URL.createObjectURL(wavBlob));
      
      setProgress({ value: 100, message: 'Generation complete' });

    } catch (error) {
      console.error('Generation failed:', error);
      setProgress({ value: 0, message: `Generation error: ${error.message}` });
    } finally {
      setLoading(false);
    }
  }, [f5tts, refAudio, refText, genText]);

  // WAV file creation
  const audioBufferToWav = useCallback((audioData, sampleRate) => {
    const length = audioData.length;
    const buffer = new ArrayBuffer(44 + length * 2);
    const view = new DataView(buffer);
    const samples = new Int16Array(buffer, 44);

    // WAV header
    const writeString = (offset, string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + length * 2, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, length * 2, true);

    // Convert to 16-bit PCM
    for (let i = 0; i < length; i++) {
      samples[i] = Math.max(-1, Math.min(1, audioData[i])) * 0x7FFF;
    }

    return new Blob([buffer], { type: 'audio/wav' });
  }, []);

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">F5-TTS Web</h1>
        
        {/* Model Configuration */}
        <div className="space-y-4 mb-6">
          <h2 className="text-xl font-semibold">Model Configuration</h2>
          <div className="grid grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="Preprocess model path"
              value={modelPaths.preprocess}
              onChange={(e) => setModelPaths(prev => ({ ...prev, preprocess: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded-md"
            />
            <input
              type="text"
              placeholder="Transformer model path"
              value={modelPaths.transformer}
              onChange={(e) => setModelPaths(prev => ({ ...prev, transformer: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded-md"
            />
            <input
              type="text"
              placeholder="Decode model path"
              value={modelPaths.decode}
              onChange={(e) => setModelPaths(prev => ({ ...prev, decode: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded-md"
            />
            <input
              type="text"
              placeholder="Vocab file path"
              value={modelPaths.vocab}
              onChange={(e) => setModelPaths(prev => ({ ...prev, vocab: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          <button
            onClick={initializeModels}
            disabled={loading || f5tts}
            className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white px-4 py-2 rounded-md"
          >
            {f5tts ? 'Models Loaded' : 'Load Models'}
          </button>
        </div>

        {/* Reference Audio */}
        <div className="space-y-4 mb-6">
          <h2 className="text-xl font-semibold">Reference Audio</h2>
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*"
            onChange={handleAudioUpload}
            disabled={!f5tts}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50"
          />
          {refAudio && (
            <div className="text-sm text-gray-600">
              Duration: {(refAudio.length / refAudio.sampleRate).toFixed(2)}s | 
              Sample Rate: {refAudio.sampleRate}Hz
            </div>
          )}
        </div>

        {/* Text Inputs */}
        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Reference Text (what the reference audio says)
            </label>
            <textarea
              value={refText}
              onChange={(e) => setRefText(e.target.value)}
              placeholder="Enter the text that matches your reference audio..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md h-24 resize-none"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Text to Generate
            </label>
            <textarea
              value={genText}
              onChange={(e) => setGenText(e.target.value)}
              placeholder="Enter the text you want to generate speech for..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md h-32 resize-none"
            />
          </div>
        </div>

        {/* Generate Button */}
        <button
          onClick={generateSpeech}
          disabled={loading || !f5tts || !refAudio || !refText.trim() || !genText.trim()}
          className="w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white py-3 px-4 rounded-md font-semibold"
        >
          {loading ? 'Generating...' : 'Generate Speech'}
        </button>

        {/* Progress */}
        {(loading || progress.value > 0) && (
          <div className="mt-4">
            <div className="flex justify-between text-sm text-gray-600 mb-1">
              <span>{progress.message}</span>
              <span>{progress.value}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress.value}%` }}
              />
            </div>
          </div>
        )}

        {/* Generated Audio */}
        {generatedAudio && (
          <div className="mt-6 p-4 bg-gray-50 rounded-md">
            <h3 className="text-lg font-semibold mb-3">Generated Audio</h3>
            <audio
              ref={audioRef}
              controls
              src={generatedAudio}
              className="w-full mb-3"
            />
            <a
              href={generatedAudio}
              download="generated_speech.wav"
              className="inline-block bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md text-sm"
            >
              Download WAV
            </a>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;