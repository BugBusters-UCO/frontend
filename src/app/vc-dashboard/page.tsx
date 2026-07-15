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
  createRiskAssessment,
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

export default function VCDashboardPage() {
  const queryClient = useQueryClient();
  const [selectedRepo, setSelectedRepo] = useState<string>("");
  const [isConnectingGithub, setIsConnectingGithub] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [activeScans, setActiveScans] = useState<ScanJob[]>([]);
  const [activeRiskAssessment, setActiveRiskAssessment] = useState<RiskAssessment | null>(null);
  const [githubSession, setGithubSession] = useState<string | null>(null);
  const [scanOptions, setScanOptions] = useState({ 
    includeDev: true, 
    useOsv: true, 
    failOn: "high", 
    includeLow: true,
    runDependency: true,
    runConfig: true,
    runSecret: true,
    runCipher: true
  });
  const [businessContext, setBusinessContext] = useState<BusinessRiskContext>(DEFAULT_BUSINESS_CONTEXT);
  
  // Progress state
  const [progressStage, setProgressStage] = useState<string | null>(null);
  const [completedScans, setCompletedScans] = useState<number>(0);
  const [totalSelectedScans, setTotalSelectedScans] = useState<number>(0);

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

  // Removed unified risk overview data query from here

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
    setCompletedScans(0);
    setProgressStage("Initializing");

    const scannersToRun = [];
    if (scanOptions.runDependency) scannersToRun.push({ name: "Dependency Scan", fn: startGithubScan });
    if (scanOptions.runConfig) scannersToRun.push({ name: "Config Scan", fn: startConfigGithubScan });
    if (scanOptions.runSecret) scannersToRun.push({ name: "Secret Scan", fn: startSecretGithubScan });
    if (scanOptions.runCipher) scannersToRun.push({ name: "Cipher Scan", fn: startCipherGithubScan });

    setTotalSelectedScans(scannersToRun.length);

    if (scannersToRun.length === 0) {
      setScanError("Please select at least one scanner.");
      setIsScanning(false);
      setProgressStage(null);
      return;
    }

    try {
      const activeScansArr: ScanJob[] = [];
      const scanJobIds: string[] = [];

      for (const scanner of scannersToRun) {
        setProgressStage(scanner.name);
        const job = await scanner.fn(selectedRepo, repo.cloneUrl, activeGithubSession || "", scanOptions);
        activeScansArr.push(job);
        scanJobIds.push(job.id);
        setCompletedScans(prev => prev + 1);
      }

      setProgressStage("Generating Risk Assessment");
      setActiveScans(activeScansArr);
      
      const assessment = await createRiskAssessment({
        sourceType: "github",
        sourceLabel: selectedRepo,
        scanJobIds,
        businessContext,
      });
      setActiveRiskAssessment(assessment);
      queryClient.invalidateQueries({ queryKey: ["risk-assessments"] });
    } catch (err: unknown) {
      setScanError(errorMessage(err, "Failed to start or complete scans"));
    } finally {
      setIsScanning(false);
      setProgressStage(null);
    }
  };

  const handleUploadZip = async (file: File) => {
    setScanError(null);
    setIsScanning(true);
    setCompletedScans(0);
    setProgressStage("Initializing");

    const scannersToRun = [];
    if (scanOptions.runDependency) scannersToRun.push({ name: "Dependency Scan", fn: uploadZipScan });
    if (scanOptions.runConfig) scannersToRun.push({ name: "Config Scan", fn: uploadConfigZipScan });
    if (scanOptions.runSecret) scannersToRun.push({ name: "Secret Scan", fn: uploadSecretZipScan });
    if (scanOptions.runCipher) scannersToRun.push({ name: "Cipher Scan", fn: uploadCipherZipScan });

    setTotalSelectedScans(scannersToRun.length);

    if (scannersToRun.length === 0) {
      setScanError("Please select at least one scanner.");
      setIsScanning(false);
      setProgressStage(null);
      return;
    }

    try {
      const activeScansArr: ScanJob[] = [];
      const scanJobIds: string[] = [];

      for (const scanner of scannersToRun) {
        setProgressStage(scanner.name);
        const job = await scanner.fn(file, scanOptions);
        activeScansArr.push(job);
        scanJobIds.push(job.id);
        setCompletedScans(prev => prev + 1);
      }

      setProgressStage("Generating Risk Assessment");
      setActiveScans(activeScansArr);
      
      const sourceLabel = file.name.replace(/\.(zip|tar|tgz|gz)$/i, "") || file.name;
      const assessment = await createRiskAssessment({
        sourceType: "zip",
        sourceLabel,
        scanJobIds,
        businessContext,
      });
      setActiveRiskAssessment(assessment);
      queryClient.invalidateQueries({ queryKey: ["risk-assessments"] });
    } catch (err: unknown) {
      setScanError(errorMessage(err, "Failed to upload and scan"));
    } finally {
      setIsScanning(false);
      setProgressStage(null);
    }
  };

  return (
    <div className="max-w-[1280px] mx-auto flex flex-col gap-section-gap">
      <DisclaimerModal />
      <div>
        <h1 className="font-headline-lg text-headline-lg text-text-primary mb-1">Version Control Dashboard</h1>
        <p className="font-body-sm text-body-sm text-text-secondary">Scan and manage repositories directly from GitHub.</p>
      </div>



      {/* Configuration & Jobs Area */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-element-gap">
        <div className="flex flex-col gap-element-gap">
          {isScanning && progressStage && (
            <div className="bg-surface transition-colors duration-300 rounded-2xl border border-border-subtle shadow-sm p-6 mb-4 animate-in fade-in duration-300">
              <h2 className="text-section-header font-section-header mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-xl animate-spin">refresh</span>
                Scan in Progress
              </h2>
              <div className="flex justify-between text-body-sm font-medium mb-2">
                <span className="text-text-primary">Running {progressStage}...</span>
                <span className="text-text-muted">{completedScans} / {totalSelectedScans} Completed</span>
              </div>
              <div className="w-full bg-surface-container-high rounded-full h-2.5 overflow-hidden">
                <div 
                  className="bg-primary h-2.5 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${Math.max(5, (completedScans / (totalSelectedScans || 1)) * 100)}%` }}
                ></div>
              </div>
              {completedScans > 0 && activeScans.length > 0 && (
                <div className="mt-4 pt-4 border-t border-border-divider">
                  <p className="text-body-xs font-semibold uppercase text-text-muted mb-2">Recently Completed</p>
                  <div className="flex items-center gap-2 text-body-sm">
                    <span className="material-symbols-outlined text-severity-low text-lg">check_circle</span>
                    <span>{activeScans[activeScans.length - 1].scannerType} scan finished successfully.</span>
                  </div>
                </div>
              )}
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


