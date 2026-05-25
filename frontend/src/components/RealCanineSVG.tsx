import React from 'react';
import type { ToothAnatomyProps } from './RealIncisorSVG';

export function RealCanineSVG({ fill, stroke, shadowId, missing, implant, isActive }: ToothAnatomyProps) {
  return (
    <g>
      <path
        d="M29 22C31 15 40 10 50 10C60 10 69 15 71 22C73 29 72 35 69 41C66 46 63 49 60 53C57 57 55 62 54 68C52 79 57 95 63 113C68 129 68 145 50 150C32 145 32 129 37 113C43 95 48 79 46 68C45 62 43 57 40 53C37 49 34 46 31 41C28 35 27 29 29 22Z"
        fill={missing ? '#eee8dd' : fill}
        stroke={missing ? '#94a3b8' : stroke}
        strokeWidth={1.55}
        strokeLinejoin="round"
        strokeDasharray={missing ? '5 4' : undefined}
        filter={`url(#${shadowId})`}
      />
      <path d="M34 18C40 21 60 21 66 18" fill="none" stroke="#c4b08d" strokeWidth="1.55" strokeLinecap="round" opacity="0.7" />
      <path d="M41 28C45 31 55 31 59 28" fill="none" stroke="#f7f1e7" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M50 16L50 136" fill="none" stroke="#b99c74" strokeWidth="1.15" strokeLinecap="round" />
      <path d="M46 40L50 15L54 40" fill="none" stroke="#d7bf95" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M43 60C47 63 53 63 57 60" fill="none" stroke="#b99c74" strokeWidth="0.95" strokeLinecap="round" opacity="0.8" />
      <path d="M43 98C46 104 54 104 57 98" fill="none" stroke="#b99c74" strokeWidth="0.95" strokeLinecap="round" opacity="0.8" />
      <path d="M38 86C43 91 57 91 62 86" fill="none" stroke="#d4b98a" strokeWidth="1.05" strokeLinecap="round" opacity="0.9" />
      <path d="M40 52C44 48 56 48 60 52" fill="none" stroke="#d7bf95" strokeWidth="1" strokeLinecap="round" opacity="0.85" />
      <path d="M47 112C48 121 45 134 43 143" fill="none" stroke="#d1dbe7" strokeWidth="0.95" strokeLinecap="round" />
      <path d="M53 112C52 121 55 134 57 143" fill="none" stroke="#d1dbe7" strokeWidth="0.95" strokeLinecap="round" />

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
