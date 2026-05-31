import type { ToothState } from '../types';

export interface ChartStats {
  chartedTeeth: number;
  missingTeeth: number;
  implantTeeth: number;
  bleedingSurfaces: number;
  healthySurfaces: number;
  recessionSurfaces: number;
  pocketCount4Plus: number;
  pocketCount5Plus: number;
  pocketCount7Plus: number;
  highestDepth: number;
}

export interface MeasurementRow {
  toothNumber: number;
  missing: boolean;
  implant: boolean;
  buccal: string;
  lingual: string;
  bleeding: boolean;
  healthy: boolean;
  recession: string;
  charted: boolean;
}

function formatDepthTriplet(depths: [number, number, number]): string {
  const formatted = depths.filter((value) => typeof value === 'number' && value > 0);

  if (formatted.length === 0) {
    return '—';
  }

  return formatted.join(' / ');
}

function formatRecession(recession: ToothState['buccal']['recession']): string {
  if (typeof recession === 'number' && Number.isFinite(recession)) {
    return `${recession} mm`;
  }

  if (recession === true) {
    return 'Yes';
  }

  return '—';
}

export function isChartComplete(teeth: Record<number, ToothState>): boolean {
  const entries = Object.values(teeth);

  if (entries.length === 0) {
    return false;
  }

  return entries.every((tooth) => tooth.updatedAt > 0 || tooth.missing || tooth.implant);
}

export function hasMeaningfulChartData(stats: ChartStats): boolean {
  return (
    stats.chartedTeeth > 0 &&
    (
      stats.bleedingSurfaces > 0 ||
      stats.healthySurfaces > 0 ||
      stats.recessionSurfaces > 0 ||
      stats.pocketCount4Plus > 0 ||
      stats.missingTeeth > 0 ||
      stats.implantTeeth > 0
    )
  );
}

export function isReportReady(
  teeth: Record<number, ToothState>,
  stats: ChartStats,
  clinicianReviewComplete = false
): boolean {
  return clinicianReviewComplete || isChartComplete(teeth) || stats.chartedTeeth >= 2 || hasMeaningfulChartData(stats);
}

export function buildChartStats(teeth: Record<number, ToothState>): ChartStats {
  const stats: ChartStats = {
    chartedTeeth: 0,
    missingTeeth: 0,
    implantTeeth: 0,
    bleedingSurfaces: 0,
    healthySurfaces: 0,
    recessionSurfaces: 0,
    pocketCount4Plus: 0,
    pocketCount5Plus: 0,
    pocketCount7Plus: 0,
    highestDepth: 0,
  };

  for (const tooth of Object.values(teeth)) {
    if (tooth.updatedAt > 0 || tooth.missing || tooth.implant) {
      stats.chartedTeeth += 1;
    }

    if (tooth.missing) {
      stats.missingTeeth += 1;
    }

    if (tooth.implant) {
      stats.implantTeeth += 1;
    }

    [tooth.buccal, tooth.lingual].forEach((surface) => {
      if (surface.bleeding) {
        stats.bleedingSurfaces += 1;
      }

      if (surface.healthy) {
        stats.healthySurfaces += 1;
      }

      if (surface.recession !== undefined && surface.recession !== false) {
        stats.recessionSurfaces += 1;
      }

      surface.depth.forEach((depth) => {
        if (depth >= 4) {
          stats.pocketCount4Plus += 1;
        }

        if (depth >= 5) {
          stats.pocketCount5Plus += 1;
        }

        if (depth >= 7) {
          stats.pocketCount7Plus += 1;
        }

        if (depth > stats.highestDepth) {
          stats.highestDepth = depth;
        }
      });
    });
  }

  return stats;
}

export function buildMeasurementRows(teeth: Record<number, ToothState>): MeasurementRow[] {
  return Object.values(teeth)
    .sort((left, right) => left.toothNumber - right.toothNumber)
    .map((tooth) => ({
      toothNumber: tooth.toothNumber,
      missing: tooth.missing,
      implant: tooth.implant,
      buccal: formatDepthTriplet(tooth.buccal.depth),
      lingual: formatDepthTriplet(tooth.lingual.depth),
      bleeding: tooth.buccal.bleeding || tooth.lingual.bleeding,
      healthy: tooth.buccal.healthy || tooth.lingual.healthy,
      recession: [tooth.buccal.recession, tooth.lingual.recession].map(formatRecession).filter((entry) => entry !== '—').join(' / ') || '—',
      charted: tooth.updatedAt > 0 || tooth.missing || tooth.implant,
    }));
}
