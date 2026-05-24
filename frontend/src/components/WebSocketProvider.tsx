import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { getMockPayload, getMockTranscriptIntro } from '../data/mockStream';
import type {
  ConnectionState,
  PerioChartContextValue,
  PerioPayload,
  ToothState,
  ToothSurface,
  ToothSurfaceState,
  TranscriptEntry,
} from '../types';

const DEFAULT_SOCKET_URL = 'ws://localhost:8000/ws';
const SITE_COUNT = 3;
const MOCK_INTERVAL_MS = 1800;

const PerioChartContext = createContext<PerioChartContextValue | undefined>(undefined);

function createSurfaceState(): ToothSurfaceState {
  return {
    depth: [0, 0, 0],
    bleeding: false,
    siteIndex: 1,
    updatedAt: 0,
  };
}

function createInitialTeethState(): Record<number, ToothState> {
  return Array.from({ length: 32 }, (_, index) => index + 1).reduce<Record<number, ToothState>>(
    (accumulator, toothNumber) => {
      accumulator[toothNumber] = {
        toothNumber,
        missing: false,
        implant: false,
        buccal: createSurfaceState(),
        lingual: createSurfaceState(),
        updatedAt: 0,
      };

      return accumulator;
    },
    {}
  );
}

function normalizeSurface(surface?: string): ToothSurface {
  if (!surface) {
    return 'buccal';
  }

  const lowered = surface.toLowerCase();
  return lowered === 'lingual' || lowered === 'palatal' ? 'lingual' : 'buccal';
}

function clampSiteIndex(value?: number): number {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return 1;
  }

  return Math.max(0, Math.min(SITE_COUNT - 1, Math.trunc(value)));
}

function createTranscriptText(payload: PerioPayload): string {
  if (payload.transcript?.trim()) {
    return payload.transcript.trim();
  }

  if (payload.tooth && payload.depth) {
    const values = payload.depth.join(' | ');
    const surface = normalizeSurface(payload.surface) === 'buccal' ? 'buccal' : 'lingual / palatal';
    return `Tooth ${payload.tooth} ${surface}: ${values}${payload.bleeding ? ' with bleeding' : ''}.`;
  }

  if (payload.tooth && payload.missing) {
    return `Tooth ${payload.tooth} marked missing.`;
  }

  if (payload.tooth && payload.implant) {
    return `Tooth ${payload.tooth} marked as implant.`;
  }

  return 'Chart update received.';
}

function hydratePayload(payload: PerioPayload): PerioPayload {
  return {
    ...payload,
    surface: payload.surface ? normalizeSurface(payload.surface) : undefined,
    siteIndex: clampSiteIndex(payload.siteIndex),
    timestamp: payload.timestamp ?? Date.now(),
  };
}

