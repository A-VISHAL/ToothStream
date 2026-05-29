import type { PerioPayload, ToothSurface } from '../types';

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
};

const TENS_WORDS: Record<string, number> = {
  twenty: 20,
  thirty: 30,
};

const HOMOPHONE_NORMALIZATIONS: Record<string, string> = {
  won: 'one',
  for: 'four',
  free: 'three',
};

const TOOTH_PREFIXES = new Set(['tooth', 'to', 'too', 'two']);

function normalizeWord(word: string): string {
  return HOMOPHONE_NORMALIZATIONS[word.toLowerCase()] ?? word.toLowerCase();
}

function tokenize(transcript: string): string[] {
  return transcript
    .trim()
    .split(/\s+/)
    .map((token) => token.replace(/[^a-z0-9]/gi, ''))
    .filter(Boolean)
    .map(normalizeWord);
}

function normalizeClinicalTranscript(transcript: string): string {
  return tokenize(transcript).join(' ');
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

function extractDepths(transcript: string): number[] | undefined {
  const tokens = tokenize(transcript).filter((token) => token in NUMBER_WORDS || /^\d+$/.test(token));
  const values = tokens.map(parseNumberToken).filter((value): value is number => value !== null);

  if (values.length < 3) {
    return undefined;
  }

  return [values[0], values[1], values[2]];
}

function extractTooth(transcript: string): number | undefined {
  const tokens = tokenize(transcript);

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];

    if (!TOOTH_PREFIXES.has(token)) {
      continue;
    }

    const valueOffset = tokens[index + 1] === 'tooth' ? 2 : 1;
    const parsed = parseToothNumberTokens(tokens.slice(index + valueOffset));

    if (parsed.tooth === null || parsed.tooth < 1 || parsed.tooth > 32) {
      continue;
    }

    const trailingTokens = tokens.slice(index + valueOffset + parsed.consumed);
    const hasNumericTrailingToken = trailingTokens.some((nextToken) => parseNumberToken(nextToken) !== null);

    if (!hasNumericTrailingToken || token === 'tooth') {
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

export function parseTranscriptToPayload(transcript: string): PerioPayload | null {
  const cleaned = transcript.trim();
  const normalizedTranscript = normalizeClinicalTranscript(cleaned);

  if (!cleaned) {
    return null;
  }

  const tooth = extractTooth(normalizedTranscript);
  const surface = extractSurface(normalizedTranscript);
  const siteIndex = extractSiteIndex(normalizedTranscript);
  const depth = extractDepths(normalizedTranscript);
  const bleeding = /\bbleed(?:ing)?\b/i.test(normalizedTranscript);
  const missing = /\bmissing\b/i.test(normalizedTranscript);
  const implant = /\bimplant\b/i.test(normalizedTranscript);

  if (
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
    // whether the speaker explicitly said "tooth"
    explicitTooth: normalizeClinicalTranscript(transcript).split(' ').includes('tooth'),
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
