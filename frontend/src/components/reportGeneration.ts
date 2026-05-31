import type { AiVerificationRecord, ToothState, ToothSurface } from '../types';
import { apiBaseUrl } from './apiConfig';

const BACKEND_REPORT_ENDPOINT = `${apiBaseUrl}/api/generate-report`;
const OXLO_MODEL = 'deepseek-v3.2';

export interface ClinicalReportInput {
  teeth?: Record<number, ToothState>;
  currentTooth?: number | null;
  currentSurface?: ToothSurface | null;
  activeSiteIndex?: number | null;
  aiVerificationRecords?: AiVerificationRecord[];
  depths?: unknown;
  bleeding?: unknown;
  recession?: unknown;
  implant?: unknown;
  mobility?: unknown;
  furcation?: unknown;
  healthy?: unknown;
  missingTeeth?: unknown;
  aiVerifiedFindings?: unknown;
}

export interface ClinicalReportOutput {
  summary: string;
  findings: string[];
  risk: string;
  treatment: string;
  aiNotes: string;
}

interface ChartEvidence {
  missingTeeth: number[];
  implantTeeth: number[];
  bleedingSurfaceCount: number;
  healthySurfaceCount: number;
  recessionSurfaceCount: number;
  pocketCount4Plus: number;
  pocketCount5Plus: number;
  pocketCount7Plus: number;
  highestDepth: number;
  siteLabels: string[];
  mobility: Array<{ toothNumber: number; value: string }>;
  furcation: Array<{ toothNumber: number; value: string }>;
  aiVerificationRecords: AiVerificationRecord[];
  aiVerifiedFindings: string[];
}

interface NormalizedReportResult {
  result: ClinicalReportOutput;
  usedFallback: boolean;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function toNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value.trim());
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return null;
}

function toTruthyBoolean(value: unknown): boolean {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'number') {
    return value !== 0;
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    return normalized === 'true' || normalized === 'yes' || normalized === 'y' || normalized === '1';
  }

  return Boolean(value);
}

function normalizeArray(value: unknown): unknown[] {
  if (Array.isArray(value)) {
    return value;
  }

  if (value === undefined || value === null) {
    return [];
  }

  return [value];
}

function hasDirectChartEvidence(input: ClinicalReportInput): boolean {
  return [
    input.depths,
    input.bleeding,
    input.recession,
    input.implant,
    input.mobility,
    input.furcation,
    input.healthy,
    input.missingTeeth,
    input.aiVerifiedFindings,
  ].some((value) => value !== undefined);
}

function extractToothNumber(entry: unknown): number | null {
  if (typeof entry === 'number' || typeof entry === 'string') {
    return toNumber(entry);
  }

  if (isRecord(entry)) {
    return toNumber(entry.toothNumber ?? entry.tooth ?? entry.toothNo ?? entry.toothId);
  }

  return null;
}

function extractSurface(entry: unknown, fallbackSurface: ToothSurface | null): ToothSurface | null {
  if (isRecord(entry)) {
    const surfaceValue = entry.surface ?? entry.surfaceName ?? entry.siteSurface;
    if (surfaceValue === 'buccal' || surfaceValue === 'lingual') {
      return surfaceValue;
    }
  }

  return fallbackSurface;
}

function extractNumberList(value: unknown): number[] {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? [value] : [];
  }

  if (typeof value === 'string') {
    const parsed = toNumber(value);
    return parsed === null ? [] : [parsed];
  }

  if (Array.isArray(value)) {
    return value.flatMap((entry) => extractNumberList(entry));
  }

  if (isRecord(value)) {
    const nestedValues = [value.value, value.values, value.depth, value.depths, value.sites];
    return nestedValues.flatMap((nested) => extractNumberList(nested));
  }

  return [];
}

function extractBooleanFlag(value: unknown): boolean {
  return toTruthyBoolean(value);
}

function normalizeIndexedEntry(entry: unknown, fallbackField: string): { toothNumber: number; value: string } | null {
  const toothNumber = extractToothNumber(entry);
  if (toothNumber === null) {
    return null;
  }

  if (typeof entry === 'string') {
    return { toothNumber, value: entry.trim() };
  }

  if (isRecord(entry)) {
    const rawValue = entry.value ?? entry[fallbackField] ?? entry.label ?? entry.text;
    if (typeof rawValue === 'string' && rawValue.trim()) {
      return { toothNumber, value: rawValue.trim() };
    }

    if (typeof rawValue === 'number' && Number.isFinite(rawValue)) {
      return { toothNumber, value: String(rawValue) };
    }
  }

  return null;
}

