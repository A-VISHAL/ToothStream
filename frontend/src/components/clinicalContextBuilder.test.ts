import { buildClinicalCorrectionContext } from './clinicalContextBuilder';

describe('clinicalContextBuilder', () => {
  it('builds dental context with workflow-aware attachment recommendation', () => {
    const result = buildClinicalCorrectionContext({
      deepgramTranscript: 'resolution two',
      whisperTranscript: 'recession two',
      currentTooth: 14,
      lastCommittedTooth: 13,
      currentSurface: 'buccal',
      lastTripletContext: {
        tooth: 13,
        surface: 'buccal',
        siteIndex: 1,
        depth: [3, 2, 3],
      },
      recentTranscriptHistory: [
        { text: '323', timestamp: 1, source: 'deepgram' },
        { text: 'bleeding', timestamp: 2, source: 'deepgram' },
        { text: 'resolution two', timestamp: 3, source: 'deepgram' },
      ],
      suspiciousReasons: ['suspicious_transcript'],
      parsedFindings: ['bleeding'],
    });

    expect(result.recommendedAttachment.target).toBe('last_committed_tooth');
    expect(result.termCorrectionHints).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          from: 'resolution',
          to: 'recession',
        }),
      ])
    );
    expect(result.recentTranscriptHistory).toHaveLength(3);
    expect(result.knownDentalTerms).toContain('recession');
  });
});
