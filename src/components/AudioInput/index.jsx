import { useAudioInput } from "hooks/useAudioInput";
import React, { useState } from "react";

import { AudioSourceSelector, FileInputMode, RecordingMode, UrlInputMode } from "./components";

export const AudioInputManager = ({
  onAudioReady,
  currentAudio,
  showDemo = true,
  allowedModes = ["file", "url", "record"],
}) => {
  const [activeMode, setActiveMode] = useState(null);
  const audioInput = useAudioInput();

  // Handle successful audio load
  const handleAudioReady = (file) => {
    if (file && onAudioReady) {
      onAudioReady(file);
      setActiveMode(null);
    }
  };

  // Handle file selection
  const handleFileChange = (e) => {
    const file = audioInput.handleFileSelect(e.target.files[0]);
    if (file) handleAudioReady(file);
  };

  // Handle URL submission
  const handleUrlSubmit = async () => {
    const file = await audioInput.loadFromUrl(audioInput.audioUrl);
    if (file) {
      handleAudioReady(file);
      audioInput.setAudioUrl("");
    }
  };

  // Handle recording acceptance
  const handleRecordingAccept = () => {
    const file = audioInput.acceptRecording();
    if (file) handleAudioReady(file);
  };

  // Handle demo audio
  const handleDemoLoad = async () => {
    const file = await audioInput.loadDemoAudio();
    if (file) handleAudioReady(file);
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="space-y-4">
      {!activeMode ? (
        <AudioSourceSelector
          currentAudio={currentAudio || audioInput.audioFile}
          onModeSelect={setActiveMode}
          onDemoLoad={showDemo ? handleDemoLoad : null}
          onClearAudio={() => {
            audioInput.clearAudio();
            if (onAudioReady) onAudioReady(null);
          }}
          allowedModes={allowedModes}
        />
      ) : (
        <div className="bg-slate-800/30 rounded-xl border border-slate-700/50 p-6 animate-fadeIn">
          {activeMode === "file" && (
            <FileInputMode
              onClose={() => setActiveMode(null)}
              onChange={handleFileChange}
              error={audioInput.error}
            />
          )}

          {activeMode === "url" && (
            <UrlInputMode
              url={audioInput.audioUrl}
              setUrl={audioInput.setAudioUrl}
              onSubmit={handleUrlSubmit}
              onClose={() => setActiveMode(null)}
              loading={audioInput.loading}
              error={audioInput.error}
            />
          )}

          {activeMode === "record" && (
            <RecordingMode
              recording={audioInput.recording}
              recordedBlob={audioInput.recordedBlob}
              duration={audioInput.duration}
              formatDuration={formatDuration}
              onStart={audioInput.startRecording}
              onStop={audioInput.stopRecording}
              onAccept={handleRecordingAccept}
              onClose={() => {
                audioInput.stopRecording();
                setActiveMode(null);
              }}
              error={audioInput.error}
            />
          )}
        </div>
      )}
    </div>
  );
};
