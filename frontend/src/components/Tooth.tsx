import React, { useId, useMemo } from 'react';
import type { ToothState, ToothSurface, ToothSurfaceState } from '../types';

interface ToothProps {
  tooth: ToothState;
  activeTooth: number | null;
  activeSurface: ToothSurface | null;
  activeSiteIndex: number | null;
}

const SITE_X = [29, 60, 91];
const SITE_LABELS = ['M', 'Mid', 'D'];
const SITE_CHIP_SIZE = 26;
const SITE_NUMBER_FONT_SIZE = 21;
const SITE_LABEL_FONT_SIZE = 11;
const SURFACE_TAG_FONT_SIZE = 22;
const TOOTH_NUMBER_FONT_SIZE = 18;

function formatDepth(value: number): string {
  return value > 0 ? String(value) : '–';
}

function SiteGroup({
  isActiveTooth,
  surface,
  surfaceState,
  activeSurface,
  activeSiteIndex,
  y,
  label,
}: {
  isActiveTooth: boolean;
  surface: ToothSurface;
  surfaceState: ToothSurfaceState;
  activeSurface: ToothSurface | null;
  activeSiteIndex: number | null;
  y: number;
  label: string;
}) {
  const isActiveSurface = isActiveTooth && surface === activeSurface;

  return (
    <g>
      <text
        x="60"
        y={surface === 'lingual' ? y - 11 : y + 34}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={SURFACE_TAG_FONT_SIZE}
        fontWeight="800"
        fill="#111827"
        stroke="#ffffff"
        strokeWidth="0.5"
        paintOrder="stroke fill"
      >
        {surface === 'lingual' ? 'L' : 'B'}
      </text>
      {SITE_X.map((x, index) => {
        const isActiveSite = isActiveSurface && activeSiteIndex === index;
        const depth = surfaceState.depth[index];

        return (
          <g key={`${surface}-${index}`} transform={`translate(${x}, ${y})`} className="transition duration-150">
            <rect
              x={`-${SITE_CHIP_SIZE / 2}`}
              y={`-${SITE_CHIP_SIZE / 2}`}
              width={SITE_CHIP_SIZE}
              height={SITE_CHIP_SIZE}
              rx="7"
              fill={isActiveSite ? '#d9f9f1' : '#f8fafc'}
              stroke={isActiveSite ? '#14b8a6' : '#cbd5e1'}
              strokeWidth={isActiveSite ? '1.75' : '1'}
              className={isActiveSite ? 'pulse-glow' : ''}
            />
            <text
              y="0"
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={SITE_NUMBER_FONT_SIZE}
              fontWeight="800"
              fill="#111827"
              stroke="#ffffff"
              strokeWidth="0.55"
              paintOrder="stroke fill"
            >
              {formatDepth(depth)}
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
            {surfaceState.bleeding && isActiveSite ? (
              <circle cx="9" cy="-9" r="3.5" fill="#ef4444" />
            ) : null}
          </g>
        );
      })}
    </g>
  );
}

function ImplantGlyph() {
  return (
    <g transform="translate(60, 76)">
      <rect x="-10" y="-16" width="20" height="7" rx="3.5" fill="#94a3b8" />
      <rect x="-5" y="-10" width="10" height="45" rx="4" fill="#94a3b8" />
      <path d="M-10 18 H10" stroke="#64748b" strokeWidth="3" strokeLinecap="round" />
      <path d="M-8 28 H8" stroke="#64748b" strokeWidth="2.5" strokeLinecap="round" />
    </g>
  );
}

export function Tooth({ tooth, activeTooth, activeSurface, activeSiteIndex }: ToothProps) {
  const uniqueId = useId();
  const isActive = activeTooth === tooth.toothNumber;
  const isMissing = tooth.missing;
  const isImplant = tooth.implant;

  const topLabel = useMemo(() => 'L', []);

  return (
    <div
      className={`relative w-[116px] shrink-0 rounded-3xl border transition-all duration-200 ${
        isActive ? 'border-cyan-400 bg-cyan-50/70 shadow-[0_18px_38px_rgba(14,165,233,0.15)] chart-pop' : 'border-slate-200/80 bg-white/75'
      } ${isMissing ? 'opacity-55' : ''}`}
    >
      <svg viewBox="0 0 120 170" className="h-[170px] w-full overflow-visible" shapeRendering="geometricPrecision" textRendering="geometricPrecision">
        <defs>
          <linearGradient id={`${uniqueId}-fill`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#edf4ff" />
          </linearGradient>
          <filter id={`${uniqueId}-glow`} x="-40%" y="-40%" width="180%" height="180%">
            <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#38bdf8" floodOpacity="0.45" />
          </filter>
        </defs>

        <text
          x="60"
          y="14"
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={TOOTH_NUMBER_FONT_SIZE}
          fontWeight="800"
          fill="#111827"
          stroke="#ffffff"
          strokeWidth="0.45"
          paintOrder="stroke fill"
        >
          {tooth.toothNumber}
        </text>

        <path
          d="M60 18C79 18 92 28 92 47C92 61 86 69 84 82C82 95 87 108 81 124C77 136 71 143 60 143C49 143 43 136 39 124C33 108 38 95 36 82C34 69 28 61 28 47C28 28 41 18 60 18Z"
          fill={isMissing ? '#e2e8f0' : `url(#${uniqueId}-fill)`}
          stroke={isMissing ? '#94a3b8' : isActive ? '#0ea5e9' : '#cbd5e1'}
          strokeWidth={isActive ? '2.4' : '1.4'}
          strokeDasharray={isMissing ? '6 4' : '0'}
          filter={isActive ? `url(#${uniqueId}-glow)` : undefined}
        />

        <path
          d="M48 46C52 40 68 40 72 46"
          fill="none"
          stroke="#dbeafe"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          d="M45 82H75"
          fill="none"
          stroke="#dbeafe"
          strokeWidth="2"
          strokeLinecap="round"
        />

        <SiteGroup isActiveTooth={isActive} surface="lingual" surfaceState={tooth.lingual} activeSurface={activeSurface} activeSiteIndex={activeSiteIndex} y={31} label={topLabel} />
        <SiteGroup isActiveTooth={isActive} surface="buccal" surfaceState={tooth.buccal} activeSurface={activeSurface} activeSiteIndex={activeSiteIndex} y={128} label="B" />

        {isImplant ? <ImplantGlyph /> : null}

        {isMissing ? (
          <g>
            <rect x="39" y="56" width="42" height="24" rx="10" fill="rgba(148, 163, 184, 0.86)" />
            <text x="60" y="71" textAnchor="middle" fontSize="9" fontWeight="700" className="fill-white">
              Missing
            </text>
          </g>
        ) : null}
      </svg>
    </div>
  );
}