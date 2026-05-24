import React from 'react';
import './App.css';
import { PerioChart } from './components/PerioChart';
import { StatusBar } from './components/StatusBar';
import { TranscriptPanel } from './components/TranscriptPanel';
import { WebSocketProvider, usePerioChart } from './components/WebSocketProvider';

function Dashboard() {
  const {
    connectionState,
    isMockStream,
    latencyMs,
    socketUrl,
    lastPayload,
    currentTooth,
    currentSurface,
    activeSiteIndex,
    transcripts,
    teeth,
  } = usePerioChart();

  return (
    <div className="app-shell relative px-4 py-4 sm:px-6 lg:px-8">
      <div className="relative mx-auto flex min-h-[calc(100vh-2rem)] max-w-[1800px] flex-col gap-4">
        <header className="panel-surface rounded-[32px] px-5 py-4 sm:px-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.38em] text-cyan-700/80">Dental Voice Charting AI</p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                Real-time periodontal charting workspace
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 sm:text-[15px]">
                Clinical-style charting surface with live tooth updates, SVG rendering, websocket connectivity, and a mock fallback for local testing.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-sm">
              <span
                className={`rounded-full border px-3 py-2 font-semibold uppercase tracking-[0.24em] ${
                  connectionState === 'connected'
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                    : connectionState === 'mock'
                      ? 'border-cyan-200 bg-cyan-50 text-cyan-800'
                      : 'border-slate-200 bg-slate-50 text-slate-600'
                }`}
              >
                {connectionState}
              </span>
              <span className="rounded-full border border-slate-200 bg-white px-3 py-2 font-medium text-slate-700 shadow-sm">
                {isMockStream ? 'Mock data ready' : 'Backend socket live'}
              </span>
            </div>
          </div>
        </header>

        <main className="grid flex-1 gap-4 xl:grid-cols-[360px,minmax(0,1fr)] xl:items-start">
          <aside className="min-h-0 self-start">
            <TranscriptPanel
              connectionState={connectionState}
              isMockStream={isMockStream}
              currentTooth={currentTooth}
              currentSurface={currentSurface}
              activeSiteIndex={activeSiteIndex}
              transcripts={transcripts}
            />
          </aside>

          <section className="min-h-0 self-start">
            <div className="panel-surface h-full rounded-[32px] p-4 sm:p-5">
              <PerioChart
                teeth={teeth}
                activeTooth={currentTooth}
                activeSurface={currentSurface}
                activeSiteIndex={activeSiteIndex}
              />
            </div>
          </section>
        </main>

        <footer>
          <StatusBar
            connectionState={connectionState}
            latencyMs={latencyMs}
            socketUrl={socketUrl}
            lastPayload={lastPayload}
            isMockStream={isMockStream}
          />
        </footer>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <WebSocketProvider>
      <Dashboard />
    </WebSocketProvider>
  );
}