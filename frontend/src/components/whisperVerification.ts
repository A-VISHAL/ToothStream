import { decideTranscriptWithDeepSeek } from './deepseekDecision';

const OXLO_WHISPER_ENDPOINT = 'https://api.oxlo.ai/v1/audio/transcriptions';
const OXLO_MODEL = 'whisper-large-v3';
const WHISPER_SAMPLE_RATE = 16000;
const WHISPER_CHANNELS = 1;

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

export interface WhisperVerificationInput {
  audioChunks: ArrayBuffer[];
  originalTranscript: string;
  suspiciousReasons: string[];
  toothContext?: string | number | null;
  surfaceContext?: string | null;
}

export interface WhisperVerificationResult {
  whisperTranscript: string;
  originalTranscript: string;
  suspiciousReasons: string[];
  correctedTranscript: string;
  confidence: number;
  reasoning: string;
  aiVerified: boolean;
}

function encodeWavHeader(dataLength: number, sampleRate: number, channels: number): ArrayBuffer {
  const buffer = new ArrayBuffer(44);
  const view = new DataView(buffer);
  const byteRate = sampleRate * channels * 2;
  const blockAlign = channels * 2;

  const writeString = (offset: number, value: string) => {
    for (let index = 0; index < value.length; index += 1) {
      view.setUint8(offset + index, value.charCodeAt(index));
    }
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataLength, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, dataLength, true);

  return buffer;
}

function buildWavBlob(audioChunks: ArrayBuffer[]): Blob | null {
  const validChunks = audioChunks.filter((chunk) => chunk.byteLength > 0);

  if (validChunks.length === 0) {
    return null;
  }

  const totalLength = validChunks.reduce((sum, chunk) => sum + chunk.byteLength, 0);
  const pcmBytes = new Uint8Array(totalLength);
  let offset = 0;

  for (const chunk of validChunks) {
    pcmBytes.set(new Uint8Array(chunk), offset);
    offset += chunk.byteLength;
  }

  return new Blob([encodeWavHeader(totalLength, WHISPER_SAMPLE_RATE, WHISPER_CHANNELS), pcmBytes], {
    type: 'audio/wav',
  });
}

function extractTranscriptFromResponse(responseBody: unknown): string {
  if (!responseBody || typeof responseBody !== 'object') {
    return '';
  }

  const record = responseBody as Record<string, unknown>;

  if (typeof record.text === 'string') {
    return record.text;
  }

  if (typeof record.transcript === 'string') {
    return record.transcript;
  }

  if (Array.isArray(record.data)) {
    for (const entry of record.data) {
      if (typeof entry === 'string') {
        return entry;
      }

      if (entry && typeof entry === 'object') {
        const nested = entry as Record<string, unknown>;
        if (typeof nested.text === 'string') {
          return nested.text;
        }
        if (typeof nested.transcript === 'string') {
          return nested.transcript;
        }
      }
    }
  }

  return '';
}

export async function verifySuspiciousTranscriptWithWhisper(
  input: WhisperVerificationInput
): Promise<WhisperVerificationResult> {
  const apiKey = resolveOxloApiKey();

  console.info('WHISPER_AUTH_CHECK', {
    keyPresent: Boolean(apiKey),
    keyLength: apiKey?.length ?? 0,
    envName: process.env.REACT_APP_OXLO_API_KEY ? 'REACT_APP_OXLO_API_KEY' : process.env.VITE_OXLO_API_KEY ? 'VITE_OXLO_API_KEY' : 'missing',
  });

  if (!apiKey) {
    console.info('WHISPER_ENV_MISSING', {
      expectedEnvNames: ['REACT_APP_OXLO_API_KEY', 'VITE_OXLO_API_KEY'],
      runtime: 'browser',
    });
  }

  console.info('WHISPER_TRIGGERED', {
    originalTranscript: input.originalTranscript,
    suspiciousReasons: input.suspiciousReasons,
    audioChunks: input.audioChunks.length,
  });

  const fallbackResult: WhisperVerificationResult = {
    whisperTranscript: input.originalTranscript,
    originalTranscript: input.originalTranscript,
    suspiciousReasons: input.suspiciousReasons,
    correctedTranscript: input.originalTranscript,
    confidence: 0,
    reasoning: 'whisper_fallback',
    aiVerified: false,
  };

  const audioBlob = buildWavBlob(input.audioChunks);

  if (!audioBlob) {
    console.info('WHISPER_FALLBACK', {
      reason: 'no_audio_chunks',
      originalTranscript: input.originalTranscript,
      suspiciousReasons: input.suspiciousReasons,
    });
    return fallbackResult;
  }

  try {
    console.info('WHISPER_REQUEST_START', {
      endpoint: OXLO_WHISPER_ENDPOINT,
      model: OXLO_MODEL,
      originalTranscript: input.originalTranscript,
      suspiciousReasons: input.suspiciousReasons,
    });

    console.info('WHISPER_LANGUAGE_FORCED', {
      language: 'en',
      model: OXLO_MODEL,
    });

    const formData = new FormData();
    formData.append('model', OXLO_MODEL);
    formData.append('language', 'en');
    formData.append('file', audioBlob, 'suspicious-audio.wav');

    const headers: HeadersInit = {};

    if (apiKey) {
      headers.Authorization = `Bearer ${apiKey}`;
    }

    const response = await fetch(OXLO_WHISPER_ENDPOINT, {
      method: 'POST',
      headers,
      body: formData,
    });

    console.info('WHISPER_RESPONSE', {
      ok: response.ok,
      status: response.status,
    });

    if (!response.ok) {
      throw new Error(`Whisper request failed with status ${response.status}`);
    }

    const responseBody = (await response.json()) as unknown;
    const whisperTranscript = extractTranscriptFromResponse(responseBody).trim();

    console.info('WHISPER_TRANSCRIPT', {
      whisperTranscript,
      originalTranscript: input.originalTranscript,
      suspiciousReasons: input.suspiciousReasons,
    });

    const deepSeekResult = await decideTranscriptWithDeepSeek({
      deepgramTranscript: input.originalTranscript,
      whisperTranscript: whisperTranscript || input.originalTranscript,
      suspiciousReasons: input.suspiciousReasons,
      toothContext: input.toothContext ?? null,
      surfaceContext: input.surfaceContext ?? null,
    });

    const result: WhisperVerificationResult = {
      whisperTranscript: whisperTranscript || input.originalTranscript,
      originalTranscript: input.originalTranscript,
      suspiciousReasons: input.suspiciousReasons,
      correctedTranscript: deepSeekResult.correctedTranscript,
      confidence: deepSeekResult.confidence,
      reasoning: deepSeekResult.reasoning,
      aiVerified: deepSeekResult.aiVerified,
    };

    console.info('WHISPER_VERIFY_COMPLETE', result);
    return result;
  } catch (error) {
    console.info('WHISPER_FALLBACK', {
      reason: error instanceof Error ? error.message : 'unknown error',
      originalTranscript: input.originalTranscript,
      suspiciousReasons: input.suspiciousReasons,
    });
    console.info('WHISPER_VERIFY_COMPLETE', fallbackResult);
    return fallbackResult;
  }
}