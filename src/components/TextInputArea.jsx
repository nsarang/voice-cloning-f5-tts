import React, { useState } from "react";

export const TextInputArea = ({ label, value, onChange, placeholder, accentColor, icon }) => {
  const [focused, setFocused] = useState(false);

  return (
    <div className="space-y-2 relative">
      <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
        <span className="text-xl">{icon}</span>
        {label}
      </label>
      <div
        className={`relative transition-all duration-300 ${focused ? "transform scale-105" : ""}`}
      >
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
          className={`w-full px-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 resize-none h-24 transition-all
            ${accentColor === "orange" ? "focus:ring-orange-400/50" : "focus:ring-pink-400/50"}
            ${focused ? "shadow-lg" : ""}
          `}
        />
        {focused && (
          <div
            className={`absolute inset-0 rounded-xl pointer-events-none
            ${
              accentColor === "orange"
                ? "bg-gradient-to-r from-orange-400/10 to-transparent"
                : "bg-gradient-to-r from-pink-400/10 to-transparent"
            }`}
          />
        )}
      </div>
      <div className="text-xs text-slate-500 text-right">{value.length} characters</div>
    </div>
  );
};
