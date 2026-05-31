import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { TranscriptEntry, LiveTranscriptState } from '../types';

const TARGET_SAMPLE_RATE = 16000;

function resolveWsUrl(): string {
  const url =
    process.env.REACT_APP_WS_URL ||
    process.env.REACT_APP_TRANSCRIPTION_SOCKET_URL ||
    'ws://localhost:8000/ws/audio';

  console.info('WS_URL_SELECTED', {
    url,
    source: process.env.REACT_APP_WS_URL
      ? 'REACT_APP_WS_URL'
      : process.env.REACT_APP_TRANSCRIPTION_SOCKET_URL
        ? 'REACT_APP_TRANSCRIPTION_SOCKET_URL'
        : 'fallback_localhost',
  });

  return url;
}

const DEFAULT_TRANSCRIPTION_SOCKET_URL = resolveWsUrl();
const WORKLET_URL = '/audio-recorder-worklet.js';
const WORKLET_NAME = 'audio-chunk-processor';
const MAX_PENDING_CHUNKS = 120;
const MAX_RECENT_CHUNKS = 120;

type TranscriptMessage = {
  type?: string;
  transcript?: string;
  is_final?: boolean;
  speech_final?: boolean;
  message?: string;
  state?: string;
  phase?: string;
  detail?: string;
  fatal?: boolean;
  retryInMs?: number | null;
};

type ResampleState = {
  buffer: Float32Array;
  position: number;
};

