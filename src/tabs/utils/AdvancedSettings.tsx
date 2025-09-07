import { useCallback, useEffect, useRef, useState } from "react";

type AdvancedSettingsProps = {
  settings: Record<string, any>;
  onSettingsChange: (updates: Record<string, any>) => void;
  showAdvanced: boolean;
  onToggleAdvanced: () => void;
};

export const AdvancedSettings = ({
  settings,
  onSettingsChange,
  showAdvanced,
  onToggleAdvanced,
}: AdvancedSettingsProps) => {
  const handleChange = (key: string, value: any) => {
    onSettingsChange({ [key]: value });
  };

  return (
    <div className="bg-slate-800/30 rounded-xl border border-slate-700/50 p-6">
      <button
        onClick={onToggleAdvanced}
        className="w-full flex items-center justify-between cursor-pointer text-lg font-semibold text-white mb-4 hover:text-cyan-400 transition-colors"
      >
        <span>Advanced Settings</span>
        <svg
          className={`w-5 h-5 transform transition-transform ${showAdvanced ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {showAdvanced && (
        <div className="space-y-6">
          <GenerationSettings
            speed={settings.speed}
            nfeSteps={settings.nfeSteps}
            onChange={handleChange}
          />

          <AudioProcessingSettings removeSilence={settings.removeSilence} onChange={handleChange} />

          <TextProcessingSettings
            enableChunking={settings.enableChunking}
            customSplitWords={settings.customSplitWords}
            onChange={handleChange}
          />
        </div>
      )}
    </div>
  );
};

type GenerationSettingsProps = {
  speed: number;
  nfeSteps: number;
  onChange: (key: string, value: any) => void;
};

const GenerationSettings = ({ speed, nfeSteps, onChange }: GenerationSettingsProps) => (
  <div className="space-y-4">
    <h4 className="text-md font-medium text-slate-200 border-b border-slate-600/50 pb-2">
      Generation Settings
    </h4>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <RangeInput
        label="Speed"
        value={speed}
        min={0.3}
        max={2.0}
        step={0.1}
        unit="x"
        onChange={(value) => onChange("speed", parseFloat(value))}
      />
      <RangeInput
        label="NFE Steps"
        value={nfeSteps}
        min={8}
        max={64}
        step={1}
        unit="steps"
        onChange={(value) => onChange("nfeSteps", parseInt(value))}
      />
    </div>
  </div>
);

type AudioProcessingSettingsProps = {
  removeSilence: boolean;
  onChange: (key: string, value: any) => void;
};

const AudioProcessingSettings = ({ removeSilence, onChange }: AudioProcessingSettingsProps) => (
  <div className="space-y-4">
    <h4 className="text-md font-medium text-slate-200 border-b border-slate-600/50 pb-2">
      Audio Processing
    </h4>
    <CheckboxInput
      id="removeSilence"
      label="Remove Silences"
      checked={removeSilence}
      onChange={(checked) => onChange("removeSilence", checked)}
    />
  </div>
);

type TextProcessingSettingsProps = {
  enableChunking: boolean;
  customSplitWords: string;
  onChange: (key: string, value: any) => void;
};

const TextProcessingSettings = ({
  enableChunking,
  customSplitWords,
  onChange,
}: TextProcessingSettingsProps) => (
  <div className="space-y-4">
    <h4 className="text-md font-medium text-slate-200 border-b border-slate-600/50 pb-2">
      Text Processing
    </h4>
    <div className="space-y-3">
      <CheckboxInput
        id="enableChunking"
        label="Enable Chunking"
        checked={enableChunking}
        onChange={(checked) => onChange("enableChunking", checked)}
      />

      <div
        className={`space-y-2 transition-all duration-200 ${!enableChunking ? "opacity-50" : ""}`}
      >
        <label className="text-sm font-medium text-slate-300">Custom Split Words</label>
        <textarea
          value={customSplitWords}
          onChange={(e) => onChange("customSplitWords", e.target.value)}
          disabled={!enableChunking}
          placeholder="Enter words separated by commas"
          rows={4}
          className={`w-full px-3 py-2 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-400/50 transition-all resize-y ${
            !enableChunking ? "cursor-not-allowed bg-slate-800/50" : ""
          }`}
        />
        {!enableChunking && (
          <p className="text-xs text-slate-500">Enable chunking to use custom split words</p>
        )}
      </div>
    </div>
  </div>
);

type RangeInputProps = {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  onChange: (value: string) => void;
};

const RangeInput = ({ label, value, min, max, step, unit, onChange }: RangeInputProps) => (
  <div className="space-y-2">
    <label className="text-sm font-medium text-slate-300">{label}</label>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer slider"
    />
    <span className="text-xs text-slate-400">
      {value} {unit}
    </span>
  </div>
);

type CheckboxInputProps = {
  id: string;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
};

const CheckboxInput = ({ id, label, checked, onChange }: CheckboxInputProps) => (
  <div className="flex items-center space-x-3">
    <input
      type="checkbox"
      id={id}
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      className="w-4 h-4 text-purple-400 bg-slate-700 border-slate-600 rounded focus:ring-purple-400/50 focus:ring-2"
    />
    <label htmlFor={id} className="text-sm font-medium text-slate-300">
      {label}
    </label>
  </div>
);

export const useAdvancedSettings = (initialSettings: Record<string, any>) => {
  const [settings, setSettings] = useState<Record<string, any>>(initialSettings);
  const initialRef = useRef(initialSettings);

  useEffect(() => {
    initialRef.current = initialSettings;
  }, [initialSettings]);

  const updateSettings = useCallback((updates: Record<string, any>) => {
    setSettings((prev) => ({ ...prev, ...updates }));
  }, []);

  const resetSettings = useCallback(() => {
    setSettings(initialRef.current);
  }, []);

  return { settings, updateSettings, resetSettings };
};
