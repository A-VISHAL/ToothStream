import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';

interface LoginPageProps {
  onSignIn: (doctorName: string) => void;
}

const DEFAULT_DOCTOR_NAME = 'Doctor XX';
const DEFAULT_PASSWORD = 'dental123';

const FEATURE_ITEMS = [
  {
    title: 'Real-time voice charting',
    icon: 'mic',
    accent: 'teal',
  },
  {
    title: 'Clinical AI workflow',
    icon: 'brain',
    accent: 'blue',
  },
  {
    title: 'Deepgram live transcription',
    icon: 'wave',
    accent: 'teal',
  },
] as const;

const BACKGROUND_BADGES = [
  { icon: 'shield', top: '10%', left: '8%', delay: 0 },
  { icon: 'brain', top: '18%', right: '8%', delay: 1.3 },
  { icon: 'check', bottom: '16%', left: '15%', delay: 2.1 },
  { icon: 'shield', bottom: '12%', right: '14%', delay: 0.8 },
] as const;

const PARTICLES = Array.from({ length: 18 }, (_, index) => ({
  id: index,
  size: 3 + (index % 4),
  left: `${(index * 7) % 100}%`,
  top: `${(index * 11) % 100}%`,
  delay: (index % 6) * 0.7,
  duration: 11 + (index % 5) * 2,
}));

function ShieldIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden="true">
      <path
        d="M12 3 19 6.5V12c0 4.7-3.1 8.7-7 9-3.9-.3-7-4.3-7-9V6.5L12 3Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path d="m9.2 12.1 1.8 1.8 3.9-4.1" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PersonIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden="true">
      <path d="M12 12.2a4 4 0 1 0-4-4 4 4 0 0 0 4 4Z" stroke="currentColor" strokeWidth="1.7" />
      <path d="M5.5 20c1.6-3.2 4.2-4.8 6.5-4.8S16.9 16.8 18.5 20" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function LockIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden="true">
      <path d="M8 11V8.7a4 4 0 0 1 8 0V11" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <rect x="6" y="11" width="12" height="9" rx="2.2" stroke="currentColor" strokeWidth="1.7" />
      <path d="M12 14.1v2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function BrainIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden="true">
      <path d="M9 5.5a2.5 2.5 0 0 1 4.8-1 2.5 2.5 0 0 1 3.8 2.1 2.7 2.7 0 0 1 1.4 4.9A2.5 2.5 0 0 1 18 16a2.4 2.4 0 0 1-1.9 2.3 2.3 2.3 0 0 1-4.5 0H10a2.3 2.3 0 0 1-4.5 0A2.4 2.4 0 0 1 3.6 16a2.5 2.5 0 0 1 .8-4.5A2.7 2.7 0 0 1 5.8 6.6 2.5 2.5 0 0 1 9 5.5Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
      <path d="M9 8.2v8.1M12 6.7v10.8M15 8.2v8.1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.75" />
      <circle cx="8.7" cy="7.8" r="0.8" fill="currentColor" />
      <circle cx="15.3" cy="7.8" r="0.8" fill="currentColor" />
      <circle cx="12" cy="11.9" r="0.9" fill="currentColor" />
    </svg>
  );
}

function WaveIcon() {
  return (
    <div className="flex h-5 items-end gap-[3px]" aria-hidden="true">
      {[10, 16, 7, 14, 9, 18].map((height, index) => (
        <span
          key={height}
          className="auth-wave-bar"
          style={{
            height,
            animationDelay: `${index * 0.12}s`,
          }}
        />
      ))}
    </div>
  );
}

function BadgeIcon({ icon }: { icon: 'shield' | 'brain' | 'check' }) {
  if (icon === 'brain') {
    return <BrainIcon className="h-4 w-4" />;
  }

  if (icon === 'check') {
    return (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden="true">
        <path d="m7.5 12.5 3 3L16.8 9" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.2" opacity="0.6" />
      </svg>
    );
  }

  return <ShieldIcon className="h-4 w-4" />;
}

function FloatingParticles() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {PARTICLES.map((particle) => (
        <motion.span
          key={particle.id}
          className="auth-particle"
          style={{
            left: particle.left,
            top: particle.top,
            width: particle.size,
            height: particle.size,
          }}
          animate={{ y: [0, -24, -8, -30], opacity: [0.18, 0.5, 0.26, 0.42] }}
          transition={{
            duration: particle.duration,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: particle.delay,
          }}
        />
      ))}
    </div>
  );
}

function BackgroundBadges() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {BACKGROUND_BADGES.map((badge) => (
        <motion.div
          key={`${badge.icon}-${badge.delay}`}
          className="auth-badge-shell"
          style={{ top: badge.top, left: badge.left, right: badge.right, bottom: badge.bottom }}
          animate={{ y: [0, -10, 0], rotate: [0, 4, 0] }}
          transition={{ duration: 7.5, repeat: Infinity, ease: 'easeInOut', delay: badge.delay }}
        >
          <BadgeIcon icon={badge.icon} />
        </motion.div>
      ))}
    </div>
  );
}

