import { getCookie, deleteCookie } from "cookies-next";
import type { AgentScanJob, BusinessRiskContext, RiskAssessment, RiskOverview, ScanJob, ScheduledScan, ScannerModule, VmAgent } from "@/shared/api/types";

const API_BASE_URL = "http://127.0.0.1:5000";

/**
 * Helper to get authorization headers
 */
function getAuthHeaders(): Record<string, string> {
  const token = getCookie("auth_token");
  if (!token) return {};
  return {
    Authorization: `Bearer ${token}`,
  };
}

import axios from "axios";

const globalApiCache = new Map<string, { response: Response; time: number }>();
const CACHE_TTL = 30000; // 30 seconds caching for fast UI navigation

/**
 * Axios wrapper that mimics fetch API to minimize refactoring,
 * but uses axios under the hood.
 */
async function apiFetch(url: string, options: any = {}): Promise<any> {
  try {
    const response = await axios({
      url,
      method: options.method || "GET",
      headers: options.headers,
      data: options.body,
    });
    return {
      ok: true,
      status: response.status,
      json: async () => response.data,
    };
  } catch (error: any) {
    if (error.response?.status === 401) {
      deleteCookie("auth_token");
      deleteCookie("bugbusters_github_session");
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
      throw new Error("Unauthorized");
    }
    if (error.response) {
      return {
        ok: false,
        status: error.response.status,
        json: async () => error.response.data,
      };
    }
    throw error;
  }
}

// ------------------------------------------------------------------
// Auth
// ------------------------------------------------------------------

export async function registerUser(data: any): Promise<any> {
  const response = await apiFetch(`${API_BASE_URL}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.message || "Failed to register");
  }
  return response.json();
}

export async function loginUser(data: any): Promise<any> {
  const response = await apiFetch(`${API_BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.message || "Failed to login");
  }
  return response.json();
}

export async function fetchCurrentUser(): Promise<any> {
  const response = await apiFetch(`${API_BASE_URL}/api/auth/me`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    throw new Error("Not authenticated");
  }
  return response.json();
}

// ------------------------------------------------------------------
// GitHub OAuth
// ------------------------------------------------------------------

export function getGithubConnectUrl(): string {
  const token = getCookie("auth_token");
  return `${API_BASE_URL}/api/github/oauth/start?authToken=${token || ""}`;
}

export async function fetchGithubUser(githubSession: string): Promise<any> {
  const response = await apiFetch(`${API_BASE_URL}/api/github/session`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-github-session": githubSession,
      ...getAuthHeaders(),
    },
  });
  if (!response.ok) throw new Error("Not authenticated with GitHub");
  return response.json();
}

export async function fetchGithubRepos(githubSession: string): Promise<any> {
  const response = await apiFetch(`${API_BASE_URL}/api/github/repositories`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-github-session": githubSession,
      ...getAuthHeaders(),
    },
  });
  if (!response.ok) throw new Error("Failed to fetch repos");
  return response.json();
}

// ------------------------------------------------------------------
// Dependency Scanner
// ------------------------------------------------------------------

export async function startGithubScan(
  repoFullName: string,
  repoCloneUrl: string,
  githubSession?: string,
  options?: { email?: string; includeDev?: boolean; useOsv?: boolean; failOn?: string }
): Promise<any> {
  const response = await apiFetch(`${API_BASE_URL}/api/scans/github`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(githubSession ? { "x-github-session": githubSession } : {}),
      ...getAuthHeaders(),
    },
    body: JSON.stringify({ repoFullName, repoCloneUrl, githubSession, ...options }),
  });
  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.message || "Failed to start scan");
  }
  return response.json();
}

export async function uploadZipScan(
  file: File,
  options?: { email?: string; includeDev?: boolean; useOsv?: boolean; failOn?: string }
): Promise<any> {
  const formData = new FormData();
  formData.append("repoZip", file);
  if (options?.email) formData.append("email", options.email);
  if (options?.includeDev !== undefined) formData.append("includeDev", String(options.includeDev));
  if (options?.useOsv !== undefined) formData.append("useOsv", String(options.useOsv));
  if (options?.failOn) formData.append("failOn", options.failOn);

  const response = await apiFetch(`${API_BASE_URL}/api/scans/zip`, {
    method: "POST",
    headers: getAuthHeaders(), // multipart/form-data doesn't need Content-Type header set explicitly with fetch
    body: formData,
  });
  if (!response.ok) throw new Error("Failed to upload and scan ZIP");
  return response.json();
}

