"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

type JobStatus = "queued" | "running" | "completed" | "failed";

type ScanJob = {
  id: string;
  sourceType: "github" | "zip" | "local";
  sourceLabel: string;
  status: JobStatus;
  error?: string | null;
  createdAt: string;
  updatedAt: string;
  result?: ScanResult | null;
};

type LogEntry = {
  id: string;
  level: "info" | "success" | "warning" | "error";
  message: string;
  timestamp: string;
  meta?: Record<string, unknown>;
};

type ScanResult = {
  summary: {
    total_manifests: number;
    total_dependencies: number;
    vulnerable_dependencies: number;
    dependency_risk_findings?: number;
    risk_chains?: number;
    capability_findings?: number;
    namespace_risks?: number;
    banking_exposure_score?: number;
    banking_action?: "block" | "expedite" | "watch" | "track";
    risk_score: number;
    ci_status: "passed" | "failed";
    findings_by_severity: Record<string, number>;
  };
  findings: Array<{
    id: string;
    package_name: string;
    installed_version?: string;
    ecosystem: string;
    severity: string;
    summary: string;
    fix: {
      title: string;
      description: string;
      command?: string;
      auto_remediable: boolean;
    };
  }>;
  dependency_risks?: Array<{
    id: string;
    dependency_name?: string | null;
    manifest_path: string;
    severity: string;
    category: string;
    title: string;
    description: string;
    fix: {
      title: string;
      description: string;
      command?: string;
      auto_remediable: boolean;
    };
  }>;
  capability_findings?: Array<{
    id: string;
    capability: string;
    severity: string;
    title: string;
    description: string;
    file_path: string;
    line_number?: number | null;
    code?: string | null;
    dependency_name?: string | null;
    banking_impact: string;
    fix: {
      title: string;
      description: string;
      command?: string;
      auto_remediable: boolean;
    };
  }>;
  namespace_risks?: Array<{
    id: string;
    severity: string;
    category: string;
    title: string;
    description: string;
    file_path: string;
    dependency_name?: string | null;
    evidence: string[];
    banking_impact: string;
    fix: {
      title: string;
      description: string;
      command?: string;
      auto_remediable: boolean;
    };
  }>;
  risk_chains?: Array<{
    id: string;
    dependency_name: string;
    ecosystem: string;
    severity: string;
    title: string;
    risk_chain: string[];
    trace?: Array<{
      step: number;
      kind: "route" | "manifest" | "import" | "sensitive-use" | "risk" | "fix";
      label: string;
      file_path?: string | null;
      line_number?: number | null;
      code?: string | null;
      details: string[];
    }>;
    manifest_path?: string | null;
    sensitive_contexts: string[];
    used_in_files: string[];
    evidence: string[];
    exposure?: ExposureScore | null;
    fix: {
      title: string;
      description: string;
      command?: string;
      auto_remediable: boolean;
    };
  }>;
};

type ExposureScore = {
  score: number;
  action: "block" | "expedite" | "watch" | "track";
  exploit_likelihood: number;
  static_exploitability: number;
  business_criticality: number;
  trust_deficit: number;
  malicious_capability: number;
  blast_radius: number;
  reasons: string[];
};

type RiskChain = NonNullable<ScanResult["risk_chains"]>[number];

type GithubUser = {
  login: string;
  name?: string | null;
  avatarUrl?: string;
  profileUrl?: string;
};

type GithubRepository = {
  id: number;
  name: string;
  fullName: string;
  private: boolean;
  defaultBranch: string;
  updatedAt: string;
  cloneUrl: string;
  htmlUrl: string;
  language?: string | null;
  description?: string | null;
};

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:5000";

