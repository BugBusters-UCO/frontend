import React from "react";
import { ScanResult } from "@/shared/api/types";

interface FindingsTableProps {
  findings: ScanResult["findings"];
}

export function FindingsTable({ findings }: FindingsTableProps) {
  if (!findings || findings.length === 0) return null;

  return (
    <div className="bg-white rounded-lg border border-border-subtle shadow-sm overflow-hidden mt-6">
      <div className="px-card-padding py-4 border-b border-border-divider flex justify-between items-center bg-surface-bright">
        <h2 className="text-section-header font-section-header">
          Vulnerabilities & Fixes
        </h2>
        <button className="flex items-center gap-2 text-body-sm text-text-secondary hover:text-text-primary border border-border-subtle rounded-md px-3 py-1.5 bg-white">
          <span className="material-symbols-outlined text-[18px]">
            filter_list
          </span>{" "}
          Filter
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[800px]">
          <thead>
            <tr className="border-b border-border-divider bg-surface-container-lowest">
              <th className="py-3 px-4 font-table-header text-table-header text-text-muted uppercase tracking-wider">
                Package
              </th>
              <th className="py-3 px-4 font-table-header text-table-header text-text-muted uppercase tracking-wider">
                Severity
              </th>
              <th className="py-3 px-4 font-table-header text-table-header text-text-muted uppercase tracking-wider">
                Issue
              </th>
              <th className="py-3 px-4 font-table-header text-table-header text-text-muted uppercase tracking-wider">
                Introduced By
              </th>
              <th className="py-3 px-4 font-table-header text-table-header text-text-muted uppercase tracking-wider text-right">
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
                  <span className="px-2 py-1 bg-severity-critical text-white rounded-full text-body-xs font-semibold">
                    Critical
                  </span>
                );
              } else if (severityLower === "high") {
                sevBadge = (
                  <span className="px-2 py-1 bg-severity-high-bg text-severity-high rounded-full text-body-xs font-semibold border border-[#fca5a5]">
                    High
                  </span>
                );
              } else if (severityLower === "medium") {
                sevBadge = (
                  <span className="px-2 py-1 bg-severity-medium-bg text-severity-medium rounded-full text-body-xs font-semibold border border-[#fcd34d]">
                    Medium
                  </span>
                );
              } else {
                sevBadge = (
                  <span className="px-2 py-1 bg-severity-low-bg text-severity-low rounded-full text-body-xs font-semibold border border-[#86efac]">
                    {f.severity}
                  </span>
                );
              }

              return (
                <tr
                  key={`${f.id}-${i}`}
                  className={`${
                    isLast ? "" : "border-b border-border-divider"
                  } hover:bg-surface-container-low transition-colors group`}
                >
                  <td className="py-3 px-4 font-code-sm">
                    {f.package_name}@{f.installed_version}
                  </td>
                  <td className="py-3 px-4">{sevBadge}</td>
                  <td className="py-3 px-4">{f.summary}</td>
                  <td className="py-3 px-4 text-text-secondary">
                    via <code>{f.ecosystem}</code>
                  </td>
                  <td className="py-3 px-4 text-right">
                    {f.fix.auto_remediable ? (
                      <button className="bg-white border border-border-subtle text-text-primary px-3 py-1.5 rounded-md hover:bg-surface-container-low transition-colors text-body-sm">
                        {f.fix.title}
                      </button>
                    ) : (
                      <span className="text-text-muted italic text-body-sm">
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
