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
const TOOTH_COUNT = 32;
const MAXILLARY_TOOTH_ORDER = Array.from({ length: 16 }, (_, index) => index + 1);
const MANDIBULAR_TOOTH_ORDER = Array.from({ length: 16 }, (_, index) => 32 - index);
const CHART_TOOTH_ORDER = [...MAXILLARY_TOOTH_ORDER, ...MANDIBULAR_TOOTH_ORDER];

interface ChartSnapshot {
  teeth: Record<number, ToothState>;
  currentTooth: number | null;
  currentSurface: ToothSurface | null;
  activeSiteIndex: number | null;
  lastPayload: PerioPayload | null;
}

interface ChartState extends ChartSnapshot {}

interface ProcessedPayloadResult {
  state: ChartState;
  transcriptEntry: TranscriptEntry;
  latencyMs: number;
}

const PerioChartContext = createContext<PerioChartContextValue | undefined>(undefined);

function createSurfaceState(): ToothSurfaceState {
  return {
    depth: [0, 0, 0],
    bleeding: false,
    recession: false,
    siteIndex: 1,
    updatedAt: 0,
  };
}

function createInitialTeethState(): Record<number, ToothState> {
  return Array.from({ length: TOOTH_COUNT }, (_, index) => index + 1).reduce<Record<number, ToothState>>(
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

function cloneSurfaceState(surfaceState: ToothSurfaceState): ToothSurfaceState {
  return {
    depth: [surfaceState.depth[0] ?? 0, surfaceState.depth[1] ?? 0, surfaceState.depth[2] ?? 0],
    bleeding: surfaceState.bleeding,
    recession: surfaceState.recession,
    siteIndex: surfaceState.siteIndex,
    updatedAt: surfaceState.updatedAt,
  };
}

function cloneTeethState(teeth: Record<number, ToothState>): Record<number, ToothState> {
  return Object.entries(teeth).reduce<Record<number, ToothState>>((accumulator, [toothKey, toothState]) => {
    const toothNumber = Number.parseInt(toothKey, 10);
    accumulator[toothNumber] = {
      toothNumber: toothState.toothNumber,
      missing: toothState.missing,
      implant: toothState.implant,
      buccal: cloneSurfaceState(toothState.buccal),
      lingual: cloneSurfaceState(toothState.lingual),
      updatedAt: toothState.updatedAt,
    };
    return accumulator;
  }, {});
}

function hasMissingToothFlag(tooth: ToothState | undefined): boolean {
  return Boolean(tooth?.missing);
}

function findNextAvailableTooth(teeth: Record<number, ToothState>, startingTooth: number | null): number | null {
  const startingIndex = startingTooth === null ? -1 : CHART_TOOTH_ORDER.indexOf(startingTooth);
  const beginIndex = startingIndex >= 0 ? startingIndex + 1 : 0;

  for (let index = beginIndex; index < CHART_TOOTH_ORDER.length; index += 1) {
    const toothNumber = CHART_TOOTH_ORDER[index];
    if (!hasMissingToothFlag(teeth[toothNumber])) {
      return toothNumber;
    }
  }

  return null;
}

function describeCursor(tooth: number | null, surface: ToothSurface | null, siteIndex: number | null): string {
  return `tooth=${tooth ?? 'none'}, surface=${surface ?? 'none'}, siteIndex=${siteIndex ?? 'none'}`;
}

function advanceOneSite(
  teeth: Record<number, ToothState>,
  toothNumber: number | null,
  surface: ToothSurface | null,
  siteIndex: number | null
): { tooth: number | null; surface: ToothSurface | null; siteIndex: number | null } {
  const safeTooth = toothNumber ?? findNextAvailableTooth(teeth, null) ?? null;
  const safeSurface = surface ?? 'buccal';
  const safeSite = siteIndex ?? 0;

  if (safeTooth === null) {
    return { tooth: null, surface: null, siteIndex: null };
  }

  if (safeSite < SITE_COUNT - 1) {
    return { tooth: safeTooth, surface: safeSurface, siteIndex: safeSite + 1 };
  }

  if (safeSurface === 'buccal') {
    const nextTooth = findNextAvailableTooth(teeth, safeTooth);
    return nextTooth ? { tooth: nextTooth, surface: 'lingual', siteIndex: 0 } : { tooth: safeTooth, surface: 'buccal', siteIndex: 2 };
  }

  return { tooth: safeTooth, surface: 'buccal', siteIndex: 0 };
}

function hydratePayload(payload: PerioPayload): PerioPayload {
  return {
    ...payload,
    surface: payload.surface ? normalizeSurface(payload.surface) : undefined,
    siteIndex: clampSiteIndex(payload.siteIndex),
    timestamp: payload.timestamp ?? Date.now(),
  };
}

function makeChartState(snapshot: ChartSnapshot): ChartState {
  return {
    teeth: cloneTeethState(snapshot.teeth),
    currentTooth: snapshot.currentTooth,
    currentSurface: snapshot.currentSurface,
    activeSiteIndex: snapshot.activeSiteIndex,
    lastPayload: snapshot.lastPayload,
  };
}

function processClinicalPayload(
  payload: PerioPayload,
  state: ChartState,
  chartHistoryRef: React.MutableRefObject<ChartSnapshot[]>,
  lastClinicalPayloadRef: React.MutableRefObject<PerioPayload | null>
): ProcessedPayloadResult {
  const hydrated = hydratePayload(payload);
  const receivedAt = Date.now();
  const payloadTimestamp = hydrated.timestamp ?? receivedAt;
  const latencyMs = Math.max(0, receivedAt - payloadTimestamp);

  console.info('[cursor] before update', {
    incoming: hydrated,
    current: describeCursor(state.currentTooth, state.currentSurface, state.activeSiteIndex),
  });

  if (hydrated.command === 'undo' || hydrated.command === 'correct') {
    const snapshot = chartHistoryRef.current.pop();
    if (snapshot) {
      lastClinicalPayloadRef.current = snapshot.lastPayload;
      const restoredState = makeChartState(snapshot);
      console.info('[cursor] undo/correct restored', {
        current: describeCursor(restoredState.currentTooth, restoredState.currentSurface, restoredState.activeSiteIndex),
      });
      return {
        state: restoredState,
        latencyMs,
        transcriptEntry: {
          id: `socket-${receivedAt}-${Math.random().toString(36).slice(2, 8)}`,
          text: hydrated.transcript?.trim() || 'Chart update received.',
          timestamp: receivedAt,
          source: 'socket',
          isFinal: true,
        },
      };
    }
  }

  if (hydrated.command === 'repeat') {
    const previousClinicalPayload = lastClinicalPayloadRef.current;
    if (previousClinicalPayload) {
      return processClinicalPayload(
        { ...previousClinicalPayload, timestamp: receivedAt },
        state,
        chartHistoryRef,
        lastClinicalPayloadRef
      );
    }
  }

  const currentTeeth = state.teeth;
  const currentTooth = state.currentTooth;
  const currentSurface = state.currentSurface;
  const activeSiteIndex = state.activeSiteIndex;
  const currentLastPayload = state.lastPayload;
  const nextTeeth = cloneTeethState(currentTeeth);
  const targetToothNumber = hydrated.tooth ?? currentTooth ?? findNextAvailableTooth(nextTeeth, null) ?? 1;
  const targetSurface = normalizeSurface(hydrated.surface) ?? currentSurface ?? 'buccal';
  const targetTooth = nextTeeth[targetToothNumber] ?? {
    toothNumber: targetToothNumber,
    missing: false,
    implant: false,
    buccal: createSurfaceState(),
    lingual: createSurfaceState(),
    updatedAt: 0,
  };

  chartHistoryRef.current.push({
    teeth: cloneTeethState(currentTeeth),
    currentTooth,
    currentSurface,
    activeSiteIndex,
    lastPayload: currentLastPayload,
  });

  if (hydrated.missing === true) {
    targetTooth.missing = true;
    targetTooth.implant = false;
  }

  if (hydrated.implant === true) {
    targetTooth.implant = true;
    targetTooth.missing = false;
  }

  let nextCursor: { tooth: number | null; surface: ToothSurface | null; siteIndex: number | null } = {
    tooth: currentTooth,
    surface: targetSurface,
    siteIndex: activeSiteIndex,
  };

  if (Array.isArray(hydrated.depth) && hydrated.depth.length === SITE_COUNT) {
    targetTooth[targetSurface] = {
      ...cloneSurfaceState(targetTooth[targetSurface]),
      depth: [hydrated.depth[0] ?? 0, hydrated.depth[1] ?? 0, hydrated.depth[2] ?? 0],
      bleeding: hydrated.bleeding !== undefined ? Boolean(hydrated.bleeding) : targetTooth[targetSurface].bleeding,
      recession: hydrated.recession !== undefined ? Boolean(hydrated.recession) : targetTooth[targetSurface].recession,
      siteIndex: clampSiteIndex(hydrated.siteIndex),
      updatedAt: receivedAt,
    };

    if (!hydrated.missing && !hydrated.implant) {
      targetTooth.missing = false;
      targetTooth.implant = false;
    }

    nextCursor = advanceOneSite(nextTeeth, targetToothNumber, targetSurface, 2);
    console.info('[cursor] triplet complete', {
      current: describeCursor(targetToothNumber, targetSurface, 2),
      next: describeCursor(nextCursor.tooth, nextCursor.surface, nextCursor.siteIndex),
      chartOrder: CHART_TOOTH_ORDER,
    });
  } else {
    if (hydrated.bleeding !== undefined || hydrated.recession !== undefined || hydrated.siteIndex !== undefined) {
      targetTooth[targetSurface] = {
        ...cloneSurfaceState(targetTooth[targetSurface]),
        bleeding: hydrated.bleeding !== undefined ? Boolean(hydrated.bleeding) : targetTooth[targetSurface].bleeding,
        recession: hydrated.recession !== undefined ? Boolean(hydrated.recession) : targetTooth[targetSurface].recession,
        siteIndex: clampSiteIndex(hydrated.siteIndex ?? targetTooth[targetSurface].siteIndex),
        updatedAt: receivedAt,
      };
    }

    if (hydrated.missing === true) {
      nextCursor = advanceOneSite(nextTeeth, targetToothNumber, targetSurface, 2);
      console.info('[cursor] missing tooth advanced', {
        current: describeCursor(targetToothNumber, targetSurface, 2),
        next: describeCursor(nextCursor.tooth, nextCursor.surface, nextCursor.siteIndex),
      });
    } else if (hydrated.command === 'skip' || hydrated.advanceCursor) {
      const cursorSiteIndex = hydrated.siteIndex ?? activeSiteIndex ?? 0;
      nextCursor = advanceOneSite(nextTeeth, targetToothNumber, targetSurface, cursorSiteIndex);
      console.info('[cursor] manual advance', {
        current: describeCursor(targetToothNumber, targetSurface, cursorSiteIndex),
        next: describeCursor(nextCursor.tooth, nextCursor.surface, nextCursor.siteIndex),
      });
    }

    if (!hydrated.missing && !hydrated.implant && !hydrated.command && !hydrated.advanceCursor && !hydrated.depth) {
      nextCursor = {
        tooth: targetToothNumber,
        surface: targetSurface,
        siteIndex: clampSiteIndex(hydrated.siteIndex ?? activeSiteIndex ?? 0),
      };
    }
  }

  targetTooth.updatedAt = receivedAt;
  nextTeeth[targetToothNumber] = targetTooth;

  const nextState: ChartState = {
    teeth: nextTeeth,
    currentTooth: nextCursor.tooth,
    currentSurface: nextCursor.surface,
    activeSiteIndex: nextCursor.siteIndex,
    lastPayload: hydrated,
  };

  console.info('[cursor] after update queued', {
    current: describeCursor(nextState.currentTooth, nextState.currentSurface, nextState.activeSiteIndex),
  });

  lastClinicalPayloadRef.current = hydrated;

  return {
    state: nextState,
    latencyMs,
    transcriptEntry: {
      id: `socket-${receivedAt}-${Math.random().toString(36).slice(2, 8)}`,
      text: hydrated.transcript?.trim() || 'Chart update received.',
      timestamp: receivedAt,
      source: 'socket',
      isFinal: true,
    },
  };
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
  const processedClinicalEventsRef = useRef(0);
  const chartHistoryRef = useRef<ChartSnapshot[]>([]);
  const lastClinicalPayloadRef = useRef<PerioPayload | null>(null);

  useEffect(() => {
    setConnectionState(transcription.connectionState);
  }, [transcription.connectionState]);

  useEffect(() => {
    console.info('[cursor] chart cursor updated', {
      currentTooth,
      currentSurface,
      activeSiteIndex,
    });
  }, [activeSiteIndex, currentSurface, currentTooth]);

  useEffect(() => {
    if (!transcription.isRecording && transcription.segments.length === 0 && transcription.clinicalEvents.length === 0) {
      processedTranscriptIdsRef.current = new Set();
      processedClinicalEventsRef.current = 0;
      chartHistoryRef.current = [];
      lastClinicalPayloadRef.current = null;
    }
  }, [transcription.clinicalEvents.length, transcription.isRecording, transcription.segments.length]);

  useEffect(() => {
    const pendingClinicalEvents = transcription.clinicalEvents.slice(processedClinicalEventsRef.current);

    if (pendingClinicalEvents.length === 0) {
      return;
    }

    let runtimeState: ChartState = {
      teeth,
      currentTooth,
      currentSurface,
      activeSiteIndex,
      lastPayload,
    };
    const nextEntries: TranscriptEntry[] = [];

    for (const event of pendingClinicalEvents) {
      const result = processClinicalPayload(event, runtimeState, chartHistoryRef, lastClinicalPayloadRef);
      runtimeState = result.state;
      setLatencyMs(result.latencyMs);
      nextEntries.push(result.transcriptEntry);
    }

    setTeeth(runtimeState.teeth);
    setCurrentTooth(runtimeState.currentTooth);
    setCurrentSurface(runtimeState.currentSurface);
    setActiveSiteIndex(runtimeState.activeSiteIndex);
    setLastPayload(runtimeState.lastPayload);
    setTranscriptEntries((previous) => [...nextEntries, ...previous].slice(0, 8));
    processedClinicalEventsRef.current = transcription.clinicalEvents.length;
  }, [activeSiteIndex, currentSurface, currentTooth, lastPayload, setActiveSiteIndex, setCurrentSurface, setCurrentTooth, setLastPayload, setTeeth, teeth, transcription.clinicalEvents]);

  useEffect(() => {
    if (transcription.clinicalEvents.length > 0) {
      return;
    }

    const latestFinal = transcription.segments.find((segment) => segment.isFinal && !processedTranscriptIdsRef.current.has(segment.id));

    if (!latestFinal) {
      return;
    }

    processedTranscriptIdsRef.current.add(latestFinal.id);

    const payload = parseTranscriptToPayload(latestFinal.text);
    if (!payload) {
      return;
    }

    const result = processClinicalPayload(
      payload,
      {
        teeth,
        currentTooth,
        currentSurface,
        activeSiteIndex,
        lastPayload,
      },
      chartHistoryRef,
      lastClinicalPayloadRef
    );

    setLatencyMs(result.latencyMs);
    setTeeth(result.state.teeth);
    setCurrentTooth(result.state.currentTooth);
    setCurrentSurface(result.state.currentSurface);
    setActiveSiteIndex(result.state.activeSiteIndex);
    setLastPayload(result.state.lastPayload);
    setTranscriptEntries((previous) => [result.transcriptEntry, ...previous].slice(0, 8));
  }, [activeSiteIndex, currentSurface, currentTooth, lastPayload, setActiveSiteIndex, setCurrentSurface, setCurrentTooth, setLastPayload, setTeeth, teeth, transcription.clinicalEvents.length, transcription.segments]);

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
