import React from 'react';

export const CreditsTab = () => {
  const contributors = [
    {
      name: 'F5-TTS Team',
      role: 'Original F5-TTS model and research',
      link: 'https://github.com/SWivid/F5-TTS'
    },
    {
      name: 'E2-TTS Team',
      role: 'E2-TTS model development',
      link: null
    },
    {
      name: 'mrfakename',
      role: 'Original online demo implementation',
      link: null
    },
    {
      name: 'RootingInLoad',
      role: 'Podcast generation feature',
      link: null
    },
    {
      name: 'Transformers.js',
      role: 'JavaScript ML framework',
      link: 'https://github.com/xenova/transformers.js'
    },
    {
      name: 'ONNX Runtime Web',
      role: 'WebAssembly inference',
      link: 'https://onnxruntime.ai/docs/get-started/with-javascript.html'
    }
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold text-white mb-6">Credits</h2>
      
      <div className="prose prose-invert max-w-none">
        <div className="space-y-6 text-slate-300">
          <p className="text-lg">
            This F5-TTS Web implementation is built upon the work of many contributors:
          </p>
          
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
  <div className="bg-slate-700/30 rounded-xl p-4 border border-slate-600/30 hover:bg-slate-700/40 transition-all">
    <div className="flex items-center justify-between">
      <div>
        <h3 className="text-lg font-semibold text-cyan-400">{name}</h3>
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
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>
      )}
    </div>
  </div>
);

const ModelInfoSection = () => (
  <div className="mt-8 p-6 bg-gradient-to-r from-slate-700/30 to-purple-900/20 rounded-xl border border-slate-600/30">
    <h3 className="text-xl font-semibold text-cyan-400 mb-3">Model Information</h3>
    <div className="space-y-3 text-sm">
      <p>
        <strong className="text-white">F5-TTS and E2-TTS</strong> are state-of-the-art text-to-speech models 
        that support voice cloning with minimal reference audio.
      </p>
      <ul className="space-y-2 list-disc list-inside ml-4">
        <li>Zero-shot voice cloning with 5-15 seconds of reference audio</li>
        <li>Support for English and Chinese text generation</li>
        <li>Natural prosody and emotion preservation</li>
        <li>Real-time generation capabilities</li>
      </ul>
    </div>
  </div>
);

const TechnicalStack = () => {
  const technologies = [
    { name: 'React', version: '18.x', purpose: 'UI Framework' },
    { name: 'ONNX Runtime', version: 'Web', purpose: 'Model Inference' },
    { name: 'WebGPU', version: 'Latest', purpose: 'GPU Acceleration' },
    { name: 'Tailwind CSS', version: '3.x', purpose: 'Styling' },
    { name: 'Web Audio API', version: 'Native', purpose: 'Audio Processing' }
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