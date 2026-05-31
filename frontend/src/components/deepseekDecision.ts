import type { ClinicalAttachmentTarget, ClinicalCorrectionContext } from './clinicalContextBuilder';

const BACKEND_DEEPSEEK_ENDPOINT = '/api/deepseek-decision';
const OXLO_MODEL = 'deepseek-v3.2';

export interface DeepSeekDecisionInput {
  deepgramTranscript: string;
  whisperTranscript: string;
  suspiciousReasons: string[];
  toothContext?: string | number | null;
  surfaceContext?: string | null;
  clinicalContext?: ClinicalCorrectionContext | null;
}

export interface TermCorrection {
  from: string;
  to: string;
  reason: string;
}

export interface DeepSeekDecisionResult {
  correctedTranscript: string;
  confidence: number;
  reasoning: string;
  aiVerified: boolean;
  decision: 'whisper' | 'deepgram' | 'no_decision';
  attachmentTarget: ClinicalAttachmentTarget;
  correctedTerms: TermCorrection[];
}

interface DeepSeekAttemptSuccess {
  responseBody: unknown;
  modelName: string;
}

function extractChatContent(responseBody: unknown): string {
  if (!responseBody || typeof responseBody !== 'object') {
    return '';
  }

  const record = responseBody as Record<string, unknown>;

  if (typeof record.content === 'string') {
    return record.content;
  }

  if (typeof record.text === 'string') {
    return record.text;
  }

  if (Array.isArray(record.choices)) {
    for (const choice of record.choices) {
      if (!choice || typeof choice !== 'object') {
        continue;
      }

      const nestedChoice = choice as Record<string, unknown>;
      if (typeof nestedChoice.text === 'string') {
        return nestedChoice.text;
      }

      if (nestedChoice.message && typeof nestedChoice.message === 'object') {
        const message = nestedChoice.message as Record<string, unknown>;
        if (typeof message.content === 'string') {
          return message.content;
        }
      }
    }
  }

  if (Array.isArray(record.data)) {
    for (const entry of record.data) {
      if (typeof entry === 'string') {
        return entry;
      }

      if (entry && typeof entry === 'object') {
        const nested = entry as Record<string, unknown>;
        if (typeof nested.content === 'string') {
          return nested.content;
        }
        if (typeof nested.text === 'string') {
          return nested.text;
        }
      }
    }
  }

  return '';
}

function extractJsonObject(content: string): unknown {
  const trimmed = content.trim();

  if (!trimmed) {
    return null;
  }

  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  const candidate = fencedMatch ? fencedMatch[1].trim() : trimmed;

  try {
    return JSON.parse(candidate);
  } catch {
    const startIndex = candidate.indexOf('{');
    const endIndex = candidate.lastIndexOf('}');

    if (startIndex >= 0 && endIndex > startIndex) {
      try {
        return JSON.parse(candidate.slice(startIndex, endIndex + 1));
      } catch {
        return null;
      }
    }

    return null;
  }
}

function buildDecisionPrompt(input: DeepSeekDecisionInput): string {
  const context = input.clinicalContext;

  return [
    'Choose clinically likely periodontal dictation only.',
    'Do not hallucinate any words that are not supported by the transcripts.',
    'Do not perform generic spelling correction.',
    'Use dental context, suspicious reasons, transcript history, parsed findings, and known dental terms.',
    'If Deepgram and Whisper both look uncertain, return no_decision.',
    'Prefer the whisper transcript when it agrees with the clinical reasons.',
    'Prefer the Deepgram transcript when it is realistic and Whisper appears uncertain.',
    '',
    `Deepgram transcript: ${input.deepgramTranscript}`,
    `Whisper transcript: ${input.whisperTranscript}`,
    `Clinical reasons: ${input.suspiciousReasons.join('; ') || 'none'}`,
    `Tooth context: ${input.toothContext ?? 'unknown'}`,
    `Surface context: ${input.surfaceContext ?? 'unknown'}`,
    context
      ? `Clinical workflow context: ${JSON.stringify({
          currentTooth: context.currentTooth,
          lastCommittedTooth: context.lastCommittedTooth,
          currentSurface: context.currentSurface,
          lastTripletContext: context.lastTripletContext,
          recentTranscriptHistory: context.recentTranscriptHistory,
          suspiciousReasons: context.suspiciousReasons,
          parsedFindings: context.parsedFindings,
          knownDentalTerms: context.knownDentalTerms,
          termCorrectionHints: context.termCorrectionHints,
          recommendedAttachment: context.recommendedAttachment,
        })}`
      : 'Clinical workflow context: none',
    '',
    'Return strict JSON with these keys only:',
    '{',
    '  "correctedTranscript": string | "no_decision",',
    '  "confidence": number,',
    '  "reasoning": string,',
    '  "aiVerified": boolean,',
    '  "decision": "whisper" | "deepgram" | "no_decision",',
    '  "attachmentTarget": "current_tooth" | "last_committed_tooth" | "current_surface" | "none",',
    '  "correctedTerms": [{ "from": string, "to": string, "reason": string }]',
    '}',
  ].join('\n');
}

