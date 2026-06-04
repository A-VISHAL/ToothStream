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
  variant:
    | 'incisor-central'
    | 'incisor-lateral'
    | 'canine-maxillary'
    | 'canine-mandibular'
    | 'premolar-first'
    | 'premolar-second'
    | 'molar-first'
    | 'molar-second'
    | 'molar-third';
  mirror: boolean;
}

// ─── Badge types ──────────────────────────────────────────────────────────────

type BadgeTone =
  | 'missing'    // gray
  | 'implant'    // teal
  | 'bleeding'   // red
  | 'recession'  // blue
  | 'mobility'   // amber
  | 'furcation'  // orange
  | 'open'       // purple
  | 'charted'    // green
  | 'neutral';

interface ToothBadge {
  key: string;
  label: string;
  tone: BadgeTone;
}

// ─── Tooth variant lookup ─────────────────────────────────────────────────────

function getToothVariant(toothNumber: number): ToothVariant {
  const position = toothNumber % 10;
  const isMaxillary = toothNumber < 30;

  if (position === 1) return { type: 'incisor', variant: 'incisor-central', mirror: false };
  if (position === 2) return { type: 'incisor', variant: 'incisor-lateral', mirror: false };
  if (position === 3)
    return {
      type: 'canine',
      variant: isMaxillary ? 'canine-maxillary' : 'canine-mandibular',
      mirror: false,
    };
  if (position === 4 || position === 5)
    return {
      type: 'premolar',
      variant: position === 4 ? 'premolar-first' : 'premolar-second',
      mirror: false,
    };
  if (position === 6 || position === 7 || position === 8)
    return {
      type: 'molar',
      variant: position === 6 ? 'molar-first' : position === 7 ? 'molar-second' : 'molar-third',
      mirror: false,
    };

  return { type: 'molar', variant: 'molar-first', mirror: false };
}

// ─── Severity color ───────────────────────────────────────────────────────────

function getSeverityColor(tooth: ToothState): {
  bg: string;
  border: string;
  level: 'safe' | 'warning' | 'danger' | 'neutral';
} {
  const maxDepth = Math.max(Math.max(...tooth.buccal.depth), Math.max(...tooth.lingual.depth));
  const hasBleeding = tooth.buccal.bleeding || tooth.lingual.bleeding;

  if (tooth.missing) return { bg: 'bg-gray-100', border: 'border-gray-300', level: 'neutral' };
  if (tooth.implant) return { bg: 'bg-teal-50', border: 'border-teal-200', level: 'safe' };
  if (hasBleeding || maxDepth >= 5)
    return { bg: 'bg-red-50', border: 'border-red-300', level: 'danger' };
  if (maxDepth >= 4)
    return { bg: 'bg-orange-50', border: 'border-orange-300', level: 'warning' };
  if (maxDepth > 0)
    return { bg: 'bg-yellow-50', border: 'border-yellow-300', level: 'warning' };

  return { bg: 'bg-green-50', border: 'border-green-300', level: 'safe' };
}

// ─── Badge builder ────────────────────────────────────────────────────────────

function getFindingBadges(tooth: ToothState): ToothBadge[] {
  const badges: ToothBadge[] = [];

  // MISSING
  if (tooth.missing) {
    badges.push({ key: 'missing', label: 'MISSING', tone: 'missing' });
    return badges; // missing teeth have no other findings to show
  }

  // IMPLANT
  if (tooth.implant) {
    badges.push({ key: 'implant', label: 'IMPLANT', tone: 'implant' });
  }

  // BLEEDING (buccal or lingual)
  if (tooth.buccal.bleeding || tooth.lingual.bleeding) {
    badges.push({ key: 'bleeding', label: 'BLEED', tone: 'bleeding' });
  }

  // RECESSION — read from buccal first, then lingual
  // recession is number | boolean | undefined; only show when it's a number > 0 or true
  const buccalRecession = tooth.buccal.recession;
  const lingualRecession = tooth.lingual.recession;
  const recession = typeof buccalRecession === 'number' && buccalRecession > 0
    ? buccalRecession
    : typeof lingualRecession === 'number' && lingualRecession > 0
      ? lingualRecession
      : buccalRecession === true
        ? true
        : lingualRecession === true
          ? true
          : undefined;

  if (recession !== undefined) {
    const recLabel = typeof recession === 'number' ? `REC ${recession}` : 'REC';
    badges.push({ key: 'recession', label: recLabel, tone: 'recession' });
  }

  // MOBILITY — on ToothState directly
  if (tooth.mobilityClass !== undefined && tooth.mobilityClass !== false) {
    const mobLabel =
      typeof tooth.mobilityClass === 'number'
        ? `M${tooth.mobilityClass}`
        : 'MOB';
    badges.push({ key: 'mobility', label: mobLabel, tone: 'mobility' });
  }

  // FURCATION — on ToothSurfaceState (buccal or lingual)
  const buccalFurcation = tooth.buccal.furcationClass;
  const lingualFurcation = tooth.lingual.furcationClass;
  const furcation =
    typeof buccalFurcation !== 'undefined' && buccalFurcation !== false
      ? buccalFurcation
      : typeof lingualFurcation !== 'undefined' && lingualFurcation !== false
        ? lingualFurcation
        : undefined;

  if (furcation !== undefined) {
    const furcLabel = typeof furcation === 'number' ? `F${furcation}` : 'FUR';
    badges.push({ key: 'furcation', label: furcLabel, tone: 'furcation' });
  }

  // CHART STATUS — explicit status or derived
  const maxDepth = Math.max(Math.max(...tooth.buccal.depth), Math.max(...tooth.lingual.depth));
  const hasAnyFinding =
    tooth.implant ||
    tooth.buccal.bleeding ||
    tooth.lingual.bleeding ||
    recession !== undefined ||
    tooth.mobilityClass !== undefined ||
    furcation !== undefined ||
    maxDepth > 0;

  const effectiveStatus: 'open' | 'charted' =
    tooth.chartStatus ?? (hasAnyFinding ? 'charted' : 'open');

  if (effectiveStatus === 'charted') {
    badges.push({ key: 'charted', label: 'CHARTED', tone: 'charted' });
  } else {
    badges.push({ key: 'open', label: 'OPEN', tone: 'open' });
  }

  return badges;
}

