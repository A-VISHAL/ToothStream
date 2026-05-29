import React, { useMemo } from 'react';
import type { ToothState, ToothSurface } from '../types';

type ArchSide = 'maxillary' | 'mandibular';

export interface ToothFactoryProps {
  tooth: ToothState;
  toothNumber: number;
  arch: ArchSide;
  positionIndex: number;
  activeTooth: number | null;
  activeSurface: ToothSurface | null;
  activeSiteIndex: number | null;
}

export type ToothMorphologyVariant =
  | 'incisor-central'
  | 'incisor-lateral'
  | 'canine-maxillary'
  | 'canine-mandibular'
  | 'premolar-first'
  | 'premolar-second'
  | 'molar-first'
  | 'molar-second'
  | 'molar-third';

interface AnatomyShape {
  crown: string;
  cej: string;
  roots: string[];
  fissures: string[];
  anchors: [number, number, number];
}

const SITE_X = [28, 50, 72];
const SITE_LABELS = ['M', 'Mid', 'D'];
const SITE_CHIP_SIZE = 20;
const SITE_NUMBER_FONT_SIZE = 14;
const SITE_LABEL_FONT_SIZE = 9;
const TOOTH_NUMBER_FONT_SIZE = 12;
const TOOTH_SCALE = 1.58;

const TOP_PANEL_Y = 12;
const BOTTOM_PANEL_Y = 205;
const CROWN_TARGET_Y = 72;
const ROOT_TARGET_Y = 142;