export async function fetchScanJobs(): Promise<any> {
  const response = await apiFetch(`${API_BASE_URL}/api/scans`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) throw new Error("Failed to fetch jobs");
  return response.json();
}

export async function fetchJobStatus(jobId: string, forceRefresh = false): Promise<any> {
  const response = await apiFetch(`${API_BASE_URL}/api/scans/${jobId}`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) throw new Error("Failed to fetch job status");
  return response.json();
}

export function getScanLogsUrl(jobId: string): string {
  const token = getCookie("auth_token");
  return `${API_BASE_URL}/api/scans/${jobId}/logs?authToken=${token || ""}`;
}

// ------------------------------------------------------------------
// Config Scanner
// ------------------------------------------------------------------

export async function startConfigGithubScan(
  repoFullName: string,
  repoCloneUrl: string,
  githubSession?: string,
  options?: { email?: string; includeLow?: boolean; failOn?: string }
): Promise<any> {
  const response = await apiFetch(`${API_BASE_URL}/api/config-scans/github`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(githubSession ? { "x-github-session": githubSession } : {}),
      ...getAuthHeaders(),
    },
    body: JSON.stringify({ repoFullName, repoCloneUrl, githubSession, ...options }),
  });
  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.message || "Failed to start config scan");
  }
  return response.json();
}

export async function uploadConfigZipScan(
  file: File,
  options?: { email?: string; includeLow?: boolean; failOn?: string }
): Promise<any> {
  const formData = new FormData();
  formData.append("repoZip", file);
  if (options?.email) formData.append("email", options.email);
  if (options?.includeLow !== undefined) formData.append("includeLow", String(options.includeLow));
  if (options?.failOn) formData.append("failOn", options.failOn);

  const response = await apiFetch(`${API_BASE_URL}/api/config-scans/zip`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: formData,
  });
  if (!response.ok) throw new Error("Failed to upload and scan config ZIP");
  return response.json();
}

export async function fetchConfigScanJobs(): Promise<any> {
  const response = await apiFetch(`${API_BASE_URL}/api/config-scans`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) throw new Error("Failed to fetch config jobs");
  return response.json();
}

export async function fetchConfigJobStatus(jobId: string, forceRefresh = false): Promise<any> {
  const response = await apiFetch(`${API_BASE_URL}/api/config-scans/${jobId}`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) throw new Error("Failed to fetch config job status");
  return response.json();
}

export function getConfigScanLogsUrl(jobId: string): string {
  const token = getCookie("auth_token");
  return `${API_BASE_URL}/api/config-scans/${jobId}/logs?authToken=${token || ""}`;
}

// ------------------------------------------------------------------
// Secret Scanner
// ------------------------------------------------------------------

export async function startSecretGithubScan(
  repoFullName: string,
  repoCloneUrl: string,
  githubSession?: string,
  options?: { email?: string; includeLow?: boolean; failOn?: string }
): Promise<any> {
  const response = await apiFetch(`${API_BASE_URL}/api/secret-scans/github`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(githubSession ? { "x-github-session": githubSession } : {}),
      ...getAuthHeaders(),
    },
    body: JSON.stringify({ repoFullName, repoCloneUrl, githubSession, ...options }),
  });
  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.message || "Failed to start secret scan");
  }
  return response.json();
}

export async function uploadSecretZipScan(
  file: File,
  options?: { email?: string; includeLow?: boolean; failOn?: string }
): Promise<any> {
  const formData = new FormData();
  formData.append("repoZip", file);
  if (options?.email) formData.append("email", options.email);
  if (options?.includeLow !== undefined) formData.append("includeLow", String(options.includeLow));
  if (options?.failOn) formData.append("failOn", options.failOn);

  const response = await apiFetch(`${API_BASE_URL}/api/secret-scans/zip`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: formData,
  });
  if (!response.ok) throw new Error("Failed to upload and scan secrets ZIP");
  return response.json();
}

export async function fetchSecretScanJobs(): Promise<any> {
  const response = await apiFetch(`${API_BASE_URL}/api/secret-scans`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) throw new Error("Failed to fetch secret jobs");
  return response.json();
}

export async function fetchSecretJobStatus(jobId: string, forceRefresh = false): Promise<any> {
  const response = await apiFetch(`${API_BASE_URL}/api/secret-scans/${jobId}`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) throw new Error("Failed to fetch secret job status");
  return response.json();
}

export function getSecretScanLogsUrl(jobId: string): string {
  const token = getCookie("auth_token");
  return `${API_BASE_URL}/api/secret-scans/${jobId}/logs?authToken=${token || ""}`;
}

