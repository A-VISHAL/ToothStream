import React from 'react';
import { usePerioChart } from './WebSocketProvider';
import { generateClinicalReport, type ClinicalReportOutput } from './reportGeneration';

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function DebugPanel() {
  const { debug, toggleDebugCollapsed, teeth, currentTooth, currentSurface, activeSiteIndex, aiVerificationRecords } = usePerioChart();
  const [isGeneratingReport, setIsGeneratingReport] = React.useState(false);
  const [clinicalReport, setClinicalReport] = React.useState<ClinicalReportOutput | null>(null);
  const [reportError, setReportError] = React.useState<string | null>(null);

  if (!debug.available) {
    return null;
  }

  const handleGenerateReport = async () => {
    setIsGeneratingReport(true);
    setReportError(null);

    try {
      const report = await generateClinicalReport({
        teeth,
        currentTooth,
        currentSurface,
        activeSiteIndex,
        aiVerificationRecords,
      });

      setClinicalReport(report);
    } catch (error) {
      setReportError(error instanceof Error ? error.message : 'Unable to generate report.');
    } finally {
      setIsGeneratingReport(false);
    }
  };

  return (
    <div className="pointer-events-auto fixed bottom-4 right-4 z-40 w-[360px] max-w-[92vw]">
      <div className="overflow-hidden rounded-2xl border border-slate-700/80 bg-slate-950/95 shadow-[0_20px_45px_rgba(2,6,23,0.55)] backdrop-blur">
        <button
          type="button"
          onClick={toggleDebugCollapsed}
          className="flex w-full items-center justify-between border-b border-slate-800 px-4 py-3 text-left"
        >
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-cyan-300">Developer Debug</p>
            <p className="mt-0.5 text-xs text-slate-300">Voice to parser pipeline visibility</p>
          </div>
          <span className="rounded-md border border-slate-700 bg-slate-900 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-300">
            {debug.collapsed ? 'Open' : 'Hide'}
          </span>
        </button>

        {!debug.collapsed ? (
          <div className="max-h-[70vh] space-y-3 overflow-y-auto p-4">
            <section className="rounded-xl border border-slate-800 bg-slate-900/70 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-300">Live Deepgram Transcript</p>
              <div className="mt-2 space-y-2">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-300">INTERIM</p>
                  <p className="mt-1 min-h-[20px] text-xs leading-5 text-slate-200">{debug.interimTranscript || '...'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-300">FINAL</p>
                  <p className="mt-1 min-h-[20px] text-xs leading-5 text-slate-200">{debug.finalTranscript || '...'}</p>
                </div>
                <div className="max-h-24 space-y-1 overflow-y-auto rounded-md border border-slate-800 bg-slate-950 p-2">
                  {debug.stream.length > 0 ? (
                    debug.stream.map((entry) => (
                      <div key={entry.id} className="text-[11px] leading-4 text-slate-300">
                        <span className={`font-semibold ${entry.label === 'FINAL' ? 'text-emerald-300' : 'text-amber-300'}`}>{entry.label}</span>
                        <span className="mx-1 text-slate-500">{formatTime(entry.timestamp)}</span>
                        <span>{entry.text}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-[11px] text-slate-500">No transcript stream events yet.</p>
                  )}
                </div>
              </div>
            </section>

            <section className="rounded-xl border border-slate-800 bg-slate-900/70 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-300">State Machine</p>
              <div className="mt-2 grid grid-cols-1 gap-1 text-xs text-slate-300">
                <p>tooth={debug.parserState.tooth ?? 'null'}</p>
                <p>surface={debug.parserState.surface ?? 'null'}</p>
                <p>mode={debug.parserState.mode}</p>
                <p>expect={debug.parserState.expectedInput}</p>
                <p>status={debug.parserState.status}</p>
              </div>
            </section>

            <section className="rounded-xl border border-slate-800 bg-slate-900/70 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-300">Parser Action Log</p>
              <div className="mt-2 max-h-32 space-y-1 overflow-y-auto rounded-md border border-slate-800 bg-slate-950 p-2">
                {debug.actionLog.length > 0 ? (
                  debug.actionLog.map((line, index) => (
                    <p key={`${line}-${index}`} className="text-[11px] leading-4 text-slate-300">{line}</p>
                  ))
                ) : (
                  <p className="text-[11px] text-slate-500">No parser actions captured yet.</p>
                )}
              </div>
            </section>

            <section className="rounded-xl border border-slate-800 bg-slate-900/70 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-300">Event Timeline</p>
              <div className="mt-2 max-h-40 space-y-1 overflow-y-auto rounded-md border border-slate-800 bg-slate-950 p-2">
                {debug.timeline.length > 0 ? (
                  debug.timeline.map((event) => (
                    <div key={event.id} className="text-[11px] leading-4 text-slate-300">
                      <span className="text-slate-500">{formatTime(event.timestamp)}</span>
                      <span className="mx-1 font-semibold text-cyan-300">{event.message}</span>
                      {event.detail ? <span className="text-slate-400">{event.detail}</span> : null}
                    </div>
                  ))
                ) : (
                  <p className="text-[11px] text-slate-500">No timeline events yet.</p>
                )}
              </div>
            </section>

            <section className="rounded-xl border border-slate-800 bg-slate-900/70 p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-300">AI report</p>
                  <p className="mt-1 text-xs text-slate-400">Manual clinical summary generation</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    void handleGenerateReport();
                  }}
                  disabled={isGeneratingReport}
                  className="rounded-md border border-cyan-200 bg-cyan-50 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-800 transition hover:bg-cyan-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isGeneratingReport ? 'Generating' : 'Generate Report'}
                </button>
              </div>

              {reportError ? <p className="mt-3 text-xs text-rose-300">{reportError}</p> : null}

              {clinicalReport ? (
                <div className="mt-3 space-y-3 rounded-md border border-slate-800 bg-slate-950 p-3 text-xs text-slate-200">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-300">Clinical Summary</p>
                    <p className="mt-1 leading-5 text-slate-200">{clinicalReport.summary}</p>
                  </div>

                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-300">Key Findings</p>
                    <ul className="mt-1 list-disc space-y-1 pl-4 leading-5 text-slate-200">
                      {clinicalReport.findings.map((finding) => (
                        <li key={finding}>{finding}</li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-300">Risk Assessment</p>
                    <p className="mt-1 leading-5 text-slate-200">{clinicalReport.risk}</p>
                  </div>

                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-300">Suggested Treatment Direction</p>
                    <p className="mt-1 leading-5 text-slate-200">{clinicalReport.treatment}</p>
                  </div>

                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-300">AI Notes</p>
                    <p className="mt-1 leading-5 text-slate-300">{clinicalReport.aiNotes}</p>
                  </div>
                </div>
              ) : null}
            </section>
          </div>
        ) : null}
      </div>
    </div>
  );
}
