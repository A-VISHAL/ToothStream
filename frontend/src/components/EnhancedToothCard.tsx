import React, { useMemo } from 'react';
import type { ToothState } from '../types';
import { RealIncisorSVG } from './RealIncisorSVG';
import { RealCanineSVG } from './RealCanineSVG';
import { RealPremolarSVG } from './RealPremolarSVG';
import { RealMolarSVG } from './RealMolarSVG';

interface EnhancedToothCardProps {
  tooth: ToothState;
  isActive: boolean;
  arch: 'maxillary' | 'mandibular';
  compact?: boolean;
}

type ToothType = 'incisor' | 'canine' | 'premolar' | 'molar';

interface ToothVariant {
  type: ToothType;
  variant: 'incisor-central' | 'incisor-lateral' | 'canine-maxillary' | 'canine-mandibular' | 'premolar-first' | 'premolar-second' | 'molar-first' | 'molar-second' | 'molar-third';
  mirror: boolean;
}

function getToothVariant(toothNumber: number): ToothVariant {
  const position = toothNumber % 10;
  const isMaxillary = toothNumber < 30;
  
  if (position === 1) return { type: 'incisor', variant: 'incisor-central', mirror: false };
  if (position === 2) return { type: 'incisor', variant: 'incisor-lateral', mirror: false };
  if (position === 3) return { type: 'canine', variant: isMaxillary ? 'canine-maxillary' : 'canine-mandibular', mirror: false };
  if (position === 4 || position === 5) return { type: 'premolar', variant: position === 4 ? 'premolar-first' : 'premolar-second', mirror: false };
  if (position === 6 || position === 7 || position === 8) return { type: 'molar', variant: position === 6 ? 'molar-first' : position === 7 ? 'molar-second' : 'molar-third', mirror: false };
  
  return { type: 'molar', variant: 'molar-first', mirror: false };
}

function getSeverityColor(tooth: ToothState): { bg: string; border: string; icon: string; level: 'safe' | 'warning' | 'danger' | 'neutral' } {
  const maxDepth = Math.max(
    Math.max(...tooth.buccal.depth),
    Math.max(...tooth.lingual.depth)
  );
  const hasbleeding = tooth.buccal.bleeding || tooth.lingual.bleeding;

  if (tooth.missing) return { bg: 'bg-gray-100', border: 'border-gray-300', icon: '⚠️', level: 'neutral' };
  if (tooth.implant) return { bg: 'bg-gray-100', border: 'border-gray-300', icon: '🦷', level: 'neutral' };
  
  if (hasbleeding || maxDepth >= 5) {
    return { bg: 'bg-red-50', border: 'border-red-300', icon: '🔴', level: 'danger' };
  }
  if (maxDepth >= 4) {
    return { bg: 'bg-orange-50', border: 'border-orange-300', icon: '🟠', level: 'warning' };
  }
  if (maxDepth >= 3 || maxDepth > 0) {
    return { bg: 'bg-yellow-50', border: 'border-yellow-300', icon: '🟡', level: 'warning' };
  }
  
  return { bg: 'bg-green-50', border: 'border-green-300', icon: '✓', level: 'safe' };
}

function getFindings(tooth: ToothState): string[] {
  const findings: string[] = [];
  
  if (tooth.missing) findings.push('Missing');
  if (tooth.implant) findings.push('Implant');
  if (tooth.buccal.bleeding || tooth.lingual.bleeding) findings.push('Bleeding');
  
  const maxDepth = Math.max(Math.max(...tooth.buccal.depth), Math.max(...tooth.lingual.depth));
  if (maxDepth >= 5) findings.push(`Pocket ≥5mm`);
  else if (maxDepth >= 4) findings.push(`Pocket ≥4mm`);
  else if (maxDepth > 0) findings.push(`Charted (${maxDepth}mm)`);
  else findings.push('Open');
  
  return findings;
}

function getCompactFindingLabel(tooth: ToothState): string {
  if (tooth.missing) return 'Missing';
  if (tooth.implant) return 'Implant';
  if (tooth.buccal.bleeding || tooth.lingual.bleeding) return 'Bleeding';

  const maxDepth = Math.max(Math.max(...tooth.buccal.depth), Math.max(...tooth.lingual.depth));
  if (maxDepth >= 5) return 'Pocket ≥5mm';
  if (maxDepth >= 4) return 'Pocket ≥4mm';
  if (maxDepth > 0) return `Charted ${maxDepth}mm`;
  return 'Open';
}

function ToothSVGRenderer({ toothNumber, arch, compact }: { toothNumber: number; arch: 'maxillary' | 'mandibular'; compact: boolean }) {
  const toothInfo = getToothVariant(toothNumber);
  const shadowId = `tooth-${toothNumber}-shadow`;
  
  const commonProps = {
    fill: '#f5e6d3',
    stroke: '#c8a882',
    shadowId,
    missing: false,
    implant: false,
    isActive: false,
    variant: toothInfo.variant as any,
    mirror: toothNumber > 10,
  };

  const svgProps = compact
    ? { width: 62, height: 96, viewBox: '0 0 100 150' }
    : { width: 100, height: 160, viewBox: '0 0 100 150' };

  const shadowDef = (
    <defs>
      <filter id={shadowId} x="-30%" y="-30%" width="160%" height="160%">
        <feDropShadow dx="1" dy="2" stdDeviation="1.5" floodOpacity="0.15" />
      </filter>
    </defs>
  );

  if (toothInfo.type === 'incisor') {
    return (
      <svg {...svgProps}>
        {shadowDef}
        <RealIncisorSVG {...commonProps} />
      </svg>
    );
  }
  if (toothInfo.type === 'canine') {
    return (
      <svg {...svgProps}>
        {shadowDef}
        <RealCanineSVG {...commonProps} />
      </svg>
    );
  }
  if (toothInfo.type === 'premolar') {
    return (
      <svg {...svgProps}>
        {shadowDef}
        <RealPremolarSVG {...commonProps} />
      </svg>
    );
  }
  if (toothInfo.type === 'molar') {
    return (
      <svg {...svgProps}>
        {shadowDef}
        <RealMolarSVG {...commonProps} />
      </svg>
    );
  }

  return null;
}

