import React from 'react';
import type { ToothAnatomyProps } from './RealIncisorSVG';

export function RealPremolarSVG({ fill, stroke, shadowId, missing, implant, isActive }: ToothAnatomyProps) {
  return (
    <g>
      <path
        d="M27 20C30 14 39 10 50 10C61 10 70 14 73 20C75 26 74 33 72 41C70 48 68 55 66 61C64 67 64 74 66 81C69 90 74 103 77 116C79 130 75 146 50 150C25 146 21 130 23 116C26 103 31 90 34 81C36 74 36 67 34 61C32 55 30 48 28 41C26 33 25 26 27 20Z"
        fill={missing ? '#eee8dd' : fill}
        stroke={missing ? '#94a3b8' : stroke}
        strokeWidth={1.55}
        strokeLinejoin="round"
        strokeDasharray={missing ? '5 4' : undefined}
        filter={`url(#${shadowId})`}
      />
      <path d="M34 18C40 22 46 24 50 24C54 24 60 22 66 18" fill="none" stroke="#c4b08d" strokeWidth="1.55" strokeLinecap="round" opacity="0.7" />
      <path d="M38 29C42 32 47 34 50 34C53 34 58 32 62 29" fill="none" stroke="#f7f1e7" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M50 16V136" fill="none" stroke="#b99c74" strokeWidth="1.15" strokeLinecap="round" />
      <path d="M44 40C47 36 53 36 56 40" fill="none" stroke="#d7bf95" strokeWidth="1" strokeLinecap="round" />
      <path d="M46 56C48 59 52 59 54 56" fill="none" stroke="#b99c74" strokeWidth="0.95" strokeLinecap="round" opacity="0.8" />
      <path d="M45 92C47 98 53 98 55 92" fill="none" stroke="#b99c74" strokeWidth="0.95" strokeLinecap="round" opacity="0.8" />
      <path d="M38 83C43 87 57 87 62 83" fill="none" stroke="#d4b98a" strokeWidth="1.05" strokeLinecap="round" opacity="0.9" />
      <path d="M44 44C46 46 54 46 56 44" fill="none" stroke="#cfe3f6" strokeWidth="1" strokeLinecap="round" />
      <path d="M45 40L50 24L55 40" fill="none" stroke="#d7bf95" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M45 112C46 120 43 133 41 142" fill="none" stroke="#d1dbe7" strokeWidth="0.95" strokeLinecap="round" />
      <path d="M55 112C54 120 57 133 59 142" fill="none" stroke="#d1dbe7" strokeWidth="0.95" strokeLinecap="round" />

      {implant ? (
        <g transform="translate(50, 82)">
          <rect x="-8" y="-12" width="16" height="8" rx="4" fill="#94a3b8" />
          <rect x="-4" y="-6" width="8" height="40" rx="4" fill="#94a3b8" />
          <path d="M-11 15H11" stroke="#64748b" strokeWidth="2.8" strokeLinecap="round" />
          <path d="M-9 26H9" stroke="#64748b" strokeWidth="2.2" strokeLinecap="round" />
        </g>
      ) : null}

      {isActive ? <circle cx="50" cy="79" r="38" fill="none" stroke="#38bdf8" strokeOpacity="0.18" strokeWidth="1.1" strokeDasharray="4 6" /> : null}
    </g>
  );
}
