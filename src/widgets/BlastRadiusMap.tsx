import React, { useState } from "react";
import { RiskChain } from "@/shared/api/types";

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
          Dependency blast radius map
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
    <div className="bg-white rounded-lg border border-border-subtle shadow-sm p-card-padding overflow-hidden">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-section-header font-section-header">
            Dependency blast radius map
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
          <div className="text-body-xs font-semibold tracking-wider uppercase text-text-muted mb-3">
            Chain Selector
          </div>
          <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
            {chains.map((chain) => {
              const isSelected = chain.id === selectedChainId;
              
              let severityBg = "bg-surface-container-high";
              let severityColor = "text-text-primary";
              let severityLabel = chain.severity.toLowerCase();

              if (severityLabel === "critical") {
                severityBg = "bg-severity-critical";
                severityColor = "text-white";
              } else if (severityLabel === "high") {
                severityBg = "bg-severity-high-bg";
                severityColor = "text-severity-high";
              } else if (severityLabel === "medium") {
                severityBg = "bg-severity-medium-bg";
                severityColor = "text-severity-medium";
              }

              return (
                <div
                  key={chain.id}
                  onClick={() => setSelectedChainId(chain.id)}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    isSelected
                      ? "border-primary-container bg-white shadow-sm"
                      : "border-transparent bg-surface-container-lowest hover:border-border-subtle"
                  }`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <div className="text-body-sm font-semibold truncate pr-2">
                      {chain.dependency_name}
                    </div>
                    <div
                      className={`px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${severityBg} ${severityColor}`}
                    >
                      {chain.severity}
                    </div>
                  </div>
                  <div className="text-body-xs text-text-muted mb-2">
                    {chain.ecosystem}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {chain.sensitive_contexts.slice(0, 2).map((ctx, i) => (
                      <span
                        key={i}
                        className="px-1.5 py-0.5 bg-error-container text-on-error-container rounded text-[10px] border border-[#ffb4ab]"
                      >
                        {ctx}
                      </span>
                    ))}
                    {chain.sensitive_contexts.length > 2 && (
                      <span className="text-[10px] text-text-muted">
                        +{chain.sensitive_contexts.length - 2}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Chain Details */}
        <div className="flex-1 min-w-0 flex flex-col gap-6">
          <TraceFlow trace={selectedChain.trace || []} />
          <TraceTable trace={selectedChain.trace || []} />
          
          {selectedChain.fix && (
            <div className="border border-border-subtle rounded-lg p-4 bg-surface-container-lowest">
              <div className="flex justify-between items-start mb-2">
                <div className="text-body-sm font-semibold text-text-primary">
                  {selectedChain.fix.title}
                </div>
                {selectedChain.fix.auto_remediable ? (
                  <span className="px-2 py-1 bg-severity-low-bg text-severity-low text-[10px] font-semibold rounded uppercase tracking-wider">
                    Auto fix ready
                  </span>
                ) : (
                  <span className="px-2 py-1 bg-surface-container-high text-text-secondary text-[10px] font-semibold rounded uppercase tracking-wider">
                    Manual review
                  </span>
                )}
              </div>
              <p className="text-body-xs text-text-secondary mb-3">
                {selectedChain.fix.description}
              </p>
              {selectedChain.fix.command && (
                <div className="bg-[#0f172a] text-[#d1d5db] font-code-sm text-[12px] p-2.5 rounded-md overflow-x-auto whitespace-pre">
                  {selectedChain.fix.command}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TraceFlow({ trace }: { trace: NonNullable<RiskChain["trace"]> }) {
  const steps = {
    route: trace.filter((t) => t.kind === "route"),
    manifest: trace.filter((t) => t.kind === "manifest"),
    risk: trace.filter((t) => t.kind === "risk"),
    import: trace.filter((t) => t.kind === "import"),
    sensitiveUse: trace.filter((t) => t.kind === "sensitive-use"),
  };

  return (
    <div className="hidden xl:flex items-stretch gap-2 w-full overflow-x-auto pb-2">
      <TraceColumn title="1. Route entry" accent="blue" items={steps.route} />
      <FlowArrow />
      <TraceColumn title="2. Declared" accent="blue" items={steps.manifest} />
      <FlowArrow />
      <TraceColumn title="3. Risk" accent="amber" items={steps.risk} />
      <FlowArrow />
      <TraceColumn title="4. Imported" accent="green" items={steps.import} />
      <FlowArrow />
      <TraceColumn title="5. Sensitive use" accent="red" items={steps.sensitiveUse} />
    </div>
  );
}

function TraceColumn({
  title,
  accent,
  items,
}: {
  title: string;
  accent: "blue" | "amber" | "red" | "green";
  items: NonNullable<RiskChain["trace"]>;
}) {
  let bgClass = "bg-surface-container-lowest";
  let borderClass = "border-border-subtle";

  if (accent === "blue") {
    bgClass = "bg-[#eff6ff]";
    borderClass = "border-[#93c5fd]";
  } else if (accent === "amber") {
    bgClass = "bg-[#fffbeb]";
    borderClass = "border-[#fcd34d]";
  } else if (accent === "red") {
    bgClass = "bg-[#fff5f5]";
    borderClass = "border-[#fca5a5]";
  } else if (accent === "green") {
    bgClass = "bg-[#f0fdf4]";
    borderClass = "border-[#86efac]";
  }

  return (
    <div
      className={`flex-1 flex flex-col min-w-[160px] min-h-[190px] border rounded-lg p-3 ${bgClass} ${borderClass}`}
    >
      <div className="text-[10px] font-bold uppercase tracking-wider text-text-secondary mb-3">
        {title}
      </div>
      <div className="flex-1 flex flex-col gap-2">
        {items.length === 0 ? (
          <div className="text-body-xs text-text-muted italic my-auto text-center">
            No steps
          </div>
        ) : (
          items.slice(0, 3).map((item, idx) => (
            <div key={idx} className="bg-white rounded border border-border-subtle p-2 shadow-sm">
              <div className="text-body-xs font-semibold text-text-primary break-words mb-1">
                {item.label}
              </div>
              {item.file_path && (
                <div className="text-[10px] text-text-muted font-code-sm truncate mb-1">
                  {item.file_path.split("/").pop()}
                  {item.line_number ? `:${item.line_number}` : ""}
                </div>
              )}
              {item.code && (
                <div className="bg-[#0f172a] text-[#d1d5db] font-code-sm text-[10px] p-1.5 rounded overflow-x-auto whitespace-pre mt-1 opacity-90">
                  {item.code.length > 40 ? item.code.substring(0, 40) + "..." : item.code}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function FlowArrow() {
  return (
    <div className="flex items-center justify-center text-border-subtle">
      <span className="material-symbols-outlined text-[20px]">
        arrow_right_alt
      </span>
    </div>
  );
}

function TraceTable({ trace }: { trace: NonNullable<RiskChain["trace"]> }) {
  if (trace.length === 0) return null;

  return (
    <div className="border border-border-subtle rounded-lg overflow-hidden max-h-[360px] overflow-y-auto">
      <div className="bg-surface-container-lowest px-4 py-2 border-b border-border-subtle text-body-xs font-semibold tracking-wider uppercase text-text-muted sticky top-0 z-10">
        Sequence Trace Table
      </div>
      <div className="divide-y divide-border-divider">
        {trace.map((step, idx) => (
          <div key={idx} className="p-4 hover:bg-surface-container-low transition-colors">
            <div className="flex items-start gap-3">
              <div className="shrink-0 bg-surface-container-high text-text-secondary text-[11px] font-semibold px-2 py-0.5 rounded-md mt-0.5 border border-border-subtle">
                Step {step.step}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center flex-wrap gap-2 mb-1">
                  <span className="text-body-sm font-semibold">{step.label}</span>
                  <span className="text-[10px] bg-[#eef1f5] text-[#44505f] px-1.5 py-0.5 rounded uppercase tracking-wider font-semibold">
                    {step.kind}
                  </span>
                </div>
                {step.file_path && (
                  <div className="text-body-xs font-code-sm text-text-muted mb-2">
                    {step.file_path}
                    {step.line_number ? `:${step.line_number}` : ""}
                  </div>
                )}
                {step.code && (
                  <div className="bg-[#0f172a] text-[#d1d5db] font-code-sm text-[12px] p-2 rounded overflow-x-auto whitespace-pre mb-2">
                    {step.code}
                  </div>
                )}
                {step.details && step.details.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {step.details.slice(0, 6).map((det, i) => (
                      <span
                        key={i}
                        className="text-[11px] bg-white border border-border-subtle text-text-secondary px-1.5 py-0.5 rounded-md"
                      >
                        {det}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
