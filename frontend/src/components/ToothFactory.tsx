import React, { useEffect, useMemo } from 'react';
import { RealCanineSVG } from './RealCanineSVG';
import { RealIncisorSVG, type ToothAnatomyProps, type ToothMorphologyVariant } from './RealIncisorSVG';
import { RealMolarSVG } from './RealMolarSVG';
import { RealPremolarSVG } from './RealPremolarSVG';
import type { ToothState, ToothSurface } from '../types';

type ArchSide = 'maxillary' | 'mandibular';
type ToothFamily = 'incisor' | 'canine' | 'premolar' | 'molar';

export interface ToothFactoryProps {
  tooth: ToothState;
  toothNumber: number;
  arch: ArchSide;
  positionIndex: number;
  activeTooth: number | null;
  activeSurface: ToothSurface | null;
  activeSiteIndex: number | null;
}

const SITE_X = [24, 50, 76];
const SITE_LABELS = ['M', 'Mid', 'D'];
const TOOTH_SCALE = 1.3;
const SITE_CHIP_SIZE = 26;
const SITE_NUMBER_FONT_SIZE = 21;
const SITE_LABEL_FONT_SIZE = 11;
const SURFACE_TAG_FONT_SIZE = 22;

function classifyTooth(toothNumber: number): ToothFamily {
  if ([7, 8, 9, 10, 23, 24, 25, 26].includes(toothNumber)) {
    return 'incisor';
  }

  if ([6, 11, 22, 27].includes(toothNumber)) {
    return 'canine';
  }

  if ([4, 5, 12, 13, 20, 21, 28, 29].includes(toothNumber)) {
    return 'premolar';
  }

  return 'molar';
}

function getMorphologyVariant(family: ToothFamily, toothNumber: number): ToothMorphologyVariant {
  switch (family) {
    case 'incisor':
      return [7, 10, 23, 26].includes(toothNumber) ? 'incisor-lateral' : 'incisor-central';
    case 'canine':
      return [22, 23, 24, 25, 26, 27].includes(toothNumber) ? 'canine-mandibular' : 'canine-maxillary';
    case 'premolar':
      return [4, 5, 12, 13, 20, 21, 28, 29].includes(toothNumber) ? 'premolar-first' : 'premolar-second';
    default:
      if ([1, 16, 17, 32].includes(toothNumber)) {
        return 'molar-third';
      }

      if ([2, 15, 18, 31].includes(toothNumber)) {
        return 'molar-second';
      }

      return 'molar-first';
  }
}

function shouldMirrorTooth(toothNumber: number, arch: ArchSide): boolean {
  return arch === 'maxillary' ? toothNumber > 8 : toothNumber < 25;
}

function depthToLength(depth: number): number {
  return Math.max(5, Math.min(28, 7 + depth * 2.8));
}

function familyNode({ family, ...props }: ToothAnatomyProps & { family: ToothFamily }) {
  switch (family) {
    case 'incisor':
      return <RealIncisorSVG {...props} />;
    case 'canine':
      return <RealCanineSVG {...props} />;
    case 'premolar':
      return <RealPremolarSVG {...props} />;
    default:
      return <RealMolarSVG {...props} />;
  }
}

