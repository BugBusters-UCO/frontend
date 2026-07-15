import React from "react";
import { ScanResult } from "@/shared/api/types";

interface FindingsTableProps {
  findings: ScanResult["findings"];
}

export function FindingsTable({ findings }: FindingsTableProps) {
  if (!findings || findings.length === 0) return null;

  return (
    <div className="bg-surface rounded-2xl border border-border-subtle shadow-sm overflow-hidden mt-8 transition-colors duration-300">
      <div className="px-6 py-5 border-b border-border-divider flex justify-between items-center bg-surface-container">
        <h2 className="text-section-header font-section-header text-text-primary tracking-tight">
          Vulnerabilities & Fixes
        </h2>
      </div>
      <div className="max-h-[500px] overflow-auto">
        <table className="w-full text-left border-collapse min-w-[800px]">
          <thead className="sticky top-0 z-10 bg-surface-container/90 backdrop-blur-sm shadow-[0_1px_0_var(--color-border-divider)]">
            <tr>
              <th className="py-4 px-6 font-table-header text-table-header text-text-muted uppercase tracking-wider">
                Package
              </th>
              <th className="py-4 px-6 font-table-header text-table-header text-text-muted uppercase tracking-wider">
                Severity
              </th>
              <th className="py-4 px-6 font-table-header text-table-header text-text-muted uppercase tracking-wider">
                Issue
              </th>
              <th className="py-4 px-6 font-table-header text-table-header text-text-muted uppercase tracking-wider">
                Introduced By
              </th>
              <th className="py-4 px-6 font-table-header text-table-header text-text-muted uppercase tracking-wider text-right">
                Recommended Fix
              </th>
            </tr>
          </thead>
          <tbody className="text-body-sm">
            {findings.map((f, i) => {
              const isLast = i === findings.length - 1;
              const severityLower = f.severity.toLowerCase();

              let sevBadge = null;
              if (severityLower === "critical") {
                sevBadge = (
                  <span className="px-2.5 py-1 bg-severity-critical text-white rounded-full text-body-xs font-semibold shadow-sm">
                    Critical
                  </span>
                );
              } else if (severityLower === "high") {
                sevBadge = (
                  <span className="px-2.5 py-1 bg-severity-high-bg text-severity-high rounded-full text-body-xs font-semibold border border-[#fca5a5]/30">
                    High
                  </span>
                );
              } else if (severityLower === "medium") {
                sevBadge = (
                  <span className="px-2.5 py-1 bg-severity-medium-bg text-severity-medium rounded-full text-body-xs font-semibold border border-[#fcd34d]/30">
                    Medium
                  </span>
                );
              } else {
                sevBadge = (
                  <span className="px-2.5 py-1 bg-severity-low-bg text-severity-low rounded-full text-body-xs font-semibold border border-[#86efac]/30">
                    {f.severity}
                  </span>
                );
              }

              return (
                <tr
                  key={`${f.id}-${i}`}
                  className={`${
                    isLast ? "" : "border-b border-border-divider"
                  } hover:bg-surface-container-high transition-colors group`}
                >
                  <td className="py-4 px-6 font-code-sm text-text-primary font-medium">
                    {f.package_name}@{f.installed_version}
                  </td>
                  <td className="py-4 px-6">{sevBadge}</td>
                  <td className="py-4 px-6 text-text-secondary">{f.summary}</td>
                  <td className="py-4 px-6 text-text-secondary">
                    via <code className="bg-surface-dim px-1.5 py-0.5 rounded text-text-primary">{f.ecosystem}</code>
                  </td>
                  <td className="py-4 px-6 text-right">
                    {f.fix.auto_remediable ? (
                      <button className="bg-surface border border-border-subtle text-text-primary px-4 py-2 rounded-2xl shadow-sm hover:bg-surface-container hover:shadow transition-all text-body-sm font-medium focus:ring-2 focus:ring-primary/50">
                        {f.fix.title}
                      </button>
                    ) : (
                      <span className="text-text-muted italic text-body-sm bg-surface-dim px-3 py-1.5 rounded-2xl border border-border-divider">
                        Manual fix required
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
