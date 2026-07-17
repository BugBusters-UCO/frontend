import React, { useState } from "react";
import { ConfigScanResult } from "@/shared/api/types";
import { InfoTooltip } from "@/shared/ui/InfoTooltip";
import { ChevronDown, ChevronUp } from "lucide-react";

interface AdvancedConfigInsightsProps {
  result: ConfigScanResult;
}

type TabKey = "facts" | "drifts" | "policy" | "compliance" | "remediation";

export function AdvancedConfigInsights({ result }: AdvancedConfigInsightsProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey | null>(() => {
    if (result.normalized_config_facts?.length) return "facts";
    if (result.environment_drifts?.length || result.runtime_drifts?.length) return "drifts";
    if (result.policy_decision) return "policy";
    if (result.compliance_mapping?.length) return "compliance";
    if (result.remediation_plan?.length) return "remediation";
    return null;
  });

  if (!activeTab) return null;

  const totalDrifts = (result.environment_drifts?.length || 0) + (result.runtime_drifts?.length || 0);

  const tabs = [
    { key: "facts" as TabKey, label: "Facts", count: result.normalized_config_facts?.length || 0, icon: "data_object" },
    { key: "drifts" as TabKey, label: "Drifts", count: totalDrifts, icon: "compare_arrows" },
    { key: "policy" as TabKey, label: "Policy", count: result.policy_decision ? 1 : 0, icon: "gavel" },
    { key: "compliance" as TabKey, label: "Compliance", count: result.compliance_mapping?.length || 0, icon: "verified" },
    { key: "remediation" as TabKey, label: "Remediation", count: result.remediation_plan?.length || 0, icon: "build" },
  ].filter(tab => tab.count > 0);

  if (tabs.length === 0) return null;

  return (
    <div className="bg-surface transition-colors duration-300 rounded-2xl border border-border-subtle shadow-sm overflow-hidden mt-8">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-6 py-5 border-b border-border-divider flex items-center justify-between bg-surface-container hover:bg-surface-container-high transition-colors"
      >
        <div className="flex items-center">
          <h2 className="text-section-header font-section-header text-text-primary tracking-tight">
            Advanced Configuration Insights
          </h2>
          <div onClick={(e) => e.stopPropagation()}>
            <InfoTooltip text="Detailed configuration drifts, extracted facts, compliance, and policy decisions." />
          </div>
        </div>
        
        <span className="text-text-primary">
          {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </span>
      </button>

      {isExpanded && (
        <div className="p-card-padding animate-in slide-in-from-top-2 fade-in duration-200">
          {/* Tabs */}
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

          {/* Content Area */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[600px]">
              <thead>
                <tr className="border-b border-border-divider">
                  {activeTab === "facts" && (
                    <>
                      <th className="py-3 px-4 font-table-header text-table-header text-text-muted uppercase tracking-wider">Key</th>
                      <th className="py-3 px-4 font-table-header text-table-header text-text-muted uppercase tracking-wider">Value / Type</th>
                      <th className="py-3 px-4 font-table-header text-table-header text-text-muted uppercase tracking-wider">Location</th>
                    </>
                  )}
                  {activeTab === "drifts" && (
                    <>
                      <th className="py-3 px-4 font-table-header text-table-header text-text-muted uppercase tracking-wider">Severity</th>
                      <th className="py-3 px-4 font-table-header text-table-header text-text-muted uppercase tracking-wider">Title / Key</th>
                      <th className="py-3 px-4 font-table-header text-table-header text-text-muted uppercase tracking-wider">Environments</th>
                      <th className="py-3 px-4 font-table-header text-table-header text-text-muted uppercase tracking-wider text-right">Fix</th>
                    </>
                  )}
                  {activeTab === "policy" && (
                    <>
                      <th className="py-3 px-4 font-table-header text-table-header text-text-muted uppercase tracking-wider">Status</th>
                      <th className="py-3 px-4 font-table-header text-table-header text-text-muted uppercase tracking-wider">Reasons</th>
                      <th className="py-3 px-4 font-table-header text-table-header text-text-muted uppercase tracking-wider">Violations</th>
                    </>
                  )}
                  {activeTab === "compliance" && (
                    <>
                      <th className="py-3 px-4 font-table-header text-table-header text-text-muted uppercase tracking-wider">Standard</th>
                      <th className="py-3 px-4 font-table-header text-table-header text-text-muted uppercase tracking-wider">Control</th>
                      <th className="py-3 px-4 font-table-header text-table-header text-text-muted uppercase tracking-wider">Status</th>
                    </>
                  )}
                  {activeTab === "remediation" && (
                    <>
                      <th className="py-3 px-4 font-table-header text-table-header text-text-muted uppercase tracking-wider">Priority</th>
                      <th className="py-3 px-4 font-table-header text-table-header text-text-muted uppercase tracking-wider">Title</th>
                      <th className="py-3 px-4 font-table-header text-table-header text-text-muted uppercase tracking-wider">Strategy / Rollback</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-border-divider">
                
                {activeTab === "facts" && result.normalized_config_facts?.map((fact, idx) => (
                  <tr key={fact.id || idx} className="hover:bg-surface-container-lowest transition-colors">
                    <td className="py-4 px-4 font-code-sm text-text-primary">
                      {fact.key}
                    </td>
                    <td className="py-4 px-4 text-body-sm text-text-secondary">
                      {fact.sensitive ? <span className="italic text-text-muted">[SENSITIVE]</span> : fact.value_preview}
                      <div className="text-body-xs text-text-muted mt-0.5">Type: {fact.value_type}</div>
                    </td>
                    <td className="py-4 px-4 text-body-xs text-text-secondary">
                      {fact.file_path}{fact.line_number ? `:${fact.line_number}` : ''}
                    </td>
                  </tr>
                ))}

                {activeTab === "drifts" && [...(result.environment_drifts || []), ...(result.runtime_drifts || [])].map((drift, idx) => (
                  <tr key={drift.id || idx} className="hover:bg-surface-container-lowest transition-colors">
                    <td className="py-4 px-4">
                      <span className={`inline-flex items-center px-2 py-1 rounded text-body-xs font-semibold uppercase ${
                        drift.severity === 'critical' ? 'bg-severity-critical-bg text-severity-critical border border-severity-critical/20' :
                        drift.severity === 'high' ? 'bg-severity-high-bg text-severity-high border border-severity-high/20' :
                        drift.severity === 'medium' ? 'bg-severity-medium-bg text-severity-medium border border-severity-medium/20' :
                        'bg-severity-low-bg text-severity-low border border-severity-low/20'
                      }`}>
                        {drift.severity}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <div className="text-body-sm font-bold text-text-primary">{drift.title}</div>
                      <div className="text-body-xs font-code-sm text-text-secondary mt-1">{drift.key}</div>
                      <div className="text-body-xs text-text-muted mt-1">{drift.description}</div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex flex-wrap gap-1">
                        {drift.environments.map(e => (
                          <span key={e} className="px-1.5 py-0.5 bg-surface-dim rounded text-[10px] text-text-secondary border border-border-subtle">{e}</span>
                        ))}
                      </div>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <span className="text-body-xs text-text-primary font-semibold">{drift.remediation.title}</span>
                    </td>
                  </tr>
                ))}

                {activeTab === "policy" && result.policy_decision && (
                  <tr className="hover:bg-surface-container-lowest transition-colors">
                    <td className="py-4 px-4">
                      <span className={`inline-flex items-center px-2 py-1 rounded text-body-xs font-semibold uppercase ${
                        result.policy_decision.status === 'failed' ? 'bg-severity-critical-bg text-severity-critical border border-severity-critical/20' : 'bg-severity-low-bg text-severity-low border border-severity-low/20'
                      }`}>
                        {result.policy_decision.status}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-body-sm text-text-secondary">
                      <ul className="list-disc pl-4 space-y-1">
                        {result.policy_decision.reasons.map((r, i) => <li key={i}>{r}</li>)}
                      </ul>
                    </td>
                    <td className="py-4 px-4 text-body-sm text-text-secondary">
                       <ul className="list-disc pl-4 space-y-1">
                        {result.policy_decision.policy_violations.map((v, i) => <li key={i}>{v}</li>)}
                      </ul>
                    </td>
                  </tr>
                )}

                {activeTab === "compliance" && result.compliance_mapping?.map((mapping, idx) => (
                  <tr key={idx} className="hover:bg-surface-container-lowest transition-colors">
                    <td className="py-4 px-4">
                      <div className="text-body-sm font-bold text-text-primary">{mapping.standard}</div>
                      <div className="text-body-xs text-text-muted mt-0.5">{mapping.version}</div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="text-body-sm text-text-secondary">{mapping.control}</div>
                      {mapping.requirement && <div className="text-body-xs text-text-muted mt-0.5">{mapping.requirement}</div>}
                    </td>
                    <td className="py-4 px-4">
                       <span className={`inline-flex items-center px-2 py-1 rounded text-body-xs font-semibold uppercase ${
                        mapping.status === 'gap' ? 'bg-severity-medium-bg text-severity-medium border border-severity-medium/20' : 'bg-severity-low-bg text-severity-low border border-severity-low/20'
                      }`}>
                        {mapping.status}
                      </span>
                    </td>
                  </tr>
                ))}

                {activeTab === "remediation" && result.remediation_plan?.map((plan, idx) => (
                  <tr key={plan.id || idx} className="hover:bg-surface-container-lowest transition-colors">
                    <td className="py-4 px-4">
                       <span className="px-2 py-1 bg-surface-dim rounded text-body-xs font-bold text-text-secondary border border-border-subtle">
                        P{plan.priority}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-body-sm font-bold text-text-primary">
                      {plan.title}
                    </td>
                    <td className="py-4 px-4 text-body-sm text-text-secondary">
                      <div className="font-code-sm text-xs bg-surface-dim p-1 rounded border border-border-subtle mb-1">Strategy: {plan.patch_strategy}</div>
                      <div className="font-code-sm text-xs bg-surface-dim p-1 rounded border border-border-subtle">Rollback: {plan.rollback}</div>
                    </td>
                  </tr>
                ))}

              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
