import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { LiveTranscriptState, PerioPayload, TranscriptEntry } from '../types';

const TARGET_SAMPLE_RATE = 16000;
const DEFAULT_TRANSCRIPTION_SOCKET_URL = process.env.REACT_APP_TRANSCRIPTION_SOCKET_URL || 'ws://localhost:8000/ws/audio';
const WORKLET_URL = '/audio-recorder-worklet.js';
const WORKLET_NAME = 'audio-chunk-processor';
const MAX_PENDING_CHUNKS = 120;

type TranscriptMessage = {
  type?: string;
  transcript?: string;
  is_final?: boolean;
  speech_final?: boolean;
  message?: string;
  state?: string;
  details?: string;
};

type ClinicalMessage = TranscriptMessage & PerioPayload;

type ResampleState = {
  buffer: Float32Array;
  position: number;
};

function createAudioContext(): AudioContext {
  const AudioContextConstructor = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

  if (!AudioContextConstructor) {
    throw new Error('AudioContext is not supported in this browser.');
  }

  try {
    return new AudioContextConstructor({ sampleRate: TARGET_SAMPLE_RATE });
  } catch {
    return new AudioContextConstructor();
  }
}

function createOfflineAudioContext(frameCount: number): OfflineAudioContext | null {
  const OfflineAudioContextConstructor =
    window.OfflineAudioContext || (window as Window & { webkitOfflineAudioContext?: typeof OfflineAudioContext }).webkitOfflineAudioContext;

  if (!OfflineAudioContextConstructor) {
    return null;
  }

  try {
    return new OfflineAudioContextConstructor(1, Math.max(1, frameCount), TARGET_SAMPLE_RATE);
  } catch {
    return null;
  }
}

function resampleBuffer(input: Float32Array, inputSampleRate: number, outputSampleRate: number, state: ResampleState): Float32Array {
  if (inputSampleRate === outputSampleRate) {
    return input;
  }

  if (inputSampleRate < outputSampleRate) {
    throw new Error('The input sample rate must be greater than or equal to the output sample rate.');
  }

  const combined = new Float32Array(state.buffer.length + input.length);
  combined.set(state.buffer, 0);
  combined.set(input, state.buffer.length);

  const ratio = inputSampleRate / outputSampleRate;
  const output: number[] = [];
  let position = state.position;

  while (position < combined.length - 1) {
    const index = Math.floor(position);
    const fraction = position - index;
    const current = combined[index] ?? 0;
    const next = combined[index + 1] ?? current;
    output.push(current + (next - current) * fraction);
    position += ratio;
  }

  const consumed = Math.floor(position);
  state.buffer = combined.slice(consumed);
  state.position = position - consumed;

  return Float32Array.from(output);
}

function floatTo16BitPCM(buffer: Float32Array): ArrayBuffer {
  const output = new Int16Array(buffer.length);

  for (let index = 0; index < buffer.length; index += 1) {
    const sample = Math.max(-1, Math.min(1, buffer[index] ?? 0));
    output[index] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
  }

  return output.buffer;
}

async function resampleToTargetRate(input: Float32Array, inputSampleRate: number): Promise<Float32Array> {
  if (inputSampleRate === TARGET_SAMPLE_RATE) {
    return input;
  }

  const estimatedFrameCount = Math.max(1, Math.ceil((input.length * TARGET_SAMPLE_RATE) / inputSampleRate));
  const offlineContext = createOfflineAudioContext(estimatedFrameCount);

  if (!offlineContext) {
    return input;
  }

  const sourceBuffer = offlineContext.createBuffer(1, input.length, inputSampleRate);
  sourceBuffer.copyToChannel(input, 0);

  const source = offlineContext.createBufferSource();
  source.buffer = sourceBuffer;
  source.connect(offlineContext.destination);
  source.start(0);

  const rendered = await offlineContext.startRendering();
  return rendered.getChannelData(0).slice();
}

