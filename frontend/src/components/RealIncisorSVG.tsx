import React from 'react';
import type { ToothMorphologyVariant } from './ToothFactory';

export interface ToothAnatomyProps {
  fill: string;
  stroke: string;
  shadowId: string;
  missing: boolean;
  implant: boolean;
  isActive: boolean;
  variant: ToothMorphologyVariant;
  mirror: boolean;
}

export function RealIncisorSVG({ fill, stroke, shadowId, missing, implant, isActive, variant, mirror }: ToothAnatomyProps) {
  const centralOutline = 'M30 19C35 13 65 13 70 19C73 24 73 32 71 42C69 55 66 68 63 81C60 99 64 119 58 136C55 145 53 150 50 150C47 150 45 145 42 136C36 119 40 99 37 81C34 68 31 55 29 42C27 32 27 24 30 19Z';
  const lateralOutline = 'M34 18C38 14 61 14 65 18C69 23 70 31 69 39C68 50 65 62 63 74C61 92 64 109 59 126C56 138 53 150 50 150C47 150 44 138 41 126C36 109 39 92 37 74C35 62 32 50 31 39C30 31 31 23 34 18Z';
  const outline = variant === 'incisor-lateral' ? lateralOutline : centralOutline;
  const crownLine = variant === 'incisor-lateral' ? 'M40 52C44 56 56 56 60 52' : 'M38 54C43 58 57 58 62 54';

  return (
    <g transform={mirror ? 'translate(100 0) scale(-1 1)' : undefined}>
      <defs>
        <clipPath id={`${shadowId}-incisor-clip`}>
          <path d={outline} />
        </clipPath>
      </defs>

      <path
        d={outline}
        fill={missing ? '#eee8dd' : fill}
        stroke={missing ? '#94a3b8' : stroke}
        strokeWidth={1.52}
        strokeLinejoin="round"
        strokeDasharray={missing ? '5 4' : undefined}
        filter={`url(#${shadowId})`}
      />
      {!missing ? <rect x="20" y="54" width="60" height="102" fill="#efe0c8" clipPath={`url(#${shadowId}-incisor-clip)`} opacity="0.94" /> : null}

      <path d={crownLine} fill="none" stroke="#7c8695" strokeWidth="1.08" strokeLinecap="round" opacity="0.86" />
      <path d="M36 21C40 24 60 24 64 21" fill="none" stroke="#d3bd9a" strokeWidth="1.2" strokeLinecap="round" opacity="0.72" />
      <path d="M42 33C46 36 54 36 58 33" fill="none" stroke="#e9f1f8" strokeWidth="1.05" strokeLinecap="round" />
      <path d="M50 58V140" fill="none" stroke="#c8ab82" strokeWidth="1" strokeLinecap="round" />
      <path d="M44 80C46 84 54 84 56 80" fill="none" stroke="#ceb088" strokeWidth="0.85" strokeLinecap="round" opacity="0.9" />
      <path d="M42 112C45 118 55 118 58 112" fill="none" stroke="#ceb088" strokeWidth="0.85" strokeLinecap="round" opacity="0.86" />

      {!missing ? <path d="M41 40C45 42 55 42 59 40" fill="none" stroke="#b5cde1" strokeWidth="0.9" strokeLinecap="round" opacity="0.75" /> : null}

      {implant ? (
        <g transform="translate(50, 82)">
          <rect x="-8" y="-12" width="16" height="8" rx="4" fill="#94a3b8" />
          <rect x="-4" y="-6" width="8" height="40" rx="4" fill="#94a3b8" />
          <path d="M-11 15H11" stroke="#64748b" strokeWidth="2.8" strokeLinecap="round" />
          <path d="M-9 26H9" stroke="#64748b" strokeWidth="2.2" strokeLinecap="round" />
        </g>
      ) : null}

      {isActive ? <circle cx="50" cy="82" r="40" fill="none" stroke="#0ea5e9" strokeOpacity="0.26" strokeWidth="1.05" strokeDasharray="4 6" /> : null}
    </g>
  );
}
