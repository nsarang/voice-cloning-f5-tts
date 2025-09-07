import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { cModes } from "./components";

export const useAudioInput = () => {
  // UI State
  const [mode, setMode] = useState(cModes.SELECTOR);

  // Audio State
  const [audioFile, setAudioFile] = useState(null);
  const [audioUrl, setAudioUrl] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState(null);
  const [duration, setDuration] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);

  // File handling
  const handleFileSelect = useCallback((file) => {
    if (file && file.type.startsWith("audio/")) {
      setAudioFile(file);
      setError(null);
      setMode(cModes.PREVIEW);
      return file;
    } else {
      setError("Please select a valid audio file");
      return null;
    }
  }, []);

  // URL handling
  const loadFromUrl = useCallback(async (url) => {
    if (!url.trim()) {
      setError("Please enter a valid URL");
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      const response = await fetch(url, {
        signal: controller.signal,
        mode: "cors",
      });

      clearTimeout(timeoutId);

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

      const blob = await response.blob();
      const file = new File([blob], "audio-from-url", { type: blob.type });
      setAudioFile(file);
      setMode(cModes.PREVIEW);
      setAudioUrl("");
      return file;
    } catch (err) {
      const errorMsg =
        err.name === "AbortError" ? "Request timed out" : `Failed to load audio: ${err.message}`;
      setError(errorMsg);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Recording handling
  const startRecording = useCallback(async () => {
    try {
      setDuration(0);
      setIsRecording(true);
      setRecordedBlob(null);

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setRecordedBlob(blob);
        chunksRef.current = [];
      };

      mediaRecorder.start();
      setError(null);
    } catch (err) {
      setError("Could not access microphone. Please check permissions.");
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
      streamRef.current?.getTracks().forEach((track) => track.stop());
      setIsRecording(false);
    }
  }, []);

  const acceptRecording = useCallback(() => {
    if (recordedBlob) {
      const file = new File([recordedBlob], "recording.webm", {
        type: recordedBlob.type,
      });
      setAudioFile(file);
      setRecordedBlob(null);
      setMode(cModes.PREVIEW);
      return file;
    }
    return null;
  }, [recordedBlob]);

  const closeMode = useCallback(() => {
    setMode(cModes.SELECTOR);
  }, []);

  // Timer for recording
  useEffect(() => {
    let interval;
    if (isRecording) {
      interval = setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  const clearAudio = useCallback(() => {
    setAudioFile(null);
    setRecordedBlob(null);
    setError(null);
    setDuration(0);
    closeMode();
  }, [closeMode]);

  const loadDemoAudio = useCallback(
    async (
      demoUrl = "https://static.wikia.nocookie.net/dota2_gamepedia/images/e/e0/Vo_sniper_snip_spawn_05.mp3"
    ) => {
      return loadFromUrl(demoUrl);
    },
    [loadFromUrl]
  );

  return useMemo(
    () => ({
      // State
      mode,
      audioFile,
      audioUrl,
      setAudioUrl,
      isRecording,
      recordedBlob,
      duration,
      loading,
      error,

      // Actions
      setMode,
      handleFileSelect,
      loadFromUrl,
      startRecording,
      stopRecording,
      acceptRecording,
      closeMode,
      clearAudio,
      loadDemoAudio,
    }),
    [
      mode,
      audioFile,
      audioUrl,
      isRecording,
      recordedBlob,
      duration,
      loading,
      error,
      handleFileSelect,
      loadFromUrl,
      startRecording,
      stopRecording,
      acceptRecording,
      closeMode,
      clearAudio,
      loadDemoAudio,
    ]
  );
};
