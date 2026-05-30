import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { HeartPulse, Lock, ShieldCheck, User } from 'lucide-react';

interface LoginPageProps {
  onSignIn: (doctorName: string, remember?: boolean) => void;
  onPass: () => void;
}

const DEFAULT_DOCTOR_NAME = 'Doctor XX';
const DEFAULT_PASSWORD = 'dental123';

function ClinicBackdrop() {
  return (
    <div className="hospital-auth-backdrop" aria-hidden="true">
      <div className="hospital-auth-glow hospital-auth-glow-left" />
      <div className="hospital-auth-glow hospital-auth-glow-right" />
    </div>
  );
}

function ClinicalBrandPanel() {
  return (
    <section className="hospital-auth-brand-panel" aria-label="Product summary">
      <div className="hospital-auth-brand-kicker">Dental Voice Charting AI</div>
      <h2 className="hospital-auth-brand-title">AI-powered periodontal charting for clinical workflow.</h2>
      <p className="hospital-auth-brand-line">Designed to fit daily clinical practice—fast, accurate, and calm.</p>

      <div className="hospital-auth-chip-row">
        <span className="hospital-auth-chip">Voice ready</span>
        <span className="hospital-auth-chip">Parser active</span>
        <span className="hospital-auth-chip">Secure access</span>
      </div>
      {/* Minimal professional illustration */}
      <svg width="160" height="48" viewBox="0 0 160 48" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginTop: 14 }} aria-hidden>
        <rect x="0" y="0" width="160" height="48" rx="6" fill="rgba(14,165,233,0.04)" />
        <path d="M8 30 L24 18 L32 30 L40 14 L48 30 L56 26 L64 30 L72 20 L80 30 L88 16 L96 30 L104 22 L112 30 L120 18 L128 30" stroke="#06b6d4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </section>
  );
}

export function LoginPage({ onSignIn, onPass }: LoginPageProps) {
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
    setIsSubmitting(true);
    setError(null);
    onSignIn(trimmedDoctorName);
  };

  return (
    <div className="app-shell hospital-auth-shell">
      <ClinicBackdrop />

      <motion.div
        className="hospital-auth-page"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
      >
        <div className="hospital-auth-layout">
          <ClinicalBrandPanel />

          <div className="hospital-auth-card">
            <div className="hospital-auth-header">
              <span className="hospital-auth-badge">
                <HeartPulse className="h-4 w-4" strokeWidth={2.2} />
                Clinical access
              </span>
              <h1 className="hospital-auth-title">Secure clinician access</h1>
              <p className="hospital-auth-subtitle">Sign in to continue.</p>
            </div>

            <form className="hospital-auth-form" onSubmit={handleSubmit}>
              <label className="hospital-auth-field">
                <span className="hospital-auth-label">Doctor name</span>
                <div className="hospital-auth-input-shell">
                  <User className="hospital-auth-input-icon" strokeWidth={2} aria-hidden />
                  <input
                    type="text"
                    value={doctorName}
                    onChange={(e) => setDoctorName(e.target.value)}
                    className="hospital-auth-input"
                      autoComplete="name"
                      disabled={isSubmitting}
                      autoFocus
                      aria-label="Doctor name"
                  />
                </div>
              </label>

              <label className="hospital-auth-field">
                <span className="hospital-auth-label">Password</span>
                <div className="hospital-auth-input-shell">
                  <Lock className="hospital-auth-input-icon" strokeWidth={2} aria-hidden />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="hospital-auth-input"
                      autoComplete="current-password"
                      disabled={isSubmitting}
                      aria-label="Password"
                  />
                </div>
              </label>

              {error && <p className="hospital-auth-error">{error}</p>}

              <button type="submit" disabled={isSubmitting} className="hospital-auth-submit-btn">
                {isSubmitting ? 'Opening workspace...' : 'Sign In'}
              </button>

              <button type="button" onClick={onPass} className="hospital-auth-pass-btn">
                Pass for testing
              </button>
            </form>

            <div className="hospital-auth-footer">
              <ShieldCheck className="h-4 w-4" strokeWidth={2.2} />
              <span>Clinical workspace secure</span>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