const ANATOMY: Record<ToothMorphologyVariant, AnatomyShape> = {
  'incisor-central': {
    crown: 'M34 60C35 50 40 42 47 39C49 38 51 38 53 39C60 42 65 50 66 60C67 68 66 75 63 81C60 85 56 87 50 87C44 87 40 85 37 81C34 75 33 68 34 60Z',
    cej: 'M40 82C44 85 56 85 60 82',
    roots: ['M45 85C44 97 44 111 46 125C47 137 48 146 50 152C52 146 53 137 54 125C56 111 56 97 55 85Z'],
    fissures: ['M50 44V76', 'M43 55C47 58 53 58 57 55'],
    anchors: [40, 50, 60],
  },
  'incisor-lateral': {
    crown: 'M37 61C38 51 43 43 49 41C50 40 51 40 52 41C58 43 62 51 63 61C64 68 63 75 61 80C58 84 55 86 50 86C45 86 42 84 39 80C37 75 36 68 37 61Z',
    cej: 'M41 81C44 84 56 84 59 81',
    roots: ['M46 84C45 96 45 110 47 124C48 136 49 145 50 151C51 145 52 136 53 124C55 110 55 96 54 84Z'],
    fissures: ['M50 45V74', 'M45 56C47 58 53 58 55 56'],
    anchors: [41, 50, 59],
  },
  'canine-maxillary': {
    crown: 'M35 61C36 51 40 43 45 38L50 33L55 38C60 43 64 51 65 61C66 69 64 76 61 82C58 86 54 88 50 88C46 88 42 86 39 82C36 76 34 69 35 61Z',
    cej: 'M40 83C44 87 56 87 60 83',
    roots: ['M46 86C45 99 45 114 47 128C48 140 49 149 50 155C51 149 52 140 53 128C55 114 55 99 54 86Z'],
    fissures: ['M46 41L50 34L54 41', 'M50 47V78', 'M44 53C47 56 53 56 56 53'],
    anchors: [40, 50, 60],
  },
  'canine-mandibular': {
    crown: 'M36 62C37 53 41 45 46 40L50 36L54 40C59 45 63 53 64 62C65 69 64 75 61 80C58 84 54 86 50 86C46 86 42 84 39 80C36 75 35 69 36 62Z',
    cej: 'M41 81C44 84 56 84 59 81',
    roots: ['M46 84C45 98 45 114 47 129C48 141 49 149 50 155C51 149 52 141 53 129C55 114 55 98 54 84Z'],
    fissures: ['M50 47V77'],
    anchors: [41, 50, 59],
  },
  'premolar-first': {
    crown: 'M31 63C32 52 37 44 44 40L50 44L56 40C63 44 68 52 69 63C70 71 68 79 64 84C60 89 55 91 50 91C45 91 40 89 36 84C32 79 30 71 31 63Z',
    cej: 'M38 85C42 89 58 89 62 85',
    roots: [
      'M42 88C40 100 40 114 41 127C42 138 43 146 45 152C47 146 47 138 48 127C49 114 48 100 47 88Z',
      'M52 88C51 100 50 114 51 127C52 138 52 146 54 152C56 146 57 138 58 127C59 114 58 100 57 88Z',
    ],
    fissures: ['M41 49L45 54L50 49L55 54L59 49', 'M50 52V80', 'M43 57C46 60 54 60 57 57'],
    anchors: [38, 50, 62],
  },
  'premolar-second': {
    crown: 'M33 64C34 54 39 46 45 42L50 45L55 42C61 46 66 54 67 64C68 72 67 79 64 84C60 88 55 90 50 90C45 90 40 88 36 84C33 79 32 72 33 64Z',
    cej: 'M39 85C43 88 57 88 61 85',
    roots: ['M45 88C44 101 44 116 46 130C47 141 48 149 50 155C52 149 53 141 54 130C56 116 56 101 55 88Z'],
    fissures: ['M43 51C46 54 54 54 57 51', 'M50 53V80'],
    anchors: [39, 50, 61],
  },
  'molar-first': {
    crown: 'M25 67C26 54 32 44 42 40C45 38 48 38 50 39C52 38 55 38 58 40C68 44 74 54 75 67C76 76 73 84 68 90C63 95 57 98 50 98C43 98 37 95 32 90C27 84 24 76 25 67Z',
    cej: 'M34 91C39 95 61 95 66 91',
    roots: [
      'M34 93C31 104 31 117 33 129C35 139 36 146 38 151C40 146 40 139 41 129C42 117 41 104 39 93Z',
      'M46 94C45 106 45 119 46 131C47 142 48 149 50 154C52 149 53 142 54 131C55 119 55 106 54 94Z',
      'M58 93C56 104 55 117 56 129C57 139 58 146 60 151C62 146 64 139 66 129C68 117 67 104 65 93Z',
    ],
    fissures: [
      'M31 51C35 46 40 44 44 46C47 47 49 51 50 54C51 51 53 47 56 46C60 44 65 46 69 51',
      'M32 61C37 66 43 69 50 69C57 69 63 66 68 61',
      'M36 74C41 78 45 79 50 79C55 79 59 78 64 74',
    ],
    anchors: [35, 50, 65],
  },
  'molar-second': {
    crown: 'M27 68C28 56 34 46 43 42C45 41 48 40 50 41C52 40 55 41 57 42C66 46 72 56 73 68C74 77 72 84 67 90C62 95 56 97 50 97C44 97 38 95 33 90C28 84 26 77 27 68Z',
    cej: 'M35 90C40 94 60 94 65 90',
    roots: [
      'M37 92C35 104 34 117 35 129C36 139 37 146 39 151C41 146 42 139 43 129C44 117 43 104 42 92Z',
      'M50 92C49 104 49 118 50 131C51 141 52 149 53 154C55 149 56 141 57 131C58 118 58 104 57 92Z',
      'M63 92C61 104 60 117 61 129C62 139 63 146 65 151C67 146 68 139 69 129C70 117 69 104 67 92Z',
    ],
    fissures: ['M34 52C39 47 45 46 50 50C55 46 61 47 66 52', 'M35 62C40 66 45 68 50 68C55 68 60 66 65 62', 'M38 75C42 78 46 80 50 80C54 80 58 78 62 75'],
    anchors: [36, 50, 64],
  },
  'molar-third': {
    crown: 'M30 69C31 60 36 51 43 47C45 46 48 45 50 46C52 45 55 46 57 47C64 51 69 60 70 69C71 77 69 84 65 89C61 93 56 95 50 95C44 95 39 93 35 89C31 84 29 77 30 69Z',
    cej: 'M37 88C41 91 59 91 63 88',
    roots: [
      'M43 90C41 101 40 114 41 126C42 137 43 144 45 150C47 144 48 137 49 126C50 114 50 101 49 90Z',
      'M53 90C52 101 52 114 53 126C54 137 55 144 57 150C59 144 60 137 61 126C62 114 62 101 61 90Z',
    ],
    fissures: ['M37 54C41 51 46 51 50 54C54 51 59 51 63 54', 'M39 64C43 67 47 69 50 69C53 69 57 67 61 64'],
    anchors: [38, 50, 62],
  },
};

function depthToOffset(depth: number): number {
  return Math.max(0, Math.min(18, depth * 2.35));
}

