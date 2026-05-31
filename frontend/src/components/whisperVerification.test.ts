import { verifySuspiciousTranscriptWithWhisper } from './whisperVerification';

describe('verifySuspiciousTranscriptWithWhisper', () => {
  it('returns the whisper transcript on success', async () => {
    const previousReactAppKey = process.env.REACT_APP_OXLO_API_KEY;
    const previousViteKey = process.env.VITE_OXLO_API_KEY;
    process.env.REACT_APP_OXLO_API_KEY = 'test-oxlo-key';
    delete process.env.VITE_OXLO_API_KEY;

    const infoSpy = jest.spyOn(console, 'info').mockImplementation(() => undefined);
    const fetchSpy = jest.spyOn(globalThis as any, 'fetch');

    fetchSpy
      .mockImplementationOnce(async (_url, init) => {
        expect(init).toEqual(
          expect.objectContaining({
            method: 'POST',
            headers: expect.objectContaining({
              Authorization: 'Bearer test-oxlo-key',
            }),
          })
        );

        return {
          ok: true,
          status: 200,
          json: async () => ({ text: 'verified 323' }),
        };
      })
      .mockImplementationOnce(async (_url, init) => {
        expect(init).toEqual(
          expect.objectContaining({
            method: 'POST',
            headers: expect.objectContaining({
              Authorization: 'Bearer test-oxlo-key',
            }),
          })
        );

        return {
          ok: true,
          status: 200,
          json: async () => ({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    correctedTranscript: 'verified 323',
                    confidence: 0.99,
                    reasoning: 'Whisper and clinical reasons agree.',
                    aiVerified: true,
                    decision: 'whisper',
                  }),
                },
              },
            ],
          }),
        };
      });

    const result = await verifySuspiciousTranscriptWithWhisper({
      audioChunks: [new Uint8Array([1, 2, 3, 4]).buffer],
      originalTranscript: 'banana 223',
      suspiciousReasons: ['suspicious_transcript'],
    });

    expect(result.whisperTranscript).toBe('verified 323');
    expect(result.originalTranscript).toBe('banana 223');
    expect(result.suspiciousReasons).toEqual(['suspicious_transcript']);
    expect(result.correctedTranscript).toBe('verified 323');
    expect(result.aiVerified).toBe(true);
    expect(fetchSpy).toHaveBeenCalled();
    expect(infoSpy).toHaveBeenCalledWith(
      'WHISPER_AUTH_CHECK',
      expect.objectContaining({
        keyPresent: true,
        keyLength: 'test-oxlo-key'.length,
        envName: 'REACT_APP_OXLO_API_KEY',
      })
    );
    expect(infoSpy).toHaveBeenCalledWith(
      'DEEPSEEK_DECISION',
      expect.objectContaining({
        correctedTranscript: 'verified 323',
        aiVerified: true,
      })
    );

    fetchSpy.mockRestore();
    infoSpy.mockRestore();

    process.env.REACT_APP_OXLO_API_KEY = previousReactAppKey;
    if (previousViteKey === undefined) {
      delete process.env.VITE_OXLO_API_KEY;
    } else {
      process.env.VITE_OXLO_API_KEY = previousViteKey;
    }
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
    expect(infoSpy).toHaveBeenCalledWith(
      'WHISPER_AUTH_CHECK',
      expect.objectContaining({
        keyPresent: true,
      })
    );

    infoSpy.mockRestore();
  });

  it('logs missing env when no Oxlo key is available', async () => {
    const previousReactAppKey = process.env.REACT_APP_OXLO_API_KEY;
    const previousViteKey = process.env.VITE_OXLO_API_KEY;
    delete process.env.REACT_APP_OXLO_API_KEY;
    delete process.env.VITE_OXLO_API_KEY;

    const infoSpy = jest.spyOn(console, 'info').mockImplementation(() => undefined);

    const result = await verifySuspiciousTranscriptWithWhisper({
      audioChunks: [],
      originalTranscript: '999',
      suspiciousReasons: ['suspicious_triplet'],
    });

    expect(result.whisperTranscript).toBe('999');
    expect(infoSpy).toHaveBeenCalledWith(
      'WHISPER_ENV_MISSING',
      expect.objectContaining({
        expectedEnvNames: ['REACT_APP_OXLO_API_KEY', 'VITE_OXLO_API_KEY'],
        runtime: 'browser',
      })
    );

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
});