function normalizeVerifiedFinding(entry: unknown): string | null {
  if (typeof entry === 'string') {
    return entry.trim() || null;
  }

  if (!isRecord(entry)) {
    return null;
  }

  const label =
    typeof entry.finding === 'string'
      ? entry.finding
      : typeof entry.text === 'string'
        ? entry.text
        : typeof entry.label === 'string'
          ? entry.label
          : '';

  if (!label.trim()) {
    return null;
  }

  const toothNumber = extractToothNumber(entry);
  const surface = extractSurface(entry, null);
  const prefixParts: string[] = [];

  if (toothNumber !== null) {
    prefixParts.push(`tooth ${toothNumber}`);
  }

  if (surface) {
    prefixParts.push(surface);
  }

  if (prefixParts.length === 0) {
    return label.trim();
  }

  return `${prefixParts.join(' ')}: ${label.trim()}`;
}

function summarizeDirectChartEvidence(input: ClinicalReportInput): ChartEvidence {
  const evidence: ChartEvidence = {
    missingTeeth: [],
    implantTeeth: [],
    bleedingSurfaceCount: 0,
    healthySurfaceCount: 0,
    recessionSurfaceCount: 0,
    pocketCount4Plus: 0,
    pocketCount5Plus: 0,
    pocketCount7Plus: 0,
    highestDepth: 0,
    siteLabels: [],
    mobility: [],
    furcation: [],
    aiVerificationRecords: input.aiVerificationRecords ?? [],
    aiVerifiedFindings: [],
  };

  const uniqueMissingTeeth = new Set<number>();
  const uniqueImplantTeeth = new Set<number>();

  for (const entry of normalizeArray(input.missingTeeth)) {
    const toothNumber = extractToothNumber(entry);
    if (toothNumber !== null) {
      uniqueMissingTeeth.add(toothNumber);
    }
  }

  for (const entry of normalizeArray(input.implant)) {
    const toothNumber = extractToothNumber(entry);
    if (toothNumber !== null) {
      uniqueImplantTeeth.add(toothNumber);
    }
  }

  for (const toothNumber of Array.from(uniqueMissingTeeth)) {
    evidence.missingTeeth.push(toothNumber);
  }

  for (const toothNumber of Array.from(uniqueImplantTeeth)) {
    evidence.implantTeeth.push(toothNumber);
  }

  for (const entry of normalizeArray(input.depths)) {
    const toothNumber = extractToothNumber(entry);
    const surface = extractSurface(entry, input.currentSurface ?? null);
    const depthValues = extractNumberList(entry);
    const labelPrefix = toothNumber !== null ? `${toothNumber}-${surface ?? 'site'}` : surface ?? 'site';

    depthValues.forEach((depth, siteIndex) => {
      if (depth >= 4) {
        evidence.pocketCount4Plus += 1;
      }

      if (depth >= 5) {
        evidence.pocketCount5Plus += 1;
      }

      if (depth >= 7) {
        evidence.pocketCount7Plus += 1;
      }

      if (depth > evidence.highestDepth) {
        evidence.highestDepth = depth;
      }

      evidence.siteLabels.push(`${labelPrefix}-${siteIndex + 1}:${depth}`);
    });
  }

  for (const entry of normalizeArray(input.bleeding)) {
    if (isRecord(entry)) {
      if (extractBooleanFlag(entry.bleeding ?? entry.value ?? entry.flag ?? entry.present)) {
        evidence.bleedingSurfaceCount += 1;
      }
      continue;
    }

    if (extractBooleanFlag(entry)) {
      evidence.bleedingSurfaceCount += 1;
    }
  }

  for (const entry of normalizeArray(input.healthy)) {
    if (isRecord(entry)) {
      if (extractBooleanFlag(entry.healthy ?? entry.value ?? entry.flag ?? entry.present)) {
        evidence.healthySurfaceCount += 1;
      }
      continue;
    }

    if (extractBooleanFlag(entry)) {
      evidence.healthySurfaceCount += 1;
    }
  }

  for (const entry of normalizeArray(input.recession)) {
    if (isRecord(entry)) {
      const recessionValue = entry.recession ?? entry.value ?? entry.depth;
      if (typeof recessionValue === 'number' ? recessionValue > 0 : extractBooleanFlag(recessionValue)) {
        evidence.recessionSurfaceCount += 1;
      }
      continue;
    }

    if (typeof entry === 'number' ? entry > 0 : extractBooleanFlag(entry)) {
      evidence.recessionSurfaceCount += 1;
    }
  }

  for (const entry of normalizeArray(input.mobility)) {
    const normalized = normalizeIndexedEntry(entry, 'mobility');
    if (normalized) {
      evidence.mobility.push(normalized);
    }
  }

  for (const entry of normalizeArray(input.furcation)) {
    const normalized = normalizeIndexedEntry(entry, 'furcation');
    if (normalized) {
      evidence.furcation.push(normalized);
    }
  }

  for (const entry of normalizeArray(input.aiVerifiedFindings)) {
    const normalized = normalizeVerifiedFinding(entry);
    if (normalized) {
      evidence.aiVerifiedFindings.push(normalized);
    }
  }

  return evidence;
}

