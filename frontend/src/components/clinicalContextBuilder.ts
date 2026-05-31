export type ClinicalAttachmentTarget = 'current_tooth' | 'last_committed_tooth' | 'current_surface' | 'none';

export interface ClinicalTripletContext {
  tooth: number;
  surface: string;
  siteIndex: number;
  depth: [number, number, number] | number[];
  timestamp?: number;
}

export interface ClinicalTranscriptHistoryEntry {
  text: string;
  timestamp?: number;
  source?: string;
}

export interface ClinicalContextBuildInput {
  deepgramTranscript: string;
  whisperTranscript: string;
  currentTooth?: number | null;
  lastCommittedTooth?: number | null;
  currentSurface?: string | null;
  lastTripletContext?: ClinicalTripletContext | null;
  recentTranscriptHistory?: ClinicalTranscriptHistoryEntry[];
  suspiciousReasons?: string[];
  parsedFindings?: string[];
  knownDentalTerms?: string[];
}

export interface TermCorrectionHint {
  from: string;
  to: string;
  reason: string;
}

export interface ClinicalContextAttachmentRecommendation {
  target: ClinicalAttachmentTarget;
  reason: string;
}

export interface ClinicalCorrectionContext {
  currentTooth: number | null;
  lastCommittedTooth: number | null;
  currentSurface: string | null;
  lastTripletContext: ClinicalTripletContext | null;
  recentTranscriptHistory: ClinicalTranscriptHistoryEntry[];
  suspiciousReasons: string[];
  parsedFindings: string[];
  knownDentalTerms: string[];
  termCorrectionHints: TermCorrectionHint[];
  recommendedAttachment: ClinicalContextAttachmentRecommendation;
}

const DEFAULT_DENTAL_TERMS = [
  'recession',
  'furcation',
  'implant',
  'bleeding',
  'healthy',
  'interproximal',
  'mesial',
  'distal',
  'buccal',
  'lingual',
  'palatal',
  'probing',
  'depth',
  'mobility',
  'exudate',
  'calculus',
  'gingiva',
  'periodontal',
  'tooth',
  'site',
];

const TERM_ALIAS_HINTS: Array<{ pattern: RegExp; to: string; reason: string }> = [
  { pattern: /\bresolution\b/i, to: 'recession', reason: 'phonetic dental dictation mismatch' },
  { pattern: /\bvacation\b/i, to: 'furcation', reason: 'phonetic dental dictation mismatch' },
  { pattern: /\binter\s+proximal\b/i, to: 'interproximal', reason: 'compound dental term normalization' },
];

function normalizeText(value: string): string {
  return value.trim().toLowerCase();
}

function toHistory(input?: ClinicalTranscriptHistoryEntry[]): ClinicalTranscriptHistoryEntry[] {
  if (!Array.isArray(input)) {
    return [];
  }

  return input
    .filter((entry) => entry && typeof entry.text === 'string' && entry.text.trim().length > 0)
    .slice(0, 5)
    .map((entry) => ({
      text: entry.text.trim(),
      timestamp: entry.timestamp,
      source: entry.source,
    }));
}

function inferFindings(input: ClinicalContextBuildInput): string[] {
  const provided = Array.isArray(input.parsedFindings)
    ? input.parsedFindings.filter((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0).map((entry) => entry.trim().toLowerCase())
    : [];

  if (provided.length > 0) {
    return provided;
  }

  const combined = [input.deepgramTranscript, input.whisperTranscript]
    .join(' ')
    .toLowerCase();

  return DEFAULT_DENTAL_TERMS.filter((term) => new RegExp(`\\b${term}\\b`, 'i').test(combined));
}

function buildTermHints(input: ClinicalContextBuildInput): TermCorrectionHint[] {
  const combined = `${input.deepgramTranscript} ${input.whisperTranscript}`;
  const hints: TermCorrectionHint[] = [];

  for (const alias of TERM_ALIAS_HINTS) {
    const match = combined.match(alias.pattern);

    if (!match) {
      continue;
    }

    hints.push({
      from: normalizeText(match[0]),
      to: alias.to,
      reason: alias.reason,
    });
  }

  return hints;
}

function recommendAttachment(input: ClinicalContextBuildInput): ClinicalContextAttachmentRecommendation {
  const deepgram = normalizeText(input.deepgramTranscript);
  const whisper = normalizeText(input.whisperTranscript);
  const combined = `${deepgram} ${whisper}`;

  const hasModifierFinding = /\b(recession|furcation|bleeding|implant|healthy|mobility|exudate)\b/i.test(combined);
  const hasTripletPattern = /\b\d\s*\d\s*\d\b/.test(combined) || /\b\d{3}\b/.test(combined);

  if (hasModifierFinding && input.lastCommittedTooth !== null && input.lastCommittedTooth !== undefined) {
    return {
      target: 'last_committed_tooth',
      reason: 'finding modifier should attach to previous committed tooth context',
    };
  }

  if (hasTripletPattern && input.currentTooth !== null && input.currentTooth !== undefined) {
    return {
      target: 'current_tooth',
      reason: 'triplet-like depth should attach to current probing tooth',
    };
  }

  if (input.currentSurface) {
    return {
      target: 'current_surface',
      reason: 'surface-level context is available without explicit tooth shift',
    };
  }

  return {
    target: 'none',
    reason: 'insufficient workflow context for deterministic attachment',
  };
}

export function buildClinicalCorrectionContext(input: ClinicalContextBuildInput): ClinicalCorrectionContext {
  console.info('CONTEXT_BUILD', {
    deepgramTranscript: input.deepgramTranscript,
    whisperTranscript: input.whisperTranscript,
    currentTooth: input.currentTooth ?? null,
    lastCommittedTooth: input.lastCommittedTooth ?? null,
    currentSurface: input.currentSurface ?? null,
  });

  const knownDentalTerms = Array.from(new Set([...(input.knownDentalTerms ?? []), ...DEFAULT_DENTAL_TERMS])).map(normalizeText);

  const context: ClinicalCorrectionContext = {
    currentTooth: input.currentTooth ?? null,
    lastCommittedTooth: input.lastCommittedTooth ?? null,
    currentSurface: input.currentSurface ?? null,
    lastTripletContext: input.lastTripletContext ?? null,
    recentTranscriptHistory: toHistory(input.recentTranscriptHistory),
    suspiciousReasons: (input.suspiciousReasons ?? []).map((entry) => entry.trim()).filter((entry) => entry.length > 0),
    parsedFindings: inferFindings(input),
    knownDentalTerms,
    termCorrectionHints: buildTermHints(input),
    recommendedAttachment: recommendAttachment(input),
  };

  console.info('DENTAL_CONTEXT_READY', context);
  return context;
}
