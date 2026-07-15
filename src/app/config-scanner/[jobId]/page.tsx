"use client";

import React, { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { LogEntry, ScanJob } from "@/shared/api/types";
import { fetchConfigJobStatus, getConfigScanLogsUrl } from "@/shared/api/client";
import { LiveExecutionLog } from "@/widgets/LiveExecutionLog";
import { SkeletonJobRow, SkeletonMetricsRow, SkeletonPanel } from "@/widgets/Skeleton";
import { ArrowLeftCircle } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ConfigMetricsRow } from "@/widgets/config/ConfigMetricsRow";
import { ConfigBusinessImpactPanel } from "@/widgets/config/ConfigBusinessImpactPanel";
import { ConfigInteractiveGraph } from "@/widgets/config/ConfigInteractiveGraph";
import { ConfigAttackPathsList } from "@/widgets/config/ConfigAttackPathsList";
import { InfoTooltip } from "@/shared/ui/InfoTooltip";

export default function ConfigScannerJobPage() {
  const { jobId } = useParams() as { jobId: string };
  const router = useRouter();

  const queryClient = useQueryClient();

  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isScanning, setIsScanning] = useState(true);
  const [activeTab, setActiveTab] = useState<"executive" | "technical">("executive");

  const eventSourceRef = useRef<EventSource | null>(null);

  const { data: jobData, isLoading: isJobLoading, error: queryError } = useQuery({
    queryKey: ["config-job", jobId],
    queryFn: () => fetchConfigJobStatus(jobId),
  });

  useEffect(() => {
    if (jobData) {
      if (jobData.logs && logs.length === 0) {
        setLogs(jobData.logs);
      }
      if (jobData.status === "completed" || jobData.status === "failed") {
        setIsScanning(false);
      } else if (isScanning && !eventSourceRef.current) {
        startLogStream(jobId);
      }
    }
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, [jobData, jobId]);

  const startLogStream = (id: string) => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const url = getConfigScanLogsUrl(id);
    const es = new EventSource(url);
    eventSourceRef.current = es;

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.level && data.message) {
          setLogs((prev) => [...prev, data]);

          if (data.message.includes("completed") || data.level === "error") {
            es.close();
            setIsScanning(false);
            queryClient.invalidateQueries({ queryKey: ["config-job", id] });
          }
        }
      } catch (err) {
        console.error("Failed to parse SSE message", err);
      }
    };

    es.onerror = () => {
      es.close();
      setIsScanning(false);
      // Fetch final job status when connection drops (job ends)
      queryClient.invalidateQueries({ queryKey: ["config-job", id] });
    };
  };

  if (queryError) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="text-red-500 font-bold text-xl mb-4">Error loading scan results</div>
        <p className="text-text-muted mb-6">{(queryError as Error).message || "Unknown error"}</p>
        <button onClick={() => router.push("/")} className="px-6 py-2 bg-primary text-white rounded-2xl hover:bg-primary/90 transition-colors">
          Return to Dashboard
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
  const result = jobData.result;
  const summary = result?.summary;
  const attackPaths = result?.attack_paths || [];
  const findings = result?.findings || [];

  console.log(attackPaths);

  return (
    <div className="max-w-[1280px] mx-auto flex flex-col gap-section-gap">
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="text-text-secondary hover:bg-surface-container p-2 rounded-full transition-colors flex items-center justify-center"
        >
          <span className="material-symbols-outlined hover:cursor-pointer"><ArrowLeftCircle size={36} /></span>
        </button>
        <div>
          <h1 className="font-headline-lg text-headline-lg text-text-primary mb-1">
            Config Scan: {job?.sourceLabel || jobId}
          </h1>
          <p className="font-body-sm text-body-sm text-text-secondary">
            Status: {job?.status || "Loading..."}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-element-gap">
        <LiveExecutionLog logs={logs} isRunning={isScanning} />

        {!isScanning && job?.status === "failed" && (
          <div className="bg-error-container text-on-error-container p-4 rounded-2xl border border-[#ffb4ab]">
            <h3 className="font-bold text-lg mb-2">Scan Failed</h3>
            <p>{job.error || "An unknown error occurred during the scan."}</p>
          </div>
        )}

        {!isScanning && job?.status === "completed" && !result && (
          <div className="bg-surface-container-low text-text-secondary p-4 rounded-2xl text-center">
            Scan completed but no results were returned.
          </div>
        )}

        {!isScanning && result && (
          <div className="flex flex-col gap-6">
            {/* Tab Navigation */}
            <div className="flex border-b border-border-divider mb-4">
              <button
                className={`py-2 px-6 font-semibold text-sm transition-colors relative ${activeTab === "executive" ? "text-primary" : "text-text-muted hover:text-text-primary"}`}
                onClick={() => setActiveTab("executive")}
              >
                Executive Summary
                {activeTab === "executive" && <div className="absolute bottom-[-1px] left-0 w-full h-0.5 bg-primary rounded-t-full"></div>}
              </button>
              <button
                className={`py-2 px-6 font-semibold text-sm transition-colors relative ${activeTab === "technical" ? "text-primary" : "text-text-muted hover:text-text-primary"}`}
                onClick={() => setActiveTab("technical")}
              >
                Technical Details
                {activeTab === "technical" && <div className="absolute bottom-[-1px] left-0 w-full h-0.5 bg-primary rounded-t-full"></div>}
              </button>
            </div>

            {activeTab === "executive" && (
              <div className="flex flex-col gap-6">
                <ConfigMetricsRow summary={summary} />
                <ConfigBusinessImpactPanel summary={summary} attackPaths={attackPaths} />

                {attackPaths.length > 0 && (
                  <>
                    <ConfigInteractiveGraph attackPaths={attackPaths} />
                    <ConfigAttackPathsList attackPaths={attackPaths} />
                  </>
                )}
              </div>
            )}

            {activeTab === "technical" && (
              <div className="flex flex-col gap-6">
                {findings.length > 0 && (
                  <div className="bg-surface-container-lowest rounded-2xl border border-border-divider p-6">
                    <div className="flex items-center mb-4">
                      <h3 className="text-xl font-bold">Misconfigurations</h3>
                      <InfoTooltip text="Raw list of all detected infrastructure misconfigurations." />
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-border-divider text-text-secondary text-sm">
                            <th className="pb-2 font-medium">Severity</th>
                            <th className="pb-2 font-medium">File</th>
                            <th className="pb-2 font-medium">Title</th>
                            <th className="pb-2 font-medium">Category</th>
                          </tr>
                        </thead>
                        <tbody className="text-sm">
                          {findings.map((finding: any, idx: number) => (
                            <tr key={idx} className="border-b border-border-divider last:border-none">
                              <td className="py-3 pr-4">
                                <span className={`px-2 py-1 rounded text-xs font-semibold ${finding.severity === "critical" ? "bg-red-100 text-red-800" : finding.severity === "high" ? "bg-orange-100 text-orange-800" : finding.severity === "medium" ? "bg-yellow-100 text-yellow-800" : "bg-blue-100 text-blue-800"}`}>
                                  {finding.severity.toUpperCase()}
                                </span>
                              </td>
                              <td className="py-3 pr-4 font-mono text-xs">{finding.file_path}:{finding.line_number}</td>
                              <td className="py-3 pr-4 font-medium">{finding.title}</td>
                              <td className="py-3 pr-4 text-text-secondary">{finding.category}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
