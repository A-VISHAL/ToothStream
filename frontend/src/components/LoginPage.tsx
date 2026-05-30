import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Activity,
  HeartPulse,
  Lock,
  Mic,
  ShieldCheck,
  Sparkles,
  User,
  Waves,
  Wifi,
} from 'lucide-react';
import { LoginWorkspacePreview } from './LoginWorkspacePreview';

interface LoginPageProps {
  onSignIn: (doctorName: string) => void;
}

const DEFAULT_DOCTOR_NAME = 'Doctor XX';
const DEFAULT_PASSWORD = 'dental123';

const CLINICAL_STATS = [
  { label: 'Teeth charted', value: '32', hint: 'Full arch visibility' },
  { label: 'Transcription', value: 'Live', hint: 'Deepgram stream' },
  { label: 'Latency', value: '<120ms', hint: 'Clinical response' },
] as const;

const CAPABILITIES = [
  'Real-time voice charting with periodontal site mapping',
  'Clinical AI workflow with command feedback toasts',
  'Deepgram live transcription and websocket status',
  'SVG perio chart matching the production workspace',
] as const;

function ClinicBackdrop() {
  return (
    <div className="auth-backdrop" aria-hidden="true">
      <div className="auth-backdrop-glow auth-backdrop-glow-left" />
      <div className="auth-backdrop-glow auth-backdrop-glow-right" />
      <svg className="auth-backdrop-grid" width="100%" height="100%">
        <defs>
          <pattern id="clinicGrid" width="48" height="48" patternUnits="userSpaceOnUse">
            <path d="M 48 0 L 0 0 0 48" fill="none" stroke="rgba(148,163,184,0.14)" strokeWidth="0.6" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#clinicGrid)" />
      </svg>
    </div>
  );
}

function SectionHeader({ index, title, badge }: { index: string; title: string; badge?: React.ReactNode }) {
  return (
    <div className="auth-section-header">
      <div className="auth-section-header-left">
        <span className="auth-section-index">{index}</span>
        <span className="auth-section-title">{title}</span>
      </div>
      {badge}
    </div>
  );
}

