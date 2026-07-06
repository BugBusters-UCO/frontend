import React from "react";
import { ScanResult, RiskChain } from "@/shared/api/types";
import { InfoTooltip } from "@/shared/ui/InfoTooltip";

interface BusinessImpactPanelProps {
  summary?: ScanResult["summary"];
  chains: RiskChain[];
  capabilities: NonNullable<ScanResult["capability_findings"]>;
}

export function BusinessImpactPanel({
  summary,
  chains,
  capabilities,
}: BusinessImpactPanelProps) {
  const topExposure = chains
    .map((chain) => chain.exposure)
    .filter(Boolean)
    .sort((a, b) => (b?.score || 0) - (a?.score || 0))[0] || null;

  const exposureScore = topExposure?.score ?? summary?.banking_exposure_score ?? 0;
  
  let riskTitle = "Low Business Impact";
  let riskSubtitle = "No immediate threat to critical systems.";
  let riskColor = "text-severity-low";
  let bgRisk = "border-border-subtle";

  if (exposureScore >= 75) {
    riskTitle = "Critical Business Impact";
    riskSubtitle = "Immediate threat to core banking systems or data.";
    riskColor = "text-severity-critical";
    bgRisk = "border-severity-critical bg-severity-critical-bg";
  } else if (exposureScore >= 55) {
    riskTitle = "High Business Impact";
    riskSubtitle = "Significant risk to application integrity or data.";
    riskColor = "text-severity-high";
    bgRisk = "border-severity-high bg-severity-high-bg";
  } else if (exposureScore >= 30) {
    riskTitle = "Moderate Business Impact";
    riskSubtitle = "Potential risk that requires review.";
    riskColor = "text-severity-medium";
    bgRisk = "border-severity-medium bg-severity-medium-bg";
  }

  // Use reasons from top exposure if available, otherwise fallback
  const reasons = topExposure?.reasons || [
    summary?.banking_action === "block" 
      ? "Critical vulnerabilities detected in deployment paths."
      : "No direct exposure detected for critical paths."
  ];

  return (
    <div className={`bg-white rounded-lg border-2 ${bgRisk} shadow-sm p-6`}>
      <div className="flex flex-col md:flex-row gap-8">
        <div className="md:w-1/3 flex flex-col justify-center border-b md:border-b-0 md:border-r border-border-divider pb-6 md:pb-0 md:pr-6">
          <div className="flex items-center mb-2">
            <h2 className="text-section-header font-section-header text-text-primary">
              Business Risk Assessment
            </h2>
            <InfoTooltip text="Evaluates the potential impact of vulnerabilities reaching sensitive banking operations." />
          </div>
          <div className={`text-headline-lg font-headline-lg font-bold ${riskColor} mb-2`}>
            {riskTitle}
          </div>
          <p className="text-body-sm text-text-secondary">
            {riskSubtitle}
          </p>
        </div>
        
        <div className="md:w-2/3 flex flex-col gap-4 justify-center">
          <div>
            <div className="flex items-center mb-3">
              <h3 className="text-body-md font-bold text-text-primary">Key Risk Factors</h3>
              <InfoTooltip text="Primary reasons why this severity level was assigned, focusing on exploit likelihood and structural exposure." />
            </div>
            <ul className="space-y-3">
              {reasons.map((reason, idx) => (
                <li key={idx} className="flex items-start gap-3 text-body-sm text-text-secondary">
                  <span className={`material-symbols-outlined ${riskColor} text-[20px] shrink-0`}>
                    error
                  </span>
                  <span className="leading-snug">{reason}</span>
                </li>
              ))}
            </ul>
          </div>
          
          {capabilities && capabilities.length > 0 && (
            <div className="mt-4 pt-4 border-t border-border-divider">
              <div className="flex items-center mb-2">
                <h3 className="text-body-sm font-bold text-text-primary">Suspicious Package Behaviors Detected</h3>
                <InfoTooltip text="Capabilities like network access or filesystem modifications requested by the dependency that could be malicious." />
              </div>
              <div className="flex flex-wrap gap-2">
                {capabilities.map((cap) => (
                  <span key={cap.id} className="px-2.5 py-1 bg-surface-container-high text-text-secondary rounded text-body-xs font-semibold border border-border-subtle">
                    {cap.capability} (via {cap.dependency_name || 'unknown'})
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
