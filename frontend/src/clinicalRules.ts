export type ClinicalRuleReason =
  | 'low_confidence'
  | 'impossible_depth'
  | 'invalid_tooth'
  | 'triplet_conflict'
  | 'surface_conflict'
  | 'suspicious_transcript'
  | 'suspicious_triplet'
  | 'statistical_outlier';

export interface ClinicalRulesInput {
  tooth?: number | null;
  surface?: string | null;
  depth?: number[] | null;
  confidence?: number | null;
  transcript?: string | null;
  normalizedTranscript?: string | null;
  parserAmbiguous?: boolean;
  unexpectedTokens?: string[] | null;
  neighboringDepthAverage?: number | number[] | null;
}

export interface ClinicalRulesResult {
  verified: boolean;
  suspicious: boolean;
  reasons: ClinicalRuleReason[];
}

function logRule(event: string, detail: unknown) {
  console.info(event, detail);
}

function isValidSurface(surface: string | null | undefined): surface is 'buccal' | 'lingual' {
  if (!surface) {
    return false;
  }

  const lowered = surface.toLowerCase();
  return lowered === 'buccal' || lowered === 'lingual';
}

function toDepthArray(depth: number[] | null | undefined): number[] {
  return Array.isArray(depth) ? depth : [];
}

function getNeighborAverage(neighboringDepthAverage: number | number[] | null | undefined, siteIndex: number): number | null {
  if (typeof neighboringDepthAverage === 'number') {
    return neighboringDepthAverage;
  }

  if (Array.isArray(neighboringDepthAverage)) {
    return typeof neighboringDepthAverage[siteIndex] === 'number' ? neighboringDepthAverage[siteIndex] ?? null : null;
  }

  return null;
}

function detectStatisticalOutlier(depth: number[], neighboringDepthAverage: number | number[] | null | undefined): boolean {
  if (depth.length === 0) {
    return false;
  }

  return depth.some((value, index) => {
    const average = getNeighborAverage(neighboringDepthAverage, index);

    if (average === null) {
      return false;
    }

    return Math.abs(value - average) > 4;
  });
}

function detectSuspiciousTriplet(depth: number[]): boolean {
  if (depth.length !== 3) {
    return false;
  }

  const averageDepth = depth.reduce((sum, value) => sum + value, 0) / depth.length;
  const allHigh = depth.every((value) => value >= 8);
  const repeatedExtremeValues = depth.some((value) => value >= 8 && depth.filter((candidate) => candidate === value).length >= 2);
  const repeatedExtremePattern = depth[0] === depth[1] && depth[1] === depth[2] && depth[0] >= 8;
  const clinicallyUnrealisticAverage = averageDepth > 7;

  logRule('CLINICAL_REALISM_CHECK', {
    depth,
    averageDepth,
    allHigh,
    repeatedExtremeValues,
    repeatedExtremePattern,
    clinicallyUnrealisticAverage,
  });

  return allHigh || repeatedExtremeValues || repeatedExtremePattern || clinicallyUnrealisticAverage;
}

export function evaluateClinicalRules(input: ClinicalRulesInput): ClinicalRulesResult {
  logRule('RULES_START', input);

  const reasons: ClinicalRuleReason[] = [];

  const confidence = typeof input.confidence === 'number' ? input.confidence : null;
  if (confidence !== null && confidence < 0.85) {
    reasons.push('low_confidence');
    logRule('RULE_FAIL', { rule: 'LOW_CONFIDENCE', confidence });
  } else {
    logRule('RULE_PASS', { rule: 'LOW_CONFIDENCE', confidence });
  }

  const tooth = typeof input.tooth === 'number' ? input.tooth : null;
  if (tooth !== null && (tooth < 1 || tooth > 32)) {
    reasons.push('invalid_tooth');
    logRule('RULE_FAIL', { rule: 'INVALID_TOOTH', tooth });
  } else {
    logRule('RULE_PASS', { rule: 'INVALID_TOOTH', tooth });
  }

  const depth = toDepthArray(input.depth);
  if (depth.length !== 3) {
    reasons.push('triplet_conflict');
    logRule('RULE_FAIL', { rule: 'TRIPLET_CONFLICT', depthLength: depth.length });
  } else {
    logRule('RULE_PASS', { rule: 'TRIPLET_CONFLICT', depthLength: depth.length });

    const impossible = depth.some((value) => value < 1 || value > 12);
    if (impossible) {
      reasons.push('impossible_depth');
      logRule('RULE_FAIL', { rule: 'IMPOSSIBLE_DEPTH', depth });
    } else {
      logRule('RULE_PASS', { rule: 'IMPOSSIBLE_DEPTH', depth });

      const suspiciousTriplet = detectSuspiciousTriplet(depth);
      if (suspiciousTriplet) {
        reasons.push('suspicious_triplet');
        logRule('RULE_FAIL', { rule: 'SUSPICIOUS_TRIPLET', depth });
      } else {
        logRule('RULE_PASS', { rule: 'SUSPICIOUS_TRIPLET', depth });
      }
    }
  }

  if (!isValidSurface(input.surface)) {
    reasons.push('surface_conflict');
    logRule('RULE_FAIL', { rule: 'SURFACE_CONFLICT', surface: input.surface ?? null });
  } else {
    logRule('RULE_PASS', { rule: 'SURFACE_CONFLICT', surface: input.surface });
  }

  const suspiciousTranscript = Boolean(input.parserAmbiguous || (Array.isArray(input.unexpectedTokens) && input.unexpectedTokens.length > 0));
  if (suspiciousTranscript) {
    reasons.push('suspicious_transcript');
    logRule('RULE_FAIL', {
      rule: 'SUSPICIOUS_TRANSCRIPT',
      parserAmbiguous: Boolean(input.parserAmbiguous),
      unexpectedTokens: input.unexpectedTokens ?? [],
    });
  } else {
    logRule('RULE_PASS', {
      rule: 'SUSPICIOUS_TRANSCRIPT',
      parserAmbiguous: Boolean(input.parserAmbiguous),
      unexpectedTokens: input.unexpectedTokens ?? [],
    });
  }

  const outlier = detectStatisticalOutlier(depth, input.neighboringDepthAverage);
  if (outlier) {
    logRule('RULE_PASS', {
      rule: 'STATISTICAL_OUTLIER',
      flagged: true,
      depth,
      neighboringDepthAverage: input.neighboringDepthAverage,
    });
  } else {
    logRule('RULE_PASS', {
      rule: 'STATISTICAL_OUTLIER',
      flagged: false,
      depth,
      neighboringDepthAverage: input.neighboringDepthAverage,
    });
  }

  const verified = reasons.length === 0;
  const suspicious = reasons.length > 0;

  if (verified) {
    logRule('IMMEDIATE_COMMIT', { verified, suspicious, reasons });
  } else {
    logRule('SUSPICIOUS_CASE', { verified, suspicious, reasons });
    logRule('WHISPER_CANDIDATE', { verified, suspicious, reasons });
  }

  return {
    verified,
    suspicious,
    reasons,
  };
}
