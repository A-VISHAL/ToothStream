import React from 'react';
import { ToothFactory } from './ToothFactory';
import type { ToothState, ToothSurface } from '../types';

type ArchSide = 'maxillary' | 'mandibular';

interface PerioArchProps {
  arch: ArchSide;
  title: string;
  subtitle: string;
  teeth: number[];
  chart: Record<number, ToothState>;
  activeTooth: number | null;
  activeSurface: ToothSurface | null;
  activeSiteIndex: number | null;
}

const ARCH_WIDTH = 1600;
const ARCH_HEIGHT = 350;
const START_X = 92;
const END_X = 1508;
const AMPLITUDE = 40;

function archY(arch: ArchSide, t: number): number {
  const arc = Math.sin(Math.PI * t) * AMPLITUDE;
  return arch === 'maxillary' ? 118 + arc : 232 - arc;
}

function archRotation(arch: ArchSide, t: number): number {
  const tilt = (t - 0.5) * 16;
  return arch === 'maxillary' ? tilt : -tilt;
}

function archGuidePath(arch: ArchSide): string {
  return arch === 'maxillary'
    ? 'M110 130C370 78 1230 78 1490 130'
    : 'M110 222C370 274 1230 274 1490 222';
}

function archBandPath(arch: ArchSide): string {
  return arch === 'maxillary'
    ? 'M140 100C390 44 1210 44 1460 100'
    : 'M140 252C390 308 1210 308 1460 252';
}

function sectionLabel(arch: ArchSide): string {
  return arch === 'maxillary' ? 'Upper arch' : 'Lower arch';
}

function BackgroundGuideLayer({ arch }: { arch: ArchSide }) {
  const contourStroke = arch === 'maxillary' ? '#9bcfc6' : '#9bbfe0';
  const guideStroke = arch === 'maxillary' ? '#c7ece6' : '#c9ddf1';

  return (
    <g pointerEvents="none" opacity="0.72">
      <path
        d={arch === 'maxillary' ? 'M100 120C360 72 1240 72 1500 120' : 'M100 230C360 278 1240 278 1500 230'}
        fill="none"
        stroke={contourStroke}
        strokeWidth="2.1"
        strokeLinecap="round"
        strokeDasharray="10 12"
      />
      <path
        d={arch === 'maxillary' ? 'M128 108C390 58 1210 58 1472 108' : 'M128 242C390 292 1210 292 1472 242'}
        fill="none"
        stroke={guideStroke}
        strokeWidth="1.2"
        strokeLinecap="round"
        opacity="0.8"
      />
      <path
        d={arch === 'maxillary' ? 'M108 138C360 112 1240 112 1492 138' : 'M108 212C360 238 1240 238 1492 212'}
        fill="none"
        stroke={guideStroke}
        strokeWidth="1"
        strokeLinecap="round"
        strokeDasharray="4 7"
        opacity="0.72"
      />
    </g>
  );
}

export function PerioArch({ arch, title, subtitle, teeth, chart, activeTooth, activeSurface, activeSiteIndex }: PerioArchProps) {
  return (
    <section className="rounded-[30px] border border-slate-200/80 bg-white/82 p-3 shadow-[0_18px_40px_rgba(15,23,42,0.06)] sm:p-4">
      <header className="flex flex-col gap-2 border-b border-slate-200/70 pb-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-slate-500">{sectionLabel(arch)}</p>
          <h3 className="mt-1.5 text-lg font-semibold tracking-tight text-slate-950">{title}</h3>
          <p className="mt-0.5 text-[12px] leading-5 text-slate-500">{subtitle}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-600">
          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1">16 teeth</span>
          <span className="rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-cyan-800">SVG only</span>
        </div>
      </header>

      <div className="relative mt-2 overflow-hidden rounded-[22px] border border-slate-200/80 bg-gradient-to-b from-slate-50 to-white p-1.5 sm:p-2">
        <svg
          viewBox={`0 0 ${ARCH_WIDTH} ${ARCH_HEIGHT}`}
          preserveAspectRatio="xMidYMid meet"
          className="block h-auto w-full max-w-none"
          shapeRendering="geometricPrecision"
          textRendering="geometricPrecision"
        >
          <defs>
            <linearGradient id={`arch-${arch}-fade`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#eff6ff" stopOpacity="0.86" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
            </linearGradient>
          </defs>

          <BackgroundGuideLayer arch={arch} />
          <path d={archBandPath(arch)} fill={`url(#arch-${arch}-fade)`} opacity="0.56" />
          <path d={archGuidePath(arch)} fill="none" stroke="#cbd5e1" strokeWidth="2" strokeLinecap="round" strokeDasharray="8 10" />

          {teeth.map((toothNumber, positionIndex) => {
            const t = positionIndex / Math.max(1, teeth.length - 1);
            const x = START_X + (END_X - START_X) * t;
            const y = archY(arch, t);
            const rotation = archRotation(arch, t);
            const tooth = chart[toothNumber];

            return (
              <g key={toothNumber} transform={`translate(${x} ${y}) rotate(${rotation} 50 80)`}>
                <ToothFactory
                  tooth={tooth}
                  toothNumber={toothNumber}
                  arch={arch}
                  positionIndex={positionIndex}
                  activeTooth={activeTooth}
                  activeSurface={activeSurface}
                  activeSiteIndex={activeSiteIndex}
                />
              </g>
            );
          })}
        </svg>

        <div className="pointer-events-none absolute inset-x-6 top-3 flex items-center justify-between text-[9px] font-semibold uppercase tracking-[0.28em] text-slate-400">
          <span>Patient right</span>
          <span>Patient left</span>
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-3 text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">
        <span>Lingual / palatal sites above the tooth body</span>
        <span>Buccal sites below the tooth body</span>
      </div>
    </section>
  );
}