function FloatingTooth() {
  return (
    <div className="relative mx-auto flex h-[280px] w-[280px] items-center justify-center">
      <div className="auth-orbit-ring" />
      <div className="auth-orbit-ring auth-orbit-ring-secondary" />
      <motion.div
        className="auth-tooth-float relative z-10"
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
      >
        <svg viewBox="0 0 240 240" className="h-[210px] w-[210px] drop-shadow-[0_18px_34px_rgba(0,0,0,0.45)]" fill="none" aria-hidden="true">
          <defs>
            <linearGradient id="toothGloss" x1="58" y1="30" x2="170" y2="190" gradientUnits="userSpaceOnUse">
              <stop stopColor="#ffffff" />
              <stop offset="0.55" stopColor="#f8fdff" />
              <stop offset="1" stopColor="#d8eef7" />
            </linearGradient>
            <linearGradient id="toothEdge" x1="90" y1="40" x2="150" y2="184" gradientUnits="userSpaceOnUse">
              <stop stopColor="rgba(255,255,255,0.75)" />
              <stop offset="1" stopColor="rgba(14,165,233,0.24)" />
            </linearGradient>
          </defs>
          <path
            d="M91 56c8-7 18-11 29-11 13 0 23 5 30 11 9 8 14 19 16 31 1 8 0 15-1 23-1 9-1 18 2 30 3 13 2 24-4 34-5 8-14 13-25 12-10-1-18-7-24-16-4-6-7-14-9-22-2-7-5-14-9-14s-7 7-9 14c-2 8-5 16-9 22-6 9-14 15-24 16-11 1-20-4-25-12-6-10-7-21-4-34 3-12 3-21 2-30-1-8-2-15-1-23 2-12 7-23 16-31 7-6 17-11 30-11 11 0 21 4 29 11Z"
            fill="url(#toothGloss)"
            stroke="url(#toothEdge)"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <path
            d="M91 58c11 2 20 7 29 7s18-5 29-7"
            stroke="rgba(255,255,255,0.55)"
            strokeWidth="4"
            strokeLinecap="round"
          />
          <path
            d="M118 84c-5 14-7 30-6 48"
            stroke="rgba(255,255,255,0.44)"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </svg>
      </motion.div>
      <div className="auth-tooth-shadow absolute bottom-10 left-1/2 h-6 w-40 -translate-x-1/2 rounded-full bg-cyan-400/20 blur-2xl" />
    </div>
  );
}

function OrbitalScanner() {
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center" aria-hidden="true">
      <div className="auth-orbit-grid" />
      <motion.div className="auth-orbit-trace" animate={{ rotate: 360 }} transition={{ duration: 8, repeat: Infinity, ease: 'linear' }} />
    </div>
  );
}

