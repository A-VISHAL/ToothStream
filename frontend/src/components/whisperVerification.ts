import { decideTranscriptWithDeepSeek } from './deepseekDecision';
import { buildClinicalCorrectionContext, type ClinicalTranscriptHistoryEntry, type ClinicalTripletContext } from './clinicalContextBuilder';
import { apiBaseUrl } from './apiConfig';

const BACKEND_WHISPER_ENDPOINT = `${apiBaseUrl}/api/whisper-verify`;
const OXLO_MODEL = 'whisper-large-v3';
const WHISPER_SAMPLE_RATE = 16000;
const WHISPER_CHANNELS = 1;
export const WHISPER_MAX_AUDIO_CHUNKS = 30;

export interface WhisperVerificationInput {
  audioChunks: ArrayBuffer[];
  originalTranscript: string;
  suspiciousReasons: string[];
  toothContext?: string | number | null;
  surfaceContext?: string | null;
  currentTooth?: number | null;
  lastCommittedTooth?: number | null;
  currentSurface?: string | null;
  lastTripletContext?: ClinicalTripletContext | null;
  recentTranscriptHistory?: ClinicalTranscriptHistoryEntry[];
  parsedFindings?: string[];
  knownDentalTerms?: string[];
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

function selectWhisperAudioChunks(audioChunks: ArrayBuffer[], maxChunks: number): { selectedChunks: ArrayBuffer[]; trimmedChunks: number } {
  const boundedMaxChunks = Math.max(1, Math.trunc(maxChunks));

  if (audioChunks.length <= boundedMaxChunks) {
    return {
      selectedChunks: audioChunks.slice(),
      trimmedChunks: 0,
    };
  }

  return {
    selectedChunks: audioChunks.slice(-boundedMaxChunks),
    trimmedChunks: audioChunks.length - boundedMaxChunks,
  };
}

export async function verifySuspiciousTranscriptWithWhisper(
  input: WhisperVerificationInput
): Promise<WhisperVerificationResult> {
  const { selectedChunks, trimmedChunks } = selectWhisperAudioChunks(input.audioChunks, WHISPER_MAX_AUDIO_CHUNKS);
  const whisperStartAt = Date.now();
  console.info('WHISPER_START', {
    originalTranscript: input.originalTranscript,
    suspiciousReasons: input.suspiciousReasons,
    audioChunks: selectedChunks.length,
    ts: whisperStartAt,
  });
  console.info('WHISPER_AUTH_CHECK', { usingBackendProxy: true });

  console.info('WHISPER_TRIGGERED', {
    originalTranscript: input.originalTranscript,
    suspiciousReasons: input.suspiciousReasons,
    audioChunks: selectedChunks.length,
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

  const audioBlob = buildWavBlob(selectedChunks);

  if (!audioBlob) {
    console.info('WHISPER_FALLBACK', {
      reason: 'no_audio_chunks',
      originalTranscript: input.originalTranscript,
      suspiciousReasons: input.suspiciousReasons,
    });
    return fallbackResult;
  }

  const totalAudioByteLength = selectedChunks.reduce((sum, chunk) => sum + chunk.byteLength, 0);
  const audioDurationMs = (totalAudioByteLength / (WHISPER_SAMPLE_RATE * WHISPER_CHANNELS * 2)) * 1000;
  console.info('WHISPER_WINDOW_TRIMMED', {
    originalChunks: input.audioChunks.length,
    selectedChunks: selectedChunks.length,
    trimmedChunks,
    maxChunks: WHISPER_MAX_AUDIO_CHUNKS,
    estimatedDurationMs: Math.round(audioDurationMs),
    blobBytes: audioBlob.size,
  });

  try {

    console.info('WHISPER_REQUEST_START', {
      endpoint: BACKEND_WHISPER_ENDPOINT,
      model: OXLO_MODEL,
      originalTranscript: input.originalTranscript,
      suspiciousReasons: input.suspiciousReasons,
    });

    console.info('WHISPER_LANGUAGE_FORCED', {
      language: 'en',
      model: OXLO_MODEL,
    });

    const formData = new FormData();
    formData.append('originalTranscript', input.originalTranscript);
    formData.append('suspiciousReasons', JSON.stringify(input.suspiciousReasons || []));
    formData.append('file', audioBlob, 'suspicious-audio.wav');

    const uploadStartAt = Date.now();
    console.info('WHISPER_UPLOAD_START', {
      endpoint: BACKEND_WHISPER_ENDPOINT,
      blobSizeBytes: audioBlob.size,
      ts: uploadStartAt,
    });

    const response = await fetch(BACKEND_WHISPER_ENDPOINT, {
      method: 'POST',
      body: formData,
    });

    const uploadDoneAt = Date.now();
    console.info('WHISPER_UPLOAD_DONE', {
      uploadDurationMs: uploadDoneAt - uploadStartAt,
      status: response.status,
      ok: response.ok,
      ts: uploadDoneAt,
    });

    if (!response.ok) {
      throw new Error(`Whisper proxy failed with status ${response.status}`);
    }

    const responseBody = (await response.json()) as unknown;
    // backend returns { whisperTranscript, confidence, status }
    const whisperTranscript = (responseBody && typeof responseBody === 'object' && (responseBody as any).whisperTranscript) ? String((responseBody as any).whisperTranscript).trim() : '';

    console.info('WHISPER_TRANSCRIPT', {
      whisperTranscript,
      originalTranscript: input.originalTranscript,
      suspiciousReasons: input.suspiciousReasons,
    });

    const correctionContext = buildClinicalCorrectionContext({
      deepgramTranscript: input.originalTranscript,
      whisperTranscript: whisperTranscript || input.originalTranscript,
      currentTooth: input.currentTooth ?? (typeof input.toothContext === 'number' ? input.toothContext : null),
      lastCommittedTooth: input.lastCommittedTooth ?? null,
      currentSurface: input.currentSurface ?? input.surfaceContext ?? null,
      lastTripletContext: input.lastTripletContext ?? null,
      recentTranscriptHistory: input.recentTranscriptHistory ?? [],
      suspiciousReasons: input.suspiciousReasons,
      parsedFindings: input.parsedFindings ?? [],
      knownDentalTerms: input.knownDentalTerms,
    });

    const deepSeekStartAt = Date.now();
    console.info('WHISPER_DEEPSEEK_START', {
      ts: deepSeekStartAt,
    });

    const deepSeekResult = await decideTranscriptWithDeepSeek({
      deepgramTranscript: input.originalTranscript,
      whisperTranscript: whisperTranscript || input.originalTranscript,
      suspiciousReasons: input.suspiciousReasons,
      toothContext: input.toothContext ?? null,
      surfaceContext: input.surfaceContext ?? null,
      clinicalContext: correctionContext,
    });

    const deepSeekDoneAt = Date.now();
    console.info('WHISPER_DEEPSEEK_DONE', {
      deepSeekDurationMs: deepSeekDoneAt - deepSeekStartAt,
      ts: deepSeekDoneAt,
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
    const whisperDoneAt = Date.now();
    console.info('WHISPER_DONE', {
      aiVerified: result.aiVerified,
      ts: whisperDoneAt,
    });
    console.info('LATENCY_WHISPER', {
      ms: whisperDoneAt - whisperStartAt,
    });
    return result;
  } catch (error) {
    console.info('WHISPER_FALLBACK', {
      reason: error instanceof Error ? error.message : 'unknown error',
      originalTranscript: input.originalTranscript,
      suspiciousReasons: input.suspiciousReasons,
    });
    console.info('WHISPER_VERIFY_COMPLETE', fallbackResult);
    const whisperDoneAt = Date.now();
    console.info('WHISPER_DONE', {
      aiVerified: false,
      fallback: true,
      ts: whisperDoneAt,
    });
    console.info('LATENCY_WHISPER', {
      ms: whisperDoneAt - whisperStartAt,
    });
    return fallbackResult;
  }
}