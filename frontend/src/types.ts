import type React from 'react';

export type ToothSurface = 'buccal' | 'lingual';

export type ToothMorphologyVariant =
  | 'incisor-central'
  | 'incisor-lateral'
  | 'canine-maxillary'
  | 'canine-mandibular'
  | 'premolar-first'
  | 'premolar-second'
  | 'molar-first'
  | 'molar-second'
  | 'molar-third';

export type ConnectionState = 'connecting' | 'connected' | 'listening' | 'reconnecting' | 'disconnected' | 'error';

export interface PerioPayload {
  tooth?: number;
  explicitTooth?: boolean;
  command?: 'bleeding' | 'missing' | 'implant' | 'undo' | 'next' | 'previous' | 'skip' | 'resume';
  surface?: string;
  depth?: number[];
  bleeding?: boolean;
  missing?: boolean;
  implant?: boolean;
  recession?: number | boolean;
  siteIndex?: number;
  advanceCursor?: boolean;
  toothCommitPending?: boolean;
  awaitingAdditionalFindings?: boolean;
  toothFinalized?: boolean;
  autoAdvanceBlocked?: boolean;
  autoAdvanceAllowed?: boolean;
  cursorDirection?: number;
  transcript?: string;
  normalizedTranscript?: string;
  timestamp?: number;
  type?: string;
}

export type CommandFeedbackKind = 'bleeding' | 'undo' | 'jump' | 'info';

export interface CommandFeedback {
  message: string;
  kind: CommandFeedbackKind;
}

export interface ToothSurfaceState {
  depth: [number, number, number];
  bleeding: boolean;
  siteIndex: number;
  updatedAt: number;
}

export interface ToothState {
  toothNumber: number;
  missing: boolean;
  implant: boolean;
  buccal: ToothSurfaceState;
  lingual: ToothSurfaceState;
  updatedAt: number;
}

export interface TranscriptEntry {
  id: string;
  text: string;
  timestamp: number;
  source: 'socket' | 'deepgram';
  isFinal?: boolean;
}

export interface PerioDebugStreamEntry {
  id: string;
  label: 'INTERIM' | 'FINAL' | 'SOCKET';
  text: string;
  timestamp: number;
}

export interface PerioDebugTimelineEvent {
  id: string;
  timestamp: number;
  message: string;
  detail?: string;
}

export interface PerioDebugParserState {
  tooth: number | null;
  surface: ToothSurface | null;
  mode: string;
  expectedInput: string;
  status: string;
}

export interface PerioDebugState {
  available: boolean;
  collapsed: boolean;
  finalTranscript: string;
  interimTranscript: string;
  stream: PerioDebugStreamEntry[];
  parserState: PerioDebugParserState;
  actionLog: string[];
  timeline: PerioDebugTimelineEvent[];
}

export type LiveTranscriptState = 'disconnected' | 'connecting' | 'connected' | 'listening' | 'reconnecting' | 'error';

export interface PerioChartContextValue {
  connectionState: ConnectionState;
  socketUrl: string;
  latencyMs: number | null;
  lastPayload: PerioPayload | null;
  currentTooth: number | null;
  currentSurface: ToothSurface | null;
  activeSiteIndex: number | null;
  transcripts: TranscriptEntry[];
  interimTranscript: string;
  isRecording: boolean;
  transcriptionError: string | null;
  commandFeedback: CommandFeedback | null;
  soundEnabled: boolean;
  setSoundEnabled: React.Dispatch<React.SetStateAction<boolean>>;
  unlockAudio: () => Promise<boolean>;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<void>;
  debug: PerioDebugState;
  toggleDebugCollapsed: () => void;
  teeth: Record<number, ToothState>;
}