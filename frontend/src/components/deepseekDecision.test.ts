import { decideTranscriptWithDeepSeek } from './deepseekDecision';

describe('decideTranscriptWithDeepSeek', () => {
  it('logs model access denial and retries with a fallback slug on 403', async () => {
    const previousReactAppKey = process.env.REACT_APP_OXLO_API_KEY;
    const previousViteKey = process.env.VITE_OXLO_API_KEY;
    process.env.REACT_APP_OXLO_API_KEY = 'test-oxlo-key';
    delete process.env.VITE_OXLO_API_KEY;

    const infoSpy = jest.spyOn(console, 'info').mockImplementation(() => undefined);
    const fetchSpy = jest.spyOn(globalThis as any, 'fetch');

    fetchSpy
      .mockImplementationOnce(async () => ({
        ok: false,
        status: 403,
        text: async () => 'model access denied',
      }))
      .mockImplementationOnce(async () => ({
        ok: true,
        status: 200,
        json: async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  correctedTranscript: 'lower left three three two',
                  confidence: 0.87,
                  reasoning: 'Fallback model accepted the clinical context.',
                  aiVerified: true,
                  decision: 'deepgram',
                }),
              },
            },
          ],
        }),
      }));

    const result = await decideTranscriptWithDeepSeek({
      deepgramTranscript: 'lower left 332',
      whisperTranscript: 'lower left 332',
      suspiciousReasons: ['suspicious_number_pattern'],
      toothContext: 19,
      surfaceContext: 'buccal',
    });

    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(result).toEqual(
      expect.objectContaining({
        correctedTranscript: 'lower left three three two',
        aiVerified: true,
        decision: 'deepgram',
      })
    );
    expect(infoSpy).toHaveBeenCalledWith(
      'DEEPSEEK_AUTH_CHECK',
      expect.objectContaining({
        keyPresent: true,
        keyLength: 'test-oxlo-key'.length,
        modelName: 'deepseek-v3-0324',
      })
    );
    expect(infoSpy).toHaveBeenCalledWith(
      'DEEPSEEK_MODEL_ACCESS',
      expect.objectContaining({
        modelName: 'deepseek-v3-0324',
        status: 403,
        responseBodyText: 'model access denied',
      })
    );
    expect(infoSpy).toHaveBeenCalledWith(
      'DEEPSEEK_AUTH_CHECK',
      expect.objectContaining({
        modelName: 'deepseek-v3.2',
      })
    );

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
});