function resolveMorphology(toothNumber: number): { variant: ToothMorphologyVariant; mirror: boolean } {
  const upper = toothNumber >= 1 && toothNumber <= 16;
  const isPatientLeft = upper ? toothNumber >= 9 : toothNumber <= 24;

  if ([8, 9, 24, 25].includes(toothNumber)) {
    return { variant: 'incisor-central', mirror: isPatientLeft };
  }

  if ([7, 10, 23, 26].includes(toothNumber)) {
    return { variant: 'incisor-lateral', mirror: isPatientLeft };
  }

  if ([6, 11].includes(toothNumber)) {
    return { variant: 'canine-maxillary', mirror: isPatientLeft };
  }

  if ([22, 27].includes(toothNumber)) {
    return { variant: 'canine-mandibular', mirror: isPatientLeft };
  }

  if ([4, 12, 21, 28].includes(toothNumber)) {
    return { variant: 'premolar-first', mirror: isPatientLeft };
  }

  if ([5, 13, 20, 29].includes(toothNumber)) {
    return { variant: 'premolar-second', mirror: isPatientLeft };
  }

  if ([3, 14, 19, 30].includes(toothNumber)) {
    return { variant: 'molar-first', mirror: isPatientLeft };
  }

  if ([2, 15, 18, 31].includes(toothNumber)) {
    return { variant: 'molar-second', mirror: isPatientLeft };
  }

  return { variant: 'molar-third', mirror: isPatientLeft };
}

function ToothAnatomyLayer({
  shape,
  shadowId,
  isActive,
  missing,
  implant,
  mirror,
}: {
  shape: AnatomyShape;
  shadowId: string;
  isActive: boolean;
  missing: boolean;
  implant: boolean;
  mirror: boolean;
}) {
  return (
    <g transform={mirror ? 'translate(100 0) scale(-1 1)' : undefined}>
      <defs>
        <clipPath id={`${shadowId}-crown-clip`}>
          <path d={shape.crown} />
        </clipPath>
      </defs>

      <path
        d={shape.crown}
        fill={missing ? '#e5e7eb' : `url(#${shadowId}-crown-fill)`}
        stroke={missing ? '#94a3b8' : '#7a8794'}
        strokeWidth={1.28}
        strokeLinejoin="round"
        strokeDasharray={missing ? '4 3' : undefined}
      />
      {!missing ? (
        <>
          <rect x="20" y="44" width="60" height="48" fill={`url(#${shadowId}-enamel-sheen)`} clipPath={`url(#${shadowId}-crown-clip)`} opacity="0.88" />
          <rect x="20" y="82" width="60" height="18" fill="#f6f9fd" clipPath={`url(#${shadowId}-crown-clip)`} opacity="0.72" />
        </>
      ) : null}

      {shape.fissures.map((fissure, index) => (
        <path key={`${shadowId}-fissure-${index}`} d={fissure} fill="none" stroke="#c8d3df" strokeWidth="0.9" strokeLinecap="round" />
      ))}

      <path d={shape.cej} fill="none" stroke={missing ? '#94a3b8' : '#6b7280'} strokeWidth="1.1" strokeLinecap="round" />

      {shape.roots.map((rootPath, index) => (
        <path
          key={`${shadowId}-root-${index}`}
          d={rootPath}
          fill={missing ? '#d9dde3' : `url(#${shadowId}-root-fill)`}
          stroke={missing ? '#94a3b8' : '#b99770'}
          strokeWidth="0.98"
          strokeLinejoin="round"
        />
      ))}

      {!missing ? <path d="M50 90V152" fill="none" stroke="#cfae84" strokeWidth="0.66" strokeLinecap="round" opacity="0.58" /> : null}

      {implant ? (
        <g transform="translate(50 116)">
          <rect x="-7" y="-12" width="14" height="8" rx="3" fill="#94a3b8" />
          <rect x="-4" y="-4" width="8" height="36" rx="3" fill="#94a3b8" />
          <path d="M-10 14H10" stroke="#64748b" strokeWidth="2.2" strokeLinecap="round" />
          <path d="M-8 23H8" stroke="#64748b" strokeWidth="1.9" strokeLinecap="round" />
        </g>
      ) : null}

      {isActive ? <ellipse cx="50" cy="112" rx="30" ry="62" fill="none" stroke="#0ea5e9" strokeOpacity="0.2" strokeWidth="0.95" /> : null}
    </g>
  );
}

