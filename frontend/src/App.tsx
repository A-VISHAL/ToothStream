import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
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
import { Activity, ArrowLeft, Mic, Stethoscope } from 'lucide-react';

const AUTH_STORAGE_KEY = 'trust-ai-auth-session';
const AUTH_DOCTOR_NAME = 'Dr. Emily Carter';

/* ── Page-order map: used to decide slide direction ── */
const PAGE_ORDER: Record<string, number> = {
  login: 0,
  intro: 1,
  'patient-entry': 2,
  dashboard: 3,
};

/* ── Session persistence ── */
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

/* ── Connection status badge ── */
function ConnectionBadge({ state }: { state: string }) {
  const map: Record<string, { cls: string; dot: string; label: string }> = {
    connected:    { cls: 'border-emerald-200 bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500',       label: 'Connected'    },
    listening:    { cls: 'border-emerald-200 bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500 mic-pulse', label: 'Listening' },
    reconnecting: { cls: 'border-amber-200  bg-amber-50  text-amber-700',    dot: 'bg-amber-500',         label: 'Reconnecting' },
    connecting:   { cls: 'border-cyan-200   bg-cyan-50   text-cyan-800',     dot: 'bg-cyan-500',          label: 'Connecting'   },
    disconnected: { cls: 'border-slate-200  bg-slate-50  text-slate-600',    dot: 'bg-slate-400',         label: 'Disconnected' },
    error:        { cls: 'border-rose-200   bg-rose-50   text-rose-700',     dot: 'bg-rose-500',          label: 'Error'        },
  };
  const { cls, dot, label } = map[state] ?? map.disconnected;
  return (
    <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[10.5px] font-bold uppercase tracking-[0.22em] ${cls}`}>
      <span className={`h-2 w-2 rounded-full ${dot}`} />
      {label}
    </span>
  );
}

/* ── Main dashboard page ── */
function Dashboard({ doctorName, patient, onExit }: { doctorName: string; patient: PatientProfile | null; onExit: () => void }) {
  const {
    connectionState, latencyMs, socketUrl, lastPayload,
    transcriptionError, commandFeedback,
    soundEnabled, setSoundEnabled, unlockAudio,
    currentTooth, currentSurface, activeSiteIndex, teeth,
  } = usePerioChart();

  return (
    <div className="app-shell relative px-3 py-3 sm:px-4 lg:px-5">
      {/* Command feedback toast */}
      <AnimatePresence>
        {commandFeedback && (
          <motion.div
            key={commandFeedback.message}
            className="fixed right-5 top-5 z-50"
            initial={{ opacity: 0, y: -12, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ duration: 0.22 }}
          >
            <span
              className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] shadow-lg ${
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
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative mx-auto flex min-h-[calc(100vh-1.5rem)] max-w-[1800px] flex-col gap-3">
        {/* Header — single row, no wrap, back button on the left */}
        <header className="panel-surface rounded-[24px] px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">

            {/* Back button */}
            <button
              type="button"
              onClick={onExit}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:border-cyan-300 hover:bg-cyan-50 hover:text-cyan-700 active:scale-95"
              title="Back to patient entry"
            >
              <ArrowLeft className="h-4 w-4" strokeWidth={2.5} />
            </button>

            {/* Brand */}
            <div className="flex shrink-0 items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 shadow-md shadow-cyan-500/20">
                <Stethoscope className="h-4 w-4 text-white" strokeWidth={2} />
              </div>
              <div className="hidden sm:block">
                <p className="text-[9px] font-bold uppercase tracking-[0.35em] text-cyan-600 leading-none">ToothStream AI</p>
                <h1 className="text-base font-extrabold tracking-tight text-slate-900 leading-tight">
                  Periodontal Charting
                </h1>
              </div>
            </div>

            {/* Divider */}
            <div className="mx-1 hidden h-8 w-px shrink-0 bg-slate-200 sm:block" />

            {/* Scrollable badge strip — overflow hidden on narrow screens */}
            <div className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto no-scrollbar">

              {/* Doctor */}
              <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-cyan-200 bg-cyan-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-800 whitespace-nowrap">
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-500" />
                {doctorName}
              </span>

              {/* Patient */}
              {patient && (
                <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-600 whitespace-nowrap shadow-sm">
                  <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                  {patient.name}
                </span>
              )}

              {/* Connection */}
              <ConnectionBadge state={connectionState} />

              {/* Latency */}
              {latencyMs !== null && (
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-bold text-slate-600 whitespace-nowrap shadow-sm">
                  <Activity className="h-3 w-3 text-emerald-500" strokeWidth={2.5} />
                  {latencyMs}ms
                </span>
              )}

              {/* Deepgram */}
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-medium text-slate-500 whitespace-nowrap shadow-sm">
                <Mic className="h-3 w-3" strokeWidth={2} />
                {connectionState === 'connected' || connectionState === 'listening' ? 'Live' : 'Offline'}
              </span>
            </div>
          </div>
        </header>

        {/* Main grid */}
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

/* ── Root app with animated page transitions ── */
type PageKey = 'login' | 'intro' | 'patient-entry' | 'dashboard';

export default function App() {
  const [session, setSession] = useState(() => getStoredSession());
  const [page, setPage] = useState<PageKey>('login');
  const [prevPage, setPrevPage] = useState<PageKey>('login');
  const [patient, setPatient] = useState<PatientProfile | null>(null);

  useEffect(() => {
    persistSession(session.loggedIn, session.doctorName, Boolean(session.remember));
  }, [session]);

  /* Scroll to top on every page change */
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [page]);

  const dir = PAGE_ORDER[page] - PAGE_ORDER[prevPage];
  const enterX  = dir >= 0 ?  36 : -36;
  const exitX   = dir >= 0 ? -36 :  36;

  function navigate(next: PageKey) {
    setPrevPage(page);
    setPage(next);
  }

  /* shared transition props — using direct motion props (no Variants) avoids FM v12 TS issues */
  const commonMotion = {
    initial:    { opacity: 0, x: enterX },
    animate:    { opacity: 1, x: 0 },
    exit:       { opacity: 0, x: exitX },
    transition: { duration: 0.38 },
  };

  return (
    <AnimatePresence mode="wait" initial={false}>
      {page === 'login' && (
        <motion.div key="login" className="page-transition-wrap" {...commonMotion}>
          <LoginPage
            onSignIn={(doctorName) => {
              setSession({ loggedIn: true, doctorName, remember: false });
              navigate('intro');
            }}
            onPass={() => {
              setSession({ loggedIn: true, doctorName: AUTH_DOCTOR_NAME, remember: false });
              navigate('dashboard');
            }}
          />
        </motion.div>
      )}

      {page === 'intro' && (
        <motion.div key="intro" className="page-transition-wrap" {...commonMotion}>
          <ClinicalOverviewPage
            doctorName={session.doctorName}
            onGetStarted={() => navigate('patient-entry')}
          />
        </motion.div>
      )}

      {page === 'patient-entry' && (
        <motion.div key="patient-entry" className="page-transition-wrap" {...commonMotion}>
          <PatientEntryPage
            doctorName={session.doctorName}
            onBack={() => navigate('intro')}
            onContinue={(nextPatient) => {
              setPatient(nextPatient);
              navigate('dashboard');
            }}
          />
        </motion.div>
      )}

      {page === 'dashboard' && (
        <motion.div key="dashboard" className="page-transition-wrap" {...commonMotion}>
          <WebSocketProvider>
            <Dashboard
              doctorName={session.doctorName}
              patient={patient}
              onExit={() => navigate('patient-entry')}
            />
          </WebSocketProvider>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