export default function Home() {
  const [githubSession, setGithubSession] = useState("");
  const [githubUser, setGithubUser] = useState<GithubUser | null>(null);
  const [repositories, setRepositories] = useState<GithubRepository[]>([]);
  const [selectedRepo, setSelectedRepo] = useState("");
  const [repoSearch, setRepoSearch] = useState("");
  const [email, setEmail] = useState("");
  const [zipFile, setZipFile] = useState<File | null>(null);
  const [includeDev, setIncludeDev] = useState(true);
  const [useOsv, setUseOsv] = useState(true);
  const [failOn, setFailOn] = useState("high");
  const [jobs, setJobs] = useState<ScanJob[]>([]);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [activeJob, setActiveJob] = useState<ScanJob | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [health, setHealth] = useState("checking");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGithubLoading, setIsGithubLoading] = useState(false);
  const [githubMessage, setGithubMessage] = useState("");
  const [error, setError] = useState("");
  const [selectedChainId, setSelectedChainId] = useState("");

  const activeSummary = activeJob?.result?.summary;
  const findings = activeJob?.result?.findings || [];
  const dependencyRisks = activeJob?.result?.dependency_risks || [];
  const capabilityFindings = activeJob?.result?.capability_findings || [];
  const namespaceRisks = activeJob?.result?.namespace_risks || [];
  const riskChains = activeJob?.result?.risk_chains || [];
  const tableFindings = [
    ...findings.map((finding) => ({
      id: finding.id,
      subject: finding.package_name,
      detail: `${finding.ecosystem} ${finding.installed_version || ""}`,
      severity: finding.severity,
      issue: finding.summary,
      fixTitle: finding.fix.title,
      fixDetail: finding.fix.command || finding.fix.description,
      type: "CVE",
    })),
    ...dependencyRisks.map((risk) => ({
      id: risk.id,
      subject: risk.dependency_name || risk.category,
      detail: risk.category,
      severity: risk.severity,
      issue: `${risk.title}: ${risk.description}`,
      fixTitle: risk.fix.title,
      fixDetail: risk.fix.command || risk.fix.description,
      type: "Risk",
    })),
    ...capabilityFindings.map((finding) => ({
      id: finding.id,
      subject: finding.capability,
      detail: formatLocation({ file_path: finding.file_path, line_number: finding.line_number }),
      severity: finding.severity,
      issue: `${finding.title}: ${finding.banking_impact}`,
      fixTitle: finding.fix.title,
      fixDetail: finding.fix.command || finding.fix.description,
      type: "Capability",
    })),
    ...namespaceRisks.map((risk) => ({
      id: risk.id,
      subject: risk.dependency_name || risk.category,
      detail: risk.file_path,
      severity: risk.severity,
      issue: `${risk.title}: ${risk.banking_impact}`,
      fixTitle: risk.fix.title,
      fixDetail: risk.fix.command || risk.fix.description,
      type: "Registry",
    })),
    ...riskChains.map((chain) => ({
      id: chain.id,
      subject: chain.dependency_name,
      detail: `${chain.ecosystem} - ${chain.sensitive_contexts.join(", ")}`,
      severity: chain.severity,
      issue: `${chain.title}: ${chain.risk_chain.join(" -> ")}`,
      fixTitle: chain.fix.title,
      fixDetail: chain.fix.command || chain.fix.description,
      type: "Blast radius",
    })),
  ];
  const filteredRepositories = repositories.filter((repo) =>
    repo.fullName.toLowerCase().includes(repoSearch.toLowerCase())
  );
  const selectedRepository = repositories.find((repo) => repo.fullName === selectedRepo);

  const statusTone = useMemo(() => {
    if (!activeJob) return "idle";
    if (activeJob.status === "completed" && activeSummary?.ci_status === "passed") return "passed";
    if (activeJob.status === "failed" || activeSummary?.ci_status === "failed") return "failed";
    return "running";
  }, [activeJob, activeSummary]);

  const checkHealth = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/api/health`);
      const data = await response.json();
      setHealth(data.dependencyScanner?.status === "ok" ? "ready" : "scanner offline");
    } catch {
      setHealth("backend offline");
    }
  }, []);

  const loadRepositories = useCallback(async (sessionId: string) => {
    setIsGithubLoading(true);
    setGithubMessage("Importing repositories from GitHub...");
    const response = await fetch(`${API_BASE}/api/github/repositories`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ githubSession: sessionId }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Could not import GitHub repositories");

    setRepositories(data.repositories || []);
    setSelectedRepo(data.repositories?.[0]?.fullName || "");
    setGithubMessage(`Imported ${data.repositories?.length || 0} repositories.`);
    setIsGithubLoading(false);
  }, []);

  const refreshJobs = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/api/scans`);
      const data = (await response.json()) as ScanJob[];
      setJobs(data);
      if (!activeJobId && data.length > 0) {
        setActiveJobId(data[0].id);
      }
    } catch {
      setJobs([]);
    }
  }, [activeJobId]);

  const refreshJob = useCallback(async (jobId: string) => {
    try {
      const response = await fetch(`${API_BASE}/api/scans/${jobId}`);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Scan job is no longer available");
      }
      setActiveJob(data);
      setLogs(data.logs || []);
      refreshJobs();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Scan job is no longer available");
      setActiveJob((current) => current ? { ...current, status: "failed", error: "Scan job interrupted. Restart scan." } : current);
    }
  }, [refreshJobs]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      refreshJobs();
      checkHealth();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [checkHealth, refreshJobs]);

  useEffect(() => {
    if (!activeJobId) return;

    const timer = window.setTimeout(() => {
      refreshJob(activeJobId);
    }, 0);
    const events = new EventSource(`${API_BASE}/api/scans/${activeJobId}/logs`);
    events.onmessage = (event) => {
      const entry = JSON.parse(event.data) as LogEntry;
      setLogs((current) => [...current, entry].slice(-300));
      refreshJob(activeJobId);
    };
    events.onerror = () => events.close();

    return () => {
      window.clearTimeout(timer);
      events.close();
    };
  }, [activeJobId, refreshJob]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionFromUrl = params.get("githubSession");
    const oauthError = params.get("githubError");
    const storedSession = window.localStorage.getItem("githubSession");

    const nextSession = sessionFromUrl || storedSession || "";
    if (!nextSession && !oauthError) return;

    const cleanUrl = new URL(window.location.href);
    cleanUrl.searchParams.delete("githubSession");
    cleanUrl.searchParams.delete("githubConnected");
    cleanUrl.searchParams.delete("githubError");
    window.history.replaceState({}, "", cleanUrl.toString());

    const timer = window.setTimeout(async () => {
      if (oauthError) {
        setError(oauthError);
      }

      if (!nextSession) return;

      window.localStorage.setItem("githubSession", nextSession);
      setGithubSession(nextSession);
      setIsGithubLoading(true);
      setGithubMessage("Restoring GitHub connection...");

      try {
        const sessionResponse = await fetch(`${API_BASE}/api/github/session`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ githubSession: nextSession }),
        });
        const sessionData = await sessionResponse.json();
        if (!sessionResponse.ok || !sessionData.connected) {
          throw new Error(sessionData.message || "GitHub session could not be restored");
        }

        setGithubUser(sessionData.user);
        await loadRepositories(nextSession);
      } catch (err) {
        window.localStorage.removeItem("githubSession");
        setGithubSession("");
        setGithubUser(null);
        setRepositories([]);
        setGithubMessage("");
        setError(err instanceof Error ? err.message : "GitHub session could not be restored");
      } finally {
        setIsGithubLoading(false);
      }
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadRepositories]);

  function connectGithub() {
    setError("");
    setIsGithubLoading(true);
    setGithubMessage("Opening GitHub OAuth...");
    window.location.href = `${API_BASE}/api/github/oauth/start`;
  }

  async function submitGithub(event: FormEvent) {
    event.preventDefault();
    if (!selectedRepository) {
      setError("Connect GitHub and choose a repository first");
      return;
    }

    setError("");
    setIsSubmitting(true);

    try {
      const response = await fetch(`${API_BASE}/api/scans/github`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          repoCloneUrl: selectedRepository.cloneUrl,
          repoFullName: selectedRepository.fullName,
          githubSession,
          email,
          includeDev,
          useOsv,
          failOn,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "GitHub scan failed to start");
      setActiveJobId(data.id);
      await refreshJobs();
    } catch (err) {
      setError(err instanceof Error ? err.message : "GitHub scan failed to start");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function submitZip(event: FormEvent) {
    event.preventDefault();
    if (!zipFile) {
      setError("Choose a repository .zip file first");
      return;
    }

    setError("");
    setIsSubmitting(true);

    try {
      const form = new FormData();
      form.append("repoZip", zipFile);
      form.append("email", email);
      form.append("includeDev", String(includeDev));
      form.append("useOsv", String(useOsv));
      form.append("failOn", failOn);

      const response = await fetch(`${API_BASE}/api/scans/zip`, {
        method: "POST",
        body: form,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "ZIP scan failed to start");
      setActiveJobId(data.id);
      setZipFile(null);
      await refreshJobs();
    } catch (err) {
      setError(err instanceof Error ? err.message : "ZIP scan failed to start");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f6f7f9] text-[#172026]">
      <section className="border-b border-[#d8dee4] bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-6 py-7 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#667085]">Secure dependency intake</p>
            <h1 className="mt-3 text-4xl font-semibold tracking-normal text-[#111827]">Dependency Risk Dashboard</h1>
            <p className="mt-3 max-w-3xl text-base leading-7 text-[#5b6573]">
              Connect GitHub, import a repository, or upload a source archive. Stream scan logs and review vulnerable packages with fixes from the dependency scanner.
            </p>
          </div>
          <div className={`rounded-md border px-4 py-3 text-sm font-medium ${health === "ready" ? "border-[#b7e4c7] bg-[#effaf3] text-[#176b3a]" : "border-[#ffd6a5] bg-[#fff8eb] text-[#8a5200]"}`}>
            Backend status: {health}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-6 py-6 lg:grid-cols-[420px_1fr]">
        <div className="space-y-5">
          <div className="rounded-lg border border-[#d8dee4] bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold">Start a scan</h2>
            <div className="mt-4 grid grid-cols-1 gap-2 rounded-md bg-[#eef1f5] p-1 text-sm sm:grid-cols-3">
              <label className="flex items-center justify-center gap-2 rounded bg-white px-3 py-2 shadow-sm">
                <input type="checkbox" checked={includeDev} onChange={(event) => setIncludeDev(event.target.checked)} />
                Dev deps
              </label>
              <label className="flex items-center justify-center gap-2 rounded bg-white px-3 py-2 shadow-sm">
                <input type="checkbox" checked={useOsv} onChange={(event) => setUseOsv(event.target.checked)} />
                OSV
              </label>
              <select value={failOn} onChange={(event) => setFailOn(event.target.value)} className="rounded border border-[#d8dee4] bg-white px-2 py-2">
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>

            <label className="mt-4 block text-sm font-medium text-[#44505f]">Report email</label>
            <input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="security-team@bank.com" className="mt-2 w-full rounded-md border border-[#cfd6df] px-3 py-2 outline-none focus:border-[#2f6fed]" />

            <form onSubmit={submitGithub} className="mt-5 border-t border-[#edf0f3] pt-5">
              <div className="flex items-center justify-between gap-3">
                <label className="text-sm font-medium text-[#44505f]">GitHub connection</label>
                {githubUser ? <span className="rounded bg-[#effaf3] px-2 py-1 text-xs font-semibold text-[#176b3a]">{githubUser.login}</span> : null}
              </div>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={connectGithub}
                className="mt-2 w-full rounded-md border border-[#1f6feb] px-4 py-2.5 text-sm font-semibold text-[#1f6feb] hover:bg-[#f0f6ff] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isGithubLoading ? "Connecting..." : githubUser ? "Reconnect GitHub" : "Connect GitHub"}
              </button>

              {isGithubLoading ? (
                <p className="mt-3 rounded-md bg-[#f0f6ff] px-3 py-2 text-sm text-[#1f6feb]">
                  {githubMessage || "Connecting GitHub and importing repositories..."}
                </p>
              ) : repositories.length > 0 ? (
                <div className="mt-4">
                  {githubMessage ? <p className="mb-2 rounded-md bg-[#effaf3] px-3 py-2 text-sm text-[#176b3a]">{githubMessage}</p> : null}
                  <label className="text-sm font-medium text-[#44505f]">Import repository</label>
                  <input
                    value={repoSearch}
                    onChange={(event) => setRepoSearch(event.target.value)}
                    placeholder="Search repositories"
                    className="mt-2 w-full rounded-md border border-[#cfd6df] px-3 py-2 outline-none focus:border-[#2f6fed]"
                  />
                  <div className="mt-2 max-h-56 overflow-auto rounded-md border border-[#d8dee4]">
                    {filteredRepositories.map((repo) => (
                      <label key={repo.id} className={`flex cursor-pointer items-start gap-3 border-b border-[#edf0f3] px-3 py-3 last:border-b-0 ${selectedRepo === repo.fullName ? "bg-[#f0f6ff]" : "bg-white hover:bg-[#f6f8fa]"}`}>
                        <input
                          type="radio"
                          name="githubRepo"
                          checked={selectedRepo === repo.fullName}
                          onChange={() => setSelectedRepo(repo.fullName)}
                          className="mt-1"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-2">
                            <span className="truncate text-sm font-semibold text-[#172026]">{repo.fullName}</span>
                            <span className="rounded bg-[#eef1f5] px-1.5 py-0.5 text-[11px] font-medium text-[#44505f]">{repo.private ? "private" : "public"}</span>
                          </span>
                          <span className="mt-1 block truncate text-xs text-[#667085]">{repo.language || "Repository"} - {repo.defaultBranch}</span>
                        </span>
                      </label>
                    ))}
                    {filteredRepositories.length === 0 ? <p className="px-3 py-4 text-sm text-[#667085]">No repositories match this search.</p> : null}
                  </div>
                </div>
              ) : (
                <p className="mt-3 rounded-md bg-[#f6f8fa] px-3 py-2 text-sm text-[#667085]">
                  Connect GitHub with OAuth to import repositories from your account.
                </p>
              )}

              <button disabled={isSubmitting} className="mt-3 w-full rounded-md bg-[#1f6feb] px-4 py-2.5 font-semibold text-white hover:bg-[#195fca] disabled:cursor-not-allowed disabled:opacity-60">
                Import selected repo and scan
              </button>
            </form>

            <form onSubmit={submitZip} className="mt-5 border-t border-[#edf0f3] pt-5">
              <label className="text-sm font-medium text-[#44505f]">Upload repository zip</label>
              <input type="file" accept=".zip" onChange={(event) => setZipFile(event.target.files?.[0] || null)} className="mt-2 w-full rounded-md border border-dashed border-[#b8c2cc] bg-[#fafbfc] px-3 py-3 text-sm" />
              <button disabled={isSubmitting} className="mt-3 w-full rounded-md border border-[#1f6feb] px-4 py-2.5 font-semibold text-[#1f6feb] hover:bg-[#f0f6ff] disabled:cursor-not-allowed disabled:opacity-60">
                Upload and scan
              </button>
            </form>

            {error ? <p className="mt-4 rounded-md border border-[#ffd0d0] bg-[#fff5f5] px-3 py-2 text-sm text-[#b42318]">{error}</p> : null}
          </div>

          <div className="rounded-lg border border-[#d8dee4] bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Recent jobs</h2>
              <button onClick={refreshJobs} className="rounded border border-[#cfd6df] px-3 py-1.5 text-sm font-medium hover:bg-[#f6f8fa]">Refresh</button>
            </div>
            <div className="mt-4 space-y-2">
              {jobs.map((job) => (
                <button key={job.id} onClick={() => setActiveJobId(job.id)} className={`w-full rounded-md border px-3 py-3 text-left transition ${activeJobId === job.id ? "border-[#1f6feb] bg-[#f0f6ff]" : "border-[#edf0f3] hover:border-[#cfd6df]"}`}>
                  <div className="flex items-center justify-between gap-3">
                    <span className="truncate text-sm font-semibold">{job.sourceLabel}</span>
                    <span className={`rounded px-2 py-1 text-xs font-semibold ${statusClass(job.status)}`}>{job.status}</span>
                  </div>
                  <p className="mt-1 text-xs uppercase tracking-[0.12em] text-[#667085]">{job.sourceType}</p>
                </button>
              ))}
              {jobs.length === 0 ? <p className="text-sm text-[#667085]">No scan jobs yet.</p> : null}
            </div>
          </div>
        </div>

        <div className="space-y-5">
          <div className="grid gap-4 md:grid-cols-4">
            <Metric label="Manifests" value={activeSummary?.total_manifests ?? 0} />
            <Metric label="Dependencies" value={activeSummary?.total_dependencies ?? 0} />
            <Metric label="Exposure score" value={activeSummary?.banking_exposure_score ?? 0} tone={exposureTone(activeSummary?.banking_action)} />
            <Metric label="Risk chains" value={activeSummary?.risk_chains ?? 0} tone={statusTone} />
          </div>

          <BankingIntelligencePanel summary={activeSummary} chains={riskChains} capabilities={capabilityFindings} namespaceRisks={namespaceRisks} />

          <BlastRadiusMap chains={riskChains} selectedChainId={selectedChainId} onSelect={setSelectedChainId} />

          <div className="rounded-lg border border-[#d8dee4] bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-xl font-semibold">Live execution log</h2>
                <p className="text-sm text-[#667085]">{activeJob ? activeJob.sourceLabel : "Select or start a scan"}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-md bg-[#eef1f5] px-3 py-1.5 text-sm font-semibold text-[#44505f]">{logs.length} events</span>
                {activeJob ? <span className={`rounded-md px-3 py-1.5 text-sm font-semibold ${statusClass(activeJob.status)}`}>{activeJob.status}</span> : null}
              </div>
            </div>
            <div className="mt-4 h-[560px] overflow-auto rounded-md bg-[#0f172a] p-5 font-mono text-xs text-[#d1d5db]">
              {logs.map((log) => (
                <div key={log.id} className="mb-4 border-l border-[#334155] pl-3">
                  <div>
                    <span className="text-[#7dd3fc]">{new Date(log.timestamp).toLocaleTimeString()}</span>{" "}
                    <span className={log.level === "error" ? "text-[#fca5a5]" : log.level === "success" ? "text-[#86efac]" : log.level === "warning" ? "text-[#fde68a]" : "text-[#cbd5e1]"}>
                      {log.level.toUpperCase()}
                    </span>{" "}
                    <span className="text-[#f8fafc]">{log.message}</span>
                  </div>
                </div>
              ))}
              {logs.length === 0 ? <span className="text-[#94a3b8]">Waiting for scan logs...</span> : null}
            </div>
          </div>

          <div className="rounded-lg border border-[#d8dee4] bg-white shadow-sm">
            <div className="border-b border-[#edf0f3] px-5 py-4">
              <h2 className="text-lg font-semibold">Findings and fixes</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="bg-[#f6f8fa] text-xs uppercase tracking-[0.12em] text-[#667085]">
                  <tr>
                    <th className="px-5 py-3">Package</th>
                    <th className="px-5 py-3">Severity</th>
                    <th className="px-5 py-3">Issue</th>
                    <th className="px-5 py-3">Fix</th>
                  </tr>
                </thead>
                <tbody>
                  {tableFindings.map((finding) => (
                    <tr key={`${finding.type}-${finding.id}-${finding.subject}`} className="border-t border-[#edf0f3]">
                      <td className="px-5 py-4">
                        <div className="font-semibold">{finding.subject}</div>
                        <div className="text-xs text-[#667085]">{finding.type} - {finding.detail}</div>
                      </td>
                      <td className="px-5 py-4"><span className={`rounded px-2 py-1 text-xs font-semibold ${severityClass(finding.severity)}`}>{finding.severity}</span></td>
                      <td className="max-w-sm px-5 py-4 text-[#44505f]">{finding.issue}</td>
                      <td className="px-5 py-4">
                        <div className="font-medium">{finding.fixTitle}</div>
                        <div className="text-xs text-[#667085]">{finding.fixDetail}</div>
                      </td>
                    </tr>
                  ))}
                  {tableFindings.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-5 py-8 text-center text-[#667085]">No findings to show yet.</td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function Metric({ label, value, tone = "idle" }: { label: string; value: number; tone?: string }) {
  return (
    <div className={`rounded-lg border bg-white p-5 shadow-sm ${tone === "failed" ? "border-[#f3b4b4]" : tone === "passed" ? "border-[#b7e4c7]" : "border-[#d8dee4]"}`}>
      <p className="text-sm font-medium text-[#667085]">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-[#111827]">{value}</p>
    </div>
  );
}

function BankingIntelligencePanel({
  summary,
  chains,
  capabilities,
  namespaceRisks,
}: {
  summary?: ScanResult["summary"];
  chains: RiskChain[];
  capabilities: NonNullable<ScanResult["capability_findings"]>;
  namespaceRisks: NonNullable<ScanResult["namespace_risks"]>;
}) {
  const topExposure = chains.map((chain) => chain.exposure).filter(Boolean).sort((a, b) => (b?.score || 0) - (a?.score || 0))[0] || null;
  const score = topExposure?.score ?? summary?.banking_exposure_score ?? 0;
  const action = topExposure?.action ?? summary?.banking_action ?? "track";
  const reasons = topExposure?.reasons || ["Run a scan to calculate route-level banking exposure."];

  return (
    <div className="rounded-lg border border-[#d8dee4] bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Banking intelligence decision</h2>
          <p className="mt-1 text-sm text-[#667085]">Combines exploitability, business criticality, provenance deficit, malicious capabilities, and blast radius.</p>
        </div>
        <div className={`rounded-md px-4 py-3 text-center ${actionClass(action)}`}>
          <p className="text-xs font-semibold uppercase tracking-[0.14em]">Decision</p>
          <p className="mt-1 text-2xl font-semibold">{action.toUpperCase()}</p>
          <p className="text-sm">Score {score}/100</p>
        </div>
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-[1.2fr_1fr_1fr]">
        <div className="rounded-md border border-[#edf0f3] bg-[#fafbfc] p-4">
          <p className="text-sm font-semibold text-[#172026]">Why this decision</p>
          <div className="mt-3 space-y-2">
            {reasons.slice(0, 5).map((reason) => (
              <p key={reason} className="rounded bg-white px-3 py-2 text-sm leading-6 text-[#44505f] shadow-sm">{reason}</p>
            ))}
          </div>
        </div>

        <div className="rounded-md border border-[#edf0f3] bg-[#fafbfc] p-4">
          <p className="text-sm font-semibold text-[#172026]">Suspicious capabilities</p>
          <div className="mt-3 space-y-2">
            {capabilities.slice(0, 4).map((finding) => (
              <EvidencePill key={finding.id} title={finding.capability} detail={formatLocation({ file_path: finding.file_path, line_number: finding.line_number })} severity={finding.severity} />
            ))}
            {capabilities.length === 0 ? <p className="text-sm text-[#667085]">No no-CVE capability fingerprints found.</p> : null}
          </div>
        </div>

        <div className="rounded-md border border-[#edf0f3] bg-[#fafbfc] p-4">
          <p className="text-sm font-semibold text-[#172026]">Registry trust</p>
          <div className="mt-3 space-y-2">
            {namespaceRisks.slice(0, 4).map((risk) => (
              <EvidencePill key={risk.id} title={risk.category} detail={risk.dependency_name || risk.file_path} severity={risk.severity} />
            ))}
            {namespaceRisks.length === 0 ? <p className="text-sm text-[#667085]">No namespace confusion or registry drift risk found.</p> : null}
          </div>
        </div>
      </div>

      {topExposure ? (
        <div className="mt-4 grid gap-3 md:grid-cols-3 xl:grid-cols-6">
          <ScoreBar label="Exploit" value={topExposure.exploit_likelihood} />
          <ScoreBar label="Static path" value={topExposure.static_exploitability} />
          <ScoreBar label="Business" value={topExposure.business_criticality} />
          <ScoreBar label="Trust" value={topExposure.trust_deficit} />
          <ScoreBar label="Capability" value={topExposure.malicious_capability} />
          <ScoreBar label="Blast radius" value={topExposure.blast_radius} />
        </div>
      ) : null}
    </div>
  );
}

function EvidencePill({ title, detail, severity }: { title: string; detail: string; severity: string }) {
  return (
    <div className="rounded bg-white px-3 py-2 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <p className="break-words text-sm font-semibold text-[#172026]">{title}</p>
        <span className={`shrink-0 rounded px-2 py-0.5 text-[11px] font-semibold ${severityClass(severity)}`}>{severity}</span>
      </div>
      <p className="mt-1 break-words text-xs text-[#667085]">{detail}</p>
    </div>
  );
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-[#edf0f3] bg-[#fafbfc] p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-[#44505f]">{label}</p>
        <p className="text-xs font-semibold text-[#172026]">{value}</p>
      </div>
      <div className="mt-2 h-2 rounded-full bg-[#e5e7eb]">
        <div className="h-2 rounded-full bg-[#1f6feb]" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
      </div>
    </div>
  );
}

function BlastRadiusMap({
  chains,
  selectedChainId,
  onSelect,
}: {
  chains: RiskChain[];
  selectedChainId: string;
  onSelect: (chainId: string) => void;
}) {
  const selectedChain = chains.find((chain) => chain.id === selectedChainId) || chains[0] || null;
  const trace = selectedChain?.trace && selectedChain.trace.length > 0 ? selectedChain.trace : fallbackTrace(selectedChain);
  const visibleContexts = selectedChain?.sensitive_contexts.slice(0, 5) || [];
  const routeSteps = trace.filter((step) => step.kind === "route");
  const manifestStep = trace.find((step) => step.kind === "manifest");
  const riskSteps = trace.filter((step) => step.kind === "risk");
  const importSteps = trace.filter((step) => step.kind === "import");
  const sensitiveSteps = trace.filter((step) => step.kind === "sensitive-use");

  return (
    <div className="rounded-lg border border-[#d8dee4] bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Dependency blast radius map</h2>
          <p className="text-sm text-[#667085]">Connectivity from risky dependency to banking-sensitive code paths.</p>
        </div>
        <span className="rounded-md bg-[#f0f6ff] px-3 py-1.5 text-sm font-semibold text-[#1f6feb]">{chains.length} chains</span>
      </div>

      {selectedChain ? (
        <div className="mt-5 grid gap-4 xl:grid-cols-[250px_1fr]">
          <div className="max-h-[360px] space-y-2 overflow-auto rounded-md border border-[#edf0f3] bg-[#fafbfc] p-2">
            {chains.map((chain) => (
              <button
                key={chain.id}
                onClick={() => onSelect(chain.id)}
                className={`w-full rounded-md border p-3 text-left transition ${selectedChain.id === chain.id ? "border-[#1f6feb] bg-white shadow-sm" : "border-transparent hover:border-[#cfd6df] hover:bg-white"}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[#172026]">{chain.dependency_name}</p>
                    <p className="mt-1 text-xs text-[#667085]">{chain.ecosystem}</p>
                  </div>
                  <span className={`shrink-0 rounded px-2 py-1 text-[11px] font-semibold ${severityClass(chain.severity)}`}>{chain.severity}</span>
                </div>
                <p className="mt-2 line-clamp-2 text-xs leading-5 text-[#44505f]">{chain.sensitive_contexts.join(", ")}</p>
              </button>
            ))}
          </div>

          <div className="space-y-4">
            <div className="grid gap-3 xl:grid-cols-[1fr_24px_1fr_24px_1fr_24px_1fr_24px_1fr] xl:items-stretch">
              <TraceColumn
                title="1. Route entry"
                accent="blue"
                steps={routeSteps}
                emptyText="No API route found in this file"
              />
              <FlowArrow />
              <TraceColumn
                title="2. Declared"
                accent="blue"
                steps={manifestStep ? [manifestStep] : []}
                emptyText="Manifest declaration not found"
              />
              <FlowArrow />
              <TraceColumn
                title="3. Risk"
                accent="amber"
                steps={riskSteps}
                emptyText="No CVE or hygiene risk attached"
              />
              <FlowArrow />
              <TraceColumn
                title="4. Imported"
                accent="green"
                steps={importSteps}
                emptyText="Import/reference not found"
              />
              <FlowArrow />
              <TraceColumn
                title="5. Sensitive use"
                accent="red"
                steps={sensitiveSteps}
                emptyText={visibleContexts.length > 0 ? visibleContexts.join(", ") : "No sensitive usage line found"}
              />
            </div>

            <div className="rounded-md border border-[#d8dee4] bg-white">
              <div className="border-b border-[#edf0f3] px-4 py-3">
                <p className="text-sm font-semibold text-[#172026]">Sequence trace</p>
              </div>
              <div className="divide-y divide-[#edf0f3]">
                {trace.map((step) => (
                  <TraceRow key={`${step.step}-${step.kind}-${step.file_path || step.label}`} step={step} />
                ))}
              </div>
            </div>

            <div className="rounded-md border border-[#d8dee4] bg-[#fafbfc] p-4">
              <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-sm font-semibold text-[#172026]">{selectedChain.title}</p>
                  <p className="mt-1 text-sm leading-6 text-[#44505f]">{selectedChain.fix.description}</p>
                </div>
                <span className="shrink-0 rounded-md bg-[#eef1f5] px-3 py-1.5 text-xs font-semibold text-[#44505f]">
                  {selectedChain.fix.auto_remediable ? "Auto fix ready" : "Manual review"}
                </span>
              </div>
              {selectedChain.fix.command ? (
                <code className="mt-3 block overflow-x-auto rounded bg-[#0f172a] px-3 py-2 text-xs text-[#d1d5db]">{selectedChain.fix.command}</code>
              ) : null}
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-5 rounded-md border border-dashed border-[#cfd6df] bg-[#fafbfc] px-4 py-8 text-center">
          <p className="font-medium text-[#44505f]">No blast-radius chains yet.</p>
          <p className="mt-1 text-sm text-[#667085]">Run a scan on a repo that uses dependencies inside auth, payments, KYC, PII, crypto, database, webhook, upload, or network code.</p>
        </div>
      )}
    </div>
  );
}

function TraceColumn({
  title,
  steps,
  accent,
  emptyText,
}: {
  title: string;
  steps: RiskChain["trace"];
  accent: "blue" | "amber" | "red" | "green";
  emptyText: string;
}) {
  const accentClass = {
    blue: "border-[#93c5fd] bg-[#eff6ff]",
    amber: "border-[#fcd34d] bg-[#fffbeb]",
    red: "border-[#fca5a5] bg-[#fff5f5]",
    green: "border-[#86efac] bg-[#f0fdf4]",
  }[accent];

  return (
    <div className={`min-h-[190px] rounded-lg border p-4 ${accentClass}`}>
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#667085]">{title}</p>
      <div className="mt-3 space-y-2">
        {steps && steps.length > 0 ? steps.slice(0, 3).map((step) => (
          <div key={`${title}-${step.step}-${step.file_path || step.label}`} className="rounded-md bg-white/85 px-3 py-2 shadow-sm">
            <p className="text-sm font-semibold leading-5 text-[#172026]">{step.label}</p>
            {step.file_path ? <p className="mt-1 break-words text-xs text-[#44505f]">{formatLocation(step)}</p> : null}
            {step.code ? <code className="mt-2 block break-words rounded bg-[#0f172a] px-2 py-1.5 text-[11px] leading-5 text-[#d1d5db]">{step.code}</code> : null}
          </div>
        )) : (
          <p className="break-words rounded-md bg-white/80 px-3 py-2 text-sm font-medium leading-5 text-[#44505f] shadow-sm">{emptyText}</p>
        )}
      </div>
    </div>
  );
}

function TraceRow({ step }: { step: NonNullable<RiskChain["trace"]>[number] }) {
  return (
    <div className="grid gap-3 px-4 py-3 md:grid-cols-[90px_1fr]">
      <div>
        <span className="rounded-md bg-[#eef1f5] px-2 py-1 text-xs font-semibold text-[#44505f]">Step {step.step}</span>
      </div>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-semibold text-[#172026]">{step.label}</p>
          <span className="rounded bg-[#f6f8fa] px-2 py-0.5 text-xs font-medium text-[#667085]">{step.kind}</span>
        </div>
        {step.file_path ? <p className="mt-1 break-words text-sm text-[#44505f]">{formatLocation(step)}</p> : null}
        {step.code ? <code className="mt-2 block overflow-x-auto rounded bg-[#0f172a] px-3 py-2 text-xs leading-5 text-[#d1d5db]">{step.code}</code> : null}
        {step.details.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {step.details.slice(0, 6).map((detail) => (
              <span key={`${step.step}-${detail}`} className="rounded bg-[#eef1f5] px-2 py-1 text-xs text-[#44505f]">{detail}</span>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function FlowArrow() {
  return (
    <div className="hidden items-center justify-center text-xl font-semibold text-[#94a3b8] xl:flex">
      -&gt;
    </div>
  );
}

function fallbackTrace(chain: RiskChain | null): NonNullable<RiskChain["trace"]> {
  if (!chain) return [];
  const trace: NonNullable<RiskChain["trace"]> = [
    {
      step: 1,
      kind: "manifest",
      label: "Dependency declared",
      file_path: chain.manifest_path,
      details: [chain.dependency_name, chain.ecosystem],
    },
  ];
  chain.risk_chain.forEach((line, index) => {
    trace.push({
      step: index + 2,
      kind: index === 0 ? "import" : "risk",
      label: line,
      file_path: chain.used_in_files[index] || null,
      code: chain.evidence[index] || null,
      details: chain.sensitive_contexts,
    });
  });
  return trace;
}

function formatLocation(step: { file_path?: string | null; line_number?: number | null }) {
  if (!step.file_path) return "";
  return step.line_number ? `${shortFileName(step.file_path)}:${step.line_number}` : shortFileName(step.file_path);
}

function shortFileName(path: string) {
  const parts = path.replace(/\\/g, "/").split("/").filter(Boolean);
  return parts.slice(-2).join("/") || path;
}

function statusClass(status: JobStatus) {
  if (status === "completed") return "bg-[#effaf3] text-[#176b3a]";
  if (status === "failed") return "bg-[#fff5f5] text-[#b42318]";
  if (status === "running") return "bg-[#fff8eb] text-[#8a5200]";
  return "bg-[#eef1f5] text-[#44505f]";
}

function exposureTone(action?: string) {
  if (action === "block" || action === "expedite") return "failed";
  if (action === "track") return "passed";
  return "idle";
}

function actionClass(action: string) {
  if (action === "block") return "border border-[#f3b4b4] bg-[#fff5f5] text-[#991b1b]";
  if (action === "expedite") return "border border-[#fcd34d] bg-[#fffbeb] text-[#92400e]";
  if (action === "watch") return "border border-[#bfdbfe] bg-[#eff6ff] text-[#1d4ed8]";
  return "border border-[#b7e4c7] bg-[#effaf3] text-[#176b3a]";
}

function severityClass(severity: string) {
  if (severity === "critical") return "bg-[#7f1d1d] text-white";
  if (severity === "high") return "bg-[#fee2e2] text-[#991b1b]";
  if (severity === "medium") return "bg-[#fef3c7] text-[#92400e]";
  if (severity === "low") return "bg-[#dcfce7] text-[#166534]";
  return "bg-[#e5e7eb] text-[#374151]";
}
