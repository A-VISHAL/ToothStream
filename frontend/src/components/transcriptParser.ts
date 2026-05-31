import type { PerioPayload, ToothSurface } from '../types';

type ParserMode = 'idle' | 'navigation' | 'probing';

type ParserExpectation = 'tooth' | 'surface' | 'depth-triplet';

export interface TranscriptParseContext {
  mode: ParserMode;
  expectedInput: ParserExpectation;
  currentTooth?: number | null;
  currentSurface?: ToothSurface | null;
}

export type ClinicalIntent = 'none' | 'tooth' | 'triplet' | 'command' | 'surface' | 'keyword';

export interface ClinicalSpeechFilterResult {
  normalizedTranscript: string;
  navigationMatch: boolean;
  surfaceMatch: boolean;
  clinicalScore: number;
  intent: ClinicalIntent;
  shouldProcess: boolean;
  reason: string;
  aliasCandidate?: boolean;
  aliasCanonical?: string;
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

const CLINICAL_KEYWORDS = new Set([
  'tooth',
  'bleeding',
  'missing',
  'implant',
  'healthy',
  'recession',
  'mobility',
  'furcation',
  'open',
  'charted',
  'class',
  'grade',
  'exudate',
  'undo',
  'next',
  'previous',
  'buccal',
  'lingual',
  'palatal',
  'mesial',
  'distal',
]);

const NAVIGATION_ALIAS_REGEX = /^(jump|go|select|move)\s+to\s+(.+)$/i;
const MODIFIER_ALIAS_PATTERNS = [
  { pattern: /\bresolution\b/i, canonical: 'recession' },
  { pattern: /\bvacation\b/i, canonical: 'furcation' },
  { pattern: /\binter\s+proximal\b/i, canonical: 'interproximal' },
];

const TOOTH_ATTACHMENT_KEYWORDS = new Set([
  'bleeding',
  'missing',
  'implant',
  'healthy',
  'mobility',
  'furcation',
  'interproximal',
  'open',
  'charted',
]);

const CLASS_VALUE_KEYWORDS = new Set(['class', 'grade']);

function normalizeWord(word: string): string {
  return HOMOPHONE_NORMALIZATIONS[word.toLowerCase()] ?? word.toLowerCase();
}

function normalizeNavigationAlias(transcript: string): { normalized: string; navigationMatch: boolean } {
  const cleaned = transcript.trim().toLowerCase();
  const aliasMatch = cleaned.match(NAVIGATION_ALIAS_REGEX);

  if (!aliasMatch) {
    return {
      normalized: cleaned,
      navigationMatch: false,
    };
  }

  const tail = aliasMatch[2]?.replace(/^tooth\s+/i, '') ?? '';

  return {
    normalized: `tooth ${tail}`.trim(),
    navigationMatch: true,
  };
}

function normalizeSurfaceAlias(transcript: string): { normalized: string; surfaceMatch: boolean } {
  const cleaned = transcript.trim().toLowerCase();

  if (/^(turn\s+toward(?:s)?\s+me|toward(?:s)?\s+me)$/.test(cleaned)) {
    return {
      normalized: 'buccal',
      surfaceMatch: true,
    };
  }

  if (/^(turn\s+away|away\s+from\s+me)$/.test(cleaned)) {
    return {
      normalized: 'lingual',
      surfaceMatch: true,
    };
  }

  return {
    normalized: cleaned,
    surfaceMatch: false,
  };
}

function normalizeModifierAlias(transcript: string): { normalized: string; aliasMatch: boolean; canonical?: string } {
  const cleaned = transcript.trim();

  for (const alias of MODIFIER_ALIAS_PATTERNS) {
    if (alias.pattern.test(cleaned)) {
      return {
        normalized: cleaned.replace(alias.pattern, alias.canonical),
        aliasMatch: true,
        canonical: alias.canonical,
      };
    }
  }

  return {
    normalized: transcript,
    aliasMatch: false,
  };
}

function tokenize(transcript: string): string[] {
  return transcript
    .trim()
    .split(/[^a-z0-9]+/gi)
    .filter(Boolean)
    .map(normalizeWord);
}

function tokenizeRaw(transcript: string): string[] {
  return transcript
    .trim()
    .split(/[^a-z0-9]+/gi)
    .filter(Boolean)
    .map((token) => token.toLowerCase());
}

function parseProtectedDepthTriplet(transcript: string, context?: TranscriptParseContext): number[] | undefined {
  const tripletMode = context?.mode === 'probing' || context?.expectedInput === 'depth-triplet';

  if (!tripletMode) {
    return undefined;
  }

  const rawTokens = tokenizeRaw(transcript);

  if (rawTokens.length !== 3) {
    return undefined;
  }

  if (rawTokens[1] === 'to') {
    const first = parseNumberToken(rawTokens[0] ?? '');
    const third = parseNumberToken(rawTokens[2] ?? '');

    if (first !== null && third !== null) {
      return [first, 2, third];
    }
  }

  return parseDepthTriplet(rawTokens);
}

function normalizeClinicalTranscript(transcript: string, allowToothNormalization: boolean): string {
  const navigationNormalized = normalizeNavigationAlias(transcript).normalized;
  const surfaceNormalized = normalizeSurfaceAlias(navigationNormalized).normalized;

  if (!allowToothNormalization) {
    return surfaceNormalized.replace(/\s+/g, ' ');
  }

  return surfaceNormalized
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

function hasToothAttachmentKeyword(tokens: string[]): boolean {
  return tokens.some((token) => TOOTH_ATTACHMENT_KEYWORDS.has(token));
}

function extractDirectToothNumber(tokens: string[]): number | undefined {
  if (!hasToothAttachmentKeyword(tokens)) {
    return undefined;
  }

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index] ?? '';
    const parsed = parseNumberToken(token);

    if (parsed === null || parsed < 1 || parsed > 48) {
      continue;
    }

    const previousToken = tokens[index - 1];

    if (previousToken && (CLASS_VALUE_KEYWORDS.has(previousToken) || previousToken === 'recession' || previousToken === 'recessed')) {
      continue;
    }

    return parsed;
  }

