import React from "react";
import { ScanResult, RiskChain } from "@/shared/api/types";

interface TrustIntelligencePanelProps {
  summary?: ScanResult["summary"];
  chains: RiskChain[];
  capabilities: NonNullable<ScanResult["capability_findings"]>;
}

export function TrustIntelligencePanel({
  summary,
  chains,
  capabilities,
}: TrustIntelligencePanelProps) {
  const topExposure = chains
    .map((chain) => chain.exposure)
    .filter(Boolean)
    .sort((a, b) => (b?.score || 0) - (a?.score || 0))[0] || null;

  const exposureScore = topExposure?.score ?? summary?.banking_exposure_score ?? 0;
  const trustScore = 100 - exposureScore;
  const reasons = topExposure?.reasons || ["Run a scan to calculate route-level trust exposure."];

  let profileText = "Low Risk Profile";
  let profileSubtext = "Safe for deployment";
  let profileColor = "text-severity-low";

  if (trustScore < 40) {
    profileText = "Critical Risk Profile";
    profileSubtext = "Immediate remediation required";
    profileColor = "text-severity-critical";
  } else if (trustScore < 60) {
    profileText = "High Risk Profile";
    profileSubtext = "Review carefully before deployment";
    profileColor = "text-severity-high";
  } else if (trustScore < 80) {
    profileText = "Moderate Risk Profile";
    profileSubtext = "Requires review before deployment";
    profileColor = "text-severity-medium";
  }

  // Calculate circumference for SVG circle (r=56)
  const circumference = 2 * Math.PI * 56;
  const offset = circumference - (trustScore / 100) * circumference;

  return (
    <div className="bg-white rounded-lg border border-border-subtle shadow-sm p-card-padding">
      <h2 className="text-section-header font-section-header mb-4">
        Dependency Trust Intelligence
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Score */}
        <div className="flex flex-col items-center justify-center border-r border-border-divider pr-6">
          <div className="relative w-32 h-32 flex items-center justify-center">
            <svg className="absolute inset-0 w-full h-full transform -rotate-90">
              <circle
                className="text-surface-container-high"
                cx="64"
                cy="64"
                fill="none"
                r="56"
                stroke="currentColor"
                strokeWidth="8"
              ></circle>
              <circle
                className={profileColor}
                cx="64"
                cy="64"
                fill="none"
                r="56"
                stroke="currentColor"
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                strokeWidth="8"
              ></circle>
            </svg>
            <div className="text-center">
              <div className="text-headline-lg font-headline-lg font-bold">
                {trustScore}
              </div>
              <div className="text-body-xs text-text-muted">Trust Score</div>
            </div>
          </div>
          <div className="mt-4 text-center">
            <div className={`text-body-sm font-semibold ${profileColor}`}>
              {profileText}
            </div>
            <div className="text-body-xs text-text-muted mt-1">
              {profileSubtext}
            </div>
          </div>
        </div>

        {/* Details */}
        <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <div className="text-body-sm font-semibold mb-2">Key Detractors</div>
            <ul className="space-y-2">
              {reasons.slice(0, 3).map((reason, idx) => (
                <li key={idx} className="flex items-start gap-2 text-body-sm">
                  <span className="material-symbols-outlined text-severity-high text-[18px] mt-0.5">
                    warning
                  </span>
                  <span>{reason}</span>
                </li>
              ))}
            </ul>
            <div className="mt-4">
              <div className="text-body-sm font-semibold mb-2">
                Suspicious Capabilities
              </div>
              <div className="flex flex-wrap gap-2">
                {capabilities.slice(0, 4).map((cap) => (
                  <span
                    key={cap.id}
                    className="px-2 py-1 bg-surface-container-high text-text-secondary rounded text-body-xs border border-border-subtle"
                  >
                    {cap.capability}
                  </span>
                ))}
                {capabilities.length === 0 && (
                  <span className="text-body-xs text-text-muted">None found</span>
                )}
              </div>
            </div>
          </div>

          {topExposure && (
            <div className="space-y-3">
              <ScoreBar label="Exploit Likelihood" value={topExposure.exploit_likelihood} invert />
              <ScoreBar label="Static Analysis Path" value={topExposure.static_exploitability} invert />
              <ScoreBar label="Author Reputation" value={100 - topExposure.trust_deficit} />
              <ScoreBar label="Registry Trust" value={100 - topExposure.trust_deficit} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ScoreBar({ label, value, invert = false }: { label: string; value: number; invert?: boolean }) {
  // If invert=true, high value is bad (red)
  // If invert=false, high value is good (green)
  let barColor = "bg-severity-medium";
  
  if (invert) {
    if (value >= 80) barColor = "bg-severity-critical";
    else if (value >= 60) barColor = "bg-severity-high";
    else if (value <= 20) barColor = "bg-severity-low";
  } else {
    if (value >= 80) barColor = "bg-severity-low";
    else if (value <= 40) barColor = "bg-severity-high";
    else if (value <= 20) barColor = "bg-severity-critical";
  }

  let textLabel = "Moderate";
  if (value >= 80) textLabel = "High";
  else if (value <= 20) textLabel = "Low";

  return (
    <div>
      <div className="flex justify-between text-body-xs mb-1">
        <span>{label}</span>
        <span>{textLabel}</span>
      </div>
      <div className="h-1.5 w-full bg-surface-container-high rounded-full overflow-hidden">
        <div className={`h-full ${barColor}`} style={{ width: `${Math.max(0, Math.min(100, value))}%` }}></div>
      </div>
    </div>
  );
}
