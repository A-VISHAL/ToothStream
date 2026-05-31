import React from 'react';
import { EnhancedToothCard } from './EnhancedToothCard';
import type { ToothState } from '../types';

interface SimpleToothMapProps {
  teeth: Record<number, ToothState>;
  activeTooth: number | null;
}

const MAXILLARY_ROW = Array.from({ length: 16 }, (_, index) => index + 1);
const MANDIBULAR_ROW = Array.from({ length: 16 }, (_, index) => 32 - index);

function summarizeArch(teeth: Record<number, ToothState>, toothNumbers: number[]) {
  return toothNumbers.reduce(
    (summary, toothNumber) => {
      const tooth = teeth[toothNumber];

      if (!tooth) {
        return summary;
      }

      const maxDepth = Math.max(Math.max(...tooth.buccal.depth), Math.max(...tooth.lingual.depth));

      summary.total += 1;

      if (tooth.missing) {
        summary.missing += 1;
      }

      if (tooth.implant) {
        summary.implant += 1;
      }

      if (tooth.buccal.bleeding || tooth.lingual.bleeding) {
        summary.bleeding += 1;
      }

      if (maxDepth >= 4) {
        summary.deep += 1;
      }

      if (maxDepth > 0) {
        summary.charted += 1;
      }

      return summary;
    },
    { total: 0, bleeding: 0, deep: 0, charted: 0, missing: 0, implant: 0 },
  );
}

function ArchSummaryBar({ label, summary }: { label: string; summary: ReturnType<typeof summarizeArch> }) {
  return (
    <div className="grid gap-2 rounded-[16px] border border-slate-200 bg-slate-50/90 p-2 text-[11px] text-slate-600 sm:grid-cols-3">
      <div className="rounded-[12px] border border-slate-200 bg-white px-3 py-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-400">{label}</p>
        <p className="mt-1 text-sm font-semibold text-slate-900">{summary.total} teeth shown</p>
      </div>
      <div className="rounded-[12px] border border-slate-200 bg-white px-3 py-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-400">Findings</p>
        <p className="mt-1 text-sm font-semibold text-slate-900">
          {summary.charted} charted, {summary.deep} deep
        </p>
      </div>
      <div className="rounded-[12px] border border-slate-200 bg-white px-3 py-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-400">Alerts</p>
        <p className="mt-1 text-sm font-semibold text-slate-900">
          {summary.bleeding} bleeding, {summary.missing + summary.implant} missing/implant
        </p>
      </div>
    </div>
  );
}

