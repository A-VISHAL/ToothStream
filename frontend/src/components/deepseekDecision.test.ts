import { decideTranscriptWithDeepSeek } from './deepseekDecision';

describe('decideTranscriptWithDeepSeek', () => {
  it('uses deepseek-v3.2 as the primary model and returns a verified decision on 200', async () => {
    const previousReactAppKey = process.env.REACT_APP_OXLO_API_KEY;
    const previousViteKey = process.env.VITE_OXLO_API_KEY;
    process.env.REACT_APP_OXLO_API_KEY = 'test-oxlo-key';
    delete process.env.VITE_OXLO_API_KEY;

    const infoSpy = jest.spyOn(console, 'info').mockImplementation(() => undefined);
    const fetchSpy = jest.spyOn(globalThis as any, 'fetch');

    fetchSpy.mockImplementationOnce(async (_url, init) => {
      expect(init).toEqual(
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-oxlo-key',
          }),
          body: expect.any(String),
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
                  correctedTranscript: 'lower left three three two',
                  confidence: 0.87,
                  reasoning: 'Primary model accepted the clinical context.',
                  aiVerified: true,
                  decision: 'deepgram',
                }),
              },
            },
          ],
        }),
      };
    });

    const result = await decideTranscriptWithDeepSeek({
      deepgramTranscript: 'lower left 332',
      whisperTranscript: 'lower left 332',
      suspiciousReasons: ['suspicious_number_pattern'],
      toothContext: 19,
      surfaceContext: 'buccal',
      clinicalContext: {
        currentTooth: 19,
        lastCommittedTooth: 18,
        currentSurface: 'buccal',
        lastTripletContext: {
          tooth: 18,
          surface: 'buccal',
          siteIndex: 1,
          depth: [3, 2, 3],
        },
        recentTranscriptHistory: [
          { text: '323', timestamp: 1, source: 'deepgram' },
          { text: 'bleeding', timestamp: 2, source: 'deepgram' },
        ],
        suspiciousReasons: ['suspicious_number_pattern'],
        parsedFindings: ['bleeding'],
        knownDentalTerms: ['recession', 'furcation', 'bleeding'],
        termCorrectionHints: [
          { from: 'resolution', to: 'recession', reason: 'phonetic mismatch' },
        ],
        recommendedAttachment: {
          target: 'last_committed_tooth',
          reason: 'modifier should attach to previous tooth',
        },
      },
    });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(result).toEqual(
      expect.objectContaining({
        correctedTranscript: 'lower left three three two',
        aiVerified: true,
        decision: 'deepgram',
        attachmentTarget: 'last_committed_tooth',
      })
    );
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(infoSpy).toHaveBeenCalledWith(
      'DEEPSEEK_AUTH_CHECK',
      expect.objectContaining({
        keyPresent: true,
        keyLength: 'test-oxlo-key'.length,
        modelName: 'deepseek-v3.2',
      })
    );
    expect(infoSpy).toHaveBeenCalledWith(
      'DEEPSEEK_REQUEST_START',
      expect.objectContaining({
        modelName: 'deepseek-v3.2',
      })
    );
    expect(infoSpy).toHaveBeenCalledWith(
      'DEEPSEEK_CONTEXT_REQUEST',
      expect.objectContaining({
        currentTooth: 19,
        lastCommittedTooth: 18,
      })
    );
    expect(infoSpy).toHaveBeenCalledWith(
      'DEEPSEEK_RESPONSE',
      expect.objectContaining({
        ok: true,
        status: 200,
        modelName: 'deepseek-v3.2',
      })
    );
    expect(infoSpy).toHaveBeenCalledWith(
      'DEEPSEEK_DECISION',
      expect.objectContaining({
        correctedTranscript: 'lower left three three two',
        modelName: 'deepseek-v3.2',
      })
    );
    expect(infoSpy).toHaveBeenCalledWith(
      'AI_VERIFIED',
      expect.objectContaining({
        correctedTranscript: 'lower left three three two',
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
