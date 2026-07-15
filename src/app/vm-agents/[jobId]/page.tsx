"use client";

import React, { useState, useEffect, useRef } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeftCircle } from "lucide-react";
import { AgentScanJob, LogEntry } from "@/shared/api/types";
import { fetchAgentScan, getAgentScanLogsUrl } from "@/shared/api/client";
import { SkeletonJobRow, SkeletonMetricsRow, SkeletonPanel } from "@/widgets/Skeleton";
import { LiveExecutionLog } from "@/widgets/LiveExecutionLog";

export default function VmAgentJobPage() {
  const { jobId } = useParams() as { jobId: string };
  const router = useRouter();
  const queryClient = useQueryClient();

  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isScanning, setIsScanning] = useState(true);
  const searchParams = useSearchParams();
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
    }

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, [jobData, jobId, isScanning, logs.length]);

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
        <button onClick={() => router.push("/vm-agents/history")} className="px-6 py-2 bg-primary text-white rounded-2xl hover:bg-primary/90 transition-colors">
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
            <div className="bg-surface transition-colors duration-300 rounded-2xl border border-border-subtle p-6">
              <h2 className="text-xl font-bold mb-2">VM Scan Details</h2>
              <p className="text-body-sm text-text-secondary mb-6">Select a scanner module below to view its full report and findings.</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {reports.map((report: any) => (
                  <button
                    key={report.module}
                    onClick={() => router.push(`/${report.module}-scanner/${jobId}`)}
                    className="flex flex-col text-left bg-surface-container-lowest border border-border-divider rounded-2xl p-6 hover:shadow-md hover:border-primary transition-all group"
                  >
                    <div className="flex justify-between items-center mb-6 w-full">
                      <h3 className="font-headline-sm text-headline-sm capitalize text-text-primary group-hover:text-primary transition-colors">
                        {report.module} Scan
                      </h3>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide
                        ${report.status === "completed" ? "bg-status-success-bg text-status-success" : 
                          report.status === "failed" ? "bg-status-error-bg text-status-error" : 
                          "bg-status-neutral-bg text-status-neutral"}
                      `}>
                        {report.status}
                      </span>
                    </div>
                    
                    <div className="mt-auto">
                      <div className="text-4xl font-bold text-text-primary mb-1">
                        {report.findings || 0}
                      </div>
                      <div className="text-sm text-text-secondary">Total Findings</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
