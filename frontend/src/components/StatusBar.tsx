import React from 'react';
import type { ConnectionState, PerioPayload } from '../types';

interface StatusBarProps {
  connectionState: ConnectionState;
  latencyMs: number | null;
  socketUrl: string;
  lastPayload: PerioPayload | null;
  transcriptionError: string | null;
  soundEnabled: boolean;
  setSoundEnabled: React.Dispatch<React.SetStateAction<boolean>>;
}

function statusTone(state: ConnectionState): string {
  switch (state) {
    case 'connected':
    case 'listening':
      return 'border-emerald-200 bg-emerald-50 text-emerald-700';
    case 'reconnecting':
      return 'border-amber-200 bg-amber-50 text-amber-700';
    case 'error':
      return 'border-rose-200 bg-rose-50 text-rose-700';
    case 'disconnected':
      return 'border-slate-200 bg-slate-50 text-slate-600';
    default:
      return 'border-cyan-200 bg-cyan-50 text-cyan-800';
  }
}

function statusLabel(state: ConnectionState, transcriptionError: string | null): string {
  switch (state) {
    case 'connected':
      return 'Connected to Deepgram';
    case 'listening':
      return 'Listening';
    case 'reconnecting':
      return transcriptionError || 'Reconnecting';
    case 'error':
      return 'Error';
    case 'disconnected':
      return 'Backend disconnected';
    default:
      return 'Connecting';
  }
}

export function StatusBar({
  connectionState,
  latencyMs,
  socketUrl,
  lastPayload,
  transcriptionError,
  soundEnabled,
  setSoundEnabled,
}: StatusBarProps) {
  const debugPayload = lastPayload ? JSON.stringify(lastPayload, null, 2) : 'No JSON payload received yet.';

  return (
    <div className="grid gap-4 xl:grid-cols-1 xl:items-stretch">
      <section className="rounded-[28px] border border-slate-200/80 bg-white/88 p-5 shadow-[0_12px_32px_rgba(15,23,42,0.05)] backdrop-blur">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-slate-500">Connection</p>
            <h3 className="mt-2 text-[20px] font-semibold tracking-tight text-slate-950">Live socket health</h3>
          </div>
          <span className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] ${statusTone(connectionState)}`}>
            {statusLabel(connectionState, transcriptionError)}
          </span>
        </div>

        <div className="mt-4 space-y-3 text-sm text-slate-600">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">Socket endpoint</p>
            <p className="mt-2 break-all font-medium text-slate-800">{socketUrl}</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">Latency</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">{latencyMs !== null ? `${latencyMs} ms` : '—'}</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">Mode</p>
            <p className="mt-2 font-medium text-slate-800">
              {connectionState === 'connected' || connectionState === 'listening'
                ? 'FastAPI WebSocket active'
                : connectionState === 'reconnecting'
                  ? transcriptionError || 'Reconnecting to backend'
                  : 'Backend disconnected'}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">Sound</p>
                <p className="mt-2 font-medium text-slate-800">{soundEnabled ? 'ON' : 'OFF'}</p>
              </div>
              <button
                type="button"
                onClick={() => setSoundEnabled((previous) => !previous)}
                className={`rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] transition-all duration-200 ${
                  soundEnabled
                    ? 'border-cyan-200 bg-cyan-50 text-cyan-800 hover:bg-cyan-100'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                {soundEnabled ? 'Mute' : 'Enable'}
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-[28px] border border-slate-200/80 bg-white/88 p-5 shadow-[0_12px_32px_rgba(15,23,42,0.05)] backdrop-blur">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-slate-500">JSON debug panel</p>
            <h3 className="mt-2 text-[20px] font-semibold tracking-tight text-slate-950">Latest incoming payload</h3>
          </div>
          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
            live
          </span>
        </div>

        <pre className="debug-json mt-4 max-h-[220px] overflow-auto rounded-2xl border border-slate-200 bg-slate-950 px-4 py-3 text-xs leading-6 text-slate-100">
          {debugPayload}
        </pre>
      </section>
    </div>
  );
}
