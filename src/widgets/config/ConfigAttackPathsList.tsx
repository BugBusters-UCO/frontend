import React, { useState } from "react";
import { InfoTooltip } from "@/shared/ui/InfoTooltip";

interface ConfigAttackPathsListProps {
  attackPaths: any[];
}

export function ConfigAttackPathsList({ attackPaths }: ConfigAttackPathsListProps) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(0);

  if (!attackPaths || attackPaths.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-xl border border-border-subtle shadow-sm p-card-padding mt-6">
      <div className="flex items-center mb-4">
        <h2 className="text-section-header font-section-header">
          Attack Path Details
        </h2>
        <InfoTooltip text="Step-by-step breakdown of how an attacker could exploit these misconfigurations." />
      </div>

      <div className="flex flex-col gap-3">
        {attackPaths.map((path: any, index: number) => {
          const isExpanded = expandedIndex === index;
          const severityColor = path.severity === "critical" ? "text-severity-critical" : path.severity === "high" ? "text-severity-high" : path.severity === "medium" ? "text-severity-medium" : "text-severity-low";
          
          return (
            <div key={path.id || index} className="border border-border-divider rounded-lg overflow-hidden transition-all shadow-sm">
              <div 
                className={`p-4 flex items-center justify-between cursor-pointer hover:bg-surface-container-lowest transition-colors ${isExpanded ? 'bg-surface-container-lowest border-b border-border-divider' : 'bg-white'}`}
                onClick={() => setExpandedIndex(isExpanded ? null : index)}
              >
                <div className="flex items-center gap-3">
                  <span className={`material-symbols-outlined text-[20px] ${severityColor}`}>
                    warning
                  </span>
                  <div>
                    <h3 className="text-body-sm font-bold text-text-primary">
                      {path.title}
                    </h3>
                    <p className="text-body-xs text-text-secondary mt-0.5 line-clamp-1">
                      {path.attack_story}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-text-muted">
                  <span className="text-xs font-semibold px-2 py-1 bg-surface-container rounded-md">
                    {path.steps?.length || 0} steps
                  </span>
                  <span className={`material-symbols-outlined transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
                    expand_more
                  </span>
                </div>
              </div>

              {isExpanded && (
                <div className="p-4 bg-surface-container-lowest flex flex-col gap-4">
                  <p className="text-sm text-text-primary italic mb-2 border-l-2 border-border-divider pl-3">
                    {path.attack_story}
                  </p>
                  
                  <div className="relative border-l-2 border-red-200 ml-3 pl-6 pb-2 space-y-6">
                    {path.steps?.map((step: any, stepIdx: number) => (
                      <div key={stepIdx} className="relative">
                        <div className="absolute -left-[33px] top-1 w-4 h-4 rounded-full bg-white border-2 border-red-400 z-10 shadow-sm"></div>
                        <div className="bg-white border border-border-divider rounded-lg p-3 shadow-sm">
                          <div className="flex items-start justify-between mb-1.5">
                            <span className="text-xs font-bold text-red-500 uppercase tracking-widest">
                              Step {stepIdx + 1}
                            </span>
                            {step.stage && (
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-surface-container text-text-secondary">
                                {step.stage}
                              </span>
                            )}
                          </div>
                          <h4 className="text-sm font-bold text-text-primary mb-1">
                            {step.title}
                          </h4>
                          {step.file_path && (
                            <div className="text-xs font-mono text-text-secondary bg-surface-container-lowest px-2 py-1 rounded inline-block mt-2">
                              {step.file_path}{step.line_number ? `:${step.line_number}` : ""}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {path.remediation && (
                    <div className="mt-2 bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="material-symbols-outlined text-green-600 text-[18px]">build</span>
                        <h4 className="text-sm font-bold text-green-900">Remediation</h4>
                      </div>
                      <p className="text-sm text-green-800">
                        {path.remediation.description || path.remediation}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
