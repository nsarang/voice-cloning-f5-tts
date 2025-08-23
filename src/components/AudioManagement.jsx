import React, { useRef } from 'react';

export const AudioUploadArea = ({ onUpload, label, audio }) => {
  const inputRef = useRef(null);

  const handleClick = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'audio/*';
    input.onchange = (e) => onUpload(e.target.files[0]);
    input.click();
  };

  return (
    <div
      className="relative border-2 border-dashed border-slate-600/50 rounded-xl p-6 text-center hover:border-purple-400/50 transition-all cursor-pointer bg-slate-700/20"
      onClick={handleClick}
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
            <span>Audio loaded: {(audio.size / 24000).toFixed(2)}s</span>
          </div>
        </div>
      )}
    </div>
  );
};


export const AudioPlayer = ({ audioUrl, filename = "audio.wav", title = "Generated Audio" }) => {
  if (!audioUrl) return null;
  
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-white">{title}</h3>
      <audio controls src={audioUrl} className="w-full" />
      <a
        href={audioUrl}
        download={filename}
        className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white px-4 py-2 rounded-lg font-semibold transition-all"
      >
        Download WAV
      </a>
    </div>
  );
};