function MeasurementOverlayLayer({
  isActiveTooth,
  surface,
  anchors,
  activeSurface,
  activeSiteIndex,
  depth,
  bleeding,
}: {
  isActiveTooth: boolean;
  surface: ToothSurface;
  anchors: [number, number, number];
  activeSurface: ToothSurface | null;
  activeSiteIndex: number | null;
  depth: [number, number, number];
  bleeding: boolean;
}) {
  const isActiveSurface = isActiveTooth && surface === activeSurface;
  const topSurface = surface === 'lingual';
  const panelY = topSurface ? TOP_PANEL_Y : BOTTOM_PANEL_Y;
  const labelY = panelY + 1;
  const bandStroke = topSurface ? '#6ec6b4' : '#78b5e1';
  const activeStroke = topSurface ? '#0f9f8a' : '#0b8ddb';
  const chipBase = topSurface ? panelY - 2 : panelY + 2;
  const targetY = topSurface ? CROWN_TARGET_Y : ROOT_TARGET_Y;

  return (
    <g>
      <rect
        x="12"
        y={panelY - 14}
        width="76"
        height="30"
        rx="8"
        fill={topSurface ? '#f7fdfb' : '#f8fbff'}
        stroke={isActiveSurface ? activeStroke : bandStroke}
        strokeWidth={isActiveSurface ? 1.05 : 0.62}
        opacity={0.82}
      />

      <text
        x="18"
        y={labelY}
        textAnchor="start"
        dominantBaseline="middle"
        fontSize="10"
        fontWeight="800"
        fill="#334155"
      >
        {topSurface ? 'L' : 'B'}
      </text>

      {SITE_X.map((x, index) => {
        const isActiveSite = isActiveSurface && activeSiteIndex === index;
        const value = depth[index];
        const travel = depthToOffset(value) * 0.22;
        const markerY = topSurface ? chipBase - travel : chipBase + travel;
        const connectorStart = topSurface ? markerY + SITE_CHIP_SIZE / 2 : markerY - SITE_CHIP_SIZE / 2;
        const renderedDepth = value > 0 ? String(value) : '–';

        return (
          <g key={`${surface}-${index}`}>
            <path
              d={`M${x} ${connectorStart}C${x} ${(connectorStart + targetY) / 2} ${anchors[index]} ${(connectorStart + targetY) / 2} ${anchors[index]} ${targetY}`}
              fill="none"
              stroke={isActiveSite ? activeStroke : '#9cb0c4'}
              strokeWidth={isActiveSite ? 1.1 : 0.7}
              strokeLinecap="round"
              className={isActiveSite ? 'pulse-glow' : undefined}
            />

            <g transform={`translate(${x}, ${markerY})`}>
              <rect
                x={`-${SITE_CHIP_SIZE / 2}`}
                y={`-${SITE_CHIP_SIZE / 2}`}
                width={SITE_CHIP_SIZE}
                height={SITE_CHIP_SIZE}
                rx="6"
                fill={isActiveSite ? (topSurface ? '#ecfdf5' : '#eff6ff') : '#fcfdff'}
                stroke={isActiveSite ? activeStroke : '#d8e0ea'}
                strokeWidth={isActiveSite ? 1.08 : 0.72}
                className={isActiveSite ? 'site-chip site-chip-active' : 'site-chip'}
              />
              <text
                y="1"
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={value > 0 ? SITE_NUMBER_FONT_SIZE + 1 : SITE_NUMBER_FONT_SIZE - 1}
                fontWeight="900"
                fill={value > 0 ? '#0f172a' : '#64748b'}
                stroke="#ffffff"
                strokeWidth="0.45"
                paintOrder="stroke fill"
              >
                {renderedDepth}
              </text>
              <text
                y={SITE_CHIP_SIZE / 2 + 6}
                textAnchor="middle"
                dominantBaseline="hanging"
                fontSize={SITE_LABEL_FONT_SIZE}
                fontWeight="700"
                fill="#334155"
                stroke="#ffffff"
                strokeWidth="0.2"
                paintOrder="stroke fill"
              >
                {SITE_LABELS[index]}
              </text>
              {bleeding ? (
                <circle
                  cx="7"
                  cy="-7"
                  r="2.2"
                  fill="#ef4444"
                  stroke="#ffffff"
                  strokeWidth="0.6"
                  className={isActiveSite ? 'pulse-bleed' : undefined}
                />
              ) : null}
            </g>
          </g>
        );
      })}

      <path d={topSurface ? 'M34 76C40 74 60 74 66 76' : 'M34 144C40 146 60 146 66 144'} fill="none" stroke={bandStroke} strokeWidth="0.6" opacity="0.4" />
    </g>
  );
}

