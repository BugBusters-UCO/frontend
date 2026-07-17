import React, { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { InfoTooltip } from "@/shared/ui/InfoTooltip";
import { CipherScanResult } from "@/shared/api/types";

interface CipherFindingsTableProps {
  findings: NonNullable<CipherScanResult["findings"]>;
}

function severityClass(severity?: string) {
  if (severity === "critical") return "bg-red-100 text-red-800";
  if (severity === "high") return "bg-orange-100 text-orange-800";
  if (severity === "medium") return "bg-yellow-100 text-yellow-800";
  if (severity === "low") return "bg-blue-100 text-blue-800";
  return "bg-surface-container text-text-secondary";
}

export function CipherFindingsTable({ findings }: CipherFindingsTableProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  if (!findings || findings.length === 0) return null;

  return (
    <div className="bg-surface rounded-2xl border border-border-subtle shadow-sm overflow-hidden transition-colors duration-300 mt-6">
      <button 
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-6 py-5 border-b border-border-divider flex justify-between items-center bg-surface-container hover:bg-surface-container-high transition-colors"
      >
        <div className="flex items-center">
          <h2 className="text-section-header font-section-header text-text-primary tracking-tight">
            TLS/Cipher Findings and Fixes
          </h2>
          <div onClick={(e) => e.stopPropagation()}>
            <InfoTooltip text="Raw list of all detected vulnerabilities and configurations that do not meet the banking profile." />
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
                <th className="pb-2 font-medium">Issue</th>
                <th className="pb-2 font-medium">Location</th>
                <th className="pb-2 font-medium">Evidence</th>
                <th className="pb-2 font-medium">Fix</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {findings.map((finding) => (
                <tr key={finding.id} className="border-b border-border-divider last:border-none align-top hover:bg-surface-container-lowest transition-colors">
                  <td className="py-4 pr-4">
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${severityClass(finding.severity)}`}>
                      {finding.severity.toUpperCase()}
                    </span>
                  </td>
                  <td className="py-4 pr-4">
                    <div className="font-medium text-text-primary">{finding.title}</div>
                    <div className="text-xs text-text-muted font-mono mt-1">{finding.rule_id} - {finding.category}</div>
                  </td>
                  <td className="py-4 pr-4 font-mono text-xs text-text-secondary">
                    {finding.file_path}:{finding.line_number || "-"}
                  </td>
                  <td className="py-4 pr-4">
                    <code className="block max-w-[360px] whitespace-pre-wrap break-words bg-surface-container-low px-2 py-1 rounded text-xs text-text-primary">
                      {finding.evidence}
                    </code>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {(finding.affected_protocols || []).map((item) => (
                        <span key={item} className="px-2 py-1 rounded bg-red-100 text-red-800 text-xs font-mono">{item}</span>
                      ))}
                      {(finding.affected_ciphers || []).slice(0, 4).map((item) => (
                        <span key={item} className="px-2 py-1 rounded bg-red-100 text-red-800 text-xs font-mono">{item}</span>
                      ))}
                    </div>
                  </td>
                  <td className="py-4 pr-4">
                    <div className="font-semibold text-text-primary">{finding.remediation?.title}</div>
                    <p className="text-xs text-text-secondary mt-1 max-w-[360px]">{finding.remediation?.description}</p>
                    {finding.remediation?.secure_example && (
                      <code className="block mt-2 text-xs whitespace-pre-wrap break-words bg-surface-container-low px-2 py-1 rounded text-text-primary border border-border-subtle">
                        {finding.remediation.secure_example}
                      </code>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