function ingestPayload(
  payload: PerioPayload,
  source: 'socket' | 'mock',
  setTeeth: React.Dispatch<React.SetStateAction<Record<number, ToothState>>>,
  setTranscriptEntries: React.Dispatch<React.SetStateAction<TranscriptEntry[]>>,
  setConnectionState: React.Dispatch<React.SetStateAction<ConnectionState>>,
  setIsMockStream: React.Dispatch<React.SetStateAction<boolean>>,
  setLatencyMs: React.Dispatch<React.SetStateAction<number | null>>,
  setLastPayload: React.Dispatch<React.SetStateAction<PerioPayload | null>>,
  setCurrentTooth: React.Dispatch<React.SetStateAction<number | null>>,
  setCurrentSurface: React.Dispatch<React.SetStateAction<ToothSurface | null>>,
  setActiveSiteIndex: React.Dispatch<React.SetStateAction<number | null>>
) {
  const hydrated = hydratePayload(payload);
  const receivedAt = Date.now();
  const payloadTimestamp = hydrated.timestamp ?? receivedAt;

  setConnectionState(source === 'mock' ? 'mock' : 'connected');
  setIsMockStream(source === 'mock');
  setLatencyMs(Math.max(0, receivedAt - payloadTimestamp));
  setLastPayload(hydrated);

  if (typeof hydrated.tooth === 'number') {
    const toothNumber = hydrated.tooth;

    setCurrentTooth(toothNumber);
    const surface = normalizeSurface(hydrated.surface);
    setCurrentSurface(surface);
    setActiveSiteIndex(clampSiteIndex(hydrated.siteIndex));

    setTeeth((previous) => {
      const target = previous[toothNumber] ?? {
        toothNumber,
        missing: false,
        implant: false,
        buccal: createSurfaceState(),
        lingual: createSurfaceState(),
        updatedAt: 0,
      };

      const nextTeeth = { ...previous };
      const nextTooth = { ...target };

      if (hydrated.missing === true) {
        nextTooth.missing = true;
        nextTooth.implant = false;
      } else if (hydrated.missing === false) {
        nextTooth.missing = false;
      }

      if (hydrated.implant === true) {
        nextTooth.implant = true;
        nextTooth.missing = false;
      } else if (hydrated.implant === false) {
        nextTooth.implant = false;
      }

      if (Array.isArray(hydrated.depth) && hydrated.depth.length === SITE_COUNT) {
        nextTooth[surface] = {
          depth: [hydrated.depth[0] ?? 0, hydrated.depth[1] ?? 0, hydrated.depth[2] ?? 0],
          bleeding: Boolean(hydrated.bleeding),
          siteIndex: clampSiteIndex(hydrated.siteIndex),
          updatedAt: receivedAt,
        };

        if (!hydrated.missing && !hydrated.implant) {
          nextTooth.missing = false;
          nextTooth.implant = false;
        }
      }

      nextTooth.updatedAt = receivedAt;
      nextTeeth[toothNumber] = nextTooth;

      return nextTeeth;
    });
  }

  setTranscriptEntries((previous) => {
    const nextEntry: TranscriptEntry = {
      id: `${source}-${receivedAt}-${Math.random().toString(36).slice(2, 8)}`,
      text: createTranscriptText(hydrated),
      timestamp: receivedAt,
      source,
    };

    return [nextEntry, ...previous].slice(0, 8);
  });
}