// ------------------------------------------------------------------
// Pre-Deployment Cipher Scanner
// ------------------------------------------------------------------

export async function startCipherGithubScan(
  repoFullName: string,
  repoCloneUrl: string,
  githubSession?: string,
  options?: { email?: string; includeLow?: boolean; failOn?: string; bankingProfile?: string }
): Promise<ScanJob> {
  const response = await apiFetch(`${API_BASE_URL}/api/cipher-scans/github`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(githubSession ? { "x-github-session": githubSession } : {}),
      ...getAuthHeaders(),
    },
    body: JSON.stringify({ repoFullName, repoCloneUrl, githubSession, ...options }),
  });
  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.message || "Failed to start cipher scan");
  }
  return response.json();
}

export async function uploadCipherZipScan(
  file: File,
  options?: { email?: string; includeLow?: boolean; failOn?: string; bankingProfile?: string }
): Promise<ScanJob> {
  const formData = new FormData();
  formData.append("repoZip", file);
  if (options?.email) formData.append("email", options.email);
  if (options?.includeLow !== undefined) formData.append("includeLow", String(options.includeLow));
  if (options?.failOn) formData.append("failOn", options.failOn);
  if (options?.bankingProfile) formData.append("bankingProfile", options.bankingProfile);

  const response = await apiFetch(`${API_BASE_URL}/api/cipher-scans/zip`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: formData,
  });
  if (!response.ok) throw new Error("Failed to upload and scan cipher ZIP");
  return response.json();
}

export async function fetchCipherScanJobs(): Promise<ScanJob[]> {
  const response = await apiFetch(`${API_BASE_URL}/api/cipher-scans`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) throw new Error("Failed to fetch cipher jobs");
  return response.json();
}

export async function fetchCipherJobStatus(jobId: string, forceRefresh = false): Promise<ScanJob> {
  const response = await apiFetch(`${API_BASE_URL}/api/cipher-scans/${jobId}`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) throw new Error("Failed to fetch cipher job status");
  return response.json();
}

export function getCipherScanLogsUrl(jobId: string): string {
  const token = getCookie("auth_token");
  return `${API_BASE_URL}/api/cipher-scans/${jobId}/logs?authToken=${token || ""}`;
}

// ------------------------------------------------------------------
// VM Agent / OS-level Scanning
// ------------------------------------------------------------------

export async function fetchAgents(): Promise<VmAgent[]> {
  const response = await apiFetch(`${API_BASE_URL}/api/agents`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) throw new Error("Failed to fetch VM agents");
  return response.json();
}

export async function fetchAgentInventory(agentId: string): Promise<{ agent: VmAgent; inventory: NonNullable<VmAgent["inventory"]> }> {
  const response = await apiFetch(`${API_BASE_URL}/api/agents/${agentId}/inventory`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) throw new Error("Failed to fetch agent inventory");
  return response.json();
}

export async function fetchAgentScanReports(): Promise<AgentScanJob[]> {
  const response = await apiFetch(`${API_BASE_URL}/api/agents/scan-reports`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) throw new Error("Failed to fetch agent scan reports");
  return response.json();
}

export async function startAgentScan(
  agentId: string,
  data: {
    projectName?: string;
    scope: "full-os" | "root" | "selected" | "application";
    paths: string[];
    modules: Array<"dependency" | "config" | "secret" | "cipher">;
    maxDepth?: number;
  }
): Promise<AgentScanJob> {
  const response = await apiFetch(`${API_BASE_URL}/api/agents/${agentId}/scans`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...getAuthHeaders() },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.message || "Failed to start VM agent scan");
  }
  return response.json();
}

export async function fetchAgentScan(scanId: string): Promise<AgentScanJob> {
  const response = await apiFetch(`${API_BASE_URL}/api/agents/scans/${scanId}`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) throw new Error("Failed to fetch VM scan");
  return response.json();
}

export async function stopAgentScan(scanId: string): Promise<AgentScanJob> {
  const response = await apiFetch(`${API_BASE_URL}/api/agents/scans/${scanId}/stop`, {
    method: "POST",
    headers: getAuthHeaders(),
  });
  if (!response.ok) throw new Error("Failed to stop VM scan");
  return response.json();
}

export function getAgentScanLogsUrl(scanId: string): string {
  const token = getCookie("auth_token");
  return `${API_BASE_URL}/api/agents/scans/${scanId}/logs?authToken=${token || ""}`;
}