function buildNoDecision(reasoning: string): DeepSeekDecisionResult {
  return {
    correctedTranscript: 'no_decision',
    confidence: 0,
    reasoning,
    aiVerified: false,
    decision: 'no_decision',
    attachmentTarget: 'none',
    correctedTerms: [],
  };
}

function resolveAttachmentTarget(input: DeepSeekDecisionInput, candidate: unknown): ClinicalAttachmentTarget {
  if (
    candidate === 'current_tooth' ||
    candidate === 'last_committed_tooth' ||
    candidate === 'current_surface' ||
    candidate === 'none'
  ) {
    return candidate;
  }

  return input.clinicalContext?.recommendedAttachment.target ?? 'none';
}

function normalizeTermCorrections(value: unknown): TermCorrection[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => {
      if (!entry || typeof entry !== 'object') {
        return null;
      }

      const record = entry as Record<string, unknown>;
      const from = typeof record.from === 'string' ? record.from.trim() : '';
      const to = typeof record.to === 'string' ? record.to.trim() : '';
      const reason = typeof record.reason === 'string' ? record.reason.trim() : 'contextual correction';

      if (!from || !to) {
        return null;
      }

      return { from, to, reason };
    })
    .filter((entry): entry is TermCorrection => Boolean(entry));
}

async function attemptDeepSeekRequest(
  input: DeepSeekDecisionInput
): Promise<DeepSeekAttemptSuccess> {
  console.info('DEEPSEEK_REQUEST_START', {
    endpoint: BACKEND_DEEPSEEK_ENDPOINT,
    modelName: OXLO_MODEL,
    deepgramTranscript: input.deepgramTranscript,
    whisperTranscript: input.whisperTranscript,
    suspiciousReasons: input.suspiciousReasons,
    toothContext: input.toothContext ?? null,
    surfaceContext: input.surfaceContext ?? null,
    contextAttachment: input.clinicalContext?.recommendedAttachment ?? null,
  });

  console.info('DEEPSEEK_CONTEXT_REQUEST', {
    currentTooth: input.clinicalContext?.currentTooth ?? null,
    lastCommittedTooth: input.clinicalContext?.lastCommittedTooth ?? null,
    currentSurface: input.clinicalContext?.currentSurface ?? null,
    lastTripletContext: input.clinicalContext?.lastTripletContext ?? null,
    recentTranscriptHistory: input.clinicalContext?.recentTranscriptHistory ?? [],
    suspiciousReasons: input.suspiciousReasons,
    parsedFindings: input.clinicalContext?.parsedFindings ?? [],
    knownDentalTerms: input.clinicalContext?.knownDentalTerms ?? [],
  });

  const response = await fetch(BACKEND_DEEPSEEK_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ prompt: buildDecisionPrompt(input) }),
  });

  console.info('DEEPSEEK_RESPONSE', { ok: response.ok, status: response.status, modelName: OXLO_MODEL });

  if (!response.ok) {
    const responseBodyText = await response.text();
    console.info('DEEPSEEK_MODEL_ACCESS', { modelName: OXLO_MODEL, status: response.status, responseBodyText });
    throw new Error(`DeepSeek proxy failed with status ${response.status}`);
  }

  const body = await response.json();
  // backend returns { response: <oxlo response> }
  return { responseBody: body.response, modelName: OXLO_MODEL };
}

