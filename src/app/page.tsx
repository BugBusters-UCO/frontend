"use client";

import React, { useState, useEffect } from "react";
import { BusinessRiskContext, GithubUser, GithubRepository, RiskAssessment, RiskOverview, ScanJob } from "@/shared/api/types";
import { DisclaimerModal } from "@/widgets/DisclaimerModal";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { InfoTooltip } from "@/shared/ui/InfoTooltip";
import { 
  fetchRiskAssessments, 
  fetchScanJobs, 
  fetchConfigScanJobs, 
  fetchSecretScanJobs, 
  fetchCipherScanJobs, 
  fetchRiskOverview 
} from "@/shared/api/client";

const DEFAULT_BUSINESS_CONTEXT: BusinessRiskContext = {
  assetCriticality: 5,
  dataSensitivity: 5,
  businessImpact: 5,
  internetExposure: 5,
  complianceRequirement: 5,
  exploitWindow: 5,
};

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export default function DashboardPage() {
  const queryClient = useQueryClient();

  const { data: riskAssessments = [] } = useQuery({
    queryKey: ["risk-assessments"],
    queryFn: fetchRiskAssessments,
    refetchInterval: 12000,
  });

  const { data: jobs = [] } = useQuery({
    queryKey: ["all-jobs"],
    queryFn: async () => {
      const [depJobs, configJobs, secretJobs, cipherJobs] = await Promise.all([
        fetchScanJobs(), fetchConfigScanJobs(), fetchSecretScanJobs(), fetchCipherScanJobs()
      ]);
      return [...(depJobs || []), ...(configJobs || []), ...(secretJobs || []), ...(cipherJobs || [])];
    },
  });

  const { data: riskOverview } = useQuery({
    queryKey: ["risk-overview"],
    queryFn: () => fetchRiskOverview({}),
    refetchInterval: 12000,
  });

  const latestRiskScore = riskOverview?.risk?.final_risk_score;

  return (
    <div className="max-w-[1280px] mx-auto flex flex-col gap-section-gap">
      <DisclaimerModal />
      <div>
        <h1 className="font-headline-lg text-headline-lg text-text-primary mb-1">Platform Overview</h1>
        <p className="font-body-sm text-body-sm text-text-secondary">Comprehensive security scanning for your codebase.</p>
      </div>

      {/* Top Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-element-gap">
        <div className="bg-surface-container-lowest p-card-padding rounded-lg border border-border-divider shadow-sm flex flex-col gap-2">
          <p className="font-body-sm text-body-sm text-text-muted font-medium">Total Scans</p>
          <div className="flex items-end gap-2">
            <p className="font-metric-value text-metric-value text-text-primary">{jobs.length}</p>
          </div>
        </div>
        <div className="bg-surface-container-lowest p-card-padding rounded-lg border border-[#ffd6a5] bg-[#fff8eb] shadow-sm flex flex-col gap-2">
          <p className="font-body-sm text-body-sm text-[#8a5200] font-medium">Open Findings</p>
          <div className="flex items-end gap-2">
            <p className="font-metric-value text-metric-value text-[#8a5200]">-</p>
          </div>
        </div>
        <div className="bg-surface-container-lowest p-card-padding rounded-lg border border-[#f3b4b4] shadow-sm flex flex-col gap-2">
          <p className="font-body-sm text-body-sm text-text-muted font-medium">Critical Issues</p>
          <div className="flex items-end gap-2">
            <p className="font-metric-value text-metric-value text-severity-critical">-</p>
          </div>
        </div>
        <div className="bg-surface-container-lowest p-card-padding rounded-lg border border-[#b7e4c7] shadow-sm flex flex-col gap-2">
          <p className="font-body-sm text-body-sm text-text-muted font-medium">Overall Security Score</p>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full border-4 border-tertiary flex items-center justify-center">
              <p className="font-bold text-lg text-tertiary">{latestRiskScore ?? "B+"}</p>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
