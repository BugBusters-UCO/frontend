import React, { useState } from "react";
import { RiskChain } from "@/shared/api/types";
import { ArrowLeftCircle, ArrowRightCircle } from "lucide-react";

interface BlastRadiusMapProps {
  chains: RiskChain[];
}

export function BlastRadiusMap({ chains }: BlastRadiusMapProps) {
  const [selectedChainId, setSelectedChainId] = useState<string | null>(
    chains.length > 0 ? chains[0].id : null
  );

  if (!chains || chains.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-border-subtle shadow-sm p-card-padding">
        <h2 className="text-section-header font-section-header mb-4">
          Blast Radius Map
        </h2>
        <div className="border-2 border-dashed border-border-subtle rounded-lg p-6 flex flex-col items-center justify-center text-center">
          <span className="material-symbols-outlined text-text-muted text-4xl mb-2">
            account_tree
          </span>
          <div className="text-body-sm font-semibold">
            No blast-radius chains yet.
          </div>
          <div className="text-body-xs text-text-muted mt-1 max-w-md">
            Chains appear when a vulnerable dependency connects to sensitive
            banking code paths.
          </div>
        </div>
      </div>
    );
  }

  const selectedChain = chains.find((c) => c.id === selectedChainId) || chains[0];

  return (
    <div className="bg-white rounded-xl border border-[#93c5fd] shadow-[0_4px_24px_rgba(31,111,235,0.08)] p-card-padding overflow-hidden relative">
      {/* Decorative top accent */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-error"></div>
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-section-header font-section-header">
            Blast Radius Map
          </h2>
          <p className="text-body-sm text-text-muted mt-1">
            Connectivity from risky dependency to banking-sensitive code paths.
          </p>
        </div>
        <div className="px-2.5 py-1 bg-surface-container-low border border-border-subtle rounded-md text-body-xs font-semibold">
          {chains.length} chains
        </div>
      </div>

      <div className="flex flex-col xl:flex-row gap-6">
        {/* Chain Selector */}
        <div className="xl:w-[250px] shrink-0">
          <div className="flex items-center gap-2 mb-3">
            <span className="material-symbols-outlined text-text-muted text-[18px]">list_alt</span>
            <div className="text-body-xs font-bold tracking-wider uppercase text-text-secondary">
              Detected Chains
            </div>
          </div>
          <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-2 pb-2">
            {chains.map((chain) => {
              const isSelected = chain.id === selectedChainId;

              let severityBg = "bg-surface-container-high";
              let severityColor = "text-text-primary";
              let severityLabel = chain.severity.toLowerCase();

              if (severityLabel === "critical") {
                severityBg = "bg-severity-critical";
                severityColor = "text-white";
              } else if (severityLabel === "high") {
                severityBg = "bg-severity-high-bg border-[#fca5a5]";
                severityColor = "text-severity-high";
              } else if (severityLabel === "medium") {
                severityBg = "bg-severity-medium-bg border-[#fcd34d]";
                severityColor = "text-severity-medium";
              } else {
                severityBg = "bg-severity-low-bg border-[#86efac]";
                severityColor = "text-severity-low";
              }

              return (
                <div
                  key={chain.id}
                  onClick={() => setSelectedChainId(chain.id)}
                  className={`relative p-3.5 rounded-xl border cursor-pointer transition-all duration-200 overflow-hidden group ${
                    isSelected
                      ? "border-[#93c5fd] bg-[#eff6ff] shadow-[0_2px_8px_rgba(31,111,235,0.08)]"
                      : "border-border-divider bg-surface-container-lowest hover:border-border-subtle hover:bg-white hover:shadow-sm"
                  }`}
                >
                  {/* Left accent bar for selected state */}
                  {isSelected && (
                    <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-primary rounded-l-xl"></div>
                  )}
                  
                  <div className="flex justify-between items-start mb-1.5">
                    <div className={`text-body-sm font-bold truncate pr-2 transition-colors ${isSelected ? "text-primary" : "text-text-primary group-hover:text-primary"}`}>
                      {chain.dependency_name}
                    </div>
                    <div
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${severityBg} ${severityColor} border ${severityLabel === 'critical' ? 'border-transparent' : ''}`}
                    >
                      {chain.severity}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1.5 text-body-xs text-text-muted mb-2.5 font-medium">
                    <span className="material-symbols-outlined text-[14px]">extension</span>
                    {chain.ecosystem}
                  </div>
                  
                  <div className="flex flex-wrap gap-1.5">
                    {chain.sensitive_contexts.slice(0, 2).map((ctx, i) => (
                      <span
                        key={i}
                        className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border ${isSelected ? 'bg-white border-[#bfdbfe] text-primary' : 'bg-surface-container-low border-border-subtle text-text-secondary'}`}
                      >
                        {ctx}
                      </span>
                    ))}
                    {chain.sensitive_contexts.length > 2 && (
                      <span className="text-[10px] text-text-muted font-semibold flex items-center px-1">
                        +{chain.sensitive_contexts.length - 2}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Chain Graph and Details */}
        <div className="flex-1 min-w-0 flex flex-col gap-6">
          <InteractiveTraceGraph trace={selectedChain.trace || []} fix={selectedChain.fix} />
        </div>
      </div>
    </div>
  );
}

function InteractiveTraceGraph({ trace, fix }: { trace: NonNullable<RiskChain["trace"]>, fix?: RiskChain["fix"] }) {
  const [selectedStepIdx, setSelectedStepIdx] = useState(0);

  // If trace changes, reset selected step to 0
  React.useEffect(() => {
    setSelectedStepIdx(0);
  }, [trace]);

  if (trace.length === 0) return null;

  const selectedStep = trace[selectedStepIdx];

  // Map kind to icons and colors
  const getKindConfig = (kind: string) => {
    switch (kind) {
      case "route": return { icon: "input", color: "text-[#1f6feb]", bg: "bg-[#eff6ff]", border: "border-[#93c5fd]" };
      case "manifest": return { icon: "description", color: "text-[#1f6feb]", bg: "bg-[#eff6ff]", border: "border-[#93c5fd]" };
      case "risk": return { icon: "warning", color: "text-[#92400e]", bg: "bg-[#fffbeb]", border: "border-[#fcd34d]" };
      case "import": return { icon: "account_tree", color: "text-[#166534]", bg: "bg-[#f0fdf4]", border: "border-[#86efac]" };
      case "sensitive-use": return { icon: "gpp_maybe", color: "text-[#b42318]", bg: "bg-[#fff5f5]", border: "border-[#fca5a5]" };
      default: return { icon: "code", color: "text-text-secondary", bg: "bg-surface-container-lowest", border: "border-border-subtle" };
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full min-w-0">
      {/* Node Path visualization */}
      <div className="relative w-full overflow-x-auto pb-6 pt-4 px-2">
        <div className="flex items-center w-max min-w-full">
          {trace.map((step, idx) => {
            const config = getKindConfig(step.kind);
            const isSelected = idx === selectedStepIdx;

            // Extract a valid ring color from the border utility for inline style if needed, or use a custom mapped class.
            // Tailwind v4 allows arbitrary values easily but we'll use a safe class structure

            return (
              <React.Fragment key={idx}>
                {/* Node */}
                <div
                  onClick={() => setSelectedStepIdx(idx)}
                  className={`flex flex-col items-center cursor-pointer group w-32 shrink-0 relative`}
                >
                  <div className={`w-14 h-14 rounded-full border-2 flex items-center justify-center mb-3 transition-all duration-200 z-10 
                    ${isSelected
                      ? `shadow-md ring-4 ring-opacity-20 ${config.bg} ${config.border}`
                      : `border-border-subtle bg-white hover:${config.bg} hover:border-border-subtle`}`}
                    style={isSelected ? { outline: `2px solid ${config.color.replace('text-', '')}`, outlineOffset: '2px' } : {}}
                  >
                    <span className={`material-symbols-outlined text-[24px] ${isSelected ? config.color : 'text-text-muted group-hover:' + config.color}`}>
                      {config.icon}
                    </span>
                  </div>

                  <div className={`text-center font-bold text-body-xs px-1 line-clamp-2 ${isSelected ? 'text-text-primary' : 'text-text-muted group-hover:text-text-primary'}`}>
                    {step.label}
                  </div>
                  <div className="text-[10px] uppercase tracking-wider text-text-muted mt-1 bg-surface-container-low px-1.5 py-0.5 rounded">
                    {step.kind}
                  </div>
                </div>

                {/* Connector Line */}
                {idx < trace.length - 1 && (
                  <div className="w-16 h-0.5 bg-border-divider shrink-0 -mt-12 relative flex-1 min-w-[40px]">
                    <div className="absolute top-1/2 right-0 -translate-y-1/2 translate-x-1/2 w-2 h-2 border-t-2 border-r-2 border-border-divider rotate-45"></div>
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Selected Details Panel */}
      <div className="bg-surface-container-lowest border border-border-subtle rounded-lg p-5 shadow-sm transition-all">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="bg-surface-container-high text-text-secondary text-[11px] font-bold px-2 py-0.5 rounded-md border border-border-subtle">
                Step {selectedStep?.step}
              </span>
              <span className="text-body-sm font-bold text-text-primary">{selectedStep?.label}</span>
            </div>
            {selectedStep?.file_path && (
              <div className="text-body-xs font-code-sm text-text-secondary flex items-center gap-1 mt-2">
                <span className="material-symbols-outlined text-[14px]">folder</span>
                {selectedStep?.file_path}
                {selectedStep?.line_number ? <span className="text-primary-container">:{selectedStep?.line_number}</span> : ""}
              </div>
            )}
          </div>
          <div className="flex items-center gap-4">
            <span className={`px-2.5 py-1 text-[10px] uppercase tracking-wider font-bold rounded border ${getKindConfig(selectedStep?.kind).bg} ${getKindConfig(selectedStep?.kind).color} ${getKindConfig(selectedStep?.kind).border}`}>
              {selectedStep?.kind}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSelectedStepIdx(Math.max(0, selectedStepIdx - 1))}
                disabled={selectedStepIdx === 0}
                className="flex items-center gap-1 px-3 py-1.5 rounded-full border border-border-subtle bg-white hover:bg-surface-container-low shadow-sm disabled:opacity-40 disabled:cursor-not-allowed transition-all text-body-xs font-semibold text-text-secondary cursor-pointer"
              >
                <span className="material-symbols-outlined text-[10px]"><ArrowLeftCircle /></span>
                Prev
              </button>
              <button
                onClick={() => setSelectedStepIdx(Math.min(trace.length - 1, selectedStepIdx + 1))}
                disabled={selectedStepIdx === trace.length - 1}
                className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-primary text-white hover:bg-[#195fca] shadow-sm disabled:opacity-40 disabled:bg-border-subtle disabled:text-text-muted disabled:cursor-not-allowed transition-all text-body-xs font-semibold cursor-pointer"
              >
                Next
                <span className="material-symbols-outlined text-[10px]"><ArrowRightCircle /></span>
              </button>
            </div>
          </div>
        </div>

        {selectedStep?.code && (
          <div className="bg-[#0f172a] text-[#d1d5db] font-code-sm text-[13px] leading-relaxed p-4 rounded-lg overflow-x-auto whitespace-pre border border-[#334155] shadow-inner mb-4 relative">
            <div className="absolute top-2 right-2 text-[#475569] text-[10px] uppercase tracking-widest font-bold select-none pointer-events-none">Source Snippet</div>
            {selectedStep?.code}
          </div>
        )}

        {selectedStep?.details && selectedStep?.details.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {selectedStep?.details.map((det, i) => (
              <span key={i} className="text-[11px] bg-white border border-border-subtle text-text-secondary px-2.5 py-1 rounded-md shadow-sm flex items-center gap-1.5 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-border-subtle"></span>
                {det}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Fix Panel */}
      {fix && (
        <div className="border border-[#b7e4c7] rounded-lg p-5 bg-[#effaf3] shadow-sm relative overflow-hidden mt-2">
          <div className="absolute top-0 left-0 w-1 h-full bg-[#176b3a]"></div>
          <div className="flex justify-between items-start mb-3">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[#176b3a] text-xl">build</span>
              <div className="text-body-sm font-bold text-[#176b3a]">
                {fix.title}
              </div>
            </div>
            {fix.auto_remediable ? (
              <span className="px-2 py-1 bg-white text-[#176b3a] border border-[#b7e4c7] text-[10px] font-bold rounded uppercase tracking-wider shadow-sm">
                Auto fix ready
              </span>
            ) : (
              <span className="px-2 py-1 bg-white text-text-secondary border border-border-subtle text-[10px] font-bold rounded uppercase tracking-wider shadow-sm">
                Manual review
              </span>
            )}
          </div>
          <p className="text-body-sm text-[#176b3a] mb-4 opacity-90">
            {fix.description}
          </p>
          {fix.command && (
            <div className="bg-[#0f172a] text-[#86efac] font-code-sm text-[13px] p-3 rounded-md overflow-x-auto whitespace-pre border border-[#176b3a] shadow-inner flex items-center gap-3">
              <span className="material-symbols-outlined text-[#475569] text-[16px] select-none">terminal</span>
              {fix.command}
            </div>
          )}
        </div>
      )}

    </div>
  );
}