// ─── Badge tone → Tailwind classes ────────────────────────────────────────────

function badgeToneClasses(tone: BadgeTone): string {
  switch (tone) {
    case 'missing':
      return 'border-slate-300 bg-slate-200 text-slate-700';
    case 'implant':
      return 'border-teal-300 bg-teal-100 text-teal-800';
    case 'bleeding':
      return 'border-red-300 bg-red-100 text-red-700';
    case 'recession':
      return 'border-blue-300 bg-blue-100 text-blue-700';
    case 'mobility':
      return 'border-amber-300 bg-amber-100 text-amber-700';
    case 'furcation':
      return 'border-orange-300 bg-orange-100 text-orange-700';
    case 'open':
      return 'border-purple-200 bg-purple-50 text-purple-700';
    case 'charted':
      return 'border-emerald-200 bg-emerald-100 text-emerald-700';
    case 'neutral':
    default:
      return 'border-slate-300 bg-slate-100 text-slate-700';
  }
}

// ─── SVG tooth renderer ───────────────────────────────────────────────────────

function ToothSVGRenderer({
  toothNumber,
  arch,
  compact,
}: {
  toothNumber: number;
  arch: 'maxillary' | 'mandibular';
  compact: boolean;
}) {
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
    ? { width: 62, height: 72, viewBox: '0 0 100 120' }
    : { width: 80, height: 96, viewBox: '0 0 100 130' };

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

// ─── Main component ───────────────────────────────────────────────────────────

export function EnhancedToothCard({
  tooth,
  isActive,
  arch,
  compact = false,
}: EnhancedToothCardProps) {
  const severity = useMemo(() => getSeverityColor(tooth), [tooth]);
  const badges = useMemo(() => getFindingBadges(tooth), [tooth]);

  const maxDepth = Math.max(
    Math.max(...tooth.buccal.depth),
    Math.max(...tooth.lingual.depth),
  );

  return (
    <div
      className={[
        'group relative flex w-full min-w-0 flex-col items-center rounded-[14px] border transition-all',
        compact ? 'gap-0.5 px-1 pb-1.5 pt-1.5' : 'gap-1 px-1.5 pb-2 pt-2',
        severity.bg,
        severity.border,
        isActive
          ? 'active-tooth shadow-[0_10px_24px_rgba(14,165,233,0.18)]'
          : 'shadow-[0_4px_12px_rgba(15,23,42,0.05)]',
      ].join(' ')}
    >
      {/* Tooth number */}
      <span
        className={[
          'self-start rounded-full border border-white/80 bg-white/90 px-1.5 py-0.5 font-semibold leading-none text-slate-700 shadow-sm',
          compact ? 'text-[9px]' : 'text-[10px]',
          isActive ? 'text-cyan-800' : '',
        ].join(' ')}
      >
        {tooth.toothNumber}
      </span>

      {/* SVG tooth illustration */}
      <div className="flex w-full justify-center">
        <ToothSVGRenderer
          toothNumber={tooth.toothNumber}
          arch={arch}
          compact={compact}
        />
      </div>

      {/* ── Finding badges — rendered BELOW the tooth SVG, never overlapping ── */}
      {badges.length > 0 && (
        <div className="flex w-full flex-wrap justify-center gap-[3px] px-0.5">
          {badges.map((badge) => (
            <span
              key={badge.key}
              className={[
                'whitespace-nowrap rounded-full border px-1.5 py-0.5 font-bold leading-none shadow-sm',
                compact ? 'text-[8px]' : 'text-[9px]',
                badgeToneClasses(badge.tone),
              ].join(' ')}
            >
              {badge.label}
            </span>
          ))}
        </div>
      )}

      {/* Depth row — only shown in non-compact when depth exists */}
      {!compact && !tooth.missing && maxDepth > 0 && (
        <div className="w-full px-1 text-center text-[9px] text-slate-500">
          <span className="font-semibold text-slate-600">B</span>{' '}
          {tooth.buccal.depth.join('-')} ·{' '}
          <span className="font-semibold text-slate-600">L</span>{' '}
          {tooth.lingual.depth.join('-')}
        </div>
      )}
    </div>
  );
}
