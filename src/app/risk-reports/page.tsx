"use client";

import Link from "next/link";
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchRiskAssessments } from "@/shared/api/client";
import type { RiskAssessment } from "@/shared/api/types";
import { usePageContext } from "@/features/chatbot/usePageContext";

export default function RiskReportsPage() {
  const { data: assessments = [], isLoading } = useQuery({
    queryKey: ["risk-assessments", "reports"],
    queryFn: fetchRiskAssessments,
    refetchInterval: (query) => {
      const active = query.state.data?.some((item) => ["waiting", "running"].includes(item.status));
      return active ? 4000 : false;
    },
  });

  const groupedAssessments = useMemo(() => {
    const groups: Record<string, RiskAssessment[]> = {};
    for (const a of assessments) {
      const label = a.sourceLabel || "Unknown Project";
      if (!groups[label]) groups[label] = [];
      groups[label].push(a);
    }
    return Object.entries(groups).map(([project, items]) => ({
      project,
      items: items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    }));
  }, [assessments]);

  usePageContext({
    page: "Risk Reports",
    assessmentsCount: assessments?.length || 0,
    projectCount: groupedAssessments.length,
  });

  return (
    <div className="mx-auto flex max-w-[1280px] flex-col gap-section-gap">
      <section className="rounded-2xl border border-border-subtle bg-surface transition-colors duration-300 p-8 shadow-sm">
        <div className="flex items-center gap-5">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-container/10">
            <span className="material-symbols-outlined text-3xl text-primary-container">summarize</span>
          </div>
          <div>
            <h1 className="font-headline-lg text-headline-lg text-text-primary">Project Risk Reports</h1>
            <p className="mt-1 text-sm text-text-secondary">Executive and technical reports aggregated by project.</p>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-border-subtle bg-surface transition-colors duration-300 shadow-sm">
        <div className="border-b border-border-divider p-5">
          <h2 className="text-section-header font-section-header">Project Based Risk Reports</h2>
        </div>
        <div className="flex flex-col p-5 gap-6">
          {isLoading ? (
            <div className="text-sm text-text-muted">Loading risk reports...</div>
          ) : groupedAssessments.length === 0 ? (
            <div className="text-sm text-text-muted">No risk assessment reports are available yet.</div>
          ) : (
            groupedAssessments.map((group) => <ProjectReportGroup key={group.project} group={group} />)
          )}
        </div>
      </section>
    </div>
  );
}

function ProjectReportGroup({ group }: { group: { project: string; items: RiskAssessment[] } }) {
  const [expanded, setExpanded] = useState(false);
  const latestAssessment = group.items[0];
  const risk = latestAssessment?.result?.risk;
  const score = risk?.final_risk_score;
  const priorityCount = risk?.overall_priorities?.length || 0;

  return (
    <div className="rounded-xl border border-border-divider overflow-hidden bg-surface-container-lowest">
      <div 
        className="flex items-center justify-between gap-4 p-5 cursor-pointer hover:bg-surface-container-low transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-bold text-lg text-text-primary">{group.project}</h3>
            {risk?.risk_level && <span className={`rounded px-2 py-1 text-xs font-bold uppercase ${riskClass(risk.risk_level)}`}>{risk.risk_level}</span>}
          </div>
          <p className="mt-1 text-sm text-text-muted">
            Latest Scan: {new Date(latestAssessment.createdAt).toLocaleString()} / {priorityCount} priority item(s) / {group.items.length} total scans
          </p>
        </div>
        <div className="flex items-center gap-6">
          <div className="text-right">
            <p className="text-xs font-bold uppercase text-text-muted">Latest Final Score</p>
            <p className="text-2xl font-black text-text-primary">{score ?? "-"}</p>
          </div>
          <span className={`material-symbols-outlined text-text-muted transition-transform duration-300 ${expanded ? "rotate-90" : ""}`}>
            chevron_right
          </span>
        </div>
      </div>
      
      {expanded && (
        <div className="border-t border-border-divider divide-y divide-border-divider bg-surface">
          {group.items.map(assessment => (
            <RiskReportRow key={assessment.id} assessment={assessment} />
          ))}
        </div>
      )}
    </div>
  );
}

function RiskReportRow({ assessment }: { assessment: RiskAssessment }) {
  const risk = assessment.result?.risk;
  const score = risk?.final_risk_score;
  const priorityCount = risk?.overall_priorities?.length || 0;

  return (
    <Link href={`/risk-reports/${assessment.id}`} className="flex items-center justify-between gap-4 p-4 pl-8 transition-colors hover:bg-surface-container-lowest">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold text-text-primary text-sm">Scan ID: {assessment.id.slice(0, 8)}</span>
          <span className={`rounded px-2 py-1 text-[10px] font-bold uppercase ${statusClass(assessment.status)}`}>{assessment.status}</span>
        </div>
        <p className="mt-1 text-xs text-text-muted">
          {assessment.sourceType} / {new Date(assessment.createdAt).toLocaleString()}
        </p>
      </div>
      <div className="flex items-center gap-4">
        <div className="text-right">
          <p className="text-lg font-bold text-text-primary">{score ?? "-"}</p>
        </div>
        <span className="material-symbols-outlined text-text-muted text-sm">open_in_new</span>
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
