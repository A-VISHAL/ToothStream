import React, { useMemo } from 'react';
import { RealCanineSVG } from './RealCanineSVG';
import { RealIncisorSVG, type ToothAnatomyProps } from './RealIncisorSVG';
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
  surface,
  activeSurface,
  activeSiteIndex,
  depth,
  bleeding,
  recession,
}: {
  surface: ToothSurface;
  activeSurface: ToothSurface | null;
  activeSiteIndex: number | null;
  depth: [number, number, number];
  bleeding: boolean;
  recession: boolean;
}) {
  const isActiveSurface = surface === activeSurface;
  const topSurface = surface === 'lingual';
  const baseY = topSurface ? 22 : 138;
  const labelY = topSurface ? 8 : 168;
  const connectorY = topSurface ? 40 : 120;
  const direction = topSurface ? 1 : -1;

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
                x="-8"
                y="-8"
                width="16"
                height="16"
                rx="5"
                fill={isActiveSite ? (topSurface ? '#def8f2' : '#e4f1ff') : '#ffffff'}
                stroke={isActiveSite ? (topSurface ? '#0f9f8a' : '#0b8ddb') : '#d2dae4'}
                strokeWidth={isActiveSite ? 1.15 : 0.8}
                className={isActiveSite ? 'site-chip site-chip-active' : 'site-chip'}
              />
              <text y="2.8" textAnchor="middle" fontSize="5.8" fontWeight="700" className="fill-slate-800">
                {value > 0 ? value : '–'}
              </text>
              {bleeding && isActiveSite ? <circle cx="6.5" cy="-6.5" r="2.2" fill="#ef4444" stroke="#ffffff" strokeWidth="0.8" /> : null}
              {recession && isActiveSite ? (
                <circle cx="-6.5" cy="-6.5" r="2.2" fill="#f59e0b" stroke="#fff7ed" strokeWidth="0.8" />
              ) : null}
            </g>

            <text x={x} y={topSurface ? markerY - 10 : markerY + 16} textAnchor="middle" fontSize="4.4" className="fill-slate-400" opacity="0.8">
              {SITE_LABELS[index]}
            </text>
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

      <text x="50" y={labelY} textAnchor="middle" fontSize="4.6" fontWeight="700" letterSpacing="0.18em" className="fill-slate-500" opacity="0.45">
        {topSurface ? 'LINGUAL / PALATAL' : 'BUCCAL'}
      </text>
    </g>
  );
}

export function ToothFactory({ tooth, toothNumber, arch, positionIndex, activeTooth, activeSurface, activeSiteIndex }: ToothFactoryProps) {
  const family = classifyTooth(toothNumber);
  const isActive = toothNumber === activeTooth;
  const updatedRecently = Date.now() - tooth.updatedAt < 2200;
  const shadowId = useMemo(() => `tooth-shadow-${arch}-${toothNumber}-${positionIndex}`, [arch, toothNumber, positionIndex]);
  const fill = `url(#${shadowId}-fill)`;
  const stroke = isActive ? '#0ea5e9' : '#b9c6d4';

  return (
    <g className={isActive || updatedRecently ? 'chart-pop' : undefined}>
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

      <g transform={`translate(50 80) scale(${TOOTH_SCALE}) translate(-50 -80)`}>
        {familyNode({
          family,
          fill,
          stroke,
          shadowId,
          missing: tooth.missing,
          implant: tooth.implant,
          isActive,
        })}
      </g>

      <SiteOverlay
        surface="lingual"
        activeSurface={activeSurface}
        activeSiteIndex={activeSiteIndex}
        depth={tooth.lingual.depth}
        bleeding={tooth.lingual.bleeding}
        recession={tooth.lingual.recession}
      />

      <SiteOverlay
        surface="buccal"
        activeSurface={activeSurface}
        activeSiteIndex={activeSiteIndex}
        depth={tooth.buccal.depth}
        bleeding={tooth.buccal.bleeding}
        recession={tooth.buccal.recession}
      />
    </g>
  );
}
