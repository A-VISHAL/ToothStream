import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Activity,
  CheckCircle2,
  CircleDot,
  Mic,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Workflow,
  ArrowRight,
  type LucideIcon,
} from 'lucide-react';

interface ClinicalOverviewPageProps {
  doctorName: string;
  onGetStarted: () => void;
}

type FeatureId = 'voice' | 'chart' | 'workflow' | 'security' | 'dashboard';

const FEATURES: Array<{
  id: FeatureId;
  title: string;
  description: string;
  icon: LucideIcon;
  color: string;
  bgColor: string;
  bullets: string[];
}> = [
  {
    id: 'voice',
    title: 'Live Voice Charting',
    description: 'Speak periodontal findings and keep the chart moving without breaking clinical flow.',
    icon: Mic,
    color: 'text-cyan-600',
    bgColor: 'bg-cyan-50 border-cyan-200',
    bullets: ['< 50ms capture latency', 'Dental command parsing', 'Real-time feedback'],
  },
  {
    id: 'chart',
    title: 'Interactive Perio Chart',
    description: 'Full mouth chart updates in real time with site-level depth, bleeding, and surface awareness.',
    icon: Stethoscope,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50 border-blue-200',
    bullets: ['32-tooth full arch', 'Surface-aware updates', 'Clinical site tracking'],
  },
  {
    id: 'workflow',
    title: 'Clinical State Machine',
    description: 'Stay on the same tooth until findings are complete, then advance explicitly. No premature jumps.',
    icon: Workflow,
    color: 'text-violet-600',
    bgColor: 'bg-violet-50 border-violet-200',
    bullets: ['Tooth-commit tracking', 'Explicit navigation', 'Zero drift'],
  },
  {
    id: 'security',
    title: 'Hospital-Style Access',
    description: 'Clean, believable clinical UI with a daily-use SaaS feel and low-friction sign-in flow.',
    icon: ShieldCheck,
    color: 'text-teal-600',
    bgColor: 'bg-teal-50 border-teal-200',
    bullets: ['HIPAA-ready design', 'White clinical palette', 'Daily-use clarity'],
  },
  {
    id: 'dashboard',
    title: 'Live Dashboard Feedback',
    description: 'See transcript history, socket state, latency, and current tooth context in one place.',
    icon: Activity,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50 border-emerald-200',
    bullets: ['Transcript stream', 'Latency visibility', 'Debug tools'],
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.05 },
  },
};
const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: 'easeOut' as const } },
};

function FeatureCard({
  active,
  icon: Icon,
  title,
  description,
  bullets,
  color,
  bgColor,
  onClick,
}: {
  active: boolean;
  icon: LucideIcon;
  title: string;
  description: string;
  bullets: string[];
  color: string;
  bgColor: string;
  onClick: () => void;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      className={`feature-card group w-full text-left ${active ? 'active' : ''}`}
      variants={itemVariants}
      whileHover={{ y: -3 }}
      transition={{ duration: 0.18 }}
    >
      <div className="flex items-start gap-4">
        <span className={`rounded-xl border p-2.5 ${active ? bgColor : 'border-slate-200 bg-slate-50'} transition-all duration-200`}>
          <Icon className={`h-5 w-5 ${active ? color : 'text-slate-400'} transition-colors duration-200`} strokeWidth={2.2} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-base font-700 tracking-tight text-slate-900 font-bold">{title}</h3>
            {active && <CircleDot className={`h-4 w-4 shrink-0 ${color}`} strokeWidth={2.3} />}
          </div>
          <p className="mt-1.5 text-sm leading-5.5 text-slate-500">{description}</p>
          {active && (
            <motion.div
              className="mt-3 flex flex-wrap gap-1.5"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
            >
              {bullets.map((b) => (
                <span
                  key={b}
                  className={`rounded-full border px-2.5 py-0.5 text-[10.5px] font-semibold uppercase tracking-wide ${bgColor} ${color}`}
                >
                  {b}
                </span>
              ))}
            </motion.div>
          )}
        </div>
      </div>
    </motion.button>
  );
}

