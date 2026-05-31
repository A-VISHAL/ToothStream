import React from 'react';
import { EnhancedToothCard } from './EnhancedToothCard';
import type { ToothState, ToothSurface } from '../types';

interface ToothRowProps {
  title: string;
  subtitle: string;
  teeth: number[];
  chart: Record<number, ToothState>;
  activeTooth: number | null;
  activeSurface: ToothSurface | null;
  activeSiteIndex: number | null;
  arch: 'maxillary' | 'mandibular';
}

export function ToothRow({
  title,
  subtitle,
  teeth,
  chart,
  activeTooth,
  activeSurface,
  activeSiteIndex,
  arch,
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

      {/* Legend */}
      <div className="mb-4 flex flex-wrap gap-2 text-[11px]">
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 bg-green-100 border border-green-300 rounded"></span>
          <span className="text-green-700">Healthy</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 bg-yellow-100 border border-yellow-300 rounded"></span>
          <span className="text-yellow-700">Charted</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 bg-orange-100 border border-orange-300 rounded"></span>
          <span className="text-orange-700">Moderate</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 bg-red-100 border border-red-300 rounded"></span>
          <span className="text-red-700">Critical</span>
        </span>
      </div>

      <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-3 overflow-x-auto pb-2">
        {teeth.map((toothNumber) => (
          <EnhancedToothCard
            key={toothNumber}
            tooth={chart[toothNumber]}
            isActive={activeTooth === toothNumber}
            arch={arch}
          />
        ))}
      </div>
    </section>
  );
}