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

function parseNumberToken(token: string): number | null {
  const lowered = token.toLowerCase();

  if (lowered in NUMBER_WORDS) {
    return NUMBER_WORDS[lowered];
  }

  const parsed = Number.parseInt(lowered, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

function extractDepths(transcript: string): number[] | undefined {
  const tokens = transcript.match(/\b(?:zero|one|two|three|four|five|six|seven|eight|nine|ten|\d+)\b/gi) ?? [];
  const values = tokens.map(parseNumberToken).filter((value): value is number => value !== null);

  if (values.length < 3) {
    return undefined;
  }

  return [values[0], values[1], values[2]];
}

function extractTooth(transcript: string): number | undefined {
  const toothMatch = transcript.match(/\btooth\s*(\d{1,2})\b/i);

  if (toothMatch) {
    const tooth = Number.parseInt(toothMatch[1] ?? '', 10);
    return tooth >= 1 && tooth <= 32 ? tooth : undefined;
  }

  const numberMatch = transcript.match(/\b(\d{1,2})\b/);
  if (!numberMatch) {
    return undefined;
  }

  const tooth = Number.parseInt(numberMatch[1] ?? '', 10);
  return tooth >= 1 && tooth <= 32 ? tooth : undefined;
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

  if (!cleaned) {
    return null;
  }

  const tooth = extractTooth(cleaned);
  const surface = extractSurface(cleaned);
  const siteIndex = extractSiteIndex(cleaned);
  const depth = extractDepths(cleaned);
  const bleeding = /\bbleed(?:ing)?\b/i.test(cleaned);
  const missing = /\bmissing\b/i.test(cleaned);
  const implant = /\bimplant\b/i.test(cleaned);

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
    surface,
    depth,
    bleeding,
    missing,
    implant,
    siteIndex,
    transcript: cleaned,
    timestamp: Date.now(),
    type: 'deepgram-transcript',
  };
}
