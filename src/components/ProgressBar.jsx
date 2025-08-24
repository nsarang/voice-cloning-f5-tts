import React from "react";

export const ProgressBar = ({ progress, isLoading }) => {
  if (!progress.message && progress.value === 0) {
    return null;
  }

  return (
    <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-6 shadow-2xl">
      <div className="flex justify-between items-center text-sm text-slate-300 mb-3">
        <span>{progress.message}</span>
        <span>
          {progress.value > 0
            ? `${Number(progress.value).toFixed(progress.value % 1 === 0 ? 0 : 1)}%`
            : null}
        </span>
      </div>
      {/* Progress bar */}
      {
        <div className="w-full bg-slate-700/50 rounded-full h-3 overflow-hidden">
          <div
            className="bg-gradient-to-r from-cyan-400 to-purple-400 h-full rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progress.value}%` }}
          />
        </div>
      }
      {/* Bouncing dots */}
      {isLoading && (
        <div className="flex justify-center items-center space-x-2 mt-6">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="w-3 h-3 bg-gradient-to-r from-cyan-400 to-purple-400 rounded-full animate-bounce"
              style={{ animationDelay: `${i * 0.1}s` }}
            />
          ))}
        </div>
      )}
    </div>
  );
};
