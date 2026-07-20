"use client";

import React, { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { LogEntry, ScanJob } from "@/shared/api/types";
import { fetchSecretJobStatus, getSecretScanLogsUrl, requestSecretRotation, approveSecretRotation } from "@/shared/api/client";
import { LiveExecutionLog } from "@/widgets/LiveExecutionLog";
import { SkeletonJobRow, SkeletonMetricsRow, SkeletonPanel } from "@/widgets/Skeleton";
import { ArrowLeftCircle } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { SecretMetricsRow } from "@/widgets/secret/SecretMetricsRow";
import { SecretBusinessImpactPanel } from "@/widgets/secret/SecretBusinessImpactPanel";
import { SecretInteractiveGraph } from "@/widgets/secret/SecretInteractiveGraph";
import { AdvancedSecretInsights } from "@/widgets/secret/AdvancedSecretInsights";
import { SecretFindingsTable } from "@/widgets/secret/SecretFindingsTable";
import { InfoTooltip } from "@/shared/ui/InfoTooltip";
import { usePageContext } from "@/features/chatbot/usePageContext";

function severityClass(severity?: string) {
  if (severity === "critical") return "bg-red-100 text-red-800";
  if (severity === "high") return "bg-orange-100 text-orange-800";
  if (severity === "medium") return "bg-yellow-100 text-yellow-800";
  return "bg-blue-100 text-blue-800";
}

function ciPolicyExplanation(summary: any) {
  const status = summary?.ci_status || "unknown";
  const failOn = summary?.fail_on || "high";
  const counts = summary?.findings_by_severity || {};
  const critical = counts.critical || 0;
  const high = counts.high || 0;
  const medium = counts.medium || 0;
  const low = counts.low || 0;

  if (status !== "failed") {
    return {
      label: "Passed",
      detail: `No secret finding met the CI block threshold (${failOn}).`,
      className: "text-green-700",
    };
  }

  const blockers =
    failOn === "critical"
      ? `${critical} critical`
      : failOn === "high"
        ? `${critical} critical / ${high} high`
        : failOn === "medium"
          ? `${critical} critical / ${high} high / ${medium} medium`
          : `${critical} critical / ${high} high / ${medium} medium / ${low} low`;

  return {
    label: "Blocked",
    detail: `Policy gate failed because findings at or above ${failOn} severity were detected: ${blockers}.`,
    className: "text-severity-critical",
  };
}

export default function SecretScannerJobPage() {
  const { jobId } = useParams() as { jobId: string };
  const router = useRouter();

  const queryClient = useQueryClient();

  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isScanning, setIsScanning] = useState(true);
  const [activeTab, setActiveTab] = useState<"executive" | "technical">("executive");
  const [isExposureSidebarOpen, setIsExposureSidebarOpen] = useState(false);

  // Rotation State
  const [rotatingFindingId, setRotatingFindingId] = useState<string | null>(null);
  const [isRotating, setIsRotating] = useState(false);
  const [rotationActionId, setRotationActionId] = useState<string | null>(null);
  const [rotationResult, setRotationResult] = useState<any>(null);

  const handleRequestRotation = async (findingId: string) => {
    try {
      setRotatingFindingId(findingId);
      setIsRotating(true);
      setRotationResult(null);
      const res = await requestSecretRotation(jobId, findingId);
      setRotationActionId(res.action_id || "action-" + Date.now()); 
    } catch (err) {
      console.error("Failed to request rotation", err);
      setRotatingFindingId(null);
    } finally {
      setIsRotating(false);
    }
  };

  const handleApproveRotation = async () => {
    if (!rotationActionId) return;
    try {
      setIsRotating(true);
      const res = await approveSecretRotation(jobId, rotationActionId);
      setRotationResult(res);
      setRotationActionId(null);
      setRotatingFindingId(null);
      queryClient.invalidateQueries({ queryKey: ["secret-job", jobId] });
    } catch (err) {
      console.error("Failed to approve rotation", err);
    } finally {
      setIsRotating(false);
    }
  };

  const handleCancelRotation = () => {
    setRotatingFindingId(null);
    setRotationActionId(null);
    setRotationResult(null);
  };

  const eventSourceRef = useRef<EventSource | null>(null);

  const { data: jobData, isLoading: isJobLoading, error: queryError } = useQuery({
    queryKey: ["secret-job", jobId],
    queryFn: () => fetchSecretJobStatus(jobId),
  });

  usePageContext({
    page: "Secret Scanner — Job Detail",
    jobId: jobId,
    status: jobData?.status,
    findings: jobData?.result?.findings,
    summary: jobData?.result?.summary,
  });

  useEffect(() => {
    if (jobData) {
      if (jobData.logs && logs.length === 0) setLogs(jobData.logs);
      if (jobData.status === "completed" || jobData.status === "failed") {
        setIsScanning(false);
      } else if (isScanning && !eventSourceRef.current) {
        startLogStream(jobId);
      }
    }

    return () => {
      if (eventSourceRef.current) eventSourceRef.current.close();
    };
  }, [jobData, jobId]);

  const startLogStream = (id: string) => {
    if (eventSourceRef.current) eventSourceRef.current.close();

    const es = new EventSource(getSecretScanLogsUrl(id));
    eventSourceRef.current = es;

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.level && data.message) {
          setLogs((prev) => [...prev, data]);

          if (data.message.includes("Secret scan completed") || data.level === "error") {
            es.close();
            setIsScanning(false);
            queryClient.invalidateQueries({ queryKey: ["secret-job", id] });
          }
        }
      } catch (err) {
        console.error("Failed to parse SSE message", err);
      }
    };

    es.onerror = () => {
      es.close();
      setIsScanning(false);
      queryClient.invalidateQueries({ queryKey: ["secret-job", id] });
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
  const result = job.result as any;
  const summary = result?.summary;
  const risk = result?.risk;
  const findings = result?.findings || [];
  const exposurePaths = result?.exposure_paths || [];
  const rotationPlaybooks = result?.rotation_playbooks || [];
  const secretGraph = result?.secret_graph;
  const policyDecision = result?.policy_decision;
  const sensitiveDataFindings = result?.sensitive_data_findings || [];
  const historicalExposures = result?.historical_exposures || [];
  const compromisedMatches = result?.compromised_matches || [];
  const usagePaths = result?.usage_paths || [];
  const ciPolicy = ciPolicyExplanation(summary);

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
            Secret Scan: {job.sourceLabel || jobId}
          </h1>
          <p className="font-body-sm text-body-sm text-text-secondary">Status: {job.status || "Loading..."}</p>
        </div>
      </div>

      <div className="flex flex-col gap-element-gap">
        <LiveExecutionLog logs={logs} isRunning={isScanning} />

        {!isScanning && job.status === "failed" && (
          <div className="bg-error-container text-on-error-container p-4 rounded-2xl border border-[#ffb4ab]">
            <h3 className="font-bold text-lg mb-2">Scan Failed</h3>
            <p>{job.error || "An unknown error occurred during the scan."}</p>
          </div>
        )}

        {!isScanning && job.status === "completed" && !result && (
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
                <SecretMetricsRow summary={summary} risk={risk} ciPolicy={ciPolicy} />
                
                <SecretBusinessImpactPanel jobId={jobId} summary={summary} risk={risk} ciPolicy={ciPolicy} />

            {(exposurePaths.length > 0 || rotationPlaybooks.length > 0 || secretGraph) && (
              <div className={`grid grid-cols-1 ${isExposureSidebarOpen && exposurePaths.length > 0 ? 'xl:grid-cols-[1fr_1.5fr]' : 'xl:grid-cols-1'} gap-6`}>
                {isExposureSidebarOpen && exposurePaths.length > 0 && (
                  <div className="bg-surface-container-lowest rounded-2xl border border-border-divider p-6 h-fit">
                    <div className="flex items-center justify-between gap-4 mb-4">
                      <div>
                        <div className="flex items-center">
                          <h3 className="text-xl font-bold">Secret Exposure Paths</h3>
                          <InfoTooltip text="How each leaked secret could turn into asset access and blast radius." />
                        </div>
                      </div>
                      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800">
                        {exposurePaths.length} paths
                      </span>
                    </div>
                    <div className="space-y-4">
                      {exposurePaths.slice(0, 5).map((path: any) => (
                        <div key={path.id} className="border border-red-200 bg-red-50 rounded-2xl p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <span className="material-symbols-outlined text-red-700 text-[20px]">route</span>
                                <h4 className="font-bold text-red-900">{path.title}</h4>
                              </div>
                              <p className="text-xs text-red-900 font-mono">{path.file_path}:{path.line_number || "-"}</p>
                            </div>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4 text-sm">
                            <div>
                              <p className="text-xs uppercase font-semibold text-red-700 mb-1">Probable Capabilities</p>
                              <ul className="space-y-1 text-red-950">
                                {(path.probable_capabilities || []).slice(0, 4).map((item: string) => (
                                  <li key={item}>- {item}</li>
                                ))}
                              </ul>
                            </div>
                            <div>
                              <p className="text-xs uppercase font-semibold text-red-700 mb-1">Blast Radius</p>
                              <ul className="space-y-1 text-red-950">
                                {(path.blast_radius || []).slice(0, 4).map((item: string) => (
                                  <li key={item}>- {item}</li>
                                ))}
                              </ul>
                            </div>
                          </div>
                          <div className="mt-4 bg-surface transition-colors duration-300 border border-red-100 rounded p-3">
                            <p className="text-xs uppercase font-semibold text-red-700 mb-2">Abuse Sequence</p>
                            <div className="space-y-1 text-sm text-red-950">
                              {(path.abuse_sequence || []).map((step: string, idx: number) => (
                                <div key={`${path.id}-${idx}`}>{idx + 1}. {step}</div>
                              ))}
                            </div>
                          </div>
                          <p className="mt-3 text-sm font-semibold text-red-900">Containment: {path.containment_priority}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex flex-col gap-6 w-full overflow-hidden">
                  <div className="flex justify-end">
                    <button 
                      onClick={() => setIsExposureSidebarOpen(!isExposureSidebarOpen)}
                      className="px-4 py-2 bg-surface transition-colors duration-300 hover:bg-surface-container border border-border-subtle rounded-md text-sm font-semibold flex items-center gap-2 transition-colors shadow-sm w-fit"
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        {isExposureSidebarOpen ? 'keyboard_double_arrow_left' : 'keyboard_double_arrow_right'}
                      </span>
                      {isExposureSidebarOpen ? 'Hide Exposure Paths' : 'Show Exposure Paths'}
                    </button>
                  </div>
                  {secretGraph && <SecretInteractiveGraph graphData={secretGraph} />}

                  {rotationPlaybooks.length > 0 && (
                    <div className="bg-surface-container-lowest rounded-2xl border border-border-divider p-6">
                      <div className="flex items-center mb-2">
                        <h3 className="text-xl font-bold">Rotation Playbooks</h3>
                        <InfoTooltip text="Owner-aware steps generated for exposed credentials." />
                      </div>
                      <div className="space-y-3">
                        {rotationPlaybooks.slice(0, 4).map((playbook: any) => (
                          <div key={playbook.id} className="border border-border-divider rounded-2xl p-4">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="font-semibold">{playbook.secret_type}</p>
                                <p className="text-xs text-text-muted mt-1">{playbook.owner_hint}</p>
                              </div>
                              <span className="px-2 py-1 rounded text-xs bg-red-100 text-red-800 font-semibold">{playbook.priority}</span>
                            </div>
                            <ol className="mt-3 space-y-1 text-sm text-text-secondary list-decimal list-inside">
                              {(playbook.steps || []).slice(0, 4).map((step: string) => (
                                <li key={step}>{step}</li>
                              ))}
                            </ol>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
              </div>
            )}

            {activeTab === "technical" && (
              <div className="flex flex-col gap-6">
                {result && <AdvancedSecretInsights result={result as any} />}
                {findings.length > 0 && (
                  <SecretFindingsTable 
                    findings={findings} 
                    onRequestRotation={handleRequestRotation} 
                    isRotating={isRotating} 
                    rotatingFindingId={rotatingFindingId} 
                  />
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Rotation Approval Modal */}
      {rotationActionId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-surface rounded-2xl max-w-md w-full p-6 shadow-xl">
            <h3 className="text-xl font-bold mb-4">Approve Secret Rotation</h3>
            <p className="text-text-secondary mb-6 text-sm">
              The rotation request has been prepared. This will automatically invalidate the compromised secret and rotate it across configured integrations.
            </p>
            <div className="flex justify-end gap-3">
              <button 
                onClick={handleCancelRotation}
                disabled={isRotating}
                className="px-4 py-2 text-text-secondary hover:bg-surface-container rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleApproveRotation}
                disabled={isRotating}
                className="px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors"
              >
                {isRotating ? "Approving..." : "Approve Rotation"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rotation Result Modal */}
      {rotationResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-surface rounded-2xl max-w-md w-full p-6 shadow-xl">
            <h3 className="text-xl font-bold mb-4">Rotation Completed</h3>
            <p className="text-text-secondary mb-4 text-sm">
              The secret was successfully rotated.
            </p>
            <div className="bg-surface-container-lowest p-3 rounded-lg text-xs font-mono text-text-muted break-all mb-6">
              {JSON.stringify(rotationResult, null, 2)}
            </div>
            <div className="flex justify-end">
              <button 
                onClick={handleCancelRotation}
                className="px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
