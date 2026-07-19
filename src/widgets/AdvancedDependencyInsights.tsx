import React, { useState } from "react";
import { DependencyScanResult } from "@/shared/api/types";
import { InfoTooltip } from "@/shared/ui/InfoTooltip";
import { ChevronDown, ChevronUp } from "lucide-react";

interface AdvancedDependencyInsightsProps {
  result: DependencyScanResult;
}

type TabKey = "capabilities" | "malware" | "behavior" | "intelligence" | "namespace" | "dependency";

export function AdvancedDependencyInsights({ result }: AdvancedDependencyInsightsProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey | null>(() => {
    if (result.capability_findings?.length) return "capabilities";
    if (result.static_malware_findings?.length) return "malware";
    if (result.behavior_findings?.length) return "behavior";
    if (result.package_intelligence_findings?.length) return "intelligence";
    if (result.namespace_risks?.length) return "namespace";
    if (result.dependency_risks?.length) return "dependency";
    return null;
  });

  if (!activeTab) return null;

  const tabs = [
    { key: "capabilities" as TabKey, label: "Capabilities", count: result.capability_findings?.length || 0, icon: "policy" },
    { key: "malware" as TabKey, label: "Malware", count: result.static_malware_findings?.length || 0, icon: "pest_control" },
    { key: "behavior" as TabKey, label: "Behavior", count: result.behavior_findings?.length || 0, icon: "psychology" },
    { key: "intelligence" as TabKey, label: "Intelligence", count: result.package_intelligence_findings?.length || 0, icon: "query_stats" },
    { key: "namespace" as TabKey, label: "Namespace", count: result.namespace_risks?.length || 0, icon: "account_tree" },
    { key: "dependency" as TabKey, label: "Risk Factors", count: result.dependency_risks?.length || 0, icon: "warning" },
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
            Advanced Insights
          </h2>
          <div onClick={(e) => e.stopPropagation()}>
            <InfoTooltip text="Detailed behavioral, malware, and ecosystem intelligence findings for your dependencies." />
          </div>
        </div>
        
        {/* Sandbox Indicator */}
        <div className="flex items-center gap-4">
          {result.sandbox && Object.keys(result.sandbox).length > 0 && (
            <div className="flex items-center gap-2 px-3 py-1 bg-surface-container-high rounded-full border border-border-divider">
              <span className="material-symbols-outlined text-severity-medium text-[16px]">
                science
              </span>
              <span className="text-body-xs font-semibold text-text-secondary">Sandbox Active</span>
            </div>
          )}
          <span className="text-text-primary">
            {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </span>
        </div>
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
            <span className="bg-surface-container-high text-text-primary px-2 py-0.5 rounded-full text-[10px]">
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
              <th className="py-3 px-4 font-table-header text-table-header text-text-muted uppercase tracking-wider">Severity</th>
              <th className="py-3 px-4 font-table-header text-table-header text-text-muted uppercase tracking-wider">Title</th>
              <th className="py-3 px-4 font-table-header text-table-header text-text-muted uppercase tracking-wider">Description / Evidence</th>
              <th className="py-3 px-4 font-table-header text-table-header text-text-muted uppercase tracking-wider text-right">Fix</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-divider">
            
            {activeTab === "capabilities" && result.capability_findings?.map((finding, idx) => (
              <tr key={finding.id || idx} className="hover:bg-surface-container-lowest transition-colors">
                <td className="py-4 px-4 align-top">
                  <span className={`inline-flex items-center px-2 py-1 rounded text-body-xs font-semibold uppercase ${
                    finding.severity === 'critical' ? 'bg-severity-critical-bg text-severity-critical border border-severity-critical/20' :
                    finding.severity === 'high' ? 'bg-severity-high-bg text-severity-high border border-severity-high/20' :
                    finding.severity === 'medium' ? 'bg-severity-medium-bg text-severity-medium border border-severity-medium/20' :
                    'bg-severity-low-bg text-severity-low border border-severity-low/20'
                  }`}>
                    {finding.severity}
                  </span>
                </td>
                <td className="py-4 px-4 align-top">
                  <div className="text-body-sm font-bold text-text-primary capitalize">{finding.capability.replace(/-/g, ' ')}</div>
                  {finding.dependency_name && (
                    <div className="text-body-xs text-text-primary font-mono mt-1 bg-surface-container px-1 py-0.5 rounded inline-block">via {finding.dependency_name}</div>
                  )}
                </td>
                <td className="py-4 px-4 align-top">
                  <div className="text-body-sm text-text-secondary">{finding.description}</div>
                  {finding.file_path && (
                    <div className="mt-2 text-body-xs font-mono text-text-muted break-all">
                      {finding.file_path}{finding.line_number ? `:${finding.line_number}` : ''}
                    </div>
                  )}
                  {finding.code && (
                    <div className="mt-1 text-body-xs font-code-sm bg-terminal-bg text-slate-300 p-2 rounded border border-terminal-border overflow-x-auto">
                      <pre>{finding.code}</pre>
                    </div>
                  )}
                </td>
                <td className="py-4 px-4 text-right align-top">
                  <span className="text-body-xs text-text-primary font-semibold">{finding.fix?.title || 'Review manually'}</span>
                </td>
              </tr>
            ))}

            {activeTab === "malware" && result.static_malware_findings?.map((finding, idx) => (
              <tr key={finding.id || idx} className="hover:bg-surface-container-lowest transition-colors">
                <td className="py-4 px-4">
                  <span className={`inline-flex items-center px-2 py-1 rounded text-body-xs font-semibold uppercase ${
                    finding.severity === 'critical' ? 'bg-severity-critical-bg text-severity-critical border border-severity-critical/20' :
                    finding.severity === 'high' ? 'bg-severity-high-bg text-severity-high border border-severity-high/20' :
                    finding.severity === 'medium' ? 'bg-severity-medium-bg text-severity-medium border border-severity-medium/20' :
                    'bg-severity-low-bg text-severity-low border border-severity-low/20'
                  }`}>
                    {finding.severity}
                  </span>
                </td>
                <td className="py-4 px-4">
                  <div className="text-body-sm font-bold text-text-primary">{finding.title}</div>
                  <div className="text-body-xs text-text-muted mt-1 font-mono">Rule: {finding.rule_id}</div>
                </td>
                <td className="py-4 px-4">
                  <div className="text-body-sm text-text-secondary">{finding.description}</div>
                  {finding.evidence && (
                    <div className="mt-2 text-body-xs font-code-sm bg-terminal-bg text-slate-300 p-2 rounded border border-terminal-border">
                      {finding.evidence}
                    </div>
                  )}
                </td>
                <td className="py-4 px-4 text-right">
                  <span className="text-body-xs text-text-primary font-semibold">{finding.fix.title}</span>
                </td>
              </tr>
            ))}

            {activeTab === "behavior" && result.behavior_findings?.map((finding, idx) => (
              <tr key={finding.id || idx} className="hover:bg-surface-container-lowest transition-colors">
                <td className="py-4 px-4">
                  <span className={`inline-flex items-center px-2 py-1 rounded text-body-xs font-semibold uppercase ${
                    finding.severity === 'critical' ? 'bg-severity-critical-bg text-severity-critical border border-severity-critical/20' :
                    finding.severity === 'high' ? 'bg-severity-high-bg text-severity-high border border-severity-high/20' :
                    finding.severity === 'medium' ? 'bg-severity-medium-bg text-severity-medium border border-severity-medium/20' :
                    'bg-severity-low-bg text-severity-low border border-severity-low/20'
                  }`}>
                    {finding.severity}
                  </span>
                </td>
                <td className="py-4 px-4">
                  <div className="text-body-sm font-bold text-text-primary">{finding.title}</div>
                  <div className="text-body-xs text-text-muted mt-1 font-mono">Rule: {finding.rule_id}</div>
                </td>
                <td className="py-4 px-4">
                  <div className="text-body-sm text-text-secondary">{finding.description}</div>
                  {finding.evidence && Object.keys(finding.evidence).length > 0 && (
                    <div className="mt-2 text-body-xs font-code-sm bg-terminal-bg text-slate-300 p-2 rounded border border-terminal-border overflow-x-auto">
                      <pre>{JSON.stringify(finding.evidence, null, 2)}</pre>
                    </div>
                  )}
                </td>
                <td className="py-4 px-4 text-right">
                  <span className="text-body-xs text-text-primary font-semibold">{finding.fix.title}</span>
                </td>
              </tr>
            ))}

            {activeTab === "intelligence" && result.package_intelligence_findings?.map((finding, idx) => (
              <tr key={finding.id || idx} className="hover:bg-surface-container-lowest transition-colors">
                <td className="py-4 px-4">
                  <span className={`inline-flex items-center px-2 py-1 rounded text-body-xs font-semibold uppercase ${
                    finding.severity === 'critical' ? 'bg-severity-critical-bg text-severity-critical border border-severity-critical/20' :
                    finding.severity === 'high' ? 'bg-severity-high-bg text-severity-high border border-severity-high/20' :
                    finding.severity === 'medium' ? 'bg-severity-medium-bg text-severity-medium border border-severity-medium/20' :
                    'bg-severity-low-bg text-severity-low border border-severity-low/20'
                  }`}>
                    {finding.severity}
                  </span>
                </td>
                <td className="py-4 px-4">
                  <div className="text-body-sm font-bold text-text-primary">{finding.title}</div>
                  <div className="text-body-xs text-text-primary font-mono mt-1 bg-surface-container px-1 py-0.5 rounded inline-block">{finding.package_name}</div>
                </td>
                <td className="py-4 px-4">
                  <div className="text-body-sm text-text-secondary">{finding.description}</div>
                </td>
                <td className="py-4 px-4 text-right">
                  <span className="text-body-xs text-text-primary font-semibold">{finding.fix.title}</span>
                </td>
              </tr>
            ))}

            {activeTab === "namespace" && result.namespace_risks?.map((finding, idx) => (
              <tr key={finding.id || idx} className="hover:bg-surface-container-lowest transition-colors">
                <td className="py-4 px-4">
                  <span className={`inline-flex items-center px-2 py-1 rounded text-body-xs font-semibold uppercase ${
                    finding.severity === 'critical' ? 'bg-severity-critical-bg text-severity-critical border border-severity-critical/20' :
                    finding.severity === 'high' ? 'bg-severity-high-bg text-severity-high border border-severity-high/20' :
                    finding.severity === 'medium' ? 'bg-severity-medium-bg text-severity-medium border border-severity-medium/20' :
                    'bg-severity-low-bg text-severity-low border border-severity-low/20'
                  }`}>
                    {finding.severity}
                  </span>
                </td>
                <td className="py-4 px-4">
                  <div className="text-body-sm font-bold text-text-primary">{finding.title}</div>
                  <div className="text-body-xs text-text-muted mt-1">{finding.category}</div>
                </td>
                <td className="py-4 px-4">
                  <div className="text-body-sm text-text-secondary">{finding.description}</div>
                  {finding.evidence && finding.evidence.length > 0 && (
                    <ul className="mt-2 text-body-xs text-text-muted list-disc list-inside">
                      {finding.evidence.map((ev, i) => <li key={i}>{ev}</li>)}
                    </ul>
                  )}
                </td>
                <td className="py-4 px-4 text-right">
                  <span className="text-body-xs text-text-primary font-semibold">{finding.fix.title}</span>
                </td>
              </tr>
            ))}

            {activeTab === "dependency" && result.dependency_risks?.map((finding, idx) => (
              <tr key={finding.id || idx} className="hover:bg-surface-container-lowest transition-colors">
                <td className="py-4 px-4">
                  <span className={`inline-flex items-center px-2 py-1 rounded text-body-xs font-semibold uppercase ${
                    finding.severity === 'critical' ? 'bg-severity-critical-bg text-severity-critical border border-severity-critical/20' :
                    finding.severity === 'high' ? 'bg-severity-high-bg text-severity-high border border-severity-high/20' :
                    finding.severity === 'medium' ? 'bg-severity-medium-bg text-severity-medium border border-severity-medium/20' :
                    'bg-severity-low-bg text-severity-low border border-severity-low/20'
                  }`}>
                    {finding.severity}
                  </span>
                </td>
                <td className="py-4 px-4">
                  <div className="text-body-sm font-bold text-text-primary">{finding.title}</div>
                  {finding.dependency_name && (
                    <div className="text-body-xs text-text-primary font-mono mt-1 bg-surface-container px-1 py-0.5 rounded inline-block">{finding.dependency_name}</div>
                  )}
                </td>
                <td className="py-4 px-4">
                  <div className="text-body-sm text-text-secondary">{finding.description}</div>
                </td>
                <td className="py-4 px-4 text-right">
                  <span className="text-body-xs text-text-primary font-semibold">{finding.fix.title}</span>
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
