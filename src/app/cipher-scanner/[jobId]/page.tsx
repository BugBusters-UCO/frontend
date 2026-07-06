"use client";

import React, { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { CipherScanResult, LogEntry, ScanJob } from "@/shared/api/types";
import { fetchCipherJobStatus, getCipherScanLogsUrl } from "@/shared/api/client";
import { LiveExecutionLog } from "@/widgets/LiveExecutionLog";
import { SkeletonJobRow, SkeletonMetricsRow, SkeletonPanel } from "@/widgets/Skeleton";
import { ArrowLeftCircle } from "lucide-react";
import { CipherMetricsRow } from "@/widgets/cipher/CipherMetricsRow";
import { CipherBusinessImpactPanel } from "@/widgets/cipher/CipherBusinessImpactPanel";
import { CipherInteractiveGraph } from "@/widgets/cipher/CipherInteractiveGraph";
import { InfoTooltip } from "@/shared/ui/InfoTooltip";
import { useQuery, useQueryClient } from "@tanstack/react-query";

function severityClass(severity?: string) {
  if (severity === "critical") return "bg-red-100 text-red-800";
  if (severity === "high") return "bg-orange-100 text-orange-800";
  if (severity === "medium") return "bg-yellow-100 text-yellow-800";
  if (severity === "low") return "bg-blue-100 text-blue-800";
  return "bg-surface-container text-text-secondary";
}

function gradeClass(grade?: string) {
  if (grade === "A" || grade === "B") return "bg-green-100 text-green-800 border-green-200";
  if (grade === "C") return "bg-yellow-100 text-yellow-800 border-yellow-200";
  return "bg-red-100 text-red-800 border-red-200";
}

type CipherSummary = CipherScanResult["summary"] | undefined;
type CipherPolicyDecision = NonNullable<CipherScanResult["policy_decision"]>;
type CipherFinding = NonNullable<CipherScanResult["findings"]>[number];
type CipherEndpointPolicy = NonNullable<CipherScanResult["endpoint_policies"]>[number];
type CipherAttackPath = NonNullable<CipherScanResult["attack_paths"]>[number];
type CipherRemediation = NonNullable<CipherScanResult["remediation_plan"]>[number];
type CipherComplianceGap = NonNullable<CipherScanResult["compliance_mapping"]>[number];
type CipherFact = NonNullable<CipherScanResult["tls_facts"]>[number];
type CipherDomainEndpoint = NonNullable<CipherScanResult["domain_inventory"]>[number];
type CipherLiveProbe = NonNullable<CipherScanResult["live_tls_probes"]>[number];
type CipherDrift = NonNullable<CipherScanResult["environment_drifts"]>[number];
type CipherAgility = NonNullable<CipherScanResult["agility_risks"]>[number];
type CipherCompatibility = NonNullable<CipherScanResult["compatibility_risks"]>[number];
type CipherMtls = NonNullable<CipherScanResult["mtls_readiness"]>[number];

function ciPolicyExplanation(summary: CipherSummary, policyDecision: CipherPolicyDecision | null | undefined) {
  const status = summary?.ci_status || policyDecision?.status || "unknown";
  const failOn = summary?.fail_on || policyDecision?.fail_on || "high";
  const counts = summary?.findings_by_severity || {};
  const critical = counts.critical || 0;
  const high = counts.high || 0;
  const medium = counts.medium || 0;
  const low = counts.low || 0;

  if (status !== "failed") {
    return {
      label: "Passed",
      detail: `No TLS or cipher finding met the CI block threshold (${failOn}).`,
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
    detail: `Pre-deployment gate failed because TLS/cipher findings at or above ${failOn} severity were detected: ${blockers}.`,
    className: "text-severity-critical",
  };
}

export default function CipherScannerJobPage() {
  const { jobId } = useParams() as { jobId: string };
  const router = useRouter();
  const queryClient = useQueryClient();

  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isScanning, setIsScanning] = useState(true);
  const [activeTab, setActiveTab] = useState<"executive" | "technical">("executive");

  const eventSourceRef = useRef<EventSource | null>(null);

  const { data: jobData, isLoading: isJobLoading, error: queryError } = useQuery({
    queryKey: ["cipher-job", jobId],
    queryFn: () => fetchCipherJobStatus(jobId),
  });

  function startLogStream(id: string) {
    if (eventSourceRef.current) eventSourceRef.current.close();

    const es = new EventSource(getCipherScanLogsUrl(id));
    eventSourceRef.current = es;

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.level && data.message) {
          setLogs((prev) => [...prev, data]);

          if (data.message.includes("Pre-deployment cipher scan completed") || data.level === "error") {
            es.close();
            setIsScanning(false);
            queryClient.invalidateQueries({ queryKey: ["cipher-job", id] });
          }
        }
      } catch (err) {
        console.error("Failed to parse SSE message", err);
      }
    };

    es.onerror = () => {
      es.close();
      setIsScanning(false);
      queryClient.invalidateQueries({ queryKey: ["cipher-job", id] });
    };
  }

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

  if (queryError) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="text-red-500 font-bold text-xl mb-4">Error loading scan results</div>
        <p className="text-text-muted mb-6">{(queryError as Error).message || "Unknown error"}</p>
        <button onClick={() => router.push("/")} className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors">
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
  const result = job.result as CipherScanResult | undefined;
  const summary = result?.summary;
  const findings = result?.findings || [];
  const endpointPolicies = result?.endpoint_policies || [];
  const attackPaths = result?.attack_paths || [];
  const remediationPlan = result?.remediation_plan || [];
  const policyDecision = result?.policy_decision;
  const complianceMapping = result?.compliance_mapping || [];
  const tlsFacts = result?.tls_facts || [];
  const domainInventory = result?.domain_inventory || [];
  const liveTlsProbes = result?.live_tls_probes || [];
  const deploymentReadiness = result?.deployment_readiness;
  const policyGraph = result?.policy_graph;
  const environmentDrifts = result?.environment_drifts || [];
  const agilityRisks = result?.agility_risks || [];
  const compatibilityRisks = result?.compatibility_risks || [];
  const mtlsReadiness = result?.mtls_readiness || [];
  const ciPolicy = ciPolicyExplanation(summary, policyDecision);
  const domainGroups = Object.values(
    domainInventory.reduce((groups: Record<string, { baseDomain: string; endpoints: CipherDomainEndpoint[]; apiCount: number; riskCount: number }>, endpoint: CipherDomainEndpoint) => {
      const baseDomain = endpoint.base_domain || endpoint.host;
      if (!groups[baseDomain]) {
        groups[baseDomain] = { baseDomain, endpoints: [], apiCount: 0, riskCount: 0 };
      }
      groups[baseDomain].endpoints.push(endpoint);
      if ((endpoint.endpoint_type || "").includes("api")) groups[baseDomain].apiCount += 1;
      if ((endpoint.risk_notes || []).length > 0) groups[baseDomain].riskCount += 1;
      return groups;
    }, {})
  ).sort((a, b) => b.riskCount - a.riskCount || b.apiCount - a.apiCount || a.baseDomain.localeCompare(b.baseDomain));

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
            Cipher Scan: {job.sourceLabel || jobId}
          </h1>
          <p className="font-body-sm text-body-sm text-text-secondary">Status: {job.status || "Loading..."}</p>
        </div>
      </div>

      <div className="flex flex-col gap-element-gap">
        <LiveExecutionLog logs={logs} isRunning={isScanning} />

        {!isScanning && job.status === "failed" && (
          <div className="bg-error-container text-on-error-container p-4 rounded-lg border border-[#ffb4ab]">
            <h3 className="font-bold text-lg mb-2">Scan Failed</h3>
            <p>{job.error || "An unknown error occurred during the cipher scan."}</p>
          </div>
        )}

        {!isScanning && job.status === "completed" && !result && (
          <div className="bg-surface-container-low text-text-secondary p-4 rounded-lg text-center">
            Scan completed but no results were returned.
          </div>
        )}

        {!isScanning && result && (
          <div className="flex flex-col gap-6">
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
                <CipherMetricsRow summary={summary} ciPolicy={ciPolicy} />
                <CipherBusinessImpactPanel summary={summary} ciPolicy={ciPolicy} attackPaths={attackPaths} />

                {policyGraph && (
                  <CipherInteractiveGraph graphData={policyGraph} />
                )}
              </div>
            )}

            {activeTab === "technical" && (
              <div className="flex flex-col gap-6">

            <div className="bg-surface-container-lowest rounded-lg border border-border-divider p-6">
              <div className="flex items-center justify-between gap-4 mb-4">
                <div>
                  <h3 className="text-xl font-bold">Pre-Deployment TLS Intelligence</h3>
                  <p className="text-sm text-text-secondary">Endpoint posture, CI policy, and evidence extracted from TLS/cipher settings.</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${policyDecision?.status === "failed" || summary?.ci_status === "failed" ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"}`}>
                  {summary?.ci_status === "failed" ? "Deployment Blocked" : "Deployment Allowed"}
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="border border-border-divider rounded-lg p-4">
                  <p className="text-xs uppercase text-text-muted font-semibold mb-2">TLS Facts</p>
                  <p className="text-3xl font-bold">{summary?.tls_facts || 0}</p>
                </div>
                <div className="border border-border-divider rounded-lg p-4">
                  <p className="text-xs uppercase text-text-muted font-semibold mb-2">Profile</p>
                  <p className="text-2xl font-bold capitalize">{summary?.banking_profile || "strict"}</p>
                </div>
                <div className="border border-border-divider rounded-lg p-4">
                  <p className="text-xs uppercase text-text-muted font-semibold mb-2">CI Policy Gate</p>
                  <p className={`text-2xl font-bold ${ciPolicy.className}`}>{ciPolicy.label}</p>
                  <p className="text-xs text-text-secondary mt-2 leading-relaxed">{ciPolicy.detail}</p>
                </div>
                <div className="border border-border-divider rounded-lg p-4">
                  <p className="text-xs uppercase text-text-muted font-semibold mb-2">Remediation Actions</p>
                  <p className="text-3xl font-bold">{summary?.remediation_actions || 0}</p>
                </div>
              </div>
            </div>

            {(deploymentReadiness || policyGraph || environmentDrifts.length > 0 || agilityRisks.length > 0 || compatibilityRisks.length > 0 || mtlsReadiness.length > 0) && (
              <div className="bg-surface-container-lowest rounded-lg border border-border-divider p-6">
                <div className="flex items-center justify-between gap-4 mb-5">
                  <div>
                    <h3 className="text-xl font-bold">Banking Cipher Intelligence</h3>
                    <p className="text-sm text-text-secondary">Pre-deployment readiness, graph hotspots, environment drift, mTLS gaps, and crypto agility pressure.</p>
                  </div>
                  {deploymentReadiness && (
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${deploymentReadiness.status === "blocked" ? "bg-red-100 text-red-800" : deploymentReadiness.status === "needs-review" ? "bg-yellow-100 text-yellow-800" : "bg-green-100 text-green-800"}`}>
                      {deploymentReadiness.status} / {deploymentReadiness.score}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-5">
                  <div className="border border-border-divider rounded-lg p-3">
                    <p className="text-xs uppercase text-text-muted font-semibold">Graph Nodes</p>
                    <p className="text-2xl font-bold">{policyGraph?.nodes?.length || 0}</p>
                  </div>
                  <div className="border border-border-divider rounded-lg p-3">
                    <p className="text-xs uppercase text-text-muted font-semibold">Drifts</p>
                    <p className="text-2xl font-bold">{environmentDrifts.length}</p>
                  </div>
                  <div className="border border-border-divider rounded-lg p-3">
                    <p className="text-xs uppercase text-text-muted font-semibold">Agility</p>
                    <p className="text-2xl font-bold">{agilityRisks.length}</p>
                  </div>
                  <div className="border border-border-divider rounded-lg p-3">
                    <p className="text-xs uppercase text-text-muted font-semibold">Compatibility</p>
                    <p className="text-2xl font-bold">{compatibilityRisks.length}</p>
                  </div>
                  <div className="border border-border-divider rounded-lg p-3">
                    <p className="text-xs uppercase text-text-muted font-semibold">mTLS Gaps</p>
                    <p className="text-2xl font-bold">{mtlsReadiness.filter((item: CipherMtls) => item.status !== "ready").length}</p>
                  </div>
                </div>

                {deploymentReadiness && (
                  <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mb-5">
                    <div className="border border-red-100 bg-red-50 rounded-lg p-4">
                      <p className="text-xs uppercase font-semibold text-red-700 mb-2">Blockers</p>
                      {(deploymentReadiness.blockers || []).length ? (
                        <ul className="space-y-1 text-sm text-red-950">{deploymentReadiness.blockers.map((item: string) => <li key={item}>- {item}</li>)}</ul>
                      ) : (
                        <p className="text-sm text-red-900">None</p>
                      )}
                    </div>
                    <div className="border border-yellow-100 bg-yellow-50 rounded-lg p-4">
                      <p className="text-xs uppercase font-semibold text-yellow-700 mb-2">Warnings</p>
                      {(deploymentReadiness.warnings || []).length ? (
                        <ul className="space-y-1 text-sm text-yellow-950">{deploymentReadiness.warnings.map((item: string) => <li key={item}>- {item}</li>)}</ul>
                      ) : (
                        <p className="text-sm text-yellow-900">None</p>
                      )}
                    </div>
                    <div className="border border-green-100 bg-green-50 rounded-lg p-4">
                      <p className="text-xs uppercase font-semibold text-green-700 mb-2">Strengths</p>
                      {(deploymentReadiness.strengths || []).length ? (
                        <ul className="space-y-1 text-sm text-green-950">{deploymentReadiness.strengths.map((item: string) => <li key={item}>- {item}</li>)}</ul>
                      ) : (
                        <p className="text-sm text-green-900">No strong controls confirmed yet</p>
                      )}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                  {policyGraph && (
                    <div className="border border-border-divider rounded-lg p-4 bg-surface-container-lowest">
                      <h4 className="font-bold mb-2">Policy Graph Data Available</h4>
                      <p className="text-sm text-text-secondary mb-3">See Executive Summary for interactive visualization.</p>
                    </div>
                  )}

                  {environmentDrifts.length > 0 && (
                    <div className="border border-yellow-200 bg-yellow-50 rounded-lg p-4">
                      <h4 className="font-bold text-yellow-950 mb-2">Environment Drift</h4>
                      <div className="space-y-3 max-h-[260px] overflow-y-auto">
                        {environmentDrifts.slice(0, 4).map((drift: CipherDrift) => (
                          <div key={drift.id} className="bg-white border border-yellow-100 rounded p-3">
                            <div className="flex items-center justify-between gap-3">
                              <p className="font-semibold text-yellow-950">{drift.title}</p>
                              <span className={`px-2 py-1 rounded text-xs font-semibold ${severityClass(drift.severity)}`}>{drift.severity}</span>
                            </div>
                            <p className="text-sm text-yellow-950 mt-2">{drift.description}</p>
                            <p className="text-xs text-yellow-800 mt-2">{drift.remediation}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {agilityRisks.length > 0 && (
                    <div className="border border-border-divider rounded-lg p-4">
                      <h4 className="font-bold mb-2">Cipher Agility Risks</h4>
                      <div className="space-y-3 max-h-[260px] overflow-y-auto">
                        {agilityRisks.slice(0, 5).map((risk: CipherAgility) => (
                          <div key={risk.id} className="bg-surface-container-low rounded p-3">
                            <p className="font-semibold">{risk.title}</p>
                            <p className="text-xs text-text-muted font-mono mt-1">{risk.affected_file}</p>
                            <p className="text-sm text-text-secondary mt-2">{risk.deprecation_reason}</p>
                            <code className="block mt-2 text-xs whitespace-pre-wrap break-words">{risk.migration_target}</code>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {(compatibilityRisks.length > 0 || mtlsReadiness.length > 0) && (
                    <div className="border border-border-divider rounded-lg p-4">
                      <h4 className="font-bold mb-2">Compatibility And mTLS Readiness</h4>
                      <div className="space-y-3 max-h-[260px] overflow-y-auto">
                        {compatibilityRisks.slice(0, 4).map((risk: CipherCompatibility) => (
                          <div key={risk.id} className="bg-surface-container-low rounded p-3">
                            <p className="font-semibold">{risk.endpoint}</p>
                            <p className="text-sm text-text-secondary mt-1">{risk.issue}</p>
                            <p className="text-xs text-text-muted mt-2">{risk.recommendation}</p>
                          </div>
                        ))}
                        {mtlsReadiness.slice(0, 4).map((item: CipherMtls) => (
                          <div key={item.id} className="bg-surface-container-low rounded p-3">
                            <div className="flex items-center justify-between gap-3">
                              <p className="font-semibold">{item.endpoint}</p>
                              <span className={`px-2 py-1 rounded text-xs font-semibold ${item.status === "disabled" || item.status === "missing" ? "bg-red-100 text-red-800" : "bg-yellow-100 text-yellow-800"}`}>{item.status}</span>
                            </div>
                            <p className="text-xs text-text-muted font-mono mt-1">{item.file_path}</p>
                            <p className="text-sm text-text-secondary mt-2">{item.recommendation}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {domainInventory.length > 0 && (
              <div className="bg-surface-container-lowest rounded-lg border border-border-divider p-6">
                <div className="flex items-center justify-between gap-4 mb-5">
                  <div>
                    <h3 className="text-xl font-bold">Domain And API Inventory</h3>
                    <p className="text-sm text-text-secondary">Discovered public domains, subdomains, API endpoints, and source evidence from code/config.</p>
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs font-semibold">
                    <span className="px-3 py-1 rounded-full bg-surface-container text-text-secondary">{summary?.discovered_domains || domainInventory.length} domains</span>
                    <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-800">{summary?.api_endpoints || domainInventory.filter((item: CipherDomainEndpoint) => item.endpoint_type.includes("api")).length} API endpoints</span>
                  </div>
                </div>
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                  {domainGroups.slice(0, 8).map((group) => (
                    <div key={group.baseDomain} className="border border-border-divider rounded-lg p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h4 className="font-bold">{group.baseDomain}</h4>
                          <p className="text-xs text-text-muted mt-1">
                            {group.endpoints.length} reference(s), {group.apiCount} API-like, {group.riskCount} with risk notes
                          </p>
                        </div>
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${group.riskCount ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"}`}>
                          {group.riskCount ? "review" : "mapped"}
                        </span>
                      </div>
                      <div className="mt-4 space-y-3 max-h-[320px] overflow-y-auto">
                        {group.endpoints.slice(0, 12).map((endpoint: CipherDomainEndpoint) => (
                          <div key={endpoint.id} className="bg-surface-container-low rounded-lg p-3">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="font-mono text-sm break-all">
                                  {endpoint.scheme ? `${endpoint.scheme}://` : ""}
                                  {endpoint.host}
                                  {endpoint.port ? `:${endpoint.port}` : ""}
                                  {endpoint.path && endpoint.path !== "/" ? endpoint.path : ""}
                                </p>
                                <p className="text-xs text-text-muted font-mono mt-1">{endpoint.source_file}:{endpoint.line_number || "-"}</p>
                              </div>
                              <span className="px-2 py-1 rounded bg-surface-container text-xs whitespace-nowrap">{endpoint.endpoint_type}</span>
                            </div>
                            <div className="flex flex-wrap gap-2 mt-3 text-xs">
                              <span className="px-2 py-1 rounded bg-surface-container text-text-secondary">{endpoint.environment}</span>
                              <span className="px-2 py-1 rounded bg-surface-container text-text-secondary">{Math.round((endpoint.confidence || 0) * 100)}% confidence</span>
                              {(endpoint.tls_policy_refs || []).length > 0 && (
                                <span className="px-2 py-1 rounded bg-green-100 text-green-800">TLS policy linked</span>
                              )}
                            </div>
                            {(endpoint.risk_notes || []).length > 0 && (
                              <ul className="mt-3 space-y-1 text-xs text-red-800">
                                {(endpoint.risk_notes || []).map((note: string) => <li key={note}>- {note}</li>)}
                              </ul>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {liveTlsProbes.length > 0 && (
              <div className="bg-surface-container-lowest rounded-lg border border-border-divider p-6">
                <div className="flex items-center justify-between gap-4 mb-5">
                  <div>
                    <h3 className="text-xl font-bold">Live Deployment TLS Verification</h3>
                    <p className="text-sm text-text-secondary">Runtime check for discovered domains: deployment status, certificate expiry, negotiated cipher, legacy protocol exposure, and static-vs-live drift.</p>
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs font-semibold">
                    <span className="px-3 py-1 rounded-full bg-surface-container text-text-secondary">{summary?.live_tls_probes || liveTlsProbes.length} probes</span>
                    <span className="px-3 py-1 rounded-full bg-green-100 text-green-800">{summary?.deployed_domains || liveTlsProbes.filter((probe: CipherLiveProbe) => probe.deployment_status === "deployed").length} deployed</span>
                    <span className="px-3 py-1 rounded-full bg-red-100 text-red-800">{summary?.static_live_drifts || liveTlsProbes.filter((probe: CipherLiveProbe) => probe.static_policy_match === "drift").length} drift</span>
                  </div>
                </div>
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                  {liveTlsProbes.slice(0, 10).map((probe: CipherLiveProbe) => (
                    <div key={probe.id} className="border border-border-divider rounded-lg p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h4 className="font-mono font-bold break-all">{probe.host}:{probe.port}</h4>
                          <p className="text-xs text-text-muted mt-1">Checked {probe.checked_at || "during scan"}</p>
                        </div>
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${probe.deployment_status === "deployed" ? "bg-green-100 text-green-800" : probe.deployment_status === "tls-error" ? "bg-yellow-100 text-yellow-800" : "bg-surface-container text-text-secondary"}`}>
                          {probe.deployment_status}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4 text-sm">
                        <div className="bg-surface-container-low rounded p-3">
                          <p className="text-xs uppercase text-text-muted font-semibold">Negotiated TLS</p>
                          <p className="font-semibold mt-1">{probe.negotiated_protocol || "Not available"}</p>
                          <p className="font-mono text-xs text-text-secondary mt-1 break-all">{probe.negotiated_cipher || "No cipher captured"}{probe.cipher_bits ? ` / ${probe.cipher_bits} bits` : ""}</p>
                        </div>
                        <div className="bg-surface-container-low rounded p-3">
                          <p className="text-xs uppercase text-text-muted font-semibold">Certificate Renewal</p>
                          <p className={`font-semibold mt-1 ${probe.renewal_window_status === "expired" || probe.renewal_window_status === "urgent" ? "text-red-700" : probe.renewal_window_status === "renew-soon" ? "text-yellow-700" : "text-green-700"}`}>
                            {probe.renewal_window_status}
                          </p>
                          <p className="text-xs text-text-secondary mt-1">{probe.certificate_days_remaining === null || probe.certificate_days_remaining === undefined ? "Expiry unknown" : `${probe.certificate_days_remaining} day(s) remaining`}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3 text-xs">
                        <div>
                          <p className="uppercase text-text-muted font-semibold mb-1">Certificate</p>
                          <p className="font-mono break-all">Subject: {probe.certificate_subject || "-"}</p>
                          <p className="font-mono break-all mt-1">Issuer: {probe.certificate_issuer || "-"}</p>
                          <p className="font-mono break-all mt-1">Expires: {probe.certificate_not_after || "-"}</p>
                        </div>
                        <div>
                          <p className="uppercase text-text-muted font-semibold mb-1">Static vs Live</p>
                          <span className={`inline-flex px-2 py-1 rounded font-semibold ${probe.static_policy_match === "drift" ? "bg-red-100 text-red-800" : probe.static_policy_match === "matches-static" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}`}>
                            {probe.static_policy_match}
                          </span>
                          {(probe.accepted_legacy_protocols || []).length > 0 && (
                            <p className="mt-2 text-red-800">Legacy accepted: {(probe.accepted_legacy_protocols || []).join(", ")}</p>
                          )}
                        </div>
                      </div>
                      {(probe.risk_notes || []).length > 0 && (
                        <ul className="mt-3 space-y-1 text-xs text-red-800">
                          {(probe.risk_notes || []).map((note: string) => <li key={note}>- {note}</li>)}
                        </ul>
                      )}
                      {probe.attacker_window && (
                        <div className="mt-3 rounded-lg border border-red-100 bg-red-50 p-3 text-sm text-red-950">
                          <p className="font-semibold mb-1">Attacker mindset during delay window</p>
                          <p>{probe.attacker_window}</p>
                        </div>
                      )}
                      {probe.error && <p className="mt-3 text-xs text-text-muted break-all">Probe note: {probe.error}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {endpointPolicies.length > 0 && (
              <div className="bg-surface-container-lowest rounded-lg border border-border-divider p-6">
                <h3 className="text-xl font-bold mb-2">Endpoint TLS Posture Grades</h3>
                <p className="text-sm text-text-secondary mb-5">Risk-first grading of every detected TLS edge or policy-bearing file.</p>
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                  {endpointPolicies.slice(0, 8).map((policy: CipherEndpointPolicy) => (
                    <div key={policy.id} className="border border-border-divider rounded-lg p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h4 className="font-bold">{policy.endpoint}</h4>
                          <p className="text-xs text-text-muted font-mono mt-1">{policy.file_path}</p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-sm font-bold border ${gradeClass(policy.grade)}`}>Grade {policy.grade}</span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4 text-sm">
                        <div>
                          <p className="text-xs uppercase text-text-muted font-semibold mb-1">Protocols</p>
                          <div className="flex flex-wrap gap-1">
                            {(policy.protocols || []).slice(0, 8).map((item: string) => <span key={item} className="px-2 py-1 rounded bg-surface-container text-xs font-mono">{item}</span>)}
                          </div>
                        </div>
                        <div>
                          <p className="text-xs uppercase text-text-muted font-semibold mb-1">Weak Items</p>
                          <div className="flex flex-wrap gap-1">
                            {(policy.weak_items || []).slice(0, 8).map((item: string) => <span key={item} className="px-2 py-1 rounded bg-red-100 text-red-800 text-xs font-mono">{item}</span>)}
                            {!(policy.weak_items || []).length && <span className="text-xs text-text-muted">None</span>}
                          </div>
                        </div>
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2 text-xs">
                        <span className={`px-2 py-1 rounded ${policy.tls13_enabled ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}`}>
                          TLS 1.3 {policy.tls13_enabled ? "enabled" : "not evident"}
                        </span>
                        <span className={`px-2 py-1 rounded ${policy.forward_secrecy ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                          Forward secrecy {policy.forward_secrecy ? "evident" : "missing"}
                        </span>
                      </div>
                      {(policy.reasons || []).length > 0 && (
                        <ul className="mt-3 space-y-1 text-xs text-text-secondary">
                          {policy.reasons.map((reason: string) => <li key={reason}>- {reason}</li>)}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {attackPaths.length > 0 && (
              <div className="bg-surface-container-lowest rounded-lg border border-border-divider p-6">
                <h3 className="text-xl font-bold mb-2">Cipher Attack Paths</h3>
                <p className="text-sm text-text-secondary mb-5">How weak protocol/cipher choices can become banking traffic exposure before deployment.</p>
                <div className="space-y-4">
                  {attackPaths.slice(0, 5).map((path: CipherAttackPath) => (
                    <div key={path.id} className="border border-red-200 bg-red-50 rounded-lg p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h4 className="font-bold text-red-900">{path.title}</h4>
                          <p className="text-xs text-red-900 mt-1">Entry point: {path.entry_point}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                        <div className="bg-white border border-red-100 rounded p-3">
                          <p className="text-xs uppercase font-semibold text-red-700 mb-2">Weakness Chain</p>
                          <ol className="space-y-1 text-sm text-red-950 list-decimal list-inside">
                            {(path.weakness_chain || []).map((step: string) => <li key={step}>{step}</li>)}
                          </ol>
                        </div>
                        <div className="bg-white border border-red-100 rounded p-3">
                          <p className="text-xs uppercase font-semibold text-red-700 mb-2">Banking Impact</p>
                          <ul className="space-y-1 text-sm text-red-950">
                            {(path.banking_impact || []).map((item: string) => <li key={item}>- {item}</li>)}
                          </ul>
                        </div>
                      </div>
                      <p className="mt-3 text-sm text-red-950">
                        <span className="font-semibold">{path.remediation?.title}:</span> {path.remediation?.description}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(policyDecision || remediationPlan.length > 0 || complianceMapping.length > 0) && (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {policyDecision && (
                  <div className="bg-surface-container-lowest rounded-lg border border-border-divider p-6">
                    <h3 className="text-xl font-bold mb-2">Policy Decision</h3>
                    <p className="text-sm text-text-secondary mb-4">Why pre-deployment TLS checks pass or block release.</p>
                    <div className="flex flex-wrap gap-3 mb-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${policyDecision.status === "failed" ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"}`}>
                        {policyDecision.status}
                      </span>
                      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-surface-container text-text-secondary">{policyDecision.profile}</span>
                    </div>
                    <div className="space-y-4">
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

                <div className="bg-surface-container-lowest rounded-lg border border-border-divider p-6">
                  <h3 className="text-xl font-bold mb-2">Remediation and Compliance</h3>
                  <p className="text-sm text-text-secondary mb-4">Release-ready changes and mapped control gaps.</p>
                  <div className="space-y-3 max-h-[420px] overflow-y-auto">
                    {remediationPlan.slice(0, 6).map((item: CipherRemediation) => (
                      <div key={item.id} className="border border-border-divider rounded-lg p-3">
                        <div className="flex items-start justify-between gap-3">
                          <p className="font-semibold">{item.title}</p>
                          <span className="px-2 py-1 rounded text-xs bg-surface-container text-text-secondary">P{item.priority}</span>
                        </div>
                        <p className="text-sm text-text-secondary mt-2">{item.patch_strategy}</p>
                        <code className="block mt-2 text-xs whitespace-pre-wrap break-words bg-surface-container-low px-2 py-1 rounded">{item.secure_baseline}</code>
                      </div>
                    ))}
                    {complianceMapping.slice(0, 6).map((gap: CipherComplianceGap) => (
                      <div key={`${gap.standard}-${gap.control}`} className="border border-yellow-200 bg-yellow-50 rounded-lg p-3">
                        <p className="font-semibold text-yellow-900">{gap.standard}</p>
                        <p className="text-sm text-yellow-950 mt-1">{gap.control}</p>
                        <p className="text-xs text-yellow-800 mt-2">{gap.finding_ids?.length || 0} linked finding(s)</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {tlsFacts.length > 0 && (
              <div className="bg-surface-container-lowest rounded-lg border border-border-divider p-6">
                <h3 className="text-xl font-bold mb-4">Extracted TLS Facts</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[420px] overflow-y-auto">
                  {tlsFacts.slice(0, 20).map((fact: CipherFact) => (
                    <div key={fact.id} className="border border-border-divider rounded-lg p-3">
                      <div className="flex items-center justify-between gap-3">
                        <span className="px-2 py-1 rounded bg-surface-container text-xs font-mono">{fact.fact_type}</span>
                        <span className="text-xs text-text-muted">{Math.round((fact.confidence || 0) * 100)}%</span>
                      </div>
                      <p className="text-xs text-text-muted mt-2 font-mono">{fact.file_path}:{fact.line_number}</p>
                      <code className="block mt-2 text-xs whitespace-pre-wrap break-words">{fact.key} = {fact.value}</code>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {findings.length > 0 && (
              <div className="bg-surface-container-lowest rounded-lg border border-border-divider p-6">
                <h3 className="text-xl font-bold mb-4">TLS/Cipher Findings and Fixes</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-border-divider text-text-secondary text-sm">
                        <th className="pb-2 font-medium">Severity</th>
                        <th className="pb-2 font-medium">Issue</th>
                        <th className="pb-2 font-medium">Location</th>
                        <th className="pb-2 font-medium">Evidence</th>
                        <th className="pb-2 font-medium">Fix</th>
                      </tr>
                    </thead>
                    <tbody className="text-sm">
                      {findings.map((finding: CipherFinding) => (
                        <tr key={finding.id} className="border-b border-border-divider last:border-none align-top">
                          <td className="py-3 pr-4">
                            <span className={`px-2 py-1 rounded text-xs font-semibold ${severityClass(finding.severity)}`}>
                              {finding.severity.toUpperCase()}
                            </span>
                          </td>
                          <td className="py-3 pr-4">
                            <div className="font-medium">{finding.title}</div>
                            <div className="text-xs text-text-muted font-mono mt-1">{finding.rule_id} - {finding.category}</div>
                          </td>
                          <td className="py-3 pr-4 font-mono text-xs">
                            {finding.file_path}:{finding.line_number || "-"}
                          </td>
                          <td className="py-3 pr-4">
                            <code className="block max-w-[360px] whitespace-pre-wrap break-words bg-surface-container-low px-2 py-1 rounded text-xs">
                              {finding.evidence}
                            </code>
                            <div className="flex flex-wrap gap-1 mt-2">
                              {(finding.affected_protocols || []).map((item: string) => <span key={item} className="px-2 py-1 rounded bg-red-100 text-red-800 text-xs font-mono">{item}</span>)}
                              {(finding.affected_ciphers || []).slice(0, 4).map((item: string) => <span key={item} className="px-2 py-1 rounded bg-red-100 text-red-800 text-xs font-mono">{item}</span>)}
                            </div>
                          </td>
                          <td className="py-3 pr-4">
                            <div className="font-semibold">{finding.remediation?.title}</div>
                            <p className="text-xs text-text-secondary mt-1 max-w-[360px]">{finding.remediation?.description}</p>
                            {finding.remediation?.secure_example && (
                              <code className="block mt-2 text-xs whitespace-pre-wrap break-words bg-surface-container-low px-2 py-1 rounded">
                                {finding.remediation.secure_example}
                              </code>
                            )}
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