function SiteOverlay({
  toothNumber,
  isActiveTooth,
  surface,
  activeSurface,
  activeSiteIndex,
  depth,
  bleeding,
}: {
  toothNumber: number;
  isActiveTooth: boolean;
  surface: ToothSurface;
  activeSurface: ToothSurface | null;
  activeSiteIndex: number | null;
  depth: [number, number, number];
  bleeding: boolean;
}) {
  const isActiveSurface = isActiveTooth && surface === activeSurface;
  const depthVisible = depth.some((value) => value > 0);
  const topSurface = surface === 'lingual';
  const baseY = topSurface ? 22 : 138;
  const labelY = topSurface ? 8 : 168;
  const connectorY = topSurface ? 40 : 120;
  const direction = topSurface ? 1 : -1;

  useEffect(() => {
    console.debug('[Perio UI] depth visible', {
      tooth: toothNumber,
      surface,
      activeSurface,
      activeSiteIndex,
      depth,
      depthVisible,
    });
  }, [activeSiteIndex, activeSurface, depth, depthVisible, surface, toothNumber]);

  return (
    <g>
      <path
        d={topSurface ? 'M18 18C34 12 66 12 82 18' : 'M18 142C34 148 66 148 82 142'}
        fill="none"
        stroke={topSurface ? '#63c4b4' : '#68aee4'}
        strokeWidth={isActiveSurface ? 1.2 : 0.85}
        strokeLinecap="round"
        strokeDasharray={isActiveSurface ? '0' : '4 4'}
        opacity="0.68"
      />

      {SITE_X.map((x, index) => {
        const isActiveSite = isActiveSurface && activeSiteIndex === index;
        const value = depth[index];
        const markerY = connectorY + direction * depthToLength(value);
        const connectorEnd = topSurface ? markerY - 8 : markerY + 8;
        const renderedDepth = value > 0 ? String(value) : '–';

        return (
          <g key={`${surface}-${index}`}>
            <path
              d={`M${x} ${baseY}V${connectorEnd}`}
              fill="none"
              stroke={isActiveSite ? (topSurface ? '#0f9f8a' : '#0b8ddb') : '#9cb0c4'}
              strokeWidth={isActiveSite ? 1.55 : 0.9}
              strokeLinecap="round"
              className={isActiveSite ? 'pulse-glow' : undefined}
            />

            <g transform={`translate(${x}, ${markerY})`}>
              <rect
                x={`-${SITE_CHIP_SIZE / 2}`}
                y={`-${SITE_CHIP_SIZE / 2}`}
                width={SITE_CHIP_SIZE}
                height={SITE_CHIP_SIZE}
                rx="7"
                fill={isActiveSite ? (topSurface ? '#dffaf3' : '#e8f3ff') : '#ffffff'}
                stroke={isActiveSite ? (topSurface ? '#0f9f8a' : '#0b8ddb') : '#cdd6e0'}
                strokeWidth={isActiveSite ? 1.45 : 0.95}
                className={isActiveSite ? 'site-chip site-chip-active' : 'site-chip'}
              />
              <text
                y="1"
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={value > 0 ? SITE_NUMBER_FONT_SIZE + 2 : SITE_NUMBER_FONT_SIZE - 1}
                fontWeight="900"
                fill={value > 0 ? '#0f172a' : '#64748b'}
                stroke="#ffffff"
                strokeWidth="0.7"
                paintOrder="stroke fill"
              >
                {renderedDepth}
              </text>
              <text
                y={SITE_CHIP_SIZE / 2 + 9}
                textAnchor="middle"
                dominantBaseline="hanging"
                fontSize={SITE_LABEL_FONT_SIZE}
                fontWeight="700"
                fill="#334155"
                stroke="#ffffff"
                strokeWidth="0.35"
                paintOrder="stroke fill"
              >
                {SITE_LABELS[index]}
              </text>
              {bleeding ? (
                <circle
                  cx="9"
                  cy="-9"
                  r="2.35"
                  fill="#ef4444"
                  stroke="#ffffff"
                  strokeWidth="0.9"
                  className={isActiveSite ? 'pulse-bleed' : undefined}
                />
              ) : null}
            </g>
          </g>
        );
      })}

      <path
        d={topSurface ? 'M31 47C42 42 58 42 69 47' : 'M31 113C42 118 58 118 69 113'}
        fill="none"
        stroke={topSurface ? '#16a394' : '#0b8ddb'}
        strokeWidth={isActiveSurface ? 1.1 : 0.8}
        strokeLinecap="round"
        opacity={isActiveSurface ? 0.6 : 0.42}
      />

      <text
        x="50"
        y={labelY}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={SURFACE_TAG_FONT_SIZE}
        fontWeight="800"
        fill="#111827"
        stroke="#ffffff"
        strokeWidth="0.5"
        paintOrder="stroke fill"
      >
        {topSurface ? 'L' : 'B'}
      </text>
    </g>
  );
}

