"use client";

import React, { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { LogEntry, ScanJob } from "@/shared/api/types";
import { fetchSecretJobStatus, getSecretScanLogsUrl } from "@/shared/api/client";
import { LiveExecutionLog } from "@/widgets/LiveExecutionLog";
import { SkeletonJobRow, SkeletonMetricsRow, SkeletonPanel } from "@/widgets/Skeleton";
import { ArrowLeftCircle } from "lucide-react";

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

  const [job, setJob] = useState<ScanJob | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isScanning, setIsScanning] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!jobId) return;

    fetchSecretJobStatus(jobId)
      .then((data) => {
        setJob(data);
        if (data.logs) setLogs(data.logs);
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
      if (eventSourceRef.current) eventSourceRef.current.close();
    };
  }, [jobId]);

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
            fetchSecretJobStatus(id).then(setJob).catch(console.error);
          }
        }
      } catch (err) {
        console.error("Failed to parse SSE message", err);
      }
    };

    es.onerror = () => {
      es.close();
      setIsScanning(false);
      fetchSecretJobStatus(id).then(setJob).catch(console.error);
    };
  };

  if (error) {
    return (
      <div className="max-w-[1280px] mx-auto py-12">
        <div className="bg-error-container text-on-error-container p-4 rounded-lg">{error}</div>
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
          <div className="bg-error-container text-on-error-container p-4 rounded-lg border border-[#ffb4ab]">
            <h3 className="font-bold text-lg mb-2">Scan Failed</h3>
            <p>{job.error || "An unknown error occurred during the scan."}</p>
          </div>
        )}

        {!isScanning && job.status === "completed" && !result && (
          <div className="bg-surface-container-low text-text-secondary p-4 rounded-lg text-center">
            Scan completed but no results were returned.
          </div>
        )}

        {!isScanning && result && (
          <div className="flex flex-col gap-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-element-gap">
              <div className="bg-surface-container-lowest p-card-padding rounded-lg border border-border-divider shadow-sm flex flex-col gap-2">
                <p className="font-body-sm text-body-sm text-text-muted font-medium">Risk Score</p>
                <p className="font-metric-value text-metric-value text-text-primary">{summary?.risk_score || 0}</p>
              </div>
              <div className="bg-surface-container-lowest p-card-padding rounded-lg border border-[#ffd6a5] bg-[#fff8eb] shadow-sm flex flex-col gap-2">
                <p className="font-body-sm text-body-sm text-[#8a5200] font-medium">Secrets Found</p>
                <p className="font-metric-value text-metric-value text-[#8a5200]">{summary?.total_findings || 0}</p>
              </div>
              <div className="bg-surface-container-lowest p-card-padding rounded-lg border border-[#f3b4b4] shadow-sm flex flex-col gap-2">
                <p className="font-body-sm text-body-sm text-text-muted font-medium">Unique Secrets</p>
                <p className="font-metric-value text-metric-value text-severity-critical">{summary?.unique_secrets || 0}</p>
              </div>
              <div className="bg-surface-container-lowest p-card-padding rounded-lg border border-[#b7e4c7] shadow-sm flex flex-col gap-2">
                <p className="font-body-sm text-body-sm text-text-muted font-medium">Exposure Paths</p>
                <p className="font-metric-value text-metric-value text-text-primary">{summary?.exposure_paths || 0}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-element-gap">
              <div className="bg-surface-container-lowest p-card-padding rounded-lg border border-border-divider shadow-sm flex flex-col gap-2">
                <p className="font-body-sm text-body-sm text-text-muted font-medium">Sensitive Data</p>
                <p className="font-metric-value text-metric-value text-text-primary">{summary?.sensitive_data_findings || 0}</p>
              </div>
              <div className="bg-surface-container-lowest p-card-padding rounded-lg border border-border-divider shadow-sm flex flex-col gap-2">
                <p className="font-body-sm text-body-sm text-text-muted font-medium">Usage Paths</p>
                <p className="font-metric-value text-metric-value text-text-primary">{summary?.usage_paths || 0}</p>
              </div>
              <div className="bg-surface-container-lowest p-card-padding rounded-lg border border-border-divider shadow-sm flex flex-col gap-2">
                <p className="font-body-sm text-body-sm text-text-muted font-medium">Git History</p>
                <p className="font-metric-value text-metric-value text-text-primary">{summary?.historical_exposures || 0}</p>
              </div>
              <div className="bg-surface-container-lowest p-card-padding rounded-lg border border-[#f3b4b4] shadow-sm flex flex-col gap-2">
                <p className="font-body-sm text-body-sm text-text-muted font-medium">Compromised Matches</p>
                <p className="font-metric-value text-metric-value text-severity-critical">{summary?.compromised_matches || 0}</p>
              </div>
            </div>

            {risk && (
              <div className="bg-surface-container-lowest rounded-lg border border-border-divider p-6">
                <div className="flex items-center justify-between gap-4 mb-4">
                  <div>
                    <h3 className="text-xl font-bold">Secret Risk Intelligence</h3>
                    <p className="text-sm text-text-secondary">Rotation, confidence, and blast-radius indicators from detected secret types.</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${risk.rotation_required ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"}`}>
                    {risk.rotation_required ? "Rotation Required" : "No Rotation Required"}
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="border border-border-divider rounded-lg p-4">
                    <p className="text-xs uppercase text-text-muted font-semibold mb-2">High Confidence</p>
                    <p className="text-3xl font-bold">{risk.high_confidence_findings}</p>
                  </div>
                  <div className="border border-border-divider rounded-lg p-4">
                    <p className="text-xs uppercase text-text-muted font-semibold mb-2">Exposed Types</p>
                    <div className="flex flex-wrap gap-2">
                      {(risk.exposed_secret_types || []).slice(0, 8).map((type: string) => (
                        <span key={type} className="px-2 py-1 bg-surface-container text-xs rounded font-mono">{type}</span>
                      ))}
                    </div>
                  </div>
                  <div className="border border-border-divider rounded-lg p-4">
                    <p className="text-xs uppercase text-text-muted font-semibold mb-2">CI Policy Gate</p>
                    <p className={`text-2xl font-bold ${ciPolicy.className}`}>
                      {ciPolicy.label}
                    </p>
                    <p className="text-xs text-text-secondary mt-2 leading-relaxed">{ciPolicy.detail}</p>
                  </div>
                </div>
                {risk.reasons?.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {risk.reasons.map((reason: string) => (
                      <div key={reason} className="flex items-start gap-2 text-sm text-text-secondary">
                        <span className="material-symbols-outlined text-[18px] text-severity-critical">warning</span>
                        <span>{reason}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {(exposurePaths.length > 0 || rotationPlaybooks.length > 0) && (
              <div className="grid grid-cols-1 xl:grid-cols-[1.2fr_0.8fr] gap-6">
                {exposurePaths.length > 0 && (
                  <div className="bg-surface-container-lowest rounded-lg border border-border-divider p-6">
                    <div className="flex items-center justify-between gap-4 mb-4">
                      <div>
                        <h3 className="text-xl font-bold">Secret Exposure Paths</h3>
                        <p className="text-sm text-text-secondary">How each leaked secret could turn into asset access and blast radius.</p>
                      </div>
                      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800">
                        {exposurePaths.length} paths
                      </span>
                    </div>
                    <div className="space-y-4">
                      {exposurePaths.slice(0, 5).map((path: any) => (
                        <div key={path.id} className="border border-red-200 bg-red-50 rounded-lg p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <span className="material-symbols-outlined text-red-700 text-[20px]">route</span>
                                <h4 className="font-bold text-red-900">{path.title}</h4>
                              </div>
                              <p className="text-xs text-red-900 font-mono">{path.file_path}:{path.line_number || "-"}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-xs uppercase text-red-700 font-semibold">Score</p>
                              <p className="text-2xl font-bold text-red-900">{path.score}</p>
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
                          <div className="mt-4 bg-white border border-red-100 rounded p-3">
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

                <div className="flex flex-col gap-6">
                  <div className="bg-surface-container-lowest rounded-lg border border-border-divider p-6">
                    <h3 className="text-xl font-bold mb-2">Secret Exposure Graph</h3>
                    <p className="text-sm text-text-secondary mb-4">File to secret to asset to required rotation control.</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="border border-border-divider rounded-lg p-4">
                        <p className="text-xs uppercase text-text-muted font-semibold">Nodes</p>
                        <p className="text-3xl font-bold">{secretGraph?.nodes?.length || 0}</p>
                      </div>
                      <div className="border border-border-divider rounded-lg p-4">
                        <p className="text-xs uppercase text-text-muted font-semibold">Edges</p>
                        <p className="text-3xl font-bold">{secretGraph?.edges?.length || 0}</p>
                      </div>
                    </div>
                    <div className="mt-4 space-y-2 max-h-[260px] overflow-y-auto">
                      {(secretGraph?.edges || []).slice(0, 10).map((edge: any, idx: number) => (
                        <div key={`${edge.source}-${edge.target}-${idx}`} className="text-xs font-mono bg-surface-container-low rounded px-2 py-1">
                          {edge.source} -[{edge.label}]-&gt; {edge.target}
                        </div>
                      ))}
                    </div>
                  </div>

                  {rotationPlaybooks.length > 0 && (
                    <div className="bg-surface-container-lowest rounded-lg border border-border-divider p-6">
                      <h3 className="text-xl font-bold mb-2">Rotation Playbooks</h3>
                      <p className="text-sm text-text-secondary mb-4">Owner-aware steps generated for exposed credentials.</p>
                      <div className="space-y-3">
                        {rotationPlaybooks.slice(0, 4).map((playbook: any) => (
                          <div key={playbook.id} className="border border-border-divider rounded-lg p-4">
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

            {policyDecision && (
              <div className="bg-surface-container-lowest rounded-lg border border-border-divider p-6">
                <h3 className="text-xl font-bold mb-2">Policy Decision</h3>
                <p className="text-sm text-text-secondary mb-4">Why the scan should pass, block, or require manual review.</p>
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
              <div className="bg-surface-container-lowest rounded-lg border border-border-divider p-6">
                <h3 className="text-xl font-bold mb-2">Advanced Secret Intelligence</h3>
                <p className="text-sm text-text-secondary mb-5">
                  Offline checks for sensitive financial data, usage sinks, Git history exposure, and known compromised fingerprints.
                </p>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
                  {usagePaths.length > 0 && (
                    <div className="border border-border-divider rounded-lg p-4">
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
                    <div className="border border-border-divider rounded-lg p-4">
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
                    <div className="border border-border-divider rounded-lg p-4">
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
                    <div className="border border-red-200 bg-red-50 rounded-lg p-4">
                      <h4 className="font-bold mb-3 flex items-center gap-2 text-red-900">
                        <span className="material-symbols-outlined text-[20px]">report</span>
                        Offline Compromised Matches
                      </h4>
                      <div className="space-y-3">
                        {compromisedMatches.slice(0, 8).map((item: any) => (
                          <div key={item.id} className="bg-white border border-red-100 rounded p-3">
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
              <div className="bg-surface-container-lowest rounded-lg border border-border-divider p-6">
                <h3 className="text-xl font-bold mb-4">Secrets and Remediation</h3>
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
    </div>
  );
}
