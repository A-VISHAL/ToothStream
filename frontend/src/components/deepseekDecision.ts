const OXLO_CHAT_ENDPOINT = 'https://api.oxlo.ai/v1/chat/completions';
const OXLO_MODEL_CANDIDATES = ['deepseek-v3-0324', 'deepseek-v3.2'];

function resolveOxloApiKey(): string | undefined {
  const reactAppKey = process.env.REACT_APP_OXLO_API_KEY;
  const viteKey = process.env.VITE_OXLO_API_KEY;

  if (reactAppKey) {
    return reactAppKey;
  }

  if (viteKey) {
    return viteKey;
  }

  return undefined;
}

export interface DeepSeekDecisionInput {
  deepgramTranscript: string;
  whisperTranscript: string;
  suspiciousReasons: string[];
  toothContext?: string | number | null;
  surfaceContext?: string | null;
}

export interface DeepSeekDecisionResult {
  correctedTranscript: string;
  confidence: number;
  reasoning: string;
  aiVerified: boolean;
  decision: 'whisper' | 'deepgram' | 'no_decision';
}

interface DeepSeekAttemptSuccess {
  responseBody: unknown;
  modelName: string;
}

interface DeepSeekAttemptAccessDenied {
  accessDenied: true;
  modelName: string;
  status: number;
  responseBodyText: string;
}

type DeepSeekAttemptResult = DeepSeekAttemptSuccess | DeepSeekAttemptAccessDenied;

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
  return [
    'Choose clinically likely periodontal dictation only.',
    'Do not hallucinate any words that are not supported by the transcripts.',
    'If Deepgram and Whisper both look uncertain, return no_decision.',
    'Prefer the whisper transcript when it agrees with the clinical reasons.',
    'Prefer the Deepgram transcript when it is realistic and Whisper appears uncertain.',
    '',
    `Deepgram transcript: ${input.deepgramTranscript}`,
    `Whisper transcript: ${input.whisperTranscript}`,
    `Clinical reasons: ${input.suspiciousReasons.join('; ') || 'none'}`,
    `Tooth context: ${input.toothContext ?? 'unknown'}`,
    `Surface context: ${input.surfaceContext ?? 'unknown'}`,
    '',
    'Return strict JSON with these keys only:',
    '{',
    '  "correctedTranscript": string | "no_decision",',
    '  "confidence": number,',
    '  "reasoning": string,',
    '  "aiVerified": boolean,',
    '  "decision": "whisper" | "deepgram" | "no_decision"',
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
  };
}

async function attemptDeepSeekRequest(
  modelName: string,
  apiKey: string,
  input: DeepSeekDecisionInput
): Promise<DeepSeekAttemptResult> {
  console.info('DEEPSEEK_AUTH_CHECK', {
    keyPresent: Boolean(apiKey),
    keyLength: apiKey.length,
    modelName,
  });

  console.info('DEEPSEEK_REQUEST_START', {
    endpoint: OXLO_CHAT_ENDPOINT,
    modelName,
    deepgramTranscript: input.deepgramTranscript,
    whisperTranscript: input.whisperTranscript,
    suspiciousReasons: input.suspiciousReasons,
    toothContext: input.toothContext ?? null,
    surfaceContext: input.surfaceContext ?? null,
  });

  const response = await fetch(OXLO_CHAT_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: modelName,
      temperature: 0,
      messages: [
        {
          role: 'system',
          content: 'You are a clinical transcript decision engine for periodontal dictation. Return strict JSON only.',
        },
        {
          role: 'user',
          content: buildDecisionPrompt(input),
        },
      ],
    }),
  });

  console.info('DEEPSEEK_RESPONSE', {
    ok: response.ok,
    status: response.status,
    modelName,
  });

  if (!response.ok) {
    const responseBodyText = await response.text();
    console.info('DEEPSEEK_MODEL_ACCESS', {
      modelName,
      status: response.status,
      responseBodyText,
    });

    if (response.status === 403) {
      return {
        accessDenied: true,
        modelName,
        status: response.status,
        responseBodyText,
      };
    }

    throw new Error(`DeepSeek request failed with status ${response.status}`);
  }

  return {
    responseBody: (await response.json()) as unknown,
    modelName,
  };
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

  if (decision === 'no_decision' || !correctedTranscript || correctedTranscript === 'no_decision' || !aiVerified) {
    return buildNoDecision(reasoning || fallbackReasoning);
  }

  return {
    correctedTranscript,
    confidence,
    reasoning,
    aiVerified: true,
    decision,
  };
}

export async function decideTranscriptWithDeepSeek(
  input: DeepSeekDecisionInput
): Promise<DeepSeekDecisionResult> {
  console.info('DEEPSEEK_TRIGGERED', {
    deepgramTranscript: input.deepgramTranscript,
    whisperTranscript: input.whisperTranscript,
    suspiciousReasons: input.suspiciousReasons,
    toothContext: input.toothContext ?? null,
    surfaceContext: input.surfaceContext ?? null,
  });

  const apiKey = resolveOxloApiKey();

  if (!apiKey) {
    const fallback = buildNoDecision('missing_oxlo_api_key');
    console.info('DEEPSEEK_FALLBACK', {
      reason: fallback.reasoning,
      deepgramTranscript: input.deepgramTranscript,
      whisperTranscript: input.whisperTranscript,
    });
    console.info('NO_DECISION', fallback);
    return fallback;
  }

  try {
    let accessDeniedAttempt: DeepSeekAttemptAccessDenied | null = null;

    for (const modelName of OXLO_MODEL_CANDIDATES) {
      const attempt = await attemptDeepSeekRequest(modelName, apiKey, input);

      if ('accessDenied' in attempt) {
        accessDeniedAttempt = attempt;
        continue;
      }

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

      return result;
    }

    if (accessDeniedAttempt) {
      const fallback = buildNoDecision(`model_access_denied:${accessDeniedAttempt.modelName}`);
      console.info('DEEPSEEK_FALLBACK', {
        reason: fallback.reasoning,
        deepgramTranscript: input.deepgramTranscript,
        whisperTranscript: input.whisperTranscript,
        modelName: accessDeniedAttempt.modelName,
        status: accessDeniedAttempt.status,
        responseBodyText: accessDeniedAttempt.responseBodyText,
      });
      console.info('NO_DECISION', fallback);
      return fallback;
    }

    const fallback = buildNoDecision('no_deepseek_model_available');
    console.info('DEEPSEEK_FALLBACK', {
      reason: fallback.reasoning,
      deepgramTranscript: input.deepgramTranscript,
      whisperTranscript: input.whisperTranscript,
    });
    console.info('NO_DECISION', fallback);
    return fallback;
  } catch (error) {
    const fallback = buildNoDecision(error instanceof Error ? error.message : 'unknown_deepseek_error');
    console.info('DEEPSEEK_FALLBACK', {
      reason: fallback.reasoning,
      deepgramTranscript: input.deepgramTranscript,
      whisperTranscript: input.whisperTranscript,
    });
    console.info('NO_DECISION', fallback);
    return fallback;
  }
}