export async function fetchImportedGithubRepos(): Promise<any> {
  const response = await apiFetch(`${API_BASE_URL}/api/github/repositories`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) throw new Error("Failed to fetch imported repos");
  return response.json();
}

// ------------------------------------------------------------------
// Unified Risk Engine
// ------------------------------------------------------------------

export async function fetchRiskOverview(data: {
  sourceLabel?: string | null;
  businessContext?: BusinessRiskContext;
} = {}): Promise<RiskOverview> {
  const response = await apiFetch(`${API_BASE_URL}/api/risk/overview`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...getAuthHeaders() },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.message || "Failed to fetch unified risk overview");
  }
  return response.json();
}

export async function createRiskAssessment(data: {
  sourceType: "github" | "zip" | "local" | "vm-agent";
  sourceLabel: string;
  scanJobIds?: string[];
  agentScanJobIds?: string[];
  businessContext?: BusinessRiskContext;
  weights?: { technical?: number; business?: number };
}): Promise<RiskAssessment> {
  const response = await apiFetch(`${API_BASE_URL}/api/risk/assessments`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...getAuthHeaders() },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.message || "Failed to create risk assessment");
  }
  return response.json();
}

export async function generateRiskAssessmentRemedies(
  assessmentId: string,
  data: { findingIds?: string[]; limit?: number } = {}
): Promise<RiskAssessment> {
  const response = await apiFetch(`${API_BASE_URL}/api/risk/assessments/${assessmentId}/remedies`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...getAuthHeaders() },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.message || "Failed to generate AI remedies");
  }
  return response.json();
}

export async function fetchRiskAssessments(): Promise<RiskAssessment[]> {
  const response = await apiFetch(`${API_BASE_URL}/api/risk/assessments`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) throw new Error("Failed to fetch risk assessments");
  return response.json();
}

export async function fetchRiskAssessment(assessmentId: string): Promise<RiskAssessment> {
  const response = await apiFetch(`${API_BASE_URL}/api/risk/assessments/${assessmentId}`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) throw new Error("Failed to fetch risk assessment");
  return response.json();
}

export async function connectVmAgent(token: string): Promise<any> {
  const response = await apiFetch(`${API_BASE_URL}/api/agents/connect`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...getAuthHeaders() },
    body: JSON.stringify({ token }),
  });
  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || errData.message || "Failed to connect VM agent");
  }
  return response.json();
}

export async function disconnectVmAgent(): Promise<any> {
  const response = await apiFetch(`${API_BASE_URL}/api/agents/disconnect`, {
    method: "POST",
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || errData.message || "Failed to disconnect VM agent");
  }
  return response.json();
}

// ------------------------------------------------------------------
// Scheduled scans
// ------------------------------------------------------------------

export async function fetchScheduledScans(): Promise<ScheduledScan[]> {
  const response = await apiFetch(`${API_BASE_URL}/api/scheduled-scans`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) throw new Error("Failed to fetch scheduled scans");
  return response.json();
}

export async function createScheduledScan(data: {
  name: string;
  importedRepositoryId: string;
  scanners: ScannerModule[];
  frequency: "daily" | "weekly" | "monthly";
  timeOfDay: string;
  timesPerDay: number;
  weekdays?: number[];
  monthDays?: number[];
  timezone?: string;
  businessContext?: BusinessRiskContext;
  reportEmail?: string;
  enabled?: boolean;
}): Promise<ScheduledScan> {
  const response = await apiFetch(`${API_BASE_URL}/api/scheduled-scans`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...getAuthHeaders() },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.message || "Failed to create scheduled scan");
  }
  return response.json();
}

export async function updateScheduledScan(scheduleId: string, data: Partial<ScheduledScan>): Promise<ScheduledScan> {
  const response = await apiFetch(`${API_BASE_URL}/api/scheduled-scans/${scheduleId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...getAuthHeaders() },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.message || "Failed to update scheduled scan");
  }
  return response.json();
}

export async function deleteScheduledScan(scheduleId: string): Promise<{ deleted: boolean }> {
  const response = await apiFetch(`${API_BASE_URL}/api/scheduled-scans/${scheduleId}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });
  if (!response.ok) throw new Error("Failed to delete scheduled scan");
  return response.json();
}

export async function runScheduledScanNow(scheduleId: string): Promise<ScheduledScan> {
  const response = await apiFetch(`${API_BASE_URL}/api/scheduled-scans/${scheduleId}/run-now`, {
    method: "POST",
    headers: getAuthHeaders(),
  });
  if (!response.ok) throw new Error("Failed to run scheduled scan");
  return response.json();
}