function createAudioContext(): AudioContext {
  const AudioContextConstructor = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

  if (!AudioContextConstructor) {
    throw new Error('AudioContext is not supported in this browser.');
  }

  return new AudioContextConstructor();
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

export function useDeepgramTranscription() {
  const [connectionState, setConnectionState] = useState<LiveTranscriptState>('disconnected');
  const [isRecording, setIsRecording] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [segments, setSegments] = useState<TranscriptEntry[]>([]);
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
  const recentChunksRef = useRef<ArrayBuffer[]>([]);
  const lastFinalTranscriptRef = useRef('');
  const resampleStateRef = useRef<ResampleState>({ buffer: new Float32Array(0), position: 0 });
  const chunkCountRef = useRef(0);
  const sendCountRef = useRef(0);
  const firstChunkSentAtRef = useRef<number | null>(null);
  const firstPartialAtRef = useRef<number | null>(null);

  const log = useCallback((level: 'info' | 'warn' | 'error' | 'debug', ...args: unknown[]) => {
    const logger = console[level] ?? console.log;
    logger('[Deepgram STT]', ...args);
  }, []);

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

  const getRecentAudioChunks = useCallback((maxChunks = MAX_RECENT_CHUNKS) => {
    const boundedMaxChunks = Math.max(0, Math.trunc(maxChunks));

    if (boundedMaxChunks === 0) {
      return [];
    }

    return recentChunksRef.current.slice(-boundedMaxChunks);
  }, []);

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
      log('debug', 'Skipping socket connect because an existing socket is still active.', socketRef.current.readyState);
      return;
    }

    try {
      log('info', 'Opening WebSocket', DEFAULT_TRANSCRIPTION_SOCKET_URL);
      const socket = new WebSocket(DEFAULT_TRANSCRIPTION_SOCKET_URL);
      socket.binaryType = 'arraybuffer';
      socketRef.current = socket;
      setConnectionState('connecting');

      socket.onopen = () => {
        if (isStoppingRef.current) {
          return;
        }

        log('info', 'WS open');
        setError(null);
        setConnectionState('connected');
        flushPendingChunks();
      };

      socket.onmessage = (event) => {
        if (typeof event.data !== 'string') {
          return;
        }

        const wsReceivedAt = Date.now();
        console.info('WS_AUDIO_RECEIVED', {
          ts: wsReceivedAt,
          latencyBrowserToBackend: firstChunkSentAtRef.current !== null
            ? wsReceivedAt - firstChunkSentAtRef.current
            : null,
        });

        if (firstChunkSentAtRef.current !== null) {
          console.info('LATENCY_BROWSER_TO_BACKEND', {
            ms: wsReceivedAt - firstChunkSentAtRef.current,
          });
        }

        let payload: TranscriptMessage;

        try {
          payload = JSON.parse(event.data) as TranscriptMessage;
        } catch {
          payload = { type: 'transcript', transcript: event.data };
        }

        if (payload.type === 'status') {
          if (payload.state === 'connected') {
            log('info', 'Backend status: connected', payload.phase || '', payload.detail || '');
            setConnectionState('connected');
            if (payload.detail) {
              setError(null);
            }
          }

          if (payload.state === 'reconnecting') {
            log('warn', 'Backend status: reconnecting', payload.phase || '', payload.detail || '', payload.retryInMs ?? '');
            setConnectionState('reconnecting');
            setError(payload.detail ? `${payload.phase ?? 'Backend'}: ${payload.detail}` : 'Speech-to-text stream interrupted.');
          }

          return;
        }

        if (payload.type === 'error') {
          log('error', 'Backend error payload', payload.phase || '', payload.detail || payload.message || '');
          if (payload.fatal) {
            shouldReconnectRef.current = false;
          }

          setError(
            [payload.message, payload.detail].filter(Boolean).join(' - ') || 'Deepgram transcription error.'
          );
          setConnectionState('error');
          return;
        }

        if (payload.is_final || payload.speech_final) {
          const finalAt = Date.now();
          console.info('DEEPGRAM_FINAL', {
            transcript: payload.transcript || '',
            ts: finalAt,
          });
          if (firstPartialAtRef.current !== null) {
            console.info('LATENCY_DEEPGRAM', {
              ms: finalAt - firstPartialAtRef.current,
              firstPartialAt: firstPartialAtRef.current,
              finalAt,
            });
            firstPartialAtRef.current = null;
          }
          log('info', 'Final transcript received', payload.transcript || '');
          pushSegment(payload.transcript || '');
          setInterimTranscript('');
          return;
        }

        if (payload.transcript) {
          if (firstPartialAtRef.current === null) {
            firstPartialAtRef.current = Date.now();
            console.info('DEEPGRAM_FIRST_PARTIAL', {
              transcript: payload.transcript,
              ts: firstPartialAtRef.current,
            });
          }
          log('debug', 'Interim transcript received', payload.transcript);
        }
        setInterimTranscript(payload.transcript || '');
      };

      socket.onerror = () => {
        if (isStoppingRef.current) {
          return;
        }

        log('error', 'WS error');
        setConnectionState('error');
        setError('Unable to connect to the transcription WebSocket.');
      };

      socket.onclose = (event) => {
        log('warn', 'WS close', { code: event.code, reason: event.reason, wasClean: event.wasClean });
        socketRef.current = null;

        if (isStoppingRef.current) {
          setConnectionState('disconnected');
          return;
        }

        setConnectionState(shouldReconnectRef.current ? 'reconnecting' : 'disconnected');

        if (shouldReconnectRef.current) {
          log('warn', 'WS reconnect scheduled', 1000);
          reconnectTimerRef.current = window.setTimeout(() => {
            reconnectTimerRef.current = null;

            if (shouldReconnectRef.current && !isStoppingRef.current) {
              log('warn', 'WS reconnect firing');
              connectSocket();
            }
          }, 1000);
        }
      };
    } catch (socketError) {
      log('error', 'Failed to open websocket', socketError);
      setConnectionState('error');
      setError(socketError instanceof Error ? socketError.message : 'Failed to open the transcription WebSocket.');
    }
  }, [clearReconnectTimer, flushPendingChunks, log, pushSegment]);

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
    recentChunksRef.current = [];
    lastFinalTranscriptRef.current = '';
    resampleStateRef.current = { buffer: new Float32Array(0), position: 0 };
    chunkCountRef.current = 0;
    sendCountRef.current = 0;
    firstChunkSentAtRef.current = null;
    firstPartialAtRef.current = null;
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
    recentChunksRef.current = [];
    resampleStateRef.current = { buffer: new Float32Array(0), position: 0 };
    chunkCountRef.current = 0;
    sendCountRef.current = 0;
    firstChunkSentAtRef.current = null;
    firstPartialAtRef.current = null;
    setConnectionState('connecting');

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

      const audioContext = createAudioContext();
      audioContextRef.current = audioContext;
      await audioContext.resume();

      await audioContext.audioWorklet.addModule(WORKLET_URL);

      const source = audioContext.createMediaStreamSource(stream);
      const worklet = new AudioWorkletNode(audioContext, WORKLET_NAME);
      const silentGain = audioContext.createGain();

      silentGain.gain.value = 0;

      worklet.port.onmessage = (event: MessageEvent) => {
        const rawData = event.data as Float32Array | ArrayBuffer;
        const input = rawData instanceof Float32Array ? rawData : new Float32Array(rawData);
        const downsampled = resampleBuffer(input, audioContext.sampleRate, TARGET_SAMPLE_RATE, resampleStateRef.current);
        const pcmChunk = floatTo16BitPCM(downsampled);
        recentChunksRef.current.push(pcmChunk.slice(0));

        if (recentChunksRef.current.length > MAX_RECENT_CHUNKS) {
          recentChunksRef.current.shift();
        }

        chunkCountRef.current += 1;
        const socket = socketRef.current;

        if (socket && socket.readyState === WebSocket.OPEN) {
          sendCountRef.current += 1;
          const chunkSentAt = Date.now();
          if (sendCountRef.current <= 5 || sendCountRef.current % 20 === 0) {
            log('info', 'Sending audio chunk', { chunk: sendCountRef.current, bytes: pcmChunk.byteLength });
          }
          socket.send(pcmChunk);
          // Track first chunk sent time for LATENCY_BROWSER_TO_BACKEND
          if (firstChunkSentAtRef.current === null) {
            firstChunkSentAtRef.current = chunkSentAt;
          }
          if (sendCountRef.current <= 5 || sendCountRef.current % 20 === 0) {
            console.info('MIC_CHUNK_SENT', {
              chunk: sendCountRef.current,
              bytes: pcmChunk.byteLength,
              ts: chunkSentAt,
            });
            console.info('DEEPGRAM_AUDIO_SENT', {
              chunk: sendCountRef.current,
              bytes: pcmChunk.byteLength,
              ts: chunkSentAt,
            });
          }
          setConnectionState('listening');
          return;
        }

        if (chunkCountRef.current <= 5 || chunkCountRef.current % 20 === 0) {
          log('debug', 'Buffering audio chunk until socket opens', { chunk: chunkCountRef.current, bytes: pcmChunk.byteLength });
        }
        pendingChunksRef.current.push(pcmChunk);

        if (pendingChunksRef.current.length > MAX_PENDING_CHUNKS) {
          pendingChunksRef.current.shift();
        }
      };

      source.connect(worklet);
      worklet.connect(silentGain);
      silentGain.connect(audioContext.destination);

      sourceRef.current = source;
      workletRef.current = worklet;
      silentGainRef.current = silentGain;

      connectSocket();
      setIsRecording(true);
    } catch (captureError) {
      log('error', 'Capture setup failed', captureError);
      await stopRecording();
      setConnectionState('error');
      setError(captureError instanceof Error ? captureError.message : 'Unable to access the microphone.');
    }
  }, [connectSocket, isRecording, log, stopRecording]);

  useEffect(() => {
    return () => {
      void stopRecording();
    };
  }, [stopRecording]);

  return useMemo(
    () => ({
      connectionState,
      error,
      interimTranscript,
      isRecording,
      segments,
      socketUrl: DEFAULT_TRANSCRIPTION_SOCKET_URL,
      getRecentAudioChunks,
      startRecording,
      stopRecording,
    }),
    [connectionState, error, getRecentAudioChunks, interimTranscript, isRecording, segments, startRecording, stopRecording]
  );
}