function ProgressSidebar({ onGetStarted }: { onGetStarted: () => void }) {
  const steps = [
    { label: 'Sign in', sub: 'Clinician authenticated', done: true },
    { label: 'Overview', sub: 'Platform tour — current', done: false, active: true },
    { label: 'Patient entry', sub: 'Set up patient record', done: false },
    { label: 'Chart workspace', sub: 'Live voice charting', done: false },
  ];

  return (
    <motion.aside
      className="space-y-4 xl:sticky xl:top-4"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.45, delay: 0.15, ease: 'easeOut' }}
    >
      {/* Progress card */}
      <div className="panel-surface rounded-[28px] p-5">
        <p className="text-[10.5px] font-bold uppercase tracking-[0.3em] text-slate-400">Onboarding</p>
        <h3 className="mt-2 text-xl font-bold tracking-tight text-slate-900">Your progress</h3>

        <div className="mt-4 space-y-1">
          {steps.map((step, i) => (
            <div key={step.label} className="relative">
              {i < steps.length - 1 && (
                <span
                  className={`absolute left-[13px] top-[30px] h-6 w-[1.5px] rounded-full ${step.done ? 'bg-blue-400' : 'bg-slate-200'}`}
                  aria-hidden
                />
              )}
              <div className="flex items-center gap-3 py-2">
                <span
                  className={`progress-step-dot ${
                    step.done ? 'done' : step.active ? 'active' : ''
                  }`}
                >
                  {step.done ? <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={2.5} /> : i + 1}
                </span>
                <div>
                  <p className={`text-sm font-semibold ${step.active ? 'text-slate-900' : step.done ? 'text-slate-600' : 'text-slate-400'}`}>
                    {step.label}
                  </p>
                  <p className="text-[11px] text-slate-400">{step.sub}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <motion.button
          type="button"
          onClick={onGetStarted}
          className="btn-primary mt-5 w-full"
          whileHover={{ scale: 1.01, y: -2 }}
          whileTap={{ scale: 0.98 }}
        >
          Continue to Patient Entry
          <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
        </motion.button>
      </div>

      {/* Quick stats card */}
      <div className="panel-surface rounded-[28px] p-5">
        <div className="flex items-center gap-2 text-cyan-700 mb-3">
          <Sparkles className="h-4 w-4" strokeWidth={2.2} />
          <p className="text-[10.5px] font-bold uppercase tracking-[0.28em]">Platform stats</p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {[
            { value: '32', label: 'Teeth tracked' },
            { value: '< 50ms', label: 'Avg latency' },
            { value: 'Live', label: 'Deepgram AI' },
            { value: '6+', label: 'Voice commands' },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-2xl border border-slate-100 bg-slate-50/80 p-3 hover-lift"
            >
              <p className="text-base font-extrabold tracking-tight text-slate-900">{stat.value}</p>
              <p className="mt-0.5 text-[10.5px] font-medium text-slate-500">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </motion.aside>
  );
}

export function ClinicalOverviewPage({ doctorName, onGetStarted }: ClinicalOverviewPageProps) {
  const [activeFeature, setActiveFeature] = useState<FeatureId>('voice');
  const feature = useMemo(() => FEATURES.find((f) => f.id === activeFeature) ?? FEATURES[0], [activeFeature]);
  const FeatureIcon = feature.icon;

  return (
    <div className="app-shell min-h-screen px-4 py-4 sm:px-6 lg:px-8">
      {/* Floating progress indicator */}
      <div className="float-progress" aria-label="Onboarding progress">
        <span className="float-progress-step done" title="Sign in" />
        <span className="float-progress-step active" title="Overview" />
        <span className="float-progress-step" title="Patient entry" />
        <span className="float-progress-step" title="Dashboard" />
        <span className="text-slate-400 mx-1">|</span>
        <span>Step 2 of 4</span>
      </div>

      <div className="mx-auto flex min-h-[calc(100vh-2rem)] max-w-[1440px] flex-col gap-5">
        {/* Header */}
        <motion.header
          className="panel-surface rounded-[28px] px-6 py-5 sm:px-8"
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        >
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-[10.5px] font-bold uppercase tracking-[0.36em] text-cyan-600">
                Dental Voice Charting AI
              </p>
              <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-[1.85rem]">
                Welcome back,{' '}
                <span
                  style={{
                    background: 'linear-gradient(90deg,#0ea5e9,#0d9488)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  {doctorName}
                </span>
              </h1>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Quick tour before you open a patient chart. Interactive — click any feature to explore.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="glow-badge">Clinician ready</span>
              <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[10.5px] font-bold uppercase tracking-[0.22em] text-slate-500">
                Interactive tour
              </span>
            </div>
          </div>
        </motion.header>

        {/* Main layout */}
        <main className="grid flex-1 gap-5 xl:grid-cols-[minmax(0,1.2fr)_320px] xl:items-start">
          {/* Feature cards section */}
          <div className="space-y-5">
            <motion.section
              className="panel-surface rounded-[28px] p-5 sm:p-6"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.42, delay: 0.08 }}
            >
              <div className="flex items-center justify-between gap-3 mb-5">
                <div>
                  <p className="text-[10.5px] font-bold uppercase tracking-[0.3em] text-slate-400">Platform capabilities</p>
                  <h2 className="mt-1.5 text-xl font-bold tracking-tight text-slate-900 sm:text-[1.35rem]">
                    Built for daily clinical use
                  </h2>
                </div>
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
                  Click to explore
                </span>
              </div>

              <motion.div
                className="grid gap-3"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
              >
                {FEATURES.map((item) => (
                  <FeatureCard
                    key={item.id}
                    active={activeFeature === item.id}
                    icon={item.icon}
                    title={item.title}
                    description={item.description}
                    bullets={item.bullets}
                    color={item.color}
                    bgColor={item.bgColor}
                    onClick={() => setActiveFeature(item.id)}
                  />
                ))}
              </motion.div>
            </motion.section>

            {/* Selected feature detail */}
            <motion.section
              className="panel-surface rounded-[28px] p-5 sm:p-6"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.42, delay: 0.14 }}
            >
              <p className="text-[10.5px] font-bold uppercase tracking-[0.3em] text-slate-400 mb-4">
                Selected module
              </p>
              <motion.div
                key={feature.id}
                className="flex flex-col gap-4 sm:flex-row sm:items-start"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.28 }}
              >
                <span className={`rounded-2xl border p-3 ${feature.bgColor} shrink-0`}>
                  <FeatureIcon className={`h-6 w-6 ${feature.color}`} strokeWidth={2.2} />
                </span>
                <div>
                  <h3 className="text-lg font-bold tracking-tight text-slate-900">{feature.title}</h3>
                  <p className="mt-1.5 text-sm leading-6 text-slate-500 max-w-xl">{feature.description}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {feature.bullets.map((b) => (
                      <span
                        key={b}
                        className={`rounded-full border px-3 py-1 text-[10.5px] font-semibold uppercase tracking-wide ${feature.bgColor} ${feature.color}`}
                      >
                        {b}
                      </span>
                    ))}
                  </div>
                </div>
              </motion.div>

              <div className="mt-5 rounded-2xl border border-cyan-100 bg-cyan-50/40 p-4">
                <div className="flex items-center gap-2 text-cyan-800 mb-2">
                  <Sparkles className="h-4 w-4" strokeWidth={2.2} />
                  <p className="text-[10.5px] font-bold uppercase tracking-[0.28em]">Clinical feel</p>
                </div>
                <p className="text-sm leading-6 text-slate-600">
                  The interface mirrors hospital software aesthetics — compact, calm, and easy to trust — while
                  feeling as modern as a premium SaaS product.
                </p>
              </div>
            </motion.section>
          </div>

          {/* Sidebar */}
          <ProgressSidebar onGetStarted={onGetStarted} />
        </main>
      </div>
    </div>
  );
}
