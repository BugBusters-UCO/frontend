"use client";

import React, { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { CipherScanResult, LogEntry, ScanJob } from "@/shared/api/types";
import { fetchCipherJobStatus, getCipherScanLogsUrl, notifyCipherScan } from "@/shared/api/client";
import { LiveExecutionLog } from "@/widgets/LiveExecutionLog";
import { SkeletonJobRow, SkeletonMetricsRow, SkeletonPanel } from "@/widgets/Skeleton";
import { ArrowLeftCircle } from "lucide-react";
import { CipherMetricsRow } from "@/widgets/cipher/CipherMetricsRow";
import { CipherBusinessImpactPanel } from "@/widgets/cipher/CipherBusinessImpactPanel";
import { CipherInteractiveGraph } from "@/widgets/cipher/CipherInteractiveGraph";
import { AdvancedCipherInsights } from "@/widgets/cipher/AdvancedCipherInsights";
import { CipherFindingsTable } from "@/widgets/cipher/CipherFindingsTable";
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

  const [isNotifying, setIsNotifying] = useState(false);
  const [notifySuccess, setNotifySuccess] = useState(false);

  const handleNotify = async () => {
    try {
      setIsNotifying(true);
      await notifyCipherScan(jobId);
      setNotifySuccess(true);
      setTimeout(() => setNotifySuccess(false), 3000);
    } catch (error) {
      console.error("Failed to notify team", error);
    } finally {
      setIsNotifying(false);
    }
  };

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
        <div className="flex-1">
          <h1 className="font-headline-lg text-headline-lg text-text-primary mb-1">
            Cipher Scan: {job.sourceLabel || jobId}
          </h1>
          <p className="font-body-sm text-body-sm text-text-secondary">Status: {job.status || "Loading..."}</p>
        </div>
        {!isScanning && job.status === "completed" && (
          <button
            onClick={handleNotify}
            disabled={isNotifying || notifySuccess}
            className={`px-4 py-2 text-white rounded-lg font-medium transition-colors ${notifySuccess ? "bg-green-600" : "bg-primary hover:bg-primary/90"} disabled:opacity-50`}
          >
            {isNotifying ? "Notifying..." : notifySuccess ? "Notification Sent!" : "Notify Team"}
          </button>
        )}
      </div>

      <div className="flex flex-col gap-element-gap">
        <LiveExecutionLog logs={logs} isRunning={isScanning} />

        {!isScanning && job.status === "failed" && (
          <div className="bg-error-container text-on-error-container p-4 rounded-2xl border border-[#ffb4ab]">
            <h3 className="font-bold text-lg mb-2">Scan Failed</h3>
            <p>{job.error || "An unknown error occurred during the cipher scan."}</p>
          </div>
        )}

        {!isScanning && job.status === "completed" && !result && (
          <div className="bg-surface-container-low text-text-secondary p-4 rounded-2xl text-center">
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
                {result && <AdvancedCipherInsights result={result as any} />}
                {findings.length > 0 && <CipherFindingsTable findings={findings} />}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
