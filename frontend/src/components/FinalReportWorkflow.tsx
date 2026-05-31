import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { jsPDF } from 'jspdf';
import { generateClinicalReport, type ClinicalReportOutput } from './reportGeneration';
import { buildChartStats, buildMeasurementRows, isReportReady, type ChartStats, type MeasurementRow } from './reportWorkflowUtils';
import { SimpleToothMap } from './SimpleToothMap';
import { usePerioChart } from './WebSocketProvider';

interface FinalReportWorkflowProps {
  doctorName: string;
}

interface ReportDraft {
  diagnosis: string;
  treatment: string;
  doctorNotes: string;
}

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleString([], {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatStatsLabel(value: number): string {
  return value.toLocaleString();
}

function buildReportInput(teeth: ReturnType<typeof usePerioChart>['teeth'], currentTooth: number | null, currentSurface: ReturnType<typeof usePerioChart>['currentSurface'], activeSiteIndex: number | null, aiVerificationRecords: ReturnType<typeof usePerioChart>['aiVerificationRecords']) {
  return {
    teeth,
    currentTooth,
    currentSurface,
    activeSiteIndex,
    aiVerificationRecords,
  };
}

function createPdf(report: ClinicalReportOutput, draft: ReportDraft, stats: ChartStats, measurements: MeasurementRow[], doctorName: string) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const margin = 40;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let cursorY = margin;

  const ensureSpace = (requiredHeight: number) => {
    if (cursorY + requiredHeight <= pageHeight - margin) {
      return;
    }

    doc.addPage();
    cursorY = margin;
  };

  const addHeading = (title: string, subtitle?: string) => {
    ensureSpace(subtitle ? 48 : 34);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text(title, margin, cursorY);
    cursorY += 16;

    if (subtitle) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(90, 103, 120);
      doc.text(subtitle, margin, cursorY);
      doc.setTextColor(0, 0, 0);
      cursorY += 14;
    }
  };

  const addSectionTitle = (title: string) => {
    ensureSpace(24);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text(title, margin, cursorY);
    cursorY += 14;
  };

  const addWrappedText = (text: string, width = pageWidth - margin * 2, lineHeight = 14) => {
    const lines = doc.splitTextToSize(text, width) as string[];
    ensureSpace(lines.length * lineHeight + 4);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(lines, margin, cursorY);
    cursorY += lines.length * lineHeight + 4;
  };

  const addBulletList = (items: string[]) => {
    items.forEach((item) => {
      const lines = doc.splitTextToSize(`- ${item}`, pageWidth - margin * 2) as string[];
      ensureSpace(lines.length * 13 + 2);
      doc.text(lines, margin, cursorY);
      cursorY += lines.length * 13 + 2;
    });
  };

  addHeading('AI Periodontal Report', `Prepared ${formatTime(Date.now())} by ${doctorName}`);

  addSectionTitle('Diagnosis (AI)');
  addWrappedText(draft.diagnosis);

  addSectionTitle('Critical Sites');
  addBulletList(report.findings.length > 0 ? report.findings : ['No critical sites identified in the current chart data.']);

  addSectionTitle('Treatment Plan (AI)');
  addWrappedText(draft.treatment);

  addSectionTitle('Chart Stats');
  addWrappedText(
    [
      `Charted teeth: ${stats.chartedTeeth}`,
      `Missing teeth: ${stats.missingTeeth}`,
      `Implants: ${stats.implantTeeth}`,
      `Bleeding surfaces: ${stats.bleedingSurfaces}`,
      `Healthy surfaces: ${stats.healthySurfaces}`,
      `Recession surfaces: ${stats.recessionSurfaces}`,
      `Pocket sites >=4 mm: ${stats.pocketCount4Plus}`,
      `Pocket sites >=5 mm: ${stats.pocketCount5Plus}`,
      `Pocket sites >=7 mm: ${stats.pocketCount7Plus}`,
      `Highest pocket depth: ${stats.highestDepth} mm`,
    ].join('\n')
  );

  addSectionTitle('Measurements');
  doc.setFontSize(9);
  const tableLeft = margin;
  const tableTop = cursorY;
  const rowHeight = 18;
  const colWidths = [42, 86, 86, 52, 52, 48, 48, 44, 44];
  const headers = ['Tooth', 'Buccal', 'Lingual', 'Mssg', 'Impl', 'Bleed', 'Hlt', 'Rec', 'Charted'];

  const drawCell = (x: number, y: number, width: number, height: number, value: string, bold = false) => {
    doc.rect(x, y, width, height);
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.text(value, x + 3, y + 12, { maxWidth: width - 6 });
  };

  const renderTablePage = (startIndex: number) => {
    let y = tableTop;

    headers.forEach((header, index) => {
      const x = tableLeft + colWidths.slice(0, index).reduce((sum, current) => sum + current, 0);
      drawCell(x, y, colWidths[index] ?? 40, rowHeight, header, true);
    });

    y += rowHeight;

    for (let index = startIndex; index < measurements.length; index += 1) {
      if (y + rowHeight > pageHeight - margin) {
        return index;
      }

      const row = measurements[index];
      const values = [
        String(row.toothNumber),
        row.buccal,
        row.lingual,
        row.missing ? 'Yes' : 'No',
        row.implant ? 'Yes' : 'No',
        row.bleeding ? 'Yes' : 'No',
        row.healthy ? 'Yes' : 'No',
        row.recession,
        row.charted ? 'Yes' : 'No',
      ];

      for (let columnIndex = 0; columnIndex < values.length; columnIndex += 1) {
        const value = values[columnIndex] ?? '';
        const x = tableLeft + colWidths.slice(0, columnIndex).reduce((sum, current) => sum + current, 0);
        drawCell(x, y, colWidths[columnIndex] ?? 40, rowHeight, value);
      }

      y += rowHeight;
    }

    return measurements.length;
  };

  let nextIndex = 0;
  while (nextIndex < measurements.length) {
    nextIndex = renderTablePage(nextIndex);
    if (nextIndex < measurements.length) {
      doc.addPage();
      cursorY = margin;
    }
  }

  cursorY = Math.max(cursorY, tableTop + rowHeight + measurements.length * rowHeight + 12);

  addSectionTitle('Doctor Notes');
  addWrappedText(draft.doctorNotes.trim() || 'No personal notes recorded.');

  doc.save('ai-periodontal-report.pdf');
}

