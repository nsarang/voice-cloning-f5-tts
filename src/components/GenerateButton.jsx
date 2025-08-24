import React, { useState } from "react";

export const GenerateButton = ({ onClick, disabled, loading }) => {
  const [clicked, setClicked] = useState(false);

  const handleClick = () => {
    setClicked(true);
    onClick();
    setTimeout(() => setClicked(false), 600);
  };

  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      className={`relative w-full py-4 px-6 rounded-xl font-semibold text-white transition-all transform overflow-hidden ${
        disabled
          ? "bg-slate-600 cursor-not-allowed"
          : "bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 hover:scale-105 shadow-lg hover:shadow-xl"
      }`}
    >
      {/* Ripple effect */}
      {clicked && !disabled && <span className="absolute inset-0 bg-white/30 animate-ping" />}

      {/* Button content */}
      <span className="relative flex items-center justify-center gap-3">
        {loading ? (
          <>
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
                fill="none"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            Generating...
          </>
        ) : (
          <>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
            Generate Speech
          </>
        )}
      </span>
    </button>
  );
};
