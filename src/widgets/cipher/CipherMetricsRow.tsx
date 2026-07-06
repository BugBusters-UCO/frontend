import React from "react";
import { InfoTooltip } from "@/shared/ui/InfoTooltip";

interface CipherMetricsRowProps {
  summary: any;
  ciPolicy: any;
}

export function CipherMetricsRow({ summary, ciPolicy }: CipherMetricsRowProps) {
  const riskScore = summary?.risk_score || 0;
  const totalFindings = summary?.total_findings || 0;
  const attackPaths = summary?.attack_paths || 0;
  const endpointPolicies = summary?.endpoint_policies || 0;

  const getRiskLabel = (score: number) => {
    if (score >= 75) return "Critical";
    if (score >= 50) return "High";
    if (score >= 25) return "Moderate";
    return "Low";
  };

  const getRiskColor = (score: number) => {
    if (score >= 75) return "text-severity-critical border-l-severity-critical";
    if (score >= 50) return "text-severity-high border-l-severity-high";
    if (score >= 25) return "text-severity-medium border-l-severity-medium";
    return "text-severity-low border-l-severity-low";
  };

  const getAction = () => {
    if (ciPolicy.label === "Blocked") return { label: "Remediate & Unblock", color: "text-severity-critical border-l-severity-critical" };
    if (attackPaths > 0) return { label: "Review Attack Paths", color: "text-severity-high border-l-severity-high" };
    if (totalFindings > 0) return { label: "Fix Weak Ciphers", color: "text-severity-medium border-l-severity-medium" };
    return { label: "Monitor", color: "text-severity-low border-l-severity-low" };
  };

  const action = getAction();
  const riskTone = getRiskColor(riskScore);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div className="bg-white rounded-lg border border-border-subtle shadow-sm p-4">
        <div className="flex items-center text-body-xs text-text-muted font-label-caps uppercase tracking-wider mb-1">
          TLS Posture
          <InfoTooltip text="Total endpoints with detected TLS policy/configuration issues." />
        </div>
        <div className="text-metric-value font-metric-value">{endpointPolicies}</div>
        <p className="text-xs text-text-muted mt-1">{totalFindings} findings detected</p>
      </div>

      <div className={`bg-white rounded-lg border border-border-subtle shadow-sm p-4 border-l-4 ${attackPaths > 0 ? 'border-l-severity-high text-severity-high' : 'border-l-severity-low text-severity-low'}`}>
        <div className="flex items-center text-body-xs text-text-muted font-label-caps uppercase tracking-wider mb-1">
          Attack Paths
          <InfoTooltip text="Chains where weak protocol choices can lead to banking traffic exposure." />
        </div>
        <div className="text-metric-value font-metric-value">{attackPaths}</div>
        <p className="text-xs text-text-muted mt-1">exposed routes</p>
      </div>

      <div className={`bg-white rounded-lg border border-border-subtle shadow-sm p-4 border-l-4 ${riskTone}`}>
        <div className="flex items-center text-body-xs text-text-muted font-label-caps uppercase tracking-wider mb-1">
          Infrastructure Risk
          <InfoTooltip text="Overall severity based on cryptography and TLS findings." />
        </div>
        <div className={`text-metric-value font-metric-value ${riskTone.split(" ")[0]}`}>
          {getRiskLabel(riskScore)}
        </div>
      </div>

      <div className={`bg-white rounded-lg border border-border-subtle shadow-sm p-4 border-l-4 ${action.color}`}>
        <div className="flex items-center text-body-xs text-text-muted font-label-caps uppercase tracking-wider mb-1">
          Action Required
          <InfoTooltip text="Recommended action based on the identified issues and CI policy." />
        </div>
        <div className={`text-headline-sm font-bold mt-2 ${action.color.split(" ")[0]}`}>
          {action.label}
        </div>
        <p className="text-xs text-text-muted mt-1">Gate: {ciPolicy.label}</p>
      </div>
    </div>
  );
}
