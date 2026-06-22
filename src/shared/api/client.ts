import { getCookie, deleteCookie } from "cookies-next";

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

/**
 * Fetch wrapper that intercepts 401 responses and redirects to login.
 */
async function apiFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const response = await fetch(url, options);
  
  if (response.status === 401) {
    // Clear cookies and redirect
    deleteCookie("auth_token");
    deleteCookie("bugbusters_github_session");
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
    throw new Error("Unauthorized");
  }
  
  return response;
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
  githubSession: string,
  options?: { email?: string; includeDev?: boolean; useOsv?: boolean; failOn?: string }
): Promise<any> {
  const response = await apiFetch(`${API_BASE_URL}/api/scans/github`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-github-session": githubSession,
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

export async function fetchJobStatus(jobId: string): Promise<any> {
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
  githubSession: string,
  options?: { email?: string; includeLow?: boolean; failOn?: string }
): Promise<any> {
  const response = await apiFetch(`${API_BASE_URL}/api/config-scans/github`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-github-session": githubSession,
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

export async function fetchConfigJobStatus(jobId: string): Promise<any> {
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
