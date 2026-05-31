import React from 'react';
import { SimpleToothMap } from './SimpleToothMap';
import type { ToothState, ToothSurface } from '../types';

interface PerioChartProps {
  teeth: Record<number, ToothState>;
  activeTooth: number | null;
  activeSurface: ToothSurface | null;
  activeSiteIndex: number | null;
}

export function PerioChart({ teeth, activeTooth, activeSurface, activeSiteIndex }: PerioChartProps) {
  return (
    <div className="space-y-2">
      <SimpleToothMap teeth={teeth} activeTooth={activeTooth} />
    </div>
  );
}
