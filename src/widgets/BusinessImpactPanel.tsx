import React from "react";
import { ScanResult, RiskChain } from "@/shared/api/types";
import { InfoTooltip } from "@/shared/ui/InfoTooltip";
import { AiExplanation } from "@/shared/ui/AiExplanation";

interface BusinessImpactPanelProps {
  jobId: string;
  summary?: ScanResult["summary"];
  chains: RiskChain[];
  capabilities: NonNullable<ScanResult["capability_findings"]>;
}

export function BusinessImpactPanel({
  jobId,
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

  // Prepare data payload for AI
  const businessRiskData = {
    riskTitle,
    riskScore: exposureScore,
    bankingAction: summary?.banking_action,
    topExposure: topExposure?.score
  };

  const keyRiskFactorsData = {
    reasons,
    capabilitiesCount: capabilities?.length || 0
  };

  const groupedCapabilities = React.useMemo(() => {
    if (!capabilities) return {};
    return capabilities.reduce((acc, cap) => {
      if (!acc[cap.capability]) {
        acc[cap.capability] = { count: 0, deps: new Set<string>() };
      }
      acc[cap.capability].count += 1;
      if (cap.dependency_name && cap.dependency_name !== 'unknown') {
        acc[cap.capability].deps.add(cap.dependency_name);
      }
      return acc;
    }, {} as Record<string, { count: number, deps: Set<string> }>);
  }, [capabilities]);

  return (
    <div className={`bg-surface transition-colors duration-300 rounded-2xl border-2 ${bgRisk} shadow-sm p-6`}>
      <div className="flex flex-col @md:flex-row gap-8">
        <div className="@md:w-1/3 flex flex-col justify-center border-b @md:border-b-0 @md:border-r border-border-divider pb-6 @md:pb-0 @md:pr-6">
          <div className="flex items-center mb-2">
            <h2 className="text-section-header font-section-header text-text-primary">
              Business Risk Assessment
            </h2>
            <InfoTooltip text="Evaluates the potential impact of vulnerabilities reaching sensitive banking operations." />
          </div>
          <div className={`text-headline-lg font-headline-lg font-bold ${riskColor} mb-2`}>
            {riskTitle}
          </div>
          <p className="text-body-sm text-text-secondary mb-4">
            {riskSubtitle}
          </p>
          
          <AiExplanation 
            jobId={jobId} 
            sectionId="dependency-business-risk" 
            data={businessRiskData}
            title="What this means"
            className="mt-2"
          />
        </div>
        
        <div className="@md:w-2/3 flex flex-col gap-4 justify-center">
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
            
            {reasons.length > 0 && (
              <AiExplanation 
                jobId={jobId} 
                sectionId="dependency-key-risk-factors" 
                data={keyRiskFactorsData}
                title="Why these matter"
              />
            )}
          </div>
          
          {capabilities && capabilities.length > 0 && (
            <div className="mt-4 pt-4 border-t border-border-divider">
              <div className="flex items-center mb-3">
                <h3 className="text-body-sm font-bold text-text-primary">Suspicious Package Behaviors Detected</h3>
                <InfoTooltip text="Capabilities like network access or filesystem modifications requested by the dependency that could be malicious." />
              </div>
              <div className="flex flex-col gap-2">
                {Object.entries(groupedCapabilities).map(([capKey, data]) => {
                  const depsArray = Array.from(data.deps);
                  const depsText = depsArray.length > 0
                    ? `via ${depsArray.slice(0, 3).join(", ")}${depsArray.length > 3 ? ' and others' : ''}`
                    : '';
                    
                  return (
                    <div key={capKey} className="flex justify-between items-center bg-surface-container-lowest rounded-lg p-3 border border-border-subtle">
                      <div className="flex flex-col">
                        <span className="text-body-sm font-semibold text-text-primary capitalize">{capKey.replace(/-/g, ' ')}</span>
                        {depsText && <span className="text-xs text-text-muted mt-0.5">{depsText}</span>}
                      </div>
                      <span className="bg-severity-high/10 text-severity-high px-2 py-1 rounded text-xs font-bold shrink-0">
                        {data.count} found
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