function summarizeSurface(surface: ToothState['buccal'], toothNumber: number, surfaceName: ToothSurface, evidence: ChartEvidence) {
  const surfaceLabel = `${toothNumber}-${surfaceName}`;

  if (surface.bleeding) {
    evidence.bleedingSurfaceCount += 1;
  }

  if (surface.healthy) {
    evidence.healthySurfaceCount += 1;
  }

  if (surface.recession !== undefined && surface.recession !== false) {
    evidence.recessionSurfaceCount += 1;
  }

  surface.depth.forEach((depth, siteIndex) => {
    if (typeof depth !== 'number') {
      return;
    }

    if (depth >= 4) {
      evidence.pocketCount4Plus += 1;
    }

    if (depth >= 5) {
      evidence.pocketCount5Plus += 1;
    }

    if (depth >= 7) {
      evidence.pocketCount7Plus += 1;
    }

    if (depth > evidence.highestDepth) {
      evidence.highestDepth = depth;
    }

    evidence.siteLabels.push(`${surfaceLabel}-${siteIndex + 1}:${depth}`);
  });
}

function collectChartEvidence(input: ClinicalReportInput): ChartEvidence {
  if (hasDirectChartEvidence(input)) {
    return summarizeDirectChartEvidence(input);
  }

  const evidence: ChartEvidence = {
    missingTeeth: [],
    implantTeeth: [],
    bleedingSurfaceCount: 0,
    healthySurfaceCount: 0,
    recessionSurfaceCount: 0,
    pocketCount4Plus: 0,
    pocketCount5Plus: 0,
    pocketCount7Plus: 0,
    highestDepth: 0,
    siteLabels: [],
    mobility: [],
    furcation: [],
    aiVerificationRecords: input.aiVerificationRecords ?? [],
    aiVerifiedFindings: [],
  };

  for (const tooth of Object.values(input.teeth ?? {})) {
    if (tooth.missing) {
      evidence.missingTeeth.push(tooth.toothNumber);
    }

    if (tooth.implant) {
      evidence.implantTeeth.push(tooth.toothNumber);
    }

    summarizeSurface(tooth.buccal, tooth.toothNumber, 'buccal', evidence);
    summarizeSurface(tooth.lingual, tooth.toothNumber, 'lingual', evidence);
  }

  evidence.mobility = normalizeArray(input.mobility)
    .map((entry) => normalizeIndexedEntry(entry, 'mobility'))
    .filter((entry): entry is { toothNumber: number; value: string } => Boolean(entry));

  evidence.furcation = normalizeArray(input.furcation)
    .map((entry) => normalizeIndexedEntry(entry, 'furcation'))
    .filter((entry): entry is { toothNumber: number; value: string } => Boolean(entry));

  evidence.aiVerifiedFindings = normalizeArray(input.aiVerifiedFindings)
    .map((entry) => normalizeVerifiedFinding(entry))
    .filter((entry): entry is string => Boolean(entry));

  return evidence;
}

