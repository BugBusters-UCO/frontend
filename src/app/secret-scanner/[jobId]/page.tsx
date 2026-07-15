"use client";

import React, { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { LogEntry, ScanJob } from "@/shared/api/types";
import { fetchSecretJobStatus, getSecretScanLogsUrl } from "@/shared/api/client";
import { LiveExecutionLog } from "@/widgets/LiveExecutionLog";
import { SkeletonJobRow, SkeletonMetricsRow, SkeletonPanel } from "@/widgets/Skeleton";
import { ArrowLeftCircle } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { SecretMetricsRow } from "@/widgets/secret/SecretMetricsRow";
import { SecretBusinessImpactPanel } from "@/widgets/secret/SecretBusinessImpactPanel";
import { SecretInteractiveGraph } from "@/widgets/secret/SecretInteractiveGraph";
import { InfoTooltip } from "@/shared/ui/InfoTooltip";

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

  const eventSourceRef = useRef<EventSource | null>(null);

  const { data: jobData, isLoading: isJobLoading, error: queryError } = useQuery({
    queryKey: ["secret-job", jobId],
    queryFn: () => fetchSecretJobStatus(jobId),
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
                
                <SecretBusinessImpactPanel summary={summary} risk={risk} ciPolicy={ciPolicy} />

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
                {policyDecision && (
                  <div className="bg-surface-container-lowest rounded-2xl border border-border-divider p-6">
                    <div className="flex items-center mb-2">
                      <h3 className="text-xl font-bold">Policy Decision</h3>
                      <InfoTooltip text="Detailed rationale of why the scan should pass, block, or require manual review." />
                    </div>
                    <div className="flex flex-wrap gap-3 mb-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${policyDecision.status === "failed" ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"}`}>
                        {policyDecision.status}
                      </span>
                      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-surface-container text-text-secondary">{policyDecision.gate}</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs uppercase font-semibold text-text-muted mb-2">Reasons</p>
                        <ul className="space-y-1 text-sm text-text-secondary">
                          {(policyDecision.reasons || []).map((reason: string) => <li key={reason}>- {reason}</li>)}
                        </ul>
                      </div>
                      <div>
                        <p className="text-xs uppercase font-semibold text-text-muted mb-2">Required Actions</p>
                        <ul className="space-y-1 text-sm text-text-secondary">
                          {(policyDecision.required_actions || []).map((action: string) => <li key={action}>- {action}</li>)}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}

                {(sensitiveDataFindings.length > 0 || usagePaths.length > 0 || historicalExposures.length > 0 || compromisedMatches.length > 0) && (
                  <div className="bg-surface-container-lowest rounded-2xl border border-border-divider p-6">
                    <div className="flex items-center mb-2">
                      <h3 className="text-xl font-bold">Advanced Secret Intelligence</h3>
                      <InfoTooltip text="Offline checks for sensitive financial data, usage sinks, Git history exposure, and known compromised fingerprints." />
                    </div>

                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 mt-4">
                      {usagePaths.length > 0 && (
                        <div className="border border-border-divider rounded-2xl p-4">
                          <h4 className="font-bold mb-3 flex items-center gap-2">
                            <span className="material-symbols-outlined text-[20px] text-primary-container">schema</span>
                            Data-flow Usage Paths
                          </h4>
                          <div className="space-y-3 max-h-[320px] overflow-y-auto">
                            {usagePaths.slice(0, 8).map((usage: any) => (
                              <div key={usage.id} className="bg-surface-container-low rounded p-3">
                                <div className="flex items-center justify-between gap-3">
                                  <span className="font-mono text-xs">{usage.variable_hint}</span>
                                  <span className="px-2 py-1 rounded text-xs bg-orange-100 text-orange-800 font-semibold">{usage.sink_type}</span>
                                </div>
                                <p className="text-xs text-text-muted mt-1">{usage.usage_file}:{usage.line_number || "-"}</p>
                                <p className="text-sm text-text-secondary mt-2">{usage.impact}</p>
                                <code className="block mt-2 text-xs whitespace-pre-wrap break-words">{usage.evidence}</code>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {sensitiveDataFindings.length > 0 && (
                        <div className="border border-border-divider rounded-2xl p-4">
                          <h4 className="font-bold mb-3 flex items-center gap-2">
                            <span className="material-symbols-outlined text-[20px] text-primary-container">privacy_tip</span>
                            Sensitive Banking Data
                          </h4>
                          <div className="space-y-3 max-h-[320px] overflow-y-auto">
                            {sensitiveDataFindings.slice(0, 8).map((item: any) => (
                              <div key={item.id} className="bg-surface-container-low rounded p-3">
                                <div className="flex items-center justify-between gap-3">
                                  <span className="font-semibold">{item.data_type}</span>
                                  <span className={`px-2 py-1 rounded text-xs font-semibold ${severityClass(item.severity)}`}>{item.severity}</span>
                                </div>
                                <p className="text-xs text-text-muted mt-1">{item.file_path}:{item.line_number || "-"}</p>
                                <code className="block mt-2 text-xs whitespace-pre-wrap break-words">{item.evidence}</code>
                                <p className="text-xs text-text-secondary mt-2">{item.remediation}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {historicalExposures.length > 0 && (
                        <div className="border border-border-divider rounded-2xl p-4">
                          <h4 className="font-bold mb-3 flex items-center gap-2">
                            <span className="material-symbols-outlined text-[20px] text-primary-container">history</span>
                            Git History Exposures
                          </h4>
                          <div className="space-y-3 max-h-[320px] overflow-y-auto">
                            {historicalExposures.slice(0, 8).map((item: any) => (
                              <div key={item.id} className="bg-red-50 border border-red-100 rounded p-3">
                                <div className="flex items-center justify-between gap-3">
                                  <span className="font-mono text-xs">{item.commit?.slice(0, 10)}</span>
                                  <span className={`px-2 py-1 rounded text-xs font-semibold ${severityClass(item.severity)}`}>{item.secret_type}</span>
                                </div>
                                <p className="text-xs text-red-900 mt-1">{item.file_path || "unknown file"} {item.date ? `- ${item.date}` : ""}</p>
                                <code className="block mt-2 text-xs whitespace-pre-wrap break-words">{item.evidence}</code>
                                <p className="text-xs text-red-900 mt-2">{item.remediation}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {compromisedMatches.length > 0 && (
                        <div className="border border-red-200 bg-red-50 rounded-2xl p-4">
                          <h4 className="font-bold mb-3 flex items-center gap-2 text-red-900">
                            <span className="material-symbols-outlined text-[20px]">report</span>
                            Offline Compromised Matches
                          </h4>
                          <div className="space-y-3">
                            {compromisedMatches.slice(0, 8).map((item: any) => (
                              <div key={item.id} className="bg-surface transition-colors duration-300 border border-red-100 rounded p-3">
                                <p className="font-mono text-xs">{item.secret_fingerprint}</p>
                                <p className="text-xs text-red-900 mt-1">Source: {item.match_source}</p>
                                <p className="text-sm text-red-950 mt-2">{item.action}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {findings.length > 0 && (
                  <div className="bg-surface-container-lowest rounded-2xl border border-border-divider p-6">
                    <div className="flex items-center mb-4">
                      <h3 className="text-xl font-bold">Secrets and Remediation</h3>
                      <InfoTooltip text="Raw list of all detected secrets, their location, extracted evidence, and remediation steps." />
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-border-divider text-text-secondary text-sm">
                            <th className="pb-2 font-medium">Severity</th>
                            <th className="pb-2 font-medium">Secret Type</th>
                            <th className="pb-2 font-medium">Location</th>
                            <th className="pb-2 font-medium">Evidence</th>
                            <th className="pb-2 font-medium">Confidence</th>
                          </tr>
                        </thead>
                        <tbody className="text-sm">
                          {findings.map((finding: any) => (
                            <tr key={finding.id} className="border-b border-border-divider last:border-none align-top">
                              <td className="py-3 pr-4">
                                <span className={`px-2 py-1 rounded text-xs font-semibold ${severityClass(finding.severity)}`}>
                                  {finding.severity.toUpperCase()}
                                </span>
                              </td>
                              <td className="py-3 pr-4">
                                <div className="font-medium">{finding.title}</div>
                                <div className="text-xs text-text-muted font-mono mt-1">{finding.secret_type}</div>
                              </td>
                              <td className="py-3 pr-4 font-mono text-xs">
                                {finding.file_path}:{finding.line_number || "-"}
                              </td>
                              <td className="py-3 pr-4">
                                <code className="block max-w-[420px] whitespace-pre-wrap break-words bg-surface-container-low px-2 py-1 rounded text-xs">
                                  {finding.evidence}
                                </code>
                                <div className="text-xs text-text-muted mt-2">
                                  {finding.remediation?.title}: {finding.remediation?.description}
                                </div>
                              </td>
                              <td className="py-3 pr-4">
                                <span className="font-semibold">{Math.round((finding.confidence || 0) * 100)}%</span>
                                <div className="text-xs text-text-muted mt-1">{finding.validation_status}</div>
                              </td>
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
