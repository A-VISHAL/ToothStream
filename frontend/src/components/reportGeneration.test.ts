import { generateClinicalReport } from './reportGeneration';
import type { ToothState } from '../types';

function createToothState(overrides: Partial<ToothState> = {}): ToothState {
  return {
    toothNumber: 14,
    missing: false,
    implant: false,
    buccal: {
      depth: [3, 5, 7],
      bleeding: true,
      healthy: false,
      recession: 2,
      siteIndex: 1,
      updatedAt: 1,
    },
    lingual: {
      depth: [2, 4, 5],
      bleeding: false,
      healthy: false,
      recession: false,
      siteIndex: 1,
      updatedAt: 1,
    },
    updatedAt: 1,
    ...overrides,
  };
}

describe('generateClinicalReport', () => {
  it('returns a report from deepseek-v3.2 on success', async () => {
    const previousReactAppKey = process.env.REACT_APP_OXLO_API_KEY;
    const previousViteKey = process.env.VITE_OXLO_API_KEY;
    process.env.REACT_APP_OXLO_API_KEY = 'test-oxlo-key';
    delete process.env.VITE_OXLO_API_KEY;

    const infoSpy = jest.spyOn(console, 'info').mockImplementation(() => undefined);
    const fetchSpy = jest.spyOn(globalThis as any, 'fetch').mockImplementation(async (_url, init) => {
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
                  summary: 'Generalized periodontal concern with bleeding and deep pockets.',
                  findings: ['Bleeding present.', 'Deep pockets noted.'],
                  risk: 'Moderate periodontal concern',
                  treatment: 'SRP consideration and periodontal evaluation.',
                  aiNotes: 'AI-generated clinical support only. Not a medical diagnosis.',
                }),
              },
            },
          ],
        }),
      };
    });

    const result = await generateClinicalReport({
      teeth: {
        14: createToothState(),
      },
      currentTooth: 14,
      currentSurface: 'buccal',
      activeSiteIndex: 1,
      aiVerificationRecords: [
        {
          id: 'ai-1',
          timestamp: 1,
          originalTranscript: 'banana 223',
          whisperTranscript: 'banana 223',
          correctedTranscript: 'banana 223',
          confidence: 0.97,
          reasoning: 'Whisper and clinical reasons agree.',
          aiVerified: true,
          suspiciousReasons: ['suspicious_transcript'],
        },
      ],
    });

    expect(result).toEqual(
      expect.objectContaining({
        summary: 'Generalized periodontal concern with bleeding and deep pockets.',
        findings: ['Bleeding present.', 'Deep pockets noted.'],
        risk: 'Moderate periodontal concern',
        treatment: 'SRP consideration and periodontal evaluation.',
      })
    );
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(infoSpy).toHaveBeenCalledWith(
      'REPORT_TRIGGERED',
      expect.objectContaining({
        bleedingSurfaceCount: 1,
        pocketCount5Plus: 3,
        pocketCount7Plus: 1,
        aiVerificationRecords: 1,
      })
    );
    expect(infoSpy).toHaveBeenCalledWith(
      'REPORT_REQUEST_START',
      expect.objectContaining({
        modelName: 'deepseek-v3.2',
      })
    );
    expect(infoSpy).toHaveBeenCalledWith(
      'REPORT_GENERATED',
      expect.objectContaining({
        summary: 'Generalized periodontal concern with bleeding and deep pockets.',
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

  it('supports direct chart evidence input fields', async () => {
    const previousReactAppKey = process.env.REACT_APP_OXLO_API_KEY;
    const previousViteKey = process.env.VITE_OXLO_API_KEY;
    process.env.REACT_APP_OXLO_API_KEY = 'test-oxlo-key';
    delete process.env.VITE_OXLO_API_KEY;

    const infoSpy = jest.spyOn(console, 'info').mockImplementation(() => undefined);
    const fetchSpy = jest.spyOn(globalThis as any, 'fetch').mockImplementation(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        choices: [
          {
            message: {
              content: JSON.stringify({
                summary: 'Direct evidence report summary.',
                findings: ['Direct finding one.', 'Direct finding two.'],
                risk: 'Moderate periodontal concern',
                treatment: 'Direct evidence treatment direction.',
                aiNotes: 'AI-generated clinical support only. Not a medical diagnosis.',
              }),
            },
          },
        ],
      }),
    }));

    const result = await generateClinicalReport({
      depths: [
        {
          toothNumber: 14,
          surface: 'buccal',
          values: [3, 5, 7],
        },
      ],
      bleeding: [{ toothNumber: 14, surface: 'buccal', value: true }],
      recession: [{ toothNumber: 14, surface: 'buccal', value: 2 }],
      implant: [{ toothNumber: 12 }],
      mobility: [{ toothNumber: 14, value: 'Grade I' }],
      furcation: [{ toothNumber: 30, value: 'Grade II' }],
      healthy: [{ toothNumber: 15, surface: 'lingual', value: true }],
      missingTeeth: [3],
      aiVerifiedFindings: [
        {
          toothNumber: 14,
          surface: 'buccal',
          finding: 'AI verified deep pocket.',
          aiVerified: true,
        },
      ],
      aiVerificationRecords: [],
    });

    expect(result).toEqual(
      expect.objectContaining({
        summary: 'Direct evidence report summary.',
        findings: ['Direct finding one.', 'Direct finding two.'],
        risk: 'Moderate periodontal concern',
        treatment: 'Direct evidence treatment direction.',
      })
    );
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(infoSpy).toHaveBeenCalledWith(
      'REPORT_TRIGGERED',
      expect.objectContaining({
        evidenceMode: 'direct',
        bleedingSurfaceCount: 1,
        pocketCount5Plus: 2,
        pocketCount7Plus: 1,
        aiVerifiedFindings: 1,
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

  it('falls back safely when no Oxlo key is available', async () => {
    const previousReactAppKey = process.env.REACT_APP_OXLO_API_KEY;
    const previousViteKey = process.env.VITE_OXLO_API_KEY;
    delete process.env.REACT_APP_OXLO_API_KEY;
    delete process.env.VITE_OXLO_API_KEY;

    const infoSpy = jest.spyOn(console, 'info').mockImplementation(() => undefined);
    const fetchSpy = jest.spyOn(globalThis as any, 'fetch');

    const result = await generateClinicalReport({
      teeth: {
        14: createToothState(),
      },
      currentTooth: 14,
      currentSurface: 'buccal',
      activeSiteIndex: 1,
      aiVerificationRecords: [],
    });

    expect(result.summary).toContain('Chart evidence shows');
    expect(result.findings.length).toBeGreaterThan(0);
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(infoSpy).toHaveBeenCalledWith(
      'REPORT_FALLBACK',
      expect.objectContaining({
        reason: 'missing_oxlo_api_key',
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
