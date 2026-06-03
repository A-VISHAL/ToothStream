import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { HeartPulse, Lock, ShieldCheck, User, Mic, Activity, Stethoscope } from 'lucide-react';

interface LoginPageProps {
  onSignIn: (doctorName: string, remember?: boolean) => void;
  onPass: () => void;
}

const DEFAULT_DOCTOR_NAME = 'Doctor XX';
const DEFAULT_PASSWORD = 'dental123';

function VoiceWaveform() {
  const amps = [0.4, 0.7, 0.5, 0.9, 0.6, 1.0, 0.5, 0.8, 0.55, 0.95, 0.4, 0.75, 0.85, 0.5, 1.0, 0.6, 0.7, 0.4, 0.9, 0.55];
  return (
    <div className="lp-waveform" aria-hidden="true">
      {amps.map((amp, i) => (
        <motion.span
          key={i}
          className="lp-wave-bar"
          animate={{ scaleY: [amp * 0.5, amp, amp * 0.35, amp * 0.78, amp * 0.5] }}
          transition={{ duration: 2.1, repeat: Infinity, delay: i * 0.09, ease: 'easeInOut' }}
        />
      ))}
    </div>
  );
}

function AIOrb() {
  return (
    <div className="lp-orb-wrap" aria-hidden="true">
      <motion.div
        className="lp-orb-ring lp-orb-ring-outer"
        animate={{ scale: [1, 1.4, 1], opacity: [0.5, 0, 0.5] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="lp-orb-ring lp-orb-ring-mid"
        animate={{ scale: [1, 1.7, 1], opacity: [0.22, 0, 0.22] }}
        transition={{ duration: 3, repeat: Infinity, delay: 0.55, ease: 'easeInOut' }}
      />
      <motion.div
        className="lp-orb-core"
        animate={{ y: [0, -10, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      >
        <Mic className="w-9 h-9 text-white" strokeWidth={1.8} />
      </motion.div>
    </div>
  );
}

function HeroStatCard({
  icon: Icon,
  value,
  label,
  delay,
}: {
  icon: React.ElementType;
  value: string;
  label: string;
  delay: number;
}) {
  return (
    <motion.div
      className="lp-stat-card"
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, delay, ease: 'easeOut' }}
    >
      <span className="lp-stat-icon-wrap">
        <Icon className="w-4 h-4" strokeWidth={2} />
      </span>
      <div className="lp-stat-text">
        <p className="lp-stat-value">{value}</p>
        <p className="lp-stat-label">{label}</p>
      </div>
    </motion.div>
  );
}

function HeroPanel() {
  return (
    <div className="lp-hero" aria-label="Product overview">
      <div className="lp-hero-bg-1" />
      <div className="lp-hero-bg-2" />
      <div className="lp-hero-grid" />

      <div className="lp-hero-inner">
        <motion.span
          className="lp-kicker"
          initial={{ opacity: 0, y: -14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <span className="lp-kicker-dot" />
          AI-Powered · Clinical Grade · Real-time
        </motion.span>

        <motion.h1
          className="lp-hero-headline"
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
        >
          AI-Powered<br />
          <span className="lp-headline-accent">Periodontal</span><br />
          Charting
        </motion.h1>

        <motion.p
          className="lp-hero-sub"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          Real-time voice charting for modern dental practices.
        </motion.p>

        <motion.div
          className="lp-visual"
          initial={{ opacity: 0, scale: 0.88 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, delay: 0.4 }}
        >
          <AIOrb />
          <VoiceWaveform />
          <p className="lp-live-tag">
            <span className="lp-live-dot" />
            Live transcription active
          </p>
        </motion.div>

        <div className="lp-stats">
          <HeroStatCard icon={Activity} value="< 50ms" label="Chart latency" delay={0.55} />
          <HeroStatCard icon={Stethoscope} value="32 Teeth" label="Full arch" delay={0.65} />
          <HeroStatCard icon={ShieldCheck} value="HIPAA" label="Ready" delay={0.75} />
        </div>
      </div>
    </div>
  );
}

export function LoginPage({ onSignIn, onPass }: LoginPageProps) {
  const [doctorName, setDoctorName] = useState(DEFAULT_DOCTOR_NAME);
  const [password, setPassword] = useState(DEFAULT_PASSWORD);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [focused, setFocused] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const name = doctorName.trim();
    const pass = password.trim();
    if (name !== DEFAULT_DOCTOR_NAME || pass !== DEFAULT_PASSWORD) {
      setError('Invalid credentials — use: Doctor XX / dental123');
      return;
    }
    setIsSubmitting(true);
    setError(null);
    setTimeout(() => onSignIn(name), 700);
  };

  return (
    <div className="lp-shell">
      <div className="lp-ambient" aria-hidden="true">
        <div className="lp-ambient-1" />
        <div className="lp-ambient-2" />
      </div>

      <div className="lp-layout">
        <HeroPanel />

        <motion.div
          className="lp-auth-pane"
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2, ease: 'easeOut' }}
        >
          <div className="lp-auth-card">
            <div className="lp-auth-header">
              <span className="lp-auth-badge">
                <HeartPulse className="h-3.5 w-3.5" strokeWidth={2.2} />
                Clinical Access
              </span>
              <h2 className="lp-auth-title">Welcome back</h2>
              <p className="lp-auth-subtitle">Sign in to your clinical workspace</p>
            </div>

            <form onSubmit={handleSubmit} className="lp-form">
              <div className="lp-field">
                <label className="lp-field-label" htmlFor="lp-doctor-name">Doctor Name</label>
                <div className={`lp-input-shell${focused === 'name' ? ' is-focused' : ''}`}>
                  <User className="lp-input-ico" strokeWidth={2} aria-hidden />
                  <input
                    id="lp-doctor-name"
                    type="text"
                    value={doctorName}
                    onChange={(e) => setDoctorName(e.target.value)}
                    onFocus={() => setFocused('name')}
                    onBlur={() => setFocused(null)}
                    className="lp-input"
                    autoComplete="name"
                    disabled={isSubmitting}
                    autoFocus
                    aria-label="Doctor name"
                  />
                </div>
              </div>

              <div className="lp-field">
                <label className="lp-field-label" htmlFor="lp-password">Password</label>
                <div className={`lp-input-shell${focused === 'password' ? ' is-focused' : ''}`}>
                  <Lock className="lp-input-ico" strokeWidth={2} aria-hidden />
                  <input
                    id="lp-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onFocus={() => setFocused('password')}
                    onBlur={() => setFocused(null)}
                    className="lp-input"
                    autoComplete="current-password"
                    disabled={isSubmitting}
                    aria-label="Password"
                  />
                </div>
              </div>

              {error != null && (
                <motion.p
                  className="lp-error"
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.22 }}
                >
                  {error}
                </motion.p>
              )}

              <motion.button
                type="submit"
                disabled={isSubmitting}
                className="lp-submit"
                whileHover={{ scale: 1.012, y: -2 }}
                whileTap={{ scale: 0.978 }}
              >
                {isSubmitting ? (
                  <span className="lp-spinner-row">
                    <motion.span
                      className="lp-spinner"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 0.7, repeat: Infinity, ease: 'linear' }}
                    />
                    Opening workspace…
                  </span>
                ) : (
                  'Sign In'
                )}
              </motion.button>

              <button type="button" onClick={onPass} className="lp-ghost">
                Continue without signing in
              </button>
            </form>

            <div className="lp-auth-footer">
              <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-slate-400" strokeWidth={2.2} />
              Secure clinical workspace
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