  return undefined;
}

function extractClassValue(tokens: string[]): number | undefined {
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index] ?? '';

    if (!CLASS_VALUE_KEYWORDS.has(token)) {
      continue;
    }

    const candidate = parseNumberToken(tokens[index + 1] ?? '');

    if (candidate !== null && candidate >= 0) {
      return candidate;
    }
  }

  return undefined;
}

function describeToothNumber(tooth: number | null, explicitTooth: boolean): string {
  if (typeof tooth !== 'number') {
    return 'tooth=null';
  }

  return `tooth=${tooth}${explicitTooth ? ' explicit' : ''}`;
}

function detectClinicalSpeechIntent(transcript: string, context?: TranscriptParseContext): ClinicalSpeechFilterResult {
  const cleaned = transcript.trim();
  const navigationAlias = normalizeNavigationAlias(cleaned);
  const surfaceAlias = normalizeSurfaceAlias(cleaned);
  const modifierAlias = normalizeModifierAlias(cleaned);
  const explicitNavigationIntent = navigationAlias.navigationMatch || /\btooth\b/i.test(cleaned);
  const protectedTriplet = parseProtectedDepthTriplet(cleaned, context);
  const standaloneTriplet = isStandaloneDepthTriplet(tokenizeRaw(cleaned));
  const normalizedTranscript = normalizeClinicalTranscript(modifierAlias.normalized, explicitNavigationIntent && !protectedTriplet);
  const tokens = tokenize(normalizedTranscript);
  const command = detectCommand(tokens);
  const explicitTooth = tokens.includes('tooth');
  const tooth = extractTooth(tokens, context);
  const surface = extractSurface(normalizedTranscript);
  const depthTriplet = protectedTriplet ?? (shouldParseDepthTriplet(context, tokens) || standaloneTriplet ? parseDepthTriplet(tokens) : undefined);
  const hasTriplet = Array.isArray(depthTriplet) && depthTriplet.length === 3;
  const keywordHit = tokens.some((token) => CLINICAL_KEYWORDS.has(token));

  if (!cleaned) {
    return {
      normalizedTranscript,
      navigationMatch: navigationAlias.navigationMatch,
      surfaceMatch: surfaceAlias.surfaceMatch || surface !== undefined,
      clinicalScore: 0,
      intent: 'none',
      shouldProcess: false,
      reason: 'empty transcript',
    };
  }

  if (modifierAlias.aliasMatch) {
    console.info('LIVE_MODIFIER_ENTER', {
      transcript: cleaned,
      canonical: modifierAlias.canonical,
    });
    console.info('CLINICAL_ALIAS_CANDIDATE', {
      transcript: cleaned,
      canonical: modifierAlias.canonical,
      normalizedTranscript,
    });

    return {
      normalizedTranscript,
      navigationMatch: navigationAlias.navigationMatch,
      surfaceMatch: surfaceAlias.surfaceMatch || surface !== undefined,
      clinicalScore: 2,
      intent: 'keyword',
      shouldProcess: true,
      reason: 'modifier alias detected',
      aliasCandidate: true,
      aliasCanonical: modifierAlias.canonical,
    };
  }

  if (explicitNavigationIntent && typeof tooth === 'number' && !hasTriplet) {
    return {
      normalizedTranscript,
      navigationMatch: navigationAlias.navigationMatch,
      surfaceMatch: surfaceAlias.surfaceMatch || surface !== undefined,
      clinicalScore: 3,
      intent: 'tooth',
      shouldProcess: true,
      reason: 'explicit navigation command',
    };
  }

  if (surface !== undefined) {
    return {
      normalizedTranscript,
      navigationMatch: navigationAlias.navigationMatch,
      surfaceMatch: surfaceAlias.surfaceMatch || surface !== undefined,
      clinicalScore: 3,
      intent: 'surface',
      shouldProcess: true,
      reason: 'surface command',
    };
  }

  if (command !== undefined) {
    return {
      normalizedTranscript,
      navigationMatch: navigationAlias.navigationMatch,
      surfaceMatch: surfaceAlias.surfaceMatch || surface !== undefined,
      clinicalScore: 3,
      intent: command === 'next' || command === 'previous' ? 'command' : 'command',
      shouldProcess: true,
      reason: 'clinical command',
    };
  }

  if (hasTriplet) {
    return {
      normalizedTranscript,
      navigationMatch: navigationAlias.navigationMatch,
      surfaceMatch: surfaceAlias.surfaceMatch || surface !== undefined,
      clinicalScore: 3,
      intent: 'triplet',
      shouldProcess: true,
      reason: standaloneTriplet ? 'depth triplet detected' : 'depth triplet detected in clinical context',
    };
  }

  if (typeof tooth === 'number' && explicitTooth) {
    return {
      normalizedTranscript,
      navigationMatch: navigationAlias.navigationMatch,
      surfaceMatch: surfaceAlias.surfaceMatch || surface !== undefined,
      clinicalScore: 3,
      intent: 'tooth',
      shouldProcess: true,
      reason: describeToothNumber(tooth, explicitTooth),
    };
  }

  if (surface !== undefined) {
    return {
      normalizedTranscript,
      navigationMatch: navigationAlias.navigationMatch,
      surfaceMatch: surfaceAlias.surfaceMatch || surface !== undefined,
      clinicalScore: 2,
      intent: 'surface',
      shouldProcess: true,
      reason: 'surface command',
    };
  }

  if (keywordHit) {
    return {
      normalizedTranscript,
      navigationMatch: navigationAlias.navigationMatch,
      surfaceMatch: surfaceAlias.surfaceMatch || surface !== undefined,
      clinicalScore: 1,
      intent: 'keyword',
      shouldProcess: true,
      reason: 'clinical keyword',
    };
  }

  return {
    normalizedTranscript,
    navigationMatch: navigationAlias.navigationMatch,
    surfaceMatch: surfaceAlias.surfaceMatch || surface !== undefined,
    clinicalScore: 0,
    intent: 'none',
    shouldProcess: false,
    reason: 'no clinical intent detected',
  };
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

function isStandaloneDepthTriplet(tokens: string[]): boolean {
  if (tokens.length !== 3) {
    return false;
  }

  return tokens.every((token) => parseNumberToken(token) !== null);
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

    if (parsed.tooth === null || parsed.tooth < 1 || parsed.tooth > 48) {
      continue;
    }

    return parsed.tooth;
  }

  if (!expectedToothSelection) {
    return undefined;
  }

  if (tokens.length === 1) {
    const parsed = parseToothNumberTokens(tokens);

    if (parsed.tooth !== null && parsed.tooth >= 1 && parsed.tooth <= 48) {
      return parsed.tooth;
    }
  }

  if (tokens.length === 2 && tokens[0] === 'two') {
    const parsed = parseToothNumberTokens(tokens.slice(1));

    if (parsed.tooth !== null && parsed.tooth >= 1 && parsed.tooth <= 48) {
      return parsed.tooth;
    }
  }

  const directTooth = extractDirectToothNumber(tokens);

  if (directTooth !== undefined) {
    return directTooth;
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

function extractRecession(tokens: string[]): number | boolean | undefined {
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];

    if (token !== 'recession' && token !== 'recessed') {
      continue;
    }

    for (let searchIndex = index + 1; searchIndex < tokens.length; searchIndex += 1) {
      const candidate = parseNumberToken(tokens[searchIndex] ?? '');

      if (candidate !== null) {
        return candidate;
      }

      if (tokens[searchIndex] === 'tooth' || tokens[searchIndex] === 'bleeding' || tokens[searchIndex] === 'implant' || tokens[searchIndex] === 'missing') {
        break;
      }
    }

    return true;
  }

  return undefined;
}