function buildEvidencePrompt(evidence: ChartEvidence, input: ClinicalReportInput): string {
  const latestVerification = evidence.aiVerificationRecords[0];

  return [
    'Generate a professional periodontal report from chart evidence only.',
    'Do not infer patient demographics, medical history, or a definitive diagnosis.',
    'Use only the data provided below.',
    'Return strict JSON only with keys summary, findings, risk, treatment, aiNotes.',
    'Findings must be an array of short bullet strings.',
    '',
    `Current context tooth: ${input.currentTooth ?? 'none'}`,
    `Current context surface: ${input.currentSurface ?? 'none'}`,
    `Current context site index: ${input.activeSiteIndex ?? 'none'}`,
    '',
    `Pocket depth counts: >=4mm=${evidence.pocketCount4Plus}, >=5mm=${evidence.pocketCount5Plus}, >=7mm=${evidence.pocketCount7Plus}`,
    `Highest pocket depth: ${evidence.highestDepth}`,
    `Bleeding surfaces: ${evidence.bleedingSurfaceCount}`,
    `Healthy surfaces: ${evidence.healthySurfaceCount}`,
    `Recession surfaces: ${evidence.recessionSurfaceCount}`,
    `Missing teeth: ${evidence.missingTeeth.length ? evidence.missingTeeth.join(', ') : 'none'}`,
    `Implant teeth: ${evidence.implantTeeth.length ? evidence.implantTeeth.join(', ') : 'none'}`,
    `Mobility entries: ${evidence.mobility.length ? JSON.stringify(evidence.mobility) : 'none'}`,
    `Furcation entries: ${evidence.furcation.length ? JSON.stringify(evidence.furcation) : 'none'}`,
    `AI verification records: ${evidence.aiVerificationRecords.length}`,
    `AI verified findings: ${evidence.aiVerifiedFindings.length ? evidence.aiVerifiedFindings.join(' | ') : 'none'}`,
    latestVerification
      ? `Latest AI verification: ${JSON.stringify({
          originalTranscript: latestVerification.originalTranscript,
          whisperTranscript: latestVerification.whisperTranscript,
          correctedTranscript: latestVerification.correctedTranscript,
          confidence: latestVerification.confidence,
          reasoning: latestVerification.reasoning,
          aiVerified: latestVerification.aiVerified,
          suspiciousReasons: latestVerification.suspiciousReasons,
        })}`
      : 'Latest AI verification: none',
    '',
    'Clinical support notes:',
    '- Clinical Summary should synthesize the overall chart pattern.',
    '- Key Findings should mention bleeding, deep pockets, recession, implants, and missing teeth only if present.',
    '- Risk Assessment should be mild, moderate, or severe periodontal concern.',
    '- Suggested Treatment Direction should mention SRP consideration, periodontal evaluation, monitoring, or maintenance as appropriate.',
    '- AI Notes should say this is AI-generated clinical support and not a medical diagnosis.',
  ].join('\n');
}

function buildSummaryLine(evidence: ChartEvidence): string {
  const parts: string[] = [];

  if (evidence.pocketCount5Plus > 0) {
    parts.push(`multiple sites with pocketing ${evidence.highestDepth >= 7 ? 'up to severe' : 'consistent with active periodontal concern'}`);
  }

  if (evidence.bleedingSurfaceCount > 0) {
    parts.push('bleeding on charted surfaces');
  }

  if (evidence.recessionSurfaceCount > 0) {
    parts.push('recession is documented');
  }

  if (evidence.missingTeeth.length > 0) {
    parts.push('missing teeth are recorded');
  }

  if (evidence.implantTeeth.length > 0) {
    parts.push('implant findings are present');
  }

  if (parts.length === 0) {
    return 'Chart evidence shows limited periodontal concern in the currently documented sites.';
  }

  return `Chart evidence shows ${parts.join(', ')}.`;
}

