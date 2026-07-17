import React, { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { InfoTooltip } from "@/shared/ui/InfoTooltip";
import { SecretScanResult } from "@/shared/api/types";

interface AdvancedSecretInsightsProps {
  result: SecretScanResult;
}

type TabKey = "policy" | "usage" | "sensitive" | "history" | "compromised";

function severityClass(severity?: string) {
  if (severity === "critical") return "bg-red-100 text-red-800";
  if (severity === "high") return "bg-orange-100 text-orange-800";
  if (severity === "medium") return "bg-yellow-100 text-yellow-800";
  return "bg-blue-100 text-blue-800";
}

export function AdvancedSecretInsights({ result }: AdvancedSecretInsightsProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  const policyDecision = result.policy_decision;
  const usagePaths = result.usage_paths || [];
  const sensitiveDataFindings = result.sensitive_data_findings || [];
  const historicalExposures = result.historical_exposures || [];
  const compromisedMatches = result.compromised_matches || [];

  const [activeTab, setActiveTab] = useState<TabKey | null>(() => {
    if (policyDecision) return "policy";
    if (usagePaths.length) return "usage";
    if (sensitiveDataFindings.length) return "sensitive";
    if (historicalExposures.length) return "history";
    if (compromisedMatches.length) return "compromised";
    return null;
  });

  if (!activeTab) return null;

  const tabs = [
    { key: "policy" as TabKey, label: "Policy", count: policyDecision ? 1 : 0, icon: "gavel" },
    { key: "usage" as TabKey, label: "Usage Paths", count: usagePaths.length, icon: "schema" },
    { key: "sensitive" as TabKey, label: "Sensitive Data", count: sensitiveDataFindings.length, icon: "privacy_tip" },
    { key: "history" as TabKey, label: "Git History", count: historicalExposures.length, icon: "history" },
    { key: "compromised" as TabKey, label: "Compromised Matches", count: compromisedMatches.length, icon: "report" },
  ].filter(tab => tab.count > 0);

  if (tabs.length === 0) return null;

  return (
    <div className="bg-surface rounded-2xl border border-border-subtle shadow-sm overflow-hidden transition-colors duration-300 mt-6">
      <button 
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-6 py-5 border-b border-border-divider flex justify-between items-center bg-surface-container hover:bg-surface-container-high transition-colors"
      >
        <div className="flex items-center">
          <h2 className="text-section-header font-section-header text-text-primary tracking-tight">
            Advanced Secret Intelligence
          </h2>
          <div onClick={(e) => e.stopPropagation()}>
            <InfoTooltip text="Offline checks for sensitive financial data, usage sinks, Git history exposure, and known compromised fingerprints." />
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
            {activeTab === "policy" && policyDecision && (
              <div className="p-4 bg-surface-container-lowest rounded-2xl border border-border-divider">
                <div className="flex flex-wrap gap-3 mb-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${policyDecision.status === "failed" ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"}`}>
                    {policyDecision.status.toUpperCase()}
                  </span>
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-surface-container text-text-secondary">{policyDecision.gate}</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

            {activeTab === "usage" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {usagePaths.map((usage: any) => (
                  <div key={usage.id} className="bg-surface-container-lowest border border-border-divider rounded-2xl p-4">
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <span className="font-mono text-xs font-bold text-text-primary">{usage.variable_hint}</span>
                      <span className="px-2 py-1 rounded text-xs bg-orange-100 text-orange-800 font-semibold">{usage.sink_type}</span>
                    </div>
                    <p className="text-xs text-text-muted mt-1">{usage.usage_file}:{usage.line_number || "-"}</p>
                    <p className="text-sm text-text-secondary mt-2">{usage.impact}</p>
                    <code className="block mt-3 text-xs whitespace-pre-wrap break-words bg-surface-container-low p-2 rounded text-text-primary border border-border-subtle">{usage.evidence}</code>
                  </div>
                ))}
              </div>
            )}

            {activeTab === "sensitive" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {sensitiveDataFindings.map((item: any) => (
                  <div key={item.id} className="bg-surface-container-lowest border border-border-divider rounded-2xl p-4">
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <span className="font-semibold text-text-primary">{item.data_type}</span>
                      <span className={`px-2 py-1 rounded text-xs font-semibold uppercase ${severityClass(item.severity)}`}>{item.severity}</span>
                    </div>
                    <p className="text-xs text-text-muted mt-1">{item.file_path}:{item.line_number || "-"}</p>
                    <code className="block mt-3 text-xs whitespace-pre-wrap break-words bg-surface-container-low p-2 rounded text-text-primary border border-border-subtle">{item.evidence}</code>
                    <p className="text-xs text-text-secondary mt-3"><span className="font-semibold">Remediation:</span> {item.remediation}</p>
                  </div>
                ))}
              </div>
            )}

            {activeTab === "history" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {historicalExposures.map((item: any) => (
                  <div key={item.id} className="bg-red-50 border border-red-200 rounded-2xl p-4">
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <span className="font-mono text-xs font-bold text-red-900">{item.commit?.slice(0, 10)}</span>
                      <span className={`px-2 py-1 rounded text-xs font-semibold uppercase ${severityClass(item.severity)}`}>{item.secret_type}</span>
                    </div>
                    <p className="text-xs text-red-800 mt-1">{item.file_path || "unknown file"} {item.date ? `- ${item.date}` : ""}</p>
                    <code className="block mt-3 text-xs whitespace-pre-wrap break-words bg-white p-2 rounded text-red-900 border border-red-100">{item.evidence}</code>
                    <p className="text-xs text-red-900 mt-3 font-semibold">{item.remediation}</p>
                  </div>
                ))}
              </div>
            )}

            {activeTab === "compromised" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {compromisedMatches.map((item: any) => (
                  <div key={item.id} className="bg-red-50 border border-red-200 rounded-2xl p-4">
                    <p className="font-mono text-xs font-bold text-red-900 mb-2 break-all">{item.secret_fingerprint}</p>
                    <p className="text-xs text-red-800 mt-1">Source: <span className="font-semibold">{item.match_source}</span></p>
                    <div className="mt-3 bg-white border border-red-100 rounded p-2">
                      <p className="text-sm text-red-900 font-semibold">{item.action}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
