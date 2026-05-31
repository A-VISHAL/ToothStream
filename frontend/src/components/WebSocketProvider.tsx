import React, { createContext, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { evaluateClinicalSpeechIntent, parseTranscriptToPayload } from './transcriptParser';
import { useClinicalSoundManager, type ClinicalSoundTrigger, type ClinicalSoundType } from './useClinicalSoundManager';
import { useDeepgramTranscription } from './useDeepgramTranscription';
import type {
  AiVerificationRecord,
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
    healthy: false,
    recession: undefined,
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

type ParserMode = 'idle' | 'navigation' | 'probing';
type ParserExpectation = 'tooth' | 'surface' | 'depth-triplet';

interface ChartSnapshot {
  teeth: Record<number, ToothState>;
  currentTooth: number | null;
  currentSurface: ToothSurface | null;
  activeSiteIndex: number | null;
  lastPayload: PerioPayload | null;
  parserMode: ParserMode;
  expectedInput: ParserExpectation;
}

interface TripletContext {
  tooth: number;
  surface: ToothSurface;
  siteIndex: number;
  depth: [number, number, number];
  timestamp: number;
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

type FindingSound = 'acknowledgment' | 'commit';


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
  lastCommittedToothRef: React.MutableRefObject<number | null>,
  lastTripletContextRef: React.MutableRefObject<TripletContext | null>,
  implantContextActiveRef: React.MutableRefObject<boolean>,
  toothCommitPendingRef: React.MutableRefObject<boolean>,
  awaitingAdditionalFindingsRef: React.MutableRefObject<boolean>,
  logToothWorkflow: (event: 'AUTO_ADVANCE_BLOCKED' | 'WAITING_FOR_FINDINGS' | 'TOOTH_FINALIZED' | 'AUTO_ADVANCE_ALLOWED', detail: string) => void,
  historyStackRef: React.MutableRefObject<ChartSnapshot[]>,
  flashFeedback: (feedback: CommandFeedback) => void,
  playSound: (kind: ClinicalSoundType, trigger?: ClinicalSoundTrigger) => void,
  triggerClinicalSound: (sound: FindingSound, trigger: ClinicalSoundTrigger, reason: string) => void,
  pushDebugTimeline: (category: string, message: string, detail?: string) => void
) {
  const hydrated = hydratePayload(payload);
  const receivedAt = Date.now();
  const payloadTimestamp = hydrated.timestamp ?? receivedAt;
  const hasTriplet = Array.isArray(hydrated.depth) && hydrated.depth.length === SITE_COUNT && !hydrated.missing;
  const currentCommittedTooth = lastCommittedToothRef.current ?? fallbackTooth;
  const previousTripletContext = lastTripletContextRef.current;
  const shouldSnapshot =
    typeof hydrated.tooth === 'number' ||
    hasTriplet ||
    hydrated.bleeding === true ||
    hydrated.missing === true ||
    hydrated.implant === true ||
    typeof hydrated.surface === 'string' ||
    typeof hydrated.siteIndex === 'number';

  console.info('COMMIT_ATTEMPT', {
    tooth: hydrated.tooth ?? fallbackTooth,
    surface: hydrated.surface ?? fallbackSurface ?? 'buccal',
    siteIndex: hydrated.siteIndex ?? fallbackSiteIndex ?? 0,
    hasTriplet,
    toothCommitPending: toothCommitPendingRef.current,
    awaitingAdditionalFindings: awaitingAdditionalFindingsRef.current,
    currentCommittedTooth,
  });
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
    hydrated.healthy === true ||
    hydrated.recession !== undefined ||
    typeof hydrated.surface === 'string' ||
    typeof hydrated.siteIndex === 'number';

  const baseToothNumber = typeof hydrated.tooth === 'number' ? hydrated.tooth : currentCommittedTooth;
  const shouldAdvanceTriplet = hasTriplet && previousTripletContext && !implantContextActiveRef.current;
  const commitToothNumber = shouldAdvanceTriplet
    ? getNextToothInChartOrder(currentCommittedTooth ?? baseToothNumber ?? 1) ?? baseToothNumber
    : baseToothNumber;
  const toothWasImplant = commitToothNumber !== null ? currentTeeth[commitToothNumber]?.implant === true : false;
  const surface = normalizeSurface(hydrated.surface) ?? fallbackSurface ?? 'buccal';
  const siteIndex = clampSiteIndex(hydrated.siteIndex ?? fallbackSiteIndex ?? undefined);
  const explicitAdvance = hydrated.autoAdvanceAllowed === true || hydrated.missing === true || hydrated.command === 'next' || hydrated.command === 'previous';
  const workflowSignaled =
    hydrated.toothCommitPending === true ||
    hasChartSignal ||
    hasTriplet ||
    hydrated.bleeding === true ||
    hydrated.recession !== undefined ||
    hydrated.implant === true ||
    hydrated.healthy === true ||
    typeof hydrated.surface === 'string' ||
    typeof hydrated.siteIndex === 'number';
  const commandLabel =
    hydrated.command ?? (hydrated.missing ? 'missing' : hydrated.implant ? 'implant' : hydrated.bleeding ? 'bleeding' : 'depth-triplet');
  const cursorAction = explicitAdvance ? 'advance' : 'stay';
  const resolvedCursorTooth =
    commitToothNumber === null
      ? null
      : hydrated.missing
        ? getNextToothInChartOrder(commitToothNumber) ?? commitToothNumber
        : commitToothNumber;
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

  if (!hasChartSignal || commitToothNumber === null) {
    console.warn('COMMIT_BLOCKED', {
      reason: 'no actionable chart signal or no target tooth',
      hasChartSignal,
      toothNumber: commitToothNumber,
      hydrated,
    });
    pushDebugTimeline('parser', 'payload dropped', `tooth=${commitToothNumber ?? 'null'}`);

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

  console.info('CURRENT_TOOTH_CONTEXT', {
    currentCommittedTooth,
    lastTripletTooth: previousTripletContext?.tooth ?? null,
    currentCursor: fallbackTooth,
    incomingTriplet: hasTriplet,
    incomingModifier: !hasTriplet && (hydrated.bleeding === true || hydrated.recession !== undefined || hydrated.implant === true || hydrated.healthy === true || typeof hydrated.surface === 'string' || typeof hydrated.siteIndex === 'number'),
    implantContextActive: implantContextActiveRef.current,
  });

  if (workflowSignaled && !explicitAdvance) {
    toothCommitPendingRef.current = true;
    awaitingAdditionalFindingsRef.current = true;
    logToothWorkflow('AUTO_ADVANCE_BLOCKED', `tooth=${commitToothNumber ?? 'null'} command=${commandLabel}`);
    logToothWorkflow('WAITING_FOR_FINDINGS', `tooth=${commitToothNumber ?? 'null'} surface=${surface} siteIndex=${resolvedCursorSiteIndex}`);
  }

  if (explicitAdvance) {
    if (awaitingAdditionalFindingsRef.current) {
      logToothWorkflow('TOOTH_FINALIZED', `tooth=${fallbackTooth ?? commitToothNumber ?? 'null'} command=${commandLabel}`);
    }

    logToothWorkflow('AUTO_ADVANCE_ALLOWED', `tooth=${commitToothNumber ?? 'null'} command=${commandLabel}`);
    toothCommitPendingRef.current = false;
    awaitingAdditionalFindingsRef.current = false;
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
    toothNumber: commitToothNumber,
    surface,
    siteIndex: resolvedCursorSiteIndex,
    hasTriplet,
    bleeding: hydrated.bleeding === true,
    missing: hydrated.missing === true,
    implant: hydrated.implant === true,
  });
  pushDebugTimeline('chart', 'commit started', `tooth=${commitToothNumber} surface=${surface} triplet=${hasTriplet}`);
  console.info('[Perio UI] commit target', {
    toothNumber: commitToothNumber,
    surface,
    siteIndex: resolvedCursorSiteIndex,
    depth: hasTriplet ? hydrated.depth : null,
  });

  console.info('RENDER_TARGET', {
    tooth: commitToothNumber,
    surface,
    siteIndex: resolvedCursorSiteIndex,
    implantContextActive: implantContextActiveRef.current,
    shouldAdvanceTriplet,
  });

  if (shouldAdvanceTriplet && previousTripletContext) {
    console.info('PREVIOUS_TOOTH_FINALIZED', {
      tooth: previousTripletContext.tooth,
      surface: previousTripletContext.surface,
      siteIndex: previousTripletContext.siteIndex,
      depth: previousTripletContext.depth,
    });
    console.info('TRIPLET_TRIGGERED_ADVANCE', {
      fromTooth: previousTripletContext.tooth,
      toTooth: resolvedCursorTooth,
    });
    logToothWorkflow('TOOTH_FINALIZED', `tooth=${previousTripletContext.tooth} next=${resolvedCursorTooth}`);
  }

  if (!hasTriplet && (hydrated.bleeding === true || hydrated.recession !== undefined || hydrated.implant === true || hydrated.healthy === true || typeof hydrated.surface === 'string' || typeof hydrated.siteIndex === 'number')) {
    console.info('MODIFIER_ATTACH_SAME_TOOTH', {
      tooth: commitToothNumber,
      surface,
      siteIndex,
      modifier: hydrated.command ?? (hydrated.bleeding ? 'bleeding' : hydrated.implant ? 'implant' : hydrated.healthy ? 'healthy' : hydrated.recession !== undefined ? 'recession' : 'surface'),
    });
  }

  if (hydrated.implant === true) {
    console.info('IMPLANT_CONTEXT_ACTIVE', {
      tooth: commitToothNumber,
      surface,
      cursor: resolvedCursorTooth,
    });
    implantContextActiveRef.current = true;
    console.info('IMPLANT_HOLD', {
      tooth: commitToothNumber,
      surface,
    });
  }

  console.info('[Perio UI] implant cursor state', {
    implant: hydrated.implant === true || toothWasImplant,
    cursorBefore: {
      tooth: resolvedCursorTooth,
      surface,
      siteIndex: resolvedCursorSiteIndex,
    },
  });

  setCurrentTooth(resolvedCursorTooth);
  setCurrentSurface(surface);
  setActiveSiteIndex(resolvedCursorSiteIndex);
  updateActiveRef(resolvedCursorTooth, surface, resolvedCursorSiteIndex);
  lastCommittedToothRef.current = resolvedCursorTooth;

  if (hasTriplet && Array.isArray(hydrated.depth)) {
    lastTripletContextRef.current = {
      tooth: resolvedCursorTooth ?? commitToothNumber ?? currentCommittedTooth ?? 1,
      surface,
      siteIndex: resolvedCursorSiteIndex,
      depth: [hydrated.depth[0] ?? 0, hydrated.depth[1] ?? 0, hydrated.depth[2] ?? 0],
      timestamp: receivedAt,
    };
    implantContextActiveRef.current = false;
  }

  console.info('[Perio UI] state update queued', {
    toothNumber: commitToothNumber,
    surface,
    siteIndex: resolvedCursorSiteIndex,
    reusedFallback: typeof hydrated.tooth !== 'number',
  });
  pushDebugTimeline('state', 'state update queued', `tooth=${resolvedCursorTooth} surface=${surface}`);

  // Also push a debug transcript entry with the JSON payload for end-to-end visibility
  setTranscriptEntries((previous) => {
    const nextEntry = {
      id: `socket-json-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      text: JSON.stringify({ tooth: commitToothNumber, surface, depth: hydrated.depth ?? null, siteIndex }),
      timestamp: Date.now(),
      source: 'socket' as const,
      isFinal: true,
    };

    return [nextEntry, ...previous].slice(0, 12);
  });

  setTeeth((previous) => {
    console.info('CHART_WRITE', {
      toothNumber: commitToothNumber,
      surface,
      hasTriplet,
      siteIndex,
      depth: hydrated.depth ?? null,
    });
    const target = previous[commitToothNumber] ?? {
      toothNumber: commitToothNumber,
      missing: false,
      implant: false,
      buccal: createSurfaceState(),
      lingual: createSurfaceState(),
      updatedAt: 0,
    };

    const nextTeeth = { ...previous };
    const nextTooth = { ...target };

    console.info('[Perio UI] before merge', {
    toothNumber: commitToothNumber,
      surface,
      missing: nextTooth.missing,
      implant: nextTooth.implant,
      buccal: nextTooth.buccal,
      lingual: nextTooth.lingual,
    });
    console.info('[Perio UI] implant before merge', {
      toothNumber: commitToothNumber,
      implant: nextTooth.implant,
    });

    if (hydrated.missing === true) {
      nextTooth.missing = true;
      nextTooth.implant = false;
    } else if (hydrated.missing === false) {
      nextTooth.missing = false;
    }

    if (hydrated.implant === true) {
      nextTooth.implant = true;
      nextTooth.missing = false;
      console.info('IMPLANT_ATTACH', {
        tooth: commitToothNumber,
        surface,
      });
      triggerClinicalSound('acknowledgment', 'manual', 'implant attach');
    } else if (hydrated.implant === false) {
      nextTooth.implant = false;
    }

    if (hydrated.healthy === true) {
      nextTooth[surface] = {
        ...nextTooth[surface],
        healthy: true,
        bleeding: false,
        updatedAt: receivedAt,
      };
      console.info('HEALTHY_COMMIT', {
        tooth: commitToothNumber,
        surface,
      });
      triggerClinicalSound('acknowledgment', 'manual', 'healthy commit');
      console.info('HEALTHY_RENDER', {
        tooth: commitToothNumber,
        surface,
      });
    }

    if (hydrated.bleeding === true) {
      nextTooth[surface] = {
        ...nextTooth[surface],
        bleeding: true,
        healthy: false,
        updatedAt: receivedAt,
      };
    }

    if (hydrated.recession !== undefined) {
      nextTooth[surface] = {
        ...nextTooth[surface],
        recession: hydrated.recession,
        updatedAt: receivedAt,
      };
      console.info('RECESSION_COMMIT', {
        tooth: commitToothNumber,
        surface,
        recession: hydrated.recession,
      });
      triggerClinicalSound('commit', 'manual', 'recession commit');
      console.info('RECESSION_RENDER', {
        tooth: commitToothNumber,
        surface,
        recession: hydrated.recession,
      });
    }

    if (hasTriplet && Array.isArray(hydrated.depth)) {
      console.info('TRIPLET_COMMIT', {
        tooth: commitToothNumber,
        surface,
        depth: hydrated.depth,
      });
      nextTooth[surface] = {
        ...nextTooth[surface],
        depth: [hydrated.depth[0] ?? 0, hydrated.depth[1] ?? 0, hydrated.depth[2] ?? 0],
        bleeding: nextTooth[surface].bleeding || Boolean(hydrated.bleeding),
        siteIndex,
        updatedAt: receivedAt,
      };

      if (toothWasImplant || nextTooth.implant === true) {
        nextTooth.implant = true;
      }
    }

    nextTooth.updatedAt = receivedAt;
    nextTeeth[commitToothNumber] = nextTooth;

    console.info('[Perio UI] tooth state updated', {
      toothNumber: commitToothNumber,
      surface,
      depth: nextTooth[surface].depth,
      bleeding: nextTooth[surface].bleeding,
      implant: nextTooth.implant,
      depthVisible: nextTooth[surface].depth.some((value) => value > 0),
    });
    pushDebugTimeline('action', 'tooth state updated', `tooth=${commitToothNumber} surface=${surface}`);
    pushDebugTimeline('chart', 'chart updated', `tooth=${commitToothNumber} surface=${surface} bleeding=${nextTooth[surface].bleeding}`);
    console.info('[Perio UI] chart state updated', {
      toothNumber: commitToothNumber,
      surface,
      siteIndex,
      depth: nextTooth[surface].depth,
      depthVisible: nextTooth[surface].depth.some((value) => value > 0),
    });

    console.info('FINDING_RENDER_CHECK', {
      tooth: commitToothNumber,
      surface,
      bleeding: nextTooth[surface].bleeding,
      healthy: nextTooth[surface].healthy,
      recession: nextTooth[surface].recession,
      implant: nextTooth.implant,
    });

    if (typeof nextTooth[surface].recession !== 'undefined' && nextTooth[surface].recession !== false) {
      console.info('RECESSION_RENDER', {
        tooth: commitToothNumber,
        surface,
        recession: nextTooth[surface].recession,
      });
    }

    if (hasTriplet && Array.isArray(hydrated.depth)) {
      console.info('[Perio UI] after merge', {
        toothNumber: commitToothNumber,
        surface,
        implantPersisted: nextTooth.implant === true,
        bleedingPersisted: nextTooth[surface].bleeding === true,
        mergedSurface: nextTooth[surface],
      });
      console.info('[Perio UI] implant after merge', {
        toothNumber: commitToothNumber,
        implant: nextTooth.implant,
      });
      pushDebugTimeline('chart', 'surface merged', `tooth=${commitToothNumber} surface=${surface}`);
      pushDebugTimeline('chart', `implant persisted=${nextTooth.implant === true}`, `tooth=${commitToothNumber}`);
      pushDebugTimeline('chart', `bleeding persisted=${nextTooth[surface].bleeding === true}`, `surface=${surface}`);
      console.info('[Perio UI] triplet committed', {
        tooth: commitToothNumber,
        surface,
        depth: nextTooth[surface].depth,
      });
      console.info('TOOTH_STATE_AFTER', {
        toothNumber: commitToothNumber,
        surface,
        state: nextTooth[surface],
      });
      console.info('COMMIT_SUCCESS', {
        toothNumber: commitToothNumber,
        surface,
        siteIndex,
        depth: nextTooth[surface].depth,
      });
      console.info('[Perio UI] commit complete', {
        implant: nextTooth.implant,
        cursorBefore: {
          tooth: commitToothNumber,
          surface,
          siteIndex,
        },
        cursorAfter: {
          tooth: getNextToothInChartOrder(commitToothNumber) ?? commitToothNumber,
          surface,
          siteIndex: 0,
        },
        advanceTriggered: true,
      });
      triggerClinicalSound('commit', 'triplet_commit', 'triplet commit');
    }

    if (!hasTriplet && (hydrated.missing === true || hydrated.implant === true)) {
      void playSound('acknowledgment', 'missing_implant');
    }

    return nextTeeth;
  });

  updateParserContext('probing', 'depth-triplet');

  if (hydrated.bleeding) {
    flashFeedback({ kind: 'bleeding', message: 'BLEEDING SET' });
    playSound('bleeding', 'bleeding_true');
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
  const [aiVerificationRecords] = useState<AiVerificationRecord[]>([]);
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
  const lastCommittedToothRef = useRef<number | null>(1);
  const lastTripletContextRef = useRef<TripletContext | null>(null);
  const implantContextActiveRef = useRef(false);
  const toothCommitPendingRef = useRef(false);
  const awaitingAdditionalFindingsRef = useRef(false);
  const historyStackRef = useRef<ChartSnapshot[]>([]);
  const feedbackTimerRef = useRef<number | null>(null);
  const { playSound, unlockAudio } = useClinicalSoundManager(soundEnabled);

 
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

  const triggerClinicalSound = useCallback(
    (sound: FindingSound, trigger: ClinicalSoundTrigger, reason: string) => {
      console.info('SOUND_TRIGGER', { sound, trigger, reason });
      void playSound(sound, trigger).then((success) => {
        console.info('SOUND_PLAY_SUCCESS', { sound, trigger, success, reason });
      });
    },
    [playSound]
  );

  const logToothWorkflow = useCallback(
    (event: 'AUTO_ADVANCE_BLOCKED' | 'WAITING_FOR_FINDINGS' | 'TOOTH_FINALIZED' | 'AUTO_ADVANCE_ALLOWED', detail: string) => {
      console.info(`[Perio UI] ${event}`, detail);
      pushDebugTimeline('parser', event, detail);
    },
    [pushDebugTimeline]
  );

  const selectTooth = useCallback(
    (tooth: number, surface?: ToothSurface | null) => {
      const toothChanged = currentTooth !== null && currentTooth !== tooth;

      if (toothChanged && awaitingAdditionalFindingsRef.current) {
        logToothWorkflow('TOOTH_FINALIZED', `tooth=${currentTooth} -> tooth=${tooth}`);
      }

      snapshotChartState(historyStackRef, teeth, currentTooth, currentSurface, activeSiteIndex, lastPayload, parserMode, expectedInput);
      setCurrentTooth(tooth);
      setCurrentSurface(surface ?? null);
      setActiveSiteIndex(surface ? 0 : null);
      updateActiveRef(tooth, surface ?? null, surface ? 0 : null);
      lastCommittedToothRef.current = tooth;
      implantContextActiveRef.current = false;
      updateParserContext('navigation', surface ? 'depth-triplet' : 'surface');
      toothCommitPendingRef.current = true;
      awaitingAdditionalFindingsRef.current = true;
      if (toothChanged) {
        logToothWorkflow('WAITING_FOR_FINDINGS', `tooth=${tooth} surface=${surface ?? 'null'}`);
      }
      pushDebugTimeline('state', 'tooth selected', `tooth=${tooth} surface=${surface ?? 'null'}`);
      playSound('navigation', 'select_tooth');
    },
    [activeSiteIndex, currentSurface, currentTooth, expectedInput, historyStackRef, lastPayload, logToothWorkflow, parserMode, playSound, teeth, updateActiveRef, updateParserContext, pushDebugTimeline]
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
      lastCommittedToothRef.current = currentTooth;
      implantContextActiveRef.current = false;
      updateParserContext('probing', 'depth-triplet');
      toothCommitPendingRef.current = true;
      awaitingAdditionalFindingsRef.current = true;
      logToothWorkflow('WAITING_FOR_FINDINGS', `tooth=${currentTooth} surface=${surface}`);
      pushDebugTimeline('state', 'surface selected', `tooth=${currentTooth} surface=${surface}`);
      playSound('navigation', 'select_surface');
    },
    [activeSiteIndex, currentSurface, currentTooth, expectedInput, historyStackRef, lastPayload, logToothWorkflow, parserMode, playSound, teeth, updateActiveRef, updateParserContext, pushDebugTimeline]
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

      if (awaitingAdditionalFindingsRef.current) {
        logToothWorkflow('TOOTH_FINALIZED', `tooth=${currentTooth} direction=${direction}`);
      }

      logToothWorkflow('AUTO_ADVANCE_ALLOWED', `direction=${direction} from=${currentTooth} to=${nextTooth}`);

      snapshotChartState(historyStackRef, teeth, currentTooth, currentSurface, activeSiteIndex, lastPayload, parserMode, expectedInput);
      setCurrentTooth(nextTooth);
      setActiveSiteIndex(currentSurface ? 0 : null);
      updateActiveRef(nextTooth, currentSurface, currentSurface ? 0 : null);
      lastCommittedToothRef.current = nextTooth;
      implantContextActiveRef.current = false;
      updateParserContext('navigation', currentSurface ? 'depth-triplet' : 'surface');
      toothCommitPendingRef.current = true;
      awaitingAdditionalFindingsRef.current = true;
      pushDebugTimeline('command', direction, `tooth=${nextTooth} surface=${currentSurface ?? 'null'}`);
      flashFeedback({ kind: 'jump', message: `${direction.toUpperCase()} TO TOOTH ${nextTooth}` });
      playSound('navigation', direction === 'next' ? 'cursor_jump' : 'go_to');
    },
    [activeSiteIndex, currentSurface, currentTooth, expectedInput, flashFeedback, historyStackRef, lastPayload, logToothWorkflow, parserMode, playSound, pushDebugTimeline, teeth, updateActiveRef, updateParserContext]
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
    lastCommittedToothRef.current = snapshot.currentTooth;
    implantContextActiveRef.current = false;
    updateParserContext(snapshot.parserMode, snapshot.expectedInput);
    setLastPayload(snapshot.lastPayload);
    flashFeedback({ kind: 'undo', message: 'UNDO APPLIED' });
    playSound('undo', 'undo');
    pushDebugTimeline('action', 'undo applied', `restored tooth=${snapshot.currentTooth ?? 'null'}`);
    pushDebugTimeline('action', 'undo committed', `tooth=${snapshot.currentTooth ?? 'null'} surface=${snapshot.currentSurface ?? 'null'}`);
    console.info('[Perio UI] undo applied', {
      restoredTooth: snapshot.currentTooth,
      restoredSurface: snapshot.currentSurface,
      restoredSiteIndex: snapshot.activeSiteIndex,
    });
  }, [flashFeedback, playSound, pushDebugTimeline, updateActiveRef, updateParserContext]);

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

    const resolvedCurrentTooth = currentTooth ?? lastActiveToothRef.current;
    const resolvedCurrentSurface = currentSurface ?? lastActiveSurfaceRef.current;
    const resolvedActiveSiteIndex = activeSiteIndex ?? lastActiveSiteIndexRef.current;

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

    const speechFilter = evaluateClinicalSpeechIntent(latestFinal.text, {
      mode: parserMode,
      expectedInput,
      currentTooth: resolvedCurrentTooth,
      currentSurface: resolvedCurrentSurface,
    });

    console.info('[Perio UI] clinical speech filter', {
      RAW: latestFinal.text.trim(),
      clinical_score: speechFilter.clinicalScore,
      intent_detected: speechFilter.intent,
      action: speechFilter.shouldProcess ? 'processed' : 'ignored_non_clinical',
      reason: speechFilter.reason,
    });
    pushDebugTimeline(
      'parser',
      speechFilter.shouldProcess ? 'clinical intent detected' : 'ignored_non_clinical',
      `score=${speechFilter.clinicalScore} intent=${speechFilter.intent} reason=${speechFilter.reason}`
    );

    if (!speechFilter.shouldProcess) {
      setTranscriptEntries((previous) => {
        const nextEntry = {
          id: `socket-noise-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          text: latestFinal.text.trim(),
          timestamp: Date.now(),
          source: 'deepgram' as const,
          isFinal: true,
        };

        return [nextEntry, ...previous].slice(0, 12);
      });

      return;
    }

    const payload = parseTranscriptToPayload(latestFinal.text, {
      mode: parserMode,
      expectedInput,
      currentTooth: resolvedCurrentTooth,
      currentSurface: resolvedCurrentSurface,
    });

    if (payload && (payload.surface !== undefined || payload.siteIndex !== undefined)) {
      console.info('[Perio UI] surface state command', {
        RAW: latestFinal.text.trim(),
        NORMALIZED: payload.normalizedTranscript,
        SURFACE_MATCH: speechFilter.surfaceMatch,
        ACTION: payload.surface ? `surface=${payload.surface}` : `siteIndex=${payload.siteIndex}`,
        STATE: {
          surface: resolvedCurrentSurface,
          siteIndex: resolvedActiveSiteIndex,
        },
      });
      pushDebugTimeline(
        'state',
        'surface command',
        payload.surface ? `surface=${payload.surface}` : `siteIndex=${payload.siteIndex}`
      );
    }

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
      resolvedCurrentTooth,
      resolvedCurrentSurface,
      resolvedActiveSiteIndex,
      updateActiveRef,
      updateParserContext,
      lastCommittedToothRef,
      lastTripletContextRef,
      implantContextActiveRef,
      toothCommitPendingRef,
      awaitingAdditionalFindingsRef,
      logToothWorkflow,
      historyStackRef,
      flashFeedback,
      playSound,
      triggerClinicalSound,
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
    playSound,
    triggerClinicalSound,
    pushDebugTimeline,
    navigateTooth,
    selectTooth,
    selectSurface,
    logToothWorkflow,
    updateActiveRef,
    updateParserContext,
  ]);

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
      unlockAudio,
      startRecording: transcription.startRecording,
      stopRecording: transcription.stopRecording,
      debug,
      toggleDebugCollapsed: () => setDebugCollapsed((previous) => !previous),
      teeth,
      aiVerificationRecords,
    }),
    [
      activeSiteIndex,
      aiVerificationRecords,
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
      unlockAudio,
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
