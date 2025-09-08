import { useEffect } from "react";

import { AudioPlayer } from "../audio_player";
import { FolderIcon, LinkIcon, MicrophoneIcon, XIcon } from "../shared/Icons";
import { useObjectURLManager } from "../shared/useURLManager";

export const cModes = {
  SELECTOR: "selector",
  FILE: "file",
  URL: "url",
  RECORD: "record",
  PREVIEW: "preview",
};

export const AudioInput = ({
  audioInput,
  onAudioReady,
  showDemo = false,
  inputModes = ["file", "url", "record"],
}) => {
  useEffect(() => {
    if (audioInput.mode === cModes.PREVIEW && audioInput.audioFile) {
      onAudioReady?.(audioInput.audioFile);
    } else if (audioInput.mode === cModes.SELECTOR && !audioInput.audioFile) {
      onAudioReady?.(null);
    }
  }, [audioInput.audioFile, audioInput.mode, onAudioReady]);

  const handleFileChange = (e) => {
    audioInput.handleFileSelect(e.target.files[0]);
  };

  const handleUrlSubmit = async () => {
    await audioInput.loadFromUrl(audioInput.audioUrl);
  };

  const handleRecordingAccept = () => {
    audioInput.acceptRecording();
  };

  const handleDemoLoad = async () => {
    await audioInput.loadDemoAudio();
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="space-y-4">
      {audioInput.mode === cModes.SELECTOR ? (
        <AudioSourceSelector
          onInputModeSelect={audioInput.setMode}
          onLoadDemo={showDemo ? handleDemoLoad : null}
          onRemoveAudio={audioInput.clearAudio}
          inputModes={inputModes}
        />
      ) : (
        <div className="bg-slate-800/30 rounded-xl border border-slate-700/50 p-6 animate-fadeIn">
          {audioInput.mode === cModes.FILE && (
            <FileInputMode
              onClose={audioInput.closeMode}
              onChange={handleFileChange}
              errorMessage={audioInput.error}
            />
          )}

          {audioInput.mode === cModes.URL && (
            <UrlInputMode
              url={audioInput.audioUrl}
              setUrl={audioInput.setAudioUrl}
              onSubmit={handleUrlSubmit}
              onClose={audioInput.closeMode}
              loading={audioInput.loading}
              errorMessage={audioInput.error}
            />
          )}

          {audioInput.mode === cModes.RECORD && (
            <RecordingMode
              isRecording={audioInput.isRecording}
              recordedBlob={audioInput.recordedBlob}
              duration={audioInput.duration}
              formatDuration={formatDuration}
              onStart={audioInput.startRecording}
              onStop={audioInput.stopRecording}
              onAccept={handleRecordingAccept}
              onClose={audioInput.closeMode}
              errorMessage={audioInput.error}
            />
          )}

          {audioInput.mode === cModes.PREVIEW && audioInput.audioFile && (
            <AudioPreviewMode audioFile={audioInput.audioFile} onClose={audioInput.clearAudio} />
          )}
        </div>
      )}
    </div>
  );
};

