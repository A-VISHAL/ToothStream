import React, { useRef, useState } from 'react';
import './App.css';

const TARGET_SAMPLE_RATE = 16000;

function downsampleBuffer(buffer, inputSampleRate, outputSampleRate) {
  if (outputSampleRate === inputSampleRate) {
    return buffer;
  }

  if (outputSampleRate > inputSampleRate) {
    throw new Error('Output sample rate must be lower than input sample rate');
  }

  const sampleRateRatio = inputSampleRate / outputSampleRate;
  const newLength = Math.round(buffer.length / sampleRateRatio);
  const result = new Float32Array(newLength);

  let offsetBuffer = 0;
  let offsetResult = 0;

  while (offsetResult < result.length) {
    const nextOffsetBuffer = Math.round((offsetResult + 1) * sampleRateRatio);
    let total = 0;
    let count = 0;

    for (let index = offsetBuffer; index < nextOffsetBuffer && index < buffer.length; index += 1) {
      total += buffer[index];
      count += 1;
    }

    result[offsetResult] = count > 0 ? total / count : 0;
    offsetResult += 1;
    offsetBuffer = nextOffsetBuffer;
  }

  return result;
}

function floatTo16BitPCM(buffer) {
  const output = new ArrayBuffer(buffer.length * 2);
  const view = new DataView(output);

  for (let index = 0; index < buffer.length; index += 1) {
    const sample = Math.max(-1, Math.min(1, buffer[index]));
    view.setInt16(index * 2, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
  }

  return output;
}

function App() {
  const [isRecording, setIsRecording] = useState(false);
  const [finalTranscript, setFinalTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [connectionStatus, setConnectionStatus] = useState('Disconnected');

  const socketRef = useRef(null);
  const audioContextRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const sourceNodeRef = useRef(null);
  const processorNodeRef = useRef(null);

  const cleanupAudioPipeline = async () => {
    if (processorNodeRef.current) {
      processorNodeRef.current.disconnect();
      processorNodeRef.current = null;
    }

    if (sourceNodeRef.current) {
      sourceNodeRef.current.disconnect();
      sourceNodeRef.current = null;
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }

    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      await audioContextRef.current.close();
    }

    audioContextRef.current = null;
  };

  const startRecording = async () => {
    try {
      setConnectionStatus('Connecting');
      setFinalTranscript('');
      setInterimTranscript('');

      const websocketUrl = process.env.REACT_APP_WEBSOCKET_URL || 'ws://localhost:8011/ws';
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      const audioContext = new AudioContextClass();
      const sourceNode = audioContext.createMediaStreamSource(stream);
      const processorNode = audioContext.createScriptProcessor(4096, 1, 1);

      mediaStreamRef.current = stream;
      audioContextRef.current = audioContext;
      sourceNodeRef.current = sourceNode;
      processorNodeRef.current = processorNode;

      socketRef.current = new WebSocket(websocketUrl);
      socketRef.current.binaryType = 'arraybuffer';

      socketRef.current.onopen = () => {
        setConnectionStatus('Connected');
        setIsRecording(true);
      };

      socketRef.current.onmessage = (event) => {
        let payload;

        try {
          payload = JSON.parse(event.data);
        } catch (error) {
          payload = { type: 'transcript', transcript: event.data };
        }

        if (payload.type === 'error') {
          console.error('Backend error:', payload.message);
          setConnectionStatus('Error');
          return;
        }

        const transcript = (payload.transcript || '').trim();
        if (!transcript) {
          return;
        }

        if (payload.is_final || payload.speech_final) {
          setFinalTranscript((previous) => (previous ? `${previous} ${transcript}` : transcript));
          setInterimTranscript('');
        } else {
          setInterimTranscript(transcript);
        }
      };

      socketRef.current.onclose = (event) => {
        console.log('WebSocket closed:', event);
        setConnectionStatus('Disconnected');
        setIsRecording(false);
        cleanupAudioPipeline();
      };

      socketRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        setConnectionStatus('Error');
        setIsRecording(false);
      };

      processorNode.onaudioprocess = (event) => {
        if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
          return;
        }

        const inputBuffer = event.inputBuffer.getChannelData(0);
        const downsampledBuffer = downsampleBuffer(
          inputBuffer,
          audioContext.sampleRate,
          TARGET_SAMPLE_RATE
        );
        const pcm16 = floatTo16BitPCM(downsampledBuffer);
        socketRef.current.send(pcm16);
      };

      sourceNode.connect(processorNode);
      processorNode.connect(audioContext.destination);
    } catch (error) {
      console.error('Error starting recording:', error);
      setConnectionStatus('Error');
      setIsRecording(false);
      await cleanupAudioPipeline();
    }
  };

  const stopRecording = async () => {
    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
    }

    setIsRecording(false);
    setConnectionStatus('Disconnected');
    await cleanupAudioPipeline();
  };

  return (
    <div className="App">
      <h1>Perio Voice AI</h1>
      <p className={`status status-${connectionStatus.toLowerCase()}`}>
        Connection Status: {connectionStatus}
      </p>
      <div>
        <button className="btn" onClick={startRecording} disabled={isRecording}>
          Start Recording
        </button>
        <button className="btn" onClick={stopRecording} disabled={!isRecording}>
          Stop Recording
        </button>
      </div>
      <div className="transcript-panel">
        <p>{finalTranscript}</p>
        {interimTranscript ? <p>{interimTranscript}</p> : null}
      </div>
    </div>
  );
}

export default App;
