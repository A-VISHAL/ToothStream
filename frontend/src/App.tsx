import React, { useEffect, useState } from 'react';
import './App.css';
import { LoginPage } from './components/LoginPage';
import { ClinicalOverviewPage } from './components/ClinicalOverviewPage';
import { PatientEntryPage, type PatientProfile } from './components/PatientEntryPage';
import { PerioChart } from './components/PerioChart';
import { DebugPanel } from './components/DebugPanel';
import { StatusBar } from './components/StatusBar';
import { TranscriptPanel } from './components/TranscriptPanel';
import { WebSocketProvider, usePerioChart } from './components/WebSocketProvider';

const AUTH_STORAGE_KEY = 'trust-ai-auth-session';
const AUTH_DOCTOR_NAME = 'Dr. Emily Carter';

function getStoredSession(): { loggedIn: boolean; doctorName: string; remember: boolean } {
  if (typeof window === 'undefined') {
    return { loggedIn: false, doctorName: AUTH_DOCTOR_NAME, remember: false };
  }

  try {
    const stored = window.localStorage.getItem(AUTH_STORAGE_KEY);

    if (!stored) {
      return { loggedIn: false, doctorName: AUTH_DOCTOR_NAME, remember: false };
    }

    const parsed = JSON.parse(stored) as { loggedIn?: boolean; doctorName?: string; remember?: boolean };

    return {
      // Only restore a logged-in state if the session was persisted with `remember: true`.
      loggedIn: Boolean(parsed.loggedIn && parsed.remember),
      doctorName: parsed.doctorName?.trim() || AUTH_DOCTOR_NAME,
      remember: Boolean(parsed.remember),
    };
  } catch {
    return { loggedIn: false, doctorName: AUTH_DOCTOR_NAME, remember: false };
  }
}

function persistSession(loggedIn: boolean, doctorName: string, remember: boolean) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ loggedIn, doctorName, remember }));
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
    <div className="app-shell relative px-4 py-4 sm:px-6 lg:px-8">
      {commandFeedback ? (
        <div className="command-toast fixed right-4 top-4 z-50 rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-slate-950 opacity-100 transition-all duration-200 ease-out sm:right-6 sm:top-6">
          <span
            className={
              commandFeedback.kind === 'undo'
                ? 'border-amber-200 bg-amber-50 text-amber-800'
                : commandFeedback.kind === 'bleeding'
                  ? 'border-rose-200 bg-rose-50 text-rose-700'
                  : commandFeedback.kind === 'jump'
                    ? 'border-cyan-200 bg-cyan-50 text-cyan-800'
                    : 'border-slate-200 bg-white text-slate-700'
            }
          >
            {commandFeedback.message}
          </span>
        </div>
      ) : null}

      <div className="relative mx-auto flex min-h-[calc(100vh-2rem)] max-w-[1800px] flex-col gap-4">
        <header className="panel-surface rounded-[32px] px-5 py-4 sm:px-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.38em] text-cyan-700/80">Dental Voice Charting AI</p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                Real-time periodontal charting workspace
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 sm:text-[15px]">
                Clinical-style charting surface with live tooth updates, SVG rendering, websocket connectivity, and real Deepgram speech-to-text.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <span className="rounded-full border border-cyan-200 bg-cyan-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-cyan-800">
                {doctorName}
              </span>
              {patient ? (
                <span className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-slate-700 shadow-sm">
                  {patient.name}
                </span>
              ) : null}

            <div className="flex flex-wrap items-center gap-3 text-sm">
              <span
                className={`rounded-full border px-3 py-2 font-semibold uppercase tracking-[0.24em] ${
                  connectionState === 'connected' || connectionState === 'listening'
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                    : connectionState === 'reconnecting'
                      ? 'border-amber-200 bg-amber-50 text-amber-700'
                      : connectionState === 'connecting'
                        ? 'border-cyan-200 bg-cyan-50 text-cyan-800'
                      : 'border-slate-200 bg-slate-50 text-slate-600'
                }`}
              >
                {connectionState}
              </span>
              <span className="rounded-full border border-slate-200 bg-white px-3 py-2 font-medium text-slate-700 shadow-sm">
                {connectionState === 'connected' || connectionState === 'listening'
                  ? 'Connected to Deepgram'
                  : connectionState === 'reconnecting'
                    ? 'Reconnecting'
                    : 'Backend disconnected'}
              </span>
            </div>
            </div>
          </div>
        </header>

        <main className="grid flex-1 gap-4 xl:grid-cols-[380px,minmax(0,1fr)] xl:items-start min-h-0">
          <aside className="order-2 min-h-0 xl:order-1 xl:sticky xl:top-4 self-start">
            <div className="space-y-4">
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
            <div className="panel-surface rounded-[32px] p-4 sm:p-5">
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

      <DebugPanel />
    </div>
  );
}

export default function App() {
  const [session, setSession] = useState(() => getStoredSession());
  // Always show the login page first on app startup
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
        onGetStarted={() => {
          setPage('patient-entry');
        }}
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