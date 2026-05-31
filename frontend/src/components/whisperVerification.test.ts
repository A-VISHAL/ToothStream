import { verifySuspiciousTranscriptWithWhisper, WHISPER_MAX_AUDIO_CHUNKS } from './whisperVerification';

describe('verifySuspiciousTranscriptWithWhisper', () => {
  it('returns the whisper transcript on success', async () => {
    const infoSpy = jest.spyOn(console, 'info').mockImplementation(() => undefined);
    const fetchSpy = jest.spyOn(globalThis as any, 'fetch');

    fetchSpy
      .mockImplementationOnce(async (_url, init) => {
        const requestInit = init as RequestInit | undefined;

        expect(requestInit?.method).toBe('POST');

        const body = requestInit?.body as FormData;
        const file = body.get('file') as Blob | null;
        if (!file) {
          throw new Error('Expected a whisper audio file to be attached to the request body.');
        }

        expect(file.size).toBe(44 + 4);

        return {
          ok: true,
          status: 200,
          json: async () => ({ whisperTranscript: 'verified 323' }),
        };
      })
      .mockImplementationOnce(async (_url, init) => {
        const requestInit = init as RequestInit | undefined;

        expect(requestInit?.method).toBe('POST');

        const headers = requestInit?.headers as Headers | undefined;
        expect(headers?.get('Content-Type')).toBe('application/json');

        return {
          ok: true,
          status: 200,
          json: async () => ({
            response: {
              text: JSON.stringify({
                correctedTranscript: 'verified 323',
                confidence: 0.99,
                reasoning: 'Whisper and clinical reasons agree.',
                aiVerified: true,
                decision: 'whisper',
              }),
            },
          }),
        };
      });

    const result = await verifySuspiciousTranscriptWithWhisper({
      audioChunks: [new Uint8Array([1, 2, 3, 4]).buffer],
      originalTranscript: 'banana 223',
      suspiciousReasons: ['suspicious_transcript'],
      currentTooth: 14,
      lastCommittedTooth: 13,
      currentSurface: 'buccal',
      recentTranscriptHistory: [
        { text: '323', timestamp: 1, source: 'deepgram' },
        { text: 'bleeding', timestamp: 2, source: 'deepgram' },
      ],
    });

    expect(result.whisperTranscript).toBe('verified 323');
    expect(result.originalTranscript).toBe('banana 223');
    expect(result.suspiciousReasons).toEqual(['suspicious_transcript']);
    expect(fetchSpy).toHaveBeenCalled();
    expect(infoSpy.mock.calls.some(([label, payload]) => label === 'WHISPER_AUTH_CHECK' && (payload as { usingBackendProxy?: boolean })?.usingBackendProxy === true)).toBe(true);

    fetchSpy.mockRestore();
    infoSpy.mockRestore();
  });

  it('falls back when no audio chunks are available', async () => {
    const infoSpy = jest.spyOn(console, 'info').mockImplementation(() => undefined);
    const fetchSpy = jest.spyOn(globalThis as any, 'fetch');

    const result = await verifySuspiciousTranscriptWithWhisper({
      audioChunks: [],
      originalTranscript: '999',
      suspiciousReasons: ['suspicious_triplet'],
    });

    expect(result.whisperTranscript).toBe('999');
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(infoSpy.mock.calls.some(([label, payload]) => label === 'WHISPER_AUTH_CHECK' && (payload as { usingBackendProxy?: boolean })?.usingBackendProxy === true)).toBe(true);

    infoSpy.mockRestore();
  });

  it('trims the whisper audio window before upload', async () => {
    const previousReactAppKey = process.env.REACT_APP_OXLO_API_KEY;
    const previousViteKey = process.env.VITE_OXLO_API_KEY;
    process.env.REACT_APP_OXLO_API_KEY = 'test-oxlo-key';
    delete process.env.VITE_OXLO_API_KEY;

    const infoSpy = jest.spyOn(console, 'info').mockImplementation(() => undefined);
    const fetchSpy = jest.spyOn(globalThis as any, 'fetch');
    const audioChunks = Array.from({ length: WHISPER_MAX_AUDIO_CHUNKS + 10 }, (_, index) => new Uint8Array([index, index + 1]).buffer);

    fetchSpy
      .mockImplementationOnce(async (_url, init) => {
        const requestInit = init as RequestInit | undefined;
        const formData = requestInit?.body as FormData;
        const file = formData.get('file') as Blob | null;

        if (!file) {
          throw new Error('Expected a whisper audio file to be attached to the request body.');
        }

        expect(file.size).toBe(44 + WHISPER_MAX_AUDIO_CHUNKS * 2);

        return {
          ok: true,
          status: 200,
          json: async () => ({ whisperTranscript: 'verified 323' }),
        };
      })
      .mockImplementationOnce(async (_url, init) => {
        const requestInit = init as RequestInit | undefined;

        expect(requestInit?.method).toBe('POST');

        const headers = requestInit?.headers as Headers | undefined;
        expect(headers?.get('Content-Type')).toBe('application/json');

        return {
          ok: true,
          status: 200,
          json: async () => ({
            response: {
              text: JSON.stringify({
                correctedTranscript: 'verified 323',
                confidence: 0.99,
                reasoning: 'Whisper and clinical reasons agree.',
                aiVerified: true,
                decision: 'whisper',
              }),
            },
          }),
        };
      });

    const result = await verifySuspiciousTranscriptWithWhisper({
      audioChunks,
      originalTranscript: 'banana 223',
      suspiciousReasons: ['suspicious_transcript'],
      currentTooth: 14,
      lastCommittedTooth: 13,
      currentSurface: 'buccal',
    });

    expect(result.whisperTranscript).toBe('verified 323');

    const windowTrimmedCall = infoSpy.mock.calls.find(([label]) => label === 'WHISPER_WINDOW_TRIMMED');
    expect(windowTrimmedCall).toBeDefined();

    const windowTrimmedPayload = windowTrimmedCall?.[1] as {
      originalChunks?: number;
      selectedChunks?: number;
      trimmedChunks?: number;
      maxChunks?: number;
      blobBytes?: number;
    } | undefined;

    expect(windowTrimmedPayload?.originalChunks).toBe(WHISPER_MAX_AUDIO_CHUNKS + 10);
    expect(windowTrimmedPayload?.selectedChunks).toBe(WHISPER_MAX_AUDIO_CHUNKS);
    expect(windowTrimmedPayload?.trimmedChunks).toBe(10);
    expect(windowTrimmedPayload?.maxChunks).toBe(WHISPER_MAX_AUDIO_CHUNKS);
    expect(windowTrimmedPayload?.blobBytes).toBe(44 + WHISPER_MAX_AUDIO_CHUNKS * 2);

    fetchSpy.mockRestore();
    infoSpy.mockRestore();

    if (previousReactAppKey === undefined) {
      delete process.env.REACT_APP_OXLO_API_KEY;
    } else {
      process.env.REACT_APP_OXLO_API_KEY = previousReactAppKey;
    }

    if (previousViteKey === undefined) {
      delete process.env.VITE_OXLO_API_KEY;
    } else {
      process.env.VITE_OXLO_API_KEY = previousViteKey;
    }
  });

  it('logs backend proxy mode when no audio chunks are available', async () => {
    const infoSpy = jest.spyOn(console, 'info').mockImplementation(() => undefined);

    const result = await verifySuspiciousTranscriptWithWhisper({
      audioChunks: [],
      originalTranscript: '999',
      suspiciousReasons: ['suspicious_triplet'],
    });

    expect(result.whisperTranscript).toBe('999');
    expect(infoSpy.mock.calls.some(([label, payload]) => label === 'WHISPER_AUTH_CHECK' && (payload as { usingBackendProxy?: boolean })?.usingBackendProxy === true)).toBe(true);

    infoSpy.mockRestore();
  });
});