function detectCommand(tokens: string[]): PerioPayload['command'] | undefined {
  if (tokens.length !== 1) {
    return undefined;
  }

  const token = tokens[0];

  if (token === 'bleeding' || token === 'missing' || token === 'implant' || token === 'healthy' || token === 'mobility' || token === 'furcation' || token === 'open' || token === 'charted' || token === 'undo' || token === 'next' || token === 'previous' || token === 'skip' || token === 'resume') {
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
  const filter = detectClinicalSpeechIntent(transcript, context);

  if (!filter.shouldProcess) {
    return null;
  }

  if (filter.aliasCandidate) {
    console.info('BRIDGE_ALIAS_DETECTED', {
      transcript,
      canonical: filter.aliasCanonical ?? null,
      normalizedTranscript: filter.normalizedTranscript,
    });
    console.info('LIVE_WHISPER_TRIGGER', {
      transcript,
      canonical: filter.aliasCanonical ?? null,
    });
  }

  const cleaned = transcript.trim();
  const normalizedTranscript = filter.normalizedTranscript;
  const tokens = tokenize(normalizedTranscript);
  const tripletMode = context?.mode === 'probing' || context?.expectedInput === 'depth-triplet';
  const navigationIntent = /\btooth\b/i.test(cleaned) || /^(jump|go|select|move)\s+to\b/i.test(cleaned);

  console.info('RAW_TRANSCRIPT', cleaned);
  console.info('NORMALIZED', normalizedTranscript);
  console.info('TRIPLET_MODE', tripletMode);
  console.info('NAVIGATION_INTENT', navigationIntent);
  console.info('SURFACE_MATCH', filter.surfaceMatch);

  if (!cleaned) {
    return null;
  }

  const protectedTriplet = parseProtectedDepthTriplet(cleaned, context);
  const command = detectCommand(tokens);
  const explicitTooth = tokens.includes('tooth');
  const extractedTooth = extractTooth(tokens, context);
  const surface = extractSurface(normalizedTranscript);
  const siteIndex = extractSiteIndex(normalizedTranscript);
  const recession = extractRecession(tokens);
  const standaloneTriplet = isStandaloneDepthTriplet(tokens);
  const depth = explicitTooth ? undefined : protectedTriplet ?? (shouldParseDepthTriplet(context, tokens) || standaloneTriplet ? parseDepthTriplet(tokens) : undefined);
  const bleeding = command === 'bleeding' || /\bbleed(?:ing)?\b/i.test(normalizedTranscript);
  const missing = command === 'missing' || /\bmissing\b/i.test(normalizedTranscript);
  const implant = command === 'implant' || /\bimplant\b/i.test(normalizedTranscript);
  const healthy = command === 'healthy' || /\bhealthy\b/i.test(normalizedTranscript);
  const mobilityClass = tokens.includes('mobility') ? extractClassValue(tokens) ?? true : undefined;
  const furcationClass = tokens.includes('furcation') ? extractClassValue(tokens) ?? true : undefined;
  const chartStatus = command === 'open' ? 'open' : command === 'charted' ? 'charted' : depth !== undefined || bleeding || missing || implant || healthy || recession !== undefined || mobilityClass !== undefined || furcationClass !== undefined ? 'charted' : undefined;
  const toothFindingSignal = bleeding || missing || implant || healthy || recession !== undefined || mobilityClass !== undefined || furcationClass !== undefined || chartStatus !== undefined || surface !== undefined || siteIndex !== undefined;
  const tooth = extractedTooth ?? (toothFindingSignal ? context?.currentTooth ?? undefined : undefined);
  const explicitAdvance = command === 'next' || command === 'previous' || command === 'skip' || command === 'resume' || missing;
  const toothCommitPending =
    typeof tooth === 'number' ||
    depth !== undefined ||
    bleeding ||
    missing ||
    implant ||
    healthy ||
    recession !== undefined ||
    mobilityClass !== undefined ||
    furcationClass !== undefined ||
    chartStatus !== undefined ||
    surface !== undefined ||
    siteIndex !== undefined;
  const awaitingAdditionalFindings = toothCommitPending && !explicitAdvance;
  const toothFinalized = explicitAdvance;
  const autoAdvanceBlocked = toothCommitPending && !explicitAdvance;
  const autoAdvanceAllowed = explicitAdvance;
  const routingDecision = protectedTriplet
    ? 'depth_triplet'
    : navigationIntent && typeof tooth === 'number'
      ? 'tooth_navigation'
      : surface !== undefined
      ? 'surface_command'
      : command !== undefined
        ? 'clinical_command'
        : explicitTooth && typeof tooth === 'number'
          ? 'tooth_navigation'
          : 'none';

  console.info('TRIPLET_MATCH', Boolean(protectedTriplet || standaloneTriplet));
  console.info('ROUTING_DECISION', routingDecision);
  console.info('ACTION', tooth !== undefined ? `tooth=${tooth}` : depth ? `depth=${depth.join(',')}` : 'none');
  console.info('AUTO_ADVANCE_BLOCKED', autoAdvanceBlocked);
  console.info('WAITING_FOR_FINDINGS', awaitingAdditionalFindings);
  console.info('TOOTH_FINALIZED', toothFinalized);
  console.info('AUTO_ADVANCE_ALLOWED', autoAdvanceAllowed);

  if (filter.aliasCandidate) {
    console.info('LIVE_DEEPSEEK_TRIGGER', {
      transcript: cleaned,
      canonical: filter.aliasCanonical ?? null,
      normalizedTranscript,
    });
  }

  if (
    command === undefined &&
    tooth === undefined &&
    depth === undefined &&
    surface === undefined &&
    siteIndex === undefined &&
    recession === undefined &&
    !bleeding &&
    !missing &&
    !implant &&
    !healthy
  ) {
    return null;
  }

  const payload = {
    tooth,
    explicitTooth,
    command,
    surface,
    depth,
    bleeding,
    missing,
    implant,
    healthy,
    recession,
    mobilityClass,
    furcationClass,
    furcationSurface: tokens.includes('furcation') ? (surface ?? context?.currentSurface ?? null) : undefined,
    chartStatus,
    siteIndex,
    advanceCursor: explicitAdvance,
    toothCommitPending,
    awaitingAdditionalFindings,
    toothFinalized,
    autoAdvanceBlocked,
    autoAdvanceAllowed,
    transcript: cleaned,
    normalizedTranscript,
    timestamp: Date.now(),
    type: 'deepgram-transcript',
  };

  console.info('PAYLOAD_CREATED', payload);

  return payload;
}

export function evaluateClinicalSpeechIntent(transcript: string, context?: TranscriptParseContext): ClinicalSpeechFilterResult {
  return detectClinicalSpeechIntent(transcript, context);
}