export function SimpleToothMap({ teeth, activeTooth }: SimpleToothMapProps) {
  const maxillarySummary = summarizeArch(teeth, MAXILLARY_ROW);
  const mandibularSummary = summarizeArch(teeth, MANDIBULAR_ROW);

  return (
    <div className="space-y-3 rounded-[24px] border border-slate-200/80 bg-white/90 px-3 py-3 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
      <div className="flex flex-col gap-2 border-b border-slate-200 pb-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.34em] text-slate-500">Tooth map</p>
          <h2 className="mt-1 text-[1.2rem] font-semibold tracking-tight text-slate-950 sm:text-[1.35rem]">Full mouth periodontal findings</h2>
          <p className="mt-1 max-w-2xl text-sm leading-5 text-slate-500">
            Dense arch layout with compact tooth cells, thin separators, and immediate visual feedback for active sites.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-500">
          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5">Compact view</span>
          <span className="rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1.5 text-cyan-800">Clinical palette</span>
        </div>
      </div>

      <div className="grid gap-3">
        <section className="rounded-[20px] border border-slate-200 bg-white px-3 py-3">
          <div className="flex items-center justify-between gap-3 border-b border-slate-200 pb-2 text-[10px] font-semibold uppercase tracking-[0.28em] text-slate-400">
            <span>Maxillary arch</span>
            <span>Patient right</span>
          </div>

          <div className="mt-3 grid grid-cols-8 gap-1.5 md:grid-cols-16">
            {MAXILLARY_ROW.map((toothNumber) => (
              <div key={toothNumber} className="min-w-0">
                <EnhancedToothCard tooth={teeth[toothNumber]} isActive={activeTooth === toothNumber} arch="maxillary" />
              </div>
            ))}
          </div>

          <div className="mt-3 flex items-center justify-between gap-3 text-[10px] font-semibold uppercase tracking-[0.26em] text-slate-400">
            <span>Lingual / palatal side above the tooth body</span>
            <span>Buccal side below the tooth body</span>
          </div>

          <div className="mt-3">
            <ArchSummaryBar label="Upper arch findings" summary={maxillarySummary} />
          </div>
        </section>

        <div className="flex items-center gap-2 py-1">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-300 to-transparent" />
          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-slate-400">
            Midline
          </span>
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-300 to-transparent" />
        </div>

        <section className="rounded-[20px] border border-slate-200 bg-white px-3 py-3">
          <div className="flex items-center justify-between gap-3 border-b border-slate-200 pb-2 text-[10px] font-semibold uppercase tracking-[0.28em] text-slate-400">
            <span>Mandibular arch</span>
            <span>Patient left</span>
          </div>

          <div className="mt-3 grid grid-cols-8 gap-1.5 md:grid-cols-16">
            {MANDIBULAR_ROW.map((toothNumber) => (
              <div key={toothNumber} className="min-w-0">
                <EnhancedToothCard tooth={teeth[toothNumber]} isActive={activeTooth === toothNumber} arch="mandibular" />
              </div>
            ))}
          </div>

          <div className="mt-3 flex items-center justify-between gap-3 text-[10px] font-semibold uppercase tracking-[0.26em] text-slate-400">
            <span>Lingual side above the tooth body</span>
            <span>Buccal side below the tooth body</span>
          </div>

          <div className="mt-3">
            <ArchSummaryBar label="Lower arch findings" summary={mandibularSummary} />
          </div>
        </section>
      </div>
    </div>
  );
}import React from 'react';
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
    <div className={`${compact ? 'space-y-2 px-3 py-3' : 'space-y-3 px-3 py-3 sm:px-4 sm:py-4'} rounded-[24px] border border-slate-200/80 bg-white/90 shadow-[0_10px_28px_rgba(15,23,42,0.045)]`}>
      <div className="flex flex-col gap-2 border-b border-slate-200 pb-2">
        <p className={`${compact ? 'text-[10px]' : 'text-[11px]'} font-semibold uppercase tracking-[0.34em] text-slate-500`}>Tooth map</p>
        <div className="flex items-end justify-between gap-3">
          <h2 className={`font-semibold tracking-tight text-slate-950 ${compact ? 'text-[1.05rem] sm:text-[1.15rem]' : 'text-[1.35rem] sm:text-[1.45rem]'}`}>Full mouth periodontal findings</h2>
          <div className="hidden items-center gap-2 text-[9px] font-semibold uppercase tracking-[0.24em] text-slate-400 sm:flex">
            <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1">Clinical board</span>
            <span className="rounded-full border border-cyan-200 bg-cyan-50 px-2.5 py-1 text-cyan-800">Dense view</span>
          </div>
        </div>
      </div>

      <div className={`grid gap-2 ${compact ? 'text-[9px] md:grid-cols-5' : 'text-[10px] md:grid-cols-5'} font-semibold`}>
        <div className="flex items-center gap-2 rounded-[14px] border border-emerald-200 bg-emerald-50 px-2.5 py-2 text-emerald-800">
          <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-emerald-400 text-[9px] text-white">✓</span>
          <span>Healthy / Open</span>
        </div>
        <div className="flex items-center gap-2 rounded-[14px] border border-amber-200 bg-amber-50 px-2.5 py-2 text-amber-800">
          <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-amber-400 text-[9px] text-white">1</span>
          <span>Charted (1-3mm)</span>
        </div>
        <div className="flex items-center gap-2 rounded-[14px] border border-orange-200 bg-orange-50 px-2.5 py-2 text-orange-800">
          <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-orange-400 text-[9px] text-white">4</span>
          <span>Moderate (≥4mm)</span>
        </div>
        <div className="flex items-center gap-2 rounded-[14px] border border-rose-200 bg-rose-50 px-2.5 py-2 text-rose-800">
          <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] text-white">5</span>
          <span>Critical (≥5mm)</span>
        </div>
        <div className="flex items-center gap-2 rounded-[14px] border border-slate-200 bg-slate-50 px-2.5 py-2 text-slate-700">
          <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-slate-400 text-[9px] text-white">!</span>
          <span>Missing / Implant</span>
        </div>
      </div>

      {/* Maxillary Arch */}
      <div className={compact ? 'space-y-1.5' : 'space-y-2'}>
        <div className="flex items-center gap-2">
          <h3 className={`font-semibold uppercase tracking-[0.24em] text-slate-700 ${compact ? 'text-[10px]' : 'text-[11px]'}`}>Maxillary (Upper)</h3>
          <div className="h-px flex-1 bg-slate-200/90"></div>
        </div>
        <div className={`grid grid-cols-4 ${compact ? 'gap-1 sm:grid-cols-8' : 'gap-1.5 sm:grid-cols-8'}`}>
          {MAXILLARY_ROW.map((toothNumber) => (
            <div key={toothNumber} className="flex min-w-0 flex-col items-center">
              <EnhancedToothCard
                tooth={teeth[toothNumber]}
                isActive={activeTooth === toothNumber}
                arch="maxillary"
                compact={compact}
              />
              <span className={`mt-1 font-semibold text-slate-500 ${compact ? 'text-[7px]' : 'text-[8px]'}`}>#{toothNumber}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Midline Divider */}
      <div className="flex items-center gap-2 py-0.5">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-300 to-transparent"></div>
        <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.24em] text-slate-400">Midline</span>
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-300 to-transparent"></div>
      </div>

      {/* Mandibular Arch */}
      <div className={compact ? 'space-y-1.5' : 'space-y-2'}>
        <div className="flex items-center gap-2">
          <h3 className={`font-semibold uppercase tracking-[0.24em] text-slate-700 ${compact ? 'text-[10px]' : 'text-[11px]'}`}>Mandibular (Lower)</h3>
          <div className="h-px flex-1 bg-slate-200/90"></div>
        </div>
        <div className={`grid grid-cols-4 ${compact ? 'gap-1 sm:grid-cols-8' : 'gap-1.5 sm:grid-cols-8'}`}>
          {MANDIBULAR_ROW.map((toothNumber) => (
            <div key={toothNumber} className="flex min-w-0 flex-col items-center">
              <EnhancedToothCard
                tooth={teeth[toothNumber]}
                isActive={activeTooth === toothNumber}
                arch="mandibular"
                compact={compact}
              />
              <span className={`mt-1 font-semibold text-slate-500 ${compact ? 'text-[7px]' : 'text-[8px]'}`}>#{toothNumber}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Stats */}
      <div className={`grid gap-2 rounded-[18px] border border-slate-200/80 bg-slate-50/70 ${compact ? 'p-2.5 text-[10px] sm:grid-cols-2 xl:grid-cols-4' : 'p-3 text-[11px] sm:grid-cols-4'} text-slate-600`}>
        <div className="rounded-[14px] border border-slate-200 bg-white px-3 py-2.5">
          <p className="text-[9px] font-semibold uppercase tracking-[0.24em] text-slate-400">Total Teeth</p>
          <p className={`mt-1.5 font-bold text-slate-800 ${compact ? 'text-sm' : 'text-base'}`}>
            {Object.values(teeth).filter(t => !t.missing).length} / 32
          </p>
        </div>
        <div className="rounded-[14px] border border-slate-200 bg-white px-3 py-2.5">
          <p className="text-[9px] font-semibold uppercase tracking-[0.24em] text-slate-400">Bleeding Sites</p>
          <p className={`mt-1.5 font-bold text-rose-700 ${compact ? 'text-sm' : 'text-base'}`}>
            {Object.values(teeth).filter(t => t.buccal.bleeding || t.lingual.bleeding).length}
          </p>
        </div>
        <div className="rounded-[14px] border border-slate-200 bg-white px-3 py-2.5">
          <p className="text-[9px] font-semibold uppercase tracking-[0.24em] text-slate-400">Missing/Implants</p>
          <p className={`mt-1.5 font-bold text-slate-800 ${compact ? 'text-sm' : 'text-base'}`}>
            {Object.values(teeth).filter(t => t.missing || t.implant).length}
          </p>
        </div>
        <div className="rounded-[14px] border border-slate-200 bg-white px-3 py-2.5">
          <p className="text-[9px] font-semibold uppercase tracking-[0.24em] text-slate-400">Pockets ≥5mm</p>
          <p className={`mt-1.5 font-bold text-orange-700 ${compact ? 'text-sm' : 'text-base'}`}>
            {Object.values(teeth).filter(t => 
              Math.max(...t.buccal.depth, ...t.lingual.depth) >= 5
            ).length}
          </p>
        </div>
      </div>
    </div>
  );
}