export function WebSocketProvider({ children }: { children: React.ReactNode }) {
  const [connectionState, setConnectionState] = useState<ConnectionState>('connecting');
  const [isMockStream, setIsMockStream] = useState(false);
  const [socketUrl] = useState(process.env.REACT_APP_WEBSOCKET_URL || DEFAULT_SOCKET_URL);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [lastPayload, setLastPayload] = useState<PerioPayload | null>(null);
  const [currentTooth, setCurrentTooth] = useState<number | null>(null);
  const [currentSurface, setCurrentSurface] = useState<ToothSurface | null>(null);
  const [activeSiteIndex, setActiveSiteIndex] = useState<number | null>(null);
  const [transcripts, setTranscriptEntries] = useState<TranscriptEntry[]>([
    {
      id: 'intro',
      text: getMockTranscriptIntro(),
      timestamp: Date.now(),
      source: 'mock',
    },
  ]);
  const [teeth, setTeeth] = useState<Record<number, ToothState>>(createInitialTeethState);

  const socketRef = useRef<WebSocket | null>(null);
  const mockTimerRef = useRef<number | null>(null);
  const mockIndexRef = useRef(0);
  const connectionAttemptRef = useRef(0);
  const mockActiveRef = useRef(false);

  const stopMockStream = useCallback(() => {
    if (mockTimerRef.current !== null) {
      window.clearInterval(mockTimerRef.current);
      mockTimerRef.current = null;
    }
  }, []);

  const startMockStream = useCallback(() => {
    if (mockActiveRef.current) {
      return;
    }

    mockActiveRef.current = true;
    stopMockStream();

    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.close();
    }

    setConnectionState('mock');
    setIsMockStream(true);

    const sendMockPayload = () => {
      const payload = getMockPayload(mockIndexRef.current);
      mockIndexRef.current += 1;
      ingestPayload(
        payload,
        'mock',
        setTeeth,
        setTranscriptEntries,
        setConnectionState,
        setIsMockStream,
        setLatencyMs,
        setLastPayload,
        setCurrentTooth,
        setCurrentSurface,
        setActiveSiteIndex
      );
    };

    sendMockPayload();
    mockTimerRef.current = window.setInterval(sendMockPayload, MOCK_INTERVAL_MS);
  }, [stopMockStream]);

  useEffect(() => {
    connectionAttemptRef.current += 1;
    const attemptId = connectionAttemptRef.current;

    const forceMock = process.env.REACT_APP_PERIO_USE_MOCK === 'true';
    if (forceMock) {
      startMockStream();
      return undefined;
    }

    let connected = false;
    let timeoutId: number | null = window.setTimeout(() => {
      if (!connected) {
        startMockStream();
      }
    }, 1200);

    try {
      const socket = new WebSocket(socketUrl);
      socketRef.current = socket;

      socket.onopen = () => {
        if (attemptId !== connectionAttemptRef.current) {
          return;
        }

        connected = true;
        if (timeoutId !== null) {
          window.clearTimeout(timeoutId);
          timeoutId = null;
        }

        mockActiveRef.current = false;
        stopMockStream();
        setConnectionState('connected');
        setIsMockStream(false);
      };

      socket.onmessage = (event) => {
        if (attemptId !== connectionAttemptRef.current) {
          return;
        }

        let payload: PerioPayload;

        try {
          payload = JSON.parse(event.data) as PerioPayload;
        } catch {
          payload = { transcript: String(event.data), timestamp: Date.now() };
        }

        ingestPayload(
          payload,
          'socket',
          setTeeth,
          setTranscriptEntries,
          setConnectionState,
          setIsMockStream,
          setLatencyMs,
          setLastPayload,
          setCurrentTooth,
          setCurrentSurface,
          setActiveSiteIndex
        );
      };

      socket.onerror = () => {
        if (attemptId !== connectionAttemptRef.current) {
          return;
        }

        if (!connected) {
          startMockStream();
        } else {
          setConnectionState('error');
        }
      };

      socket.onclose = () => {
        if (attemptId !== connectionAttemptRef.current) {
          return;
        }

        if (timeoutId !== null) {
          window.clearTimeout(timeoutId);
          timeoutId = null;
        }

        if (!connected) {
          startMockStream();
          return;
        }

        setConnectionState('disconnected');
        startMockStream();
      };
    } catch {
      startMockStream();
    }

    return () => {
      connectionAttemptRef.current += 1;
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }

      stopMockStream();
      mockActiveRef.current = false;

      if (socketRef.current) {
        socketRef.current.onopen = null;
        socketRef.current.onmessage = null;
        socketRef.current.onerror = null;
        socketRef.current.onclose = null;

        if (
          socketRef.current.readyState === WebSocket.CONNECTING ||
          socketRef.current.readyState === WebSocket.OPEN
        ) {
          socketRef.current.close();
        }

        socketRef.current = null;
      }
    };
  }, [socketUrl, startMockStream, stopMockStream]);

  const value = useMemo<PerioChartContextValue>(
    () => ({
      connectionState,
      isMockStream,
      socketUrl,
      latencyMs,
      lastPayload,
      currentTooth,
      currentSurface,
      activeSiteIndex,
      transcripts,
      teeth,
    }),
    [
      activeSiteIndex,
      connectionState,
      currentSurface,
      currentTooth,
      isMockStream,
      lastPayload,
      latencyMs,
      socketUrl,
      teeth,
      transcripts,
    ]
  );

  return <PerioChartContext.Provider value={value}>{children}</PerioChartContext.Provider>;
}

export function usePerioChart() {
  const context = useContext(PerioChartContext);

  if (!context) {
    throw new Error('usePerioChart must be used within a WebSocketProvider.');
  }

  return context;
}