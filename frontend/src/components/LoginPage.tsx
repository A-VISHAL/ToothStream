import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { HeartPulse, Lock, Mic, ShieldCheck, Stethoscope, User, Zap } from 'lucide-react';

interface LoginPageProps {
  onSignIn: (doctorName: string) => void;
  onPass: () => void;
}

const DEFAULT_NAME = 'Doctor XX';
const DEFAULT_PASS = 'dental123';

/* ── Tiny animated waveform inside the brand icon ── */
function MiniWave() {
  const h = [0.4, 0.8, 0.55, 1, 0.65, 0.9, 0.5, 0.75, 0.45, 0.85];
  return (
    <div className="lp-mini-wave" aria-hidden="true">
      {h.map((amp, i) => (
        <motion.span
          key={i}
          className="lp-mini-bar"
          animate={{ scaleY: [amp * 0.5, amp, amp * 0.35, amp, amp * 0.5] }}
          transition={{ duration: 1.8, repeat: Infinity, delay: i * 0.12, ease: 'easeInOut' }}
        />
      ))}
    </div>
  );
}

/* ── Feature chip at bottom ── */
function Chip({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <div className="lp-chip">
      <Icon className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
      {label}
    </div>
  );
}

/* ── Floating background orbs (CSS animated) ── */
function BgOrbs() {
  return (
    <div className="lp-orbs" aria-hidden="true">
      <div className="lp-orb lp-orb-a" />
      <div className="lp-orb lp-orb-b" />
      <div className="lp-orb lp-orb-c" />
      <div className="lp-bg-grid" />
    </div>
  );
}

/* variants — no inline ease to stay compatible with framer-motion v12 types */
const cardVariants = {
  hidden: { opacity: 0, y: 32, scale: 0.97 },
  visible: { opacity: 1, y: 0, scale: 1 },
};

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07, delayChildren: 0.15 } },
};
const rowIn = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0 },
};

export function LoginPage({ onSignIn, onPass }: LoginPageProps) {
  const [name, setName] = useState(DEFAULT_NAME);
  const [pass, setPass] = useState(DEFAULT_PASS);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim() !== DEFAULT_NAME || pass.trim() !== DEFAULT_PASS) {
      setError('Incorrect credentials — try: Doctor XX / dental123');
      return;
    }
    setLoading(true);
    setError(null);
    setTimeout(() => onSignIn(name.trim()), 800);
  };

  return (
    <div className="lp-shell">
      <BgOrbs />

      {/* ── Top brand bar ── */}
      <motion.nav
        className="lp-topbar"
        initial={{ opacity: 0, y: -14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
      >
        <div className="lp-topbar-brand">
          <div className="lp-topbar-icon">
            <Stethoscope className="h-4 w-4 text-white" strokeWidth={2} />
          </div>
          <span className="lp-topbar-name">ToothStream</span>
        </div>
        <div className="lp-topbar-right">
          <span className="lp-topbar-badge">
            <span className="lp-topbar-dot" />
            Live Demo
          </span>
        </div>
      </motion.nav>

      {/* ── Center content ── */}
      <div className="lp-center">
        {/* Auth card */}
        <motion.div
          className="lp-card"
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          transition={{ duration: 0.55, ease: 'easeOut' }}
        >
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            transition={{ duration: 0.4 }}
          >
            {/* Brand mark */}
            <motion.div className="lp-brand-mark" variants={rowIn}>
              <div className="lp-brand-icon">
                <Mic className="h-6 w-6 text-white" strokeWidth={1.8} />
              </div>
              <MiniWave />
            </motion.div>

            {/* Headline */}
            <motion.div className="lp-card-head" variants={rowIn}>
              <h1 className="lp-card-title">Sign in to ToothStream</h1>
              <p className="lp-card-sub">AI-Powered Periodontal Charting Platform</p>
            </motion.div>

            <motion.hr className="lp-hr" variants={rowIn} />

            {/* Form */}
            <form onSubmit={handleSubmit} className="lp-form">
              <motion.div className="lp-field" variants={rowIn}>
                <label className="lp-label" htmlFor="ln-name">Doctor Name</label>
                <div className={`lp-input-wrap${focused === 'name' ? ' focused' : ''}`}>
                  <User className="lp-ico" strokeWidth={2} aria-hidden />
                  <input
                    id="ln-name"
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    onFocus={() => setFocused('name')}
                    onBlur={() => setFocused(null)}
                    className="lp-inp"
                    autoComplete="name"
                    autoFocus
                    disabled={loading}
                    aria-label="Doctor name"
                  />
                </div>
              </motion.div>

              <motion.div className="lp-field" variants={rowIn}>
                <label className="lp-label" htmlFor="ln-pass">Password</label>
                <div className={`lp-input-wrap${focused === 'pass' ? ' focused' : ''}`}>
                  <Lock className="lp-ico" strokeWidth={2} aria-hidden />
                  <input
                    id="ln-pass"
                    type="password"
                    value={pass}
                    onChange={e => setPass(e.target.value)}
                    onFocus={() => setFocused('pass')}
                    onBlur={() => setFocused(null)}
                    className="lp-inp"
                    autoComplete="current-password"
                    disabled={loading}
                    aria-label="Password"
                  />
                </div>
              </motion.div>

              {error != null && (
                <motion.p
                  className="lp-err"
                  initial={{ opacity: 0, y: -8, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: 'auto' }}
                  exit={{ opacity: 0, y: -8, height: 0 }}
                  transition={{ duration: 0.22 }}
                >
                  {error}
                </motion.p>
              )}

              <motion.div variants={rowIn}>
                <motion.button
                  type="submit"
                  disabled={loading}
                  className="lp-btn-primary"
                  whileHover={loading ? {} : { scale: 1.012, y: -2 }}
                  whileTap={loading ? {} : { scale: 0.978 }}
                >
                  {loading ? (
                    <span className="lp-spin-row">
                      <motion.span
                        className="lp-spinner"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 0.7, repeat: Infinity, ease: 'linear' }}
                      />
                      Opening workspace…
                    </span>
                  ) : 'Sign In'}
                </motion.button>
              </motion.div>

              <motion.div variants={rowIn}>
                <button type="button" onClick={onPass} className="lp-btn-ghost">
                  Continue without signing in
                </button>
              </motion.div>
            </form>

            <motion.div className="lp-footer" variants={rowIn}>
              <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-slate-400" strokeWidth={2} />
              End-to-end secure · HIPAA-ready workspace
            </motion.div>
          </motion.div>
        </motion.div>

        {/* Feature chips below card */}
        <motion.div
          className="lp-chips"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
        >
          <Chip icon={Zap} label="< 50ms latency" />
          <Chip icon={Stethoscope} label="32-tooth chart" />
          <Chip icon={HeartPulse} label="Deepgram AI" />
          <Chip icon={ShieldCheck} label="HIPAA ready" />
        </motion.div>
      </div>
    </div>
  );
}
