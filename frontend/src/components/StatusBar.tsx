import React from 'react';
import { motion } from 'framer-motion';
import { Activity, Plug, Volume2, VolumeX, Zap } from 'lucide-react';
import type { ConnectionState, PerioPayload } from '../types';

interface StatusBarProps {
  connectionState: ConnectionState;
  latencyMs: number | null;
  socketUrl: string;
  lastPayload: PerioPayload | null;
  transcriptionError: string | null;
  soundEnabled: boolean;
  setSoundEnabled: React.Dispatch<React.SetStateAction<boolean>>;
  unlockAudio: () => Promise<boolean>;
}

function connectionTone(state: ConnectionState) {
  switch (state) {
    case 'connected':
    case 'listening':
      return { badge: 'border-emerald-200 bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500' };
    case 'reconnecting':
      return { badge: 'border-amber-200 bg-amber-50 text-amber-700', dot: 'bg-amber-500' };
    case 'error':
      return { badge: 'border-rose-200 bg-rose-50 text-rose-700', dot: 'bg-rose-500' };
    case 'disconnected':
      return { badge: 'border-slate-200 bg-slate-50 text-slate-500', dot: 'bg-slate-400' };
    default:
      return { badge: 'border-cyan-200 bg-cyan-50 text-cyan-800', dot: 'bg-cyan-500' };
  }
}

function connectionLabel(state: ConnectionState, err: string | null): string {
  switch (state) {
    case 'connected': return 'Connected';
    case 'listening': return 'Listening';
    case 'reconnecting': return err ?? 'Reconnecting';
    case 'error': return 'Error';
    case 'disconnected': return 'Disconnected';
    default: return 'Connecting';
  }
}

function MetricCard({ icon: Icon, label, value, accent = false }: { icon: React.ElementType; label: string; value: string; accent?: boolean }) {
  return (
    <div className={`rounded-xl border p-3 ${accent ? 'border-cyan-100 bg-cyan-50/60' : 'border-slate-100 bg-slate-50/80'}`}>
      <div className="flex items-center gap-2 mb-1.5">
        <Icon className={`h-3.5 w-3.5 ${accent ? 'text-cyan-600' : 'text-slate-400'}`} strokeWidth={2} />
        <p className="text-[9.5px] font-bold uppercase tracking-[0.24em] text-slate-400">{label}</p>
      </div>
      <p className={`text-sm font-bold break-all ${accent ? 'text-cyan-800' : 'text-slate-700'}`}>{value}</p>
    </div>
  );
}

export function StatusBar({
  connectionState,
  latencyMs,
  socketUrl,
  lastPayload,
  transcriptionError,
  soundEnabled,
  setSoundEnabled,
  unlockAudio,
}: StatusBarProps) {
  const { badge, dot } = connectionTone(connectionState);
  const label = connectionLabel(connectionState, transcriptionError);
  const isConnected = connectionState === 'connected' || connectionState === 'listening';
  const debugPayload = lastPayload ? JSON.stringify(lastPayload, null, 2) : 'No payload received yet.';

  return (
    <div className="space-y-3">
      {/* Connection health card */}
      <section className="panel-surface rounded-[24px] p-4">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2.5">
            <div className={`flex h-8 w-8 items-center justify-center rounded-xl ${isConnected ? 'bg-emerald-50 border border-emerald-200' : 'bg-slate-100 border border-slate-200'}`}>
              <Plug className={`h-4 w-4 ${isConnected ? 'text-emerald-600' : 'text-slate-400'}`} strokeWidth={2} />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-400">WebSocket</p>
              <h3 className="text-sm font-bold text-slate-900">Socket health</h3>
            </div>
          </div>
          <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.2em] ${badge}`}>
            <span className={`h-2 w-2 rounded-full ${dot}`} />
            {label}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-3">
          <MetricCard
            icon={Zap}
            label="Latency"
            value={latencyMs !== null ? `${latencyMs} ms` : '— ms'}
            accent={latencyMs !== null && latencyMs < 100}
          />
          <MetricCard
            icon={Activity}
            label="Mode"
            value={isConnected ? 'FastAPI WS' : connectionState === 'reconnecting' ? 'Reconnecting' : 'Offline'}
          />
        </div>

        <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5">
          <p className="text-[9.5px] font-bold uppercase tracking-[0.22em] text-slate-400 mb-1">Endpoint</p>
          <p className="text-xs font-medium text-slate-600 break-all">{socketUrl}</p>
        </div>
      </section>

      {/* Sound toggle card */}
      <section className="panel-surface rounded-[24px] p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            {soundEnabled
              ? <Volume2 className="h-4 w-4 text-cyan-600" strokeWidth={2} />
              : <VolumeX className="h-4 w-4 text-slate-400" strokeWidth={2} />}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-slate-400">Audio</p>
              <p className="text-sm font-bold text-slate-900">Clinical sounds</p>
            </div>
          </div>
          <motion.button
            type="button"
            onClick={() => {
              void unlockAudio();
              setSoundEnabled((prev) => !prev);
            }}
            className={`flex h-8 w-14 items-center rounded-full border-2 px-0.5 transition-all duration-250 ${
              soundEnabled
                ? 'justify-end border-cyan-400 bg-gradient-to-r from-cyan-500 to-blue-500'
                : 'justify-start border-slate-200 bg-slate-100'
            }`}
            whileTap={{ scale: 0.96 }}
            aria-label={soundEnabled ? 'Mute sounds' : 'Enable sounds'}
          >
            <motion.span
              className={`h-5 w-5 rounded-full shadow-sm ${soundEnabled ? 'bg-white' : 'bg-white border border-slate-200'}`}
              layout
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            />
          </motion.button>
        </div>
      </section>

      {/* Debug payload card */}
      <section className="panel-surface rounded-[24px] p-4">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-400">Debug</p>
            <h3 className="text-sm font-bold text-slate-900">Latest payload</h3>
          </div>
          <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-[0.2em] text-slate-400">
            live
          </span>
        </div>
        <pre className="debug-json max-h-[200px] overflow-auto rounded-xl border border-slate-200 bg-slate-950 px-3 py-2.5 text-[11px] leading-5 text-slate-200">
          {debugPayload}
        </pre>
      </section>
    </div>
  );
}
