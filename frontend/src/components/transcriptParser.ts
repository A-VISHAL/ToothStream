import type { PerioPayload, ToothSurface } from '../types';

type ParserMode = 'idle' | 'navigation' | 'probing';

type ParserExpectation = 'tooth' | 'surface' | 'depth-triplet';

export interface TranscriptParseContext {
  mode: ParserMode;
  expectedInput: ParserExpectation;
  currentTooth?: number | null;
  currentSurface?: ToothSurface | null;
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
};

const TENS_WORDS: Record<string, number> = {
  twenty: 20,
  thirty: 30,
};

const HOMOPHONE_NORMALIZATIONS: Record<string, string> = {
  won: 'one',
  for: 'four',
  free: 'three',
  toof: 'tooth',
  teeth: 'tooth',
  tooths: 'tooth',
  toothh: 'tooth',
  sevn: 'seven',
  thru: 'three',
  through: 'three',
  tree: 'three',
  twos: 'tooth',
};

function normalizeWord(word: string): string {
  return HOMOPHONE_NORMALIZATIONS[word.toLowerCase()] ?? word.toLowerCase();
}

function tokenize(transcript: string): string[] {
  return transcript
    .trim()
    .split(/[^a-z0-9]+/gi)
    .filter(Boolean)
    .map(normalizeWord);
}

function normalizeClinicalTranscript(transcript: string): string {
  return transcript
    .trim()
    .toLowerCase()
    .replace(/\btwo\s+to\b/g, 'tooth')
    .replace(/\btooth\s+number\b/g, 'tooth')
    .replace(/\btoothh\b/g, 'tooth')
    .replace(/\btoof\b/g, 'tooth')
    .replace(/\bteeth\b/g, 'tooth')
    .replace(/\btwos\b/g, 'tooth')
    .replace(/\btooths\b/g, 'tooth')
    .replace(/\s+/g, ' ');
}

function parseNumberToken(token: string): number | null {
  const lowered = token.toLowerCase();

  if (lowered in NUMBER_WORDS) {
    return NUMBER_WORDS[lowered];
  }

  const parsed = Number.parseInt(lowered, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

function parseToothNumberTokens(tokens: string[]): { tooth: number | null; consumed: number } {
  if (tokens.length === 0) {
    return { tooth: null, consumed: 0 };
  }

  const first = tokens[0]?.toLowerCase();
  const second = tokens[1]?.toLowerCase();

  if (first && first in NUMBER_WORDS) {
    return { tooth: NUMBER_WORDS[first], consumed: 1 };
  }

  if (first && first in TENS_WORDS) {
    const base = TENS_WORDS[first];
    if (!second) {
      return { tooth: base, consumed: 1 };
    }

    if (second in NUMBER_WORDS && NUMBER_WORDS[second] >= 1 && NUMBER_WORDS[second] <= 9) {
      return { tooth: base + NUMBER_WORDS[second], consumed: 2 };
    }

    return { tooth: base, consumed: 1 };
  }

  const parsed = parseNumberToken(first ?? '');
  if (parsed !== null) {
    return { tooth: parsed, consumed: 1 };
  }

  return { tooth: null, consumed: 0 };
}

function describeToothNumber(tooth: number | null, explicitTooth: boolean): string {
  if (typeof tooth !== 'number') {
    return 'tooth=null';
  }

  return `tooth=${tooth}${explicitTooth ? ' explicit' : ''}`;
}

function parseDepthTriplet(tokens: string[]): number[] | undefined {
  if (tokens.length === 1) {
    const token = tokens[0] ?? '';

    if (/^\d{3}$/.test(token)) {
      return token.split('').map((digit) => Number.parseInt(digit, 10));
    }
  }

  const values = tokens.map(parseNumberToken).filter((value): value is number => value !== null);

  if (values.length !== 3) {
    return undefined;
  }

  return [values[0], values[1], values[2]];
}

function extractTooth(tokens: string[], context?: TranscriptParseContext): number | undefined {
  const expectedToothSelection = context?.mode !== 'probing' && context?.expectedInput !== 'depth-triplet';

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];

    if (token !== 'tooth') {
      continue;
    }

    const tail = tokens.slice(index + 1);
    const parsed = parseToothNumberTokens(tail[0] === 'number' ? tail.slice(1) : tail);

    if (parsed.tooth === null || parsed.tooth < 1 || parsed.tooth > 32) {
      continue;
    }

    return parsed.tooth;
  }

  if (!expectedToothSelection) {
    return undefined;
  }

  if (tokens.length === 1) {
    const parsed = parseToothNumberTokens(tokens);

    if (parsed.tooth !== null && parsed.tooth >= 1 && parsed.tooth <= 32) {
      return parsed.tooth;
    }
  }

  if (tokens.length === 2 && tokens[0] === 'two') {
    const parsed = parseToothNumberTokens(tokens.slice(1));

    if (parsed.tooth !== null && parsed.tooth >= 1 && parsed.tooth <= 32) {
      return parsed.tooth;
    }
  }

  return undefined;
}

