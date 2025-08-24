import { useCallback, useState } from "react";

export function useProgress(initialValue = { value: 0, message: "" }) {
  const [progress, setProgress] = useState(initialValue);

  const isLoading =
    (progress.value > 0 && progress.value < 100) ||
    (progress.message !== "" && progress.value === 0);

  const updateProgress = useCallback(({ value, message = "" }) => {
    setProgress({ value, message });
  }, []);

  const resetProgress = useCallback(() => setProgress(initialValue), [initialValue]);

  return {
    progress,
    updateProgress,
    resetProgress,
    isLoading,
  };
}
