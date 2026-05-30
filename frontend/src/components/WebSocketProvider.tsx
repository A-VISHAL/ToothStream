import React, { createContext, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { parseTranscriptToPayload } from './transcriptParser';
import { useDeepgramTranscription } from './useDeepgramTranscription';
import type {
  CommandFeedback,
  PerioDebugState,
  PerioDebugStreamEntry,
  PerioDebugTimelineEvent,
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

function cloneTeethState(source: Record<number, ToothState>): Record<number, ToothState> {
  return Object.fromEntries(
    Object.entries(source).map(([key, tooth]) => [
      Number(key),
      {
        ...tooth,
        buccal: { ...tooth.buccal, depth: [...tooth.buccal.depth] as [number, number, number] },
        lingual: { ...tooth.lingual, depth: [...tooth.lingual.depth] as [number, number, number] },
      },
    ])
  ) as Record<number, ToothState>;
}

type SoundTone = 'chart' | 'bleeding' | 'undo' | 'jump';
type ParserMode = 'idle' | 'navigation' | 'probing';
type ParserExpectation = 'tooth' | 'surface' | 'depth-triplet';

function createTonePlan(kind: SoundTone): Array<{ frequency: number; duration: number; delay: number }> {
  switch (kind) {
    case 'bleeding':
      return [
        { frequency: 392, duration: 0.08, delay: 0 },
        { frequency: 523.25, duration: 0.12, delay: 0.09 },
      ];
    case 'undo':
      return [
        { frequency: 330, duration: 0.08, delay: 0 },
        { frequency: 247, duration: 0.12, delay: 0.08 },
      ];
    case 'jump':
      return [{ frequency: 587.33, duration: 0.09, delay: 0 }];
    default:
      return [{ frequency: 440, duration: 0.055, delay: 0 }];
  }
}

function isUserAudioAllowed(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  const navigatorWithActivation = window.navigator as Navigator & {
    userActivation?: {
      hasBeenActive?: boolean;
    };
  };

  return navigatorWithActivation.userActivation?.hasBeenActive === true;
}

async function playTone(kind: SoundTone, enabled: boolean, audioContextRef: React.MutableRefObject<AudioContext | null>) {
  if (!enabled || typeof window === 'undefined' || !isUserAudioAllowed()) {
    return;
  }

  try {
    const AudioContextCtor = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

    if (!AudioContextCtor) {
      return;
    }

    const audioContext = audioContextRef.current ?? new AudioContextCtor();

    if (audioContext.state === 'suspended') {
      await audioContext.resume();
    }

    audioContextRef.current = audioContext;

    const now = audioContext.currentTime;
    const gainNode = audioContext.createGain();
    gainNode.gain.value = 0.0001;
    gainNode.connect(audioContext.destination);

    const tonePlan = createTonePlan(kind);

    tonePlan.forEach((step) => {
      const oscillator = audioContext.createOscillator();
      oscillator.type = kind === 'undo' ? 'triangle' : 'sine';
      oscillator.frequency.value = step.frequency;

      const stepGain = audioContext.createGain();
      stepGain.gain.setValueAtTime(0.0001, now + step.delay);
      stepGain.gain.linearRampToValueAtTime(0.045, now + step.delay + 0.012);
      stepGain.gain.exponentialRampToValueAtTime(0.0001, now + step.delay + step.duration);

      oscillator.connect(stepGain);
      stepGain.connect(gainNode);
      oscillator.start(now + step.delay);
      oscillator.stop(now + step.delay + step.duration + 0.01);
    });

    window.setTimeout(() => {
      gainNode.disconnect();
    }, 300);
  } catch (error) {
    console.debug('[Perio UI] command tone skipped', error);
  }
}

interface ChartSnapshot {
  teeth: Record<number, ToothState>;
  currentTooth: number | null;
  currentSurface: ToothSurface | null;
  activeSiteIndex: number | null;
  lastPayload: PerioPayload | null;
  parserMode: ParserMode;
  expectedInput: ParserExpectation;
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

function getNextToothInChartOrder(tooth: number): number | null {
  if (tooth >= 1 && tooth < 16) {
    return tooth + 1;
  }

  if (tooth === 16) {
    return 32;
  }

  if (tooth > 17 && tooth <= 32) {
    return tooth - 1;
  }

  if (tooth === 17) {
    return 1;
  }

  return null;
}

function getPreviousToothInChartOrder(tooth: number): number | null {
  if (tooth > 1 && tooth <= 16) {
    return tooth - 1;
  }

  if (tooth === 1) {
    return 17;
  }

  if (tooth >= 17 && tooth < 32) {
    return tooth + 1;
  }

  if (tooth === 32) {
    return 16;
  }

  return null;
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
  currentTeeth: Record<number, ToothState>,
  setTeeth: React.Dispatch<React.SetStateAction<Record<number, ToothState>>>,
  setTranscriptEntries: React.Dispatch<React.SetStateAction<TranscriptEntry[]>>,
  setLatencyMs: React.Dispatch<React.SetStateAction<number | null>>,
  setLastPayload: React.Dispatch<React.SetStateAction<PerioPayload | null>>,
  setCurrentTooth: React.Dispatch<React.SetStateAction<number | null>>,
  setCurrentSurface: React.Dispatch<React.SetStateAction<ToothSurface | null>>,
  setActiveSiteIndex: React.Dispatch<React.SetStateAction<number | null>>,
  connectionState: PerioChartContextValue['connectionState'],
  parserMode: ParserMode,
  expectedInput: ParserExpectation,
  previousPayload: PerioPayload | null,
  fallbackTooth: number | null,
  fallbackSurface: ToothSurface | null,
  fallbackSiteIndex: number | null,
  updateActiveRef: (tooth: number | null, surface: ToothSurface | null, siteIndex: number | null) => void,
  updateParserContext: (mode: ParserMode, expectation: ParserExpectation) => void,
  historyStackRef: React.MutableRefObject<ChartSnapshot[]>,
  flashFeedback: (feedback: CommandFeedback) => void,
  playCommandSound: (kind: SoundTone) => void,
  pushDebugTimeline: (category: string, message: string, detail?: string) => void
) {
  const hydrated = hydratePayload(payload);
  const receivedAt = Date.now();
  const payloadTimestamp = hydrated.timestamp ?? receivedAt;
  const hasTriplet = Array.isArray(hydrated.depth) && hydrated.depth.length === SITE_COUNT && !hydrated.missing;
  const shouldSnapshot =
    typeof hydrated.tooth === 'number' ||
    hasTriplet ||
    hydrated.bleeding === true ||
    hydrated.missing === true ||
    hydrated.implant === true ||
    typeof hydrated.surface === 'string' ||
    typeof hydrated.siteIndex === 'number';

  console.info('[Perio UI] payload received', hydrated);
  pushDebugTimeline('parser', 'payload received', JSON.stringify(hydrated));
  if (hasTriplet) {
    console.info('[Perio UI] triplet parsed', {
      tooth: hydrated.tooth ?? fallbackTooth,
      depth: hydrated.depth,
      surface: hydrated.surface ?? fallbackSurface ?? 'buccal',
      siteIndex: hydrated.siteIndex ?? fallbackSiteIndex ?? 0,
    });
    pushDebugTimeline('parser', 'triplet parsed', `depth=${hydrated.depth?.join(',') ?? 'null'}`);
  }

  setLatencyMs(Math.max(0, receivedAt - payloadTimestamp));
  setLastPayload(hydrated);

  const hasChartSignal =
    typeof hydrated.tooth === 'number' ||
    Array.isArray(hydrated.depth) ||
    hydrated.bleeding === true ||
    hydrated.missing === true ||
    hydrated.implant === true ||
    typeof hydrated.surface === 'string' ||
    typeof hydrated.siteIndex === 'number';

  const toothNumber = typeof hydrated.tooth === 'number' ? hydrated.tooth : fallbackTooth;
  const surface = normalizeSurface(hydrated.surface) ?? fallbackSurface ?? 'buccal';
  const siteIndex = clampSiteIndex(hydrated.siteIndex ?? fallbackSiteIndex ?? undefined);
  const commandLabel =
    hydrated.command ?? (hydrated.missing ? 'missing' : hydrated.implant ? 'implant' : hydrated.bleeding ? 'bleeding' : 'depth-triplet');
  const cursorAction = hydrated.missing ? 'advance' : 'stay';
  const resolvedCursorTooth =
    toothNumber === null
      ? null
      : hydrated.missing
        ? getNextToothInChartOrder(toothNumber) ?? toothNumber
        : toothNumber;
  const resolvedCursorSiteIndex = hydrated.missing ? 0 : siteIndex;
  const beforeState = {
    tooth: fallbackTooth,
    surface: fallbackSurface,
    siteIndex: fallbackSiteIndex,
    mode: parserMode,
    expectedInput,
    status: connectionState,
  };
  const afterState = {
    tooth: resolvedCursorTooth,
    surface,
    siteIndex: resolvedCursorSiteIndex,
    mode: 'probing' as const,
    expectedInput: 'depth-triplet' as const,
    status: connectionState,
  };

  if (!hasChartSignal || toothNumber === null) {
    console.warn('[Perio UI] dropping payload — no actionable chart signal or no target tooth', {
      hasChartSignal,
      toothNumber,
      hydrated,
    });
    pushDebugTimeline('parser', 'payload dropped', `tooth=${toothNumber ?? 'null'}`);

    // Still record the raw transcript for visibility if present
    if (typeof hydrated.transcript === 'string' && hydrated.transcript.trim()) {
      setTranscriptEntries((previous) => {
        const nextEntry = {
          id: `socket-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          text: hydrated.transcript!.trim(),
          timestamp: Date.now(),
          source: 'socket' as const,
          isFinal: true,
        };

        return [nextEntry, ...previous].slice(0, 12);
      });
    }

    return;
  }

  if (shouldSnapshot) {
    snapshotChartState(historyStackRef, currentTeeth, fallbackTooth, fallbackSurface, fallbackSiteIndex, previousPayload, parserMode, expectedInput);
  }

  console.info('[Perio UI] parser transition', {
    command: commandLabel,
    cursor: cursorAction,
    beforeState,
    afterState,
  });
  pushDebugTimeline('parser', 'command applied', `command=${commandLabel} cursor=${cursorAction} mode=${afterState.mode} expect=${afterState.expectedInput}`);
  pushDebugTimeline(
    'state',
    'before state',
    `tooth=${beforeState.tooth ?? 'null'} surface=${beforeState.surface ?? 'null'} site=${beforeState.siteIndex ?? 'null'} mode=${beforeState.mode} expect=${beforeState.expectedInput} status=${beforeState.status}`
  );
  pushDebugTimeline(
    'state',
    'after state',
    `tooth=${afterState.tooth ?? 'null'} surface=${afterState.surface} site=${afterState.siteIndex} mode=${afterState.mode} expect=${afterState.expectedInput} status=${afterState.status}`
  );

  console.info('[Perio UI] commit started', {
    toothNumber,
    surface,
    siteIndex: resolvedCursorSiteIndex,
    hasTriplet,
    bleeding: hydrated.bleeding === true,
    missing: hydrated.missing === true,
    implant: hydrated.implant === true,
  });
  pushDebugTimeline('chart', 'commit started', `tooth=${toothNumber} surface=${surface} triplet=${hasTriplet}`);

  setCurrentTooth(resolvedCursorTooth);
  setCurrentSurface(surface);
  setActiveSiteIndex(resolvedCursorSiteIndex);
  updateActiveRef(resolvedCursorTooth, surface, resolvedCursorSiteIndex);

  console.info('[Perio UI] state update queued', {
    toothNumber,
    surface,
    siteIndex: resolvedCursorSiteIndex,
    reusedFallback: typeof hydrated.tooth !== 'number',
  });
  pushDebugTimeline('state', 'state update queued', `tooth=${resolvedCursorTooth} surface=${surface}`);

  // Also push a debug transcript entry with the JSON payload for end-to-end visibility
  setTranscriptEntries((previous) => {
    const nextEntry = {
      id: `socket-json-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      text: JSON.stringify({ tooth: toothNumber, surface, depth: hydrated.depth ?? null, siteIndex }),
      timestamp: Date.now(),
      source: 'socket' as const,
      isFinal: true,
    };

    return [nextEntry, ...previous].slice(0, 12);
  });

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

    if (hydrated.bleeding === true) {
      nextTooth[surface] = {
        ...nextTooth[surface],
        bleeding: true,
        updatedAt: receivedAt,
      };
    }

    if (hasTriplet && Array.isArray(hydrated.depth)) {
      nextTooth[surface] = {
        depth: [hydrated.depth[0] ?? 0, hydrated.depth[1] ?? 0, hydrated.depth[2] ?? 0],
        bleeding: Boolean(hydrated.bleeding),
        siteIndex,
        updatedAt: receivedAt,
      };

      if (!hydrated.missing && !hydrated.implant) {
        nextTooth.missing = false;
        nextTooth.implant = false;
      }
    }

    nextTooth.updatedAt = receivedAt;
    nextTeeth[toothNumber] = nextTooth;

    console.info('[Perio UI] tooth state updated', {
      toothNumber,
      surface,
      depth: nextTooth[surface].depth,
      bleeding: nextTooth[surface].bleeding,
    });
    pushDebugTimeline('action', 'tooth state updated', `tooth=${toothNumber} surface=${surface}`);
    pushDebugTimeline('chart', 'chart updated', `tooth=${toothNumber} surface=${surface} bleeding=${nextTooth[surface].bleeding}`);

    if (hasTriplet && Array.isArray(hydrated.depth)) {
      console.info('[Perio UI] triplet committed', {
        tooth: toothNumber,
        surface,
        depth: nextTooth[surface].depth,
      });
    }

    return nextTeeth;
  });

  if (hasTriplet) {
    const nextTooth = getNextToothInChartOrder(toothNumber) ?? toothNumber;

    setCurrentTooth(nextTooth);
    setCurrentSurface(surface);
    setActiveSiteIndex(0);
    updateActiveRef(nextTooth, surface, 0);
    console.info('[Perio UI] cursor advanced after triplet', {
      fromTooth: toothNumber,
      toTooth: nextTooth,
      surface,
    });
    pushDebugTimeline('state', 'cursor advanced', `from=${toothNumber} to=${nextTooth} surface=${surface}`);
  }

  updateParserContext('probing', 'depth-triplet');

  if (hydrated.bleeding) {
    flashFeedback({ kind: 'bleeding', message: 'BLEEDING SET' });
    playCommandSound('bleeding');
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

function snapshotChartState(
  historyStackRef: React.MutableRefObject<ChartSnapshot[]>,
  teeth: Record<number, ToothState>,
  currentTooth: number | null,
  currentSurface: ToothSurface | null,
  activeSiteIndex: number | null,
  lastPayload: PerioPayload | null,
  parserMode: ParserMode,
  expectedInput: ParserExpectation
) {
  historyStackRef.current.push({
    teeth: cloneTeethState(teeth),
    currentTooth,
    currentSurface,
    activeSiteIndex,
    lastPayload,
    parserMode,
    expectedInput,
  });
}

export function WebSocketProvider({ children }: { children: React.ReactNode }) {
  const transcription = useDeepgramTranscription();
  const [connectionState, setConnectionState] = useState<PerioChartContextValue['connectionState']>('disconnected');
  const [socketUrl] = useState(transcription.socketUrl);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [lastPayload, setLastPayload] = useState<PerioPayload | null>(null);
  const [currentTooth, setCurrentTooth] = useState<number | null>(1);
  const [currentSurface, setCurrentSurface] = useState<ToothSurface | null>('buccal');
  const [activeSiteIndex, setActiveSiteIndex] = useState<number | null>(0);
  const [transcripts, setTranscriptEntries] = useState<TranscriptEntry[]>([]);
  const [teeth, setTeeth] = useState<Record<number, ToothState>>(createInitialTeethState);
  const [commandFeedback, setCommandFeedback] = useState<CommandFeedback | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [debugCollapsed, setDebugCollapsed] = useState(false);
  const [debugTimeline, setDebugTimeline] = useState<PerioDebugTimelineEvent[]>([]);
  const [parserMode, setParserMode] = useState<ParserMode>('navigation');
  const [expectedInput, setExpectedInput] = useState<ParserExpectation>('tooth');
  const processedTranscriptIdsRef = useRef<Set<string>>(new Set());
  const lastActiveToothRef = useRef<number | null>(1);
  const lastActiveSurfaceRef = useRef<ToothSurface | null>('buccal');
  const lastActiveSiteIndexRef = useRef<number | null>(0);
  const historyStackRef = useRef<ChartSnapshot[]>([]);
  const feedbackTimerRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

 
  const updateActiveRef = useCallback((tooth: number | null, surface: ToothSurface | null, siteIndex: number | null) => {
    lastActiveToothRef.current = tooth;
    lastActiveSurfaceRef.current = surface;
    lastActiveSiteIndexRef.current = siteIndex;
  }, []);

  const flashFeedback = useCallback((feedback: CommandFeedback) => {
    setCommandFeedback(feedback);

    if (feedbackTimerRef.current !== null) {
      window.clearTimeout(feedbackTimerRef.current);
    }

    feedbackTimerRef.current = window.setTimeout(() => {
      setCommandFeedback(null);
      feedbackTimerRef.current = null;
    }, 2200);
  }, []);

  const playCommandSound = useCallback(
    (kind: SoundTone) => {
      void playTone(kind, soundEnabled, audioContextRef);
    },
    [soundEnabled]
  );

  const pushDebugTimeline = useCallback((category: string, message: string, detail?: string) => {
    setDebugTimeline((previous) => [
      {
        id: `debug-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        timestamp: Date.now(),
        message: `${category}: ${message}`,
        detail,
      },
      ...previous,
    ].slice(0, 18));
  }, []);

  const updateParserContext = useCallback((mode: ParserMode, expectation: ParserExpectation) => {
    setParserMode(mode);
    setExpectedInput(expectation);
  }, []);

  const selectTooth = useCallback(
    (tooth: number, surface?: ToothSurface | null) => {
      snapshotChartState(historyStackRef, teeth, currentTooth, currentSurface, activeSiteIndex, lastPayload, parserMode, expectedInput);
      setCurrentTooth(tooth);
      setCurrentSurface(surface ?? null);
      setActiveSiteIndex(surface ? 0 : null);
      updateActiveRef(tooth, surface ?? null, surface ? 0 : null);
      updateParserContext('navigation', surface ? 'depth-triplet' : 'surface');
      pushDebugTimeline('state', 'tooth selected', `tooth=${tooth} surface=${surface ?? 'null'}`);
    },
    [activeSiteIndex, currentSurface, currentTooth, expectedInput, historyStackRef, lastPayload, parserMode, teeth, updateActiveRef, updateParserContext, pushDebugTimeline]
  );

  const selectSurface = useCallback(
    (surface: ToothSurface) => {
      if (currentTooth === null) {
        return;
      }

      snapshotChartState(historyStackRef, teeth, currentTooth, currentSurface, activeSiteIndex, lastPayload, parserMode, expectedInput);
      setCurrentSurface(surface);
      setActiveSiteIndex(0);
      updateActiveRef(currentTooth, surface, 0);
      updateParserContext('probing', 'depth-triplet');
      pushDebugTimeline('state', 'surface selected', `tooth=${currentTooth} surface=${surface}`);
    },
    [activeSiteIndex, currentSurface, currentTooth, expectedInput, historyStackRef, lastPayload, parserMode, teeth, updateActiveRef, updateParserContext, pushDebugTimeline]
  );

  const navigateTooth = useCallback(
    (direction: 'next' | 'previous') => {
      if (currentTooth === null) {
        return;
      }

      const nextTooth = direction === 'next' ? getNextToothInChartOrder(currentTooth) : getPreviousToothInChartOrder(currentTooth);

      if (nextTooth === null) {
        flashFeedback({ kind: 'info', message: 'NO NEXT TOOTH' });
        return;
      }

      snapshotChartState(historyStackRef, teeth, currentTooth, currentSurface, activeSiteIndex, lastPayload, parserMode, expectedInput);
      setCurrentTooth(nextTooth);
      setActiveSiteIndex(currentSurface ? 0 : null);
      updateActiveRef(nextTooth, currentSurface, currentSurface ? 0 : null);
      updateParserContext('navigation', currentSurface ? 'depth-triplet' : 'surface');
      pushDebugTimeline('command', direction, `tooth=${nextTooth} surface=${currentSurface ?? 'null'}`);
      flashFeedback({ kind: 'jump', message: `${direction.toUpperCase()} TO TOOTH ${nextTooth}` });
      playCommandSound('jump');
    },
    [activeSiteIndex, currentSurface, currentTooth, expectedInput, flashFeedback, historyStackRef, lastPayload, parserMode, playCommandSound, pushDebugTimeline, teeth, updateActiveRef, updateParserContext]
  );

  const applyUndo = useCallback(() => {
    console.info('[Perio UI] undo requested');
    pushDebugTimeline('action', 'undo requested');
    const snapshot = historyStackRef.current.pop();

    if (!snapshot) {
      console.info('[Perio UI] undo target missing');
      flashFeedback({ kind: 'info', message: 'NOTHING TO UNDO' });
      return;
    }

    console.info('[Perio UI] undo target', {
      tooth: snapshot.currentTooth,
      surface: snapshot.currentSurface,
      siteIndex: snapshot.activeSiteIndex,
      parserMode: snapshot.parserMode,
      expectedInput: snapshot.expectedInput,
    });
    pushDebugTimeline('action', 'undo target', `tooth=${snapshot.currentTooth ?? 'null'} surface=${snapshot.currentSurface ?? 'null'}`);

    setTeeth(snapshot.teeth);
    setCurrentTooth(snapshot.currentTooth);
    setCurrentSurface(snapshot.currentSurface);
    setActiveSiteIndex(snapshot.activeSiteIndex);
    updateActiveRef(snapshot.currentTooth, snapshot.currentSurface, snapshot.activeSiteIndex);
    updateParserContext(snapshot.parserMode, snapshot.expectedInput);
    setLastPayload(snapshot.lastPayload);
    flashFeedback({ kind: 'undo', message: 'UNDO APPLIED' });
    playCommandSound('undo');
    pushDebugTimeline('action', 'undo applied', `restored tooth=${snapshot.currentTooth ?? 'null'}`);
    pushDebugTimeline('action', 'undo committed', `tooth=${snapshot.currentTooth ?? 'null'} surface=${snapshot.currentSurface ?? 'null'}`);
    console.info('[Perio UI] undo applied', {
      restoredTooth: snapshot.currentTooth,
      restoredSurface: snapshot.currentSurface,
      restoredSiteIndex: snapshot.activeSiteIndex,
    });
  }, [flashFeedback, playCommandSound, pushDebugTimeline, updateActiveRef, updateParserContext]);

  useEffect(() => {
    console.debug('[Perio UI] chart render triggered', {
      currentTooth,
      currentSurface,
      activeSiteIndex,
      updatedAt: currentTooth ? teeth[currentTooth]?.updatedAt ?? 0 : 0,
    });
  }, [activeSiteIndex, currentSurface, currentTooth, teeth]);

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

    const normalizedTranscript = latestFinal.text.trim().toLowerCase();

    console.info('[Perio UI] final transcript received', {
      rawTranscript: latestFinal.text,
      normalizedTranscript,
    });
    pushDebugTimeline('parser', 'final transcript received', latestFinal.text.trim());

    if (normalizedTranscript === 'undo') {
      applyUndo();
      setTranscriptEntries((previous) => [
        {
          id: `socket-undo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          text: latestFinal.text.trim(),
          timestamp: Date.now(),
          source: 'deepgram' as const,
          isFinal: true,
        },
        ...previous,
      ].slice(0, 12));
      return;
    }

    const payload = parseTranscriptToPayload(latestFinal.text, {
      mode: parserMode,
      expectedInput,
      currentTooth,
      currentSurface,
    });
    if (!payload) {
      // No clinical payload detected — still preserve the raw final transcript
      console.info('[Perio UI] final transcript (no payload)', { text: latestFinal.text });
      pushDebugTimeline('parser', 'no clinical payload', latestFinal.text.trim());

      setTranscriptEntries((previous) => {
        const nextEntry = {
          id: `socket-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          text: latestFinal.text.trim(),
          timestamp: Date.now(),
          source: 'deepgram' as const,
          isFinal: true,
        };

        return [nextEntry, ...previous].slice(0, 12);
      });

      return;
    }

    console.info('[Perio UI] parsed payload from final transcript', { payload });
    pushDebugTimeline('parser', 'raw transcript', latestFinal.text.trim());
    pushDebugTimeline('parser', 'normalized transcript', payload.normalizedTranscript || latestFinal.text.trim().toLowerCase());
    pushDebugTimeline(
      'parser',
      'tooth decision',
      typeof payload.tooth === 'number'
        ? `tooth=${payload.tooth}${payload.explicitTooth ? ' explicit' : ''}`
        : payload.command
          ? `command=${payload.command}`
          : payload.depth
            ? `depth-triplet=${payload.depth.join(',')}`
            : 'no tooth change'
    );
    pushDebugTimeline('parser', 'payload parsed', JSON.stringify(payload));

    if (payload.command === 'undo') {
      applyUndo();
      setTranscriptEntries((previous) => [
        {
          id: `socket-undo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          text: latestFinal.text.trim(),
          timestamp: Date.now(),
          source: 'deepgram' as const,
          isFinal: true,
        },
        ...previous,
      ].slice(0, 12));
      return;
    }

    if (payload.command === 'next' || payload.command === 'previous') {
      navigateTooth(payload.command);
      setTranscriptEntries((previous) => [
        {
          id: `socket-nav-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          text: latestFinal.text.trim(),
          timestamp: Date.now(),
          source: 'deepgram' as const,
          isFinal: true,
        },
        ...previous,
      ].slice(0, 12));
      return;
    }

    if (payload.explicitTooth && typeof payload.tooth === 'number' && !Array.isArray(payload.depth)) {
      selectTooth(payload.tooth, payload.surface ? (payload.surface as ToothSurface) : null);
      setTranscriptEntries((previous) => [
        {
          id: `socket-tooth-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          text: latestFinal.text.trim(),
          timestamp: Date.now(),
          source: 'deepgram' as const,
          isFinal: true,
        },
        ...previous,
      ].slice(0, 12));
      return;
    }

    if (payload.surface && !Array.isArray(payload.depth) && payload.tooth === undefined) {
      selectSurface(normalizeSurface(payload.surface));
      setTranscriptEntries((previous) => [
        {
          id: `socket-surface-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          text: latestFinal.text.trim(),
          timestamp: Date.now(),
          source: 'deepgram' as const,
          isFinal: true,
        },
        ...previous,
      ].slice(0, 12));
      return;
    }

    if (payload.tooth !== undefined && Array.isArray(payload.depth) && payload.depth.length === SITE_COUNT) {
      flashFeedback({
        kind: 'jump',
        message: `COMMIT TO TOOTH ${payload.tooth}`,
      });
      playCommandSound('chart');
    } else if (payload.bleeding) {
      flashFeedback({ kind: 'bleeding', message: 'BLEEDING SET' });
    }

    ingestPayload(
      payload,
      teeth,
      setTeeth,
      setTranscriptEntries,
      setLatencyMs,
      setLastPayload,
      setCurrentTooth,
      setCurrentSurface,
      setActiveSiteIndex,
      connectionState,
      parserMode,
      expectedInput,
      lastPayload,
      currentTooth,
      currentSurface,
      activeSiteIndex,
      updateActiveRef,
      updateParserContext,
      historyStackRef,
      flashFeedback,
      playCommandSound,
      pushDebugTimeline
    );
  }, [
    setTeeth,
    teeth,
    transcription.segments,
    connectionState,
    parserMode,
    expectedInput,
    currentTooth,
    currentSurface,
    activeSiteIndex,
    lastPayload,
    applyUndo,
    flashFeedback,
    playCommandSound,
    pushDebugTimeline,
    navigateTooth,
    selectTooth,
    selectSurface,
    updateActiveRef,
    updateParserContext,
  ]);

  useEffect(() => {
    if (!soundEnabled && audioContextRef.current) {
      void audioContextRef.current.suspend();
    }

    if (soundEnabled && audioContextRef.current?.state === 'suspended' && isUserAudioAllowed()) {
      void audioContextRef.current.resume();
    }
  }, [soundEnabled]);

  useEffect(() => {
    if (transcription.interimTranscript) {
      console.debug('[Perio UI] interim transcript update', transcription.interimTranscript);
    }
  }, [transcription.interimTranscript]);

  const transcriptionError = transcription.error;

  const debug = useMemo<PerioDebugState>(
    () => ({
      available: true,
      collapsed: debugCollapsed,
      finalTranscript: transcripts.find((entry) => entry.isFinal)?.text ?? '',
      interimTranscript: transcription.interimTranscript,
      stream: transcripts.map<PerioDebugStreamEntry>((entry) => ({
        id: entry.id,
        label: entry.isFinal ? 'FINAL' : 'INTERIM',
        text: entry.text,
        timestamp: entry.timestamp,
      })),
      parserState: {
        tooth: currentTooth,
        surface: currentSurface,
        mode: parserMode,
        expectedInput,
        status: transcriptionError ? 'error' : connectionState,
      },
      actionLog: debugTimeline.map((event) => `${event.message}${event.detail ? ` - ${event.detail}` : ''}`),
      timeline: debugTimeline,
    }),
    [
      connectionState,
      currentSurface,
      currentTooth,
      debugCollapsed,
      debugTimeline,
      expectedInput,
      parserMode,
      transcripts,
      transcription.interimTranscript,
      transcriptionError,
    ]
  );

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
      commandFeedback,
      soundEnabled,
      setSoundEnabled,
      startRecording: transcription.startRecording,
      stopRecording: transcription.stopRecording,
      debug,
      toggleDebugCollapsed: () => setDebugCollapsed((previous) => !previous),
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
      commandFeedback,
      soundEnabled,
      debug,
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
