import type { PerioPayload } from '../types';

const MOCK_STREAM: Array<Required<Pick<PerioPayload, 'tooth'>> & PerioPayload> = [
  {
    tooth: 8,
    surface: 'buccal',
    depth: [3, 2, 4],
    bleeding: true,
    siteIndex: 1,
    transcript: 'Tooth 8 buccal charted at 3, 2, 4 with bleeding at the mid site.',
  },
  {
    tooth: 9,
    surface: 'lingual',
    depth: [2, 3, 3],
    bleeding: false,
    siteIndex: 0,
    transcript: 'Tooth 9 lingual measurement recorded as 2, 3, 3.',
  },
  {
    tooth: 10,
    surface: 'buccal',
    depth: [4, 3, 4],
    bleeding: false,
    siteIndex: 2,
    transcript: 'Tooth 10 buccal probes are 4, 3, 4.',
  },
  {
    tooth: 14,
    surface: 'buccal',
    missing: true,
    transcript: 'Tooth 14 marked as missing.',
  },
  {
    tooth: 19,
    surface: 'buccal',
    implant: true,
    siteIndex: 1,
    transcript: 'Implant registered at tooth 19.',
  },
  {
    tooth: 24,
    surface: 'lingual',
    depth: [3, 4, 5],
    bleeding: true,
    siteIndex: 2,
    transcript: 'Tooth 24 lingual charted at 3, 4, 5 with distal bleeding.',
  },
  {
    tooth: 30,
    surface: 'buccal',
    depth: [2, 2, 2],
    bleeding: false,
    siteIndex: 1,
    transcript: 'Tooth 30 buccal charted evenly at 2, 2, 2.',
  },
  {
    tooth: 3,
    surface: 'lingual',
    depth: [3, 4, 4],
    bleeding: false,
    siteIndex: 0,
    transcript: 'Tooth 3 lingual measurement recorded at 3, 4, 4.',
  },
];

export function getMockPayload(index: number): PerioPayload {
  const item = MOCK_STREAM[index % MOCK_STREAM.length];

  return {
    ...item,
    timestamp: Date.now() - 42,
  };
}

export function getMockTranscriptIntro(): string {
  return 'Mock chart stream active. Connect the FastAPI backend to drive live updates.';
}