import React, { useMemo } from 'react';
import type { ToothState, ToothSurface } from '../types';
import { RealIncisorSVG } from './RealIncisorSVG';
import { RealCanineSVG } from './RealCanineSVG';
import { RealPremolarSVG } from './RealPremolarSVG';
import { RealMolarSVG } from './RealMolarSVG';

interface EnhancedToothCardProps {
  tooth: ToothState;
  isActive: boolean;
  arch: 'maxillary' | 'mandibular';
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

function getSeverityColor(tooth: ToothState): { bg: string; border: string; icon: string; level: 'safe' | 'warning' | 'danger' } {
  const maxDepth = Math.max(
    Math.max(...tooth.buccal.depth),
    Math.max(...tooth.lingual.depth)
  );
  const hasbleeding = tooth.buccal.bleeding || tooth.lingual.bleeding;

  if (tooth.missing) return { bg: 'bg-gray-100', border: 'border-gray-300', icon: '⚠️', level: 'danger' };
  if (tooth.implant) return { bg: 'bg-blue-50', border: 'border-blue-300', icon: '🦷', level: 'safe' };
  
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

function ToothSVGRenderer({ toothNumber, variant, arch }: { toothNumber: number; variant: string; arch: 'maxillary' | 'mandibular' }) {
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

  const svgProps = { width: 100, height: 160, viewBox: '0 0 100 150' };

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

export function EnhancedToothCard({ tooth, isActive, arch }: EnhancedToothCardProps) {
  const severity = useMemo(() => getSeverityColor(tooth), [tooth]);
  const findings = useMemo(() => getFindings(tooth), [tooth]);
  const maxDepth = Math.max(Math.max(...tooth.buccal.depth), Math.max(...tooth.lingual.depth));

  return (
    <div
      className={`flex flex-col items-center gap-2 rounded-lg border-2 p-3 transition-all ${severity.bg} ${severity.border} ${isActive ? 'ring-2 ring-cyan-400 shadow-md' : ''}`}
    >
      {/* Tooth Number & Severity Indicator */}
      <div className="flex items-center justify-between w-full">
        <span className="text-sm font-bold text-slate-700">{tooth.toothNumber}</span>
        <span className="text-base">{severity.icon}</span>
      </div>

      {/* Real Tooth SVG */}
      <div className="flex justify-center h-24">
        <ToothSVGRenderer toothNumber={tooth.toothNumber} variant="base" arch={arch} />
      </div>

      {/* Findings Tags */}
      <div className="flex flex-wrap gap-1 justify-center">
        {findings.map((finding) => (
          <span
            key={finding}
            className={`text-[10px] font-semibold px-2 py-1 rounded-full whitespace-nowrap ${
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

      {/* Depth Data */}
      {!tooth.missing && maxDepth > 0 && (
        <div className="text-[11px] text-slate-600 text-center w-full">
          <div className="font-semibold">Depths (mm)</div>
          <div className="grid grid-cols-2 gap-1 text-[10px] mt-1">
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
        <div className="text-[10px] font-semibold text-red-700 bg-red-100 px-2 py-1 rounded w-full text-center">
          Bleeding Detected
        </div>
      )}
    </div>
  );
}
