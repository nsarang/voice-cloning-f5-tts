import React from "react";

import { DescriptionBox } from "./utils/DescriptionBox";
import { SectionHeader } from "./utils/SectionHeader";

export const CreditsTab = () => {
  const contributors = [
    {
      name: "xenova/whisper-web",
      role: "I learned a lot from the Whisper Web implementation and Transformers.js to create my template. Xenova's work in the WebML space has been second to none.",
      link: "https://github.com/xenova/whisper-web",
    },
    {
      name: "SWivid/F5-TTS",
      role: "Original F5-TTS model and research. The architecture is a transformer model with conditional flow matching objective.",
      link: "https://github.com/SWivid/F5-TTS",
    },
    {
      name: "mrfakename/E2-F5-TTS",
      role: "The Python demo of E2-F5-TTS using Gradio.",
      link: "https://huggingface.co/spaces/mrfakename/E2-F5-TTS",
    },
    {
      name: "DakeQQ/F5-TTS-ONNX",
      role: "ONNX conversion and optimization for web deployment. This kind of conversion is not trivial and requires source code modifications.",
      link: "https://github.com/DakeQQ/F5-TTS-ONNX",
    },
    {
      name: "onnx-community/distil-small.en",
      role: "ONNX version of the Distil Whisper transcription model.",
      link: "https://huggingface.co/onnx-community/distil-small.en",
    },
    {
      name: "Claude and Copilot",
      role: "For an inexperienced web developer like me, these tools were very helpful... most of the time! :))",
    },
  ];

  return (
    <div className="space-y-6">
      <SectionHeader title="Credits" />

      <div className="prose prose-invert max-w-none">
        <div className="space-y-6 text-slate-300">
          <DescriptionBox>
            This F5-TTS Web implementation is built upon the work of many contributors:
          </DescriptionBox>

          <div className="grid gap-4">
            {contributors.map((contributor, index) => (
              <ContributorCard key={index} {...contributor} />
            ))}
          </div>

          <ModelInfoSection />

          <TechnicalStack />
        </div>
      </div>
    </div>
  );
};

const ContributorCard = ({ name, role, link }) => (
  <div className="bg-slate-700/30 rounded-xl p-4 border border-slate-600/30 hover:shadow-lg hover:bg-slate-700/50 transition-all">
    <div className="flex items-center justify-between">
      <div>
        <h3 className="text-base font-semibold text-cyan-400">{name}</h3>
        <p className="text-sm text-slate-400">{role}</p>
      </div>
      {link && (
        <a
          href={link}
          target="_blank"
          rel="noopener noreferrer"
          className="text-purple-400 hover:text-purple-300 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
            />
          </svg>
        </a>
      )}
    </div>
  </div>
);

// ...existing code...

const ModelInfoSection = () => (
  <div className="mt-8">
    <h3 className="text-xl font-semibold text-purple-400 mb-4">Model Information</h3>
    <div className="space-y-4 text-sm text-slate-300">
      <p>
        <strong className="text-white">F5-TTS</strong>: A fully nonautoregressive TTS system using
        flow matching with Diffusion Transformer (DiT). Eliminates need for duration models, text
        encoders, or phoneme alignment by padding text with filler tokens to match speech length,
        followed by denoising for generation.
      </p>
      <p>
        <strong className="text-white">Transcription Model</strong>: ONNX-optimized Distil Whisper
        for real-time speech-to-text.
      </p>
    </div>
  </div>
);

// ...existing code...

const TechnicalStack = () => {
  const technologies = [
    { name: "ONNX Runtime", version: "Web", purpose: "Model Inference" },
    { name: "Comlink", version: "4.x", purpose: "Web Worker Communication" },
    { name: "Transformers.js", version: "3.7", purpose: "Transcription and Utility Functions" },
    { name: "React", version: "19.x", purpose: "UI Framework" },
    { name: "Tailwind CSS", version: "3.x", purpose: "Styling" },
  ];

  return (
    <div className="mt-8">
      <h3 className="text-xl font-semibold text-purple-400 mb-4">Technical Stack</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {technologies.map((tech, index) => (
          <div
            key={index}
            className="bg-slate-800/40 rounded-lg px-4 py-3 border border-slate-700/50"
          >
            <div className="flex justify-between items-center">
              <span className="font-medium text-white">{tech.name}</span>
              <span className="text-xs text-slate-400">{tech.version}</span>
            </div>
            <p className="text-xs text-slate-500 mt-1">{tech.purpose}</p>
          </div>
        ))}
      </div>
    </div>
  );
};