// Source selector with tiles
export const AudioSourceSelector = ({
  onInputModeSelect,
  onLoadDemo,
  inputModes,
  title = "Reference Audio",
}) => {
  return (
    <div className="bg-slate-800/30 rounded-xl border border-slate-700/50 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">{title}</h3>
        {onLoadDemo && (
          <button
            onClick={onLoadDemo}
            className="text-xs px-3 py-1 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 rounded-lg transition-all"
          >
            Load Demo
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {inputModes.includes("file") && (
          <AudioTile
            icon={<FolderIcon />}
            title="Local File"
            description="Upload File"
            onClick={() => onInputModeSelect(cModes.FILE)}
            glowColor="from-blue-400 to-cyan-400"
          />
        )}

        {inputModes.includes("url") && (
          <AudioTile
            icon={<LinkIcon />}
            title="From URL"
            description="Load from web"
            onClick={() => onInputModeSelect(cModes.URL)}
            glowColor="from-purple-400 to-pink-400"
          />
        )}

        {inputModes.includes("record") && navigator.mediaDevices && (
          <AudioTile
            icon={<MicrophoneIcon />}
            title="Record"
            description="Use microphone"
            onClick={() => onInputModeSelect(cModes.RECORD)}
            glowColor="from-red-400 to-orange-400"
          />
        )}
      </div>
    </div>
  );
};

// Audio indicator with waveform
export const AudioIndicator = ({ audio, onClear }) => {
  return (
    <div className="mt-4 p-3 bg-slate-700/30 rounded-lg border border-slate-600/30">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <AudioWaveform />
          <span className="text-slate-300 text-sm">
            Audio ready: {audio.name || "Unnamed"} ({(audio.size / 1024).toFixed(2)} KB)
          </span>
        </div>
        {onClear && (
          <button onClick={onClear} className="text-slate-400 hover:text-red-400 transition-colors">
            <XIcon className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};

// Animated waveform
export const AudioWaveform = () => (
  <div className="flex items-center gap-1">
    {[...Array(5)].map((_, i) => (
      <div
        key={i}
        className="w-1 bg-green-400 rounded-full animate-pulse"
        style={{
          height: `${Math.random() * 20 + 10}px`,
          animationDelay: `${i * 0.1}s`,
        }}
      />
    ))}
  </div>
);

// Reusable tile component
export const AudioTile = ({ icon, title, description, onClick, glowColor }) => (
  <button
    onClick={onClick}
    className="group relative p-6 bg-slate-700/30 rounded-xl border border-slate-600/30 hover:border-purple-400/50 hover:bg-slate-700/50 transition-all transform hover:scale-105 overflow-hidden"
  >
    <div
      className={`absolute inset-0 bg-gradient-to-r ${glowColor} opacity-0 group-hover:opacity-10 transition-opacity`}
    />
    <div className="relative flex flex-col items-center space-y-3">
      <div
        className={`w-12 h-12 bg-gradient-to-r ${glowColor} rounded-full flex items-center justify-center group-hover:scale-110 transition-transform`}
      >
        {icon}
      </div>
      <div>
        <p className="font-medium text-white">{title}</p>
        <p className="text-sm text-slate-400">{description}</p>
      </div>
    </div>
  </button>
);

// Mode-specific components
export const FileInputMode = ({ onClose, onChange, errorMessage }) => (
  <div className="space-y-4">
    <ModeHeader title="Upload Audio File" onClose={onClose} />
    <div className="border-2 border-dashed border-slate-600/50 rounded-xl p-8 text-center hover:border-purple-400/50 transition-all">
      <input
        type="file"
        accept="audio/*"
        onChange={onChange}
        className="hidden"
        id="audio-file-input"
      />
      <label htmlFor="audio-file-input" className="cursor-pointer">
        <div className="w-16 h-16 mx-auto bg-gradient-to-r from-cyan-400 to-purple-400 rounded-full flex items-center justify-center mb-4 animate-pulse">
          <FolderIcon className="w-8 h-8 text-white" />
        </div>
        <p className="text-white font-medium">Click to select or drag & drop</p>
        <p className="text-sm text-slate-400 mt-2">Supports MP3, WAV, M4A, OGG, and more</p>
      </label>
    </div>
    {errorMessage && <ErrorMessageText message={errorMessage} />}
  </div>
);

export const UrlInputMode = ({ url, setUrl, onSubmit, onClose, loading, errorMessage }) => (
  <div className="space-y-4">
    <ModeHeader title="Load from URL" onClose={onClose} />
    <input
      type="url"
      value={url}
      onChange={(e) => setUrl(e.target.value)}
      placeholder="https://example.com/audio.mp3"
      className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-400/50"
      onKeyDown={(e) => e.key === "Enter" && onSubmit()}
    />
    <button
      onClick={onSubmit}
      disabled={!url.trim() || loading}
      className={`w-full py-3 rounded-xl font-semibold text-white transition-all ${
        url.trim() && !loading
          ? "bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600"
          : "bg-slate-600 cursor-not-allowed"
      }`}
    >
      {loading ? "Loading..." : "Load"}
    </button>
    {errorMessage && <ErrorMessageText message={errorMessage} />}
  </div>
);

export const RecordingMode = ({
  isRecording,
  recordedBlob,
  duration,
  formatDuration,
  onStart,
  onStop,
  onAccept,
  onClose,
  errorMessage,
}) => {
  return (
    <div className="space-y-4">
      <ModeHeader title="Record" onClose={onClose} />
      <div className="text-center space-y-4">
        {!isRecording && !recordedBlob && <RecordButton onClick={onStart} />}
        {isRecording && <RecordingIndicator duration={formatDuration(duration)} onStop={onStop} />}

        {recordedBlob && (
          <RecordingPreview blob={recordedBlob} onRerecord={onStart} onAccept={onAccept} />
        )}
      </div>
      {errorMessage && <ErrorMessageText message={errorMessage} />}
    </div>
  );
};

const AudioPreviewMode = ({ audioFile, onClose }) => {
  const { createBlobUrl, revokeBlobUrl } = useObjectURLManager();
  const audioUrl = createBlobUrl(audioFile);

  // useEffect(() => {
  //   return () => {
  //     revokeBlobUrl(audioUrl); // Clean up the blob URL when the component unmounts
  //   };
  // }, [audioUrl, revokeBlobUrl]);

  return (
    <div className="space-y-4">
      <ModeHeader title="Reference Audio" onClose={onClose} />
      <AudioPlayer audioUrl={audioUrl} /> {/* title={audioFile.name || "Preview"} /> */}
    </div>
  );
};

// Small utility components
export const ModeHeader = ({ title, onClose }) => (
  <div className="flex items-center justify-between mb-4">
    <h3 className="text-lg font-semibold text-white">{title}</h3>
    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
      <XIcon />
    </button>
  </div>
);

export const ErrorMessageText = ({ message }) => (
  <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
    <p className="text-red-400 text-sm">{message}</p>
  </div>
);

export const RecordButton = ({ onClick }) => (
  <button
    onClick={onClick}
    className="mx-auto w-20 h-20 bg-gradient-to-r from-red-500 to-pink-500 rounded-full flex items-center justify-center hover:from-red-600 hover:to-pink-600 transition-all transform hover:scale-110 shadow-lg"
  >
    <MicrophoneIcon className="w-10 h-10 text-white" />
  </button>
);

export const RecordingIndicator = ({ duration = 0, onStop }) => (
  <>
    <div className="flex items-center justify-center space-x-2">
      <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
      <span className="text-white font-medium">Recording... {duration}</span>
    </div>
    <button
      onClick={onStop}
      className="mx-auto w-20 h-20 bg-slate-700 rounded-full flex items-center justify-center hover:bg-slate-600 transition-all"
    >
      <div className="w-8 h-8 bg-white rounded"></div>
    </button>
  </>
);

export const RecordingPreview = ({ blob, onRerecord, onAccept }) => {
  const { createBlobUrl, revokeBlobUrl } = useObjectURLManager();
  const audioUrl = createBlobUrl(blob);

  // TODO: revokation?
  // useEffect(() => {
  //   return () => {
  //     revokeBlobUrl(audioUrl);
  //   };
  // }, [audioUrl, revokeBlobUrl]);

  return (
    <>
      <AudioPlayer audioUrl={audioUrl} title="Recording Preview" />
      <div className="flex gap-4">
        <button
          onClick={onRerecord}
          className="flex-1 py-3 bg-slate-700 rounded-xl font-semibold text-white hover:bg-slate-600 transition-all"
        >
          Re-record
        </button>
        <button
          onClick={onAccept}
          className="flex-1 py-3 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-xl font-semibold text-white hover:from-cyan-600 hover:to-purple-600 transition-all"
        >
          Use Recording
        </button>
      </div>
    </>
  );
};
