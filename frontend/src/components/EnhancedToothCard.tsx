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

type BadgeTone = 'neutral' | 'danger' | 'warning' | 'success' | 'info';

interface ToothBadge {
  label: string;
  tone: BadgeTone;
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

function formatClassValue(value: number | boolean | undefined): string | null {
  if (typeof value === 'number') {
    return `C${value}`;
  }

  if (value === true) {
    return '';
  }

  return null;
}

function getFindingBadges(tooth: ToothState): ToothBadge[] {
  const badges: ToothBadge[] = [];
  const maxDepth = Math.max(Math.max(...tooth.buccal.depth), Math.max(...tooth.lingual.depth));
  const recessionValue = tooth.buccal.recession ?? tooth.lingual.recession;
  const furcationValue = tooth.furcationSurface === 'lingual' ? tooth.lingual.furcationClass : tooth.furcationSurface === 'buccal' ? tooth.buccal.furcationClass : tooth.buccal.furcationClass ?? tooth.lingual.furcationClass;

  if (tooth.missing) {
    badges.push({ label: 'Missing', tone: 'neutral' });
  }

  if (tooth.implant) {
    badges.push({ label: 'Implant', tone: 'neutral' });
  }

  if (tooth.buccal.bleeding || tooth.lingual.bleeding) {
    badges.push({ label: 'Bleeding', tone: 'danger' });
  }

  const mobilityLabel = formatClassValue(tooth.mobilityClass);
  if (typeof tooth.mobilityClass !== 'undefined') {
    badges.push({ label: mobilityLabel ? `Mobility ${mobilityLabel}` : 'Mobility', tone: 'warning' });
  }

  if (typeof furcationValue !== 'undefined') {
    const furcationLabel = formatClassValue(furcationValue);
    badges.push({ label: furcationLabel ? `Furcation ${furcationLabel}` : 'Furcation', tone: 'warning' });
  }

  if (typeof recessionValue !== 'undefined' && recessionValue !== false) {
    badges.push({ label: `Recession ${typeof recessionValue === 'number' ? recessionValue : ''}`.trim(), tone: 'warning' });
  }

  const chartStatus = tooth.chartStatus ?? (tooth.missing || tooth.implant || tooth.buccal.bleeding || tooth.lingual.bleeding || typeof tooth.mobilityClass !== 'undefined' || typeof furcationValue !== 'undefined' || typeof recessionValue !== 'undefined' || maxDepth > 0 ? 'charted' : 'open');

  if (chartStatus === 'charted' && maxDepth > 0) {
    badges.push({ label: maxDepth >= 5 ? `Charted ${maxDepth}mm` : maxDepth >= 4 ? `Charted ${maxDepth}mm` : `Charted ${maxDepth}mm`, tone: maxDepth >= 5 ? 'danger' : maxDepth >= 4 ? 'warning' : 'success' });
  } else if (chartStatus === 'charted') {
    badges.push({ label: 'Charted', tone: 'success' });
  } else {
    badges.push({ label: 'Open', tone: 'success' });
  }

  return badges;
}

function badgeToneClasses(tone: BadgeTone): string {
  switch (tone) {
    case 'neutral':
      return 'border-slate-300 bg-slate-100 text-slate-700';
    case 'danger':
      return 'border-rose-200 bg-rose-100 text-rose-700';
    case 'warning':
      return 'border-amber-200 bg-amber-100 text-amber-700';
    case 'success':
      return 'border-emerald-200 bg-emerald-100 text-emerald-700';
    case 'info':
      return 'border-cyan-200 bg-cyan-100 text-cyan-800';
    default:
      return 'border-slate-300 bg-slate-100 text-slate-700';
  }
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
  const badges = useMemo(() => getFindingBadges(tooth), [tooth]);

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

        <div className="pointer-events-none absolute inset-x-0 bottom-1 flex justify-center px-1">
          <div className={`flex max-w-full flex-wrap justify-center gap-1 ${compact ? 'scale-[0.92]' : ''}`}>
            {badges.slice(0, compact ? 2 : 4).map((badge) => (
              <span
                key={badge.label}
                className={`whitespace-nowrap rounded-full border px-2 py-0.5 text-[9px] font-semibold leading-none shadow-sm ${badgeToneClasses(badge.tone)}`}
              >
                {badge.label}
              </span>
            ))}
          </div>
        </div>
      </div>

      {!compact && !tooth.missing && Math.max(Math.max(...tooth.buccal.depth), Math.max(...tooth.lingual.depth)) > 0 ? (
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
