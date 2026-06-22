"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { GithubUser, GithubRepository, ScanJob } from "@/shared/api/types";
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
} from "@/shared/api/client";
import { ScanConfig } from "@/widgets/ScanConfig";
import { RecentJobs } from "@/widgets/RecentJobs";
import { SkeletonJobRow } from "@/widgets/Skeleton";
import Link from "next/link";
import { getCookie, setCookie, deleteCookie } from "cookies-next";

export default function DashboardPage() {
  const router = useRouter();
  
  const [githubUser, setGithubUser] = useState<GithubUser | null>(null);
  const [repos, setRepos] = useState<GithubRepository[]>([]);
  const [selectedRepo, setSelectedRepo] = useState<string>("");
  const [isConnectingGithub, setIsConnectingGithub] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [jobs, setJobs] = useState<ScanJob[]>([]);
  const [activeScans, setActiveScans] = useState<ScanJob[]>([]);
  const [isLoadingJobs, setIsLoadingJobs] = useState(true);
  const [githubSession, setGithubSession] = useState<string | null>(null);
  const [scanOptions, setScanOptions] = useState({ includeDev: true, useOsv: true, failOn: "high", includeLow: true });

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
      setScanError(errorFromUrl);
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    if (currentSession) {
      setGithubSession(currentSession);
      loadGithubData(currentSession)
        .then(() => Promise.all([fetchScanJobs(), fetchConfigScanJobs()]))
        .then(([depJobs, configJobs]) => {
          setJobs([...(depJobs || []), ...(configJobs || [])].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
          setIsLoadingJobs(false);
        })
        .catch(() => {
          // Session invalid or expired
          deleteCookie("bugbusters_github_session");
          setGithubSession(null);
          setJobs([]);
          setIsLoadingJobs(false);
        });
    } else {
      setJobs([]);
      setIsLoadingJobs(false);
    }
  }, []);

  const loadGithubData = async (session: string) => {
    try {
      const userData = await fetchGithubUser(session);
      setGithubUser(userData.user);
      const repoData = await fetchGithubRepos(session);
      setRepos(repoData.repositories);
    } catch (err) {
      console.error("Failed to load GitHub data", err);
      throw err;
    }
  };

  const handleConnectGithub = () => {
    setIsConnectingGithub(true);
    setScanError(null);
    window.location.href = getGithubConnectUrl();
  };

  const handleStartGithubScan = async () => {
    if (!selectedRepo) {
      setScanError("Please select a repository first.");
      return;
    }
    if (!githubSession) {
      setScanError("Please connect to GitHub first.");
      return;
    }

    const repo = repos.find(r => r.fullName === selectedRepo);
    if (!repo) {
      setScanError("Selected repository not found.");
      return;
    }

    setScanError(null);
    setIsScanning(true);
    try {
      const [depJob, configJob] = await Promise.all([
        startGithubScan(selectedRepo, repo.cloneUrl, githubSession, scanOptions),
        startConfigGithubScan(selectedRepo, repo.cloneUrl, githubSession, scanOptions)
      ]);
      setActiveScans([depJob, configJob]);
      setIsScanning(false);
    } catch (err: any) {
      setScanError(err.message || "Failed to start scans");
      setIsScanning(false);
    }
  };

  const handleUploadZip = async (file: File) => {
    setScanError(null);
    setIsScanning(true);
    try {
      const [depJob, configJob] = await Promise.all([
        uploadZipScan(file, scanOptions),
        uploadConfigZipScan(file, scanOptions)
      ]);
      setActiveScans([depJob, configJob]);
      setIsScanning(false);
    } catch (err: any) {
      setScanError(err.message || "Failed to upload and scan");
      setIsScanning(false);
    }
  };

  return (
    <div className="max-w-[1280px] mx-auto flex flex-col gap-section-gap">
      {/* Page Header */}
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
              <p className="font-bold text-lg text-tertiary">B+</p>
            </div>
          </div>
        </div>
      </div>

      {/* Configuration & Jobs Area */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-element-gap">
        <div className="flex flex-col gap-element-gap">
          {activeScans.length > 0 && (
            <div className="bg-white rounded-lg border border-border-subtle shadow-sm p-card-padding">
              <h2 className="text-section-header font-section-header mb-4">Active Scans</h2>
              <div className="space-y-3">
                {activeScans.map((scan) => {
                  const scannerRoute = scan.scannerType === "config" ? "config-scanner" : "dependency-scanner";
                  const scanTypeName = scan.scannerType === "config" ? "Config Scan" : "Dependency Scan";
                  const icon = scan.scannerType === "config" ? "settings_input_component" : "account_tree";
                  
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
          
          <ScanConfig
            githubUser={githubUser}
            repos={repos}
            selectedRepo={selectedRepo}
            setSelectedRepo={setSelectedRepo}
            onConnectGithub={handleConnectGithub}
            isConnectingGithub={isConnectingGithub}
            onStartScan={handleStartGithubScan}
            onUploadZip={handleUploadZip}
            isScanning={isScanning}
            error={scanError}
            scanOptions={scanOptions}
            setScanOptions={setScanOptions}
          />
        </div>
        <div className="flex flex-col">
          <RecentJobs jobs={jobs} isLoading={isLoadingJobs} />
        </div>
      </div>
    </div>
  );
}
