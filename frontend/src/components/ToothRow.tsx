import React from 'react';
import { Tooth } from './Tooth';
import type { ToothState, ToothSurface } from '../types';

interface ToothRowProps {
  title: string;
  subtitle: string;
  teeth: number[];
  chart: Record<number, ToothState>;
  activeTooth: number | null;
  activeSurface: ToothSurface | null;
  activeSiteIndex: number | null;
}

export function ToothRow({
  title,
  subtitle,
  teeth,
  chart,
  activeTooth,
  activeSurface,
  activeSiteIndex,
}: ToothRowProps) {
  return (
    <section className="rounded-[28px] border border-slate-200/80 bg-white/70 p-4 shadow-[0_18px_42px_rgba(15,23,42,0.06)] backdrop-blur">
      <header className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-[0.28em] text-slate-500">{title}</h3>
          <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
        </div>
        <div className="rounded-full border border-cyan-100 bg-cyan-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-cyan-800">
          {teeth[0]} - {teeth[teeth.length - 1]}
        </div>
      </header>

      <div className="chart-scrollbar flex justify-start gap-3 overflow-x-auto pb-2 pr-2 xl:justify-center">
        {teeth.map((toothNumber) => (
          <Tooth
            key={toothNumber}
            tooth={chart[toothNumber]}
            activeTooth={activeTooth}
            activeSurface={activeSurface}
            activeSiteIndex={activeSiteIndex}
          />
        ))}
      </div>
    </section>
  );
}