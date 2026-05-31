import type { ClinicalRulesInput } from '../clinicalRules';
import type { PerioPayload, ToothSurface } from '../types';

export interface LiveClinicalRulesContext {
  transcript: string;
  payload: PerioPayload | null;
  currentTooth: number | null;
  currentSurface: ToothSurface | null;
}

const NUMBER_WORDS: Record<string, number> = {
  zero: 0,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  thirteen: 13,
  fourteen: 14,
  fifteen: 15,
  sixteen: 16,
  seventeen: 17,
  eighteen: 18,
  nineteen: 19,
  twenty: 20,
  thirty: 30,
  forty: 40,
  fifty: 50,
  sixty: 60,
  seventy: 70,
  eighty: 80,
  ninety: 90,
};

const RULE_TOKEN_WHITELIST = new Set([
  'tooth',
  'number',
  'jump',
  'go',
  'select',
  'move',
  'to',
  'buccal',
  'lingual',
  'palatal',
  'labial',
  'facial',
  'mesial',
  'distal',
  'middle',
  'mid',
  'bleeding',
  'missing',
  'implant',
  'healthy',
  'undo',
  'next',
  'previous',
  'skip',
  'resume',
  'recession',
  'recessed',
  'turn',
  'toward',
  'towards',
  'away',
  'from',
  'me',
]);

function tokenizeTranscript(transcript: string): string[] {
  return transcript
    .trim()
    .toLowerCase()
    .split(/[^a-z0-9]+/g)
    .filter(Boolean);
}

function parseNumberToken(token: string): number | null {
  if (token in NUMBER_WORDS) {
    return NUMBER_WORDS[token];
  }

  const parsed = Number.parseInt(token, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

function extractSurfaceCandidate(transcript: string): string | undefined {
  const cleaned = transcript.trim().toLowerCase();

  if (/^(turn\s+toward(?:s)?\s+me|toward(?:s)?\s+me)$/.test(cleaned)) {
    return 'buccal';
  }

  if (/^(turn\s+away|away\s+from\s+me)$/.test(cleaned)) {
    return 'lingual';
  }

  const surfaceMatch = cleaned.match(/\b(buccal|lingual|palatal|labial|facial)\b/);
  return surfaceMatch?.[1];
}

function extractToothCandidate(transcript: string): number | null {
  const cleaned = transcript.trim().toLowerCase();
  const navigationMatch = cleaned.match(/^(?:jump|go|select|move)\s+to\s+(.+)$/i);
  const toothMatch = cleaned.match(/\btooth(?:\s+number)?\s+(.+)$/i);
  const tail = navigationMatch?.[1] ?? toothMatch?.[1];

  if (!tail) {
    return null;
  }

  const tokens = tokenizeTranscript(tail);
  if (tokens.length === 0) {
    return null;
  }

  const first = parseNumberToken(tokens[0] ?? '');
  if (first === null) {
    return null;
  }

  if (tokens.length === 1) {
    return first;
  }

  const second = parseNumberToken(tokens[1] ?? '');
  if (second === null) {
    return first;
  }

  if (first >= 20 && first % 10 === 0 && second >= 1 && second <= 9) {
    return first + second;
  }

  return first;
}

function hasCommitContent(payload: PerioPayload | null): payload is PerioPayload & { depth: number[] } {
  if (!payload) {
    return false;
  }

  return Array.isArray(payload.depth);
}

export function buildLiveClinicalRulesInput(context: LiveClinicalRulesContext): ClinicalRulesInput | null {
  const rawTranscript = context.transcript.trim();

  if (!rawTranscript) {
    return null;
  }

  const payload = context.payload;
  const transcriptTokens = tokenizeTranscript(rawTranscript);
  const unexpectedTokens = transcriptTokens.filter((token) => !RULE_TOKEN_WHITELIST.has(token) && parseNumberToken(token) === null);
  const transcriptToothCandidate = extractToothCandidate(rawTranscript);
  const surfaceCandidate = payload?.surface ?? extractSurfaceCandidate(rawTranscript) ?? context.currentSurface ?? undefined;

  if (hasCommitContent(payload)) {
    return {
      tooth: typeof payload.tooth === 'number' ? payload.tooth : context.currentTooth ?? transcriptToothCandidate ?? undefined,
      surface: surfaceCandidate,
      depth: payload.depth,
      transcript: rawTranscript,
      normalizedTranscript: payload.normalizedTranscript ?? rawTranscript.toLowerCase(),
      parserAmbiguous: unexpectedTokens.length > 0,
      unexpectedTokens: unexpectedTokens.length > 0 ? unexpectedTokens : undefined,
    };
  }

  if (payload === null && transcriptToothCandidate !== null && (transcriptToothCandidate < 1 || transcriptToothCandidate > 32)) {
    return {
      tooth: transcriptToothCandidate,
      surface: surfaceCandidate,
      transcript: rawTranscript,
      normalizedTranscript: rawTranscript.toLowerCase(),
      parserAmbiguous: unexpectedTokens.length > 0,
      unexpectedTokens: unexpectedTokens.length > 0 ? unexpectedTokens : undefined,
    };
  }

  return null;
}