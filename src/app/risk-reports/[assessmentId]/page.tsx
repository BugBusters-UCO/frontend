"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import ReactMarkdown from "react-markdown";
import { fetchRiskAssessment, generateRiskAssessmentRemedies, downloadRiskReportPdf } from "@/shared/api/client";
import type { RiskAssessment, UnifiedRiskPriority } from "@/shared/api/types";
import { usePageContext } from "@/features/chatbot/usePageContext";

const SCANNER_LABELS: Record<string, string> = {
  secret: "Secret Scanner",
  config: "Config Scanner",
  dependency: "Dependency Scanner",
  cipher: "Cipher Scanner",
  unknown: "Unknown Scanner",
};

export default function RiskReportDetailPage() {
  const params = useParams<{ assessmentId: string }>();
  const assessmentId = params.assessmentId;
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<"executive" | "technical">("executive");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const { data: assessment, isLoading } = useQuery({
    queryKey: ["risk-assessment", assessmentId],
    queryFn: () => fetchRiskAssessment(assessmentId),
    enabled: !!assessmentId,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === "waiting" || status === "running" ? 4000 : false;
    },
  });

  const risk = assessment?.result?.risk;
  const aiRemedies = assessment?.result?.aiRemedies || [];
  const activeScannerNames = useMemo(() => {
    const priorities = risk?.scanner_priorities || {};
    return Object.keys(priorities).filter((name) => (priorities[name] || []).length > 0);
  }, [risk?.scanner_priorities]);

  usePageContext({
    page: "Risk Report Detail",
    assessmentId: assessmentId,
    target: assessment?.sourceLabel,
    status: assessment?.status,
    finalRiskScore: risk?.final_risk_score,
    riskLevel: risk?.risk_level,
    activeScanners: activeScannerNames,
    aiRemediesCount: aiRemedies.length,
    unifiedPrioritiesCount: (risk?.overall_priorities || []).length,
  });

  const handleGenerateRemedies = async () => {
    if (!assessment || assessment.status !== "completed") return;
    setIsGenerating(true);
    setAiError(null);
    try {
      await generateRiskAssessmentRemedies(assessment.id, { limit: 3 });
      await queryClient.invalidateQueries({ queryKey: ["risk-assessment", assessmentId] });
    } catch (error) {
      setAiError(error instanceof Error ? error.message : "Failed to generate AI remedies");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!assessment || assessment.status !== "completed") return;
    setIsDownloading(true);
    try {
      await downloadRiskReportPdf(assessment.id);
    } catch (error) {
      alert("Failed to download PDF");
    } finally {
      setIsDownloading(false);
    }
  };

  if (isLoading) {
    return <div className="mx-auto max-w-[1280px] rounded-2xl border border-border-divider bg-surface transition-colors duration-300 p-6 text-sm text-text-muted">Loading risk report...</div>;
  }

  if (!assessment) {
    return <div className="mx-auto max-w-[1280px] rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">Risk report not found.</div>;
  }

  return (
    <div className="mx-auto flex max-w-[1280px] flex-col gap-section-gap">
      <section className="rounded-2xl border border-border-subtle bg-surface transition-colors duration-300 p-6 shadow-sm">
        <div className="flex flex-col gap-4 @lg:flex-row @lg:items-start @lg:justify-between">
          <div>
            <Link href="/risk-reports" className="mb-3 inline-flex items-center gap-1 text-sm font-semibold text-primary">
              <span className="material-symbols-outlined text-[18px]">arrow_back</span>
              Risk reports
            </Link>
            <h1 className="font-headline-lg text-headline-lg text-text-primary">Risk Report: {assessment.sourceLabel}</h1>
            <p className="mt-1 text-sm text-text-secondary">
              {assessment.sourceType} assessment / {assessment.status} / {new Date(assessment.createdAt).toLocaleString()}
            </p>
          </div>
          
          <div className="flex flex-col items-end gap-3 shrink-0">
            <button
              onClick={handleDownloadPdf}
              disabled={assessment.status !== "completed" || isDownloading}
              className="flex items-center gap-2 rounded-xl bg-white/5 px-4 py-2 text-sm font-bold text-text-primary hover:bg-white/10 disabled:opacity-50 transition-colors border border-border-subtle"
            >
              <span className="material-symbols-outlined text-[18px]">
                {isDownloading ? "hourglass_empty" : "download"}
              </span>
              {isDownloading ? "Generating PDF..." : "Export to PDF"}
            </button>
            <div className="grid grid-cols-3 gap-3">
              <Metric label="Final" value={risk?.final_risk_score ?? "-"} tone={risk?.risk_level || "low"} />
              <Metric label="Technical" value={risk?.technical_risk_score ?? "-"} tone={scoreTone(risk?.technical_risk_score || 0)} />
              <Metric label="Business" value={risk?.business_risk_score ?? "-"} tone={scoreTone(risk?.business_risk_score || 0)} />
            </div>
          </div>
        </div>
      </section>

      {!risk ? (
        <section className="rounded-2xl border border-border-divider bg-surface transition-colors duration-300 p-6 text-sm text-text-muted">
          {assessment.error || "Risk score is not available yet. Keep the scanners running until this assessment completes."}
        </section>
      ) : (
        <>
          <div className="inline-flex rounded-xl bg-surface-container border border-border-subtle p-1 shadow-sm self-start">
            <button
              onClick={() => setTab("executive")}
              className={`rounded-lg px-5 py-2 text-sm font-bold transition-all duration-200 ${tab === "executive" ? "bg-primary text-white shadow-sm" : "text-text-secondary hover:text-text-primary"}`}
            >
              Non-Technical / Executive
            </button>
            <button
              onClick={() => setTab("technical")}
              className={`rounded-lg px-5 py-2 text-sm font-bold transition-all duration-200 ${tab === "technical" ? "bg-primary text-white shadow-sm" : "text-text-secondary hover:text-text-primary"}`}
            >
              Technical Remediation
            </button>
          </div>

          {tab === "executive" ? (
            <ExecutiveView assessment={assessment} onGenerate={handleGenerateRemedies} isGenerating={isGenerating} aiError={aiError} />
          ) : (
            <TechnicalView assessment={assessment} scannerNames={activeScannerNames} />
          )}

          {aiRemedies.length > 0 && (
            <section className="rounded-2xl border border-border-subtle bg-surface transition-colors duration-300 p-6 shadow-sm">
              <div>
                <h2 className="text-section-header font-section-header flex items-center gap-2"><span className="material-symbols-outlined text-primary">tips_and_updates</span> Suggestion</h2>
              </div>
              <div className="mt-4 grid grid-cols-1 gap-3">
                {aiRemedies.map((item) => {
                  const finding = risk?.top_findings?.find((f) => f.id === item.finding_id);
                  const severity = finding?.severity || "unknown";
                  return (
                    <article key={item.finding_id} className={`rounded-2xl border bg-surface-container-lowest p-4 ${severityBorder(severity)}`}>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          {finding && <span className={`rounded px-2 py-1 text-xs font-bold uppercase ${riskBadge(severity)}`}>{severity}</span>}
                          <h3 className="font-bold text-text-primary">{item.title}</h3>
                          {(item as any).cwe && (
                            <span className="rounded bg-primary/10 text-primary px-2 py-1 text-[10px] font-bold border border-primary/20">{(item as any).cwe}</span>
                          )}
                        </div>
                        <span className="rounded bg-surface transition-colors duration-300 px-2 py-1 text-xs font-bold uppercase text-text-muted border border-border-divider">{item.scanner}</span>
                      </div>
                      <div className="mt-4 text-sm text-text-secondary leading-relaxed">
                        <ReactMarkdown
                          components={{
                            h3: (props) => <h3 className="text-sm font-bold mt-4 mb-2 text-text-primary" {...props} />,
                            p: (props) => <p className="mb-3" {...props} />,
                            ul: (props) => <ul className="list-disc pl-5 mb-3 space-y-1" {...props} />,
                            ol: (props) => <ol className="list-decimal pl-5 mb-3 space-y-1" {...props} />,
                            li: (props) => <li {...props} />,
                            strong: (props) => <strong className="font-semibold text-text-primary" {...props} />,
                            code: (props) => <code className="bg-surface-container-low border border-border-subtle px-1.5 py-0.5 rounded font-mono text-[12px] text-text-primary" {...props} />,
                            pre: (props) => <pre className="bg-surface-container-low border border-border-subtle p-3 rounded-md my-3 overflow-x-auto font-mono text-[12px] text-text-primary" {...props} />,
                          }}
                        >
                          {item.recommendation}
                        </ReactMarkdown>
                        {(item as any).auto_fix_patch && (
                          <div className="mt-4 border-t border-border-divider pt-4">
                            <p className="text-xs font-bold uppercase text-text-muted mb-2">Developer Action Guidance / Auto-Fix Patch</p>
                            <pre className="bg-surface-container-low border border-border-subtle p-3 rounded-md overflow-x-auto font-mono text-[12px] text-text-primary">
                              {(item as any).auto_fix_patch}
                            </pre>
                          </div>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

function ExecutiveView({
  assessment,
  onGenerate,
  isGenerating,
  aiError,
}: {
  assessment: RiskAssessment;
  onGenerate: () => void;
  isGenerating: boolean;
  aiError: string | null;
}) {
  const risk = assessment.result?.risk;
  if (!risk) return null;
  const brief = risk.executive_brief;

  return (
    <div className="grid grid-cols-1 gap-element-gap xl:grid-cols-[1.2fr_0.8fr]">
      <div className="flex flex-col gap-element-gap">
        <section className="rounded-2xl border border-border-subtle bg-surface transition-colors duration-300 p-6">
          <h2 className="text-section-header font-section-header flex items-center gap-2"><span className="material-symbols-outlined text-primary">monitoring</span> Executive Decision View</h2>
          <div className="mt-4 space-y-4">
            <Insight label="Headline" value={brief?.headline || risk.executive_summary} icon="campaign" />
            <Insight label="Business Impact" value={brief?.business_impact || `Business score ${risk.business_risk_score}`} icon="business_center" />
            <Insight label="Release Decision" value={brief?.decision || releaseDecision(risk.final_risk_score)} icon="gavel" />
            <Insight label="Board Message" value={brief?.board_message || risk.executive_summary} icon="groups" />
          </div>
        </section>
        
        {risk.formula && (
          <section className="rounded-2xl border border-border-subtle bg-surface transition-colors duration-300 p-6">
            <h2 className="text-section-header font-section-header flex items-center gap-2"><span className="material-symbols-outlined text-primary">calculate</span> Risk Scoring Formula</h2>
            <div className="mt-4 rounded-2xl bg-surface-container-lowest border border-border-divider p-6 relative overflow-hidden">
              
              <div className="relative flex flex-col items-center justify-center gap-4 md:flex-row md:gap-6">
                <div className="flex-1 text-center bg-surface-container p-4 rounded-xl border border-border-subtle">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Technical ({(risk.formula.technical_weight * 100).toFixed(0)}%)</p>
                  <p className="text-3xl font-black text-text-primary mt-2">{risk.formula.technical_risk_score}</p>
                </div>
                
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-surface-container border border-border-subtle shrink-0">
                  <span className="material-symbols-outlined text-text-muted text-[16px]">add</span>
                </div>
                
                <div className="flex-1 text-center bg-surface-container p-4 rounded-xl border border-border-subtle">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Business ({(risk.formula.business_weight * 100).toFixed(0)}%)</p>
                  <p className="text-3xl font-black text-text-primary mt-2">{risk.formula.business_risk_score}</p>
                </div>
                
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-surface-container border border-border-subtle shrink-0">
                  <span className="material-symbols-outlined text-text-muted text-[16px]">equal</span>
                </div>
                
                <div className="flex-[1.5] text-center bg-surface-container-high p-4 rounded-xl border border-border-divider relative">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Final Score</p>
                  <p className={`text-4xl font-black mt-1 ${scoreClass(scoreTone(risk.formula.final_risk_score))}`}>{risk.formula.final_risk_score}</p>
                </div>
              </div>
              <div className="relative mt-6 rounded-lg bg-surface-container-high/50 py-3 px-4 border border-border-subtle text-center inline-block w-full">
                <p className="font-mono text-xs font-semibold text-text-secondary">{risk.formula.expression}</p>
              </div>
            </div>
          </section>
        )}
      </div>

      <section className="rounded-2xl border border-border-subtle bg-surface transition-colors duration-300 p-6">
        <h2 className="text-section-header font-section-header flex items-center gap-2"><span className="material-symbols-outlined text-primary">priority</span> What To Fix First</h2>
        <div className="mt-4 space-y-3">
          {(risk.overall_priorities || []).slice(0, 5).map((item) => (
            <PriorityRow key={`${item.rank}-${item.scanner}-${item.title}`} item={item} compact />
          ))}
        </div>
        <button
          type="button"
          onClick={onGenerate}
          disabled={assessment.status !== "completed" || isGenerating}
          className="mt-5 w-full rounded-2xl bg-primary px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
        >
          {isGenerating ? "Generating remedies..." : assessment.result?.aiRemedies?.length ? "Regenerate remedies" : "Get remedies"}
        </button>
        {aiError && <p className="mt-2 rounded border border-red-200 bg-red-50 p-2 text-sm text-red-700">{aiError}</p>}
      </section>
    </div>
  );
}

function TechnicalView({ assessment, scannerNames }: { assessment: RiskAssessment; scannerNames: string[] }) {
  const risk = assessment.result?.risk;
  if (!risk) return null;

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-border-subtle bg-surface transition-colors duration-300 p-6">
        <h2 className="text-section-header font-section-header flex items-center gap-2"><span className="material-symbols-outlined text-primary">sort</span> Overall Technical Priority Order</h2>
        <p className="mt-1 text-sm text-text-secondary">{risk.developer_summary}</p>
        <div className="mt-4 space-y-3">
          {(risk.overall_priorities || []).map((item) => (
            <PriorityRow key={`${item.rank}-${item.scanner}-${item.title}`} item={item} />
          ))}
        </div>
      </section>

      {risk.correlation_paths && risk.correlation_paths.length > 0 && (
        <section className="rounded-2xl border border-border-subtle bg-surface transition-colors duration-300 p-6">
          <h2 className="text-section-header font-section-header flex items-center gap-2"><span className="material-symbols-outlined text-primary">route</span> Attack Paths & Correlations</h2>
          <p className="mt-1 text-sm text-text-secondary">Identified risk chains that span multiple scanners.</p>
          <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
            {risk.correlation_paths.map((path) => (
              <div key={path.id} className={`rounded-2xl bg-surface-container-lowest p-5 ${severityBorder(path.risk_level)} border`}>
                <div className="flex flex-wrap items-center gap-2 mb-4">
                  <span className={`rounded px-2 py-0.5 text-[11px] font-black uppercase tracking-wider ${riskBadge(path.risk_level)}`}>{path.risk_level}</span>
                  <p className="font-bold text-text-primary text-base">{path.title}</p>
                </div>
                <div className="flex flex-wrap gap-2 mb-4">
                  {path.scanners.map((s) => (
                    <span key={s} className="rounded bg-surface-container border border-border-subtle px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-text-secondary">{s}</span>
                  ))}
                </div>
                <p className="text-sm text-text-secondary mb-5 leading-relaxed bg-surface-container/50 p-3 rounded-lg border border-border-divider">{path.story}</p>
                <div className="space-y-3">
                  {path.remediation.map((step, idx) => (
                    <div key={idx} className="flex gap-3 items-start">
                      <span className="material-symbols-outlined text-[16px] text-primary shrink-0 mt-0.5">check_circle</span>
                      <p className="text-sm text-text-secondary leading-tight">{step}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="rounded-2xl border border-border-subtle bg-surface transition-colors duration-300 p-6">
        <h2 className="text-section-header font-section-header flex items-center gap-2"><span className="material-symbols-outlined text-primary">format_list_numbered</span> Priorities By Scanner</h2>
        <div className="mt-5 grid grid-cols-1 gap-5 @xl:grid-cols-2">
          {scannerNames.length === 0 ? (
            <p className="text-sm text-text-muted bg-surface-container-lowest p-4 rounded-xl border border-border-divider">No scanner-specific priority items were found.</p>
          ) : (
            scannerNames.map((scanner) => (
              <div key={scanner} className="rounded-2xl border border-border-divider bg-surface-container-lowest p-5">
                <div className="mb-4 flex items-center justify-between border-b border-border-divider pb-3">
                  <h3 className="font-bold text-text-primary text-lg flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary">analytics</span>
                    {SCANNER_LABELS[scanner] || scanner}
                  </h3>
                  <span className="rounded-full bg-primary/10 px-3 py-1 text-[11px] font-bold text-primary border border-primary/20">
                    {risk.scanner_priorities?.[scanner]?.length || 0} item(s)
                  </span>
                </div>
                <div className="space-y-4">
                  {(risk.scanner_priorities?.[scanner] || []).map((item) => (
                    <PriorityRow key={`${scanner}-${item.rank}-${item.title}`} item={item} compact />
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-border-subtle bg-surface transition-colors duration-300 p-6">
        <h2 className="text-section-header font-section-header flex items-center gap-2"><span className="material-symbols-outlined text-primary">policy</span> Scanner Score Evidence</h2>
        <div className="mt-5 grid grid-cols-1 gap-4 @md:grid-cols-4">
          {Object.values(risk.scanner_scores).map((scanner) => (
            <div key={scanner.scanner} className="rounded-2xl border border-border-divider bg-surface-container-lowest p-5 hover:border-primary/50 transition-colors">
              <p className="text-[11px] font-bold uppercase tracking-wider text-text-muted">{scanner.scanner}</p>
              <p className="mt-2 text-3xl font-black text-text-primary">{scanner.business_adjusted_score}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="bg-surface-container border border-border-divider rounded px-2 py-0.5 text-[10px] font-semibold text-text-secondary">{scanner.finding_count} finding(s)</span>
                {scanner.critical_findings > 0 && <span className="bg-severity-critical-bg border border-severity-critical/20 text-severity-critical rounded px-2 py-0.5 text-[10px] font-bold">{scanner.critical_findings} crit</span>}
                {scanner.high_findings > 0 && <span className="bg-severity-high-bg border border-severity-high/20 text-severity-high rounded px-2 py-0.5 text-[10px] font-bold">{scanner.high_findings} high</span>}
              </div>
              <ul className="mt-4 space-y-2 text-xs text-text-secondary border-t border-border-divider pt-3">
                {scanner.reasons.map((reason) => (
                  <li key={reason} className="flex gap-2 items-start">
                    <span className="text-primary opacity-50 mt-0.5">•</span>
                    <span className="leading-snug">{reason}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function PriorityRow({ item, compact = false }: { item: UnifiedRiskPriority; compact?: boolean }) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <article 
      className={`rounded-2xl bg-surface transition-colors border border-border-divider ${compact ? "p-3" : "p-4"}`}
    >
      <div 
        className="flex flex-wrap items-start justify-between gap-4 cursor-pointer select-none group" 
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="rounded bg-primary/20 text-primary px-2 py-0.5 text-[11px] font-black tracking-wider border border-primary/20">#{item.rank}</span>
            <span className={`rounded px-2 py-0.5 text-[11px] font-black tracking-wider uppercase ${riskBadge(item.risk_level)}`}>{item.risk_level}</span>
            <span className="rounded bg-surface-container px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-text-muted border border-border-subtle">{item.scanner}</span>
          </div>
          <h3 className="text-sm font-bold text-text-primary leading-tight group-hover:text-primary transition-colors">{item.title}</h3>
        </div>
        <div className="flex items-center gap-4 shrink-0">
          <div className="text-right shrink-0 bg-surface-container-low rounded-xl px-3 py-1 border border-border-divider">
            <p className="text-[9px] font-bold uppercase tracking-wider text-text-muted">Priority</p>
            <p className="text-xl font-black text-text-primary leading-none mt-1">{item.score}</p>
          </div>
          <span className="material-symbols-outlined text-text-muted">
            {isExpanded ? "expand_less" : "expand_more"}
          </span>
        </div>
      </div>
      
      {isExpanded && (
        <div className="mt-4 pt-4 border-t border-border-subtle">
          <p className="text-[11px] text-text-muted flex items-center flex-wrap gap-2 mb-3">
            <span className="font-semibold text-text-secondary">{item.category}</span>
            <span className="text-[10px]">●</span>
            <span>Owner: <span className="font-medium text-text-secondary">{item.suggested_owner}</span></span>
            <span className="text-[10px]">●</span>
            <span>SLA: <span className="font-medium text-text-secondary">{item.sla}</span></span>
          </p>
          
          {!compact && <p className="mb-4 text-sm text-text-secondary leading-relaxed">{item.why_first}</p>}
          
          <div className="grid grid-cols-1 gap-3 @md:grid-cols-2">
            <div className="rounded-xl bg-surface-container-lowest p-3 border border-border-divider">
              <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted flex items-center gap-1.5 mb-1.5"><span className="material-symbols-outlined text-[14px]">build</span> Fix first</p>
              <p className="text-sm text-text-secondary leading-snug">{item.fix_first}</p>
            </div>
            <div className="rounded-xl bg-surface-container-lowest p-3 border border-border-divider">
              <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted flex items-center gap-1.5 mb-1.5"><span className="material-symbols-outlined text-[14px]">fact_check</span> Next verification step</p>
              <p className="text-sm text-text-secondary leading-snug">{item.next_step}</p>
            </div>
          </div>
          
          {item.file_path && (
            <p className="mt-3 break-all font-mono text-[11px] text-text-muted bg-surface-container-low inline-block px-2 py-1 rounded border border-border-divider">
              {item.file_path}{item.line_number ? <span className="text-text-secondary">:{item.line_number}</span> : ""}
            </p>
          )}
        </div>
      )}
    </article>
  );
}

function Metric({ label, value, tone }: { label: string | number; value: string | number; tone: string }) {
  return (
    <div className="relative flex flex-col justify-center rounded-2xl border border-border-divider bg-surface-container-lowest p-4 text-center transition-all">
      <p className="text-[11px] font-bold uppercase tracking-wider text-text-muted">{label}</p>
      <p className={`mt-1 text-3xl font-black ${scoreClass(tone)}`}>{value}</p>
    </div>
  );
}

function Insight({ label, value, icon }: { label: string; value: string; icon: string }) {
  return (
    <div className="flex gap-4 rounded-2xl border border-border-divider bg-surface-container-lowest p-5 items-start">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-container-high text-primary">
        <span className="material-symbols-outlined text-[20px]">{icon}</span>
      </div>
      <div>
        <p className="text-[11px] font-bold uppercase tracking-wider text-text-muted">{label}</p>
        <p className="mt-1 text-sm font-medium text-text-primary leading-relaxed">{value}</p>
      </div>
    </div>
  );
}

function releaseDecision(score: number) {
  if (score >= 801) return "Block release until priority findings are mitigated.";
  if (score >= 601) return "Require security approval before release.";
  if (score >= 401) return "Proceed only with tracked remediation.";
  return "Proceed with normal monitoring.";
}

function scoreTone(score: number) {
  if (score >= 801) return "critical";
  if (score >= 601) return "high";
  if (score >= 401) return "elevated";
  if (score >= 201) return "moderate";
  return "low";
}

function riskBadge(level: string) {
  if (level === "critical") return "bg-severity-critical-bg text-severity-critical border border-severity-critical/20";
  if (level === "high") return "bg-severity-high-bg text-severity-high border border-severity-high/20";
  if (level === "elevated" || level === "medium") return "bg-severity-medium-bg text-severity-medium border border-severity-medium/20";
  if (level === "low") return "bg-severity-low-bg text-severity-low border border-severity-low/20";
  return "bg-surface-container-low text-text-muted border border-border-divider";
}

function severityBorder(level: string) {
  return "border-border-divider";
}

function scoreClass(tone: string) {
  if (tone === "critical") return "text-severity-critical";
  if (tone === "high") return "text-severity-high";
  if (tone === "elevated" || tone === "moderate") return "text-severity-medium";
  if (tone === "low") return "text-severity-low";
  return "text-text-primary";
}
