"use client";

import React, { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { LogEntry, ScanJob, ScanResult } from "@/shared/api/types";
import { fetchJobStatus, getScanLogsUrl } from "@/shared/api/client";
import { MetricsRow } from "@/widgets/MetricsRow";
import { BusinessImpactPanel } from "@/widgets/BusinessImpactPanel";
import { BlastRadiusMap } from "@/widgets/BlastRadiusMap";
import { LiveExecutionLog } from "@/widgets/LiveExecutionLog";
import { FindingsTable } from "@/widgets/FindingsTable";
import { SkeletonJobRow, SkeletonMetricsRow, SkeletonPanel } from "@/widgets/Skeleton";
import { ArrowLeftCircle } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:5000";

export default function ScannerJobPage() {
  const { jobId } = useParams() as { jobId: string };
  const router = useRouter();

  const queryClient = useQueryClient();

  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isScanning, setIsScanning] = useState(true);
  const [view, setView] = useState<"summary" | "technical">("summary");
  const eventSourceRef = useRef<EventSource | null>(null);

  const { data: jobData, isLoading: isJobLoading, error: queryError } = useQuery({
    queryKey: ["dependency-job", jobId],
    queryFn: () => fetchJobStatus(jobId),
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

    const url = getScanLogsUrl(id);
    const es = new EventSource(url);
    eventSourceRef.current = es;

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.level && data.message) {
          setLogs((prev) => [...prev, data]);
          
          if (data.message.includes("Scan completed") || data.level === "error") {
            es.close();
            setIsScanning(false);
            // Re-fetch final job result
            queryClient.invalidateQueries({ queryKey: ["dependency-job", id] });
          }
        }
      } catch (err) {
        console.error("Failed to parse SSE message", err);
      }
    };

    es.onerror = () => {
      es.close();
      setIsScanning(false);
      queryClient.invalidateQueries({ queryKey: ["dependency-job", id] });
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
  const result = jobData?.result;

  return (
    <div className="max-w-[1280px] mx-auto flex flex-col gap-section-gap">
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="text-text-secondary hover:bg-surface-container p-2 rounded-full transition-colors flex items-center justify-center"
        >
          <span className="material-symbols-outlined hover:cursor-pointer"><ArrowLeftCircle size={36}/></span>
        </button>
        <div>
          <h1 className="font-headline-lg text-headline-lg text-text-primary mb-1">
            Dependency Scan: {job?.sourceLabel || jobId}
          </h1>
          <p className="font-body-sm text-body-sm text-text-secondary">
            Status: {job?.status || "Loading..."}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-element-gap">
        <LiveExecutionLog logs={logs} isRunning={isScanning} />
        {!isScanning && (
          <>
            <div className="flex items-center gap-4 border-b border-border-divider pb-2 mb-2">
              <button
                onClick={() => setView("summary")}
                className={`px-4 py-2 font-bold text-body-sm transition-colors border-b-2 ${
                  view === "summary"
                    ? "border-primary text-primary"
                    : "border-transparent text-text-secondary hover:text-text-primary"
                }`}
              >
                Executive Summary
              </button>
              <button
                onClick={() => setView("technical")}
                className={`px-4 py-2 font-bold text-body-sm transition-colors border-b-2 ${
                  view === "technical"
                    ? "border-primary text-primary"
                    : "border-transparent text-text-secondary hover:text-text-primary"
                }`}
              >
                Technical Details
              </button>
            </div>

            {view === "summary" ? (
              <>
                <MetricsRow summary={result?.summary} />
                <BusinessImpactPanel
                  summary={result?.summary}
                  chains={result?.risk_chains || []}
                  capabilities={result?.capability_findings || []}
                />
                <BlastRadiusMap chains={result?.risk_chains || []} />
              </>
            ) : (
              <>
                {result && result.findings && result.findings.length > 0 ? (
                  <FindingsTable findings={result.findings} />
                ) : (
                  <div className="bg-surface-container text-text-secondary p-8 rounded-2xl text-center font-bold">
                    No technical findings available.
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