export function EnhancedToothCard({ tooth, isActive, arch, compact = false }: EnhancedToothCardProps) {
  const severity = useMemo(() => getSeverityColor(tooth), [tooth]);
  const findings = useMemo(() => getFindings(tooth), [tooth]);
  const maxDepth = Math.max(Math.max(...tooth.buccal.depth), Math.max(...tooth.lingual.depth));
  const compactFindingLabel = useMemo(() => getCompactFindingLabel(tooth), [tooth]);

  return (
    <div
      className={`group relative flex w-full min-w-0 flex-col items-center overflow-hidden rounded-[14px] border transition-all ${compact ? 'gap-1 px-1.5 pb-1.5 pt-2' : 'gap-1.5 px-2 pb-2 pt-2.5'} ${severity.bg} ${severity.border} ${isActive ? 'active-tooth shadow-[0_10px_24px_rgba(14,165,233,0.16)]' : 'shadow-[0_6px_18px_rgba(15,23,42,0.04)]'}`}
    >
      <div className="absolute left-1.5 top-1.5 flex items-center gap-1">
        <span className={`rounded-full border border-white/80 bg-white/90 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-slate-700 shadow-sm ${isActive ? 'text-cyan-800' : ''}`}>
          {tooth.toothNumber}
        </span>
      </div>

      <div className="absolute right-1.5 top-1.5 flex items-center gap-1">
        <span className={`inline-flex h-4.5 w-4.5 items-center justify-center rounded-full border border-white/80 text-[10px] leading-none shadow-sm ${severity.level === 'danger' ? 'bg-rose-500 text-white' : severity.level === 'warning' ? 'bg-amber-400 text-white' : severity.level === 'safe' ? 'bg-emerald-400 text-white' : 'bg-slate-300 text-slate-700'}`}>
          {severity.icon}
        </span>
      </div>

      <div className={`relative flex w-full justify-center ${compact ? 'h-[5.6rem]' : 'h-[6.5rem]'}`}>
        <ToothSVGRenderer toothNumber={tooth.toothNumber} arch={arch} compact={compact} />

        <div className="pointer-events-none absolute inset-x-0 bottom-1 flex justify-center">
          {compact ? (
            <span
              className={`rounded-full border px-2 py-0.5 text-[9px] font-semibold leading-none shadow-sm ${
                compactFindingLabel === 'Missing'
                  ? 'border-slate-300 bg-slate-100 text-slate-700'
                  : compactFindingLabel === 'Implant'
                    ? 'border-slate-300 bg-slate-100 text-slate-700'
                    : compactFindingLabel === 'Bleeding'
                      ? 'border-rose-200 bg-rose-100 text-rose-700'
                      : compactFindingLabel === 'Pocket ≥5mm'
                        ? 'border-rose-200 bg-rose-100 text-rose-700'
                        : compactFindingLabel === 'Pocket ≥4mm'
                          ? 'border-amber-200 bg-amber-100 text-amber-700'
                          : compactFindingLabel.startsWith('Charted')
                            ? 'border-amber-200 bg-amber-100 text-amber-700'
                            : 'border-emerald-200 bg-emerald-100 text-emerald-700'
              }`}
            >
              {compactFindingLabel}
            </span>
          ) : (
            <div className="flex flex-wrap justify-center gap-1">
              {findings.slice(0, 2).map((finding) => (
                <span
                  key={finding}
                  className={`whitespace-nowrap rounded-full border px-2 py-0.5 text-[9px] font-semibold leading-none shadow-sm ${
                    finding.includes('Missing')
                      ? 'border-slate-300 bg-slate-100 text-slate-700'
                      : finding.includes('Implant')
                        ? 'border-slate-300 bg-slate-100 text-slate-700'
                        : finding.includes('Bleeding')
                          ? 'border-rose-200 bg-rose-100 text-rose-700'
                          : finding.includes('Pocket ≥5mm')
                            ? 'border-rose-200 bg-rose-100 text-rose-700'
                            : finding.includes('Pocket ≥4mm')
                              ? 'border-amber-200 bg-amber-100 text-amber-700'
                              : finding.includes('Charted')
                                ? 'border-amber-200 bg-amber-100 text-amber-700'
                                : 'border-emerald-200 bg-emerald-100 text-emerald-700'
                  }`}
                >
                  {finding}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {!compact && !tooth.missing && maxDepth > 0 ? (
        <div className="w-full px-1 pb-0.5 text-center text-[9px] text-slate-500">
          <span className="font-semibold text-slate-600">B</span> {tooth.buccal.depth.join('-')} · <span className="font-semibold text-slate-600">L</span> {tooth.lingual.depth.join('-')}
        </div>
      ) : null}

      {(tooth.buccal.bleeding || tooth.lingual.bleeding) && compact ? (
        <span className="absolute bottom-1.5 right-1.5 rounded-full border border-rose-200 bg-rose-100 px-1.5 py-0.5 text-[9px] font-semibold leading-none text-rose-700 shadow-sm">
          Bleed
        </span>
      ) : null}
    </div>
  );
}
