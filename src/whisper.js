// whisper-transcription.js
import { pipeline } from '@xenova/transformers';

let whisperPipeline = null;

export async function initWhisper() {
  if (!whisperPipeline) {
    whisperPipeline = await pipeline('automatic-speech-recognition', 'Xenova/distil-whisper-small.en');
  }
  return whisperPipeline;
}

export async function transcribeAudio(audioData, sampleRate = 16000) {
  const pipe = await initWhisper();
  const result = await pipe(audioData, {
    chunk_length_s: 30,
    stride_length_s: 5,
    language: 'english',
    task: 'transcribe',
    sampling_rate: sampleRate
  });
  return result.text;
}

// Usage in your component:
// const transcription = await transcribeAudio(audioBuffer, 16000);