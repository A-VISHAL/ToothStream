import React from 'react';
import type { ToothAnatomyProps } from './RealIncisorSVG';

export function RealMolarSVG({ fill, stroke, shadowId, missing, implant, isActive }: ToothAnatomyProps) {
  return (
    <g>
      <path
        d="M18 28C20 17 29 10 41 10H59C71 10 80 17 82 28C84 39 82 49 79 58C77 64 76 70 77 76C79 84 83 93 84 104C85 118 80 135 68 144C60 150 53 150 50 150C47 150 40 150 32 144C20 135 15 118 16 104C17 93 21 84 23 76C24 70 23 64 21 58C18 49 16 39 18 28Z"
        fill={missing ? '#eee8dd' : fill}
        stroke={missing ? '#94a3b8' : stroke}
        strokeWidth={1.55}
        strokeLinejoin="round"
        strokeDasharray={missing ? '5 4' : undefined}
        filter={`url(#${shadowId})`}
      />
      <path d="M28 18C35 22 41 24 50 24C59 24 65 22 72 18" fill="none" stroke="#c4b08d" strokeWidth="1.55" strokeLinecap="round" opacity="0.7" />
      <path d="M31 31C37 34 43 36 50 36C57 36 63 34 69 31" fill="none" stroke="#f7f1e7" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M34 43C40 39 45 37 50 37C55 37 60 39 66 43" fill="none" stroke="#d1e4f5" strokeWidth="1.05" strokeLinecap="round" />
      <path d="M24 55C31 51 39 49 50 49C61 49 69 51 76 55" fill="none" stroke="#d7bf95" strokeWidth="1.05" strokeLinecap="round" opacity="0.85" />
      <path d="M50 16V120" fill="none" stroke="#b99c74" strokeWidth="1.15" strokeLinecap="round" />
      <path d="M32 61C39 67 44 70 50 70C56 70 61 67 68 61" fill="none" stroke="#b99c74" strokeWidth="0.95" strokeLinecap="round" opacity="0.8" />
      <path d="M30 88C38 93 44 96 50 96C56 96 62 93 70 88" fill="none" stroke="#b99c74" strokeWidth="0.95" strokeLinecap="round" opacity="0.8" />
      <path d="M30 100C38 104 44 106 50 106C56 106 62 104 70 100" fill="none" stroke="#c7ddf2" strokeWidth="1" strokeLinecap="round" />
      <path d="M39 116C42 123 42 136 41 144" fill="none" stroke="#d1dbe7" strokeWidth="1" strokeLinecap="round" />
      <path d="M50 114C50 124 50 138 50 150" fill="none" stroke="#d1dbe7" strokeWidth="1" strokeLinecap="round" />
      <path d="M61 116C58 123 58 136 59 144" fill="none" stroke="#d1dbe7" strokeWidth="1" strokeLinecap="round" />

      {implant ? (
        <g transform="translate(50, 82)">
          <rect x="-8" y="-12" width="16" height="8" rx="4" fill="#94a3b8" />
          <rect x="-4" y="-6" width="8" height="40" rx="4" fill="#94a3b8" />
          <path d="M-11 15H11" stroke="#64748b" strokeWidth="2.8" strokeLinecap="round" />
          <path d="M-9 26H9" stroke="#64748b" strokeWidth="2.2" strokeLinecap="round" />
        </g>
      ) : null}

      {isActive ? <circle cx="50" cy="79" r="39" fill="none" stroke="#38bdf8" strokeOpacity="0.18" strokeWidth="1.1" strokeDasharray="4 6" /> : null}
    </g>
  );
}
