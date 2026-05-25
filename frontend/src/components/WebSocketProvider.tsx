import React, { createContext, useEffect, useMemo, useRef, useState } from 'react';
import { parseTranscriptToPayload } from './transcriptParser';
import { useDeepgramTranscription } from './useDeepgramTranscription';
import type {
  PerioChartContextValue,
  PerioPayload,
  ToothState,
  ToothSurface,
  ToothSurfaceState,
  TranscriptEntry,
} from '../types';

const SITE_COUNT = 3;

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
  setTeeth: React.Dispatch<React.SetStateAction<Record<number, ToothState>>>,
  setTranscriptEntries: React.Dispatch<React.SetStateAction<TranscriptEntry[]>>,
  setLatencyMs: React.Dispatch<React.SetStateAction<number | null>>,
  setLastPayload: React.Dispatch<React.SetStateAction<PerioPayload | null>>,
  setCurrentTooth: React.Dispatch<React.SetStateAction<number | null>>,
  setCurrentSurface: React.Dispatch<React.SetStateAction<ToothSurface | null>>,
  setActiveSiteIndex: React.Dispatch<React.SetStateAction<number | null>>
) {
  const hydrated = hydratePayload(payload);
  const receivedAt = Date.now();
  const payloadTimestamp = hydrated.timestamp ?? receivedAt;

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
      id: `socket-${receivedAt}-${Math.random().toString(36).slice(2, 8)}`,
      text: hydrated.transcript?.trim() || 'Chart update received.',
      timestamp: receivedAt,
      source: 'socket',
      isFinal: true,
    };

    return [nextEntry, ...previous].slice(0, 8);
  });
}

export function WebSocketProvider({ children }: { children: React.ReactNode }) {
  const transcription = useDeepgramTranscription();
  const [connectionState, setConnectionState] = useState<PerioChartContextValue['connectionState']>('disconnected');
  const [socketUrl] = useState(transcription.socketUrl);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [lastPayload, setLastPayload] = useState<PerioPayload | null>(null);
  const [currentTooth, setCurrentTooth] = useState<number | null>(null);
  const [currentSurface, setCurrentSurface] = useState<ToothSurface | null>(null);
  const [activeSiteIndex, setActiveSiteIndex] = useState<number | null>(null);
  const [transcripts, setTranscriptEntries] = useState<TranscriptEntry[]>([]);
  const [teeth, setTeeth] = useState<Record<number, ToothState>>(createInitialTeethState);
  const processedTranscriptIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    setConnectionState(transcription.connectionState);
  }, [transcription.connectionState]);

  useEffect(() => {
    if (transcription.segments.length === 0 && !transcription.isRecording) {
      processedTranscriptIdsRef.current = new Set();
    }
  }, [transcription.isRecording, transcription.segments.length]);

  useEffect(() => {
    const latestFinal = transcription.segments.find((segment) => segment.isFinal && !processedTranscriptIdsRef.current.has(segment.id));

    if (!latestFinal) {
      return;
    }

    processedTranscriptIdsRef.current.add(latestFinal.id);

    const payload = parseTranscriptToPayload(latestFinal.text);
    if (!payload) {
      return;
    }

    ingestPayload(payload, setTeeth, setTranscriptEntries, setLatencyMs, setLastPayload, setCurrentTooth, setCurrentSurface, setActiveSiteIndex);
  }, [setTeeth, transcription.segments]);

  const value = useMemo<PerioChartContextValue>(
    () => ({
      connectionState,
      socketUrl,
      latencyMs,
      lastPayload,
      currentTooth,
      currentSurface,
      activeSiteIndex,
      transcripts,
      interimTranscript: transcription.interimTranscript,
      isRecording: transcription.isRecording,
      transcriptionError: transcription.error,
      startRecording: transcription.startRecording,
      stopRecording: transcription.stopRecording,
      teeth,
    }),
    [
      activeSiteIndex,
      connectionState,
      currentSurface,
      currentTooth,
      lastPayload,
      latencyMs,
      socketUrl,
      teeth,
      transcripts,
      transcription.error,
      transcription.interimTranscript,
      transcription.isRecording,
      transcription.startRecording,
      transcription.stopRecording,
    ]
  );

  return <PerioChartContext.Provider value={value}>{children}</PerioChartContext.Provider>;
}

export function usePerioChart() {
  const context = React.useContext(PerioChartContext);

  if (!context) {
    throw new Error('usePerioChart must be used within a WebSocketProvider.');
  }

  return context;
}
