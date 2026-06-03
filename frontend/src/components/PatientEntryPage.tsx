import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, CalendarDays, CheckCircle2, ClipboardList, Hash, ShieldCheck, User, UserRound } from 'lucide-react';

export interface PatientProfile {
  name: string;
  chartId: string;
  dateOfBirth: string;
}

interface PatientEntryPageProps {
  doctorName: string;
  onBack: () => void;
  onContinue: (patient: PatientProfile) => void;
}

function InputField({
  label,
  icon: Icon,
  type = 'text',
  value,
  onChange,
  placeholder,
  hint,
}: {
  label: string;
  icon: React.ElementType;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  hint?: string;
}) {
  const [focused, setFocused] = useState(false);

  return (
    <div className="pe-field">
      <label className="pe-field-label">{label}</label>
      <div className={`pe-input-shell${focused ? ' is-focused' : ''}`}>
        <Icon className="pe-input-ico" strokeWidth={2} aria-hidden />
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
          className="pe-input"
          aria-label={label}
        />
      </div>
      {hint && <p className="pe-field-hint">{hint}</p>}
    </div>
  );
}

export function PatientEntryPage({ doctorName, onBack, onContinue }: PatientEntryPageProps) {
  const [name, setName] = useState('');
  const [chartId, setChartId] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    onContinue({
      name: name.trim() || 'New Patient',
      chartId: chartId.trim() || 'Chart-001',
      dateOfBirth,
    });
  };

  return (
    <div className="app-shell min-h-screen overflow-y-auto px-4 py-4 sm:px-6 lg:px-8">
      {/* Floating progress */}
      <div className="float-progress" aria-label="Onboarding progress">
        <span className="float-progress-step done" title="Sign in" />
        <span className="float-progress-step done" title="Overview" />
        <span className="float-progress-step active" title="Patient entry" />
        <span className="float-progress-step" title="Dashboard" />
        <span className="text-slate-400 mx-1">|</span>
        <span>Step 3 of 4</span>
      </div>

      <div className="mx-auto flex min-h-[calc(100vh-2rem)] max-w-[1100px] items-center justify-center py-8">
        <motion.div
          className="grid w-full gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.82fr)]"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        >
          {/* Left info panel */}
          <section className="panel-surface rounded-[28px] p-6 sm:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10.5px] font-bold uppercase tracking-[0.32em] text-cyan-600">
                  Patient intake — Step 3
                </p>
                <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
                  Enter the patient record
                </h1>
                <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">
                  Add patient details before opening the periodontal chart. This keeps clinical context attached to the live charting session.
                </p>
              </div>
              <button
                type="button"
                onClick={onBack}
                className="btn-glass shrink-0 gap-1.5"
              >
                <ArrowLeft className="h-4 w-4" strokeWidth={2.2} />
                Back
              </button>
            </div>

            {/* Doctor / flow context */}
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {[
                { label: 'Clinician', value: doctorName },
                { label: 'Current step', value: 'Patient intake' },
                { label: 'Next', value: 'Open dashboard' },
              ].map((item) => (
                <motion.div
                  key={item.label}
                  className="rounded-2xl border border-slate-100 bg-white/80 p-4 hover-lift"
                  whileHover={{ scale: 1.01 }}
                >
                  <p className="text-[10px] font-bold uppercase tracking-[0.26em] text-slate-400">{item.label}</p>
                  <p className="mt-1.5 text-sm font-bold text-slate-800">{item.value}</p>
                </motion.div>
              ))}
            </div>

            {/* What happens next */}
            <div className="mt-5 rounded-2xl border border-cyan-100 bg-cyan-50/40 p-5">
              <div className="flex items-center gap-2 text-cyan-800 mb-2">
                <ClipboardList className="h-4 w-4" strokeWidth={2.2} />
                <p className="text-[10.5px] font-bold uppercase tracking-[0.28em]">What happens next</p>
              </div>
              <div className="space-y-2 text-sm text-slate-600">
                {[
                  'Save patient record to attach clinical context',
                  'Real-time periodontal chart opens automatically',
                  'Live voice charting activates with Deepgram AI',
                ].map((step, i) => (
                  <div key={i} className="flex items-center gap-2.5">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-teal-500" strokeWidth={2.5} />
                    <span>{step}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Onboarding steps visual */}
            <div className="mt-5 flex items-center gap-2">
              {['Sign in', 'Overview', 'Patient', 'Dashboard'].map((s, i) => (
                <React.Fragment key={s}>
                  <span
                    className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wide ${
                      i < 2
                        ? 'bg-teal-100 text-teal-700 border border-teal-200'
                        : i === 2
                        ? 'bg-blue-100 text-blue-700 border border-blue-200'
                        : 'bg-slate-100 text-slate-400 border border-slate-200'
                    }`}
                  >
                    {s}
                  </span>
                  {i < 3 && <span className="text-slate-300 text-xs">→</span>}
                </React.Fragment>
              ))}
            </div>
          </section>

          {/* Right form panel */}
          <aside className="panel-surface rounded-[28px] p-6 sm:p-8">
            <div className="flex items-start gap-3 mb-6">
              <span className="rounded-xl border border-blue-200 bg-blue-50 p-2.5 text-blue-600 shrink-0">
                <UserRound className="h-5 w-5" strokeWidth={2.2} />
              </span>
              <div>
                <p className="text-[10.5px] font-bold uppercase tracking-[0.3em] text-slate-400">Patient details</p>
                <h2 className="mt-1 text-lg font-bold tracking-tight text-slate-900">Clinical intake form</h2>
                <p className="mt-0.5 text-sm text-slate-500">Fast. Compact. Clinically accurate.</p>
              </div>
            </div>

            <form className="space-y-4" onSubmit={handleSubmit}>
              <InputField
                label="Patient Name"
                icon={User}
                value={name}
                onChange={setName}
                placeholder="Jane Smith"
                hint="Leave blank to use 'New Patient'"
              />
              <InputField
                label="Chart ID"
                icon={Hash}
                value={chartId}
                onChange={setChartId}
                placeholder="CH-2041"
                hint="Leave blank to use 'Chart-001'"
              />
              <InputField
                label="Date of Birth"
                icon={CalendarDays}
                type="date"
                value={dateOfBirth}
                onChange={setDateOfBirth}
              />

              <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
                <div className="flex items-center gap-2 text-slate-700 mb-1.5">
                  <ShieldCheck className="h-4 w-4 text-cyan-600" strokeWidth={2.2} />
                  <span className="text-sm font-bold">Clinical session ready</span>
                </div>
                <p className="text-xs leading-5 text-slate-500">
                  The dashboard will open with this patient attached to the live chart context.
                </p>
              </div>

              <motion.button
                type="submit"
                className="btn-primary w-full mt-2"
                whileHover={{ scale: 1.01, y: -2 }}
                whileTap={{ scale: 0.98 }}
              >
                Open Charting Workspace
              </motion.button>
            </form>
          </aside>
        </motion.div>
      </div>
    </div>
  );
}
