import { useState } from 'react';

export const useProgress = () => {
  const [progress, setProgress] = useState({ value: 0, message: '' });
  const [loading, setLoading] = useState(false);

  const updateProgress = (value, message = '') => {
    setProgress({ value, message });
  };

  const resetProgress = () => {
    setProgress({ value: 0, message: '' });
  };

  return {
    progress,
    loading,
    setLoading,
    updateProgress,
    resetProgress
  };
};