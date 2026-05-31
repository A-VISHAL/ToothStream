import React from 'react';
import { EnhancedToothCard } from './EnhancedToothCard';
import type { ToothState } from '../types';

interface SimpleToothMapProps {
  teeth: Record<number, ToothState>;
  activeTooth: number | null;
  compact?: boolean;
}

const MAXILLARY_ROW = Array.from({ length: 16 }, (_, index) => index + 1);
const MANDIBULAR_ROW = Array.from({ length: 16 }, (_, index) => 32 - index);

export function SimpleToothMap({ teeth, activeTooth, compact = false }: SimpleToothMapProps) {
  return (
    <div className={`${compact ? 'space-y-4 px-3 py-3' : 'space-y-6 px-4 py-4'} rounded-[30px] border border-slate-200/80 bg-white/75 shadow-[0_12px_32px_rgba(15,23,42,0.05)]`}>
      {/* Header */}
      <div>
        <p className={`${compact ? 'text-[10px]' : 'text-[11px]'} font-semibold uppercase tracking-[0.32em] text-slate-500`}>Tooth Map</p>
        <h2 className={`mt-1 font-semibold tracking-tight text-slate-950 ${compact ? 'text-[1.15rem] sm:text-[1.25rem]' : 'text-[1.55rem] sm:text-[1.6rem]'}`}>Full mouth periodontal findings</h2>
      </div>

      {/* Legend */}
      <div className={`grid grid-cols-2 ${compact ? 'gap-2 text-[10px] md:grid-cols-5' : 'gap-3 text-[11px] md:grid-cols-5'} font-semibold`}>
        <div className={`flex items-center rounded-lg border border-green-200 bg-green-50 ${compact ? 'gap-1.5 px-2 py-1.5' : 'gap-2 px-3 py-2'}`}>
          <span className={compact ? 'text-sm' : 'text-lg'}>✓</span>
          <span className="text-green-800">Healthy / Open</span>
        </div>
        <div className={`flex items-center rounded-lg border border-yellow-200 bg-yellow-50 ${compact ? 'gap-1.5 px-2 py-1.5' : 'gap-2 px-3 py-2'}`}>
          <span className={compact ? 'text-sm' : 'text-lg'}>🟡</span>
          <span className="text-yellow-800">Charted (1-3mm)</span>
        </div>
        <div className={`flex items-center rounded-lg border border-orange-200 bg-orange-50 ${compact ? 'gap-1.5 px-2 py-1.5' : 'gap-2 px-3 py-2'}`}>
          <span className={compact ? 'text-sm' : 'text-lg'}>🟠</span>
          <span className="text-orange-800">Moderate (≥4mm)</span>
        </div>
        <div className={`flex items-center rounded-lg border border-red-300 bg-red-50 ${compact ? 'gap-1.5 px-2 py-1.5' : 'gap-2 px-3 py-2'}`}>
          <span className={compact ? 'text-sm' : 'text-lg'}>🔴</span>
          <span className="text-red-800">Critical (≥5mm)</span>
        </div>
        <div className={`flex items-center rounded-lg border border-gray-200 bg-gray-50 ${compact ? 'gap-1.5 px-2 py-1.5' : 'gap-2 px-3 py-2'}`}>
          <span className={compact ? 'text-sm' : 'text-lg'}>⚠️</span>
          <span className="text-gray-800">Missing/Implant</span>
        </div>
      </div>

      {/* Maxillary Arch */}
      <div className={compact ? 'space-y-2' : 'space-y-3'}>
        <div className="flex items-center gap-2">
          <h3 className={`font-bold uppercase tracking-widest text-slate-700 ${compact ? 'text-[11px]' : 'text-sm'}`}>Maxillary (Upper)</h3>
          <div className="h-px flex-1 bg-slate-200"></div>
        </div>
        <div className={`grid grid-cols-4 ${compact ? 'gap-1 sm:grid-cols-8' : 'gap-2 sm:grid-cols-8'}`}>
          {MAXILLARY_ROW.map((toothNumber) => (
            <div key={toothNumber} className="flex min-w-0 flex-col items-center">
              <EnhancedToothCard
                tooth={teeth[toothNumber]}
                isActive={activeTooth === toothNumber}
                arch="maxillary"
                compact={compact}
              />
              <span className={`mt-1 font-semibold text-slate-500 ${compact ? 'text-[8px]' : 'text-[9px]'}`}>#{toothNumber}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Midline Divider */}
      <div className="flex items-center gap-2">
        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-slate-300 to-transparent"></div>
        <span className="px-2 text-[10px] font-semibold uppercase text-slate-400">Midline</span>
        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-slate-300 to-transparent"></div>
      </div>

      {/* Mandibular Arch */}
      <div className={compact ? 'space-y-2' : 'space-y-3'}>
        <div className="flex items-center gap-2">
          <h3 className={`font-bold uppercase tracking-widest text-slate-700 ${compact ? 'text-[11px]' : 'text-sm'}`}>Mandibular (Lower)</h3>
          <div className="h-px flex-1 bg-slate-200"></div>
        </div>
        <div className={`grid grid-cols-4 ${compact ? 'gap-1 sm:grid-cols-8' : 'gap-2 sm:grid-cols-8'}`}>
          {MANDIBULAR_ROW.map((toothNumber) => (
            <div key={toothNumber} className="flex min-w-0 flex-col items-center">
              <EnhancedToothCard
                tooth={teeth[toothNumber]}
                isActive={activeTooth === toothNumber}
                arch="mandibular"
                compact={compact}
              />
              <span className={`mt-1 font-semibold text-slate-500 ${compact ? 'text-[8px]' : 'text-[9px]'}`}>#{toothNumber}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Stats */}
      <div className={`grid gap-2 rounded-[24px] border border-slate-200/80 bg-slate-50/50 ${compact ? 'p-3 text-[11px] sm:grid-cols-2 xl:grid-cols-4' : 'p-4 text-[12px] sm:grid-cols-4'} text-slate-600`}>
        <div className="rounded-2xl border border-slate-200 bg-white p-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-400">Total Teeth</p>
          <p className={`mt-2 font-bold text-slate-800 ${compact ? 'text-base' : 'text-lg'}`}>
            {Object.values(teeth).filter(t => !t.missing).length} / 32
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-400">Bleeding Sites</p>
          <p className={`mt-2 font-bold text-red-700 ${compact ? 'text-base' : 'text-lg'}`}>
            {Object.values(teeth).filter(t => t.buccal.bleeding || t.lingual.bleeding).length}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-400">Missing/Implants</p>
          <p className={`mt-2 font-bold text-slate-800 ${compact ? 'text-base' : 'text-lg'}`}>
            {Object.values(teeth).filter(t => t.missing || t.implant).length}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-400">Pockets ≥5mm</p>
          <p className={`mt-2 font-bold text-orange-700 ${compact ? 'text-base' : 'text-lg'}`}>
            {Object.values(teeth).filter(t => 
              Math.max(...t.buccal.depth, ...t.lingual.depth) >= 5
            ).length}
          </p>
        </div>
      </div>
    </div>
  );
}
