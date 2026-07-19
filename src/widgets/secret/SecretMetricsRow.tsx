import React from "react";
import { InfoTooltip } from "@/shared/ui/InfoTooltip";

interface SecretMetricsRowProps {
  summary: any;
  risk: any;
  ciPolicy: any;
}

export function SecretMetricsRow({ summary, risk, ciPolicy }: SecretMetricsRowProps) {
  const riskScore = summary?.risk_score || 0;
  const secretsFound = summary?.total_findings || 0;
  const uniqueSecrets = summary?.unique_secrets || 0;
  const exposurePaths = summary?.exposure_paths || 0;

  const getRiskLabel = (score: number) => {
    if (score >= 75) return "Critical";
    if (score >= 50) return "High";
    if (score >= 25) return "Moderate";
    return "Low";
  };

  const getRiskColor = (score: number) => {
    if (score >= 75) return "text-severity-critical";
    if (score >= 50) return "text-severity-high";
    if (score >= 25) return "text-severity-medium";
    return "text-severity-low";
  };

  const getAction = () => {
    if (ciPolicy?.label === "Blocked") return { label: "Block Deployment", color: "text-severity-critical" };
    if (risk?.rotation_required) return { label: "Rotate Immediately", color: "text-severity-critical" };
    if (exposurePaths > 0) return { label: "Review & Rotate", color: "text-severity-high" };
    return { label: "Monitor", color: "text-severity-low" };
  };

  const action = getAction();
  const riskTone = getRiskColor(riskScore);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div className="bg-surface transition-colors duration-300 rounded-2xl border border-border-subtle shadow-sm p-4">
        <div className="flex items-center text-body-xs text-text-muted font-label-caps uppercase tracking-wider mb-1">
          Total Findings
          <InfoTooltip text="Total number of hardcoded secrets, keys, and tokens found across the codebase." />
        </div>
        <div className="text-metric-value font-metric-value">{secretsFound}</div>
        <p className="text-xs text-text-muted mt-1">{uniqueSecrets} unique fingerprints</p>
      </div>

      <div className={`bg-surface transition-colors duration-300 rounded-2xl border border-border-subtle shadow-sm p-4 ${uniqueSecrets > 0 ? 'text-severity-high' : 'text-severity-low'}`}>
        <div className="flex items-center text-body-xs text-text-muted font-label-caps uppercase tracking-wider mb-1">
          Exposure Paths
          <InfoTooltip text="Confirmed paths where a leaked secret grants access to a sensitive asset or service." />
        </div>
        <div className="text-metric-value font-metric-value">{exposurePaths}</div>
        <p className="text-xs text-text-muted mt-1">attack vectors</p>
      </div>

      <div className={`bg-surface transition-colors duration-300 rounded-2xl border border-border-subtle shadow-sm p-4 ${riskTone}`}>
        <div className="flex items-center text-body-xs text-text-muted font-label-caps uppercase tracking-wider mb-1">
          Business Risk
          <InfoTooltip text="Overall severity based on the types of secrets exposed and their potential blast radius." />
        </div>
        <div className={`text-metric-value font-metric-value ${riskTone.split(" ")[0]}`}>
          {getRiskLabel(riskScore)}
        </div>
      </div>

      <div className={`bg-surface transition-colors duration-300 rounded-2xl border border-border-subtle shadow-sm p-4 ${action.color}`}>
        <div className="flex items-center text-body-xs text-text-muted font-label-caps uppercase tracking-wider mb-1">
          Action Required
          <InfoTooltip text="Recommended action based on rotation requirements and CI policy." />
        </div>
        <div className={`text-headline-sm font-bold mt-2 ${action.color.split(" ")[0]}`}>
          {action.label}
        </div>
        <p className="text-xs text-text-muted mt-1">Policy: {ciPolicy?.label}</p>
      </div>
    </div>
  );
}
