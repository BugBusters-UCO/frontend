"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { fetchRiskAssessments } from "@/shared/api/client";
import type { RiskAssessment } from "@/shared/api/types";

export default function RiskReportsPage() {
  const { data: assessments = [], isLoading } = useQuery({
    queryKey: ["risk-assessments", "reports"],
    queryFn: fetchRiskAssessments,
    refetchInterval: (query) => {
      const active = query.state.data?.some((item) => ["waiting", "running"].includes(item.status));
      return active ? 4000 : false;
    },
  });

  return (
    <div className="mx-auto flex max-w-[1280px] flex-col gap-section-gap">
      <section className="rounded-2xl border border-border-subtle bg-white p-8 shadow-sm">
        <div className="flex items-center gap-5">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-container/10">
            <span className="material-symbols-outlined text-3xl text-primary-container">summarize</span>
          </div>
          <div>
            <h1 className="font-headline-lg text-headline-lg text-text-primary">Risk Reports</h1>
            <p className="mt-1 text-sm text-text-secondary">Executive and technical reports generated from completed scanner assessments.</p>
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-border-subtle bg-white shadow-sm">
        <div className="border-b border-border-divider p-5">
          <h2 className="text-section-header font-section-header">Assessment History</h2>
        </div>
        <div className="divide-y divide-border-divider">
          {isLoading ? (
            <div className="p-6 text-sm text-text-muted">Loading risk reports...</div>
          ) : assessments.length === 0 ? (
            <div className="p-6 text-sm text-text-muted">No risk assessment reports are available yet.</div>
          ) : (
            assessments.map((assessment) => <RiskReportRow key={assessment.id} assessment={assessment} />)
          )}
        </div>
      </section>
    </div>
  );
}

function RiskReportRow({ assessment }: { assessment: RiskAssessment }) {
  const risk = assessment.result?.risk;
  const score = risk?.final_risk_score;
  const priorityCount = risk?.overall_priorities?.length || 0;

  return (
    <Link href={`/risk-reports/${assessment.id}`} className="flex items-center justify-between gap-4 p-5 transition-colors hover:bg-surface-container-lowest">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-semibold text-text-primary">{assessment.sourceLabel}</p>
          <span className={`rounded px-2 py-1 text-xs font-bold uppercase ${statusClass(assessment.status)}`}>{assessment.status}</span>
          {risk?.risk_level && <span className={`rounded px-2 py-1 text-xs font-bold uppercase ${riskClass(risk.risk_level)}`}>{risk.risk_level}</span>}
        </div>
        <p className="mt-1 text-xs text-text-muted">
          {assessment.sourceType} / {new Date(assessment.createdAt).toLocaleString()} / {priorityCount} priority item(s)
        </p>
      </div>
      <div className="flex items-center gap-4">
        <div className="text-right">
          <p className="text-xs font-bold uppercase text-text-muted">Final Score</p>
          <p className="text-2xl font-black text-text-primary">{score ?? "-"}</p>
        </div>
        <span className="material-symbols-outlined text-text-muted">chevron_right</span>
      </div>
    </Link>
  );
}

function statusClass(status: string) {
  if (status === "completed") return "bg-green-100 text-green-800";
  if (status === "failed" || status === "cancelled") return "bg-red-100 text-red-800";
  return "bg-yellow-100 text-yellow-800";
}

function riskClass(level: string) {
  if (level === "critical") return "bg-red-100 text-red-800";
  if (level === "high") return "bg-orange-100 text-orange-800";
  if (level === "elevated") return "bg-yellow-100 text-yellow-800";
  return "bg-green-100 text-green-800";
}
