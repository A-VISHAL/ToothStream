import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Activity, CircleDot, Mic, ShieldCheck, Sparkles, Stethoscope, Workflow, type LucideIcon } from 'lucide-react';
import { LoginWorkspacePreview } from './LoginWorkspacePreview';

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
  bullets: string[];
}> = [
  {
    id: 'voice',
    title: 'Live voice charting',
    description: 'Speak periodontal findings and keep the chart moving without breaking clinical flow.',
    icon: Mic,
    bullets: ['Fast voice capture', 'Dental command parsing', 'Real-time feedback'],
  },
  {
    id: 'chart',
    title: 'Interactive perio chart',
    description: 'See the full mouth chart update with site-level depth, bleeding, and surface awareness.',
    icon: Stethoscope,
    bullets: ['32-tooth chart', 'Surface-aware updates', 'Clinical site tracking'],
  },
  {
    id: 'workflow',
    title: 'Clinical workflow state machine',
    description: 'Stay on the same tooth until the findings are complete, then advance when the clinician says so.',
    icon: Workflow,
    bullets: ['No premature jumps', 'Explicit navigation', 'Tooth commit tracking'],
  },
  {
    id: 'security',
    title: 'Hospital-style access',
    description: 'Clean, believable clinical UI with a daily-use SaaS feel and a low-friction sign-in flow.',
    icon: ShieldCheck,
    bullets: ['Simple login', 'White clinical palette', 'Daily-use clarity'],
  },
  {
    id: 'dashboard',
    title: 'Live dashboard feedback',
    description: 'See transcript history, socket state, latency, and current tooth context in one place.',
    icon: Activity,
    bullets: ['Transcript stream', 'Latency visibility', 'Developer debug tools'],
  },
];

