import React from "react";
import { InfoTooltip } from "@/shared/ui/InfoTooltip";
import { AiExplanation } from "@/shared/ui/AiExplanation";

interface ConfigBusinessImpactPanelProps {
  jobId: string;
  summary: any;
  attackPaths: any[];
}

export function ConfigBusinessImpactPanel({ jobId, summary, attackPaths }: ConfigBusinessImpactPanelProps) {
  if (!summary) return null;

  const getRiskColor = (score: number) => {
    if (score >= 75) return "text-severity-critical";
    if (score >= 50) return "text-severity-high";
    if (score >= 25) return "text-severity-medium";
    return "text-severity-low";
  };

  const getRiskBg = (score: number) => {
    if (score >= 75) return "border-severity-critical bg-red-50";
    if (score >= 50) return "border-severity-high bg-orange-50";
    if (score >= 25) return "border-severity-medium bg-yellow-50";
    return "border-severity-low bg-blue-50";
  };

  const getRiskTitle = (score: number) => {
    if (score >= 75) return "Critical Infrastructure Risk";
    if (score >= 50) return "High Misconfiguration Risk";
    if (score >= 25) return "Moderate Risk";
    return "Low Risk or Clean";
  };

  const score = summary.risk_score || 0;
  const riskColor = getRiskColor(score);
  const bgRisk = getRiskBg(score);
  const riskTitle = getRiskTitle(score);

  const criticalFindings = summary.findings_by_severity?.critical || 0;
  const highFindings = summary.findings_by_severity?.high || 0;

  const reasons = [];
  if (criticalFindings > 0) reasons.push(`${criticalFindings} Critical misconfigurations detected.`);
  if (highFindings > 0) reasons.push(`${highFindings} High severity misconfigurations detected.`);
  if (attackPaths?.length > 0) reasons.push(`${attackPaths.length} viable attack paths discovered from exposed configurations.`);

  // Prepare data payload for AI
  const businessRiskData = {
    riskTitle,
    riskScore: score,
    totalFindings: summary.total_findings || (criticalFindings + highFindings),
    criticalFindings,
    highFindings
  };

  const keyRiskFactorsData = {
    reasons,
    attackPathCount: attackPaths?.length || 0
  };

  return (
    <div className={`bg-surface transition-colors duration-300 rounded-2xl border-2 ${bgRisk} shadow-sm p-6`}>
      <div className="flex flex-col md:flex-row gap-8">
        <div className="md:w-1/3 flex flex-col justify-center border-b md:border-b-0 md:border-r border-border-divider pb-6 md:pb-0 md:pr-6">
          <div className="flex items-center mb-2">
            <h2 className="text-section-header font-section-header text-text-primary">
              Business Risk Assessment
            </h2>
            <InfoTooltip text="Evaluates the potential impact of exposed infrastructure misconfigurations." />
          </div>
          <div className={`text-headline-lg font-headline-lg font-bold ${riskColor} mb-2`}>
            {riskTitle}
          </div>
          <p className="text-body-sm text-text-secondary mb-4">
            Based on severity of findings and potential attack paths.
          </p>
          
          <AiExplanation 
            jobId={jobId} 
            sectionId="config-business-risk" 
            data={businessRiskData}
            title="What this means"
            className="mt-2"
          />
        </div>
        
        <div className="md:w-2/3 flex flex-col gap-4 justify-center">
          <div>
            <div className="flex items-center mb-3">
              <h3 className="text-body-md font-bold text-text-primary">Key Risk Factors</h3>
              <InfoTooltip text="Primary reasons why this severity level was assigned." />
            </div>
            <ul className="space-y-3">
              {reasons.map((reason, idx) => (
                <li key={idx} className="flex items-start gap-3 text-body-sm text-text-secondary">
                  <span className={`material-symbols-outlined text-[18px] mt-0.5 ${(idx === 0 && criticalFindings > 0) ? 'text-severity-critical' : 'text-severity-high'}`}>
                    warning
                  </span>
                  <span>{reason}</span>
                </li>
              ))}
              {reasons.length === 0 && (
                <li className="text-body-sm text-text-muted italic">No major risk factors detected.</li>
              )}
            </ul>
            
            {reasons.length > 0 && (
              <AiExplanation 
                jobId={jobId} 
                sectionId="config-key-risk-factors" 
                data={keyRiskFactorsData}
                title="Why these matter"
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
