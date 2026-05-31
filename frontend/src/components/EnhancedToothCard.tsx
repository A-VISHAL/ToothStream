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
      className={`flex w-full min-w-0 flex-col items-center overflow-hidden rounded-lg border-2 transition-all ${compact ? 'gap-1.5 p-2' : 'gap-2 p-3'} ${severity.bg} ${severity.border} ${isActive ? 'ring-2 ring-cyan-400 shadow-md' : ''}`}
    >
      {/* Tooth Number & Severity Indicator */}
      <div className="flex items-center justify-between w-full">
        <span className={`font-bold text-slate-700 ${compact ? 'text-[11px]' : 'text-sm'}`}>{tooth.toothNumber}</span>
        <span className={compact ? 'text-sm' : 'text-base'}>{severity.icon}</span>
      </div>

      {/* Real Tooth SVG */}
      <div className={`flex justify-center ${compact ? 'h-20' : 'h-24'}`}>
        <ToothSVGRenderer toothNumber={tooth.toothNumber} arch={arch} compact={compact} />
      </div>

      {/* Findings Tags */}
      {compact ? (
        <div
          className={`rounded-full px-2.5 py-1 text-[9px] font-semibold whitespace-nowrap ${
            compactFindingLabel === 'Missing'
              ? 'bg-gray-200 text-gray-800'
              : compactFindingLabel === 'Implant'
                ? 'bg-gray-200 text-gray-800'
                : compactFindingLabel === 'Bleeding'
                  ? 'bg-red-200 text-red-800'
                  : compactFindingLabel === 'Pocket ≥5mm'
                    ? 'bg-red-200 text-red-800'
                    : compactFindingLabel === 'Pocket ≥4mm'
                      ? 'bg-orange-200 text-orange-800'
                      : compactFindingLabel.startsWith('Charted')
                        ? 'bg-yellow-200 text-yellow-800'
                        : 'bg-green-200 text-green-800'
          }`}
        >
          {compactFindingLabel}
        </div>
      ) : (
        <div className="flex flex-wrap justify-center gap-1">
          {findings.map((finding) => (
            <span
              key={finding}
              className={`whitespace-nowrap rounded-full px-2 py-1 text-[10px] font-semibold ${
                finding.includes('Missing') ? 'bg-gray-200 text-gray-800' :
                finding.includes('Implant') ? 'bg-blue-200 text-blue-800' :
                finding.includes('Bleeding') ? 'bg-red-200 text-red-800' :
                finding.includes('Pocket ≥5mm') ? 'bg-red-200 text-red-800' :
                finding.includes('Pocket ≥4mm') ? 'bg-orange-200 text-orange-800' :
                finding.includes('Charted') ? 'bg-yellow-200 text-yellow-800' :
                'bg-green-200 text-green-800'
              }`}
            >
              {finding}
            </span>
          ))}
        </div>
      )}

      {/* Depth Data */}
      {!tooth.missing && maxDepth > 0 && (
        <div className={`w-full text-center text-slate-600 ${compact ? 'text-[9px]' : 'text-[11px]'}`}>
          {!compact ? <div className="font-semibold">Depths (mm)</div> : null}
          <div className={`mt-1 grid grid-cols-2 gap-1 ${compact ? 'text-[9px]' : 'text-[10px]'}`}>
            <div>
              <span className="font-semibold">B:</span> {tooth.buccal.depth.join('-')}
            </div>
            <div>
              <span className="font-semibold">L:</span> {tooth.lingual.depth.join('-')}
            </div>
          </div>
        </div>
      )}

      {/* Bleeding Indicator */}
      {(tooth.buccal.bleeding || tooth.lingual.bleeding) && (
        <div className={`w-full rounded text-center font-semibold text-red-700 bg-red-100 ${compact ? 'px-1.5 py-0.5 text-[9px]' : 'px-2 py-1 text-[10px]'}`}>
          Bleeding Detected
        </div>
      )}
    </div>
  );
}
