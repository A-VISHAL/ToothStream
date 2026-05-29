import React, { createContext, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { parseTranscriptToPayload } from './transcriptParser';
import { useDeepgramTranscription } from './useDeepgramTranscription';
import type {
  CommandFeedback,
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
  const nav = window.navigator as Navigator & { userActivation?: { hasBeenActive: boolean } };
  return typeof window !== 'undefined' && nav.userActivation?.hasBeenActive === true;
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

function getNextCursorAfterCommit(tooth: number): { tooth: number | null; surface: ToothSurface; siteIndex: number } {
  return {
    tooth: getNextToothInChartOrder(tooth),
    surface: 'buccal',
    siteIndex: 0,
  };
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
  setActiveSiteIndex: React.Dispatch<React.SetStateAction<number | null>>,
  previousPayload: PerioPayload | null,
  fallbackTooth: number | null,
  fallbackSurface: ToothSurface | null,
  fallbackSiteIndex: number | null,
  updateActiveRef: (tooth: number | null, surface: ToothSurface | null, siteIndex: number | null) => void,
  historyStackRef: React.MutableRefObject<ChartSnapshot[]>,
  flashFeedback: (feedback: CommandFeedback) => void,
  playCommandSound: (kind: SoundTone) => void
) {
  const hydrated = hydratePayload(payload);
  const receivedAt = Date.now();
  const payloadTimestamp = hydrated.timestamp ?? receivedAt;

  console.info('[Perio UI] payload received', hydrated);

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

  if (!hasChartSignal || toothNumber === null) {
    console.warn('[Perio UI] dropping payload — no actionable chart signal or no target tooth', {
      hasChartSignal,
      toothNumber,
      hydrated,
    });

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

  console.info('[Perio UI] cursor before triplet', {
    currentTooth: fallbackTooth,
    currentSurface: fallbackSurface,
    currentSiteIndex: fallbackSiteIndex,
    resolvedTooth: toothNumber,
    resolvedSurface: surface,
    resolvedSiteIndex: siteIndex,
  });

    const shouldCommitDepths = Array.isArray(hydrated.depth) && hydrated.depth.length === SITE_COUNT;
    const explicitTooth = typeof hydrated.tooth === 'number';
    const navigationCommands = new Set(['skip', 'resume', 'next', 'previous']);

    // If caller explicitly selected a tooth (e.g. "tooth 5") without providing
    // a triplet, treat this as a selection for subsequent probing rather than as
    // a commit that advances the cursor. This prevents accidental cursor advances
    // and enables expectation-based parsing for the next final transcript.
    if (explicitTooth && !shouldCommitDepths && !hydrated.command) {
      console.info('[Perio UI] explicit tooth selection — setting active tooth (no commit)', { toothNumber, surface, siteIndex });

      setCurrentTooth(toothNumber);
      setCurrentSurface(surface);
      setActiveSiteIndex(siteIndex);
      updateActiveRef(toothNumber, surface, siteIndex);

      // Still record the selection in the transcript list for visibility.
      setTranscriptEntries((previous) => {
        const nextEntry = {
          id: `socket-select-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          text: hydrated.transcript?.trim() || `Select tooth ${toothNumber}`,
          timestamp: Date.now(),
          source: 'socket' as const,
          isFinal: true,
        };

        return [nextEntry, ...previous].slice(0, 12);
      });

      return;
    }

    // If a triplet is present, commit it to the resolved tooth (explicit or fallback).
    if (shouldCommitDepths) {
      const nextCursor = getNextCursorAfterCommit(toothNumber);

      console.info('[Perio UI] state update queued (commit)', {
        toothNumber,
        surface,
        siteIndex,
        reusedFallback: typeof hydrated.tooth !== 'number',
        nextCursor,
      });

      // Only advance the cursor after a committed triplet
      setCurrentTooth(nextCursor.tooth);
      setCurrentSurface(nextCursor.surface);
      setActiveSiteIndex(nextCursor.siteIndex);
      updateActiveRef(nextCursor.tooth, nextCursor.surface, nextCursor.siteIndex);
    }

    // Handle navigation commands that explicitly request cursor moves even when
    // no triplet is present.
    if (!shouldCommitDepths && hydrated.command && navigationCommands.has(hydrated.command)) {
      const cmdNextCursor = getNextCursorAfterCommit(toothNumber);
      console.info('[Perio UI] navigation command — advancing cursor', { command: hydrated.command, cmdNextCursor });

      setCurrentTooth(cmdNextCursor.tooth);
      setCurrentSurface(cmdNextCursor.surface);
      setActiveSiteIndex(cmdNextCursor.siteIndex);
      updateActiveRef(cmdNextCursor.tooth, cmdNextCursor.surface, cmdNextCursor.siteIndex);
    }

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

    if (shouldCommitDepths) {
      historyStackRef.current.push({
        teeth: cloneTeethState(previous),
        currentTooth: fallbackTooth,
        currentSurface: fallbackSurface,
        activeSiteIndex: fallbackSiteIndex,
        lastPayload: previousPayload,
      });
    }

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

    if (Array.isArray(hydrated.depth) && hydrated.depth.length === SITE_COUNT) {
      console.info('[Perio UI] triplet committed', {
        tooth: toothNumber,
        surface,
        depth: nextTooth[surface].depth,
      });
    }

    return nextTeeth;
  });

  // Log cursor advance only when a commit or explicit navigation occurred
  const loggedNextCursor = (shouldCommitDepths || (hydrated.command && new Set(['skip', 'resume', 'next', 'previous']).has(hydrated.command)))
    ? getNextCursorAfterCommit(toothNumber)
    : null;

  if (loggedNextCursor) {
    console.info('[Perio UI] advance cursor', {
      fromTooth: toothNumber,
      toTooth: loggedNextCursor.tooth,
      toSurface: loggedNextCursor.surface,
      toSiteIndex: loggedNextCursor.siteIndex,
    });
  }

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
  const processedTranscriptIdsRef = useRef<Set<string>>(new Set());
  const lastActiveToothRef = useRef<number | null>(1);
  const lastActiveSurfaceRef = useRef<ToothSurface | null>('buccal');
  const lastActiveSiteIndexRef = useRef<number | null>(0);
  const historyStackRef = useRef<ChartSnapshot[]>([]);
  const feedbackTimerRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  const updateActiveRef = (tooth: number | null, surface: ToothSurface | null, siteIndex: number | null) => {
    lastActiveToothRef.current = tooth;
    lastActiveSurfaceRef.current = surface;
    lastActiveSiteIndexRef.current = siteIndex;
  };

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

  const applyUndo = useCallback(() => {
    const snapshot = historyStackRef.current.pop();

    if (!snapshot) {
      flashFeedback({ kind: 'info', message: 'NOTHING TO UNDO' });
      return;
    }

    setTeeth(snapshot.teeth);
    setCurrentTooth(snapshot.currentTooth);
    setCurrentSurface(snapshot.currentSurface);
    setActiveSiteIndex(snapshot.activeSiteIndex);
    updateActiveRef(snapshot.currentTooth, snapshot.currentSurface, snapshot.activeSiteIndex);
    setLastPayload(snapshot.lastPayload);
    flashFeedback({ kind: 'undo', message: 'UNDO APPLIED' });
    playCommandSound('undo');
    console.info('[Perio UI] undo applied', {
      restoredTooth: snapshot.currentTooth,
      restoredSurface: snapshot.currentSurface,
      restoredSiteIndex: snapshot.activeSiteIndex,
    });
  }, [flashFeedback]);

  useEffect(() => {
    console.debug('[Perio UI] chart rerendered', {
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

    const payload = parseTranscriptToPayload(latestFinal.text);
    if (!payload) {
      // No clinical payload detected — still preserve the raw final transcript
      console.info('[Perio UI] final transcript (no payload)', { text: latestFinal.text });

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

    if (payload.tooth !== undefined && Array.isArray(payload.depth) && payload.depth.length === SITE_COUNT) {
      flashFeedback({
        kind: 'jump',
        message: `JUMP TO TOOTH ${payload.tooth}`,
      });
      playCommandSound('jump');
    } else if (payload.tooth !== undefined && payload.explicitTooth === true && !Array.isArray(payload.depth)) {
      // Explicit selection without depths — provide jump feedback but do not
      // treat this as a committed triplet.
      flashFeedback({ kind: 'jump', message: `SELECT TOOTH ${payload.tooth}` });
      playCommandSound('jump');
    } else if (payload.bleeding) {
      flashFeedback({ kind: 'bleeding', message: 'BLEEDING SET' });
    }

    ingestPayload(
      payload,
      setTeeth,
      setTranscriptEntries,
      setLatencyMs,
      setLastPayload,
      setCurrentTooth,
      setCurrentSurface,
      setActiveSiteIndex,
      lastPayload,
      currentTooth,
      currentSurface,
      activeSiteIndex,
      updateActiveRef,
      historyStackRef,
      flashFeedback,
      playCommandSound
    );
  }, [setTeeth, transcription.segments, currentTooth, currentSurface, activeSiteIndex, lastPayload, applyUndo, flashFeedback, playCommandSound]);

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
