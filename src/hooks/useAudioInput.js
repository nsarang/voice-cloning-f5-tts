import { useCallback, useEffect, useRef, useState } from "react";

export const useAudioInput = () => {
  const [audioFile, setAudioFile] = useState(null);
  const [audioUrl, setAudioUrl] = useState("");
  const [recording, setRecording] = useState(false);
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
      setRecording(true);
      setDuration(0);
      setError(null);
    } catch (err) {
      setError("Could not access microphone. Please check permissions.");
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
      streamRef.current?.getTracks().forEach((track) => track.stop());
      setRecording(false);
    }
  }, []);

  const acceptRecording = useCallback(() => {
    if (recordedBlob) {
      const file = new File([recordedBlob], "recording.webm", {
        type: recordedBlob.type,
      });
      setAudioFile(file);
      setRecordedBlob(null);
      return file;
    }
    return null;
  }, [recordedBlob]);

  // Timer for recording
  useEffect(() => {
    let interval;
    if (recording) {
      interval = setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [recording]);

  // Clear audio
  const clearAudio = useCallback(() => {
    setAudioFile(null);
    setRecordedBlob(null);
    setError(null);
    setDuration(0);
  }, []);

  // Load demo audio
  const loadDemoAudio = useCallback(
    async (demoUrl = "https://www2.cs.uic.edu/~i101/SoundFiles/BabyElephantWalk60.wav") => {
      return loadFromUrl(demoUrl);
    },
    [loadFromUrl]
  );

  return {
    // State
    audioFile,
    audioUrl,
    setAudioUrl,
    recording,
    recordedBlob,
    duration,
    loading,
    error,

    // Actions
    handleFileSelect,
    loadFromUrl,
    startRecording,
    stopRecording,
    acceptRecording,
    clearAudio,
    loadDemoAudio,
  };
};
