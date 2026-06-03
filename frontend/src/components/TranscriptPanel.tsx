import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Square } from 'lucide-react';
import { usePerioChart } from './WebSocketProvider';
import type { ToothSurface } from '../types';

const SITE_NAMES = ['Mesial', 'Mid', 'Distal'];

function surfaceLabel(surface: ToothSurface | null): string {
  if (!surface) return 'Waiting';
  return surface === 'buccal' ? 'Buccal' : 'Lingual / Palatal';
}

function StatusDot({ active }: { active: boolean }) {
  return (
    <span
      className={`inline-block h-2.5 w-2.5 rounded-full shrink-0 ${
        active ? 'bg-emerald-500 mic-pulse' : 'bg-slate-300'
      }`}
    />
  );
}

export function TranscriptPanel() {
  const {
    connectionState,
    currentTooth,
    currentSurface,
    activeSiteIndex,
    transcripts,
    interimTranscript,
    isRecording,
    transcriptionError,
    socketUrl,
    unlockAudio,
    startRecording,
    stopRecording,
  } = usePerioChart();

  const currentSite = activeSiteIndex !== null ? SITE_NAMES[activeSiteIndex] : 'Mid';
  const isListening = connectionState === 'listening';
  const isConnected = connectionState === 'connected' || isListening;

  const micBadge = isListening
    ? 'Listening'
    : isConnected
      ? 'Connected'
      : connectionState === 'reconnecting'
        ? transcriptionError ?? 'Reconnecting'
        : connectionState === 'connecting'
          ? 'Connecting'
          : 'Disconnected';

  const micBadgeCls = isListening
    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
    : isConnected
      ? 'border-cyan-200 bg-cyan-50 text-cyan-800'
      : connectionState === 'reconnecting'
        ? transcriptionError
          ? 'border-rose-200 bg-rose-50 text-rose-700'
          : 'border-amber-200 bg-amber-50 text-amber-700'
        : 'border-slate-200 bg-slate-50 text-slate-500';

  return (
    <div className="flex h-full flex-col gap-3">
      {/* Mic control card */}
      <div className="panel-surface rounded-[24px] p-4">
        {/* Header row */}
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2.5">
            <div className={`flex h-8 w-8 items-center justify-center rounded-xl ${isListening ? 'bg-emerald-500' : 'bg-slate-100'} transition-colors duration-300`}>
              {isListening
                ? <Mic className="h-4 w-4 text-white mic-pulse" strokeWidth={2} />
                : <Mic className="h-4 w-4 text-slate-400" strokeWidth={2} />}
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-400">Microphone</p>
              <h2 className="text-sm font-bold text-slate-900">Live transcript</h2>
            </div>
          </div>
          <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.2em] ${micBadgeCls}`}>
            <StatusDot active={isListening} />
            {micBadge}
          </span>
        </div>

        {/* Clinical context mini-grid */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          {[
            { label: 'Tooth', value: currentTooth != null ? String(currentTooth) : '—', accent: currentTooth != null },
            { label: 'Surface', value: surfaceLabel(currentSurface), accent: currentSurface != null },
            { label: 'Site', value: currentSite, accent: false },
          ].map(({ label, value, accent }) => (
            <div
              key={label}
              className={`rounded-xl border p-2.5 text-center ${
                accent
                  ? 'border-cyan-200 bg-cyan-50'
                  : 'border-slate-100 bg-slate-50'
              }`}
            >
              <p className="text-[9.5px] font-bold uppercase tracking-[0.24em] text-slate-400">{label}</p>
              <p className={`mt-1 text-sm font-extrabold leading-none ${accent ? 'text-cyan-700' : 'text-slate-600'}`}>
                {value}
              </p>
            </div>
          ))}
        </div>

        {/* Buttons */}
        <div className="flex gap-2">
          <motion.button
            type="button"
            onClick={() => {
              void unlockAudio();
              void startRecording();
            }}
            disabled={isRecording}
            className="flex-1 flex items-center justify-center gap-2 h-9 rounded-xl text-sm font-bold transition-all duration-200
              bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/20
              disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
          >
            <Mic className="h-3.5 w-3.5" strokeWidth={2.5} />
            {isRecording ? 'Recording…' : 'Start'}
          </motion.button>
          <motion.button
            type="button"
            onClick={() => void stopRecording()}
            disabled={!isRecording}
            className="flex-1 flex items-center justify-center gap-2 h-9 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-600 transition-all duration-200
              hover:border-slate-300 hover:bg-slate-50
              disabled:opacity-40 disabled:cursor-not-allowed"
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.97 }}
          >
            <Square className="h-3.5 w-3.5" strokeWidth={2.5} />
            Stop
          </motion.button>
        </div>

        {/* System status hint */}
        <p className="mt-3 text-[11px] text-slate-400 leading-4">
          {isConnected
            ? `FastAPI WebSocket active · ${socketUrl}`
            : connectionState === 'reconnecting'
              ? transcriptionError ?? 'Reconnecting to backend…'
              : 'Waiting for backend connection'}
        </p>
      </div>

      {/* Transcript history card */}
      <div className="flex-1 panel-surface rounded-[24px] p-4 flex flex-col min-h-0">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-400">Transcript</p>
            <h3 className="text-sm font-bold text-slate-900">Deepgram output</h3>
          </div>
          <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
            {transcripts.length} final
          </span>
        </div>

        {/* Interim / current speech */}
        <div className="rounded-2xl border border-slate-800 bg-slate-950 p-3 mb-3">
          <p className="text-[9.5px] font-bold uppercase tracking-[0.26em] text-cyan-400 mb-2">Current speech</p>
          <p className="min-h-[48px] text-sm leading-6 text-slate-200">
            {interimTranscript || (
              <span className="text-slate-500 italic">
                {isRecording ? 'Listening for speech…' : 'Start recording to transcribe speech here.'}
              </span>
            )}
          </p>
        </div>

        {/* Final transcript list */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-0.5 min-h-0">
          <AnimatePresence>
            {transcripts.length > 0 ? (
              transcripts.map((entry) => (
                <motion.article
                  key={entry.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className="rounded-xl border border-slate-100 bg-white px-3 py-2.5 shadow-sm transition hover:border-cyan-200 hover:bg-cyan-50/40"
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className={`text-[9.5px] font-bold uppercase tracking-[0.22em] ${entry.isFinal ? 'text-teal-600' : 'text-slate-400'}`}>
                      {entry.isFinal ? 'Final' : 'Interim'}
                    </span>
                    <span className="text-[10px] font-medium text-slate-400">
                      {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-sm leading-5 text-slate-700">{entry.text}</p>
                </motion.article>
              ))
            ) : (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-5 text-center text-xs text-slate-400">
                Final transcript segments will appear here after recording.
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
