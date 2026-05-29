import React from 'react';
import type { ToothAnatomyProps } from './RealIncisorSVG';

export function RealMolarSVG({ fill, stroke, shadowId, missing, implant, isActive, variant, mirror }: ToothAnatomyProps) {
  const firstOutline =
    'M18 28C20 17 30 10 42 10H58C70 10 80 17 82 28C84 38 82 48 79 58C76 69 76 80 79 92C82 104 85 119 82 132C79 144 67 150 50 150C33 150 21 144 18 132C15 119 18 104 21 92C24 80 24 69 21 58C18 48 16 38 18 28Z';
  const secondOutline =
    'M21 29C23 19 31 12 42 12H58C69 12 77 19 79 29C81 38 79 47 77 56C75 65 75 76 77 86C79 98 82 113 80 126C78 140 67 149 50 149C33 149 22 140 20 126C18 113 21 98 23 86C25 76 25 65 23 56C21 47 19 38 21 29Z';
  const thirdOutline =
    'M24 30C26 22 32 16 41 16H59C68 16 74 22 76 30C78 39 76 47 74 55C72 64 72 74 74 83C76 94 78 107 77 118C76 133 66 145 50 145C34 145 24 133 23 118C22 107 24 94 26 83C28 74 28 64 26 55C24 47 22 39 24 30Z';
  const outline = variant === 'molar-first' ? firstOutline : variant === 'molar-second' ? secondOutline : thirdOutline;

  return (
    <g transform={mirror ? 'translate(100 0) scale(-1 1)' : undefined}>
      <defs>
        <clipPath id={`${shadowId}-molar-clip`}>
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
      {!missing ? <rect x="12" y="62" width="76" height="98" fill="#efdfc7" clipPath={`url(#${shadowId}-molar-clip)`} opacity="0.95" /> : null}

      <path d="M28 20C34 24 42 27 50 27C58 27 66 24 72 20" fill="none" stroke="#d3bd9a" strokeWidth="1.2" strokeLinecap="round" opacity="0.72" />
      <path d="M30 63C36 68 44 70 50 70C56 70 64 68 70 63" fill="none" stroke="#7d8794" strokeWidth="1.05" strokeLinecap="round" opacity="0.86" />
      <path d="M32 35C38 39 44 41 50 41C56 41 62 39 68 35" fill="none" stroke="#e9f1f8" strokeWidth="1" strokeLinecap="round" />
      <path d="M34 46C39 42 44 40 50 40C56 40 61 42 66 46" fill="none" stroke="#d4bc97" strokeWidth="1" strokeLinecap="round" />
      <path d="M50 66V124" fill="none" stroke="#c8ab82" strokeWidth="1" strokeLinecap="round" />
      <path d="M31 89C38 96 44 99 50 99C56 99 62 96 69 89" fill="none" stroke="#ceb088" strokeWidth="0.85" strokeLinecap="round" opacity="0.88" />
      {variant === 'molar-third' ? (
        <>
          <path d="M44 113C45 122 44 133 43 142" fill="none" stroke="#d2b995" strokeWidth="0.88" strokeLinecap="round" />
          <path d="M56 113C55 122 56 133 57 142" fill="none" stroke="#d2b995" strokeWidth="0.88" strokeLinecap="round" />
        </>
      ) : (
        <>
          <path d="M39 113C42 122 42 134 41 144" fill="none" stroke="#d2b995" strokeWidth="0.88" strokeLinecap="round" />
          <path d="M50 112C50 123 50 137 50 149" fill="none" stroke="#d2b995" strokeWidth="0.9" strokeLinecap="round" />
          <path d="M61 113C58 122 58 134 59 144" fill="none" stroke="#d2b995" strokeWidth="0.88" strokeLinecap="round" />
        </>
      )}

      {implant ? (
        <g transform="translate(50, 82)">
          <rect x="-8" y="-12" width="16" height="8" rx="4" fill="#94a3b8" />
          <rect x="-4" y="-6" width="8" height="40" rx="4" fill="#94a3b8" />
          <path d="M-11 15H11" stroke="#64748b" strokeWidth="2.8" strokeLinecap="round" />
          <path d="M-9 26H9" stroke="#64748b" strokeWidth="2.2" strokeLinecap="round" />
        </g>
      ) : null}

      {isActive ? <circle cx="50" cy="82" r="41" fill="none" stroke="#0ea5e9" strokeOpacity="0.26" strokeWidth="1.05" strokeDasharray="4 6" /> : null}
    </g>
  );
}
