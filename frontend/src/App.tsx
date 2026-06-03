import React, { useEffect, useState } from 'react';
import './App.css';
import { LoginPage } from './components/LoginPage';
import { ClinicalOverviewPage } from './components/ClinicalOverviewPage';
import { PatientEntryPage, type PatientProfile } from './components/PatientEntryPage';
import { PerioChart } from './components/PerioChart';
import { DebugPanel } from './components/DebugPanel';
import { FinalReportWorkflow } from './components/FinalReportWorkflow';
import { StatusBar } from './components/StatusBar';
import { TranscriptPanel } from './components/TranscriptPanel';
import { WebSocketProvider, usePerioChart } from './components/WebSocketProvider';
import { Activity, Mic, Stethoscope } from 'lucide-react';

const AUTH_STORAGE_KEY = 'trust-ai-auth-session';
const AUTH_DOCTOR_NAME = 'Dr. Emily Carter';

function getStoredSession(): { loggedIn: boolean; doctorName: string; remember: boolean } {
  if (typeof window === 'undefined') {
    return { loggedIn: false, doctorName: AUTH_DOCTOR_NAME, remember: false };
  }
  try {
    const stored = window.localStorage.getItem(AUTH_STORAGE_KEY);
    if (!stored) return { loggedIn: false, doctorName: AUTH_DOCTOR_NAME, remember: false };
    const parsed = JSON.parse(stored) as { loggedIn?: boolean; doctorName?: string; remember?: boolean };
    return {
      loggedIn: Boolean(parsed.loggedIn && parsed.remember),
      doctorName: parsed.doctorName?.trim() || AUTH_DOCTOR_NAME,
      remember: Boolean(parsed.remember),
    };
  } catch {
    return { loggedIn: false, doctorName: AUTH_DOCTOR_NAME, remember: false };
  }
}

function persistSession(loggedIn: boolean, doctorName: string, remember: boolean) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ loggedIn, doctorName, remember }));
}

