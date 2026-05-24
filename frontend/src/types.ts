export type ToothSurface = 'buccal' | 'lingual';

export type ConnectionState = 'connecting' | 'connected' | 'mock' | 'disconnected' | 'error';

export interface PerioPayload {
  tooth?: number;
  surface?: string;
  depth?: number[];
  bleeding?: boolean;
  missing?: boolean;
  implant?: boolean;
  siteIndex?: number;
  transcript?: string;
  timestamp?: number;
  type?: string;
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
  source: 'socket' | 'mock';
}

export interface PerioChartContextValue {
  connectionState: ConnectionState;
  isMockStream: boolean;
  socketUrl: string;
  latencyMs: number | null;
  lastPayload: PerioPayload | null;
  currentTooth: number | null;
  currentSurface: ToothSurface | null;
  activeSiteIndex: number | null;
  transcripts: TranscriptEntry[];
  teeth: Record<number, ToothState>;
}