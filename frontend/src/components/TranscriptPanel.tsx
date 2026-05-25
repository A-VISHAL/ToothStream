import React from 'react';
import type { ConnectionState, ToothSurface } from '../types';
import { useDeepgramTranscription } from './useDeepgramTranscription';

interface TranscriptPanelProps {
  connectionState: ConnectionState;
  isMockStream: boolean;
  currentTooth: number | null;
  currentSurface: ToothSurface | null;
  activeSiteIndex: number | null;
}

const SITE_NAMES = ['Mesial', 'Mid', 'Distal'];

function surfaceLabel(surface: ToothSurface | null): string {
  if (!surface) {
    return 'Waiting for chart input';
  }

  return surface === 'buccal' ? 'Buccal' : 'Lingual / Palatal';
}

export function TranscriptPanel({
  connectionState,
  isMockStream,
  currentTooth,
  currentSurface,
  activeSiteIndex,
}: TranscriptPanelProps) {
  const { connectionState: micState, error, interimTranscript, isRecording, segments, socketUrl, startRecording, stopRecording } =
    useDeepgramTranscription();

  const currentSite = activeSiteIndex !== null ? SITE_NAMES[activeSiteIndex] : 'Mid';

  const micBadge =
    micState === 'listening'
      ? 'Listening'
      : micState === 'connected'
        ? 'Connected'
        : 'Disconnected';

  const micBadgeTone =
    micState === 'listening'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
      : micState === 'connected'
        ? 'border-cyan-200 bg-cyan-50 text-cyan-800'
        : micState === 'error'
          ? 'border-rose-200 bg-rose-50 text-rose-700'
          : 'border-slate-200 bg-slate-50 text-slate-600';

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="rounded-[28px] border border-slate-200/80 bg-white/88 p-5 shadow-[0_12px_32px_rgba(15,23,42,0.05)] backdrop-blur">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-slate-500">Live transcript</p>
            <h2 className="mt-2 text-[22px] font-semibold tracking-tight text-slate-950">Microphone stream</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Browser audio is streamed to FastAPI at {socketUrl} and transcribed by Deepgram in real time.
            </p>
          </div>
          <span className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] ${micBadgeTone}`}>
            {micBadge}
          </span>
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => {
              void startRecording();
            }}
            disabled={isRecording}
            className="rounded-full border border-slate-900 bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Start Recording
          </button>
          <button
            type="button"
            onClick={() => {
              void stopRecording();
            }}
            disabled={!isRecording}
            className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Stop Recording
          </button>
        </div>

        <div className="mt-5 grid gap-3">
          <div className="rounded-2xl border border-slate-200 bg-slate-50/90 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">Current tooth</p>
            <p className="mt-2 text-[28px] font-semibold leading-none text-slate-950">{currentTooth ?? '—'}</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50/90 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">Current surface</p>
            <p className="mt-2 text-base font-semibold text-slate-950">{surfaceLabel(currentSurface)}</p>
            <p className="mt-1 text-sm text-slate-500">Active site: {currentSite}</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50/90 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">Stream mode</p>
            <p className="mt-2 text-sm font-medium text-slate-700">
              {isMockStream ? 'Local mock data is feeding the chart.' : 'Connected to the live FastAPI WebSocket.'}
            </p>
          </div>

          {error ? <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div> : null}
        </div>
      </div>

      <div className="flex-1 rounded-[28px] border border-slate-200/80 bg-white/88 p-5 shadow-[0_12px_32px_rgba(15,23,42,0.05)] backdrop-blur">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-slate-500">Transcript history</p>
            <h3 className="mt-2 text-[20px] font-semibold tracking-tight text-slate-950">Deepgram live output</h3>
          </div>
          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-slate-600">
            {segments.length} final
          </span>
        </div>

        <div className="mt-4 rounded-3xl border border-slate-200 bg-slate-950 p-4 text-slate-50">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-cyan-200">Current speech</p>
          <p className="mt-3 min-h-[80px] text-lg leading-8 text-cyan-50">
            {interimTranscript || 'Start recording and speak to stream live transcription here.'}
          </p>
        </div>

        <div className="mt-4 max-h-[320px] space-y-3 overflow-y-auto pr-1">
          {segments.length > 0 ? segments.map((entry) => (
            <article
              key={entry.id}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm transition hover:border-cyan-200 hover:bg-cyan-50/50"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                  {entry.isFinal ? 'Final' : 'Interim'}
                </span>
                <span className="text-[11px] font-medium text-slate-500">
                  {new Date(entry.timestamp).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  })}
                </span>
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-700">{entry.text}</p>
            </article>
          )) : (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
              Final transcript segments will appear here.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}