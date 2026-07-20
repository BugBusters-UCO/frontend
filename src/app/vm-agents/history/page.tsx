"use client";

import React from "react";
import Link from "next/link";
import { getCookie } from "cookies-next";
import { useQuery } from "@tanstack/react-query";
import { fetchAgentScanReports } from "@/shared/api/client";
import { AgentScanJob } from "@/shared/api/types";
import { SkeletonJobRow } from "@/widgets/Skeleton";
import { usePageContext } from "@/features/chatbot/usePageContext";

export default function VmAgentHistoryPage() {
  const currentSession = getCookie("bugbusters_github_session") as string | undefined;

  const { data: jobs = [], isLoading } = useQuery({
    queryKey: ["agent-scan-reports", currentSession],
    queryFn: async () => {
      const reports = await fetchAgentScanReports();
      return (reports || []).sort((a: AgentScanJob, b: AgentScanJob) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    },
  });

  // Group jobs by sourceLabel (Project Name)
  const groupedJobs = jobs.reduce((acc, job) => {
    const label = job.sourceLabel || "Unknown Project";
    if (!acc[label]) acc[label] = [];
    acc[label].push(job);
    return acc;
  }, {} as Record<string, AgentScanJob[]>);

  usePageContext({
    page: "VM Agents History",
    historyCount: jobs?.length || 0,
  });

  return (
    <div className="max-w-[1280px] mx-auto flex flex-col gap-section-gap">
      {/* Page Header */}
      <div className="bg-surface transition-colors duration-300 rounded-2xl border border-border-subtle shadow-sm p-8 relative overflow-hidden flex items-center justify-between">
        <div className="absolute top-0 right-0 w-48 h-48 bg-primary-container/5 rounded-bl-[150px] -z-10"></div>
        <div className="flex items-center gap-5">
           <div className="w-14 h-14 rounded-2xl bg-primary-container/10 flex items-center justify-center">
             <span className="material-symbols-outlined text-primary-container text-3xl">dns</span>
           </div>
           <div>
             <h1 className="font-headline-lg text-headline-lg text-text-primary mb-1">VM Agent History</h1>
             <p className="font-body-sm text-body-sm text-text-secondary">Track OS-level scans, configurations, and vulnerabilities found by your VM agents.</p>
           </div>
        </div>
      </div>

      <div className="bg-surface transition-colors duration-300 rounded-2xl border border-border-subtle shadow-sm p-card-padding">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-section-header font-section-header">Recent Scans by Project</h2>
        </div>
        
        <div className="space-y-6 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
          {isLoading ? (
            <div className="border border-border-divider rounded-2xl overflow-hidden">
              <div className="bg-surface-container-lowest px-4 py-3 border-b border-border-divider flex items-center gap-2">
                 <span className="material-symbols-outlined text-text-secondary text-xl">folder_open</span>
                 <div className="h-4 bg-surface-container-high animate-pulse rounded w-32" />
              </div>
              <div className="divide-y divide-border-divider">
                 <SkeletonJobRow />
                 <SkeletonJobRow />
                 <SkeletonJobRow />
              </div>
            </div>
          ) : Object.keys(groupedJobs).length === 0 ? (
            <div className="text-body-sm text-text-muted text-center py-8">
              No recent VM agent scans found
            </div>
          ) : (
            Object.entries(groupedJobs).map(([project, projectJobs]) => (
            <div key={project} className="border border-border-divider rounded-2xl overflow-hidden">
              <div className="bg-surface-container-lowest px-4 py-3 border-b border-border-divider flex items-center gap-2">
                <span className="material-symbols-outlined text-text-secondary text-xl">folder_open</span>
                <h3 className="font-semibold text-body-sm text-text-primary">{project}</h3>
              </div>
              <div className="divide-y divide-border-divider">
                {projectJobs.map((job) => {
                  let statusBadge = null;
                  if (job.status === "completed") {
                    statusBadge = (
                      <span className="px-2.5 py-0.5 rounded-full text-body-xs font-semibold bg-severity-low-bg text-severity-low">
                        Completed
                      </span>
                    );
                  } else if (job.status === "failed") {
                    statusBadge = (
                      <span className="px-2.5 py-0.5 rounded-full text-body-xs font-semibold bg-severity-high-bg text-severity-high">
                        Failed
                      </span>
                    );
                  } else {
                    statusBadge = (
                      <span className="px-2.5 py-0.5 rounded-full text-body-xs font-semibold bg-surface-container-highest text-text-secondary flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-primary-container animate-pulse"></span>
                        {job.status === 'stopping' ? 'Stopping' : 'Running'}
                      </span>
                    );
                  }

                  return (
                    <div
                      key={job.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between p-4 hover:bg-surface-container-low transition-colors group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center group-hover:scale-105 transition-transform">
                          <span className="material-symbols-outlined text-[18px] text-text-secondary">dns</span>
                        </div>
                        <div>
                          <Link href={`/vm-agents/${job.id}`} className="text-body-sm font-medium text-text-primary hover:text-primary transition-colors flex items-center gap-2">
                            VM Agent Scan
                            <span className="text-xs text-text-muted font-normal border rounded px-1.5 py-0.5">
                              {job.modules?.length || 0} modules
                            </span>
                          </Link>
                          <div className="text-body-xs text-text-muted mt-0.5 mb-1.5">
                            {new Date(job.createdAt).toLocaleDateString()} at {new Date(job.createdAt).toLocaleTimeString()}
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {(job.modules || []).map((mod: string) => (
                              <Link
                                key={mod}
                                href={`/vm-agents/${job.id}?tab=${mod}`}
                                className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded border border-border-divider bg-surface-container-lowest hover:bg-surface-container-high transition-colors text-text-secondary"
                              >
                                {mod}
                              </Link>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 mt-3 sm:mt-0">
                        <div className="text-right">
                          <div className="text-xs font-bold text-text-primary">{job.result?.summary?.total_findings || 0} Findings</div>
                          <div className="text-[10px] text-text-muted">Risk Score: {job.result?.summary?.risk_score || 0}</div>
                        </div>
                        {statusBadge}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
        </div>
      </div>
    </div>
  );
}
