import React from 'react';
import { ToothRow } from './ToothRow';
import type { ToothState, ToothSurface } from '../types';

interface PerioChartProps {
  teeth: Record<number, ToothState>;
  activeTooth: number | null;
  activeSurface: ToothSurface | null;
  activeSiteIndex: number | null;
}

const MAXILLARY_ROW = Array.from({ length: 16 }, (_, index) => index + 1);
const MANDIBULAR_ROW = Array.from({ length: 16 }, (_, index) => 32 - index);

export function PerioChart({ teeth, activeTooth, activeSurface, activeSiteIndex }: PerioChartProps) {
  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 rounded-[28px] border border-slate-200/80 bg-white/75 px-5 py-4 shadow-[0_12px_32px_rgba(15,23,42,0.05)] xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-slate-500">Interactive perio chart</p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-900">Full mouth periodontal chart</h2>
        </div>
        <div className="flex flex-wrap gap-2 text-xs font-semibold text-slate-600 xl:justify-end">
          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1">3 probing sites per surface</span>
          <span className="rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-cyan-800">Active site glows</span>
          <span className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-rose-700">Bleeding marker</span>
        </div>
      </div>

      <ToothRow
        title="Maxillary arch"
        subtitle="Upper arch displayed in anatomical order from patient right to left"
        teeth={MAXILLARY_ROW}
        chart={teeth}
        activeTooth={activeTooth}
        activeSurface={activeSurface}
        activeSiteIndex={activeSiteIndex}
      />

      <div className="mx-auto flex w-full max-w-5xl items-center gap-3 px-1">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-300 to-transparent" />
        <span className="rounded-full border border-slate-200 bg-white px-4 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
          Midline
        </span>
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-300 to-transparent" />
      </div>

      <ToothRow
        title="Mandibular arch"
        subtitle="Lower arch remains reversed to preserve patient perspective"
        teeth={MANDIBULAR_ROW}
        chart={teeth}
        activeTooth={activeTooth}
        activeSurface={activeSurface}
        activeSiteIndex={activeSiteIndex}
      />
    </div>
  );
}