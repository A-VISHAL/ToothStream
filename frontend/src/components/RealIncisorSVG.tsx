import React from 'react';

export interface ToothAnatomyProps {
  fill: string;
  stroke: string;
  shadowId: string;
  missing: boolean;
  implant: boolean;
  isActive: boolean;
}

export function RealIncisorSVG({ fill, stroke, shadowId, missing, implant, isActive }: ToothAnatomyProps) {
  return (
    <g>
      <path
        d="M32 18C37 13 63 13 68 18C71 22 72 28 71 35C70 45 67 56 65 67C63 85 67 105 61 126C58 141 55 150 50 150C45 150 42 141 39 126C33 105 37 85 35 67C33 56 30 45 29 35C28 28 29 22 32 18Z"
        fill={missing ? '#eee8dd' : fill}
        stroke={missing ? '#94a3b8' : stroke}
        strokeWidth={1.55}
        strokeLinejoin="round"
        strokeDasharray={missing ? '5 4' : undefined}
        filter={`url(#${shadowId})`}
      />
      <path d="M37 18H63" fill="none" stroke="#c4b08d" strokeWidth="1.55" strokeLinecap="round" opacity="0.7" />
      <path d="M40 24C45 27 55 27 60 24" fill="none" stroke="#f7f1e7" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M50 18V136" fill="none" stroke="#b99c74" strokeWidth="1.15" strokeLinecap="round" />
      <path d="M44 58C47 60 53 60 56 58" fill="none" stroke="#b99c74" strokeWidth="0.95" strokeLinecap="round" opacity="0.8" />
      <path d="M44 98C46 104 54 104 56 98" fill="none" stroke="#b99c74" strokeWidth="0.95" strokeLinecap="round" opacity="0.8" />
      <path d="M38 86C43 90 57 90 62 86" fill="none" stroke="#d4b98a" strokeWidth="1.05" strokeLinecap="round" opacity="0.9" />
      <path d="M41 34C45 38 55 38 59 34" fill="none" stroke="#d7bf95" strokeWidth="1" strokeLinecap="round" opacity="0.85" />

      {!missing ? <path d="M41 40C45 42 55 42 59 40" fill="none" stroke="#b5cde1" strokeWidth="0.9" strokeLinecap="round" opacity="0.75" /> : null}

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
