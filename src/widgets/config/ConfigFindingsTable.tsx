import React, { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { InfoTooltip } from "@/shared/ui/InfoTooltip";
import { ConfigScanResult } from "@/shared/api/types";

interface ConfigFindingsTableProps {
  findings: NonNullable<ConfigScanResult["findings"]>;
}

export function ConfigFindingsTable({ findings }: ConfigFindingsTableProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  if (!findings || findings.length === 0) return null;

  return (
    <div className="bg-surface rounded-2xl border border-border-subtle shadow-sm overflow-hidden transition-colors duration-300">
      <button 
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-6 py-5 border-b border-border-divider flex justify-between items-center bg-surface-container hover:bg-surface-container-high transition-colors"
      >
        <div className="flex items-center">
          <h2 className="text-section-header font-section-header text-text-primary tracking-tight">
            Misconfigurations
          </h2>
          <div onClick={(e) => e.stopPropagation()}>
            <InfoTooltip text="Raw list of all detected infrastructure misconfigurations." />
          </div>
        </div>
        <span className="text-text-primary">
          {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </span>
      </button>

      {isExpanded && (
        <div className="overflow-x-auto animate-in slide-in-from-top-2 fade-in duration-200 p-6">
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
              {findings.map((finding: any, idx: number) => (
                <tr key={idx} className="border-b border-border-divider last:border-none hover:bg-surface-container-lowest transition-colors">
                  <td className="py-3 pr-4">
                    <span className={`inline-flex items-center px-2 py-1 rounded text-body-xs font-semibold uppercase ${
                      finding.severity === "critical" ? "bg-severity-critical-bg text-severity-critical border border-severity-critical/20" : 
                      finding.severity === "high" ? "bg-severity-high-bg text-severity-high border border-severity-high/20" : 
                      finding.severity === "medium" ? "bg-severity-medium-bg text-severity-medium border border-severity-medium/20" : 
                      "bg-severity-low-bg text-severity-low border border-severity-low/20"
                    }`}>
                      {finding.severity}
                    </span>
                  </td>
                  <td className="py-3 pr-4 font-code-sm text-xs text-text-secondary">{finding.file_path}:{finding.line_number}</td>
                  <td className="py-3 pr-4 font-medium text-text-primary">{finding.title}</td>
                  <td className="py-3 pr-4 text-text-secondary">{finding.category}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
