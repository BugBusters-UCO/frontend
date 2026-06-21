import React, { useRef } from "react";
import { GithubRepository, GithubUser } from "@/shared/api/types";

interface ScanConfigProps {
  githubUser: GithubUser | null;
  repos: GithubRepository[];
  selectedRepo: string;
  setSelectedRepo: (repo: string) => void;
  isConnectingGithub: boolean;
  onConnectGithub: () => void;
  onUploadZip: (file: File) => void;
  onStartScan: () => void;
  isScanning: boolean;
  error: string | null;
}

export function ScanConfig({
  githubUser,
  repos,
  selectedRepo,
  setSelectedRepo,
  isConnectingGithub,
  onConnectGithub,
  onUploadZip,
  onStartScan,
  isScanning,
  error,
}: ScanConfigProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUploadZip(file);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-border-subtle shadow-sm p-card-padding flex flex-col h-full">
      <h2 className="text-section-header font-section-header mb-4">
        Scan Configuration
      </h2>
      <div className="space-y-6 flex-1">
        {/* Source Selection */}
        <div>
          <label className="block text-body-sm font-semibold mb-2">
            Source Repository
          </label>
          {githubUser ? (
            <div className="border border-border-subtle rounded-lg p-3 bg-surface-container-lowest flex flex-col gap-3 mb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <img
                    src={githubUser.avatarUrl}
                    alt={githubUser.login}
                    className="w-6 h-6 rounded-full"
                  />
                  <div>
                    <div className="text-body-sm font-medium">
                      {githubUser.login}
                    </div>
                    <div className="text-body-xs text-text-muted">
                      Connected to GitHub
                    </div>
                  </div>
                </div>
              </div>
              <select
                className="w-full border border-border-subtle rounded-lg p-2 text-body-sm outline-none"
                value={selectedRepo}
                onChange={(e) => setSelectedRepo(e.target.value)}
              >
                <option value="">Select a repository...</option>
                {repos.map((repo) => (
                  <option key={repo.id} value={repo.fullName}>
                    {repo.fullName}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="border border-border-subtle rounded-lg p-3 bg-surface-container-lowest flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-text-secondary">
                  code
                </span>
                <div>
                  <div className="text-body-sm font-medium">GitHub</div>
                  <div className="text-body-xs text-text-muted">
                    Not connected
                  </div>
                </div>
              </div>
              <button
                onClick={onConnectGithub}
                disabled={isConnectingGithub}
                className="text-primary-container text-body-sm hover:underline disabled:opacity-50"
              >
                {isConnectingGithub ? "Connecting..." : "Connect"}
              </button>
            </div>
          )}

          <div className="text-center text-body-xs text-text-muted my-2">OR</div>

          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-border-subtle rounded-lg p-6 bg-surface-container-low text-center hover:bg-surface-container-highest transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-text-muted text-3xl mb-2">
              upload_file
            </span>
            <div className="text-body-sm font-medium">
              Upload Archive (ZIP, TAR)
            </div>
            <div className="text-body-xs text-text-muted mt-1">
              Max size: 500MB
            </div>
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept=".zip,.tar,.tar.gz"
              onChange={handleFileChange}
            />
          </div>
        </div>

        <hr className="border-border-divider" />

        {/* Scan Options */}
        <div>
          <label className="block text-body-sm font-semibold mb-3">
            Scan Parameters
          </label>
          <div className="space-y-3">
            <label className="flex items-center gap-2 cursor-pointer group">
              <input
                type="checkbox"
                defaultChecked
                className="rounded border-border-subtle text-primary-container focus:ring-primary-container h-4 w-4"
              />
              <span className="text-body-sm group-hover:text-text-primary transition-colors">
                Include Dev Dependencies
              </span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer group">
              <input
                type="checkbox"
                defaultChecked
                className="rounded border-border-subtle text-primary-container focus:ring-primary-container h-4 w-4"
              />
              <span className="text-body-sm group-hover:text-text-primary transition-colors">
                Query OSV Database
              </span>
            </label>
          </div>
        </div>

        <div>
          <label className="block text-body-sm font-semibold mb-2">
            Failure Threshold
          </label>
          <select className="w-full border border-border-subtle rounded-lg p-2 text-body-sm focus:border-primary-container focus:ring-1 focus:ring-primary-container outline-none bg-white">
            <option>High or Critical</option>
            <option>Critical Only</option>
            <option>Any Severity</option>
            <option>Never Fail</option>
          </select>
        </div>

        {error && (
          <div className="p-3 bg-error-container text-on-error-container text-sm rounded-md border border-[#ffb4ab]">
            {error}
          </div>
        )}
      </div>

      <button
        onClick={onStartScan}
        disabled={isScanning || (!selectedRepo && githubUser !== null)}
        className="w-full bg-primary-container text-white py-2 px-4 rounded-lg font-body-sm hover:bg-[#195fca] transition-colors mt-6 disabled:opacity-50"
      >
        {isScanning ? "Scanning..." : "Start Full Scan"}
      </button>
    </div>
  );
}
