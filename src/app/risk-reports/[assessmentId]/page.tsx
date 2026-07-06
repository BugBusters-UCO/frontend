"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchRiskAssessment, generateRiskAssessmentRemedies } from "@/shared/api/client";
import type { RiskAssessment, UnifiedRiskPriority } from "@/shared/api/types";

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

  if (isLoading) {
    return <div className="mx-auto max-w-[1280px] rounded-lg border border-border-divider bg-white p-6 text-sm text-text-muted">Loading risk report...</div>;
  }

  if (!assessment) {
    return <div className="mx-auto max-w-[1280px] rounded-lg border border-red-200 bg-red-50 p-6 text-sm text-red-700">Risk report not found.</div>;
  }

  return (
    <div className="mx-auto flex max-w-[1280px] flex-col gap-section-gap">
      <section className="rounded-2xl border border-border-subtle bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
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
          <div className="grid grid-cols-3 gap-3">
            <Metric label="Final" value={risk?.final_risk_score ?? "-"} tone={risk?.risk_level || "low"} />
            <Metric label="Technical" value={risk?.technical_risk_score ?? "-"} tone={scoreTone(risk?.technical_risk_score || 0)} />
            <Metric label="Business" value={risk?.business_risk_score ?? "-"} tone={scoreTone(risk?.business_risk_score || 0)} />
          </div>
        </div>
      </section>

      {!risk ? (
        <section className="rounded-lg border border-border-divider bg-white p-6 text-sm text-text-muted">
          {assessment.error || "Risk score is not available yet. Keep the scanners running until this assessment completes."}
        </section>
      ) : (
        <>
          <div className="flex rounded-lg border border-border-divider bg-white p-1 shadow-sm">
            <button
              onClick={() => setTab("executive")}
              className={`flex-1 rounded-md px-4 py-2 text-sm font-bold ${tab === "executive" ? "bg-primary text-white" : "text-text-secondary hover:bg-surface-container"}`}
            >
              Non-Technical / Executive
            </button>
            <button
              onClick={() => setTab("technical")}
              className={`flex-1 rounded-md px-4 py-2 text-sm font-bold ${tab === "technical" ? "bg-primary text-white" : "text-text-secondary hover:bg-surface-container"}`}
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
            <section className="rounded-lg border border-border-subtle bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-section-header font-section-header">AI Remedies</h2>
                  <p className="mt-1 text-xs text-text-muted">{assessment.result?.aiPromptPolicy}</p>
                </div>
                {assessment.result?.aiTokenUsage && (
                  <p className="rounded bg-surface-container-low px-3 py-2 font-mono text-xs text-text-muted">
                    tokens prompt {assessment.result.aiTokenUsage.prompt_tokens || 0}, completion {assessment.result.aiTokenUsage.completion_tokens || 0}, total {assessment.result.aiTokenUsage.total_tokens || 0}
                  </p>
                )}
              </div>
              <div className="mt-4 grid grid-cols-1 gap-3">
                {aiRemedies.map((item) => (
                  <article key={item.finding_id} className="rounded-lg border border-border-divider bg-surface-container-lowest p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="font-bold text-text-primary">{item.title}</h3>
                      <span className="rounded bg-white px-2 py-1 text-xs font-bold uppercase text-text-muted">{item.scanner}</span>
                    </div>
                    <p className="mt-3 whitespace-pre-wrap text-sm text-text-secondary">{item.recommendation}</p>
                    {item.token_usage?.total_tokens !== undefined && (
                      <p className="mt-3 font-mono text-xs text-text-muted">
                        tokens prompt {item.token_usage.prompt_tokens || 0}, completion {item.token_usage.completion_tokens || 0}, total {item.token_usage.total_tokens || 0}
                      </p>
                    )}
                  </article>
                ))}
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
      <section className="rounded-lg border border-border-subtle bg-white p-5 shadow-sm">
        <h2 className="text-section-header font-section-header">Executive Decision View</h2>
        <div className="mt-4 space-y-4">
          <Insight label="Headline" value={brief?.headline || risk.executive_summary} icon="campaign" />
          <Insight label="Business Impact" value={brief?.business_impact || `Business score ${risk.business_risk_score}`} icon="business_center" />
          <Insight label="Release Decision" value={brief?.decision || releaseDecision(risk.final_risk_score)} icon="gavel" />
          <Insight label="Board Message" value={brief?.board_message || risk.executive_summary} icon="groups" />
        </div>
      </section>

      <section className="rounded-lg border border-border-subtle bg-white p-5 shadow-sm">
        <h2 className="text-section-header font-section-header">What To Fix First</h2>
        <div className="mt-4 space-y-3">
          {(risk.overall_priorities || []).slice(0, 5).map((item) => (
            <PriorityRow key={`${item.rank}-${item.scanner}-${item.title}`} item={item} compact />
          ))}
        </div>
        <button
          type="button"
          onClick={onGenerate}
          disabled={assessment.status !== "completed" || isGenerating}
          className="mt-5 w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
        >
          {isGenerating ? "Generating remedies..." : assessment.result?.aiRemedies?.length ? "Regenerate AI remedies" : "Get AI remedies"}
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
      <section className="rounded-lg border border-border-subtle bg-white p-5 shadow-sm">
        <h2 className="text-section-header font-section-header">Overall Technical Priority Order</h2>
        <p className="mt-1 text-sm text-text-secondary">{risk.developer_summary}</p>
        <div className="mt-4 space-y-3">
          {(risk.overall_priorities || []).map((item) => (
            <PriorityRow key={`${item.rank}-${item.scanner}-${item.title}`} item={item} />
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-border-subtle bg-white p-5 shadow-sm">
        <h2 className="text-section-header font-section-header">Priorities By Scanner</h2>
        <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
          {scannerNames.length === 0 ? (
            <p className="text-sm text-text-muted">No scanner-specific priority items were found.</p>
          ) : (
            scannerNames.map((scanner) => (
              <div key={scanner} className="rounded-lg border border-border-divider p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="font-bold text-text-primary">{SCANNER_LABELS[scanner] || scanner}</h3>
                  <span className="rounded bg-surface-container-low px-2 py-1 text-xs font-bold text-text-muted">
                    {risk.scanner_priorities?.[scanner]?.length || 0} item(s)
                  </span>
                </div>
                <div className="space-y-3">
                  {(risk.scanner_priorities?.[scanner] || []).map((item) => (
                    <PriorityRow key={`${scanner}-${item.rank}-${item.title}`} item={item} compact />
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="rounded-lg border border-border-subtle bg-white p-5 shadow-sm">
        <h2 className="text-section-header font-section-header">Scanner Score Evidence</h2>
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-4">
          {Object.values(risk.scanner_scores).map((scanner) => (
            <div key={scanner.scanner} className="rounded-lg border border-border-divider p-4">
              <p className="text-xs font-bold uppercase text-text-muted">{scanner.scanner}</p>
              <p className="mt-2 text-2xl font-black text-text-primary">{scanner.business_adjusted_score}</p>
              <p className="mt-1 text-xs text-text-muted">{scanner.finding_count} finding(s), {scanner.critical_findings} critical, {scanner.high_findings} high</p>
              <ul className="mt-3 space-y-1 text-xs text-text-secondary">
                {scanner.reasons.map((reason) => <li key={reason}>{reason}</li>)}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function PriorityRow({ item, compact = false }: { item: UnifiedRiskPriority; compact?: boolean }) {
  return (
    <article className={`rounded-lg border border-border-divider bg-surface-container-lowest ${compact ? "p-3" : "p-4"}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded bg-primary-container px-2 py-1 text-xs font-black text-white">#{item.rank}</span>
            <span className={`rounded px-2 py-1 text-xs font-bold uppercase ${riskBadge(item.risk_level)}`}>{item.risk_level}</span>
            <span className="rounded bg-white px-2 py-1 text-xs font-bold uppercase text-text-muted">{item.scanner}</span>
          </div>
          <h3 className="mt-2 font-bold text-text-primary">{item.title}</h3>
          <p className="mt-1 text-xs text-text-muted">
            {item.category} / owner: {item.suggested_owner} / SLA: {item.sla}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs font-bold uppercase text-text-muted">Priority</p>
          <p className="text-2xl font-black text-text-primary">{item.score}</p>
        </div>
      </div>
      {!compact && <p className="mt-3 text-sm text-text-secondary">{item.why_first}</p>}
      <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
        <div>
          <p className="text-xs font-bold uppercase text-text-muted">Fix first</p>
          <p className="mt-1 text-sm text-text-secondary">{item.fix_first}</p>
        </div>
        <div>
          <p className="text-xs font-bold uppercase text-text-muted">Next verification step</p>
          <p className="mt-1 text-sm text-text-secondary">{item.next_step}</p>
        </div>
      </div>
      {item.file_path && (
        <p className="mt-3 break-all font-mono text-xs text-text-muted">
          {item.file_path}{item.line_number ? `:${item.line_number}` : ""}
        </p>
      )}
    </article>
  );
}

function Metric({ label, value, tone }: { label: string | number; value: string | number; tone: string }) {
  return (
    <div className="rounded-lg border border-border-divider bg-surface-container-lowest p-4 text-right">
      <p className="text-xs font-bold uppercase text-text-muted">{label}</p>
      <p className={`mt-1 text-3xl font-black ${scoreClass(tone)}`}>{value}</p>
    </div>
  );
}

function Insight({ label, value, icon }: { label: string; value: string; icon: string }) {
  return (
    <div className="rounded-lg border border-border-divider bg-surface-container-lowest p-4">
      <div className="flex items-center gap-2">
        <span className="material-symbols-outlined text-[20px] text-primary-container">{icon}</span>
        <p className="text-xs font-bold uppercase text-text-muted">{label}</p>
      </div>
      <p className="mt-2 text-sm font-semibold text-text-primary">{value}</p>
    </div>
  );
}

function releaseDecision(score: number) {
  if (score >= 81) return "Block release until priority findings are mitigated.";
  if (score >= 61) return "Require security approval before release.";
  if (score >= 41) return "Proceed only with tracked remediation.";
  return "Proceed with normal monitoring.";
}

function scoreTone(score: number) {
  if (score >= 81) return "critical";
  if (score >= 61) return "high";
  if (score >= 41) return "elevated";
  if (score >= 21) return "moderate";
  return "low";
}

function riskBadge(level: string) {
  if (level === "critical") return "bg-red-100 text-red-800";
  if (level === "high") return "bg-orange-100 text-orange-800";
  if (level === "elevated") return "bg-yellow-100 text-yellow-800";
  return "bg-green-100 text-green-800";
}

function scoreClass(tone: string) {
  if (tone === "critical") return "text-severity-critical";
  if (tone === "high") return "text-severity-high";
  if (tone === "elevated" || tone === "moderate") return "text-[#8a5200]";
  return "text-tertiary";
}
