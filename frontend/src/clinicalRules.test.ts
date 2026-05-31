import { evaluateClinicalRules } from './clinicalRules';

describe('evaluateClinicalRules', () => {
  it('verifies a normal triplet commit', () => {
    const result = evaluateClinicalRules({ tooth: 14, surface: 'buccal', depth: [3, 2, 3], confidence: 0.94 });

    expect(result.verified).toBe(true);
    expect(result.suspicious).toBe(false);
    expect(result.reasons).toEqual([]);
  });

  it('passes a second valid triplet', () => {
    const result = evaluateClinicalRules({ tooth: 11, surface: 'lingual', depth: [3, 9, 3], confidence: 0.9 });

    expect(result.verified).toBe(true);
    expect(result.suspicious).toBe(false);
  });

  it('flags low confidence', () => {
    const result = evaluateClinicalRules({ tooth: 14, surface: 'buccal', depth: [3, 2, 3], confidence: 0.6 });

    expect(result.verified).toBe(false);
    expect(result.suspicious).toBe(true);
    expect(result.reasons).toContain('low_confidence');
  });

  it('flags impossible depth below range', () => {
    const result = evaluateClinicalRules({ tooth: 14, surface: 'buccal', depth: [0, 2, 3], confidence: 0.95 });

    expect(result.verified).toBe(false);
    expect(result.reasons).toContain('impossible_depth');
  });

  it('flags impossible depth above range', () => {
    const result = evaluateClinicalRules({ tooth: 14, surface: 'buccal', depth: [3, 13, 3], confidence: 0.95 });

    expect(result.verified).toBe(false);
    expect(result.reasons).toContain('impossible_depth');
  });

  it('flags invalid tooth number', () => {
    const result = evaluateClinicalRules({ tooth: 40, surface: 'buccal', depth: [3, 2, 3], confidence: 0.95 });

    expect(result.verified).toBe(false);
    expect(result.reasons).toContain('invalid_tooth');
  });

  it('flags triplet conflict for missing site', () => {
    const result = evaluateClinicalRules({ tooth: 14, surface: 'buccal', depth: [3, 2], confidence: 0.95 });

    expect(result.verified).toBe(false);
    expect(result.reasons).toContain('triplet_conflict');
  });

  it('flags invalid surface', () => {
    const result = evaluateClinicalRules({ tooth: 14, surface: 'labial', depth: [3, 2, 3], confidence: 0.95 });

    expect(result.verified).toBe(false);
    expect(result.reasons).toContain('surface_conflict');
  });

  it('flags suspicious transcript when parser is ambiguous', () => {
    const result = evaluateClinicalRules({
      tooth: 14,
      surface: 'buccal',
      depth: [3, 2, 3],
      confidence: 0.95,
      parserAmbiguous: true,
      unexpectedTokens: ['maybe'],
    });

    expect(result.verified).toBe(false);
    expect(result.reasons).toContain('suspicious_transcript');
  });

  it('flags 999 as a suspicious triplet', () => {
    const infoSpy = jest.spyOn(console, 'info').mockImplementation(() => undefined);

    const result = evaluateClinicalRules({
      tooth: 14,
      surface: 'buccal',
      depth: [9, 9, 9],
      confidence: 0.95,
    });

    expect(result.verified).toBe(false);
    expect(result.suspicious).toBe(true);
    expect(result.reasons).toContain('suspicious_triplet');
    expect(infoSpy).toHaveBeenCalledWith(
      'CLINICAL_REALISM_CHECK',
      expect.objectContaining({
        averageDepth: 9,
        allHigh: true,
      })
    );

    infoSpy.mockRestore();
  });

  it('flags repeated extreme values', () => {
    const result = evaluateClinicalRules({
      tooth: 14,
      surface: 'buccal',
      depth: [8, 8, 2],
      confidence: 0.95,
    });

    expect(result.verified).toBe(false);
    expect(result.reasons).toContain('suspicious_triplet');
  });

  it('flags 888 as a suspicious triplet', () => {
    const result = evaluateClinicalRules({
      tooth: 14,
      surface: 'buccal',
      depth: [8, 8, 8],
      confidence: 0.95,
    });

    expect(result.verified).toBe(false);
    expect(result.reasons).toContain('suspicious_triplet');
  });

  it('flags a triplet with average depth above seven', () => {
    const result = evaluateClinicalRules({
      tooth: 14,
      surface: 'buccal',
      depth: [7, 8, 8],
      confidence: 0.95,
    });

    expect(result.verified).toBe(false);
    expect(result.reasons).toContain('suspicious_triplet');
  });

  it('flags statistical outlier without rejecting the commit', () => {
    const infoSpy = jest.spyOn(console, 'info').mockImplementation(() => undefined);

    const result = evaluateClinicalRules({
      tooth: 14,
      surface: 'buccal',
      depth: [3, 2, 11],
      confidence: 0.95,
      neighboringDepthAverage: [3, 2, 4],
    });

    expect(result.verified).toBe(true);
    expect(result.suspicious).toBe(false);
    expect(infoSpy).toHaveBeenCalledWith(
      'RULE_PASS',
      expect.objectContaining({
        rule: 'STATISTICAL_OUTLIER',
        flagged: true,
      })
    );

    infoSpy.mockRestore();
  });
});