function extractSurface(transcript: string): ToothSurface | undefined {
  if (/\b(?:lingual|palatal)\b/i.test(transcript)) {
    return 'lingual';
  }

  if (/\bbuccal\b/i.test(transcript)) {
    return 'buccal';
  }

  return undefined;
}

function extractSiteIndex(transcript: string): number | undefined {
  if (/\bmesial\b/i.test(transcript)) {
    return 0;
  }

  if (/\b(?:mid|middle)\b/i.test(transcript)) {
    return 1;
  }

  if (/\bdistal\b/i.test(transcript)) {
    return 2;
  }

  return undefined;
}

function detectCommand(tokens: string[]): PerioPayload['command'] | undefined {
  if (tokens.length !== 1) {
    return undefined;
  }

  const token = tokens[0];

  if (token === 'bleeding' || token === 'missing' || token === 'implant' || token === 'undo' || token === 'next' || token === 'previous') {
    return token;
  }

  return undefined;
}

function shouldParseDepthTriplet(context: TranscriptParseContext | undefined, tokens: string[]): boolean {
  if (context?.mode === 'probing' || context?.expectedInput === 'depth-triplet') {
    return true;
  }

  return false;
}

export function parseTranscriptToPayload(transcript: string, context?: TranscriptParseContext): PerioPayload | null {
  const cleaned = transcript.trim();
  const normalizedTranscript = normalizeClinicalTranscript(cleaned);
  const tokens = tokenize(normalizedTranscript);

  if (!cleaned) {
    return null;
  }

  const command = detectCommand(tokens);
  const explicitTooth = tokens.includes('tooth');
  const tooth = extractTooth(tokens, context);
  const surface = extractSurface(normalizedTranscript);
  const siteIndex = extractSiteIndex(normalizedTranscript);
  const depth = explicitTooth ? undefined : shouldParseDepthTriplet(context, tokens) ? parseDepthTriplet(tokens) : undefined;
  const bleeding = command === 'bleeding' || /\bbleed(?:ing)?\b/i.test(normalizedTranscript);
  const missing = command === 'missing' || /\bmissing\b/i.test(normalizedTranscript);
  const implant = command === 'implant' || /\bimplant\b/i.test(normalizedTranscript);

  console.info('[Perio Parser] RAW transcript', cleaned);
  console.info('[Perio Parser] NORMALIZED transcript', normalizedTranscript);
  console.info('[Perio Parser] tooth parser result', {
    explicitTooth,
    tooth,
    decision: describeToothNumber(tooth ?? null, explicitTooth),
  });
  console.info('[Perio Parser] ACTION', tooth !== undefined ? `tooth=${tooth}` : depth ? `depth=${depth.join(',')}` : 'none');

  if (
    command === undefined &&
    tooth === undefined &&
    depth === undefined &&
    surface === undefined &&
    siteIndex === undefined &&
    !bleeding &&
    !missing &&
    !implant
  ) {
    return null;
  }

  return {
    tooth,
    explicitTooth,
    command,
    surface,
    depth,
    bleeding,
    missing,
    implant,
    siteIndex,
    transcript: cleaned,
    normalizedTranscript,
    timestamp: Date.now(),
    type: 'deepgram-transcript',
  };
}