export function LoginPage({ onSignIn }: LoginPageProps) {
  const [doctorName, setDoctorName] = useState(DEFAULT_DOCTOR_NAME);
  const [password, setPassword] = useState(DEFAULT_PASSWORD);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const featureItems = useMemo(() => FEATURE_ITEMS, []);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedDoctorName = doctorName.trim();
    const trimmedPassword = password.trim();
    const isValid = trimmedDoctorName === DEFAULT_DOCTOR_NAME && trimmedPassword === DEFAULT_PASSWORD;

    if (!isValid) {
      setError('Invalid credentials');
      return;
    }
        <div className="app-shell auth-shell min-h-screen px-4 py-4 sm:px-6 lg:px-8">
          <FloatingParticles />
          <BackgroundBadges />

          <div className="auth-grid relative mx-auto grid min-h-[calc(100vh-2rem)] w-full max-w-[1560px] items-center gap-6 lg:grid-cols-[minmax(0,1.55fr)_minmax(370px,0.85fr)] lg:gap-8">
    setIsSubmitting(true);
              className="auth-hero-panel order-2 flex min-h-[560px] flex-col overflow-hidden rounded-[32px] p-6 text-white lg:order-1 lg:p-8"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.42, ease: 'easeOut' }}
    <div className="app-shell auth-shell min-h-screen px-4 py-4 sm:px-6 lg:px-8">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(0,201,177,0.18),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(14,165,233,0.14),transparent_30%)]" />
              <div className="relative z-10 flex h-full flex-col justify-between gap-8">
                <div className="max-w-2xl">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.5em] text-cyan-200/90">Dental Voice Charting AI</p>
                  <h1 className="mt-4 max-w-xl bg-gradient-to-r from-white via-slate-100 to-cyan-200 bg-clip-text text-4xl font-semibold tracking-tight text-transparent sm:text-5xl xl:text-[48px] xl:leading-[1.02]">
                    AI-assisted periodontal charting
                  </h1>
                  <p className="mt-4 max-w-2xl text-sm leading-7 text-white/65 sm:text-[15px]">
                    Real-time speech recognition, intelligent parsing, and live periodontal charting designed for clinical workflow.
                  </p>
                </div>

                <div className="relative flex min-h-[320px] items-center justify-center lg:justify-start">
                  <OrbitalScanner />
                  <FloatingTooth />
                </div>

                <div className="grid gap-3 xl:max-w-[720px]">
                  {featureItems.map((item, index) => (
                    <motion.div
                      key={item.title}
                      className="auth-feature-pill group flex items-center gap-4 rounded-[18px] border border-white/10 bg-white/5 px-4 py-4 text-sm text-white/80 shadow-[0_18px_38px_rgba(0,0,0,0.16)] backdrop-blur-[20px]"
                      initial={{ opacity: 0, x: -16 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.16 * index, duration: 0.32, ease: 'easeOut' }}
                      whileHover={{ y: -2 }}
                    >
                      <span className="auth-feature-icon relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-cyan-200">
                        {item.icon === 'mic' ? <PersonIcon className="h-5 w-5 opacity-0" /> : null}
                        {item.icon === 'brain' ? <BrainIcon className="h-5 w-5" /> : null}
                        {item.icon === 'wave' ? <WaveIcon /> : null}
                        {item.icon === 'mic' ? <div className="auth-mic-ring absolute inset-0 rounded-2xl border border-cyan-300/40" /> : null}
                        {item.icon === 'mic' ? <svg viewBox="0 0 24 24" className="absolute h-5 w-5 text-cyan-200" fill="none" aria-hidden="true"><path d="M12 14.5a3 3 0 0 0 3-3V7a3 3 0 0 0-6 0v4.5a3 3 0 0 0 3 3Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /><path d="M8.5 11.4a3.5 3.5 0 0 0 7 0" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /><path d="M12 14.5v2.1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg> : null}
                      </span>
                      <span className="min-w-0 flex-1">{item.title}</span>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.section>

            <motion.section
              className="auth-signin-tilt order-1 w-full max-w-[420px] justify-self-end rounded-[30px] border border-white/30 bg-white px-6 py-7 shadow-[0_28px_90px_rgba(0,0,0,0.28)] lg:order-2"
              initial={{ opacity: 0, y: 18, rotateY: -5 }}
              animate={{ opacity: 1, y: 0, rotateY: -5 }}
              whileHover={{ rotateY: 0 }}
              transition={{ duration: 0.36, ease: 'easeOut' }}
              style={{ transformStyle: 'preserve-3d' }}
            >
              <div className="mb-6 flex flex-col items-start gap-4">
                <div className="auth-shield-badge flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-200/50 bg-cyan-50 text-cyan-700 shadow-[0_10px_24px_rgba(14,165,233,0.1)]">
                  <ShieldIcon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.45em] text-cyan-600">Secure clinician access</p>
                  <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">Sign in</h2>
                </div>
              </div>

              <form className="space-y-4" onSubmit={handleSubmit}>
                <label className="block space-y-2">
                  <span className="text-sm font-medium text-slate-700">Doctor</span>
                  <div className="auth-input-shell">
                    <span className="auth-input-icon">
                      <PersonIcon />
                    </span>
                    <input
                      type="text"
                      value={doctorName}
                      onChange={(event) => setDoctorName(event.target.value)}
                      className="auth-input w-full rounded-xl border border-slate-200 bg-white px-11 py-3 text-[15px] text-slate-950 outline-none transition-all duration-200 placeholder:text-slate-400 focus:border-cyan-300 focus:ring-4 focus:ring-cyan-200/50"
                      autoComplete="name"
                    />
                  </div>
                </label>

                <label className="block space-y-2">
                  <span className="text-sm font-medium text-slate-700">Password</span>
                  <div className="auth-input-shell">
                    <span className="auth-input-icon">
                      <LockIcon />
                    </span>
                    <input
                      type="password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      className="auth-input w-full rounded-xl border border-slate-200 bg-white px-11 py-3 text-[15px] text-slate-950 outline-none transition-all duration-200 placeholder:text-slate-400 focus:border-cyan-300 focus:ring-4 focus:ring-cyan-200/50"
                      autoComplete="current-password"
                    />
                  </div>
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
                  className="auth-submit-btn w-full rounded-2xl bg-black px-5 py-3.5 text-sm font-semibold text-white shadow-[0_16px_36px_rgba(0,0,0,0.28)] transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-cyan-200 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  Sign In
                </button>
              </form>
          animate={{ opacity: 1, y: 0 }}
                </p>
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
