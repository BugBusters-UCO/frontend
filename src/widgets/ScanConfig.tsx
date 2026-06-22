import React, { useRef } from "react";
import { GithubRepository, GithubUser } from "@/shared/api/types";
import { CustomSelect } from "./CustomSelect";

interface ScanConfigProps {
  githubUser: GithubUser | null;
  repos: GithubRepository[];
  selectedRepo: string;
  setSelectedRepo: (repo: string) => void;
  isConnectingGithub: boolean;
  onConnectGithub: () => void;
  onDisconnectGithub: () => void;
  onUploadZip: (file: File) => void;
  onStartScan: () => void;
  isScanning: boolean;
  error: string | null;
  scanOptions: { includeDev: boolean; useOsv: boolean; failOn: string; includeLow: boolean };
  setScanOptions: (options: any) => void;
}

export function ScanConfig({
  githubUser,
  repos,
  selectedRepo,
  setSelectedRepo,
  isConnectingGithub,
  onConnectGithub,
  onDisconnectGithub,
  onUploadZip,
  onStartScan,
  isScanning,
  error,
  scanOptions,
  setScanOptions,
}: ScanConfigProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUploadZip(file);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-border-subtle shadow-sm p-6 flex flex-col h-full relative overflow-hidden">
      {/* Decorative background element */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-primary-container/5 rounded-bl-[100px] -z-10"></div>
      
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-primary-container/10 flex items-center justify-center">
          <span className="material-symbols-outlined text-primary-container">rocket_launch</span>
        </div>
        <div>
          <h2 className="text-section-header font-bold text-text-primary">
            New Scan
          </h2>
          <p className="text-body-xs text-text-secondary mt-0.5">Configure target and parameters</p>
        </div>
      </div>

      <div className="space-y-8 flex-1">
        {/* Source Selection Area */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px] text-text-muted">my_location</span>
            <h3 className="text-sm font-semibold text-text-primary uppercase tracking-wider">Target</h3>
          </div>
          
          <div className="bg-surface-container-lowest rounded-xl border border-border-subtle p-1 shadow-sm">
            {githubUser ? (
              <div className="p-3">
                <div className="flex items-center justify-between mb-3 px-1">
                  <div className="flex items-center gap-2.5">
                    <img
                      src={githubUser.avatarUrl}
                      alt={githubUser.login}
                      className="w-7 h-7 rounded-full shadow-sm"
                    />
                    <div>
                      <div className="text-body-sm font-semibold text-text-primary leading-none">
                        {githubUser.login}
                      </div>
                      <div className="text-[11px] text-text-muted mt-1 flex items-center gap-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-severity-low"></div>
                        Connected to GitHub
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={onDisconnectGithub}
                    title="Disconnect GitHub"
                    className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium text-text-muted hover:text-error hover:bg-error-container/20 rounded-lg transition-colors border border-transparent"
                  >
                    <span className="material-symbols-outlined text-[14px]">link_off</span>
                    Disconnect
                  </button>
                </div>
                <CustomSelect
                  options={repos.map((r) => ({ label: r.fullName, value: r.fullName }))}
                  value={selectedRepo}
                  onChange={setSelectedRepo}
                  placeholder="Select a repository..."
                />
              </div>
            ) : (
              <div className="p-4 flex flex-col items-center justify-center text-center">
                <div className="w-12 h-12 rounded-full bg-surface-container-highest flex items-center justify-center mb-3">
                  <span className="material-symbols-outlined text-text-secondary text-2xl">
                    code
                  </span>
                </div>
                <div className="text-body-sm font-medium text-text-primary mb-1">GitHub Integration</div>
                <div className="text-body-xs text-text-muted mb-4 max-w-[200px]">
                  Connect your GitHub account to scan repositories directly
                </div>
                <button
                  onClick={onConnectGithub}
                  disabled={isConnectingGithub}
                  className="px-5 py-2 bg-surface-container-high hover:bg-surface-container-highest text-text-primary font-medium rounded-lg transition-colors text-body-sm shadow-sm flex items-center gap-2 disabled:opacity-50"
                >
                  {isConnectingGithub ? "Connecting..." : "Connect GitHub"}
                  {!isConnectingGithub && <span className="material-symbols-outlined text-[16px]">arrow_forward</span>}
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-4">
            <div className="h-px bg-border-divider flex-1"></div>
            <span className="text-[11px] font-semibold text-text-muted uppercase tracking-widest">or</span>
            <div className="h-px bg-border-divider flex-1"></div>
          </div>

          <div
            onClick={() => fileInputRef.current?.click()}
            className="group relative border-2 border-dashed border-border-subtle rounded-xl p-5 bg-surface-container-lowest text-center hover:border-primary-container hover:bg-primary-container/5 transition-all cursor-pointer overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-primary-container/0 to-primary-container/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <span className="material-symbols-outlined text-text-muted group-hover:text-primary-container text-3xl mb-2 transition-colors duration-300 group-hover:-translate-y-1 transform">
              cloud_upload
            </span>
            <div className="text-body-sm font-medium text-text-primary group-hover:text-primary-container transition-colors">
              Upload Local Archive
            </div>
            <div className="text-[11px] text-text-muted mt-1.5">
              Supports .zip, .tar, .tar.gz (Max: 500MB)
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

        {/* Settings Area */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px] text-text-muted">tune</span>
            <h3 className="text-sm font-semibold text-text-primary uppercase tracking-wider">Settings</h3>
          </div>

          <div className="bg-surface-container-lowest border border-border-subtle rounded-xl p-4 shadow-sm space-y-1">
            
            <label className="flex items-center justify-between cursor-pointer group py-2.5 border-b border-border-divider last:border-0">
              <div>
                <span className="block text-body-sm font-medium text-text-primary group-hover:text-primary-container transition-colors">
                  Dev Dependencies
                </span>
                <span className="text-[11px] text-text-muted">Scan devDependencies for vulnerabilities</span>
              </div>
              <div className="relative ml-4 shrink-0">
                <input type="checkbox" className="sr-only peer" checked={scanOptions.includeDev} onChange={(e) => setScanOptions({ ...scanOptions, includeDev: e.target.checked })} />
                <div className="w-9 h-5 bg-surface-container-high peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary-container shadow-inner"></div>
              </div>
            </label>

            <label className="flex items-center justify-between cursor-pointer group py-2.5 border-b border-border-divider last:border-0">
              <div>
                <span className="block text-body-sm font-medium text-text-primary group-hover:text-primary-container transition-colors">
                  Query OSV Database
                </span>
                <span className="text-[11px] text-text-muted">Fetch latest open-source vulnerability data</span>
              </div>
              <div className="relative ml-4 shrink-0">
                <input type="checkbox" className="sr-only peer" checked={scanOptions.useOsv} onChange={(e) => setScanOptions({ ...scanOptions, useOsv: e.target.checked })} />
                <div className="w-9 h-5 bg-surface-container-high peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary-container shadow-inner"></div>
              </div>
            </label>

            <label className="flex items-center justify-between cursor-pointer group py-2.5 border-b border-border-divider last:border-0">
              <div>
                <span className="block text-body-sm font-medium text-text-primary group-hover:text-primary-container transition-colors">
                  Low Severity Configs
                </span>
                <span className="text-[11px] text-text-muted">Include minor configuration findings</span>
              </div>
              <div className="relative ml-4 shrink-0">
                <input type="checkbox" className="sr-only peer" checked={scanOptions.includeLow} onChange={(e) => setScanOptions({ ...scanOptions, includeLow: e.target.checked })} />
                <div className="w-9 h-5 bg-surface-container-high peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary-container shadow-inner"></div>
              </div>
            </label>
            
          </div>

          <div className="bg-surface-container-lowest border border-border-subtle rounded-xl p-4 shadow-sm">
            <label className="flex items-center justify-between mb-3">
              <span className="text-body-sm font-medium text-text-primary">Failure Threshold</span>
              <span className="material-symbols-outlined text-[16px] text-text-muted" title="Fail the CI pipeline if findings match or exceed this severity">info</span>
            </label>
            <CustomSelect
              options={[
                { label: "Any Severity (Low)", value: "low" },
                { label: "Medium or Higher", value: "medium" },
                { label: "High or Critical", value: "high" },
                { label: "Critical Only", value: "critical" },
              ]}
              value={scanOptions.failOn}
              onChange={(value) => setScanOptions({ ...scanOptions, failOn: value })}
            />
          </div>
        </div>

        {error && (
          <div className="p-3 bg-error-container/50 text-on-error-container text-sm rounded-lg border border-[#ffb4ab] flex items-center gap-2 animate-in slide-in-from-bottom-2">
            <span className="material-symbols-outlined text-[18px]">error</span>
            {error}
          </div>
        )}
      </div>

      <div className="pt-6 mt-6 border-t border-border-divider">
        <button
          onClick={onStartScan}
          disabled={isScanning || (!selectedRepo && githubUser !== null)}
          className="w-full relative overflow-hidden group bg-primary-container text-white py-3 px-4 rounded-xl font-semibold text-body-sm transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg transform active:scale-[0.98]"
        >
          <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]"></div>
          <div className="flex items-center justify-center gap-2 relative z-10">
            {isScanning ? (
              <>
                <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
                Initiating Scans...
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[18px]">play_arrow</span>
                Start Full Security Scan
              </>
            )}
          </div>
        </button>
      </div>
    </div>
  );
}
