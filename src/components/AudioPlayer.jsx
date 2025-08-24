import React, { useEffect, useRef, useState } from "react";
import WaveSurfer from "wavesurfer.js";

export const AudioPlayer = ({ audioUrl, filename = null, title = "Generated Audio" }) => {
  const waveformRef = useRef(null);
  const wavesurfer = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    if (!audioUrl || !waveformRef.current) return;

    if (wavesurfer.current) {
      wavesurfer.current.destroy();
    }

    wavesurfer.current = WaveSurfer.create({
      container: waveformRef.current,
      waveColor: "rgba(139,92,246,0.7)", // purple-500 with opacity
      progressColor: "rgba(34,211,238,0.9)", // cyan-400
      cursorColor: "#fff",
      barWidth: 6,
      barGap: 2,
      height: 80,
      responsive: true,
      normalize: true,
      backgroundColor: "rgba(30,41,59,0.8)", // slate-800
    });

    wavesurfer.current.load(audioUrl);

    wavesurfer.current.on("play", () => setIsPlaying(true));
    wavesurfer.current.on("pause", () => setIsPlaying(false));
    wavesurfer.current.on("finish", () => setIsPlaying(false));

    return () => {
      wavesurfer.current && wavesurfer.current.destroy();
    };
  }, [audioUrl]);

  const handlePlayPause = () => {
    if (wavesurfer.current) {
      wavesurfer.current.playPause();
    }
  };

  if (!audioUrl) return null;

  return (
    <div className="space-y-2">
      <h3 className="text-lg font-semibold text-white">{title}</h3>
      <div className="relative rounded-xl overflow-hidden bg-gradient-to-r from-purple-700 via-cyan-700 to-blue-700 p-2">
        <div ref={waveformRef} className="rounded-lg bg-slate-800" style={{ minHeight: 80 }} />
        <button
          onClick={handlePlayPause}
          className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2
            bg-gradient-to-r from-purple-500 to-cyan-400 shadow-lg
            text-white p-4 rounded-full transition-all hover:scale-110
            flex items-center justify-center`}
          style={{ zIndex: 2 }}
        >
          {isPlaying ? (
            <svg width="24" height="24" fill="none" viewBox="0 0 24 24">
              <rect x="6" y="5" width="4" height="14" rx="1" fill="white" />
              <rect x="14" y="5" width="4" height="14" rx="1" fill="white" />
            </svg>
          ) : (
            <svg width="24" height="24" fill="none" viewBox="0 0 24 24">
              <polygon points="6,4 20,12 6,20" fill="white" />
            </svg>
          )}
        </button>
      </div>
      {filename && (
        <div className="flex items-center mt-2">
          <a
            href={audioUrl}
            download={filename}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-500 to-cyan-400 hover:from-purple-600 hover:to-cyan-500 text-white px-4 py-2 rounded-lg font-semibold transition-all"
          >
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24">
              <path
                d="M12 16V4M12 16l-4-4m4 4l4-4M4 20h16"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Download
          </a>
        </div>
      )}
    </div>
  );
};