function BackgroundGuides({ arch }: { arch: ArchSide }) {
  return (
    <g pointerEvents="none" opacity="0.44">
      <path
        d={arch === 'maxillary' ? 'M18 22C34 16 66 16 82 22' : 'M18 138C34 144 66 144 82 138'}
        fill="none"
        stroke={arch === 'maxillary' ? '#78cfc1' : '#78b8e8'}
        strokeWidth="0.9"
        strokeLinecap="round"
        strokeDasharray="5 5"
      />
      {SITE_X.map((x) => (
        <g key={`${arch}-guide-${x}`}>
          <path
            d={arch === 'maxillary' ? `M${x} 24V40` : `M${x} 130V146`}
            fill="none"
            stroke={arch === 'maxillary' ? '#65bdb0' : '#67a8db'}
            strokeWidth="0.6"
            strokeDasharray="2.5 4"
          />
          <path
            d={arch === 'maxillary' ? `M${x - 8} 30C${x - 4} 27 ${x + 4} 27 ${x + 8} 30` : `M${x - 8} 122C${x - 4} 125 ${x + 4} 125 ${x + 8} 122`}
            fill="none"
            stroke={arch === 'maxillary' ? '#b8e6de' : '#b8d8f1'}
            strokeWidth="0.55"
            strokeLinecap="round"
          />
        </g>
      ))}
    </g>
  );
}

export function ToothFactory({ tooth, toothNumber, arch, positionIndex, activeTooth, activeSurface, activeSiteIndex }: ToothFactoryProps) {
  const family = classifyTooth(toothNumber);
  const variant = getMorphologyVariant(family, toothNumber);
  const mirror = shouldMirrorTooth(toothNumber, arch);
  const isActive = toothNumber === activeTooth;
  const updatedRecently = tooth.updatedAt > 0 && Date.now() - tooth.updatedAt < 2200;
  const shadowId = useMemo(() => `tooth-shadow-${arch}-${toothNumber}-${positionIndex}`, [arch, toothNumber, positionIndex]);
  const fill = `url(#${shadowId}-fill)`;
  const stroke = isActive ? '#0ea5e9' : '#b9c6d4';

  useEffect(() => {
    console.debug('[Perio UI] render triggered', {
      toothNumber,
      arch,
      activeTooth,
      activeSurface,
      activeSiteIndex,
      buccalDepth: tooth.buccal.depth,
      lingualDepth: tooth.lingual.depth,
    });
  }, [activeSiteIndex, activeSurface, activeTooth, arch, tooth.buccal.depth, tooth.lingual.depth, toothNumber]);

  console.debug('[Perio UI] render tooth factory', {
    toothNumber,
    arch,
    isActive,
    activeSurface,
    activeSiteIndex,
    buccalDepth: tooth.buccal.depth,
    lingualDepth: tooth.lingual.depth,
  });

  return (
    <g
      className={[
        'transition-all duration-300 ease-out',
        isActive || updatedRecently ? 'chart-pop' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      style={isActive ? { filter: 'drop-shadow(0 0 18px rgba(14, 165, 233, 0.18))' } : undefined}
    >
      <defs>
        <linearGradient id={`${shadowId}-fill`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="45%" stopColor="#f8fbff" />
          <stop offset="100%" stopColor="#e6eef8" />
        </linearGradient>
        <filter id={shadowId} x="-32%" y="-20%" width="164%" height="164%">
          <feDropShadow dx="0" dy="5" stdDeviation="7" floodColor="#94a3b8" floodOpacity={isActive ? 0.18 : 0.12} />
        </filter>
      </defs>

      <ellipse cx="50" cy="156" rx="24" ry="4" fill="#cbd5e1" opacity="0.06" />
      <BackgroundGuides arch={arch} />

      <g transform={`translate(50 80) scale(${TOOTH_SCALE}) translate(-50 -80)`}>
        {familyNode({
          family,
          fill,
          stroke,
          shadowId,
          missing: tooth.missing,
          implant: tooth.implant,
          isActive,
          variant,
          mirror,
        })}
      </g>

      <SiteOverlay
        toothNumber={toothNumber}
        isActiveTooth={isActive}
        surface="lingual"
        activeSurface={activeSurface}
        activeSiteIndex={activeSiteIndex}
        depth={tooth.lingual.depth}
        bleeding={tooth.lingual.bleeding}
      />

      <SiteOverlay
        toothNumber={toothNumber}
        isActiveTooth={isActive}
        surface="buccal"
        activeSurface={activeSurface}
        activeSiteIndex={activeSiteIndex}
        depth={tooth.buccal.depth}
        bleeding={tooth.buccal.bleeding}
      />
    </g>
  );
}
