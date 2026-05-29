import type React from 'react';

export type ToothSurface = 'buccal' | 'lingual';

export type ConnectionState = 'connecting' | 'connected' | 'listening' | 'reconnecting' | 'disconnected' | 'error';

export interface PerioPayload {
  tooth?: number;
  explicitTooth?: boolean;
  surface?: string;
  depth?: number[];
  bleeding?: boolean;
  missing?: boolean;
  implant?: boolean;
  command?: string;
  cursorDirection?: 'forward' | 'backward';
  advanceCursor?: boolean;
  siteIndex?: number;
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

export type DebugEventKind = 'transcript' | 'parser' | 'state' | 'action' | 'socket';

export interface DebugTranscriptEntry {
  id: string;
  text: string;
  timestamp: number;
  label: 'INTERIM' | 'FINAL';
}

export interface DebugTimelineEvent {
  id: string;
  timestamp: number;
  kind: DebugEventKind;
  message: string;
  detail?: string;
}

export interface DebugParserState {
  tooth: number | null;
  surface: ToothSurface | null;
  mode: string;
  expectedInput: string;
  status: string;
}

export interface DebugPanelState {
  available: boolean;
  collapsed: boolean;
  interimTranscript: string;
  finalTranscript: string;
  stream: DebugTranscriptEntry[];
  parserState: DebugParserState;
  actionLog: string[];
  timeline: DebugTimelineEvent[];
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
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<void>;
  teeth: Record<number, ToothState>;
  debug: DebugPanelState;
  toggleDebugCollapsed: () => void;
}