import React from "react";
import { InfoTooltip } from "@/shared/ui/InfoTooltip";
import { AiExplanation } from "@/shared/ui/AiExplanation";

interface SecretBusinessImpactPanelProps {
  jobId: string;
  summary: any;
  risk: any;
  ciPolicy: any;
}

export function SecretBusinessImpactPanel({ jobId, summary, risk, ciPolicy }: SecretBusinessImpactPanelProps) {
  if (!risk) return null;

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
    if (score >= 75) return "Critical Secret Exposure";
    if (score >= 50) return "High Risk Secrets Detected";
    if (score >= 25) return "Moderate Secret Risk";
    return "Low Risk or Clean";
  };

  const score = summary?.risk_score || 0;
  const riskColor = getRiskColor(score);
  const bgRisk = getRiskBg(score);
  const riskTitle = getRiskTitle(score);

  const reasons = [
    ciPolicy.detail,
    ...(risk.reasons || [])
  ].filter(Boolean);

  // Prepare data payload for AI
  const businessRiskData = {
    riskTitle,
    riskScore: score,
    ciPolicyStatus: ciPolicy.label,
    rotationRequired: risk.rotation_required
  };

  const keyRiskFactorsData = {
    reasons,
    exposedSecretTypes: risk.exposed_secret_types
  };

  return (
    <div className={`bg-surface transition-colors duration-300 rounded-2xl border-2 ${bgRisk} shadow-sm p-6`}>
      <div className="flex flex-col @md:flex-row gap-8">
        <div className="@md:w-1/3 flex flex-col justify-center border-b @md:border-b-0 @md:border-r border-border-divider pb-6 @md:pb-0 @md:pr-6">
          <div className="flex items-center mb-2">
            <h2 className="text-section-header font-section-header text-text-primary">
              Business Risk Assessment
            </h2>
            <InfoTooltip text="Evaluates the potential impact of exposed secrets reaching external actors." />
          </div>
          <div className={`text-headline-lg font-headline-lg font-bold ${riskColor} mb-2`}>
            {riskTitle}
          </div>
          <p className="text-body-sm text-text-secondary mb-4">
            Based on blast radius and exposed credential types.
          </p>
          
          <AiExplanation 
            jobId={jobId} 
            sectionId="secret-business-risk" 
            data={businessRiskData}
            title="What this means"
            className="mt-2"
          />
        </div>
        
        <div className="@md:w-2/3 flex flex-col gap-4 justify-center">
          <div>
            <div className="flex items-center mb-3">
              <h3 className="text-body-md font-bold text-text-primary">Key Risk Factors</h3>
              <InfoTooltip text="Primary reasons why this severity level was assigned." />
            </div>
            <ul className="space-y-3">
              {reasons.map((reason, idx) => (
                <li key={idx} className="flex items-start gap-3 text-body-sm text-text-secondary">
                  <span className={`material-symbols-outlined text-[18px] mt-0.5 ${idx === 0 && ciPolicy.label === 'Blocked' ? 'text-severity-critical' : 'text-severity-high'}`}>
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
                sectionId="secret-key-risk-factors" 
                data={keyRiskFactorsData}
                title="Why these matter"
              />
            )}
          </div>
          
          <div className="mt-4 pt-4 border-t border-border-divider">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center mb-2">
                  <h3 className="text-body-sm font-bold text-text-primary">Exposed Credential Types</h3>
                  <InfoTooltip text="The categories of secrets found in the codebase." />
                </div>
                <div className="flex flex-wrap gap-2">
                  {(risk.exposed_secret_types || []).slice(0, 6).map((type: string) => (
                    <span key={type} className="px-2.5 py-1 bg-surface transition-colors duration-300 text-text-secondary rounded text-body-xs font-semibold border border-border-subtle shadow-sm">
                      {type}
                    </span>
                  ))}
                  {!(risk.exposed_secret_types?.length) && <span className="text-xs text-text-muted">None</span>}
                </div>
              </div>
              
              <div className="text-right">
                <span className={`px-3 py-1.5 rounded-full text-xs font-bold ${risk.rotation_required ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"}`}>
                  {risk.rotation_required ? "Rotation Required" : "No Rotation Required"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