function ConnectionBadge({ state }: { state: string }) {
  const map: Record<string, { cls: string; dot: string; label: string }> = {
    connected: { cls: 'border-emerald-200 bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500', label: 'Connected' },
    listening: { cls: 'border-emerald-200 bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500 mic-pulse', label: 'Listening' },
    reconnecting: { cls: 'border-amber-200 bg-amber-50 text-amber-700', dot: 'bg-amber-500', label: 'Reconnecting' },
    connecting: { cls: 'border-cyan-200 bg-cyan-50 text-cyan-800', dot: 'bg-cyan-500', label: 'Connecting' },
    disconnected: { cls: 'border-slate-200 bg-slate-50 text-slate-600', dot: 'bg-slate-400', label: 'Disconnected' },
    error: { cls: 'border-rose-200 bg-rose-50 text-rose-700', dot: 'bg-rose-500', label: 'Error' },
  };
  const { cls, dot, label } = map[state] ?? map.disconnected;
  return (
    <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[10.5px] font-bold uppercase tracking-[0.22em] ${cls}`}>
      <span className={`h-2 w-2 rounded-full ${dot}`} />
      {label}
    </span>
  );
}

function Dashboard({ doctorName, patient }: { doctorName: string; patient: PatientProfile | null }) {
  const {
    connectionState,
    latencyMs,
    socketUrl,
    lastPayload,
    transcriptionError,
    commandFeedback,
    soundEnabled,
    setSoundEnabled,
    unlockAudio,
    currentTooth,
    currentSurface,
    activeSiteIndex,
    teeth,
  } = usePerioChart();

  return (
    <div className="app-shell relative px-3 py-3 sm:px-4 lg:px-5">
      {/* Command toast */}
      {commandFeedback ? (
        <div className="command-toast fixed right-4 top-4 z-50 rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] transition-all duration-200 sm:right-6 sm:top-6">
          <span
            className={`inline-flex items-center gap-2 ${
              commandFeedback.kind === 'undo'
                ? 'border-amber-200 bg-amber-50 text-amber-800'
                : commandFeedback.kind === 'bleeding'
                  ? 'border-rose-200 bg-rose-50 text-rose-700'
                  : commandFeedback.kind === 'jump'
                    ? 'border-cyan-200 bg-cyan-50 text-cyan-800'
                    : 'border-slate-200 bg-white text-slate-700'
            }`}
          >
            {commandFeedback.message}
          </span>
        </div>
      ) : null}

      <div className="relative mx-auto flex min-h-[calc(100vh-1.5rem)] max-w-[1800px] flex-col gap-3">
        {/* Premium header */}
        <header className="panel-surface rounded-[24px] px-5 py-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            {/* Brand + title */}
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 shadow-lg shadow-cyan-500/20">
                <Stethoscope className="h-5 w-5 text-white" strokeWidth={2} />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.36em] text-cyan-600">
                  ToothStream AI
                </p>
                <h1 className="text-lg font-extrabold tracking-tight text-slate-900 sm:text-[1.35rem]">
                  Periodontal Charting Workspace
                </h1>
              </div>
            </div>

            {/* Right-side badges */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Doctor badge */}
              <span className="inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1.5 text-[10.5px] font-bold uppercase tracking-[0.22em] text-cyan-800">
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-500" />
                {doctorName}
              </span>

              {/* Patient badge */}
              {patient ? (
                <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[10.5px] font-bold uppercase tracking-[0.22em] text-slate-600 shadow-sm">
                  <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                  {patient.name}
                </span>
              ) : null}

              {/* Connection state */}
              <ConnectionBadge state={connectionState} />

              {/* Latency */}
              {latencyMs !== null && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[10.5px] font-bold text-slate-600 shadow-sm">
                  <Activity className="h-3 w-3 text-emerald-500" strokeWidth={2.5} />
                  {latencyMs}ms
                </span>
              )}

              {/* Deepgram indicator */}
              <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[10.5px] font-medium text-slate-500 shadow-sm">
                <Mic className="h-3 w-3" strokeWidth={2} />
                {connectionState === 'connected' || connectionState === 'listening'
                  ? 'Deepgram live'
                  : 'Deepgram offline'}
              </span>
            </div>
          </div>
        </header>

        {/* Main layout */}
        <main className="grid flex-1 min-h-0 gap-3 xl:grid-cols-[360px,minmax(0,1fr)] xl:items-start">
          <aside className="order-2 min-h-0 self-start xl:sticky xl:top-3 xl:order-1">
            <div className="space-y-3">
              <TranscriptPanel />
              <StatusBar
                connectionState={connectionState}
                latencyMs={latencyMs}
                socketUrl={socketUrl}
                lastPayload={lastPayload}
                transcriptionError={transcriptionError}
                soundEnabled={soundEnabled}
                setSoundEnabled={setSoundEnabled}
                unlockAudio={unlockAudio}
              />
            </div>
          </aside>

          <section className="order-1 min-w-0 min-h-0 xl:order-2">
            <div className="panel-surface rounded-[24px] p-3 sm:p-4">
              <PerioChart
                teeth={teeth}
                activeTooth={currentTooth}
                activeSurface={currentSurface}
                activeSiteIndex={activeSiteIndex}
              />
            </div>
          </section>
        </main>
      </div>

      <FinalReportWorkflow doctorName={doctorName} />
      <DebugPanel />
    </div>
  );
}

export default function App() {
  const [session, setSession] = useState(() => getStoredSession());
  const [page, setPage] = useState<'login' | 'intro' | 'patient-entry' | 'dashboard'>('login');
  const [patient, setPatient] = useState<PatientProfile | null>(null);

  useEffect(() => {
    persistSession(session.loggedIn, session.doctorName, Boolean(session.remember));
  }, [session]);

  if (page === 'login') {
    return (
      <LoginPage
        onSignIn={(doctorName: string, remember?: boolean) => {
          setSession({ loggedIn: true, doctorName, remember: Boolean(remember) });
          setPage('intro');
        }}
        onPass={() => {
          setSession({ loggedIn: true, doctorName: AUTH_DOCTOR_NAME, remember: false });
          setPage('dashboard');
        }}
      />
    );
  }

  if (page === 'intro') {
    return (
      <ClinicalOverviewPage
        doctorName={session.doctorName}
        onGetStarted={() => setPage('patient-entry')}
      />
    );
  }

  if (page === 'patient-entry') {
    return (
      <PatientEntryPage
        doctorName={session.doctorName}
        onBack={() => setPage('intro')}
        onContinue={(nextPatient) => {
          setPatient(nextPatient);
          setPage('dashboard');
        }}
      />
    );
  }

  return (
    <WebSocketProvider>
      <Dashboard doctorName={session.doctorName} patient={patient} />
    </WebSocketProvider>
  );
}
