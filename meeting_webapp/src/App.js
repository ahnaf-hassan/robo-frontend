import React, { useState, useRef } from "react";

const AudioRecorder = () => {
  const [recording, setRecording] = useState(false);
  const [audioURL, setAudioURL] = useState(null);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [micEnabled, setMicEnabled] = useState(false);

  const mediaRecorderRef = useRef(null);
  const audioStreamRef = useRef(null);
  const audioChunksRef = useRef([]);

  const mergeAudioStreams = (desktopStream, micStream) => {
    const audioContext = new AudioContext();
    const destination = audioContext.createMediaStreamDestination();

    if (desktopStream && desktopStream.getAudioTracks().length > 0) {
      const desktopSource = audioContext.createMediaStreamSource(desktopStream);
      desktopSource.connect(destination);
    }

    if (micStream && micStream.getAudioTracks().length > 0) {
      const micSource = audioContext.createMediaStreamSource(micStream);
      micSource.connect(destination);
    }

    return destination.stream.getAudioTracks();
  };

  const startCapture = async () => {
    try {
      const desktopStream = audioEnabled
        ? await navigator.mediaDevices.getDisplayMedia({ audio: true })
        : null;

      const micStream = micEnabled
        ? await navigator.mediaDevices.getUserMedia({ audio: true })
        : null;

      const audioTracks = mergeAudioStreams(desktopStream, micStream);
      audioStreamRef.current = new MediaStream(audioTracks);

      mediaRecorderRef.current = new MediaRecorder(audioStreamRef.current, {
        mimeType: "audio/webm",
      });

      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const audioURL = URL.createObjectURL(audioBlob);
        setAudioURL(audioURL);
      };

      mediaRecorderRef.current.start();
      setRecording(true);
    } catch (error) {
      console.error("Error capturing audio:", error);
    }
  };

  const stopCapture = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
    }

    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach((track) => track.stop());
    }

    setRecording(false);
  };

  const sendAudioToBackend = async (blob) => {
    const formData = new FormData();
    formData.append("audioFile", blob, "recording.webm");
  
    try {
      const response = await fetch("http://127.0.0.1:8000/upload-audio", {
        method: "POST",
        body: formData,
      });
  
      if (response.ok) {
        console.log("Audio file successfully uploaded");
      } else {
        console.error("Failed to upload audio file");
      }
    } catch (error) {
      console.error("Error uploading audio file:", error);
    }
  };
  
  const saveAudio = () => {
    const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
    sendAudioToBackend(audioBlob);
  };
  

  return (
    <div>
      <h1>Audio Recorder</h1>
      <div>
        <label>
          <input
            type="checkbox"
            checked={audioEnabled}
            onChange={(e) => setAudioEnabled(e.target.checked)}
          />
          Enable System Audio
        </label>
        <label>
          <input
            type="checkbox"
            checked={micEnabled}
            onChange={(e) => setMicEnabled(e.target.checked)}
          />
          Enable Microphone Audio
        </label>
      </div>
      <button onClick={recording ? stopCapture : startCapture}>
        {recording ? "Stop Recording" : "Start Recording"}
      </button>
      {audioURL && (
        <div>
          <h2>Recorded Audio:</h2>
          <audio controls src={audioURL}></audio>
          <a href={audioURL} download="recording.webm">Download Recording</a>
          <button onClick={saveAudio}>Save</button>
        </div>
      )}
    </div>
  );
};

export default AudioRecorder;
