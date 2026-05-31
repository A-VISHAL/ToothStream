import { buildLiveClinicalRulesInput } from './clinicalRulesBridge';
import type { PerioPayload } from '../types';

describe('buildLiveClinicalRulesInput', () => {
  it('derives a rule input from a depth commit with unexpected transcript noise', () => {
    const payload: PerioPayload = {
      tooth: 14,
      depth: [3, 2, 3],
      normalizedTranscript: 'banana 2 2 3',
    };

    const result = buildLiveClinicalRulesInput({
      transcript: 'banana two two three',
      payload,
      currentTooth: 14,
      currentSurface: 'buccal',
    });

    expect(result).not.toBeNull();
    expect(result?.depth).toEqual([3, 2, 3]);
    expect(result?.surface).toBe('buccal');
    expect(result?.parserAmbiguous).toBe(true);
    expect(result?.unexpectedTokens).toContain('banana');
  });

  it('derives an invalid-tooth fallback from a navigation transcript', () => {
    const result = buildLiveClinicalRulesInput({
      transcript: 'jump to forty',
      payload: null,
      currentTooth: 14,
      currentSurface: 'buccal',
    });

    expect(result).not.toBeNull();
    expect(result?.tooth).toBe(40);
  });

  it('passes through invalid surface tokens for rule evaluation', () => {
    const payload: PerioPayload = {
      tooth: 14,
      depth: [3, 2, 3],
    };

    const result = buildLiveClinicalRulesInput({
      transcript: 'tooth 14 labial 323',
      payload,
      currentTooth: 14,
      currentSurface: 'buccal',
    });

    expect(result).not.toBeNull();
    expect(result?.surface).toBe('labial');
  });

  it('ignores a surface-only selection transcript', () => {
    const result = buildLiveClinicalRulesInput({
      transcript: 'labial',
      payload: null,
      currentTooth: 14,
      currentSurface: 'buccal',
    });

    expect(result).toBeNull();
  });

  it.each([
    ['resolution two', 'recession'],
    ['vacation one', 'furcation'],
    ['inter proximal', 'interproximal'],
  ])('routes modifier ambiguity transcript %s', (transcript, expectedCanonical) => {
    const result = buildLiveClinicalRulesInput({
      transcript,
      payload: null,
      currentTooth: 14,
      currentSurface: 'buccal',
    });

    expect(result).not.toBeNull();
    expect(result?.parserAmbiguous).toBe(true);
    expect(result?.unexpectedTokens).toBeDefined();
    expect(result?.normalizedTranscript).toContain(expectedCanonical);
    expect(result?.transcript).toBe(transcript);
  });
});