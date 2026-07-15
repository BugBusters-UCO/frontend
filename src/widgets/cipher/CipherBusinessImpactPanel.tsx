import React from "react";
import { InfoTooltip } from "@/shared/ui/InfoTooltip";

interface CipherBusinessImpactPanelProps {
  summary: any;
  ciPolicy: any;
  attackPaths: any[];
}

export function CipherBusinessImpactPanel({ summary, ciPolicy, attackPaths }: CipherBusinessImpactPanelProps) {
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
    if (score >= 75) return "Critical Protocol Risk";
    if (score >= 50) return "High Cryptographic Risk";
    if (score >= 25) return "Moderate Cipher Risk";
    return "Low Risk or Compliant";
  };

  const score = summary.risk_score || 0;
  const riskColor = getRiskColor(score);
  const bgRisk = getRiskBg(score);
  const riskTitle = getRiskTitle(score);

  const reasons = [];
  if (ciPolicy.label === "Blocked") reasons.push(`Deployment is BLOCKED by CI policy due to weak cipher or TLS settings.`);
  if (attackPaths?.length > 0) reasons.push(`${attackPaths.length} attack paths found exposing banking traffic.`);
  if (summary.total_findings > 0) reasons.push(`${summary.total_findings} weak cryptographic findings detected.`);

  return (
    <div className={`bg-surface transition-colors duration-300 rounded-2xl border-2 ${bgRisk} shadow-sm p-6`}>
      <div className="flex flex-col md:flex-row gap-8">
        <div className="md:w-1/3 flex flex-col justify-center border-b md:border-b-0 md:border-r border-border-divider pb-6 md:pb-0 md:pr-6">
          <div className="flex items-center mb-2">
            <h2 className="text-section-header font-section-header text-text-primary">
              Business Risk Assessment
            </h2>
            <InfoTooltip text="Evaluates the potential impact of cryptographic weaknesses on banking operations." />
          </div>
          <div className={`text-headline-lg font-headline-lg font-bold ${riskColor} mb-2`}>
            {riskTitle}
          </div>
          <p className="text-body-sm text-text-secondary">
            Based on detected TLS posture and compliance mapping.
          </p>
        </div>
        
        <div className="md:w-2/3 flex flex-col gap-4 justify-center">
          <div>
            <div className="flex items-center mb-3">
              <h3 className="text-body-md font-bold text-text-primary">Key Risk Factors</h3>
              <InfoTooltip text="Primary reasons contributing to the TLS/cipher risk posture." />
            </div>
            <ul className="space-y-3">
              {reasons.map((reason, idx) => (
                <li key={idx} className="flex items-start gap-3 text-body-sm text-text-secondary">
                  <span className={`material-symbols-outlined text-[18px] mt-0.5 ${(idx === 0 && ciPolicy.label === "Blocked") ? 'text-severity-critical' : 'text-severity-high'}`}>
                    warning
                  </span>
                  <span>{reason}</span>
                </li>
              ))}
              {reasons.length === 0 && (
                <li className="text-body-sm text-text-muted italic">No major TLS risk factors detected.</li>
              )}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
