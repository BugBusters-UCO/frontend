import { ScanResult } from "@/shared/api/types";

interface MetricsRowProps {
  summary?: ScanResult["summary"];
}

export function MetricsRow({ summary }: MetricsRowProps) {
  const manifests = summary?.total_manifests ?? 0;
  const deps = summary?.total_dependencies ?? 0;
  const score = summary?.banking_exposure_score ?? 0;
  const chains = summary?.risk_chains ?? 0;

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-severity-critical border-l-severity-critical";
    if (score >= 60) return "text-severity-high border-l-severity-high";
    if (score >= 40) return "text-severity-medium border-l-severity-medium";
    return "text-severity-low border-l-severity-low";
  };

  const scoreTone = getScoreColor(score);
  const chainsTone = chains > 0 ? "text-severity-critical border-l-severity-critical" : "text-severity-low border-l-severity-low";

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div className="bg-white rounded-lg border border-border-subtle shadow-sm p-4">
        <div className="text-body-xs text-text-muted font-label-caps uppercase tracking-wider mb-1">
          Manifests Parsed
        </div>
        <div className="text-metric-value font-metric-value">{manifests}</div>
      </div>
      <div className="bg-white rounded-lg border border-border-subtle shadow-sm p-4">
        <div className="text-body-xs text-text-muted font-label-caps uppercase tracking-wider mb-1">
          Total Dependencies
        </div>
        <div className="text-metric-value font-metric-value">{deps}</div>
      </div>
      <div className={`bg-white rounded-lg border border-border-subtle shadow-sm p-4 border-l-4 ${scoreTone}`}>
        <div className="text-body-xs text-text-muted font-label-caps uppercase tracking-wider mb-1">
          Exposure Score
        </div>
        <div className={`text-metric-value font-metric-value ${scoreTone.split(" ")[0]}`}>
          {score}
        </div>
      </div>
      <div className={`bg-white rounded-lg border border-border-subtle shadow-sm p-4 border-l-4 ${chainsTone}`}>
        <div className="text-body-xs text-text-muted font-label-caps uppercase tracking-wider mb-1">
          Risk Chains Found
        </div>
        <div className={`text-metric-value font-metric-value ${chainsTone.split(" ")[0]}`}>
          {chains}
        </div>
      </div>
    </div>
  );
}