function buildFindings(evidence: ChartEvidence): string[] {
  const findings: string[] = [];

  if (evidence.bleedingSurfaceCount > 0) {
    findings.push(`Bleeding documented on ${evidence.bleedingSurfaceCount} surface(s).`);
  }

  if (evidence.pocketCount5Plus > 0) {
    findings.push(`${evidence.pocketCount5Plus} site(s) measure 5 mm or greater.`);
  }

  if (evidence.pocketCount7Plus > 0) {
    findings.push(`${evidence.pocketCount7Plus} site(s) measure 7 mm or greater.`);
  }

  if (evidence.recessionSurfaceCount > 0) {
    findings.push(`Recession recorded on ${evidence.recessionSurfaceCount} surface(s).`);
  }

  if (evidence.implantTeeth.length > 0) {
    findings.push(`Implant findings documented at tooth/teeth ${evidence.implantTeeth.join(', ')}.`);
  }

  if (evidence.missingTeeth.length > 0) {
    findings.push(`Missing teeth documented: ${evidence.missingTeeth.join(', ')}.`);
  }

  if (evidence.healthySurfaceCount > 0 && findings.length === 0) {
    findings.push(`Healthy findings recorded on ${evidence.healthySurfaceCount} surface(s).`);
  }

  if (evidence.mobility.length > 0) {
    findings.push(`Mobility entries present for ${evidence.mobility.length} tooth/teeth.`);
  }

  if (evidence.furcation.length > 0) {
    findings.push(`Furcation findings present for ${evidence.furcation.length} tooth/teeth.`);
  }

  if (evidence.aiVerificationRecords.length > 0) {
    const verifiedCount = evidence.aiVerificationRecords.filter((record) => record.aiVerified).length;
    findings.push(`AI verification metadata available for ${evidence.aiVerificationRecords.length} transcript(s) (${verifiedCount} verified).`);
  }

  if (evidence.aiVerifiedFindings.length > 0) {
    findings.push(`AI-verified findings documented: ${evidence.aiVerifiedFindings.join('; ')}.`);
  }

  if (findings.length === 0) {
    findings.push('No major periodontal abnormalities were captured in the available structured chart data.');
  }

  return findings;
}

function determineRisk(evidence: ChartEvidence): string {
  if (evidence.pocketCount7Plus > 0 || evidence.pocketCount5Plus >= 8 || (evidence.pocketCount5Plus >= 4 && evidence.bleedingSurfaceCount > 0 && evidence.recessionSurfaceCount > 0)) {
    return 'Severe periodontal concern';
  }

  if (evidence.pocketCount5Plus > 0 || evidence.bleedingSurfaceCount > 0 || evidence.recessionSurfaceCount > 0 || evidence.implantTeeth.length > 0 || evidence.missingTeeth.length > 0) {
    return 'Moderate periodontal concern';
  }

  if (evidence.pocketCount4Plus > 0) {
    return 'Mild periodontal concern';
  }

  return 'Mild periodontal concern';
}

function determineTreatment(risk: string, evidence: ChartEvidence): string {
  if (risk === 'Severe periodontal concern') {
    return 'Comprehensive periodontal evaluation, SRP consideration, and close follow-up are appropriate.';
  }

  if (risk === 'Moderate periodontal concern') {
    return evidence.pocketCount5Plus > 0
      ? 'Periodontal evaluation, SRP consideration, and targeted monitoring are appropriate.'
      : 'Periodontal evaluation and maintenance monitoring are appropriate.';
  }

  return 'Routine periodontal maintenance, hygiene reinforcement, and monitoring are appropriate.';
}

function buildFallbackReport(evidence: ChartEvidence): ClinicalReportOutput {
  const risk = determineRisk(evidence);

  return {
    summary: buildSummaryLine(evidence),
    findings: buildFindings(evidence),
    risk,
    treatment: determineTreatment(risk, evidence),
    aiNotes: 'AI-generated clinical support only. Not a medical diagnosis.',
  };
}

function extractChatContent(responseBody: unknown): string {
  if (!responseBody || typeof responseBody !== 'object') {
    return '';
  }

  const record = responseBody as Record<string, unknown>;

  if (typeof record.text === 'string') {
    return record.text;
  }

  if (typeof record.content === 'string') {
    return record.content;
  }

  if (typeof record.output_text === 'string') {
    return record.output_text;
  }

  if (Array.isArray(record.choices)) {
    for (const choice of record.choices) {
      if (!choice || typeof choice !== 'object') {
        continue;
      }

      const nestedChoice = choice as Record<string, unknown>;
      if (typeof nestedChoice.text === 'string') {
        return nestedChoice.text;
      }

      if (nestedChoice.message && typeof nestedChoice.message === 'object') {
        const message = nestedChoice.message as Record<string, unknown>;
        if (typeof message.content === 'string') {
          return message.content;
        }
      }
    }
  }

  return '';
}

function extractJsonObject(content: string): unknown {
  const trimmed = content.trim();

  if (!trimmed) {
    return null;
  }

  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  const candidate = fencedMatch ? fencedMatch[1].trim() : trimmed;

  try {
    return JSON.parse(candidate);
  } catch {
    const startIndex = candidate.indexOf('{');
    const endIndex = candidate.lastIndexOf('}');

    if (startIndex >= 0 && endIndex > startIndex) {
      try {
        return JSON.parse(candidate.slice(startIndex, endIndex + 1));
      } catch {
        return null;
      }
    }

    return null;
  }
}

