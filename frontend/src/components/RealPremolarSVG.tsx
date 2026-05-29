import React from 'react';
import type { ToothAnatomyProps } from './RealIncisorSVG';

export function RealPremolarSVG({ fill, stroke, shadowId, missing, implant, isActive, variant, mirror }: ToothAnatomyProps) {
  const firstOutline =
    'M28 20C31 14 40 10 50 10C60 10 69 14 72 20C74 26 73 34 71 43C69 52 67 60 66 68C65 75 67 84 70 95C74 109 78 126 76 138C74 147 64 150 50 150C36 150 26 147 24 138C22 126 26 109 30 95C33 84 35 75 34 68C33 60 31 52 29 43C27 34 26 26 28 20Z';
  const secondOutline =
    'M30 21C32 15 40 11 50 11C60 11 68 15 70 21C72 27 71 34 70 42C68 50 66 58 65 65C64 73 65 82 68 93C71 106 74 124 73 136C72 146 63 150 50 150C37 150 28 146 27 136C26 124 29 106 32 93C35 82 36 73 35 65C34 58 32 50 30 42C29 34 28 27 30 21Z';
  const outline = variant === 'premolar-second' ? secondOutline : firstOutline;

  return (
    <g transform={mirror ? 'translate(100 0) scale(-1 1)' : undefined}>
      <defs>
        <clipPath id={`${shadowId}-premolar-clip`}>
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
      {!missing ? <rect x="18" y="56" width="64" height="102" fill="#efdfc7" clipPath={`url(#${shadowId}-premolar-clip)`} opacity="0.95" /> : null}

      <path d="M35 20C40 24 60 24 65 20" fill="none" stroke="#d3bd9a" strokeWidth="1.2" strokeLinecap="round" opacity="0.72" />
      <path
        d={variant === 'premolar-second' ? 'M41 56C44 60 56 60 59 56' : 'M39 57C44 62 56 62 61 57'}
        fill="none"
        stroke="#7d8794"
        strokeWidth="1.04"
        strokeLinecap="round"
        opacity="0.86"
      />
      <path d="M45 40L50 24L55 40" fill="none" stroke="#d4bc97" strokeWidth="1.08" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M50 58V141" fill="none" stroke="#c8ab82" strokeWidth="1" strokeLinecap="round" />
      <path d="M43 84C46 90 54 90 57 84" fill="none" stroke="#ceb088" strokeWidth="0.85" strokeLinecap="round" opacity="0.88" />
      {variant === 'premolar-first' ? (
        <>
          <path d="M45 116C46 125 43 136 40 144" fill="none" stroke="#d2b995" strokeWidth="0.88" strokeLinecap="round" />
          <path d="M55 116C54 125 57 136 60 144" fill="none" stroke="#d2b995" strokeWidth="0.88" strokeLinecap="round" />
        </>
      ) : (
        <path d="M50 116C50 125 50 136 50 146" fill="none" stroke="#d2b995" strokeWidth="0.9" strokeLinecap="round" />
      )}

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