function FeatureCard({
  active,
  icon: Icon,
  title,
  description,
  bullets,
  onClick,
}: {
  active: boolean;
  icon: LucideIcon;
  title: string;
  description: string;
  bullets: string[];
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group w-full rounded-[24px] border p-5 text-left transition-all duration-200 ${
        active
          ? 'border-cyan-200 bg-cyan-50/70 shadow-[0_16px_40px_rgba(14,165,233,0.08)]'
          : 'border-slate-200 bg-white/90 hover:border-cyan-200 hover:bg-cyan-50/40'
      }`}
    >
      <div className="flex items-start gap-4">
        <span className={`rounded-2xl border p-3 ${active ? 'border-cyan-200 bg-white text-cyan-700' : 'border-slate-200 bg-slate-50 text-slate-500'}`}>
          <Icon className="h-5 w-5" strokeWidth={2.2} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-lg font-semibold tracking-tight text-slate-950">{title}</h3>
            {active ? <CircleDot className="h-4 w-4 text-cyan-600" strokeWidth={2.3} /> : null}
          </div>
          <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {bullets.map((bullet) => (
              <span key={bullet} className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                {bullet}
              </span>
            ))}
          </div>
        </div>
      </div>
    </button>
  );
}

export function ClinicalOverviewPage({ doctorName, onGetStarted }: ClinicalOverviewPageProps) {
  const [activeFeature, setActiveFeature] = useState<FeatureId>('voice');
  const feature = useMemo(() => FEATURES.find((item) => item.id === activeFeature) ?? FEATURES[0], [activeFeature]);
  const FeatureIcon = feature.icon;

  return (
    <div className="app-shell min-h-screen overflow-y-auto px-4 py-4 sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-2rem)] max-w-[1440px] flex-col gap-6">
        <motion.header
          className="panel-surface rounded-[32px] px-6 py-5 sm:px-8"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
        >
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.38em] text-cyan-700/80">Dental Voice Charting AI</p>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                Welcome back, {doctorName}
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600 sm:text-[15px]">
                This short tour shows what the platform does before you enter a patient chart. It stays compact, clinical, and easy to scan while still being interactive.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-full border border-cyan-200 bg-cyan-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-cyan-800">
                Clinician ready
              </span>
              <span className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-slate-600">
                Scroll for details
              </span>
            </div>
          </div>
        </motion.header>

        <main className="grid flex-1 gap-6 xl:grid-cols-[minmax(0,1.15fr)_360px] xl:items-start">
          <section className="space-y-6">
            <section className="panel-surface rounded-[32px] p-5 sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-slate-500">What this project includes</p>
                  <h2 className="mt-2 text-[24px] font-semibold tracking-tight text-slate-950 sm:text-[30px]">A daily-use clinical workflow, not a demo toy</h2>
                </div>
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-600">
                  interactive
                </span>
              </div>

              <div className="mt-5 grid gap-4">
                {FEATURES.map((item) => (
                  <FeatureCard
                    key={item.id}
                    active={activeFeature === item.id}
                    icon={item.icon}
                    title={item.title}
                    description={item.description}
                    bullets={item.bullets}
                    onClick={() => setActiveFeature(item.id)}
                  />
                ))}
              </div>
            </section>

            <section className="panel-surface rounded-[32px] p-5 sm:p-6">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-stretch">
                <div className="flex-1 rounded-[28px] border border-slate-200 bg-white/90 p-5 shadow-sm">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-slate-500">Selected module</p>
                  <div className="mt-3 flex items-start gap-4">
                    <span className="rounded-2xl border border-cyan-200 bg-cyan-50 p-3 text-cyan-700">
                      <FeatureIcon className="h-5 w-5" strokeWidth={2.2} />
                    </span>
                    <div>
                      <h3 className="text-xl font-semibold tracking-tight text-slate-950">{feature.title}</h3>
                      <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">{feature.description}</p>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {feature.bullets.map((bullet) => (
                      <span key={bullet} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                        {bullet}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex-1 rounded-[28px] border border-cyan-100 bg-cyan-50/40 p-5 shadow-sm">
                  <div className="flex items-center gap-3 text-cyan-900">
                    <Sparkles className="h-5 w-5" strokeWidth={2.2} />
                    <p className="text-[11px] font-semibold uppercase tracking-[0.32em]">Clinical feel</p>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-slate-700">
                    The interface is designed to feel like real hospital software and a modern SaaS dashboard at the same time: compact, calm, and easy to trust.
                  </p>
                  <div className="mt-4 grid gap-2 text-sm text-slate-600">
                    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">White mode with subtle blue clinical accents</div>
                    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">Scrollable overview with clickable feature cards</div>
                    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">Get Started sends you to patient intake next</div>
                  </div>
                </div>
              </div>
            </section>

            <section className="panel-surface rounded-[32px] p-5 sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-slate-500">Interactive preview</p>
                  <h2 className="mt-2 text-[24px] font-semibold tracking-tight text-slate-950">Explore the workspace</h2>
                </div>
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-600">
                  live controls
                </span>
              </div>

              <div className="mt-5 overflow-hidden rounded-[28px] border border-slate-200 bg-white/95 p-4 shadow-sm sm:p-5">
                <LoginWorkspacePreview />
              </div>
            </section>
          </section>

          <aside className="space-y-6 xl:sticky xl:top-4">
            <motion.div
              className="panel-surface rounded-[32px] p-5 sm:p-6"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, ease: 'easeOut', delay: 0.05 }}
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-slate-500">Next step</p>
              <h2 className="mt-2 text-[24px] font-semibold tracking-tight text-slate-950">Continue to patient entry</h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                Once you click Get Started, the app will take you to a patient intake screen before opening the periodontal dashboard.
              </p>

              <div className="mt-5 grid gap-3 rounded-[28px] border border-slate-200 bg-slate-50/90 p-4 text-sm text-slate-600">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-medium text-slate-800">Interactive tour</span>
                  <span className="text-slate-500">done</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="font-medium text-slate-800">Patient intake</span>
                  <span className="text-slate-500">next</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="font-medium text-slate-800">Chart workspace</span>
                  <span className="text-slate-500">final</span>
                </div>
              </div>

              <button
                type="button"
                onClick={onGetStarted}
                className="mt-6 w-full rounded-full border border-slate-900 bg-slate-950 px-5 py-3 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:bg-slate-800"
              >
                Get Started
              </button>
            </motion.div>
          </aside>
        </main>
      </div>
    </div>
  );
}
