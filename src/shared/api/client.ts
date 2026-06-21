const API_BASE_URL = "http://127.0.0.1:5000";

export function getGithubConnectUrl(): string {
  return `${API_BASE_URL}/api/github/oauth/start`;
}

export async function fetchGithubUser(githubSession: string): Promise<any> {
  const response = await fetch(`${API_BASE_URL}/api/github/session`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-github-session": githubSession,
    },
  });
  if (!response.ok) throw new Error("Not authenticated");
  return response.json();
}

export async function fetchGithubRepos(githubSession: string): Promise<any> {
  const response = await fetch(`${API_BASE_URL}/api/github/repositories`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-github-session": githubSession,
    },
  });
  if (!response.ok) throw new Error("Failed to fetch repos");
  return response.json();
}

export async function startGithubScan(repoFullName: string, repoCloneUrl: string, githubSession: string): Promise<any> {
  const response = await fetch(`${API_BASE_URL}/api/scans/github`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-github-session": githubSession,
    },
    body: JSON.stringify({ repoFullName, repoCloneUrl, githubSession }),
  });
  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.message || "Failed to start scan");
  }
  return response.json();
}

export async function uploadZipScan(file: File): Promise<any> {
  const formData = new FormData();
  formData.append("repoZip", file);

  const response = await fetch(`${API_BASE_URL}/api/scans/zip`, {
    method: "POST",
    body: formData,
  });
  if (!response.ok) throw new Error("Failed to upload and scan ZIP");
  return response.json();
}

export async function fetchScanJobs(): Promise<any> {
  const response = await fetch(`${API_BASE_URL}/api/scans`);
  if (!response.ok) throw new Error("Failed to fetch jobs");
  return response.json();
}

export async function fetchJobStatus(jobId: string): Promise<any> {
  const response = await fetch(`${API_BASE_URL}/api/scans/${jobId}`);
  if (!response.ok) throw new Error("Failed to fetch job status");

  return response.json();
}
