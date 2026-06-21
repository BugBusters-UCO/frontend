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
} from "@/shared/api/client";
import { ScanConfig } from "@/widgets/ScanConfig";
import { RecentJobs } from "@/widgets/RecentJobs";

export default function DashboardPage() {
  const router = useRouter();
  
  const [githubUser, setGithubUser] = useState<GithubUser | null>(null);
  const [repos, setRepos] = useState<GithubRepository[]>([]);
  const [selectedRepo, setSelectedRepo] = useState<string>("");
  const [isConnectingGithub, setIsConnectingGithub] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [jobs, setJobs] = useState<ScanJob[]>([]);
  const [githubSession, setGithubSession] = useState<string | null>(null);

  useEffect(() => {
    // Check if auth successful (from query params)
    const urlParams = new URLSearchParams(window.location.search);
    const sessionFromUrl = urlParams.get("githubSession");
    const errorFromUrl = urlParams.get("githubError");
    
    let currentSession = localStorage.getItem("bugbusters_github_session");

    if (sessionFromUrl) {
      currentSession = sessionFromUrl;
      localStorage.setItem("bugbusters_github_session", sessionFromUrl);
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (errorFromUrl) {
      setScanError(errorFromUrl);
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    if (currentSession) {
      setGithubSession(currentSession);
      loadGithubData(currentSession)
        .then(() => fetchScanJobs())
        .then((data) => setJobs(data || []))
        .catch(() => {
          // Session invalid or expired
          localStorage.removeItem("bugbusters_github_session");
          setGithubSession(null);
          setJobs([]);
        });
    } else {
      setJobs([]);
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
      const data = await startGithubScan(selectedRepo, repo.cloneUrl, githubSession);
      router.push(`/dependency-scanner/${data.id}`);
    } catch (err: any) {
      setScanError(err.message || "Failed to start scan");
      setIsScanning(false);
    }
  };

  const handleUploadZip = async (file: File) => {
    setScanError(null);
    setIsScanning(true);
    try {
      const data = await uploadZipScan(file);
      router.push(`/dependency-scanner/${data.id}`);
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
          />
        </div>
        <div className="flex flex-col">
          <RecentJobs
            jobs={jobs}
            onSelectJob={() => {}}
          />
        </div>
      </div>
    </div>
  );
}
