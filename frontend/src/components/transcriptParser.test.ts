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
    expect(payload?.tooth).toBe(14);
  });

  it.each([
    ['missing 14', 14, { missing: true }],
    ['implant 5', 5, { implant: true }],
    ['bleeding 17', 17, { bleeding: true }],
  ])('attaches %s to the spoken tooth', (transcript, tooth, expectations) => {
    const payload = parseTranscriptToPayload(transcript, context);

    expect(payload?.tooth).toBe(tooth);
    expect(payload).toEqual(expect.objectContaining(expectations));
  });

  it('captures explicit furcation class and surface metadata', () => {
    const payload = parseTranscriptToPayload('furcation 46 buccal class 2', context);

    expect(payload?.tooth).toBe(46);
    expect(payload?.surface).toBe('buccal');
    expect(payload?.furcationClass).toBe(2);
    expect(payload?.furcationSurface).toBe('buccal');
  });

  it('captures explicit mobility class metadata', () => {
    const payload = parseTranscriptToPayload('mobility 44 class 1', context);

    expect(payload?.tooth).toBe(44);
    expect(payload?.mobilityClass).toBe(1);
  });

  it('attaches tooth-only findings to the current cursor tooth when no tooth is spoken', () => {
    const openPayload = parseTranscriptToPayload('open', context);
    const chartedPayload = parseTranscriptToPayload('charted', context);
    const bleedingPayload = parseTranscriptToPayload('interproximal bleeding', context);

    expect(openPayload?.tooth).toBe(14);
    expect(openPayload?.chartStatus).toBe('open');
    expect(chartedPayload?.tooth).toBe(14);
    expect(chartedPayload?.chartStatus).toBe('charted');
    expect(bleedingPayload?.tooth).toBe(14);
    expect(bleedingPayload?.bleeding).toBe(true);
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
    ['mobility', 'command'],
    ['furcation', 'command'],
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