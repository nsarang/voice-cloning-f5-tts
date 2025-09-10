import type { ChangeEvent, ReactNode } from "react";
import React, { useState } from "react";

type TextInputProps = {
  label?: string;
  value?: string | number;
  onChange?: (value: string) => void;
  placeholder?: string;
  accentColor?: string;
  icon?: ReactNode;
  description?: string;
  disabled?: boolean;
  multiline?: boolean;
  rows?: number;
};

export const TextInput = ({
  label,
  value,
  onChange,
  placeholder,
  accentColor,
  icon,
  description,
  disabled,
  multiline = false,
  rows = 6,
}: TextInputProps) => {
  const [focused, setFocused] = useState(false);
  const inputId = label ? label.toLowerCase().replace(/\s+/g, "-") : "text-input";
  const stringValue = value?.toString() || "";

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (!disabled && onChange) {
      onChange(e.target.value);
    }
  };

  return (
    <div className="space-y-2 relative">
      <label
        htmlFor={inputId}
        className={`text-sm font-medium flex items-center gap-2 ${disabled ? "text-slate-500" : "text-slate-300"}`}
      >
        <span className="text-xl">{icon}</span>
        {label}
      </label>
      {description && (
        <p className={`text-xs ${disabled ? "text-slate-500" : "text-slate-400"}`}>{description}</p>
      )}
      <div
        className={`relative transition-all duration-300 ${focused && !disabled ? "transform scale-105" : ""}`}
      >
        {multiline ? (
          <textarea
            id={inputId}
            value={stringValue}
            onChange={handleChange}
            onFocus={() => !disabled && setFocused(true)}
            onBlur={() => !disabled && setFocused(false)}
            placeholder={placeholder}
            disabled={disabled}
            rows={rows}
            className={`w-full px-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 resize-none transition-all
              ${accentColor === "orange" ? "focus:ring-orange-400/50" : "focus:ring-pink-400/50"}
              ${focused && !disabled ? "shadow-lg" : ""}
              ${disabled ? "opacity-50 cursor-not-allowed" : ""}
            `}
          />
        ) : (
          <input
            id={inputId}
            type="text"
            value={stringValue}
            onChange={handleChange}
            onFocus={() => !disabled && setFocused(true)}
            onBlur={() => !disabled && setFocused(false)}
            placeholder={placeholder}
            disabled={disabled}
            className={`w-full px-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 transition-all
              ${accentColor === "orange" ? "focus:ring-orange-400/50" : "focus:ring-pink-400/50"}
              ${focused && !disabled ? "shadow-lg" : ""}
              ${disabled ? "opacity-50 cursor-not-allowed" : ""}
            `}
          />
        )}
        {focused && !disabled && (
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
      <div className={`text-xs text-right ${disabled ? "text-slate-500" : "text-slate-400"}`}>
        {stringValue.length} characters
      </div>
    </div>
  );
};
