import { evaluateClinicalSpeechIntent, parseTranscriptToPayload } from './transcriptParser';

describe('transcriptParser clinical intent routing', () => {
  const context = {
    mode: 'navigation' as const,
    expectedInput: 'tooth' as const,
    currentTooth: 14,
    currentSurface: 'buccal' as const,
  };

  it('routes recession findings through the parser', () => {
    const filter = evaluateClinicalSpeechIntent('recession two', context);
    const payload = parseTranscriptToPayload('recession two', context);

    expect(filter.shouldProcess).toBe(true);
    expect(filter.reason).toBe('clinical keyword');
    expect(payload?.recession).toBe(2);
  });

  it('routes modifier aliases through the clinical gate', () => {
    const filter = evaluateClinicalSpeechIntent('vacation one', context);

    expect(filter.shouldProcess).toBe(true);
    expect(filter.aliasCandidate).toBe(true);
    expect(filter.aliasCanonical).toBe('furcation');
    expect(filter.reason).toBe('modifier alias detected');
  });

  it('normalizes resolution aliases into a parsable recession payload', () => {
    const filter = evaluateClinicalSpeechIntent('resolution two', context);
    const payload = parseTranscriptToPayload('resolution two', context);

    expect(filter.shouldProcess).toBe(true);
    expect(filter.aliasCandidate).toBe(true);
    expect(filter.aliasCanonical).toBe('recession');
    expect(filter.normalizedTranscript).toBe('recession two');
    expect(payload?.recession).toBe(2);
  });

  it.each([
    ['healthy', 'command'],
    ['bleeding', 'command'],
    ['implant', 'command'],
    ['mobility', 'keyword'],
    ['furcation', 'keyword'],
    ['exudate', 'keyword'],
  ])('treats %s as clinical speech', (phrase, intent) => {
    const filter = evaluateClinicalSpeechIntent(phrase, context);

    expect(filter.shouldProcess).toBe(true);
    expect(filter.intent).toBe(intent);
  });

  it('preserves inter proximal as a clinical alias candidate', () => {
    const filter = evaluateClinicalSpeechIntent('inter proximal', context);

    expect(filter.shouldProcess).toBe(true);
    expect(filter.aliasCandidate).toBe(true);
    expect(filter.aliasCanonical).toBe('interproximal');
    expect(filter.normalizedTranscript).toBe('interproximal');
  });
});