import React, { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { InfoTooltip } from "@/shared/ui/InfoTooltip";
import { SecretScanResult } from "@/shared/api/types";

interface SecretFindingsTableProps {
  findings: NonNullable<SecretScanResult["findings"]>;
  onRequestRotation: (findingId: string) => void;
  isRotating: boolean;
  rotatingFindingId: string | null;
}

function severityClass(severity?: string) {
  if (severity === "critical") return "bg-red-100 text-red-800";
  if (severity === "high") return "bg-orange-100 text-orange-800";
  if (severity === "medium") return "bg-yellow-100 text-yellow-800";
  return "bg-blue-100 text-blue-800";
}

export function SecretFindingsTable({ findings, onRequestRotation, isRotating, rotatingFindingId }: SecretFindingsTableProps) {
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
            Secrets and Remediation
          </h2>
          <div onClick={(e) => e.stopPropagation()}>
            <InfoTooltip text="Raw list of all detected secrets, their location, extracted evidence, and remediation steps." />
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
                <th className="pb-2 font-medium">Secret Type</th>
                <th className="pb-2 font-medium">Location</th>
                <th className="pb-2 font-medium">Evidence</th>
                <th className="pb-2 font-medium">Confidence</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {findings.map((finding: any) => (
                <tr key={finding.id} className="border-b border-border-divider last:border-none align-top hover:bg-surface-container-lowest transition-colors">
                  <td className="py-4 pr-4">
                    <span className={`px-2 py-1 rounded text-xs font-semibold uppercase ${severityClass(finding.severity)}`}>
                      {finding.severity}
                    </span>
                  </td>
                  <td className="py-4 pr-4">
                    <div className="font-medium text-text-primary">{finding.title}</div>
                    <div className="text-xs text-text-muted font-mono mt-1">{finding.secret_type}</div>
                  </td>
                  <td className="py-4 pr-4 font-mono text-xs text-text-secondary">
                    {finding.file_path}:{finding.line_number || "-"}
                  </td>
                  <td className="py-4 pr-4">
                    <code className="block max-w-[420px] whitespace-pre-wrap break-words bg-surface-container-low px-2 py-1 rounded text-xs text-text-primary">
                      {finding.evidence}
                    </code>
                    <div className="text-xs text-text-muted mt-2">
                      <span className="font-semibold">{finding.remediation?.title}:</span> {finding.remediation?.description}
                    </div>
                    {finding.remediation?.rotation_required && (
                      <div className="mt-2">
                        <button 
                          onClick={() => onRequestRotation(finding.id)}
                          disabled={isRotating && rotatingFindingId === finding.id}
                          className="px-3 py-1 bg-primary text-white rounded text-xs hover:bg-primary/90 disabled:opacity-50 transition-colors"
                        >
                          {(isRotating && rotatingFindingId === finding.id) ? "Requesting..." : "Rotate Secret"}
                        </button>
                      </div>
                    )}
                  </td>
                  <td className="py-4 pr-4">
                    <span className="font-semibold text-text-primary">{Math.round((finding.confidence || 0) * 100)}%</span>
                    <div className="text-xs text-text-muted mt-1">{finding.validation_status}</div>
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