function FloatingTooth3D() {
  return (
    <motion.div
      className="auth-tooth-3d-scene"
      animate={{ y: [0, -6, 0] }}
      transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
    >
      <div className="auth-tooth-plinth" />
      <div className="auth-tooth-shadow" />
      <div className="auth-tooth-body">
        <svg viewBox="0 0 240 240" className="auth-tooth-svg" fill="none" aria-hidden="true">
          <defs>
            <linearGradient id="clinicalMolar" x1="120" y1="24" x2="120" y2="216" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="55%" stopColor="#f0f7fb" />
              <stop offset="100%" stopColor="#c8dae6" />
            </linearGradient>
            <linearGradient id="clinicalEdge" x1="40" y1="40" x2="200" y2="200" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#dce8ef" />
              <stop offset="100%" stopColor="#5f8fa8" />
            </linearGradient>
            <filter id="toothDepth" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="8" stdDeviation="6" floodColor="#5f8fa8" floodOpacity="0.18" />
            </filter>
          </defs>
          <path
            filter="url(#toothDepth)"
            d="M70 52c10-8 24-12 36-9 7 2 12 5 14 5s7-3 14-5c12-3 26 1 36 9 10 9 14 20 15 32 1 10-1 18-2 26-1 10-1 20 2 32 3 14 2 26-4 36-6 9-16 14-28 13-11-1-20-8-27-18-4-6-7-15-10-24-2-7-5-14-10-14s-8 7-10 14c-3 9-6 18-10 24-7 10-16 17-27 18-12 1-22-4-28-13-6-10-7-22-4-36 3-12 3-22 2-32-1-8-3-16-2-26 1-12 5-23 15-32Z"
            fill="url(#clinicalMolar)"
            stroke="url(#clinicalEdge)"
            strokeWidth="2.4"
            strokeLinejoin="round"
          />
          <path
            d="M120 72c-2 12-7 20-18 25M120 72c2 12 7 20 18 25M120 72v30"
            stroke="#7ca7c4"
            strokeWidth="1.8"
            strokeLinecap="round"
            opacity="0.8"
          />
        </svg>
      </div>
      <div className="auth-tooth-badge auth-tooth-badge-a">
        <HeartPulse className="h-3.5 w-3.5" strokeWidth={2.2} />
      </div>
      <div className="auth-tooth-badge auth-tooth-badge-b">
        <Mic className="h-3.5 w-3.5" strokeWidth={2.2} />
      </div>
      <div className="auth-tooth-badge auth-tooth-badge-c">
        <Activity className="h-3.5 w-3.5" strokeWidth={2.2} />
      </div>
    </motion.div>
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
    setIsSubmitting(true);
    setError(null);
    onSignIn(trimmedDoctorName);
  };

  return (
    <div className="app-shell auth-shell">
      <ClinicBackdrop />

      <motion.div
        className="auth-page"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.35 }}
      >
        <div className="auth-layout">
          <main className="auth-main">
            <section className="auth-section auth-section-compact">
              <SectionHeader index="01" title="Product overview & metrics" />
              <div className="auth-section-body auth-section-body-intro">
                <div className="auth-intro-brand">
                  <div style={{display: 'flex', alignItems: 'flex-start', gap: '20px'}}>
                    <div style={{flex: '1 1 auto'}}>
                      <p className="auth-hero-header">Dental Voice Charting AI</p>
                      <h1 className="auth-hero-title">AI-assisted periodontal charting</h1>
                      <p className="auth-hero-subtitle">
                        Real-time speech recognition, intelligent clinical parsing, and live periodontal charting built for professional dental workflows.
                      </p>

                      <ul className="auth-capability-strip" aria-label="Platform capabilities">
                        {CAPABILITIES.slice(0,3).map((item) => (
                          <li key={item}>
                            <ShieldCheck className="auth-capability-icon h-3.5 w-3.5" strokeWidth={2.2} />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div style={{width: '340px', flexShrink: 0}}>
                      <div className="auth-3d-well-large">
                        <FloatingTooth3D />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="auth-intro-metrics">
                  <div className="auth-stat-row">
                    {CLINICAL_STATS.map((stat) => (
                      <div key={stat.label} className="auth-stat-cell">
                        <span className="auth-stat-label">{stat.label}</span>
                        <strong className="auth-stat-value">{stat.value}</strong>
                        <span className="auth-stat-hint">{stat.hint}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            <section className="auth-section auth-section-demo">
              <SectionHeader
                index="02"
                title="Visualization & live demo"
                badge={
                  <span className="auth-preview-live">
                    <span className="auth-preview-live-dot" />
                    Live demo
                  </span>
                }
              />
              <div className="auth-section-body auth-section-body-split">
                <div className="auth-split-col auth-split-col-3d">
                  <p className="auth-split-label">3D reference</p>
                  <div className="auth-3d-well">
                    <FloatingTooth3D />
                  </div>
                </div>
                <div className="auth-split-col auth-split-col-preview">
                  <p className="auth-split-label">Workspace preview</p>
                  <div className="auth-preview-well panel-surface">
                    <LoginWorkspacePreview />
                  </div>
                </div>
              </div>
            </section>
          </main>

          <aside className="auth-aside">
            <section className="auth-section auth-section-access">
              <SectionHeader index="03" title="Clinician access" />
              <div className="auth-section-body auth-section-body-access">
                <div className="auth-session-row">
                  <span className="auth-session-item">
                    <Wifi className="h-3.5 w-3.5" strokeWidth={2.2} />
                    Websocket ready
                  </span>
                  <span className="auth-session-item">
                    <Waves className="h-3.5 w-3.5" strokeWidth={2.2} />
                    Deepgram STT
                  </span>
                  <span className="auth-session-item auth-session-item-live">
                    <span className="auth-session-pulse" />
                    Clinical mode
                  </span>
                </div>

                <div className="auth-signin-well">
                  <span className="auth-signin-badge">
                    <Sparkles className="h-3.5 w-3.5" strokeWidth={2.2} />
                    Clinician portal
                  </span>
                  <h2 className="auth-signin-title">Secure clinician access</h2>
                  <p className="auth-signin-lead">Sign in to open the live charting workspace.</p>

                  <form className="auth-form" onSubmit={handleSubmit}>
                    <label className="auth-field">
                      <span className="auth-input-label">Doctor</span>
                      <div className="auth-input-shell">
                        <User className="auth-input-icon" strokeWidth={2} aria-hidden />
                        <input
                          type="text"
                          value={doctorName}
                          onChange={(e) => setDoctorName(e.target.value)}
                          className="auth-input"
                          autoComplete="name"
                          disabled={isSubmitting}
                        />
                      </div>
                    </label>
                    <label className="auth-field">
                      <span className="auth-input-label">Password</span>
                      <div className="auth-input-shell">
                        <Lock className="auth-input-icon" strokeWidth={2} aria-hidden />
                        <input
                          type="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="auth-input"
                          autoComplete="current-password"
                          disabled={isSubmitting}
                        />
                      </div>
                    </label>
                    {error && <p className="auth-error">{error}</p>}
                    <button type="submit" disabled={isSubmitting} className="auth-submit-btn">
                      {isSubmitting ? 'Opening workspace...' : 'Sign In'}
                    </button>
                  </form>
                </div>
              </div>
            </section>
          </aside>
        </div>
      </motion.div>
    </div>
  );
}
