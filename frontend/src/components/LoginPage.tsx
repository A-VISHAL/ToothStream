import React, { useState } from 'react';
import { motion } from 'framer-motion';

interface LoginPageProps {
  onSignIn: (doctorName: string) => void;
}

const DEFAULT_DOCTOR_NAME = 'Doctor XX';
const DEFAULT_PASSWORD = 'dental123';

const FEATURE_ITEMS = ['Real-time voice charting', 'Clinical AI workflow', 'Deepgram live transcription'];

function CheckMark() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4 shrink-0 text-sky-600" fill="none" aria-hidden="true">
      <path d="M16.5 5.5 8.75 13.25 5.5 10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ClinicalIllustration() {
  return (
    <svg viewBox="0 0 420 180" className="h-auto w-full max-w-[420px] text-slate-300" fill="none" aria-hidden="true">
      <path d="M62 134c23-34 58-52 108-52 40 0 74 11 103 33 18 14 35 21 51 21 17 0 31-5 42-16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="0 0 1 9" opacity="0.85" />
      <path d="M98 110c10-18 28-28 54-28 21 0 39 6 55 18 9 7 21 12 36 12 12 0 23-3 31-9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M172 45c14 0 24 11 24 25 0 6-2 11-4 15-2 5-2 11-1 18 1 12 2 27-8 35-4 3-9 4-12 0-3-3-4-9-5-15-1-4-3-8-6-8s-5 4-6 8c-1 6-2 12-5 15-3 4-8 3-12 0-10-8-9-23-8-35 1-7 1-13-1-18-2-4-4-9-4-15 0-14 10-25 24-25h24Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M130 68h18M272 68h18M148 92h124" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" opacity="0.6" />
    </svg>
  );
}

export function LoginPage({ onSignIn }: LoginPageProps) {
  const [doctorName, setDoctorName] = useState(DEFAULT_DOCTOR_NAME);
  const [password, setPassword] = useState(DEFAULT_PASSWORD);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedDoctorName = doctorName.trim();
    const trimmedPassword = password.trim();
    const isValid = trimmedDoctorName === DEFAULT_DOCTOR_NAME && trimmedPassword === DEFAULT_PASSWORD;

    if (!isValid) {
      setError('Invalid credentials');
      return;
    }

    setError(null);
    setIsSubmitting(true);
    onSignIn(trimmedDoctorName);
  };

  return (
    <div className="app-shell auth-shell min-h-screen px-4 py-4 sm:px-6 lg:px-8">
      <div className="auth-grid mx-auto grid min-h-[calc(100vh-2rem)] w-full max-w-[1440px] items-center gap-6 lg:grid-cols-[minmax(0,1.55fr)_minmax(360px,0.85fr)] lg:gap-8">
        <motion.section
          className="order-2 flex min-h-[520px] flex-col justify-between rounded-[28px] border border-slate-200 bg-white/90 px-6 py-7 shadow-[0_18px_50px_rgba(15,23,42,0.06)] backdrop-blur-sm lg:order-1 lg:px-8 lg:py-8"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.32, ease: 'easeOut' }}
        >
          <div className="max-w-2xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.42em] text-sky-700/75">Dental Voice Charting AI</p>
            <h1 className="mt-4 max-w-xl text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">AI-assisted periodontal charting</h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600 sm:text-[15px]">
              Real-time speech recognition, intelligent parsing, and live periodontal charting designed for clinical workflow.
            </p>
          </div>

          <div className="mt-10 grid max-w-xl gap-3">
            {FEATURE_ITEMS.map((item) => (
              <div key={item} className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                <CheckMark />
                <span>{item}</span>
              </div>
            ))}
          </div>

          <div className="mt-8 flex justify-end">
            <div className="w-full max-w-[420px] rounded-[24px] border border-slate-100 bg-slate-50 px-4 py-5">
              <ClinicalIllustration />
            </div>
          </div>
        </motion.section>

        <motion.section
          className="order-1 w-full max-w-[440px] justify-self-end rounded-[28px] border border-slate-200 bg-white px-6 py-7 shadow-[0_18px_50px_rgba(15,23,42,0.08)] lg:order-2"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.32, ease: 'easeOut', delay: 0.05 }}
        >
          <div className="mb-6">
            <p className="text-xs font-semibold uppercase tracking-[0.34em] text-sky-700/75">Secure clinician access</p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">Sign in</h2>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <label className="block space-y-2">
              <span className="text-sm font-medium text-slate-700">Doctor</span>
              <input
                type="text"
                value={doctorName}
                onChange={(event) => setDoctorName(event.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-[15px] text-slate-950 outline-none transition-colors duration-200 placeholder:text-slate-400 focus:border-sky-300 focus:bg-white focus:ring-4 focus:ring-sky-100/70"
                autoComplete="name"
              />
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-medium text-slate-700">Password</span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-[15px] text-slate-950 outline-none transition-colors duration-200 placeholder:text-slate-400 focus:border-sky-300 focus:bg-white focus:ring-4 focus:ring-sky-100/70"
                autoComplete="current-password"
              />
            </label>

            {error ? (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700"
              >
                {error}
              </motion.div>
            ) : null}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-2xl bg-slate-950 px-5 py-3.5 text-sm font-semibold text-white shadow-[0_12px_28px_rgba(15,23,42,0.12)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-slate-800 focus:outline-none focus:ring-4 focus:ring-sky-100 disabled:cursor-not-allowed disabled:opacity-70"
            >
              Sign In
            </button>
          </form>
        </motion.section>
      </div>
    </div>
  );
}
