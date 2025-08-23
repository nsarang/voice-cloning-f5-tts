import { useState, useCallback } from 'react';

const DEFAULT_SETTINGS = {
  speed: 1.0,
  nfeSteps: 32,
  removeSilence: true,
  enableChunking: false,
  customSplitWords: ''
};

export const useAudioSettings = (initialSettings = DEFAULT_SETTINGS) => {
  const [settings, setSettings] = useState(initialSettings);

  const updateSettings = useCallback((updates) => {
    setSettings(prev => ({ ...prev, ...updates }));
  }, []);

  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
  }, []);

  return { settings, updateSettings, resetSettings };
};