function ToothInteractionLayer({ isActive }: { isActive: boolean }) {
  if (!isActive) {
    return null;
  }

  return (
    <g pointerEvents="none">
      <ellipse cx="50" cy="112" rx="40" ry="76" fill="none" stroke="#38bdf8" strokeWidth="1" strokeOpacity="0.3" />
      <ellipse cx="50" cy="112" rx="48" ry="88" fill="none" stroke="#7dd3fc" strokeWidth="0.8" strokeOpacity="0.2" strokeDasharray="5 6" />
    </g>
  );
}

export function ToothFactory({ tooth, toothNumber, arch, positionIndex, activeTooth, activeSurface, activeSiteIndex }: ToothFactoryProps) {
  const morphology = resolveMorphology(toothNumber);
  const anatomy = ANATOMY[morphology.variant];
  const isActive = toothNumber === activeTooth;
  const updatedRecently = tooth.updatedAt > 0 && Date.now() - tooth.updatedAt < 2200;
  const shadowId = useMemo(() => `tooth-shadow-${arch}-${toothNumber}-${positionIndex}`, [arch, toothNumber, positionIndex]);
  const toothNumberY = arch === 'maxillary' ? 3 : 235;

  return (
    <g
      className={[
        'transition-all duration-300 ease-out smooth-tooth',
        isActive || updatedRecently ? 'chart-pop' : '',
        isActive ? 'active-tooth' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      style={isActive ? { filter: 'drop-shadow(0 0 22px rgba(14, 165, 233, 0.22)) drop-shadow(0 10px 16px rgba(2, 132, 199, 0.1))' } : undefined}
    >
      <defs>
        <linearGradient id={`${shadowId}-crown-fill`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#fffefc" />
          <stop offset="58%" stopColor="#f4f8fc" />
          <stop offset="100%" stopColor="#edf3fa" />
        </linearGradient>
        <linearGradient id={`${shadowId}-enamel-sheen`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.75" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
        <linearGradient id={`${shadowId}-root-fill`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#eedfc7" />
          <stop offset="100%" stopColor="#e2c59f" />
        </linearGradient>
        <filter id={shadowId} x="-32%" y="-20%" width="164%" height="164%">
          <feDropShadow dx="0" dy="4" stdDeviation="5.5" floodColor="#94a3b8" floodOpacity={isActive ? 0.18 : 0.1} />
        </filter>
      </defs>

      <text
        x="50"
        y={toothNumberY}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={TOOTH_NUMBER_FONT_SIZE}
        fontWeight="800"
        fill="#1f2937"
      >
        {toothNumber}
      </text>

      <ellipse cx="50" cy="160" rx="23" ry="3.8" fill="#cbd5e1" opacity="0.06" />

      <g transform={`translate(50 108) scale(${TOOTH_SCALE}) translate(-50 -108)`} filter={`url(#${shadowId})`}>
        <ToothAnatomyLayer
          shape={anatomy}
          shadowId={shadowId}
          isActive={isActive}
          missing={tooth.missing}
          implant={tooth.implant}
          mirror={morphology.mirror}
        />
      </g>

      <MeasurementOverlayLayer
        isActiveTooth={isActive}
        surface="lingual"
        anchors={anatomy.anchors}
        activeSurface={activeSurface}
        activeSiteIndex={activeSiteIndex}
        depth={tooth.lingual.depth}
        bleeding={tooth.lingual.bleeding}
      />

      <MeasurementOverlayLayer
        isActiveTooth={isActive}
        surface="buccal"
        anchors={anatomy.anchors}
        activeSurface={activeSurface}
        activeSiteIndex={activeSiteIndex}
        depth={tooth.buccal.depth}
        bleeding={tooth.buccal.bleeding}
      />

      <ToothInteractionLayer isActive={isActive} />

      {tooth.missing ? (
        <g>
          <rect x="31" y="104" width="38" height="18" rx="8" fill="rgba(100,116,139,0.84)" />
          <text x="50" y="116" textAnchor="middle" dominantBaseline="middle" fontSize="8" fontWeight="700" fill="#ffffff">
            Missing
          </text>
        </g>
      ) : null}
    </g>
  );
}
