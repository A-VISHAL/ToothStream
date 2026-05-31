import { buildChartStats, buildMeasurementRows, isChartComplete, isReportReady } from './reportWorkflowUtils';
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
      healthy: true,
      recession: false,
      siteIndex: 1,
      updatedAt: 1,
    },
    updatedAt: 1,
    ...overrides,
  };
}

describe('reportWorkflowUtils', () => {
  it('treats a fully charted mouth as complete', () => {
    const teeth = Object.fromEntries(
      Array.from({ length: 32 }, (_, index) => index + 1).map((toothNumber) => [
        toothNumber,
        createToothState({ toothNumber }),
      ])
    ) as Record<number, ToothState>;

    expect(isChartComplete(teeth)).toBe(true);
  });

  it('enables reporting when there is meaningful chart data on multiple teeth', () => {
    const teeth: Record<number, ToothState> = {
      14: createToothState({
        toothNumber: 14,
        updatedAt: 1,
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
          healthy: true,
          recession: false,
          siteIndex: 1,
          updatedAt: 1,
        },
      }),
      15: createToothState({ toothNumber: 15, updatedAt: 1 }),
    };

    const stats = buildChartStats(teeth);

    expect(isReportReady(teeth, stats)).toBe(true);
  });

  it('counts chart statistics and formats locked measurement rows', () => {
    const teeth: Record<number, ToothState> = {
      14: createToothState(),
      15: createToothState({
        toothNumber: 15,
        missing: true,
        updatedAt: 1,
        buccal: {
          depth: [0, 0, 0],
          bleeding: false,
          healthy: false,
          recession: false,
          siteIndex: 1,
          updatedAt: 1,
        },
        lingual: {
          depth: [0, 0, 0],
          bleeding: false,
          healthy: false,
          recession: false,
          siteIndex: 1,
          updatedAt: 1,
        },
      }),
    };

    const stats = buildChartStats(teeth);
    const rows = buildMeasurementRows(teeth);

    expect(stats).toEqual(
      expect.objectContaining({
        chartedTeeth: 2,
        missingTeeth: 1,
        bleedingSurfaces: 1,
        pocketCount5Plus: 3,
        pocketCount7Plus: 1,
        highestDepth: 7,
      })
    );
    expect(rows[0]).toEqual(
      expect.objectContaining({
        toothNumber: 14,
        buccal: '3 / 5 / 7',
        lingual: '2 / 4 / 5',
        bleeding: true,
        healthy: true,
        charted: true,
      })
    );
  });
});
