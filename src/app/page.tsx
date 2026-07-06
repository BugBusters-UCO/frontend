"use client";

import React, { useState, useEffect } from "react";
import { BusinessRiskContext, GithubUser, GithubRepository, RiskAssessment, RiskOverview, ScanJob } from "@/shared/api/types";
import {
  getGithubConnectUrl,
  fetchGithubUser,
  fetchGithubRepos,
  startGithubScan,
  uploadZipScan,
  fetchScanJobs,
  startConfigGithubScan,
  uploadConfigZipScan,
  fetchConfigScanJobs,
  startSecretGithubScan,
  uploadSecretZipScan,
  fetchSecretScanJobs,
  startCipherGithubScan,
  uploadCipherZipScan,
  fetchCipherScanJobs,
  fetchRiskOverview,
  createRiskAssessment,
  fetchRiskAssessments,
  generateRiskAssessmentRemedies,
} from "@/shared/api/client";
import { ScanConfig } from "@/widgets/ScanConfig";
import { RecentJobs } from "@/widgets/RecentJobs";
import { ScanConfigSkeleton } from "@/widgets/Skeleton";
import { DisclaimerModal } from "@/widgets/DisclaimerModal";
import Link from "next/link";
import { getCookie, setCookie, deleteCookie } from "cookies-next";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { InfoTooltip } from "@/shared/ui/InfoTooltip";

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
  const [selectedRepo, setSelectedRepo] = useState<string>("");
  const [isConnectingGithub, setIsConnectingGithub] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [activeScans, setActiveScans] = useState<ScanJob[]>([]);
  const [activeRiskAssessment, setActiveRiskAssessment] = useState<RiskAssessment | null>(null);
  const [githubSession, setGithubSession] = useState<string | null>(null);
  const [scanOptions, setScanOptions] = useState({ includeDev: true, useOsv: true, failOn: "high", includeLow: true });
  const [selectedRiskSource, setSelectedRiskSource] = useState<string | null>(null);
  const [businessContext, setBusinessContext] = useState<BusinessRiskContext>(DEFAULT_BUSINESS_CONTEXT);

  const { data: githubData, isLoading: isLoadingGithub } = useQuery({
    queryKey: ["githubData", githubSession],
    queryFn: async () => {
      const [userData, repoData] = await Promise.all([
        fetchGithubUser(githubSession!),
        fetchGithubRepos(githubSession!)
      ]);
      return { user: userData.user, repos: repoData.repositories };
    },
    enabled: !!githubSession,
  });
  
  const githubUser = (githubData?.user as GithubUser) || null;
  const repos = (githubData?.repos as GithubRepository[]) || [];

  const { data: jobs = [], isLoading: isLoadingJobs } = useQuery({
    queryKey: ["all-jobs", githubSession],
    queryFn: async () => {
      const [depJobs, configJobs, secretJobs, cipherJobs] = await Promise.all([
        fetchScanJobs(), fetchConfigScanJobs(), fetchSecretScanJobs(), fetchCipherScanJobs()
      ]);
      return [...(depJobs || []), ...(configJobs || []), ...(secretJobs || []), ...(cipherJobs || [])]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    },
    enabled: !!githubSession,
  });

  const { data: riskOverview, isLoading: isLoadingRisk } = useQuery({
    queryKey: ["risk-overview", selectedRiskSource, businessContext],
    queryFn: () => fetchRiskOverview({
      sourceLabel: selectedRiskSource,
      businessContext,
    }),
    refetchInterval: 12000,
  });

  const { data: riskAssessments = [] } = useQuery({
    queryKey: ["risk-assessments"],
    queryFn: fetchRiskAssessments,
    refetchInterval: (query) => {
      const active = query.state.data?.some((item) => ["waiting", "running"].includes(item.status));
      return active ? 4000 : false;
    },
  });

  const latestAssessment = activeRiskAssessment
    ? riskAssessments.find((item) => item.id === activeRiskAssessment.id) || activeRiskAssessment
    : riskAssessments[0] || null;
  const latestRiskScore = latestAssessment?.status === "completed"
    ? latestAssessment.result?.risk?.final_risk_score
    : riskOverview?.risk?.final_risk_score;

  useEffect(() => {
    // Check if auth successful (from query params)
    const urlParams = new URLSearchParams(window.location.search);
    const sessionFromUrl = urlParams.get("githubSession");
    const errorFromUrl = urlParams.get("githubError");
    
    let currentSession = getCookie("bugbusters_github_session") as string | undefined;

    if (sessionFromUrl) {
      currentSession = sessionFromUrl;
      setCookie("bugbusters_github_session", sessionFromUrl, { maxAge: 60 * 60 * 24 * 7 }); // 7 days
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (errorFromUrl) {
      window.setTimeout(() => setScanError(errorFromUrl), 0);
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    if (currentSession) {
      window.setTimeout(() => setGithubSession(currentSession), 0);
    }
  }, []);

  const handleConnectGithub = () => {
    setIsConnectingGithub(true);
    setScanError(null);
    window.location.href = getGithubConnectUrl();
  };

  const handleDisconnectGithub = () => {
    deleteCookie("bugbusters_github_session");
    setGithubSession(null);
    setSelectedRepo("");
    
    // Also remove from URL if present
    const url = new URL(window.location.href);
    if (url.searchParams.has("githubSession")) {
      url.searchParams.delete("githubSession");
      window.history.replaceState({}, document.title, url.pathname + url.search);
    }
  };

  const handleStartGithubScan = async () => {
    if (!selectedRepo) {
      setScanError("Please select a repository first.");
      return;
    }
    if (!githubUser) {
      setScanError("Please connect to GitHub first.");
      return;
    }
    const activeGithubSession = githubSession || (getCookie("bugbusters_github_session") as string | undefined) || null;
    if (!githubSession) {
      setGithubSession(activeGithubSession);
    }

    const repo = repos.find(r => r.fullName === selectedRepo);
    if (!repo) {
      setScanError("Selected repository not found.");
      return;
    }

    setScanError(null);
    setIsScanning(true);
    try {
      const [depJob, configJob, secretJob, cipherJob] = await Promise.all([
        startGithubScan(selectedRepo, repo.cloneUrl, activeGithubSession || "", scanOptions),
        startConfigGithubScan(selectedRepo, repo.cloneUrl, activeGithubSession || "", scanOptions),
        startSecretGithubScan(selectedRepo, repo.cloneUrl, activeGithubSession || "", scanOptions),
        startCipherGithubScan(selectedRepo, repo.cloneUrl, activeGithubSession || "", scanOptions)
      ]);
      setActiveScans([depJob, configJob, secretJob, cipherJob]);
      const assessment = await createRiskAssessment({
        sourceType: "github",
        sourceLabel: selectedRepo,
        scanJobIds: [depJob.id, configJob.id, secretJob.id, cipherJob.id],
        businessContext,
      });
      setActiveRiskAssessment(assessment);
      queryClient.invalidateQueries({ queryKey: ["risk-assessments"] });
      setIsScanning(false);
    } catch (err: unknown) {
      setScanError(errorMessage(err, "Failed to start scans"));
      setIsScanning(false);
    }
  };

  const handleUploadZip = async (file: File) => {
    setScanError(null);
    setIsScanning(true);
    try {
      const [depJob, configJob, secretJob, cipherJob] = await Promise.all([
        uploadZipScan(file, scanOptions),
        uploadConfigZipScan(file, scanOptions),
        uploadSecretZipScan(file, scanOptions),
        uploadCipherZipScan(file, scanOptions)
      ]);
      setActiveScans([depJob, configJob, secretJob, cipherJob]);
      const sourceLabel = file.name.replace(/\.(zip|tar|tgz|gz)$/i, "") || file.name;
      const assessment = await createRiskAssessment({
        sourceType: "zip",
        sourceLabel,
        scanJobIds: [depJob.id, configJob.id, secretJob.id, cipherJob.id],
        businessContext,
      });
      setActiveRiskAssessment(assessment);
      queryClient.invalidateQueries({ queryKey: ["risk-assessments"] });
      setIsScanning(false);
    } catch (err: unknown) {
      setScanError(errorMessage(err, "Failed to upload and scan"));
      setIsScanning(false);
    }
  };

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

      <UnifiedRiskDashboard
        overview={riskOverview}
        isLoading={isLoadingRisk}
        selectedSource={selectedRiskSource}
        onSourceChange={setSelectedRiskSource}
        businessContext={businessContext}
        setBusinessContext={setBusinessContext}
        latestAssessment={latestAssessment}
        onAssessmentUpdated={(assessment) => {
          setActiveRiskAssessment(assessment);
          queryClient.invalidateQueries({ queryKey: ["risk-assessments"] });
        }}
      />

      {/* Configuration & Jobs Area */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-element-gap">
        <div className="flex flex-col gap-element-gap">
          {activeScans.length > 0 && (
            <div className="bg-white rounded-lg border border-border-subtle shadow-sm p-card-padding">
              <h2 className="text-section-header font-section-header mb-4">Active Scans</h2>
              <div className="space-y-3">
                {activeScans.map((scan) => {
                  const scannerRoute = scan.scannerType === "config" ? "config-scanner" : scan.scannerType === "secret" ? "secret-scanner" : scan.scannerType === "cipher" ? "cipher-scanner" : "dependency-scanner";
                  const scanTypeName = scan.scannerType === "config" ? "Config Scan" : scan.scannerType === "secret" ? "Secret Scan" : scan.scannerType === "cipher" ? "Cipher Scan" : "Dependency Scan";
                  const icon = scan.scannerType === "config" ? "settings_input_component" : scan.scannerType === "secret" ? "vpn_key" : scan.scannerType === "cipher" ? "encrypted" : "account_tree";
                  
                  return (
                    <div key={scan.id} className="flex items-center justify-between p-3 border border-border-divider rounded-lg bg-surface-container-lowest">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary-container/10 flex items-center justify-center">
                          <span className="material-symbols-outlined text-primary-container text-[18px]">{icon}</span>
                        </div>
                        <div>
                          <div className="text-body-sm font-semibold">{scanTypeName}</div>
                          <div className="text-body-xs text-text-muted mt-0.5">ID: {scan.id.split('-')[0]}...</div>
                        </div>
                      </div>
                      <Link
                        href={`/${scannerRoute}/${scan.id}`}
                        className="px-4 py-1.5 bg-primary text-white rounded-md text-sm font-medium hover:bg-surface-tint transition-colors shadow-sm"
                      >
                        View Live Results
                      </Link>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          
          {isLoadingGithub ? (
            <ScanConfigSkeleton />
          ) : (
            <ScanConfig
              githubUser={githubUser}
              repos={repos}
              selectedRepo={selectedRepo}
              setSelectedRepo={setSelectedRepo}
              onConnectGithub={handleConnectGithub}
              onDisconnectGithub={handleDisconnectGithub}
              isConnectingGithub={isConnectingGithub}
              onStartScan={handleStartGithubScan}
              onUploadZip={handleUploadZip}
              isScanning={isScanning}
              error={scanError}
              scanOptions={scanOptions}
              setScanOptions={setScanOptions}
            />
          )}
        </div>
        <div className="flex flex-col">
          <RecentJobs jobs={jobs} isLoading={isLoadingJobs} />
        </div>
      </div>
    </div>
  );
}

function UnifiedRiskDashboard({
  overview,
  isLoading,
  selectedSource,
  onSourceChange,
  businessContext,
  setBusinessContext,
  latestAssessment,
  onAssessmentUpdated,
}: {
  overview?: RiskOverview;
  isLoading: boolean;
  selectedSource: string | null;
  onSourceChange: (source: string | null) => void;
  businessContext: BusinessRiskContext;
  setBusinessContext: React.Dispatch<React.SetStateAction<BusinessRiskContext>>;
  latestAssessment?: RiskAssessment | null;
  onAssessmentUpdated: (assessment: RiskAssessment) => void;
}) {
  const risk = latestAssessment?.status === "completed" && latestAssessment.result?.risk
    ? latestAssessment.result.risk
    : overview?.risk;
  const businessInputMap = Object.fromEntries((risk?.business_inputs || []).map((item) => [item.key, item]));
  const groups = overview?.groups || [];

  const [isGeneratingRemedies, setIsGeneratingRemedies] = useState(false);
  const [remedyError, setRemedyError] = useState<string | null>(null);
  const aiRemedies = latestAssessment?.result?.aiRemedies || [];
  const aiTokenUsage = latestAssessment?.result?.aiTokenUsage || null;

  const handleGenerateRemedies = async () => {
    if (!latestAssessment || latestAssessment.status !== "completed") return;
    setIsGeneratingRemedies(true);
    setRemedyError(null);
    try {
      const updated = await generateRiskAssessmentRemedies(latestAssessment.id, { limit: 3 });
      onAssessmentUpdated(updated);
    } catch (error) {
      setRemedyError(error instanceof Error ? error.message : "Failed to generate AI remedies");
    } finally {
      setIsGeneratingRemedies(false);
    }
  };

  return (
    <section className="bg-white rounded-lg border border-border-subtle shadow-sm p-card-padding">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div>
          <h2 className="text-section-header font-section-header flex items-center gap-2">
            Unified Banking Risk
            <InfoTooltip text="Combines raw output from dependency, config, secret, and cipher scanners. Final score is 70% technical scanner risk and 30% admin business risk by default." />
          </h2>
          <p className="text-sm text-text-secondary mt-1">
            Risk engine keeps scanner evidence technical, then applies bank business context for prioritization.
          </p>
        </div>
        <div className="min-w-[260px]">
          <label className="text-xs font-semibold text-text-muted">Project / source</label>
          <select
            value={selectedSource || overview?.selectedSourceLabel || ""}
            onChange={(event) => onSourceChange(event.target.value || null)}
            className="mt-2 w-full rounded-lg border border-border-divider px-3 py-2 outline-none focus:border-primary"
          >
            {!groups.length && <option value="">No completed scans</option>}
            {groups.map((group) => (
              <option key={`${group.sourceType}:${group.sourceLabel}`} value={group.sourceLabel}>
                {group.sourceLabel}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-4 rounded-lg border border-border-divider bg-surface-container-low p-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-text-primary">AI remediation advisor</p>
          <p className="text-xs text-text-muted">
            OpenAI is never called during automatic scoring. Click after a completed risk score to send only sanitized top finding metadata.
          </p>
        </div>
        <button
          type="button"
          onClick={handleGenerateRemedies}
          disabled={!latestAssessment || latestAssessment.status !== "completed" || isGeneratingRemedies}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {isGeneratingRemedies ? "Generating..." : aiRemedies.length ? "Regenerate AI remedies" : "Get AI remedies"}
        </button>
      </div>
      {remedyError && <div className="mt-2 rounded border border-red-200 bg-red-50 p-2 text-sm text-red-700">{remedyError}</div>}

      {latestAssessment && (
        <div className="mt-4 rounded-lg border border-border-divider bg-white p-3">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-text-primary">Automatic risk assessment</p>
              <p className="mt-1 text-xs text-text-muted">
                {latestAssessment.status === "completed"
                  ? "Risk engine finished after all selected scanner jobs completed."
                  : latestAssessment.status === "failed"
                    ? latestAssessment.error || "Risk engine could not calculate this assessment."
                    : latestAssessment.status === "cancelled"
                      ? latestAssessment.error || "Risk analysis was skipped because the selected scan was stopped or cancelled."
                      : "Waiting for selected scanner jobs to finish, then risk engine will run once."}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded px-2 py-1 text-xs font-semibold ${assessmentBadge(latestAssessment.status)}`}>
                {latestAssessment.status}
              </span>
              {latestAssessment.result?.risk?.final_risk_score !== undefined && (
                <span className="rounded border border-border-divider px-2 py-1 text-xs font-semibold text-text-primary">
                  final score {latestAssessment.result.risk.final_risk_score}
                </span>
              )}
              <Link
                href={`/risk-reports/${latestAssessment.id}`}
                className="rounded bg-primary px-2 py-1 text-xs font-semibold text-white"
              >
                Open report
              </Link>
              <span className="font-mono text-xs text-text-muted">{latestAssessment.id.slice(0, 8)}</span>
            </div>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="mt-5 rounded-lg border border-border-divider p-5 text-sm text-text-muted">Calculating unified risk...</div>
      ) : !risk ? (
        <div className="mt-5 rounded-lg border border-dashed border-border-divider p-5 text-sm text-text-muted">
          {overview?.message || "Run at least one complete scanner result to calculate unified risk."}
        </div>
      ) : (
        <>
          <div className="mt-5 grid grid-cols-1 md:grid-cols-4 gap-element-gap">
            <RiskMetric label="Final Risk Score" value={risk.final_risk_score} tone={risk.risk_level} />
            <RiskMetric label="Technical Risk" value={risk.technical_risk_score} tone={scoreTone(risk.technical_risk_score)} />
            <RiskMetric label="Business Risk" value={risk.business_risk_score} tone={scoreTone(risk.business_risk_score)} />
            <div className="rounded-lg border border-border-divider bg-surface-container-lowest p-4">
              <p className="text-xs font-semibold uppercase text-text-muted">Formula</p>
              <p className="mt-2 font-mono text-sm text-text-primary break-words">{risk.formula.expression}</p>
            </div>
          </div>

          {overview?.selectedJobIds?.length ? (
            <div className="mt-4 rounded-lg border border-border-divider bg-surface-container-low p-3">
              <p className="text-xs font-semibold uppercase text-text-muted">Risk engine input job IDs</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {overview.selectedJobIds.map((id) => (
                  <span key={id} className="rounded bg-white border border-border-divider px-2 py-1 font-mono text-xs text-text-secondary">
                    {id}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          {overview?.missingScanners?.length ? (
            <div className="mt-4 rounded-lg border border-[#ffd6a5] bg-[#fff8eb] p-3 text-sm text-[#8a5200]">
              Missing scanner results for this project: {overview.missingScanners.join(", ")}.
            </div>
          ) : null}

          <div className="mt-6 grid grid-cols-1 xl:grid-cols-[1fr_420px] gap-element-gap">
            <div className="space-y-5">
              <div className="rounded-lg border border-border-divider p-4">
                <h3 className="font-semibold text-text-primary">Executive Summary</h3>
                <p className="mt-2 text-sm text-text-secondary">{risk.executive_summary}</p>
                <p className="mt-3 text-sm text-text-secondary">{risk.developer_summary}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                {Object.values(risk.scanner_scores).map((scanner) => (
                  <div key={scanner.scanner} className="rounded-lg border border-border-divider p-4">
                    <p className="text-xs uppercase font-semibold text-text-muted">{scanner.scanner}</p>
                    <p className={`mt-2 text-2xl font-bold ${riskTextColor(scanner.business_adjusted_score)}`}>
                      {scanner.business_adjusted_score}
                    </p>
                    <p className="mt-1 text-xs text-text-muted">{scanner.finding_count} normalized finding(s)</p>
                  </div>
                ))}
              </div>

              <div className="rounded-lg border border-border-divider p-4">
                <h3 className="font-semibold text-text-primary">Top Risk Findings</h3>
                <div className="mt-3 divide-y divide-border-divider">
                  {risk.top_findings.length === 0 ? (
                    <p className="py-4 text-sm text-text-muted">No high priority findings available.</p>
                  ) : risk.top_findings.slice(0, 5).map((finding) => (
                    <div key={finding.id} className="py-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold">{finding.title}</p>
                          <p className="text-xs text-text-muted mt-1">
                            {finding.scanner} / {finding.category}
                            {finding.file_path ? ` / ${finding.file_path}${finding.line_number ? `:${finding.line_number}` : ""}` : ""}
                          </p>
                          {finding.source_job_id && (
                            <p className="text-xs text-text-muted mt-1 font-mono">source job: {finding.source_job_id}</p>
                          )}
                        </div>
                        <span className={`rounded px-2 py-1 text-xs font-semibold ${riskBadgeClass(finding.business_adjusted_score)}`}>
                          {finding.business_adjusted_score}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-text-secondary">{finding.plain_language_summary}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-5">
              <div className="rounded-lg border border-border-divider p-4">
                <h3 className="font-semibold text-text-primary">Admin Business Inputs</h3>
                <p className="mt-1 text-xs text-text-muted">Scale 0 to 10. Default is 5 for every field.</p>
                <div className="mt-4 space-y-4">
                  <BusinessSlider
                    label="Asset Criticality"
                    value={businessContext.assetCriticality}
                    tooltip={businessInputMap.asset_criticality?.meaning || "How important this application is to the bank."}
                    onChange={(value) => setBusinessContext((current) => ({ ...current, assetCriticality: value }))}
                  />
                  <BusinessSlider
                    label="Data Sensitivity"
                    value={businessContext.dataSensitivity}
                    tooltip={businessInputMap.data_sensitivity?.meaning || "Whether the app handles PII, credentials, or financial data."}
                    onChange={(value) => setBusinessContext((current) => ({ ...current, dataSensitivity: value }))}
                  />
                  <BusinessSlider
                    label="Business Impact"
                    value={businessContext.businessImpact}
                    tooltip={businessInputMap.business_impact?.meaning || "Revenue or operational impact if compromised."}
                    onChange={(value) => setBusinessContext((current) => ({ ...current, businessImpact: value }))}
                  />
                  <BusinessSlider
                    label="Internet Exposure"
                    value={businessContext.internetExposure}
                    tooltip={businessInputMap.internet_exposure?.meaning || "How reachable this service is from public networks."}
                    onChange={(value) => setBusinessContext((current) => ({ ...current, internetExposure: value }))}
                  />
                  <BusinessSlider
                    label="Compliance Requirement"
                    value={businessContext.complianceRequirement}
                    tooltip={businessInputMap.compliance_requirement?.meaning || "Regulatory and audit importance."}
                    onChange={(value) => setBusinessContext((current) => ({ ...current, complianceRequirement: value }))}
                  />
                  <BusinessSlider
                    label="Exploit Window"
                    value={businessContext.exploitWindow}
                    tooltip={businessInputMap.exploit_window?.meaning || "How fast the issue must be fixed under policy or exposure."}
                    onChange={(value) => setBusinessContext((current) => ({ ...current, exploitWindow: value }))}
                  />
                </div>
              </div>

              <div className="rounded-lg border border-border-divider p-4">
                <h3 className="font-semibold text-text-primary">Remediation Priorities</h3>
                <ol className="mt-3 space-y-2">
                  {risk.remediation_priorities.slice(0, 6).map((item, index) => (
                    <li key={`${item}-${index}`} className="text-sm text-text-secondary">
                      <span className="font-semibold text-text-primary">{index + 1}.</span> {item}
                    </li>
                  ))}
                </ol>
              </div>

              {aiRemedies.length ? (
                <div className="rounded-lg border border-border-divider p-4">
                  <h3 className="font-semibold text-text-primary">AI Remediation Suggestions</h3>
                  <p className="mt-1 text-xs text-text-muted">
                    {latestAssessment?.result?.aiPromptPolicy || aiRemedies[0]?.prompt_policy}
                  </p>
                  {aiTokenUsage && (
                    <p className="mt-2 rounded bg-surface-container-low px-2 py-1 font-mono text-xs text-text-muted">
                      OpenAI tokens used: prompt {aiTokenUsage.prompt_tokens || 0}, completion {aiTokenUsage.completion_tokens || 0}, total {aiTokenUsage.total_tokens || 0}
                    </p>
                  )}
                  <div className="mt-3 space-y-3">
                    {aiRemedies.map((item) => (
                      <div key={item.finding_id} className="rounded-lg bg-surface-container-low p-3">
                        <div className="flex items-start justify-between gap-3">
                          <p className="font-semibold text-sm">{item.title}</p>
                          <span className="rounded bg-white border border-border-divider px-2 py-1 text-[10px] uppercase text-text-muted">
                            {item.fallback_used ? "fallback" : item.model || "ai"}
                          </span>
                        </div>
                        <p className="mt-2 whitespace-pre-wrap text-sm text-text-secondary">{item.recommendation}</p>
                        {item.token_usage?.total_tokens !== undefined && (
                          <p className="mt-2 font-mono text-xs text-text-muted">
                            tokens: prompt {item.token_usage.prompt_tokens || 0}, completion {item.token_usage.completion_tokens || 0}, total {item.token_usage.total_tokens || 0}
                          </p>
                        )}
                        {item.source_job_id && <p className="mt-2 font-mono text-xs text-text-muted">source job: {item.source_job_id}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </>
      )}
    </section>
  );
}

function BusinessSlider({ label, value, tooltip, onChange }: { label: string; value: number; tooltip: string; onChange: (value: number) => void }) {
  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <label className="text-sm font-semibold text-text-secondary flex items-center gap-1">
          {label}
          <InfoTooltip text={tooltip} />
        </label>
        <span className="rounded bg-surface-container px-2 py-1 text-xs font-semibold">{value}/10</span>
      </div>
      <input
        type="range"
        min={0}
        max={10}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="mt-2 w-full accent-primary"
      />
    </div>
  );
}

function RiskMetric({ label, value, tone }: { label: string; value: string | number; tone: string }) {
  return (
    <div className="rounded-lg border border-border-divider bg-surface-container-lowest p-4">
      <p className="text-xs font-semibold uppercase text-text-muted">{label}</p>
      <p className={`mt-2 text-3xl font-bold ${riskTextColor(typeof value === "number" ? value : 0, tone)}`}>{value}</p>
      <p className="mt-1 text-xs uppercase text-text-muted">{tone}</p>
    </div>
  );
}

function scoreTone(score: number) {
  if (score >= 81) return "critical";
  if (score >= 61) return "high";
  if (score >= 41) return "elevated";
  if (score >= 21) return "moderate";
  return "low";
}

function riskTextColor(score: number, tone?: string) {
  const level = tone || scoreTone(score);
  if (level === "critical") return "text-severity-critical";
  if (level === "high") return "text-severity-high";
  if (level === "elevated" || level === "moderate") return "text-[#8a5200]";
  return "text-tertiary";
}

function riskBadgeClass(score: number) {
  if (score >= 81) return "bg-red-100 text-red-800";
  if (score >= 61) return "bg-orange-100 text-orange-800";
  if (score >= 41) return "bg-yellow-100 text-yellow-800";
  return "bg-green-100 text-green-800";
}

function assessmentBadge(status: string) {
  if (status === "completed") return "bg-green-100 text-green-800";
  if (status === "failed" || status === "cancelled") return "bg-red-100 text-red-800";
  if (status === "running") return "bg-blue-100 text-blue-800";
  return "bg-yellow-100 text-yellow-800";
}
