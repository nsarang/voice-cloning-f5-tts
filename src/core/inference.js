/**
 * Core inference utilities for TTS application.
 * Handles audio processing, transcription, and batch TTS inference.
 */

import Logger from "../logging";
import { loadAudio, remove_silence } from "./audio";
import * as torch from "./tjs/utils/torch";
import { splitGenText } from "./utils";

const LOG = Logger.get("InferenceUtils");

export const handleAudioReady = async (file) => {
  if (!file) return null;
  let refAudio = await loadAudio({ file, targetRate: 24000 });

  if (refAudio.dims.length > 1) {
    LOG.info(`Reference audio has shape ${refAudio.dims}. Converting to mono.`);
    refAudio = refAudio.mean(0);
  }

  // Remove silence
  const preSize = refAudio.size / 24000;
  refAudio = remove_silence({
    audioTensor: refAudio,
    sampleRate: 24000,
    minSilenceMs: 800,
    silenceThresh: -45,
    seekStepMs: 10,
    padMs: 300,
  });
  LOG.info(`Removed silence: ${preSize.toFixed(2)}s -> ${(refAudio.size / 24000).toFixed(2)}s`);

  const maxDurationMs = 10000;
  const maxSamples = (maxDurationMs / 1000) * 24000;
  if (refAudio.size > maxSamples) {
    LOG.info(
      `Reference audio is ${(refAudio.size / 24000).toFixed(2)}s long, trimming to ${maxDurationMs / 1000}s.`
    );
    refAudio = refAudio.slice([0, maxSamples]);
  }
  return refAudio;
};

export const handleTranscription = async (audioTensor, getOrCreateModel, updateProgress) => {
  if (!audioTensor) throw new Error("No audio data provided for transcription");

  const model = getOrCreateModel({
    adapterType: "transcriber",
    id: "transcriptionModel",
  }).resetListeners();

  ["initialize", "download", "inference"].forEach((event) => model.on(event, updateProgress));

  await model.initialize();

  const transcription = await model.inference({
    audioData: audioTensor,
    sampleRate: 24000,
  });
  return transcription;
};

export async function batchInference({ segments, settings, onProgress, getOrCreateModel }) {
  LOG.debug("Starting batch inference");
  LOG.debug({ segments, settings, onProgress, getOrCreateModel });
  const model = getOrCreateModel({
    adapterType: "f5tts",
    id: "ttsEngine",
    config: {
      repoName: "nsarang/F5-TTS-ONNX",
      // rootPath: `${window.location.origin}`,
    },
  }).resetListeners();

  model.on("initialize", onProgress);
  model.on("download", onProgress);

  await model.initialize();

  // Break segments into slices
  const segmentsBroken = segments.map(({ refAudio, refText, genText }) => {
    const textBatches = settings.enableChunking
      ? splitGenText({
          genText,
          refText,
          refAudioLength: refAudio.size / 24000,
          maxOutputLength: 25,
          splitWords: settings.customSplitWords
            .replace(/\s+/g, " ")
            .split(",")
            .map((word) => word.trim()),
          speed: settings.speed,
        })
      : [genText];

    return textBatches.map((text) => ({ refAudio, refText, genText: text }));
  });

  const totalSegments = segmentsBroken.flat().length;
  let processedSegments = 0;

  model.on("inference", ({ value, message }) => {
    onProgress({
      value: ((processedSegments + value / 100) / totalSegments) * 100,
      message,
    });
  });

  LOG.debug(`Total segments to process: ${totalSegments}`);
  LOG.debug(
    "The genText segments are:",
    segmentsBroken.map((s) => s.map((x) => x.genText))
  );

  onProgress({ value: 0, message: "Generating audio..." });
  const results = [];
  for (const slices of segmentsBroken) {
    const segmentResults = [];
    for (const { refAudio, refText, genText } of slices) {
      LOG.debug("Processing segment:", { refText, genText });
      segmentResults.push(
        await model.inference({
          refAudio,
          refText,
          genText,
          speed: settings.speed,
          nfeSteps: settings.nfeSteps,
        })
      );
      processedSegments++;
    }
    // TODO: concat with silence if end of sentence
    results.push(
      remove_silence({
        audioTensor: torch.cat(segmentResults, 0),
        sampleRate: 24000,
        minSilenceMs: 800,
        silenceThresh: -45,
        seekStepMs: 10,
        padMs: 300,
      })
    );
  }
  onProgress({ value: 100, message: "Generation complete!" });
  LOG.debug("Batch inference complete.");
  return results;
}

/**
 * Generate a podcast from a script and speaker audio data.
 * @param {Object} params - The parameters object.
 * @param {string} params.script - The podcast script, e.g.:
 *   "Speaker 1: Hello, this is Speaker 1.\nSpeaker 2: Hi, I am Speaker 2."
 * @param {Object} params.speakers - Speaker audio data, e.g.:
 *   {
 *     "Speaker 1": { refAudio: audioTensor1, refText: "Hello, this is Speaker 1." },
 *     "Speaker 2": { refAudio: audioTensor2, refText: "Hi, I am Speaker 2." }
 *   }
 * @param {...any} [params.kwargs] - Additional keyword arguments for TTS generation.
 * @returns {Promise<Float32Array|null>} - The generated podcast audio data, or null if no segments.
 */
export async function podcastGeneration({ script, speakers, ...kwargs }) {
  const speakerPattern = Object.keys(speakers)
    .map((name) => name.trim())
    .join("|");
  const regex = new RegExp(`(${speakerPattern}):\\s*(.+?)(?=(?:${speakerPattern}):|$)`, "gis");

  const segments = [];
  let match;
  while ((match = regex.exec(script)) !== null) {
    const speakerMatch = match[1].trim();
    const speaker = Object.entries(speakers).find(
      ([key]) => key.toLowerCase() === speakerMatch.toLowerCase()
    )?.[1];
    const text = match[2].trim();
    segments.push({ refAudio: speaker.refAudio, refText: speaker.refText, genText: text });
  }

  LOG.debug("Segments:", segments);
  const results = await batchInference({ segments, ...kwargs });
  return results;
}
