"use client";

import React, { useEffect, useMemo, useState, useRef } from "react";
import {
  fetchAgentInventory,
  fetchAgentScanReports,
  fetchAgents,
  startAgentScan,
  stopAgentScan,
  getAgentScanLogsUrl,
  connectVmAgent,
  disconnectVmAgent,
} from "@/shared/api/client";
import type { AgentScanJob, VmAgent } from "@/shared/api/types";
import { useAuth } from "@/shared/lib/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { InfoTooltip } from "@/shared/ui/InfoTooltip";

const MODULES = [
  { id: "dependency", label: "Dependency Scanner", icon: "inventory_2" },
  { id: "config", label: "Config Scanner", icon: "settings_input_component" },
  { id: "secret", label: "Secret Scanner", icon: "vpn_key" },
  { id: "cipher", label: "Pre Cipher Suite", icon: "encrypted" },
] as const;

const SCOPES = [
  { id: "selected", label: "Selected directories", description: "Scan only checked app/config paths." },
  { id: "application", label: "Application only", description: "Prefer deployed app folders." },
  { id: "full-os", label: "Full OS scan", description: "Agent scans recommended OS-level locations." },
  { id: "root", label: "Root level", description: "Starts from / with agent-side deny rules." },
] as const;

export default function VmAgentsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: agents = [], isLoading: isLoadingAgents, error: agentsError } = useQuery({
    queryKey: ["agents"],
    queryFn: fetchAgents,
  });

  const { data: reports = [], isLoading: isLoadingReports } = useQuery({
    queryKey: ["agent-reports"],
    queryFn: fetchAgentScanReports,
    refetchInterval: (query) => {
      const active = query.state.data?.some(job => ["queued", "running", "stopping"].includes(job.status));
      return active ? 3000 : false;
    }
  });

  const [selectedAgentId, setSelectedAgentId] = useState("");
  const [selectedReportId, setSelectedReportId] = useState("");
  const [selectedPaths, setSelectedPaths] = useState<string[]>([]);
  const [selectedModules, setSelectedModules] = useState<Array<"dependency" | "config" | "secret" | "cipher">>(["dependency", "config", "secret", "cipher"]);
  const [scope, setScope] = useState<"full-os" | "root" | "selected" | "application">("selected");
  const [projectName, setProjectName] = useState("payment-service");
  const [starting, setStarting] = useState(false);
  const [copiedCommand, setCopiedCommand] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);
  const [agentToken, setAgentToken] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  const { data: inventoryData } = useQuery({
    queryKey: ["agent-inventory", selectedAgentId],
    queryFn: () => fetchAgentInventory(selectedAgentId),
    enabled: !!selectedAgentId,
  });

  const inventory = inventoryData?.inventory?.paths || [];

  useEffect(() => {
    if (agents.length > 0 && !selectedAgentId) {
      setSelectedAgentId(agents[0].id);
    }
  }, [agents, selectedAgentId]);

  useEffect(() => {
    if (reports.length > 0 && !selectedReportId) {
      setSelectedReportId(reports[0].id);
    }
  }, [reports, selectedReportId]);

  const selectedAgent = agents.find((agent) => agent.id === selectedAgentId);
  const selectedReport = reports.find((job) => job.id === selectedReportId) || reports[0];
  const hasAgents = agents.length > 0;
  const isAgentOnline = selectedAgent?.status === "online";
  const ownerEmail = user?.email || "your-login-email@example.com";
  
  const windowsCommand = `powershell -NoProfile -ExecutionPolicy Bypass -File .\\vm-agent\\bugbusters-agent.ps1 -Mode loop -OwnerEmail ${ownerEmail} -AgentToken dev-agent-token`;
  const linuxCommand = `export BUGBUSTERS_OWNER_EMAIL="${ownerEmail}"\nexport BUGBUSTERS_AGENT_TOKEN="dev-agent-token"\nbash ./vm-agent/bugbusters-agent.sh loop`;
  
  const activeReports = reports.filter((job) => ["queued", "running", "stopping"].includes(job.status));
  const metrics = useMemo(() => {
    const total = reports.length;
    const active = activeReports.length;
    const stopped = reports.filter((job) => job.status === "stopped").length;
    const findings = reports.reduce((sum, job) => sum + Number(job.result?.summary?.total_findings || 0), 0);
    return { total, active, stopped, findings };
  }, [reports, activeReports.length]);

  const loading = isLoadingAgents || isLoadingReports;
  const error = agentsError ? (agentsError as Error).message : null;

  const refreshAll = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["agents"] }),
      queryClient.invalidateQueries({ queryKey: ["agent-reports"] })
    ]);
  };

  const togglePath = (path: string) => {
    setSelectedPaths((current) => current.includes(path) ? current.filter((item) => item !== path) : [...current, path]);
  };

  const toggleModule = (module: "dependency" | "config" | "secret" | "cipher") => {
    setSelectedModules((current) => {
      if (current.includes(module)) {
        const next = current.filter((item) => item !== module);
        return next.length ? next : current;
      }
      return [...current, module];
    });
  };

  const handleStart = async () => {
    if (!selectedAgentId) return;
    if (scope === "selected" && selectedPaths.length === 0) return;
    if (selectedModules.length === 0) return;

    setStarting(true);
    try {
      await startAgentScan(selectedAgentId, {
        projectName,
        scope,
        paths: scope === "selected" ? selectedPaths : [],
        modules: selectedModules,
      });
      queryClient.invalidateQueries({ queryKey: ["agent-reports"] });
    } catch (err: any) {
      console.error(err);
    } finally {
      setStarting(false);
    }
  };

  const handleStop = async (scanId: string) => {
    try {
      await stopAgentScan(scanId);
      queryClient.invalidateQueries({ queryKey: ["agent-reports"] });
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      await connectVmAgent(agentToken || "dev-agent-token");
      setAgentToken("");
      // Wait for 10s to allow agent to start up and send heartbeat
      setTimeout(() => {
        refreshAll();
        setIsConnectModalOpen(false);
        setIsConnecting(false);
      }, 10000);
    } catch (err: any) {
      alert(err.message || "Failed to connect");
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    setIsDisconnecting(true);
    try {
      await disconnectVmAgent();
      // Wait for 30s to allow backend heartbeat expiry or graceful shutdown
      setTimeout(() => {
        refreshAll();
        setIsDisconnecting(false);
      }, 30000);
    } catch (err: any) {
      alert(err.message || "Failed to disconnect");
      setIsDisconnecting(false);
    }
  };

  const copyCommand = async (key: string, command: string) => {
    await navigator.clipboard.writeText(command);
    setCopiedCommand(key);
    window.setTimeout(() => setCopiedCommand(null), 1600);
  };

  return (
    <div className="max-w-[1280px] mx-auto flex flex-col gap-section-gap animate-in fade-in duration-500">
      <div className="bg-white rounded-2xl border border-border-subtle shadow-sm p-8 flex items-center justify-between gap-6 transition-all">
        <div className="flex items-center gap-5">
          <div className="w-14 h-14 rounded-2xl bg-primary-container/10 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-primary-container text-3xl">dns</span>
          </div>
          <div>
            <h1 className="font-headline-lg text-headline-lg text-text-primary mb-1">VM Agent Scanner</h1>
            <p className="font-body-sm text-body-sm text-text-secondary">Scan deployed services, OS configs, and secrets from private bank VMs with real-time logging.</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {agents.some(a => a.status === 'online') ? (
            <button onClick={handleDisconnect} disabled={isDisconnecting} className="px-4 py-2 rounded-lg bg-surface-container border border-border-divider text-severity-critical hover:bg-severity-critical/10 transition-colors shadow-sm flex items-center gap-2 font-medium disabled:opacity-50">
              {isDisconnecting ? (
                <span className="material-symbols-outlined text-[18px] animate-spin">sync</span>
              ) : (
                <span className="material-symbols-outlined text-[18px]">power_settings_new</span>
              )}
              {isDisconnecting ? "Disconnecting..." : "Disconnect Agent"}
            </button>
          ) : (
            <button onClick={() => setIsConnectModalOpen(true)} className="px-4 py-2 rounded-lg bg-primary-container text-white hover:bg-primary-hover transition-colors shadow-sm flex items-center gap-2 font-medium">
              <span className="material-symbols-outlined text-[18px]">cable</span>
              Connect Agent
            </button>
          )}
          <button onClick={refreshAll} className="px-4 py-2 rounded-lg border border-border-divider text-text-secondary hover:bg-surface-container transition-colors shadow-sm flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">refresh</span>
            Refresh
          </button>
        </div>
      </div>

      {isConnectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md border border-border-subtle p-6">
            <h3 className="font-headline-sm text-headline-sm text-text-primary mb-2">Connect VM Agent</h3>
            <p className="text-body-sm text-text-secondary mb-4">Enter your agent token to start the VM Agent process remotely on this machine.</p>
            <input 
              type="text" 
              placeholder="e.g. dev-agent-token" 
              value={agentToken} 
              onChange={e => setAgentToken(e.target.value)}
              className="w-full px-3 py-2 border border-border-divider rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-container mb-4"
            />
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setIsConnectModalOpen(false)} 
                className="px-4 py-2 text-text-secondary hover:bg-surface-container rounded-lg transition-colors"
                disabled={isConnecting}
              >
                Cancel
              </button>
              <button 
                onClick={handleConnect} 
                className="px-4 py-2 bg-primary-container text-white rounded-lg hover:bg-primary-hover transition-colors disabled:opacity-50"
                disabled={isConnecting}
              >
                {isConnecting ? "Connecting..." : "Connect"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-element-gap">
        <Metric label="Active Agents" value={agents.filter(a => a.status === 'online').length} tone="neutral" icon="computer" />
        <Metric label="Total Reports" value={metrics.total} tone="neutral" icon="description" />
        <Metric label="Active Scans" value={metrics.active} tone="warning" icon="sync" spinning={metrics.active > 0} />
        <Metric label="Open Findings" value={metrics.findings || "0"} tone="danger" icon="warning" />
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 text-red-800 p-4 animate-in slide-in-from-top-2">{error}</div>}

      <div className="grid grid-cols-1 xl:grid-cols-[420px_1fr] gap-element-gap">
        <div className="space-y-5">
          <section className="bg-white rounded-lg border border-border-subtle shadow-sm p-card-padding transition-all">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-section-header font-section-header flex items-center gap-2">
                <span className="material-symbols-outlined text-primary-container">sensors</span>
                Connected VM Agents
              </h2>
            </div>
            
            {/* <div className="mb-4 p-3 rounded-lg bg-blue-50 border border-blue-100 text-xs text-blue-800">
              <p className="font-bold mb-1">How to connect / disconnect:</p>
              <p className="mb-2">Run the agent script on your VM using the commands below. To disconnect, simply stop the script (Ctrl+C) on your server.</p>
              <div className="space-y-2 mt-2">
                <div className="rounded bg-white p-2 border border-blue-100">
                  <CommandHeader title="Windows Server" copied={copiedCommand === "windows"} onCopy={() => copyCommand("windows", windowsCommand)} />
                  <code className="block whitespace-pre-wrap break-words font-mono text-[10px]">{windowsCommand}</code>
                </div>
                <div className="rounded bg-white p-2 border border-blue-100">
                  <CommandHeader title="Linux Server" copied={copiedCommand === "linux"} onCopy={() => copyCommand("linux", linuxCommand)} />
                  <code className="block whitespace-pre-wrap break-words font-mono text-[10px]">{linuxCommand}</code>
                </div>
              </div>
            </div> */}

            <div className="space-y-3">
              {loading ? (
                <div className="p-4 rounded-lg bg-surface-container-lowest border border-border-divider animate-pulse">
                  <div className="h-4 bg-surface-container w-1/3 rounded mb-2"></div>
                  <div className="h-3 bg-surface-container w-1/2 rounded"></div>
                </div>
              ) : agents.length === 0 ? (
                <div className="rounded-xl border-2 border-dashed border-border-divider p-5 text-sm text-text-secondary bg-surface-container-lowest flex items-center justify-center min-h-[100px]">
                  <p className="font-medium text-text-primary text-center">No VM agents connected. Use the commands above to register one.</p>
                </div>
              ) : agents.map((agent) => (
                <button
                  key={agent.id}
                  onClick={() => setSelectedAgentId(agent.id)}
                  className={`w-full text-left rounded-xl border p-4 transition-all duration-300 ${selectedAgentId === agent.id ? "border-primary bg-primary-container/5 shadow-sm ring-1 ring-primary/20" : "border-border-divider hover:bg-surface-container hover:shadow-sm"}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-text-primary text-base flex items-center gap-2">
                        {agent.name}
                      </p>
                      <p className="text-xs text-text-muted font-mono mt-1 flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]">router</span>
                        {agent.hostname}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {agent.status === "online" && (
                        <span className="relative flex h-2.5 w-2.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
                        </span>
                      )}
                      <span className={`px-2 py-1 rounded text-[10px] uppercase tracking-wider font-bold ${agent.status === "online" ? "bg-green-100 text-green-800" : "bg-surface-container text-text-secondary"}`}>
                        {agent.status}
                      </span>
                    </div>
                  </div>
                  <div className="mt-4 flex gap-2 text-xs">
                    <span className="rounded bg-surface-container border border-border-divider px-2.5 py-1 font-medium">{agent.inventory?.paths?.length || 0} paths</span>
                    <span className="rounded bg-surface-container border border-border-divider px-2.5 py-1 font-medium">{agent.inventory?.services?.length || 0} services</span>
                  </div>
                </button>
              ))}
            </div>
          </section>

          <section className="bg-white rounded-lg border border-border-subtle shadow-sm p-card-padding transition-all">
            <h2 className="text-section-header font-section-header mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary-container">history</span>
              Scan History
            </h2>
            <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1 custom-scrollbar">
              {reports.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-text-muted">
                  <span className="material-symbols-outlined text-4xl mb-2 opacity-20">assignment</span>
                  <p className="text-sm">No scans initiated yet</p>
                </div>
              ) : reports.map((job) => (
                <div key={job.id} className={`rounded-xl border p-3 transition-all duration-300 ${selectedReport?.id === job.id ? "border-primary bg-primary-container/5 ring-1 ring-primary/20" : "border-border-divider hover:border-border-subtle"}`}>
                  <button type="button" onClick={() => setSelectedReportId(job.id)} className="w-full text-left group">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-text-primary group-hover:text-primary transition-colors">{job.sourceLabel}</p>
                        <p className="text-[11px] text-text-muted mt-1 uppercase tracking-wide">{new Date(job.createdAt).toLocaleString()}</p>
                      </div>
                      <StatusBadge status={job.status} />
                    </div>
                  </button>
                  {["queued", "running", "stopping"].includes(job.status) && (
                    <button onClick={() => handleStop(job.id)} className="mt-4 w-full rounded-lg border border-red-200 text-red-700 py-2 text-xs font-bold hover:bg-red-50 transition-colors flex items-center justify-center gap-1.5">
                      <span className="material-symbols-outlined text-[16px]">stop_circle</span>
                      Halt Scan
                    </button>
                  )}
                </div>
              ))}
            </div>
          </section>
        </div>

        <section className="bg-white rounded-lg border border-border-subtle shadow-sm p-card-padding flex flex-col transition-all relative overflow-hidden">
          <div className="flex items-start justify-between gap-4 mb-6 relative z-10">
            <div>
              <h2 className="text-section-header font-section-header flex items-center gap-2">
                <span className="material-symbols-outlined text-primary-container">play_circle</span>
                Launch Scan
              </h2>
              <p className="text-sm text-text-secondary mt-1">Configure and deploy a scan operation to your registered VM agent.</p>
            </div>
            {selectedAgent && (
              <div className="px-3 py-1.5 rounded-full bg-green-50 border border-green-200 flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                </span>
                <span className="text-green-800 text-xs font-bold tracking-wide">{selectedAgent.name}</span>
              </div>
            )}
          </div>

          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
            <div>
              <label className="text-sm font-semibold text-text-secondary">Project / Report Name</label>
              <input
                value={projectName}
                onChange={(event) => setProjectName(event.target.value)}
                className="mt-2 w-full rounded-xl border border-border-divider px-4 py-2.5 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-sm"
                placeholder="payment-service"
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-text-secondary">Target Agent</label>
              <select
                value={selectedAgentId}
                onChange={(event) => setSelectedAgentId(event.target.value)}
                disabled={!hasAgents}
                className="mt-2 w-full rounded-xl border border-border-divider px-4 py-2.5 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-sm bg-white"
              >
                {!hasAgents && <option value="">No agents available</option>}
                {agents.map((agent) => <option key={agent.id} value={agent.id}>{agent.name} ({agent.hostname})</option>)}
              </select>
            </div>
          </div>

          <div className="relative z-10 mb-6">
            <p className="text-sm font-semibold text-text-secondary mb-3">Analysis Modules</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {MODULES.map((module) => (
                <button
                  key={module.id}
                  onClick={() => toggleModule(module.id)}
                  disabled={!isAgentOnline}
                  className={`rounded-xl border p-4 text-center transition-all duration-300 ${selectedModules.includes(module.id) ? "border-primary bg-primary-container text-white shadow-md transform scale-[1.02]" : "border-border-divider hover:bg-surface-container bg-surface-container-lowest text-text-secondary"} ${!isAgentOnline ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  <span className={`material-symbols-outlined text-[24px] mb-2 ${selectedModules.includes(module.id) ? "text-white" : "text-text-muted"}`}>{module.icon}</span>
                  <p className="text-xs font-bold">{module.label}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="relative z-10 mb-6 border border-border-divider rounded-xl overflow-hidden bg-surface-container-lowest">
            <button 
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="w-full flex items-center justify-between p-4 bg-surface-container-lowest hover:bg-surface-container transition-colors text-sm font-semibold text-text-primary"
            >
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-text-muted">tune</span>
                Advanced Scan Settings
              </div>
              <span className={`material-symbols-outlined transition-transform duration-300 ${showAdvanced ? "rotate-180" : ""}`}>expand_more</span>
            </button>
            
            <div className={`transition-all duration-500 ease-in-out ${showAdvanced ? "max-h-[800px] opacity-100 border-t border-border-divider" : "max-h-0 opacity-0"}`}>
              <div className="p-4 md:p-5">
                <p className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-3">Scan Scope</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                  {SCOPES.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setScope(item.id)}
                      disabled={!isAgentOnline}
                      className={`text-left rounded-lg border p-3 transition-colors ${scope === item.id ? "border-primary bg-primary-container/5 ring-1 ring-primary/30" : "border-border-divider hover:bg-surface-container"} ${!isAgentOnline ? "opacity-50 cursor-not-allowed" : ""}`}
                    >
                      <p className="font-semibold text-sm">{item.label}</p>
                      <p className="text-[11px] text-text-muted mt-1 leading-relaxed">{item.description}</p>
                    </button>
                  ))}
                </div>

                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-text-secondary uppercase tracking-wider flex items-center gap-1">
                    Directories <InfoTooltip text="Select specific OS directories to scan if using 'Selected directories' scope." />
                  </span>
                  <button
                    onClick={() => setSelectedPaths(inventory.filter((item) => item.recommended).map((item) => item.path))}
                    disabled={!hasAgents}
                    className="text-[11px] font-bold text-primary hover:underline uppercase tracking-wide"
                  >
                    Select Recommended
                  </button>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[220px] overflow-y-auto pr-2 custom-scrollbar">
                  {inventory.length === 0 ? (
                    <div className="sm:col-span-2 rounded-lg border border-dashed border-border-divider p-4 text-xs text-text-muted text-center">
                      No directories received from this agent yet.
                    </div>
                  ) : inventory.map((item) => (
                    <button
                      key={item.path}
                      onClick={() => togglePath(item.path)}
                      disabled={!hasAgents}
                      className={`text-left rounded-lg border px-3 py-2 transition-colors flex items-center justify-between gap-2 ${selectedPaths.includes(item.path) ? "border-primary bg-primary-container/5" : "border-border-divider hover:bg-surface-container"}`}
                    >
                      <p className="font-mono text-[11px] font-medium break-all truncate" title={item.path}>{item.path}</p>
                      <span className={`px-1.5 py-0.5 rounded text-[9px] uppercase font-bold shrink-0 ${item.risk === "high" ? "bg-red-100 text-red-800" : "bg-surface-container text-text-secondary"}`}>{item.type}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-auto pt-2 flex flex-col sm:flex-row gap-3 relative z-10">
            <button
              onClick={handleStart}
              disabled={starting || !isAgentOnline || selectedModules.length === 0}
              className="flex-1 bg-primary text-white rounded-xl py-3.5 font-bold hover:bg-primary-hover disabled:opacity-50 transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 text-sm"
            >
              {starting ? (
                <span className="flex items-center gap-2"><span className="material-symbols-outlined animate-spin text-[18px]">sync</span> Queueing...</span>
              ) : !isAgentOnline ? (
                "Agent Offline - Connect Agent First"
              ) : selectedModules.length === 0 ? (
                "Select a Module"
              ) : (
                <span className="flex items-center gap-2"><span className="material-symbols-outlined text-[18px]">rocket_launch</span> Launch Scan</span>
              )}
            </button>
          </div>
        </section>
      </div>

      <VmReportDetails report={selectedReport} />
    </div>
  );
}

function useLiveLogs(reportId: string | null, active: boolean) {
  const [logs, setLogs] = useState<any[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!reportId) {
      setLogs([]);
      return;
    }

    setLogs([]);
    
    // Connect to SSE stream
    const url = getAgentScanLogsUrl(reportId);
    const evtSource = new EventSource(url);
    
    evtSource.onmessage = (event) => {
      try {
        const newLog = JSON.parse(event.data);
        // Ensure no duplicate renders, though React handles state updates efficiently
        setLogs((prev) => [...prev, newLog]);
      } catch (e) {
        console.error("Failed to parse log", e);
      }
    };
    
    evtSource.onerror = (err) => {
      // EventSource automatically attempts to reconnect on error.
      // If the job is not active, we can close it safely.
      if (!active) {
        evtSource.close();
      }
    };

    return () => {
      evtSource.close();
    };
  }, [reportId, active]);

  useEffect(() => {
    // Smooth scroll to bottom when new logs arrive
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  return { logs, scrollRef };
}

function VmReportDetails({ report }: { report?: AgentScanJob }) {
  if (!report) {
    return (
      <section className="bg-white rounded-2xl border border-border-subtle shadow-sm p-card-padding min-h-[300px] flex flex-col items-center justify-center text-text-muted animate-in fade-in">
        <span className="material-symbols-outlined text-5xl mb-4 opacity-20">analytics</span>
        <h2 className="text-xl font-bold text-text-primary mb-1">Execution Report</h2>
        <p className="text-sm">Select a scan history item to view its details.</p>
      </section>
    );
  }

  const isActive = ["queued", "running", "stopping"].includes(report.status);
  const { logs, scrollRef } = useLiveLogs(report.id, isActive);
  
  const summary = report.result?.summary || {};
  const statusText = getStatusExplanation(report);

  // Animated pipeline visualization data
  const pipelineModules = report.modules || [];
  const completedModules = report.result?.reports?.map((r: any) => r.module) || [];

  return (
    <section className="bg-white rounded-2xl border border-border-subtle shadow-sm flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="p-card-padding border-b border-border-divider bg-surface-container-lowest">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div>
            <h2 className="text-section-header font-section-header flex items-center gap-2">
              <span className="material-symbols-outlined text-primary-container">analytics</span>
              Analysis Report: {report.sourceLabel}
            </h2>
            <p className="mt-1 text-sm text-text-secondary flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px]">schedule</span>
              {new Date(report.createdAt).toLocaleString()}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <StatusBadge status={report.status} large />
            {report.status !== "queued" && (
              <a
                href={`/vm-agents/${report.id}`}
                className="bg-primary text-white rounded-lg px-4 py-2 text-sm font-bold shadow hover:bg-primary-hover transition-colors flex items-center gap-2"
              >
                View Full Scan Report
                <span className="material-symbols-outlined text-[18px]">open_in_new</span>
              </a>
            )}
          </div>
        </div>

        <div className="mt-6 flex flex-col sm:flex-row gap-4">
          <div className="flex-1 rounded-xl border border-border-divider bg-white p-4 shadow-sm flex items-start gap-4">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
              report.status === 'completed' ? 'bg-green-100 text-green-700' :
              report.status === 'failed' ? 'bg-red-100 text-red-700' :
              'bg-blue-100 text-blue-700 animate-pulse'
            }`}>
              <span className="material-symbols-outlined">
                {report.status === 'completed' ? 'check_circle' : (report.status === 'failed' ? 'error' : 'sync')}
              </span>
            </div>
            <div>
              <p className="font-bold text-text-primary">{statusText.title}</p>
              <p className="mt-1 text-sm text-text-secondary leading-relaxed">{statusText.description}</p>
            </div>
          </div>
          
          <div className="flex gap-4">
            <div className="rounded-xl border border-border-divider bg-white p-4 shadow-sm min-w-[120px] flex flex-col items-center justify-center">
              <p className="text-xs font-bold uppercase text-text-muted mb-1">Findings</p>
              <p className={`text-3xl font-black ${Number(summary.total_findings || 0) > 0 ? "text-severity-critical" : "text-green-600"}`}>
                {summary.total_findings || 0}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="p-card-padding bg-white">
        <p className="text-sm font-bold text-text-secondary uppercase tracking-wider mb-6 flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">account_tree</span>
          Execution Pipeline
        </p>
        
        {/* Pipeline Visualization */}
        <div className="relative mb-8">
          <div className="absolute top-1/2 left-0 w-full h-1 bg-surface-container -translate-y-1/2 rounded-full overflow-hidden">
            <div className="h-full bg-primary-container transition-all duration-1000 ease-out" 
                 style={{ width: `${pipelineModules.length === 0 ? 0 : (completedModules.length / pipelineModules.length) * 100}%` }}></div>
          </div>
          <div className="relative flex justify-between items-center z-10 px-2 sm:px-10">
            {pipelineModules.map((moduleName, index) => {
              const isCompleted = completedModules.includes(moduleName);
              const isCurrent = isActive && !isCompleted && (index === 0 || completedModules.includes(pipelineModules[index - 1]));
              const modInfo = MODULES.find(m => m.id === moduleName);
              
              let moduleIcon = <span className="material-symbols-outlined text-[20px]">{modInfo?.icon || 'extension'}</span>;
              if (isCompleted) {
                moduleIcon = <span className="material-symbols-outlined text-[20px]">check</span>;
              } else if (isCurrent) {
                moduleIcon = <span className="material-symbols-outlined text-[20px] animate-spin">sync</span>;
              }

              const innerContent = (
                <>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-500 shadow-sm ${
                    isCompleted ? 'bg-primary-container border-primary-container text-white scale-100 hover:scale-110' :
                    isCurrent ? 'bg-white border-primary text-primary scale-110 ring-4 ring-primary/20' :
                    'bg-surface-container-lowest border-border-divider text-text-muted scale-90'
                  }`}>
                    {moduleIcon}
                  </div>
                  <span className={`text-[11px] font-bold uppercase tracking-wider hidden sm:block ${
                    isCompleted || isCurrent ? 'text-text-primary' : 'text-text-muted'
                  }`}>{moduleName}</span>
                </>
              );

              return isCompleted ? (
                <a
                  key={moduleName}
                  href={`/vm-agents/${report.id}?tab=${moduleName}`}
                  className="flex flex-col items-center gap-2 bg-white px-2 cursor-pointer group"
                >
                  {innerContent}
                </a>
              ) : (
                <div key={moduleName} className="flex flex-col items-center gap-2 bg-white px-2">
                  {innerContent}
                </div>
              );
            })}
          </div>
        </div>

        <p className="text-sm font-bold text-text-secondary uppercase tracking-wider mb-4 flex items-center gap-2 mt-10">
          <span className="material-symbols-outlined text-[18px]">terminal</span>
          Real-Time Execution Logs
        </p>
        
        <div className="rounded-xl bg-[#0d1117] border border-[#30363d] overflow-hidden shadow-inner">
          <div className="flex items-center gap-2 px-4 py-2 bg-[#161b22] border-b border-[#30363d]">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-[#ff5f56]"></div>
              <div className="w-3 h-3 rounded-full bg-[#ffbd2e]"></div>
              <div className="w-3 h-3 rounded-full bg-[#27c93f]"></div>
            </div>
            <span className="text-[#8b949e] text-xs font-mono ml-2 flex items-center gap-2">
              bash - agent.sh
              {isActive && <span className="flex h-2 w-2 relative ml-1">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>}
            </span>
          </div>
          <div 
            ref={scrollRef}
            className="p-4 h-[350px] overflow-y-auto font-mono text-[13px] leading-relaxed scroll-smooth"
          >
            {logs.length > 0 ? logs.map((entry, index) => {
              const isError = entry.level?.toLowerCase() === 'error';
              const isWarn = entry.level?.toLowerCase() === 'warn';
              const isInfo = entry.level?.toLowerCase() === 'info';
              
              return (
                <div key={`${entry.timestamp}-${index}`} className="flex items-start gap-4 hover:bg-[#161b22] px-2 py-0.5 rounded transition-colors group">
                  <span className="text-[#484f58] shrink-0 tabular-nums">
                    {new Date(entry.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second:'2-digit' })}
                  </span>
                  <div className="flex-1 break-words">
                    {entry.level && (
                      <span className={`inline-block w-12 text-[10px] font-bold uppercase tracking-wider mr-2 ${
                        isError ? 'text-[#ff7b72]' : isWarn ? 'text-[#d2a8ff]' : 'text-[#79c0ff]'
                      }`}>
                        [{entry.level}]
                      </span>
                    )}
                    <span className={isError ? 'text-[#ff7b72]' : isWarn ? 'text-[#d2a8ff]' : 'text-[#c9d1d9]'}>
                      {entry.message}
                    </span>
                  </div>
                </div>
              );
            }) : (
              <div className="h-full flex flex-col items-center justify-center text-[#484f58] space-y-3">
                <span className="material-symbols-outlined text-4xl animate-pulse">terminal</span>
                <p>Establishing secure connection to agent stream...</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function getStatusExplanation(report: AgentScanJob) {
  if (report.status === "queued") {
    return {
      title: "Queued for Dispatch",
      description: "Awaiting pickup by the VM agent. Keep the agent script running; it will automatically poll and execute this command."
    };
  }
  if (report.status === "running") {
    return {
      title: "Analysis in Progress",
      description: "The secure VM agent is actively scanning the local environment. Logs are streaming in real-time below."
    };
  }
  if (report.status === "completed") {
    return {
      title: "Scan Completed",
      description: "The agent successfully finished scanning and securely transmitted the results to the dashboard."
    };
  }
  if (report.status === "failed") {
    return {
      title: "Scan Failed",
      description: report.error || "The VM agent encountered a critical error. Please review the execution logs for details."
    };
  }
  if (report.status === "stopping") {
    return {
      title: "Halt Requested",
      description: "Termination signal sent. The agent will cleanly abort operations momentarily."
    };
  }
  return {
    title: "Scan Halted",
    description: "The scan was aborted by a user before completion."
  };
}

function Metric({ label, value, tone, icon, spinning = false }: { label: string; value: string | number; tone: "neutral" | "warning" | "danger", icon: string, spinning?: boolean }) {
  const color = tone === "danger" ? "text-severity-critical" : tone === "warning" ? "text-orange-600" : "text-text-primary";
  const bg = tone === "danger" ? "bg-red-50" : tone === "warning" ? "bg-orange-50" : "bg-surface-container-lowest";
  const border = tone === "danger" ? "border-red-200" : tone === "warning" ? "border-orange-200" : "border-border-divider";
  
  return (
    <div className={`${bg} p-5 rounded-2xl border ${border} shadow-sm flex items-center justify-between group hover:shadow-md transition-shadow`}>
      <div className="flex flex-col gap-1">
        <p className="text-xs font-bold text-text-secondary uppercase tracking-wider">{label}</p>
        <p className={`text-3xl font-black ${color}`}>{value}</p>
      </div>
      <div className={`w-12 h-12 rounded-full flex items-center justify-center bg-white shadow-sm border ${border}`}>
        <span className={`material-symbols-outlined text-[24px] ${color} ${spinning ? 'animate-spin' : 'group-hover:scale-110 transition-transform'}`}>{icon}</span>
      </div>
    </div>
  );
}

function CommandHeader({ title, copied, onCopy }: { title: string; copied: boolean; onCopy: () => void }) {
  return (
    <div className="mb-2 flex items-center justify-between gap-3">
      <p className="text-[11px] uppercase tracking-wider font-bold text-text-secondary flex items-center gap-1.5">
        <span className="material-symbols-outlined text-[14px]">terminal</span>
        {title}
      </p>
      <button
        type="button"
        onClick={onCopy}
        className={`inline-flex items-center gap-1 rounded border px-2 py-1 text-[10px] font-bold uppercase tracking-wider transition-colors ${
          copied ? 'bg-green-100 border-green-200 text-green-700' : 'bg-white border-border-divider text-text-secondary hover:bg-surface-container hover:text-text-primary'
        }`}
      >
        <span className="material-symbols-outlined text-[14px]">{copied ? "check" : "content_copy"}</span>
        {copied ? "Copied" : "Copy Command"}
      </button>
    </div>
  );
}

function StatusBadge({ status, large = false }: { status: AgentScanJob["status"], large?: boolean }) {
  const className = status === "completed"
    ? "bg-green-100 text-green-800 border-green-200"
    : status === "failed" || status === "stopped"
      ? "bg-red-100 text-red-800 border-red-200"
      : "bg-blue-100 text-blue-800 border-blue-200";
      
  const icon = status === "completed" ? "check_circle" : status === "failed" || status === "stopped" ? "cancel" : "sync";
  
  return (
    <span className={`inline-flex items-center gap-1.5 border rounded-full font-bold ${
      large ? 'px-3 py-1.5 text-xs' : 'px-2 py-1 text-[10px]'
    } uppercase tracking-wider ${className}`}>
      <span className={`material-symbols-outlined ${large ? 'text-[16px]' : 'text-[14px]'} ${status !== 'completed' && status !== 'failed' && status !== 'stopped' ? 'animate-spin' : ''}`}>
        {icon}
      </span>
      {status}
    </span>
  );
}