function normalizeReportResult(parsed: unknown, fallback: ClinicalReportOutput): NormalizedReportResult {
  if (!parsed || typeof parsed !== 'object') {
    return {
      result: fallback,
      usedFallback: true,
    };
  }

  const record = parsed as Record<string, unknown>;
  const summary = typeof record.summary === 'string' && record.summary.trim() ? record.summary.trim() : fallback.summary;
  const risk = typeof record.risk === 'string' && record.risk.trim() ? record.risk.trim() : fallback.risk;
  const treatment = typeof record.treatment === 'string' && record.treatment.trim() ? record.treatment.trim() : fallback.treatment;
  const aiNotes = typeof record.aiNotes === 'string' && record.aiNotes.trim() ? record.aiNotes.trim() : fallback.aiNotes;

  let findings: string[] = fallback.findings;
  if (Array.isArray(record.findings)) {
    const normalized = record.findings.filter((entry): entry is string => typeof entry === 'string').map((entry) => entry.trim()).filter(Boolean);
    if (normalized.length > 0) {
      findings = normalized;
    }
  } else if (typeof record.findings === 'string' && record.findings.trim()) {
    findings = record.findings
      .split(/\n+/)
      .map((entry) => entry.replace(/^[-•\s]+/, '').trim())
      .filter(Boolean);
  }

  return {
    result: {
      summary,
      findings,
      risk,
      treatment,
      aiNotes,
    },
    usedFallback: false,
  };
}

export async function generateClinicalReport(input: ClinicalReportInput): Promise<ClinicalReportOutput> {
  const evidence = collectChartEvidence(input);
  const fallbackReport = buildFallbackReport(evidence);

  console.info('REPORT_TRIGGERED', {
    teeth: Object.values(input.teeth ?? {}).filter((tooth) => !tooth.missing).length,
    missingTeeth: evidence.missingTeeth.length,
    implantTeeth: evidence.implantTeeth.length,
    bleedingSurfaceCount: evidence.bleedingSurfaceCount,
    pocketCount5Plus: evidence.pocketCount5Plus,
    pocketCount7Plus: evidence.pocketCount7Plus,
    aiVerifiedFindings: evidence.aiVerifiedFindings.length,
    aiVerificationRecords: evidence.aiVerificationRecords.length,
    evidenceMode: hasDirectChartEvidence(input) ? 'direct' : 'legacy',
  });

  console.info('REPORT_PROXY', { endpoint: BACKEND_REPORT_ENDPOINT });

  try {
    console.info('REPORT_REQUEST_START', {
      endpoint: BACKEND_REPORT_ENDPOINT,
      modelName: OXLO_MODEL,
      pocketCount5Plus: evidence.pocketCount5Plus,
      pocketCount7Plus: evidence.pocketCount7Plus,
      bleedingSurfaceCount: evidence.bleedingSurfaceCount,
      recessionSurfaceCount: evidence.recessionSurfaceCount,
      missingTeeth: evidence.missingTeeth,
      implantTeeth: evidence.implantTeeth,
      aiVerificationRecords: evidence.aiVerificationRecords.length,
    });

    const response = await fetch(BACKEND_REPORT_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prompt: buildEvidencePrompt(evidence, input) }),
    });

    console.info('REPORT_RESPONSE', { ok: response.ok, status: response.status, modelName: OXLO_MODEL });

    if (!response.ok) {
      throw new Error(`Report proxy failed with status ${response.status}`);
    }

    const responseBodyWrapper = (await response.json()) as any;
    const responseBody = responseBodyWrapper?.response ?? responseBodyWrapper;
    const content = extractChatContent(responseBody);
    const parsed = extractJsonObject(content);
    const normalized = normalizeReportResult(parsed, fallbackReport);

    if (normalized.usedFallback) {
      console.info('REPORT_FALLBACK', {
        reason: 'invalid_deepseek_response',
        summary: fallbackReport.summary,
      });
    } else {
      console.info('REPORT_GENERATED', normalized.result);
    }

    return normalized.result;
  } catch (error) {
    console.info('REPORT_FALLBACK', {
      reason: error instanceof Error ? error.message : 'unknown_report_error',
      summary: fallbackReport.summary,
    });
    return fallbackReport;
  }
}
