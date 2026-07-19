import React, { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { InfoTooltip } from "@/shared/ui/InfoTooltip";
import { AiExplanation } from "@/shared/ui/AiExplanation";
import { CipherScanResult } from "@/shared/api/types";

interface AdvancedCipherInsightsProps {
  jobId: string;
  result: CipherScanResult;
}

type TabKey = "posture" | "banking" | "domains" | "probes" | "endpoints" | "attack_paths" | "facts";

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

function ciPolicyExplanation(summary: CipherScanResult["summary"] | undefined, policyDecision: CipherScanResult["policy_decision"] | null | undefined) {
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
    className: "text-red-700",
  };
}

export function AdvancedCipherInsights({ jobId, result }: AdvancedCipherInsightsProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  const summary = result.summary;
  const endpointPolicies = result.endpoint_policies || [];
  const attackPaths = result.attack_paths || [];
  const remediationPlan = result.remediation_plan || [];
  const policyDecision = result.policy_decision;
  const complianceMapping = result.compliance_mapping || [];
  const tlsFacts = result.tls_facts || [];
  const domainInventory = result.domain_inventory || [];
  const liveTlsProbes = result.live_tls_probes || [];
  const deploymentReadiness = result.deployment_readiness;
  const environmentDrifts = result.environment_drifts || [];
  const agilityRisks = result.agility_risks || [];
  const compatibilityRisks = result.compatibility_risks || [];
  const mtlsReadiness = result.mtls_readiness || [];
  const ciPolicy = ciPolicyExplanation(summary, policyDecision);

  const domainGroups = Object.values(
    domainInventory.reduce((groups: any, endpoint) => {
      const baseDomain = endpoint.base_domain || endpoint.host;
      if (!groups[baseDomain]) {
        groups[baseDomain] = { baseDomain, endpoints: [], apiCount: 0, riskCount: 0 };
      }
      groups[baseDomain].endpoints.push(endpoint);
      if ((endpoint.endpoint_type || "").includes("api")) groups[baseDomain].apiCount += 1;
      if ((endpoint.risk_notes || []).length > 0) groups[baseDomain].riskCount += 1;
      return groups;
    }, {})
  ).sort((a: any, b: any) => b.riskCount - a.riskCount || b.apiCount - a.apiCount || a.baseDomain.localeCompare(b.baseDomain));

  const tabs = [
    { key: "posture" as TabKey, label: "Posture", count: 1, icon: "security" },
    { key: "banking" as TabKey, label: "Banking Intel", count: (deploymentReadiness ? 1 : 0) + environmentDrifts.length + agilityRisks.length + compatibilityRisks.length + mtlsReadiness.length, icon: "account_balance" },
    { key: "domains" as TabKey, label: "Domains & APIs", count: domainInventory.length, icon: "dns" },
    { key: "probes" as TabKey, label: "Live Probes", count: liveTlsProbes.length, icon: "network_check" },
    { key: "endpoints" as TabKey, label: "Endpoints", count: endpointPolicies.length, icon: "settings_ethernet" },
    { key: "attack_paths" as TabKey, label: "Attack Paths", count: attackPaths.length, icon: "timeline" },
    { key: "facts" as TabKey, label: "Facts", count: tlsFacts.length, icon: "fact_check" }
  ].filter(t => t.count > 0);

  const [activeTab, setActiveTab] = useState<TabKey | null>(tabs.length > 0 ? tabs[0].key : null);

  if (!activeTab || tabs.length === 0) return null;

  return (
    <div className="bg-surface rounded-2xl border border-border-subtle shadow-sm overflow-hidden transition-colors duration-300 mt-6">
      <button 
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-6 py-5 border-b border-border-divider flex justify-between items-center bg-surface-container hover:bg-surface-container-high transition-colors"
      >
        <div className="flex items-center">
          <h2 className="text-section-header font-section-header text-text-primary tracking-tight">
            Advanced Cipher Intelligence
          </h2>
          <div onClick={(e) => e.stopPropagation()}>
            <InfoTooltip text="Offline checks for sensitive financial data, live TLS probes, domain inventory, and mTLS readiness." />
          </div>
        </div>
        <span className="text-text-primary">
          {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </span>
      </button>

      {isExpanded && (
        <div className="p-card-padding animate-in slide-in-from-top-2 fade-in duration-200">
          <div className="flex gap-2 border-b border-border-divider mb-6 overflow-x-auto pb-2">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-body-sm font-semibold transition-colors whitespace-nowrap ${
                  activeTab === tab.key
                    ? "bg-primary-container/10 text-primary border-b-2 border-primary rounded-b-none"
                    : "text-text-secondary hover:bg-surface-container hover:text-text-primary"
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">{tab.icon}</span>
                {tab.label}
                <span className="bg-surface-container-high text-text-primary px-2 py-0.5 rounded-full text-[10px] ml-1">
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          <div className="overflow-x-auto min-h-[300px]">
            {activeTab === "posture" && (
              <div className="p-4 bg-surface-container-lowest rounded-2xl border border-border-divider">
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
                  <div className="border border-border-divider rounded-2xl p-4">
                    <p className="text-xs uppercase text-text-muted font-semibold mb-2">TLS Facts</p>
                    <p className="text-3xl font-bold">{summary?.tls_facts || 0}</p>
                  </div>
                  <div className="border border-border-divider rounded-2xl p-4">
                    <p className="text-xs uppercase text-text-muted font-semibold mb-2">Profile</p>
                    <p className="text-2xl font-bold capitalize">{summary?.banking_profile || "strict"}</p>
                  </div>
                  <div className="border border-border-divider rounded-2xl p-4">
                    <p className="text-xs uppercase text-text-muted font-semibold mb-2">CI Policy Gate</p>
                    <p className={`text-2xl font-bold ${ciPolicy.className}`}>{ciPolicy.label}</p>
                    <p className="text-xs text-text-secondary mt-2 leading-relaxed">{ciPolicy.detail}</p>
                  </div>
                  <div className="border border-border-divider rounded-2xl p-4">
                    <p className="text-xs uppercase text-text-muted font-semibold mb-2">Remediation Actions</p>
                    <p className="text-3xl font-bold">{summary?.remediation_actions || 0}</p>
                  </div>
                </div>
                <div className="mt-6">
                  <AiExplanation 
                    jobId={jobId} 
                    sectionId="posture" 
                    data={{ summary, ciPolicy }}
                    title="What this means"
                  />
                </div>
              </div>
            )}

            {activeTab === "banking" && (
              <div>
                <div className="flex items-center justify-between gap-4 mb-5">
                  <div>
                    <h3 className="text-xl font-bold">Banking Cipher Intelligence</h3>
                    <p className="text-sm text-text-secondary">Pre-deployment readiness, environment drift, mTLS gaps, and crypto agility pressure.</p>
                  </div>
                  {deploymentReadiness && (
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${deploymentReadiness.status === "blocked" ? "bg-red-100 text-red-800" : deploymentReadiness.status === "needs-review" ? "bg-yellow-100 text-yellow-800" : "bg-green-100 text-green-800"}`}>
                      {deploymentReadiness.status} / {deploymentReadiness.score}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-5">
                  <div className="border border-border-divider rounded-2xl p-3">
                    <p className="text-xs uppercase text-text-muted font-semibold">Drifts</p>
                    <p className="text-2xl font-bold">{environmentDrifts.length}</p>
                  </div>
                  <div className="border border-border-divider rounded-2xl p-3">
                    <p className="text-xs uppercase text-text-muted font-semibold">Agility</p>
                    <p className="text-2xl font-bold">{agilityRisks.length}</p>
                  </div>
                  <div className="border border-border-divider rounded-2xl p-3">
                    <p className="text-xs uppercase text-text-muted font-semibold">Compatibility</p>
                    <p className="text-2xl font-bold">{compatibilityRisks.length}</p>
                  </div>
                  <div className="border border-border-divider rounded-2xl p-3">
                    <p className="text-xs uppercase text-text-muted font-semibold">mTLS Gaps</p>
                    <p className="text-2xl font-bold">{mtlsReadiness.filter(i => i.status !== "ready").length}</p>
                  </div>
                </div>

                {deploymentReadiness && (
                  <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mb-5">
                    <div className="border border-red-100 bg-red-50 rounded-2xl p-4">
                      <p className="text-xs uppercase font-semibold text-red-700 mb-2">Blockers</p>
                      {(deploymentReadiness.blockers || []).length ? (
                        <ul className="space-y-1 text-sm text-red-950">{deploymentReadiness.blockers.map(i => <li key={i}>- {i}</li>)}</ul>
                      ) : (
                        <p className="text-sm text-red-900">None</p>
                      )}
                    </div>
                    <div className="border border-yellow-100 bg-yellow-50 rounded-2xl p-4">
                      <p className="text-xs uppercase font-semibold text-yellow-700 mb-2">Warnings</p>
                      {(deploymentReadiness.warnings || []).length ? (
                        <ul className="space-y-1 text-sm text-yellow-950">{deploymentReadiness.warnings.map(i => <li key={i}>- {i}</li>)}</ul>
                      ) : (
                        <p className="text-sm text-yellow-900">None</p>
                      )}
                    </div>
                    <div className="border border-green-100 bg-green-50 rounded-2xl p-4">
                      <p className="text-xs uppercase font-semibold text-green-700 mb-2">Strengths</p>
                      {(deploymentReadiness.strengths || []).length ? (
                        <ul className="space-y-1 text-sm text-green-950">{deploymentReadiness.strengths.map(i => <li key={i}>- {i}</li>)}</ul>
                      ) : (
                        <p className="text-sm text-green-900">No strong controls confirmed yet</p>
                      )}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                  {environmentDrifts.length > 0 && (
                    <div className="border border-yellow-200 bg-yellow-50 rounded-2xl p-4">
                      <h4 className="font-bold text-yellow-950 mb-2">Environment Drift</h4>
                      <div className="space-y-3 max-h-[260px] overflow-y-auto">
                        {environmentDrifts.map(drift => (
                          <div key={drift.id} className="bg-surface transition-colors duration-300 border border-yellow-100 rounded p-3">
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
                    <div className="border border-border-divider rounded-2xl p-4">
                      <h4 className="font-bold mb-2">Cipher Agility Risks</h4>
                      <div className="space-y-3 max-h-[260px] overflow-y-auto">
                        {agilityRisks.map(risk => (
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
                    <div className="border border-border-divider rounded-2xl p-4">
                      <h4 className="font-bold mb-2">Compatibility And mTLS Readiness</h4>
                      <div className="space-y-3 max-h-[260px] overflow-y-auto">
                        {compatibilityRisks.map(risk => (
                          <div key={risk.id} className="bg-surface-container-low rounded p-3">
                            <p className="font-semibold">{risk.endpoint}</p>
                            <p className="text-sm text-text-secondary mt-1">{risk.issue}</p>
                            <p className="text-xs text-text-muted mt-2">{risk.recommendation}</p>
                          </div>
                        ))}
                        {mtlsReadiness.map(item => (
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
                <div className="mt-6">
                  <AiExplanation 
                    jobId={jobId} 
                    sectionId="banking-intel" 
                    data={{ environmentDrifts, agilityRisks, deploymentReadiness }}
                    title="What this means"
                  />
                </div>
              </div>
            )}

            {activeTab === "domains" && (
              <div>
                <div className="flex items-center justify-between gap-4 mb-5">
                  <div>
                    <h3 className="text-xl font-bold">Domain And API Inventory</h3>
                    <p className="text-sm text-text-secondary">Discovered public domains, subdomains, API endpoints, and source evidence from code/config.</p>
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs font-semibold">
                    <span className="px-3 py-1 rounded-full bg-surface-container text-text-secondary">{domainInventory.length} domains</span>
                  </div>
                </div>
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                  {domainGroups.map((group: any) => (
                    <div key={group.baseDomain} className="border border-border-divider rounded-2xl p-4">
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
                        {group.endpoints.map((endpoint: any) => (
                          <div key={endpoint.id} className="bg-surface-container-low rounded-2xl p-3">
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

            {activeTab === "probes" && (
              <div>
                <div className="flex items-center justify-between gap-4 mb-5">
                  <div>
                    <h3 className="text-xl font-bold">Live Deployment TLS Verification</h3>
                    <p className="text-sm text-text-secondary">Runtime check for discovered domains: deployment status, certificate expiry, negotiated cipher.</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                  {liveTlsProbes.map(probe => (
                    <div key={probe.id} className="border border-border-divider rounded-2xl p-4">
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
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === "endpoints" && (
              <div>
                <h3 className="text-xl font-bold mb-2">Endpoint TLS Posture Grades</h3>
                <p className="text-sm text-text-secondary mb-5">Risk-first grading of every detected TLS edge or policy-bearing file.</p>
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                  {endpointPolicies.map(policy => (
                    <div key={policy.id} className="border border-border-divider rounded-2xl p-4">
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
                            {(policy.protocols || []).map(item => <span key={item} className="px-2 py-1 rounded bg-surface-container text-xs font-mono">{item}</span>)}
                          </div>
                        </div>
                        <div>
                          <p className="text-xs uppercase text-text-muted font-semibold mb-1">Weak Items</p>
                          <div className="flex flex-wrap gap-1">
                            {(policy.weak_items || []).map(item => <span key={item} className="px-2 py-1 rounded bg-red-100 text-red-800 text-xs font-mono">{item}</span>)}
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
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === "attack_paths" && (
              <div>
                <h3 className="text-xl font-bold mb-2">Cipher Attack Paths</h3>
                <p className="text-sm text-text-secondary mb-5">How weak protocol/cipher choices can become banking traffic exposure before deployment.</p>
                <div className="space-y-4">
                  {attackPaths.map(path => (
                    <div key={path.id} className="border border-red-200 bg-red-50 rounded-2xl p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h4 className="font-bold text-red-900">{path.title}</h4>
                          <p className="text-xs text-red-900 mt-1">Entry point: {path.entry_point}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                        <div className="bg-surface transition-colors duration-300 border border-red-100 rounded p-3">
                          <p className="text-xs uppercase font-semibold text-red-700 mb-2">Weakness Chain</p>
                          <ol className="space-y-1 text-sm text-red-950 list-decimal list-inside">
                            {(path.weakness_chain || []).map(step => <li key={step}>{step}</li>)}
                          </ol>
                        </div>
                        <div className="bg-surface transition-colors duration-300 border border-red-100 rounded p-3">
                          <p className="text-xs uppercase font-semibold text-red-700 mb-2">Banking Impact</p>
                          <ul className="space-y-1 text-sm text-red-950">
                            {(path.banking_impact || []).map(item => <li key={item}>- {item}</li>)}
                          </ul>
                        </div>
                      </div>
                      <p className="mt-3 text-sm text-red-950">
                        <span className="font-semibold">{path.remediation?.title}:</span> {path.remediation?.description}
                      </p>
                    </div>
                  ))}
                </div>
                <div className="mt-6">
                  <AiExplanation 
                    jobId={jobId} 
                    sectionId="attack-paths" 
                    data={{ attackPaths }}
                    title="What this means"
                  />
                </div>
              </div>
            )}

            {activeTab === "facts" && (
              <div>
                <h3 className="text-xl font-bold mb-4">Extracted TLS Facts</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[420px] overflow-y-auto">
                  {tlsFacts.map(fact => (
                    <div key={fact.id} className="border border-border-divider rounded-2xl p-3">
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
          </div>
        </div>
      )}
    </div>
  );
}