function normalizeDecisionResult(
  parsed: unknown,
  input: DeepSeekDecisionInput,
  fallbackReasoning: string
): DeepSeekDecisionResult {
  if (!parsed || typeof parsed !== 'object') {
    return buildNoDecision(fallbackReasoning);
  }

  const record = parsed as Record<string, unknown>;
  const correctedTranscript = typeof record.correctedTranscript === 'string' ? record.correctedTranscript.trim() : '';
  const reasoning = typeof record.reasoning === 'string' ? record.reasoning.trim() : fallbackReasoning;
  const confidence = typeof record.confidence === 'number' && Number.isFinite(record.confidence)
    ? Math.max(0, Math.min(1, record.confidence))
    : 0;
  const decision = record.decision === 'whisper' || record.decision === 'deepgram' || record.decision === 'no_decision'
    ? record.decision
    : 'no_decision';
  const aiVerified = record.aiVerified === true;
  const attachmentTarget = resolveAttachmentTarget(input, record.attachmentTarget);
  const correctedTerms = normalizeTermCorrections(record.correctedTerms);

  if (correctedTerms.length > 0) {
    console.info('TERM_CORRECTION', correctedTerms);
  }

  console.info('CONTEXTUAL_ATTACH', {
    target: attachmentTarget,
    recommended: input.clinicalContext?.recommendedAttachment ?? null,
  });

  if (decision === 'no_decision' || !correctedTranscript || correctedTranscript === 'no_decision' || !aiVerified) {
    return {
      ...buildNoDecision(reasoning || fallbackReasoning),
      attachmentTarget,
      correctedTerms,
    };
  }

  return {
    correctedTranscript,
    confidence,
    reasoning,
    aiVerified: true,
    decision,
    attachmentTarget,
    correctedTerms,
  };
}

export async function decideTranscriptWithDeepSeek(
  input: DeepSeekDecisionInput
): Promise<DeepSeekDecisionResult> {
  const deepseekStartAt = Date.now();
  console.info('DEEPSEEK_START', {
    deepgramTranscript: input.deepgramTranscript,
    whisperTranscript: input.whisperTranscript,
    ts: deepseekStartAt,
  });
  console.info('DEEPSEEK_TRIGGERED', {
    deepgramTranscript: input.deepgramTranscript,
    whisperTranscript: input.whisperTranscript,
    suspiciousReasons: input.suspiciousReasons,
    toothContext: input.toothContext ?? null,
    surfaceContext: input.surfaceContext ?? null,
    contextAttachment: input.clinicalContext?.recommendedAttachment ?? null,
  });

  try {
    const attempt = await attemptDeepSeekRequest(input);
    const content = extractChatContent(attempt.responseBody);
    const parsed = extractJsonObject(content);
    const result = normalizeDecisionResult(parsed, input, 'invalid_deepseek_response');

    console.info('DEEPSEEK_DECISION', {
      ...result,
      modelName: attempt.modelName,
    });

    if (result.decision === 'no_decision') {
      console.info('NO_DECISION', {
        ...result,
        modelName: attempt.modelName,
      });
    } else {
      console.info('AI_VERIFIED', {
        ...result,
        modelName: attempt.modelName,
      });
    }

    const deepseekDoneAt = Date.now();
    console.info('DEEPSEEK_DONE', {
      decision: result.decision,
      aiVerified: result.aiVerified,
      ts: deepseekDoneAt,
    });
    console.info('LATENCY_DEEPSEEK', {
      ms: deepseekDoneAt - deepseekStartAt,
    });

    return result;
  } catch (error) {
    const fallback = buildNoDecision(error instanceof Error ? error.message : 'unknown_deepseek_error');
    console.info('DEEPSEEK_FALLBACK', {
      reason: fallback.reasoning,
      deepgramTranscript: input.deepgramTranscript,
      whisperTranscript: input.whisperTranscript,
    });
    console.info('NO_DECISION', fallback);
    const deepseekDoneAt = Date.now();
    console.info('DEEPSEEK_DONE', {
      decision: 'no_decision',
      fallback: true,
      ts: deepseekDoneAt,
    });
    console.info('LATENCY_DEEPSEEK', {
      ms: deepseekDoneAt - deepseekStartAt,
    });
    return fallback;
  }
}