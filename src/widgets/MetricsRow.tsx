import { ScanResult } from "@/shared/api/types";
import { InfoTooltip } from "@/shared/ui/InfoTooltip";

interface MetricsRowProps {
  summary?: ScanResult["summary"];
}

export function MetricsRow({ summary }: MetricsRowProps) {
  const deps = summary?.total_dependencies ?? 0;
  const vulnerable = summary?.vulnerable_dependencies ?? 0;
  const score = summary?.banking_exposure_score ?? 0;
  const action = summary?.banking_action ?? "track";

  const getRiskLabel = (score: number) => {
    if (score >= 75) return "Critical";
    if (score >= 55) return "High";
    if (score >= 30) return "Moderate";
    return "Low";
  };

  const getRiskColor = (score: number) => {
    if (score >= 75) return "text-severity-critical border-l-severity-critical";
    if (score >= 55) return "text-severity-high border-l-severity-high";
    if (score >= 30) return "text-severity-medium border-l-severity-medium";
    return "text-severity-low border-l-severity-low";
  };
  
  const getActionLabel = (action: string) => {
    switch (action) {
      case "block": return "Block Deployment";
      case "expedite": return "Expedite Fix";
      case "watch": return "Monitor Usage";
      default: return "Track & Accept";
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case "block": return "text-severity-critical border-l-severity-critical";
      case "expedite": return "text-severity-high border-l-severity-high";
      case "watch": return "text-severity-medium border-l-severity-medium";
      default: return "text-severity-low border-l-severity-low";
    }
  };

  const riskTone = getRiskColor(score);
  const actionTone = getActionColor(action);
  const vulnTone = vulnerable > 0 ? "text-severity-high border-l-severity-high" : "text-severity-low border-l-severity-low";

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div className="bg-white rounded-lg border border-border-subtle shadow-sm p-4">
        <div className="flex items-center text-body-xs text-text-muted font-label-caps uppercase tracking-wider mb-1">
          Scanned Packages
          <InfoTooltip text="Total number of dependencies parsed from the manifest files." />
        </div>
        <div className="text-metric-value font-metric-value">{deps}</div>
      </div>
      <div className={`bg-white rounded-lg border border-border-subtle shadow-sm p-4 border-l-4 ${vulnTone}`}>
        <div className="flex items-center text-body-xs text-text-muted font-label-caps uppercase tracking-wider mb-1">
          Vulnerable Packages
          <InfoTooltip text="Number of dependencies with known CVEs or security issues." />
        </div>
        <div className={`text-metric-value font-metric-value ${vulnTone.split(" ")[0]}`}>{vulnerable}</div>
      </div>
      <div className={`bg-white rounded-lg border border-border-subtle shadow-sm p-4 border-l-4 ${riskTone}`}>
        <div className="flex items-center text-body-xs text-text-muted font-label-caps uppercase tracking-wider mb-1">
          Business Risk
          <InfoTooltip text="Overall severity of exposure based on how close vulnerabilities are to critical endpoints." />
        </div>
        <div className={`text-metric-value font-metric-value ${riskTone.split(" ")[0]}`}>
          {getRiskLabel(score)}
        </div>
      </div>
      <div className={`bg-white rounded-lg border border-border-subtle shadow-sm p-4 border-l-4 ${actionTone}`}>
        <div className="flex items-center text-body-xs text-text-muted font-label-caps uppercase tracking-wider mb-1">
          Action Required
          <InfoTooltip text="Recommended action based on the highest risk level detected." />
        </div>
        <div className={`text-headline-sm font-bold mt-2 ${actionTone.split(" ")[0]}`}>
          {getActionLabel(action)}
        </div>
      </div>
    </div>
  );
}
