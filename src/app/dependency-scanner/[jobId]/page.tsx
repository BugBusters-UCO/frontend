"use client";

import React, { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { LogEntry, ScanJob, ScanResult } from "@/shared/api/types";
import { fetchJobStatus, getScanLogsUrl } from "@/shared/api/client";
import { MetricsRow } from "@/widgets/MetricsRow";
import { TrustIntelligencePanel } from "@/widgets/TrustIntelligencePanel";
import { BlastRadiusMap } from "@/widgets/BlastRadiusMap";
import { LiveExecutionLog } from "@/widgets/LiveExecutionLog";
import { FindingsTable } from "@/widgets/FindingsTable";
import { SkeletonJobRow, SkeletonMetricsRow, SkeletonPanel } from "@/widgets/Skeleton";
import { ArrowLeftCircle } from "lucide-react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:5000";

export default function ScannerJobPage() {
  const { jobId } = useParams() as { jobId: string };
  const router = useRouter();

  const [job, setJob] = useState<ScanJob | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isScanning, setIsScanning] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!jobId) return;

    // Fetch initial status
    fetchJobStatus(jobId)
      .then((data) => {
        setJob(data);
        if (data.logs) {
          setLogs(data.logs);
        }
        if (data.status === "completed" || data.status === "failed") {
          setIsScanning(false);
        } else {
          startLogStream(jobId);
        }
      })
      .catch((err) => {
        console.error(err);
        setError("Failed to load job details.");
        setIsScanning(false);
      });

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, [jobId]);

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
            fetchJobStatus(id).then((jobData) => {
              setJob(jobData);
            }).catch(console.error);
          }
        }
      } catch (err) {
        console.error("Failed to parse SSE message", err);
      }
    };

    es.onerror = () => {
      es.close();
      setIsScanning(false);
      fetchJobStatus(id).then((jobData) => {
        setJob(jobData);
      }).catch(console.error);
    };
  };

  if (error) {
    return (
      <div className="max-w-[1280px] mx-auto py-12">
        <div className="bg-error-container text-on-error-container p-4 rounded-lg">
          {error}
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="max-w-[1280px] mx-auto flex flex-col gap-6 pt-6">
        <SkeletonJobRow />
        <SkeletonMetricsRow />
        <SkeletonPanel />
      </div>
    );
  }

  const result = job?.result;

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
            <MetricsRow summary={result?.summary} />

            <TrustIntelligencePanel
              summary={result?.summary}
              chains={result?.risk_chains || []}
              capabilities={result?.capability_findings || []}
            />

            <BlastRadiusMap chains={result?.risk_chains || []} />

            {result && result.findings && (
              <FindingsTable findings={result.findings} />
            )}
          </>
        )}
      </div>
    </div>
  );
}
