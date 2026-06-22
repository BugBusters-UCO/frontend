"use client";

import React, { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { LogEntry, ScanJob } from "@/shared/api/types";
import { fetchConfigJobStatus, getConfigScanLogsUrl } from "@/shared/api/client";
import { LiveExecutionLog } from "@/widgets/LiveExecutionLog";
import { SkeletonJobRow, SkeletonMetricsRow, SkeletonPanel } from "@/widgets/Skeleton";
import { ArrowLeftCircle } from "lucide-react";

export default function ConfigScannerJobPage() {
  const { jobId } = useParams() as { jobId: string };
  const router = useRouter();

  const [job, setJob] = useState<ScanJob | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isScanning, setIsScanning] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!jobId) return;

    fetchConfigJobStatus(jobId)
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
            fetchConfigJobStatus(id).then((jobData) => {
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
      // Fetch final job status when connection drops (job ends)
      fetchConfigJobStatus(id).then((jobData) => {
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

  console.log("Scan Data: ", job)
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
          <div className="bg-error-container text-on-error-container p-4 rounded-lg border border-[#ffb4ab]">
            <h3 className="font-bold text-lg mb-2">Scan Failed</h3>
            <p>{job.error || "An unknown error occurred during the scan."}</p>
          </div>
        )}

        {!isScanning && job?.status === "completed" && !result && (
          <div className="bg-surface-container-low text-text-secondary p-4 rounded-lg text-center">
            Scan completed but no results were returned.
          </div>
        )}

        {!isScanning && result && (
          <div className="flex flex-col gap-6">
            {/* Summary Row */}
            {result.summary && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-element-gap">
                <div className="bg-surface-container-lowest p-card-padding rounded-lg border border-border-divider shadow-sm flex flex-col gap-2">
                  <p className="font-body-sm text-body-sm text-text-muted font-medium">Risk Score</p>
                  <p className="font-metric-value text-metric-value text-text-primary">{result.summary.risk_score || 0}</p>
                </div>
                <div className="bg-surface-container-lowest p-card-padding rounded-lg border border-[#ffd6a5] bg-[#fff8eb] shadow-sm flex flex-col gap-2">
                  <p className="font-body-sm text-body-sm text-[#8a5200] font-medium">Total Findings</p>
                  <p className="font-metric-value text-metric-value text-[#8a5200]">{result.summary.total_findings || 0}</p>
                </div>
                <div className="bg-surface-container-lowest p-card-padding rounded-lg border border-[#f3b4b4] shadow-sm flex flex-col gap-2">
                  <p className="font-body-sm text-body-sm text-text-muted font-medium">Critical Findings</p>
                  <p className="font-metric-value text-metric-value text-severity-critical">{result.summary.findings_by_severity?.critical || 0}</p>
                </div>
                <div className="bg-surface-container-lowest p-card-padding rounded-lg border border-[#b7e4c7] shadow-sm flex flex-col gap-2">
                  <p className="font-body-sm text-body-sm text-text-muted font-medium">Attack Paths</p>
                  <p className="font-metric-value text-metric-value text-text-primary">{result.summary.attack_paths || 0}</p>
                </div>
              </div>
            )}

            {/* Config Findings Table */}
            {result.findings && result.findings.length > 0 && (
              <div className="bg-surface-container-lowest rounded-lg border border-border-divider p-6">
                <h3 className="text-xl font-bold mb-4">Misconfigurations</h3>
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
                      {result.findings.map((finding: any, idx: number) => (
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

            {/* Attack Paths */}
            {result.attack_paths && result.attack_paths.length > 0 && (
              <div className="bg-surface-container-lowest rounded-lg border border-border-divider p-6">
                <h3 className="text-xl font-bold mb-4">Attack Paths</h3>
                <div className="space-y-4">
                  {result.attack_paths.map((ap: any, idx: number) => (
                    <div key={idx} className="border border-red-200 bg-red-50 p-4 rounded flex flex-col gap-2">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-red-600">route</span>
                        <span className="font-bold text-red-800">{ap.title}</span>
                      </div>
                      <p className="text-sm text-red-900">{ap.attack_story}</p>
                      <div className="text-sm mt-2 font-mono bg-white p-2 border border-red-100 rounded">
                        {ap.steps?.map((step: any, sIdx: number) => (
                          <div key={sIdx} className="mb-1">
                            {sIdx + 1}. {step.title} ({step.file_path}:{step.line_number})
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
