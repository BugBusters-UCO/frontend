"use client";

import React, { useState, useEffect, useRef } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeftCircle } from "lucide-react";
import { AgentScanJob, LogEntry } from "@/shared/api/types";
import { fetchAgentScan, getAgentScanLogsUrl } from "@/shared/api/client";
import { SkeletonJobRow, SkeletonMetricsRow, SkeletonPanel } from "@/widgets/Skeleton";
import { LiveExecutionLog } from "@/widgets/LiveExecutionLog";
import { FindingsTable as DependencyFindingsTable } from "@/widgets/FindingsTable";
import { ConfigAttackPathsList } from "@/widgets/config/ConfigAttackPathsList";
import { SecretMetricsRow } from "@/widgets/secret/SecretMetricsRow";
import { CipherMetricsRow } from "@/widgets/cipher/CipherMetricsRow";
import { MetricsRow } from "@/widgets/MetricsRow";

export default function VmAgentJobPage() {
  const { jobId } = useParams() as { jobId: string };
  const router = useRouter();
  const queryClient = useQueryClient();

  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isScanning, setIsScanning] = useState(true);
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<string>(searchParams.get("tab") || "");
  const eventSourceRef = useRef<EventSource | null>(null);

  const { data: jobData, isLoading: isJobLoading, error: queryError } = useQuery({
    queryKey: ["vm-agent-job", jobId],
    queryFn: () => fetchAgentScan(jobId),
  });

  useEffect(() => {
    if (jobData) {
      if (jobData.logs && logs.length === 0) {
        setLogs(jobData.logs as any[]);
      }
      if (jobData.status === "completed" || jobData.status === "failed" || jobData.status === "stopped") {
        setIsScanning(false);
      } else if (isScanning && !eventSourceRef.current) {
        startLogStream(jobId);
      }

      if (!activeTab && (jobData.result?.reports?.length ?? 0) > 0) {
        setActiveTab(jobData.result?.reports?.[0]?.module || "");
      }
    }

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, [jobData, jobId, activeTab, isScanning, logs.length]);

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  const startLogStream = (id: string) => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const url = getAgentScanLogsUrl(id);
    const es = new EventSource(url);
    eventSourceRef.current = es;

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.level && data.message) {
          setLogs((prev) => [...prev, data]);
          
          if (data.message.includes("completed") || data.message.includes("stopped") || data.level === "error") {
            // Keep it open until the backend formally completes it, but we can optimistically check status
          }
        }
      } catch (err) {
        console.error("Failed to parse SSE message", err);
      }
    };

    es.onerror = () => {
      es.close();
      setIsScanning(false);
      queryClient.invalidateQueries({ queryKey: ["vm-agent-job", id] });
    };
  };

  if (queryError) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="text-red-500 font-bold text-xl mb-4">Error loading VM Agent scan results</div>
        <p className="text-text-muted mb-6">{(queryError as Error).message || "Unknown error"}</p>
        <button onClick={() => router.push("/vm-agents/history")} className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors">
          Return to History
        </button>
      </div>
    );
  }

  if (isJobLoading || !jobData) {
    return (
      <div className="max-w-[1280px] mx-auto flex flex-col gap-6 pt-6">
        <SkeletonJobRow />
        <SkeletonMetricsRow />
        <SkeletonPanel />
      </div>
    );
  }

  const job = jobData;
  const result = jobData?.result;
  const reports = result?.reports || [];

  return (
    <div className="max-w-[1280px] mx-auto flex flex-col gap-section-gap pb-12">
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="text-text-secondary hover:bg-surface-container p-2 rounded-full transition-colors flex items-center justify-center"
        >
          <span className="material-symbols-outlined hover:cursor-pointer"><ArrowLeftCircle size={36}/></span>
        </button>
        <div>
          <h1 className="font-headline-lg text-headline-lg text-text-primary mb-1">
            VM Scan: {job?.sourceLabel || jobId}
          </h1>
          <div className="flex items-center gap-4 text-body-sm text-text-secondary">
            <span>Status: <strong className="uppercase">{job?.status}</strong></span>
            {(job.result as any)?.agent && <span>Agent: {(job.result as any).agent.name} ({(job.result as any).agent.hostname})</span>}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-element-gap">
        <LiveExecutionLog logs={logs} isRunning={isScanning} />
        
        {!isScanning && reports.length > 0 && (
          <div className="flex flex-col gap-6 mt-4">
            <div className="bg-white rounded-xl border border-border-subtle p-6">
              <h2 className="text-xl font-bold mb-4">VM Scan Summary</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 rounded-lg bg-surface-container-lowest border border-border-divider">
                  <div className="text-sm text-text-muted">Total Modules Run</div>
                  <div className="text-2xl font-bold text-text-primary">{reports.length}</div>
                </div>
                <div className="p-4 rounded-lg bg-surface-container-lowest border border-border-divider">
                  <div className="text-sm text-text-muted">Total Findings</div>
                  <div className="text-2xl font-bold text-text-primary">{result?.summary?.total_findings || 0}</div>
                </div>
                <div className="p-4 rounded-lg bg-surface-container-lowest border border-border-divider">
                  <div className="text-sm text-text-muted">Max Risk Score</div>
                  <div className="text-2xl font-bold text-severity-high">{result?.summary?.risk_score || 0}</div>
                </div>
                <div className="p-4 rounded-lg bg-surface-container-lowest border border-border-divider">
                  <div className="text-sm text-text-muted">Target Paths</div>
                  <div className="text-xl font-semibold text-text-primary truncate" title={job.selectedPaths?.join(", ")}>
                    {job.selectedPaths?.length} paths
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-2 border-b border-border-divider">
              {reports.map((report: any) => (
                <button
                  key={report.module}
                  onClick={() => setActiveTab(report.module)}
                  className={`px-4 py-3 font-semibold text-sm capitalize transition-colors border-b-2 ${
                    activeTab === report.module
                      ? "border-primary text-primary"
                      : "border-transparent text-text-secondary hover:text-text-primary hover:bg-surface-container-lowest"
                  }`}
                >
                  {report.module} Scanner
                  {report.findings > 0 && (
                    <span className="ml-2 inline-flex items-center justify-center px-2 py-0.5 text-[10px] font-bold rounded-full bg-severity-high-bg text-severity-high">
                      {report.findings}
                    </span>
                  )}
                </button>
              ))}
            </div>

            <div className="mt-4">
              {reports.map((report: any) => {
                if (activeTab !== report.module) return null;

                const repResult = report.result;
                if (!repResult) return <div key={report.module} className="p-8 text-center text-text-muted">No detailed results available for this module.</div>;

                if (report.module === "dependency") {
                  return (
                    <div key={report.module} className="flex flex-col gap-6">
                      <MetricsRow summary={repResult?.summary} />
                      <DependencyFindingsTable findings={repResult?.findings} />
                    </div>
                  );
                }
                
                if (report.module === "config") {
                  return (
                    <div key={report.module} className="flex flex-col gap-6">
                      <ConfigAttackPathsList attackPaths={repResult?.attack_paths || repResult?.findings || []} />
                    </div>
                  );
                }

                if (report.module === "secret") {
                  return (
                    <div key={report.module} className="flex flex-col gap-6">
                      <SecretMetricsRow summary={repResult?.summary} risk={repResult?.risk_analysis || {}} ciPolicy={repResult?.ci_policy || {}} />
                      <div className="bg-white rounded-xl border border-border-subtle shadow-sm p-card-padding">
                        <h3 className="font-section-header text-section-header mb-4">Secret Findings</h3>
                        <div className="space-y-4">
                          {repResult?.secrets?.map((sec: any, idx: number) => (
                            <div key={idx} className="border border-border-divider rounded-lg p-4 bg-surface-container-lowest">
                              <p className="font-bold text-text-primary text-sm">{sec.RuleID}</p>
                              <p className="text-xs font-mono text-text-muted mt-1 break-all">{sec.File}:{sec.StartLine}</p>
                            </div>
                          ))}
                          {!repResult?.secrets?.length && <p className="text-text-muted text-sm">No secrets found.</p>}
                        </div>
                      </div>
                    </div>
                  );
                }

                if (report.module === "cipher") {
                  return (
                    <div key={report.module} className="flex flex-col gap-6">
                      <CipherMetricsRow summary={repResult?.summary} ciPolicy={repResult?.ci_policy || {}} />
                      <div className="bg-white rounded-xl border border-border-subtle shadow-sm p-card-padding">
                        <h3 className="font-section-header text-section-header mb-4">Cipher Suites</h3>
                        <div className="space-y-4">
                          {repResult?.cipher_suites?.map((cs: any, idx: number) => (
                            <div key={idx} className="border border-border-divider rounded-lg p-4 bg-surface-container-lowest">
                              <p className="font-bold text-text-primary text-sm">{cs.name}</p>
                              <p className="text-xs text-text-muted mt-1">{cs.protocol}</p>
                            </div>
                          ))}
                          {!repResult?.cipher_suites?.length && <p className="text-text-muted text-sm">No cipher suites found.</p>}
                        </div>
                      </div>
                    </div>
                  );
                }

                return (
                  <div key={report.module} className="p-8 bg-surface-container rounded-xl text-center">
                    <p className="text-text-secondary">Unsupported module renderer for {report.module}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
