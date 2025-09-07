import "@testing-library/jest-dom";
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { AudioInputManager } from "../../src/audio_input";
import { useAudioInput } from "../../src/audio_input";

jest.mock("../../src/audio_input/hook", () => ({
  useAudioInput: jest.fn(),
}));

describe("AudioInputManager Component", () => {
  const mockOnAudioReady = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    useAudioInput.mockReturnValue({
      audioFile: null,
      audioUrl: "",
      error: null,
      loading: false,
      recording: false,
      recordedBlob: null,
      duration: 0,
      handleFileSelect: jest.fn(),
      loadFromUrl: jest.fn(),
      acceptRecording: jest.fn(),
      loadDemoAudio: jest.fn(),
      clearAudio: jest.fn(),
      setAudioUrl: jest.fn(),
      startRecording: jest.fn(),
      stopRecording: jest.fn(),
    });
  });

  test("renders correctly with default props", () => {
    render(<AudioInputManager onAudioReady={mockOnAudioReady} />);
    expect(screen.getByRole("heading", { name: /Audio Input/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Load Demo/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /From File/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /From URL/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Record/i })).toBeInTheDocument();
  });

  test("handles mode selection and renders mode-specific components", () => {
    render(<AudioInputManager onAudioReady={mockOnAudioReady} />);

    fireEvent.click(screen.getByRole("button", { name: /From File/i }));
    expect(screen.getByRole("heading", { name: /Upload Audio File/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /From URL/i }));
    expect(screen.getByRole("heading", { name: /Load from URL/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Record/i }));
    expect(screen.getByRole("heading", { name: /Record Audio/i })).toBeInTheDocument();
  });

  test("handles file selection", async () => {
    const mockFile = new File(["audio"], "test.mp3", { type: "audio/mp3" });
    useAudioInput.mockReturnValue({
      ...useAudioInput(),
      handleFileSelect: jest.fn(() => mockFile),
    });

    render(<AudioInputManager onAudioReady={mockOnAudioReady} />);
    fireEvent.click(screen.getByRole("button", { name: /From File/i }));

    const fileInput = screen.getByLabelText(/Click to select or drag & drop/i);
    fireEvent.change(fileInput, { target: { files: [mockFile] } });

    await waitFor(() => expect(mockOnAudioReady).toHaveBeenCalledWith(mockFile));
  });

  test("handles URL submission", async () => {
    const mockFile = new File(["audio"], "test.mp3", { type: "audio/mp3" });
    useAudioInput.mockReturnValue({
      ...useAudioInput(),
      loadFromUrl: jest.fn(() => Promise.resolve(mockFile)),
    });

    render(<AudioInputManager onAudioReady={mockOnAudioReady} />);
    fireEvent.click(screen.getByRole("button", { name: /From URL/i }));

    const urlInput = screen.getByPlaceholderText(/https:\/\/example\.com\/audio\.mp3/i);
    fireEvent.change(urlInput, { target: { value: "https://example.com/test.mp3" } });
    fireEvent.keyDown(urlInput, { key: "Enter", code: "Enter" });

    await waitFor(() => expect(mockOnAudioReady).toHaveBeenCalledWith(mockFile));
  });

  test("handles recording acceptance", async () => {
    const mockFile = new File(["audio"], "test.mp3", { type: "audio/mp3" });
    useAudioInput.mockReturnValue({
      ...useAudioInput(),
      acceptRecording: jest.fn(() => mockFile),
    });

    render(<AudioInputManager onAudioReady={mockOnAudioReady} />);
    fireEvent.click(screen.getByRole("button", { name: /Record/i }));

    const acceptButton = screen.getByRole("button", { name: /Use Recording/i });
    fireEvent.click(acceptButton);

    await waitFor(() => expect(mockOnAudioReady).toHaveBeenCalledWith(mockFile));
  });

  test("handles demo audio loading", async () => {
    const mockFile = new File(["audio"], "demo.mp3", { type: "audio/mp3" });
    useAudioInput.mockReturnValue({
      ...useAudioInput(),
      loadDemoAudio: jest.fn(() => Promise.resolve(mockFile)),
    });

    render(<AudioInputManager onAudioReady={mockOnAudioReady} showDemo />);
    fireEvent.click(screen.getByRole("button", { name: /Load Demo/i }));

    await waitFor(() => expect(mockOnAudioReady).toHaveBeenCalledWith(mockFile));
  });
});

describe("useAudioInput Hook", () => {
  test("handles file selection", () => {
    const mockFile = new File(["audio"], "test.mp3", { type: "audio/mp3" });
    const { handleFileSelect } = useAudioInput();
    handleFileSelect(mockFile);
    expect(handleFileSelect).toHaveBeenCalledWith(mockFile);
  });

  test("handles URL loading", async () => {
    const mockFile = new File(["audio"], "test.mp3", { type: "audio/mp3" });
    const { loadFromUrl } = useAudioInput();
    await loadFromUrl("https://example.com/test.mp3");
    expect(loadFromUrl).toHaveBeenCalledWith("https://example.com/test.mp3");
  });

  test("handles recording", () => {
    const { startRecording, stopRecording, acceptRecording } = useAudioInput();
    startRecording();
    expect(startRecording).toHaveBeenCalled();

    stopRecording();
    expect(stopRecording).toHaveBeenCalled();

    acceptRecording();
    expect(acceptRecording).toHaveBeenCalled();
  });

  test("handles clearing audio", () => {
    const { clearAudio } = useAudioInput();
    clearAudio();
    expect(clearAudio).toHaveBeenCalled();
  });
});