export function FinalReportWorkflow({ doctorName }: FinalReportWorkflowProps) {
  const { teeth, currentTooth, currentSurface, activeSiteIndex, aiVerificationRecords, transcripts } = usePerioChart();
  const chartStats = useMemo(() => buildChartStats(teeth), [teeth]);
  const measurements = useMemo(() => buildMeasurementRows(teeth), [teeth]);
  const reportReady = useMemo(() => isReportReady(teeth, chartStats), [chartStats, teeth]);
  const reportInput = useMemo(
    () => buildReportInput(teeth, currentTooth, currentSurface, activeSiteIndex, aiVerificationRecords),
    [activeSiteIndex, aiVerificationRecords, currentSurface, currentTooth, teeth]
  );

  const [panelOpen, setPanelOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const [report, setReport] = useState<ClinicalReportOutput | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [draft, setDraft] = useState<ReportDraft>({
    diagnosis: '',
    treatment: '',
    doctorNotes: '',
  });
  const lastVoiceCommandIdRef = useRef<string | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  const showToast = useCallback((message: string) => {
    setToastMessage(message);

    if (toastTimerRef.current !== null) {
      window.clearTimeout(toastTimerRef.current);
    }

    toastTimerRef.current = window.setTimeout(() => {
      setToastMessage(null);
      toastTimerRef.current = null;
    }, 2500);
  }, []);

  const loadReport = useCallback(async () => {
    setIsGenerating(true);
    setReportError(null);

    try {
      const generated = await generateClinicalReport(reportInput);
      setReport(generated);
      setDraft({
        diagnosis: generated.summary,
        treatment: generated.treatment,
        doctorNotes: '',
      });
    } catch (error) {
      setReportError(error instanceof Error ? error.message : 'Unable to generate report.');
    } finally {
      setIsGenerating(false);
    }
  }, [reportInput]);

  const openPanel = useCallback(async () => {
    if (!reportReady) {
      showToast('Complete charting before generating report.');
      return;
    }
    setPanelOpen(true);
    console.info('REPORT_PANEL_OPEN', {
      chartedTeeth: chartStats.chartedTeeth,
      missingTeeth: chartStats.missingTeeth,
      implantTeeth: chartStats.implantTeeth,
    });

    if (!report) {
      await loadReport();
    }
  }, [chartStats.chartedTeeth, chartStats.implantTeeth, chartStats.missingTeeth, loadReport, report, reportReady, showToast]);

  useEffect(() => {
    const latestVoiceCommand = transcripts.find((entry) => {
      if (!entry.isFinal || !entry.text.trim()) {
        return false;
      }

      if (lastVoiceCommandIdRef.current === entry.id) {
        return false;
      }

      return /\bgenerate report\b/i.test(entry.text);
    });

    if (!latestVoiceCommand) {
      return;
    }

    lastVoiceCommandIdRef.current = latestVoiceCommand.id;
    console.info('REPORT_COMMAND_DETECTED', {
      source: latestVoiceCommand.source,
      transcript: latestVoiceCommand.text.trim(),
      chartReady: reportReady,
    });

    if (!reportReady) {
      showToast('Complete charting before generating report.');
      return;
    }

    void openPanel();
  }, [openPanel, reportReady, showToast, transcripts]);

  const handleEdit = (field: keyof ReportDraft, value: string) => {
    setDraft((previous) => ({
      ...previous,
      [field]: value,
    }));
    console.info('REPORT_EDITED', { field });
  };

  const handleAiSummarize = async () => {
    console.info('AI_SUMMARY_TRIGGERED', {
      chartedTeeth: chartStats.chartedTeeth,
      missingTeeth: chartStats.missingTeeth,
      implantTeeth: chartStats.implantTeeth,
    });
    setIsSummarizing(true);

    try {
      const generated = await generateClinicalReport(reportInput);
      setReport(generated);
      setDraft((previous) => ({
        ...previous,
        diagnosis: generated.summary,
      }));
    } catch (error) {
      setReportError(error instanceof Error ? error.message : 'Unable to summarize report.');
    } finally {
      setIsSummarizing(false);
    }
  };

  const handleDownloadPdf = () => {
    if (!report) {
      return;
    }

    console.info('PDF_DOWNLOAD_TRIGGERED', {
      chartedTeeth: chartStats.chartedTeeth,
      missingTeeth: chartStats.missingTeeth,
      implantTeeth: chartStats.implantTeeth,
    });

    createPdf(report, draft, chartStats, measurements, doctorName);
  };

  useEffect(() => {
    if (!panelOpen) {
      return;
    }

    console.info('REPORT_UI_RENDERED', {
      hasReport: Boolean(report),
      isGenerating,
      isSummarizing,
    });
  }, [isGenerating, isSummarizing, panelOpen, report]);

  useEffect(() => () => {
    if (toastTimerRef.current !== null) {
      window.clearTimeout(toastTimerRef.current);
    }
  }, []);

  return (
    <>
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
        {toastMessage ? (
          <div className="max-w-[320px] rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800 shadow-lg">
            {toastMessage}
          </div>
        ) : null}

        <div title={reportReady ? 'Generate report' : 'Complete charting to generate report'}>
          <button
            type="button"
            onClick={() => {
              void openPanel();
            }}
            disabled={!reportReady}
            className="rounded-full border border-cyan-700 bg-cyan-700 px-5 py-3 text-xs font-semibold uppercase tracking-[0.24em] text-white shadow-[0_14px_30px_rgba(8,145,178,0.32)] transition hover:bg-cyan-800 disabled:cursor-not-allowed disabled:border-slate-300 disabled:bg-slate-200 disabled:text-slate-500 disabled:shadow-none"
          >
            Generate Report
          </button>
        </div>
      </div>

      {panelOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 px-4 py-6 backdrop-blur-sm">
          <div className="flex max-h-[92vh] w-full max-w-[1280px] flex-col overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-[0_30px_90px_rgba(15,23,42,0.3)]">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 bg-gradient-to-r from-slate-950 to-slate-800 px-6 py-5 text-white">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.34em] text-cyan-300">Final AI report</p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight">Periodontal review workspace</h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">Edit the AI draft, keep the chart data locked, and export the final review when ready.</p>
              </div>
              <button
                type="button"
                onClick={() => setPanelOpen(false)}
                className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-white transition hover:bg-white/20"
              >
                Close
              </button>
            </div>

            <div className="grid flex-1 min-h-0 gap-0 lg:grid-cols-[minmax(0,1.2fr),minmax(0,0.9fr)]">
              <div className="min-h-0 overflow-y-auto bg-slate-50 px-6 py-5">
                {isGenerating && !report ? (
                  <div className="rounded-[28px] border border-slate-200 bg-white p-6 text-slate-600 shadow-sm">
                    Generating AI report...
                  </div>
                ) : null}

                {reportError ? (
                  <div className="mb-4 rounded-[22px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    {reportError}
                  </div>
                ) : null}

                <div className="space-y-5">
                  <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-slate-500">Diagnosis (AI)</p>
                        <p className="mt-1 text-sm text-slate-500">Editable clinical diagnosis generated from chart evidence.</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          void handleAiSummarize();
                        }}
                        disabled={isSummarizing || isGenerating}
                        className="rounded-full border border-cyan-200 bg-cyan-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-cyan-800 transition hover:bg-cyan-100 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isSummarizing ? 'Summarizing' : 'AI Summarize'}
                      </button>
                    </div>
                    <textarea
                      value={draft.diagnosis}
                      onChange={(event) => handleEdit('diagnosis', event.target.value)}
                      rows={4}
                      className="mt-4 w-full rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-900 outline-none transition focus:border-cyan-400 focus:bg-white"
                    />
                  </section>

                  <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-slate-500">Critical Sites</p>
                    <div className="mt-3 space-y-2">
                      {(report?.findings.length ?? 0) > 0 ? (
                        report?.findings.map((finding) => (
                          <div key={finding} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700">
                            {finding}
                          </div>
                        ))
                      ) : (
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-600">
                          No critical sites generated yet.
                        </div>
                      )}
                    </div>
                  </section>

                  <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-slate-500">Treatment Plan (AI)</p>
                    <textarea
                      value={draft.treatment}
                      onChange={(event) => handleEdit('treatment', event.target.value)}
                      rows={4}
                      className="mt-4 w-full rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-900 outline-none transition focus:border-cyan-400 focus:bg-white"
                    />
                  </section>

                  <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-slate-500">Chart Stats</p>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                      {[
                        ['Charted teeth', chartStats.chartedTeeth],
                        ['Missing teeth', chartStats.missingTeeth],
                        ['Implants', chartStats.implantTeeth],
                        ['Bleeding surfaces', chartStats.bleedingSurfaces],
                        ['Healthy surfaces', chartStats.healthySurfaces],
                        ['Recession surfaces', chartStats.recessionSurfaces],
                        ['Pocket sites >=4 mm', chartStats.pocketCount4Plus],
                        ['Pocket sites >=5 mm', chartStats.pocketCount5Plus],
                        ['Pocket sites >=7 mm', chartStats.pocketCount7Plus],
                        ['Highest depth', `${chartStats.highestDepth} mm`],
                      ].map(([label, value]) => (
                        <div key={label} className="rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-3">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-slate-400">{label}</p>
                          <p className="mt-2 text-lg font-semibold text-slate-950">{typeof value === 'number' ? formatStatsLabel(value) : value}</p>
                        </div>
                      ))}
                    </div>
                  </section>
                </div>
              </div>

              <div className="min-h-0 overflow-y-auto border-t border-slate-200 bg-white px-6 py-5 lg:border-l lg:border-t-0">
                <div className="space-y-5">
                  <section className="rounded-[28px] border border-slate-200 bg-slate-50 p-5">
                    <SimpleToothMap teeth={teeth} activeTooth={currentTooth} />
                  </section>

                  <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-slate-500">Measurements Table</p>
                    <div className="mt-4 max-h-[420px] overflow-auto rounded-[22px] border border-slate-200">
                      <table className="min-w-full border-collapse text-left text-xs">
                        <thead className="sticky top-0 z-10 bg-slate-100 text-slate-600">
                          <tr>
                            <th className="border-b border-slate-200 px-3 py-2">Tooth</th>
                            <th className="border-b border-slate-200 px-3 py-2">Buccal</th>
                            <th className="border-b border-slate-200 px-3 py-2">Lingual</th>
                            <th className="border-b border-slate-200 px-3 py-2">Bleeding</th>
                            <th className="border-b border-slate-200 px-3 py-2">Healthy</th>
                            <th className="border-b border-slate-200 px-3 py-2">Recession</th>
                            <th className="border-b border-slate-200 px-3 py-2">Missing</th>
                            <th className="border-b border-slate-200 px-3 py-2">Implant</th>
                            <th className="border-b border-slate-200 px-3 py-2">Locked</th>
                          </tr>
                        </thead>
                        <tbody>
                          {measurements.map((row) => (
                            <tr key={row.toothNumber} className="odd:bg-white even:bg-slate-50">
                              <td className="border-b border-slate-100 px-3 py-2 font-semibold text-slate-900">{row.toothNumber}</td>
                              <td className="border-b border-slate-100 px-3 py-2 text-slate-700">{row.buccal}</td>
                              <td className="border-b border-slate-100 px-3 py-2 text-slate-700">{row.lingual}</td>
                              <td className="border-b border-slate-100 px-3 py-2 text-slate-700">{row.bleeding ? 'Yes' : 'No'}</td>
                              <td className="border-b border-slate-100 px-3 py-2 text-slate-700">{row.healthy ? 'Yes' : 'No'}</td>
                              <td className="border-b border-slate-100 px-3 py-2 text-slate-700">{row.recession}</td>
                              <td className="border-b border-slate-100 px-3 py-2 text-slate-700">{row.missing ? 'Yes' : 'No'}</td>
                              <td className="border-b border-slate-100 px-3 py-2 text-slate-700">{row.implant ? 'Yes' : 'No'}</td>
                              <td className="border-b border-slate-100 px-3 py-2 text-slate-500">{row.charted ? 'Locked' : 'Open'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </section>

                  <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-slate-500">Doctor Notes</p>
                    <textarea
                      value={draft.doctorNotes}
                      onChange={(event) => handleEdit('doctorNotes', event.target.value)}
                      rows={6}
                      placeholder="Add personal notes for the final report."
                      className="mt-4 w-full rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-900 outline-none transition focus:border-cyan-400 focus:bg-white"
                    />
                  </section>

                  <section className="rounded-[28px] border border-slate-200 bg-gradient-to-r from-slate-950 to-slate-800 p-5 text-white shadow-sm">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-cyan-300">Export</p>
                    <p className="mt-2 text-sm leading-6 text-slate-300">Review the draft, make your edits, then export the final report as a PDF.</p>
                    <div className="mt-4 flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          void handleAiSummarize();
                        }}
                        disabled={isSummarizing || isGenerating}
                        className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-white transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isSummarizing ? 'Summarizing' : 'AI Summarize'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          void loadReport();
                        }}
                        disabled={isGenerating}
                        className="rounded-full border border-cyan-200 bg-cyan-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-cyan-800 transition hover:bg-cyan-100 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isGenerating ? 'Generating' : 'Refresh AI Report'}
                      </button>
                      <button
                        type="button"
                        onClick={handleDownloadPdf}
                        disabled={!report || isGenerating || isSummarizing}
                        className="rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-emerald-800 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Download PDF
                      </button>
                    </div>
                  </section>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
