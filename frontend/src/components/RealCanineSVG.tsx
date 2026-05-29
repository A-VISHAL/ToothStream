import React from 'react';
import type { ToothAnatomyProps } from './RealIncisorSVG';

export function RealCanineSVG({ fill, stroke, shadowId, missing, implant, isActive, variant, mirror }: ToothAnatomyProps) {
  const maxillaryOutline =
    'M30 21C32 14 41 9 50 9C59 9 68 14 70 21C72 28 72 35 69 42C66 48 63 52 60 56C56 61 54 68 53 77C51 90 55 106 60 124C63 136 60 147 50 150C40 147 37 136 40 124C45 106 49 90 47 77C46 68 44 61 40 56C37 52 34 48 31 42C28 35 28 28 30 21Z';
  const mandibularOutline =
    'M33 22C35 16 42 12 50 12C58 12 65 16 67 22C69 29 68 35 66 42C64 49 61 54 58 59C55 64 53 70 52 78C50 92 53 111 56 128C58 141 56 150 50 150C44 150 42 141 44 128C47 111 50 92 48 78C47 70 45 64 42 59C39 54 36 49 34 42C32 35 31 29 33 22Z';
  const outline = variant === 'canine-mandibular' ? mandibularOutline : maxillaryOutline;
  const cej = variant === 'canine-mandibular' ? 'M41 54C45 58 55 58 59 54' : 'M39 57C44 62 56 62 61 57';

  return (
    <g transform={mirror ? 'translate(100 0) scale(-1 1)' : undefined}>
      <defs>
        <clipPath id={`${shadowId}-canine-clip`}>
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
      {!missing ? <rect x="18" y="56" width="64" height="102" fill="#efdfc6" clipPath={`url(#${shadowId}-canine-clip)`} opacity="0.95" /> : null}

      <path d={cej} fill="none" stroke="#7d8794" strokeWidth="1.04" strokeLinecap="round" opacity="0.86" />
      <path d="M36 20C41 24 59 24 64 20" fill="none" stroke="#d3bd9a" strokeWidth="1.2" strokeLinecap="round" opacity="0.72" />
      <path d="M46 41L50 16L54 41" fill="none" stroke="#d4bc97" strokeWidth="1.08" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M50 57V141" fill="none" stroke="#c8ab82" strokeWidth="1" strokeLinecap="round" />
      <path d="M43 84C46 90 54 90 57 84" fill="none" stroke="#ceb088" strokeWidth="0.85" strokeLinecap="round" opacity="0.88" />
      <path d="M44 116C46 125 44 136 42 144" fill="none" stroke="#d2b995" strokeWidth="0.88" strokeLinecap="round" />
      <path d="M56 116C54 125 56 136 58 144" fill="none" stroke="#d2b995" strokeWidth="0.88" strokeLinecap="round" />

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
