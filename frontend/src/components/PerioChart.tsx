import React from 'react';
import { PerioArch } from './PerioArch';
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
    <div className="space-y-3">
      <div className="flex flex-col gap-3 rounded-[30px] border border-slate-200/80 bg-white/75 px-4 py-4 shadow-[0_12px_32px_rgba(15,23,42,0.05)]">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-slate-500">Interactive perio chart</p>
          <h2 className="mt-1 text-[1.55rem] font-semibold tracking-tight text-slate-950 sm:text-[1.6rem]">Full mouth periodontal chart</h2>
        </div>
        <div className="flex flex-wrap gap-2 text-[11px] font-semibold text-slate-600">
          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1">32 teeth visible at once</span>
          <span className="rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-cyan-800">Active site glows</span>
          <span className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-rose-700">Bleeding marker</span>
          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-emerald-700">No horizontal scroll</span>
        </div>
      </div>

      <PerioArch
        arch="maxillary"
        title="Maxillary arch"
        subtitle="Upper arch rendered in patient perspective from 1 to 16 with clinically styled SVG anatomy."
        teeth={MAXILLARY_ROW}
        chart={teeth}
        activeTooth={activeTooth}
        activeSurface={activeSurface}
        activeSiteIndex={activeSiteIndex}
      />

      <div className="mx-auto flex w-full max-w-4xl items-center gap-2 px-1 py-0">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-300 to-transparent" />
        <span className="rounded-full border border-slate-200 bg-white px-3 py-0.5 text-[10px] font-semibold uppercase tracking-[0.26em] text-slate-500">
          Midline
        </span>
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-300 to-transparent" />
      </div>

      <PerioArch
        arch="mandibular"
        title="Mandibular arch"
        subtitle="Lower arch rendered in patient perspective from 32 to 17 with identical site geometry."
        teeth={MANDIBULAR_ROW}
        chart={teeth}
        activeTooth={activeTooth}
        activeSurface={activeSurface}
        activeSiteIndex={activeSiteIndex}
      />

      <div className="grid gap-2 rounded-[24px] border border-slate-200/80 bg-white/78 p-3 text-[12px] text-slate-600 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-400">Charting model</p>
          <p className="mt-1.5 font-medium text-slate-800">3 sites per surface with live pocket-depth visualization.</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-400">Surface logic</p>
          <p className="mt-1.5 font-medium text-slate-800">Lingual / palatal on top, buccal on bottom.</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-400">Live feedback</p>
          <p className="mt-1.5 font-medium text-slate-800">Active tooth, active site, and bleeding state animate on update.</p>
        </div>
      </div>
    </div>
  );
}