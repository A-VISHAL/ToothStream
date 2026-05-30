import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, ClipboardList, ShieldCheck, UserRound } from 'lucide-react';

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

export function PatientEntryPage({ doctorName, onBack, onContinue }: PatientEntryPageProps) {
  const [name, setName] = useState('');
  const [chartId, setChartId] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    onContinue({
      name: name.trim() || 'New Patient',
      chartId: chartId.trim() || 'Chart-001',
      dateOfBirth,
    });
  };

  return (
    <div className="app-shell min-h-screen overflow-y-auto px-4 py-4 sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-2rem)] max-w-[1280px] items-center justify-center">
        <motion.div
          className="grid w-full gap-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(360px,0.78fr)]"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
        >
          <section className="panel-surface rounded-[32px] p-6 sm:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-slate-500">Patient intake</p>
                <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 sm:text-4xl">Enter the patient record</h1>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-[15px]">
                  Add the patient details before opening the periodontal chart. This keeps the clinical context attached to the live charting session.
                </p>
              </div>
              <button
                type="button"
                onClick={onBack}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
              >
                <ArrowLeft className="h-4 w-4" strokeWidth={2.2} />
                Back
              </button>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              {[
                { label: 'Doctor', value: doctorName },
                { label: 'Flow', value: 'Patient intake' },
                { label: 'Next', value: 'Open dashboard' },
              ].map((item) => (
                <div key={item.label} className="rounded-[24px] border border-slate-200 bg-white/90 p-4 shadow-sm">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">{item.label}</p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">{item.value}</p>
                </div>
              ))}
            </div>

            <div className="mt-6 rounded-[28px] border border-cyan-100 bg-cyan-50/40 p-5 text-sm leading-6 text-slate-700">
              <div className="flex items-center gap-3 text-cyan-900">
                <ClipboardList className="h-5 w-5" strokeWidth={2.2} />
                <p className="text-[11px] font-semibold uppercase tracking-[0.32em]">What happens next</p>
              </div>
              <p className="mt-3">
                After you save the patient, the app opens the real periodontal workspace with the live chart, transcript stream, and socket indicators.
              </p>
            </div>
          </section>

          <aside className="panel-surface rounded-[32px] p-6 sm:p-8">
            <div className="flex items-start gap-4">
              <span className="rounded-2xl border border-cyan-200 bg-cyan-50 p-3 text-cyan-700">
                <UserRound className="h-5 w-5" strokeWidth={2.2} />
              </span>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-slate-500">Patient details</p>
                <h2 className="mt-2 text-[24px] font-semibold tracking-tight text-slate-950">Simple clinical intake</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">Compact, believable, and fast to complete.</p>
              </div>
            </div>

            <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
              <label className="block">
                <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Patient name</span>
                <input
                  type="text"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="John Smith"
                  className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-cyan-300 focus:ring-4 focus:ring-cyan-100"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Chart ID</span>
                <input
                  type="text"
                  value={chartId}
                  onChange={(event) => setChartId(event.target.value)}
                  placeholder="CH-2041"
                  className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-cyan-300 focus:ring-4 focus:ring-cyan-100"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Date of birth</span>
                <input
                  type="date"
                  value={dateOfBirth}
                  onChange={(event) => setDateOfBirth(event.target.value)}
                  className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-cyan-300 focus:ring-4 focus:ring-cyan-100"
                />
              </label>

              <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                <div className="flex items-center gap-3 text-slate-800">
                  <ShieldCheck className="h-4 w-4 text-cyan-700" strokeWidth={2.2} />
                  <span className="font-semibold">Clinical session ready</span>
                </div>
                <p className="mt-2 leading-6">
                  The dashboard will open with this patient attached to the chart context.
                </p>
              </div>

              <button
                type="submit"
                className="mt-2 w-full rounded-full border border-slate-900 bg-slate-950 px-5 py-3 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:bg-slate-800"
              >
                Open charting workspace
              </button>
            </form>
          </aside>
        </motion.div>
      </div>
    </div>
  );
}
