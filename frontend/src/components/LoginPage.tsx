import React, { useState } from 'react';

interface LoginPageProps {
  onSignIn: (doctorName: string) => void;
}

const DEFAULT_DOCTOR_NAME = 'Dr. Emily Carter';

export function LoginPage({ onSignIn }: LoginPageProps) {
  const [doctorName, setDoctorName] = useState(DEFAULT_DOCTOR_NAME);
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedDoctorName = doctorName.trim();
    const trimmedPassword = password.trim();
    const isValid = trimmedDoctorName === DEFAULT_DOCTOR_NAME && trimmedPassword === 'dental123';

    if (!isValid) {
      setError('Invalid credentials');
      return;
    }

    setError(null);
    setIsSubmitting(true);
    onSignIn(trimmedDoctorName);
  };

  return (
    <div className="app-shell auth-shell flex min-h-screen items-center justify-center px-4 py-8 sm:px-6 lg:px-8">
      <div className="auth-panel panel-surface w-full max-w-[520px] rounded-[36px] p-6 shadow-[0_28px_80px_rgba(15,23,42,0.12)] sm:p-8 auth-fade-in">
        <div className="mb-8 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.38em] text-cyan-700/80">Dental Voice Charting AI</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">Secure clinician access</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Sign in to enter the periodontal charting workspace.
          </p>
        </div>

        <form className="space-y-5" onSubmit={handleSubmit}>
          <label className="block space-y-2">
            <span className="text-sm font-semibold text-slate-700">Doctor Name</span>
            <input
              type="text"
              value={doctorName}
              onChange={(event) => setDoctorName(event.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-950 shadow-sm outline-none transition-all duration-200 placeholder:text-slate-400 focus:border-cyan-300 focus:ring-4 focus:ring-cyan-100"
              placeholder="Dr. Emily Carter"
              autoComplete="name"
            />
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-semibold text-slate-700">Password</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-950 shadow-sm outline-none transition-all duration-200 placeholder:text-slate-400 focus:border-cyan-300 focus:ring-4 focus:ring-cyan-100"
              placeholder="Enter password"
              autoComplete="current-password"
            />
          </label>

          <div className="flex items-center justify-between gap-3">
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-200"
                defaultChecked
              />
              Remember me
            </label>

            <span className="text-xs font-medium uppercase tracking-[0.22em] text-slate-400">Authorized access only</span>
          </div>

          {error ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-full border border-slate-900 bg-slate-950 px-5 py-3.5 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(15,23,42,0.16)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-[0_16px_34px_rgba(15,23,42,0.18)] focus:outline-none focus:ring-4 focus:ring-cyan-100 disabled:cursor-not-allowed disabled:opacity-70"
          >
            Sign In
          </button>
        </form>

        <p className="mt-6 text-center text-xs font-medium uppercase tracking-[0.28em] text-slate-400">
          Authorized clinical access only
        </p>
      </div>
    </div>
  );
}