export function useDeepgramTranscription() {
  const [connectionState, setConnectionState] = useState<LiveTranscriptState>('disconnected');
  const [isRecording, setIsRecording] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [segments, setSegments] = useState<TranscriptEntry[]>([]);
  const [clinicalEvents, setClinicalEvents] = useState<PerioPayload[]>([]);
  const [error, setError] = useState<string | null>(null);

  const socketRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const workletRef = useRef<AudioWorkletNode | null>(null);
  const silentGainRef = useRef<GainNode | null>(null);
  const reconnectTimerRef = useRef<number | null>(null);
  const shouldReconnectRef = useRef(false);
  const isStoppingRef = useRef(false);
  const pendingChunksRef = useRef<ArrayBuffer[]>([]);
  const lastFinalTranscriptRef = useRef('');
  const resampleStateRef = useRef<ResampleState>({ buffer: new Float32Array(0), position: 0 });
  const audioChunkCountRef = useRef(0);
  const chunkProcessingRef = useRef(Promise.resolve());

  const clearReconnectTimer = useCallback(() => {
    if (reconnectTimerRef.current !== null) {
      window.clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
  }, []);

  const flushPendingChunks = useCallback(() => {
    const socket = socketRef.current;

    if (!socket || socket.readyState !== WebSocket.OPEN || pendingChunksRef.current.length === 0) {
      return;
    }

    for (const chunk of pendingChunksRef.current) {
      socket.send(chunk);
    }

    pendingChunksRef.current = [];
  }, []);

  const processAudioChunk = useCallback(
    (input: Float32Array, inputSampleRate: number) => {
      chunkProcessingRef.current = chunkProcessingRef.current
        .then(async () => {
          const downsampled = await resampleToTargetRate(input, inputSampleRate);
          const pcmChunk = floatTo16BitPCM(downsampled);
          const socket = socketRef.current;

          audioChunkCountRef.current += 1;
          const shouldLogChunk = audioChunkCountRef.current <= 5 || audioChunkCountRef.current % 25 === 0;

          if (shouldLogChunk) {
            console.info('[STT] PCM chunk ready:', {
              chunk: audioChunkCountRef.current,
              inputSampleRate,
              outputSampleRate: TARGET_SAMPLE_RATE,
              inputSamples: input.length,
              outputBytes: pcmChunk.byteLength,
            });
          }

          if (socket && socket.readyState === WebSocket.OPEN) {
            if (shouldLogChunk) {
              console.info('[STT] Sending audio chunk:', {
                chunk: audioChunkCountRef.current,
                outputBytes: pcmChunk.byteLength,
              });
            }

            socket.send(pcmChunk);
            setConnectionState('listening');
            return;
          }

          if (shouldLogChunk) {
            console.info('[STT] Buffering audio chunk until socket opens:', {
              chunk: audioChunkCountRef.current,
              outputBytes: pcmChunk.byteLength,
              socketState: socket ? socket.readyState : 'none',
            });
          }

          pendingChunksRef.current.push(pcmChunk);

          if (pendingChunksRef.current.length > MAX_PENDING_CHUNKS) {
            pendingChunksRef.current.shift();
          }
        })
        .catch((chunkError) => {
          console.error('[STT] Audio chunk processing failed:', chunkError);
          setConnectionState('error');
          setError(chunkError instanceof Error ? chunkError.message : 'Failed to encode microphone audio.');
        });
    },
    []
  );

  const pushSegment = useCallback((text: string) => {
    const transcript = text.trim();

    if (!transcript || transcript === lastFinalTranscriptRef.current) {
      return;
    }

    lastFinalTranscriptRef.current = transcript;
    setSegments((previous) =>
      [
        {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          text: transcript,
          timestamp: Date.now(),
          source: 'deepgram' as const,
          isFinal: true,
        },
        ...previous,
      ].slice(0, 12)
    );
  }, []);

  const connectSocket = useCallback(() => {
    clearReconnectTimer();

    if (socketRef.current && socketRef.current.readyState !== WebSocket.CLOSED) {
      return;
    }

    try {
      const socket = new WebSocket(DEFAULT_TRANSCRIPTION_SOCKET_URL);
      socket.binaryType = 'arraybuffer';
      socketRef.current = socket;
      setConnectionState('connecting');
      console.info('[STT] Opening transcription socket:', DEFAULT_TRANSCRIPTION_SOCKET_URL);

      socket.onopen = () => {
        if (isStoppingRef.current) {
          return;
        }

        console.info('[STT] Transcription socket connected.');
        setError(null);
        setConnectionState('connected');
        flushPendingChunks();
      };

      socket.onmessage = (event) => {
        if (typeof event.data !== 'string') {
          return;
        }

        let payload: TranscriptMessage;

        try {
          payload = JSON.parse(event.data) as TranscriptMessage;
        } catch {
          payload = { type: 'transcript', transcript: event.data };
        }

        if (payload.type === 'status') {
          if (payload.state === 'connected') {
            setConnectionState('connected');
          }

          if (payload.state === 'reconnecting') {
            setConnectionState('reconnecting');
          }

          return;
        }

        if (payload.type === 'error') {
          const errorMessage = payload.details
            ? `${payload.message || 'Deepgram transcription error.'} ${payload.details}`
            : payload.message || 'Deepgram transcription error.';

          console.error('[STT] Backend error:', errorMessage);
          setError(errorMessage);
          setConnectionState(payload.message?.includes('Reconnecting') ? 'reconnecting' : 'error');
          return;
        }

        if (payload.type === 'clinical') {
          console.info('[STT] Clinical chart payload received:', payload);
          setClinicalEvents((previous) => [...previous, payload as ClinicalMessage].slice(-40));
          return;
        }

        if (payload.is_final || payload.speech_final) {
          console.info('[STT] Final transcript received:', payload.transcript || '');
          pushSegment(payload.transcript || '');
          setInterimTranscript('');
          return;
        }

        console.info('[STT] Interim transcript received:', payload.transcript || '');
        setInterimTranscript(payload.transcript || '');
      };

      socket.onerror = (event) => {
        if (isStoppingRef.current) {
          return;
        }

        console.error('[STT] Transcription socket error:', event);
        setConnectionState('error');
        setError('Unable to connect to the transcription WebSocket.');
      };

      socket.onclose = (event) => {
        console.warn('[STT] Transcription socket closed:', {
          code: event.code,
          reason: event.reason,
          wasClean: event.wasClean,
        });
        socketRef.current = null;

        if (isStoppingRef.current) {
          setConnectionState('disconnected');
          return;
        }

        setConnectionState(shouldReconnectRef.current ? 'reconnecting' : 'disconnected');

        if (shouldReconnectRef.current) {
          reconnectTimerRef.current = window.setTimeout(() => {
            reconnectTimerRef.current = null;

            if (shouldReconnectRef.current && !isStoppingRef.current) {
              connectSocket();
            }
          }, 1000);
        }
      };
    } catch (socketError) {
      console.error('[STT] Failed to open transcription socket:', socketError);
      setConnectionState('error');
      setError(socketError instanceof Error ? socketError.message : 'Failed to open the transcription WebSocket.');
    }
  }, [clearReconnectTimer, flushPendingChunks, pushSegment]);

  const cleanupAudioGraph = useCallback(() => {
    if (workletRef.current) {
      workletRef.current.disconnect();
      workletRef.current.port.onmessage = null;
      workletRef.current = null;
    }

    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }

    if (silentGainRef.current) {
      silentGainRef.current.disconnect();
      silentGainRef.current = null;
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }

    if (audioContextRef.current) {
      void audioContextRef.current.close();
      audioContextRef.current = null;
    }
  }, []);

  const stopRecording = useCallback(async () => {
    shouldReconnectRef.current = false;
    isStoppingRef.current = true;
    clearReconnectTimer();

    const socket = socketRef.current;
    socketRef.current = null;

    if (socket) {
      socket.onopen = null;
      socket.onmessage = null;
      socket.onerror = null;
      socket.onclose = null;

      if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) {
        socket.close();
      }
    }

    cleanupAudioGraph();

    pendingChunksRef.current = [];
    lastFinalTranscriptRef.current = '';
    setClinicalEvents([]);
    resampleStateRef.current = { buffer: new Float32Array(0), position: 0 };
    setInterimTranscript('');
    setIsRecording(false);
    setConnectionState('disconnected');

    window.setTimeout(() => {
      isStoppingRef.current = false;
    }, 0);
  }, [clearReconnectTimer, cleanupAudioGraph]);

  const startRecording = useCallback(async () => {
    if (isRecording) {
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setConnectionState('error');
      setError('This browser does not support microphone capture.');
      return;
    }

    shouldReconnectRef.current = true;
    isStoppingRef.current = false;
    setError(null);
    setSegments([]);
    setInterimTranscript('');
    lastFinalTranscriptRef.current = '';
    pendingChunksRef.current = [];
    setClinicalEvents([]);
    resampleStateRef.current = { buffer: new Float32Array(0), position: 0 };
    audioChunkCountRef.current = 0;
    chunkProcessingRef.current = Promise.resolve();
    setConnectionState('connecting');
    console.info('[STT] Requesting microphone access.');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      mediaStreamRef.current = stream;
      console.info('[STT] Microphone stream started.');

      const audioContext = createAudioContext();
      audioContextRef.current = audioContext;
      await audioContext.resume();
      console.info('[STT] AudioContext resumed at sample rate:', audioContext.sampleRate);

      await audioContext.audioWorklet.addModule(WORKLET_URL);
      console.info('[STT] Audio worklet loaded:', WORKLET_URL);

      const source = audioContext.createMediaStreamSource(stream);
      const worklet = new AudioWorkletNode(audioContext, WORKLET_NAME);
      const silentGain = audioContext.createGain();

      silentGain.gain.value = 0;

      worklet.port.onmessage = (event: MessageEvent) => {
        const rawData = event.data as Float32Array | ArrayBuffer;
        const input = rawData instanceof Float32Array ? rawData : new Float32Array(rawData);
        void processAudioChunk(input, audioContext.sampleRate);
      };

      source.connect(worklet);
      worklet.connect(silentGain);
      silentGain.connect(audioContext.destination);
      console.info('[STT] Audio graph connected.');

      sourceRef.current = source;
      workletRef.current = worklet;
      silentGainRef.current = silentGain;

      connectSocket();
      setIsRecording(true);
    } catch (captureError) {
      console.error('[STT] Microphone capture setup failed:', captureError);
      await stopRecording();
      setConnectionState('error');
      setError(captureError instanceof Error ? captureError.message : 'Unable to access the microphone.');
    }
  }, [connectSocket, isRecording, stopRecording]);

  useEffect(() => {
    return () => {
      void stopRecording();
    };
  }, [stopRecording]);

  return useMemo(
    () => ({
      connectionState,
      error,
      clinicalEvents,
      interimTranscript,
      isRecording,
      segments,
      socketUrl: DEFAULT_TRANSCRIPTION_SOCKET_URL,
      startRecording,
      stopRecording,
    }),
    [clinicalEvents, connectionState, error, interimTranscript, isRecording, segments, startRecording, stopRecording]
  );
}
