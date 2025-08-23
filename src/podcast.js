import * as torch from './tjs/utils/torch.js';
import { Tensor } from './tjs/utils/torch.js';
import { F5TTS } from './f5-tts';


/**
 * Generate a podcast from a script and speaker audio data.
 * @param {Object} params - The parameters object.
 * @param {F5TTS} params.f5tts - The F5TTS instance.
 * @param {string} params.script - The podcast script, e.g.:
 *   "Speaker 1: Hello, this is Speaker 1.\nSpeaker 2: Hi, I am Speaker 2."
 * @param {Object} params.speakers - Speaker audio data, e.g.:
 *   {
 *     "Speaker 1": { audio: audioTensor1, refText: "Hello, this is Speaker 1." },
 *     "Speaker 2": { audio: audioTensor2, refText: "Hi, I am Speaker 2." }
 *   }
 * @param {...any} [params.kwargs] - Additional keyword arguments for TTS generation.
 * @returns {Promise<Float32Array|null>} - The generated podcast audio data, or null if no segments.
 */
export async function generatePodcast({ f5tts, script, speakers, ...kwargs }) {

    // Parse script into speaker segments
    const lines = script.split('\n').filter(l => l.trim());
    const segments = [];

    for (const line of lines) {
        const match = line.match(/^(.+?):\s*(.+)$/);
        if (!match) continue;

        const [, speakerName, text] = match;
        const speaker = speakers[speakerName];

        if (!speaker?.audio || !speaker?.refText) continue;

        const audioTensor = await f5tts.generateSpeech(
            {
                refAudio: speaker.audio,
                refText: speaker.refText,
                genText: text.trim(),
                ...kwargs
            });
        segments.push(audioTensor);
    }

    if (segments.length === 0) return null;
    return torch.cat(segments, 0);
}
