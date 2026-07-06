"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  fetchAgentScan,
  fetchAgentInventory,
  fetchAgentScanReports,
  fetchAgents,
  startAgentScan,
  stopAgentScan,
} from "@/shared/api/client";
import type { AgentPath, AgentScanJob, VmAgent } from "@/shared/api/types";
import { useAuth } from "@/shared/lib/AuthContext";

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
  const [agents, setAgents] = useState<VmAgent[]>([]);
  const [reports, setReports] = useState<AgentScanJob[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState("");
  const [selectedReportId, setSelectedReportId] = useState("");
  const [inventory, setInventory] = useState<AgentPath[]>([]);
  const [selectedPaths, setSelectedPaths] = useState<string[]>([]);
  const [selectedModules, setSelectedModules] = useState<Array<"dependency" | "config" | "secret" | "cipher">>([]);
  const [scope, setScope] = useState<"full-os" | "root" | "selected" | "application">("selected");
  const [projectName, setProjectName] = useState("payment-service");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [copiedCommand, setCopiedCommand] = useState<string | null>(null);

  const applyInventory = (paths: AgentPath[]) => {
    setInventory(paths);
  };

  useEffect(() => {
    Promise.all([fetchAgents(), fetchAgentScanReports()])
      .then(([agentRows, reportRows]) => {
        setAgents(agentRows || []);
        setReports(reportRows || []);
        if (reportRows?.[0]) setSelectedReportId(reportRows[0].id);
        const first = agentRows?.[0];
        if (first) {
          setSelectedAgentId(first.id);
          applyInventory(first.inventory?.paths || []);
        }
      })
      .catch((err) => setError(err.message || "Failed to load VM agents"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedAgentId) return;

    let cancelled = false;
    fetchAgentInventory(selectedAgentId)
      .then(({ inventory }) => {
        if (cancelled) return;
        const paths = inventory?.paths || [];
        applyInventory(paths);
      })
      .catch((err) => setError(err.message || "Failed to load agent inventory"));

    return () => {
      cancelled = true;
    };
  }, [selectedAgentId, agents]);

  const selectedAgent = agents.find((agent) => agent.id === selectedAgentId);
  const selectedReport = reports.find((job) => job.id === selectedReportId) || reports[0];
  const hasAgents = agents.length > 0;
  const ownerEmail = user?.email || "your-login-email@example.com";
  const windowsCommand = `powershell -NoProfile -ExecutionPolicy Bypass -File .\\vm-agent\\bugbusters-agent.ps1 -Mode loop -OwnerEmail ${ownerEmail} -AgentToken dev-agent-token`;
  const linuxCommand = `export BUGBUSTERS_OWNER_EMAIL="${ownerEmail}"
export BUGBUSTERS_AGENT_TOKEN="dev-agent-token"
bash ./vm-agent/bugbusters-agent.sh loop`;
  const activeReports = reports.filter((job) => ["queued", "running", "stopping"].includes(job.status));
  const metrics = useMemo(() => {
    const total = reports.length;
    const active = activeReports.length;
    const stopped = reports.filter((job) => job.status === "stopped").length;
    const findings = reports.reduce((sum, job) => sum + Number(job.result?.summary?.total_findings || 0), 0);
    return { total, active, stopped, findings };
  }, [reports, activeReports.length]);

  useEffect(() => {
    if (!activeReports.length && !selectedReportId) return;

    const interval = window.setInterval(async () => {
      try {
        const reportRows = await fetchAgentScanReports();
        setReports(reportRows || []);
        const stillSelected = reportRows?.some((job) => job.id === selectedReportId);
        if (!stillSelected && reportRows?.[0]) setSelectedReportId(reportRows[0].id);
        if (selectedReportId) {
          const updated = await fetchAgentScan(selectedReportId);
          setReports((current) => current.map((job) => job.id === updated.id ? updated : job));
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to refresh VM scan status");
      }
    }, 4000);

    return () => window.clearInterval(interval);
  }, [activeReports.length, selectedReportId]);

  const refreshAll = async () => {
    const [agentRows, reportRows] = await Promise.all([fetchAgents(), fetchAgentScanReports()]);
    setAgents(agentRows || []);
    setReports(reportRows || []);
    if (!selectedReportId && reportRows?.[0]) setSelectedReportId(reportRows[0].id);
    const nextAgent = agentRows?.find((agent) => agent.id === selectedAgentId) || agentRows?.[0];
    setSelectedAgentId(nextAgent?.id || "");
    if (!nextAgent) {
      applyInventory([]);
      return;
    }

    const cachedPaths = nextAgent.inventory?.paths || [];
    if (cachedPaths.length) applyInventory(cachedPaths);

    try {
      const { inventory } = await fetchAgentInventory(nextAgent.id);
      applyInventory(inventory?.paths || []);
    } catch (err: unknown) {
      if (!cachedPaths.length) {
        setError(err instanceof Error ? err.message : "Failed to load agent inventory");
      }
    }
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
    if (!selectedAgentId) {
      setError("Select a VM agent first.");
      return;
    }
    if (scope === "selected" && selectedPaths.length === 0) {
      setError("Select at least one directory.");
      return;
    }
    if (selectedModules.length === 0) {
      setError("Select at least one scanner module.");
      return;
    }
    setError(null);
    setStarting(true);
    try {
      const job = await startAgentScan(selectedAgentId, {
        projectName,
        scope,
        paths: scope === "selected" ? selectedPaths : [],
        modules: selectedModules,
        maxDepth: 14,
      });
      setReports((current) => [job, ...current.filter((item) => item.id !== job.id)]);
      setSelectedReportId(job.id);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to start VM scan");
    } finally {
      setStarting(false);
    }
  };

  const handleStop = async (scanId: string) => {
    const job = await stopAgentScan(scanId);
    setReports((current) => current.map((item) => item.id === scanId ? job : item));
  };

  const copyCommand = async (key: string, command: string) => {
    await navigator.clipboard.writeText(command);
    setCopiedCommand(key);
    window.setTimeout(() => setCopiedCommand(null), 1600);
  };

  return (
    <div className="max-w-[1280px] mx-auto flex flex-col gap-section-gap">
      <div className="bg-white rounded-2xl border border-border-subtle shadow-sm p-8 flex items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <div className="w-14 h-14 rounded-2xl bg-primary-container/10 flex items-center justify-center">
            <span className="material-symbols-outlined text-primary-container text-3xl">dns</span>
          </div>
          <div>
            <h1 className="font-headline-lg text-headline-lg text-text-primary mb-1">VM Agent Scanner</h1>
            <p className="font-body-sm text-body-sm text-text-secondary">Scan deployed services, OS configs, nginx, SSL files, secrets, and dependencies from private bank VMs.</p>
          </div>
        </div>
        <button onClick={refreshAll} className="px-4 py-2 rounded-lg border border-border-divider text-text-secondary hover:bg-surface-container">
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-element-gap">
        <Metric label="Agents" value={agents.length} tone="neutral" />
        <Metric label="All VM Reports" value={metrics.total} tone="neutral" />
        <Metric label="Active Commands" value={metrics.active} tone="warning" />
        <Metric label="Open Findings" value={metrics.findings || "-"} tone="danger" />
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 text-red-800 p-4">{error}</div>}

      <div className="grid grid-cols-1 xl:grid-cols-[420px_1fr] gap-element-gap">
        <div className="space-y-5">
          <section className="bg-white rounded-lg border border-border-subtle shadow-sm p-card-padding">
            <h2 className="text-section-header font-section-header mb-4">Connected VM Agents</h2>
            <div className="space-y-3">
              {loading ? (
                <p className="text-sm text-text-muted">Loading agents...</p>
              ) : agents.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border-divider p-4 text-sm text-text-secondary space-y-3">
                  <p>No VM agent has registered yet. Run one command below, then click Refresh.</p>
                  <div className="rounded-md bg-surface-container-low p-3">
                    <CommandHeader
                      title="Windows test agent"
                      copied={copiedCommand === "windows"}
                      onCopy={() => copyCommand("windows", windowsCommand)}
                    />
                    <code className="block whitespace-pre-wrap break-words text-xs">{windowsCommand}</code>
                  </div>
                  <div className="rounded-md bg-surface-container-low p-3">
                    <CommandHeader
                      title="Linux VM agent"
                      copied={copiedCommand === "linux"}
                      onCopy={() => copyCommand("linux", linuxCommand)}
                    />
                    <code className="block whitespace-pre-wrap break-words text-xs">{linuxCommand}</code>
                  </div>
                </div>
              ) : agents.map((agent) => (
                <button
                  key={agent.id}
                  onClick={() => {
                    setSelectedAgentId(agent.id);
                    applyInventory(agent.inventory?.paths || []);
                  }}
                  className={`w-full text-left rounded-lg border p-4 transition-colors ${selectedAgentId === agent.id ? "border-primary bg-primary-container/5" : "border-border-divider hover:bg-surface-container-low"}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-text-primary">{agent.name}</p>
                      <p className="text-xs text-text-muted font-mono mt-1">{agent.hostname}</p>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${agent.status === "online" ? "bg-green-100 text-green-800" : "bg-surface-container text-text-secondary"}`}>
                      {agent.status}
                    </span>
                  </div>
                  <div className="flex gap-2 mt-3 text-xs text-text-secondary">
                    <span>{agent.os || "unknown OS"}</span>
                    <span>-</span>
                    <span>{agent.version || "agent version unknown"}</span>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                    <span className="rounded bg-surface-container px-2 py-1">{agent.inventory?.paths?.length || 0} paths</span>
                    <span className="rounded bg-surface-container px-2 py-1">{agent.inventory?.services?.length || 0} services</span>
                    <span className="rounded bg-surface-container px-2 py-1">{agent.inventory?.ports?.length || 0} ports</span>
                  </div>
                </button>
              ))}
            </div>
          </section>

          <section className="bg-white rounded-lg border border-border-subtle shadow-sm p-card-padding">
            <h2 className="text-section-header font-section-header mb-4">All VM Reports</h2>
            <div className="space-y-3 max-h-[520px] overflow-y-auto">
              {reports.length === 0 ? (
                <p className="text-sm text-text-muted text-center py-8">No VM reports yet</p>
              ) : reports.map((job) => (
                <div key={job.id} className={`rounded-lg border p-3 ${selectedReport?.id === job.id ? "border-primary bg-primary-container/5" : "border-border-divider"}`}>
                  <button type="button" onClick={() => setSelectedReportId(job.id)} className="w-full text-left">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold">{job.sourceLabel}</p>
                        <p className="text-xs text-text-muted mt-1">{new Date(job.createdAt).toLocaleString()}</p>
                      </div>
                      <StatusBadge status={job.status} />
                    </div>
                    <div className="flex flex-wrap gap-1 mt-3">
                      {job.modules.map((module) => <span key={module} className="px-2 py-1 rounded bg-surface-container text-xs">{module}</span>)}
                    </div>
                    <p className="text-xs text-text-muted mt-3">{job.selectedPaths.length} path(s), scope {job.scope}</p>
                  </button>
                  {["queued", "running", "stopping"].includes(job.status) && (
                    <button onClick={() => handleStop(job.id)} className="mt-3 w-full rounded-md border border-red-200 text-red-700 py-2 text-sm hover:bg-red-50">
                      Stop scan
                    </button>
                  )}
                </div>
              ))}
            </div>
          </section>
        </div>

        <section className="bg-white rounded-lg border border-border-subtle shadow-sm p-card-padding">
          <div className="flex items-start justify-between gap-4 mb-5">
            <div>
              <h2 className="text-section-header font-section-header">Start OS-Level Scan</h2>
              <p className="text-sm text-text-secondary mt-1">Choose scanner modules and VM directories. The backend queues a command for the private VM agent.</p>
            </div>
            {selectedAgent && <span className="px-3 py-1 rounded-full bg-green-100 text-green-800 text-xs font-semibold">{selectedAgent.name}</span>}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div>
              <label className="text-sm font-semibold text-text-secondary">Project / report name</label>
              <input
                value={projectName}
                onChange={(event) => setProjectName(event.target.value)}
                className="mt-2 w-full rounded-lg border border-border-divider px-3 py-2 outline-none focus:border-primary"
                placeholder="payment-service"
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-text-secondary">Agent</label>
              <select
                value={selectedAgentId}
                onChange={(event) => {
                  const nextAgent = agents.find((agent) => agent.id === event.target.value);
                  setSelectedAgentId(event.target.value);
                  applyInventory(nextAgent?.inventory?.paths || []);
                }}
                disabled={!hasAgents}
                className="mt-2 w-full rounded-lg border border-border-divider px-3 py-2 outline-none focus:border-primary"
              >
                {!hasAgents && <option value="">No agent registered</option>}
                {agents.map((agent) => <option key={agent.id} value={agent.id}>{agent.name} - {agent.hostname}</option>)}
              </select>
            </div>
          </div>

          <div className="mt-6">
            <p className="text-sm font-semibold text-text-secondary mb-3">Scan scope</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {SCOPES.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setScope(item.id)}
                  disabled={!hasAgents}
                  className={`text-left rounded-lg border p-4 ${scope === item.id ? "border-primary bg-primary-container/5" : "border-border-divider hover:bg-surface-container-low"}`}
                >
                  <p className="font-semibold">{item.label}</p>
                  <p className="text-xs text-text-muted mt-1">{item.description}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6">
            <p className="text-sm font-semibold text-text-secondary mb-3">Scanner modules</p>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              {MODULES.map((module) => (
                <button
                  key={module.id}
                  onClick={() => toggleModule(module.id)}
                  disabled={!hasAgents}
                  className={`rounded-lg border p-4 text-left ${selectedModules.includes(module.id) ? "border-primary bg-primary-container/5" : "border-border-divider hover:bg-surface-container-low"}`}
                >
                  <span className="material-symbols-outlined text-[20px] text-primary-container">{module.icon}</span>
                  <p className="text-sm font-semibold mt-2">{module.label}</p>
                </button>
              ))}
            </div>
            {selectedModules.length === 0 && (
              <p className="mt-2 text-sm text-[#8a5200]">No scanner selected yet. Choose only the modules you want to run.</p>
            )}
          </div>

          <div className="mt-6">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-text-secondary">Directories and OS config paths</p>
              <button
                onClick={() => setSelectedPaths(inventory.filter((item) => item.recommended).map((item) => item.path))}
                disabled={!hasAgents}
                className="text-sm text-primary hover:underline"
              >
                Use recommended
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[460px] overflow-y-auto pr-1">
              {inventory.length === 0 ? (
                <div className="md:col-span-2 rounded-lg border border-dashed border-border-divider p-4 text-sm text-text-secondary">
                  No directories received from this agent yet. Keep the agent terminal running, then click Refresh. If it still stays empty, stop the old agent process and run the copied Windows command again so it sends fresh inventory.
                </div>
              ) : inventory.map((item) => (
                <button
                  key={item.path}
                  onClick={() => togglePath(item.path)}
                  disabled={!hasAgents}
                  className={`text-left rounded-lg border p-4 ${selectedPaths.includes(item.path) ? "border-primary bg-primary-container/5" : "border-border-divider hover:bg-surface-container-low"}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-mono text-sm font-semibold break-all">{item.path}</p>
                      <p className="text-xs text-text-muted mt-1">{item.label}</p>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs ${item.risk === "high" ? "bg-red-100 text-red-800" : "bg-surface-container text-text-secondary"}`}>{item.type}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6 flex flex-col md:flex-row gap-3">
            <button
              onClick={handleStart}
              disabled={starting || !hasAgents}
              className="flex-1 bg-primary text-white rounded-lg py-3 font-semibold hover:bg-surface-tint disabled:opacity-60"
            >
              {!hasAgents ? "Register an agent first" : starting ? "Queueing scan..." : "Start VM Agent Scan"}
            </button>
            <button
              onClick={() => setSelectedModules(["dependency", "config", "secret", "cipher"])}
              disabled={!hasAgents}
              className="px-5 rounded-lg border border-border-divider text-text-secondary hover:bg-surface-container"
            >
              Select all scanners
            </button>
            <button
              onClick={() => {
                setSelectedModules([]);
                setSelectedPaths([]);
              }}
              disabled={!hasAgents}
              className="px-5 rounded-lg border border-border-divider text-text-secondary hover:bg-surface-container"
            >
              Clear
            </button>
          </div>
        </section>
      </div>

      <VmReportDetails report={selectedReport} />
    </div>
  );
}

function VmReportDetails({ report }: { report?: AgentScanJob }) {
  if (!report) {
    return (
      <section className="bg-white rounded-lg border border-border-subtle shadow-sm p-card-padding">
        <h2 className="text-section-header font-section-header">VM Scan Result</h2>
        <p className="mt-3 text-sm text-text-muted">No VM scan selected yet.</p>
      </section>
    );
  }

  const summary = report.result?.summary || {};
  const moduleReports = report.result?.reports || [];
  const statusText = getStatusExplanation(report);

  return (
    <section className="bg-white rounded-lg border border-border-subtle shadow-sm p-card-padding">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div>
          <h2 className="text-section-header font-section-header">VM Scan Result</h2>
          <p className="mt-1 text-sm text-text-secondary">{report.sourceLabel}</p>
        </div>
        <StatusBadge status={report.status} />
      </div>

      <div className="mt-5 rounded-lg border border-border-divider bg-surface-container-low p-4">
        <p className="font-semibold text-text-primary">{statusText.title}</p>
        <p className="mt-1 text-sm text-text-secondary">{statusText.description}</p>
      </div>

      <div className="mt-5 grid grid-cols-1 md:grid-cols-4 gap-3">
        <MiniMetric label="Findings" value={Number(summary.total_findings || 0)} />
        <MiniMetric label="Risk score" value={Number(summary.risk_score || 0)} />
        <MiniMetric label="Modules" value={report.modules.length} />
        <MiniMetric label="Paths" value={report.selectedPaths.length} />
      </div>

      <div className="mt-6 grid grid-cols-1 xl:grid-cols-2 gap-5">
        <div>
          <p className="text-sm font-semibold text-text-secondary mb-3">Selected scan targets</p>
          <div className="rounded-lg border border-border-divider divide-y divide-border-divider max-h-[260px] overflow-y-auto">
            {report.selectedPaths.length === 0 ? (
              <p className="p-4 text-sm text-text-muted">No explicit path selected. Agent defaults will be used when it runs.</p>
            ) : report.selectedPaths.map((path) => (
              <p key={path} className="p-3 font-mono text-xs break-all">{path}</p>
            ))}
          </div>
        </div>

        <div>
          <p className="text-sm font-semibold text-text-secondary mb-3">Module results</p>
          <div className="rounded-lg border border-border-divider divide-y divide-border-divider max-h-[260px] overflow-y-auto">
            {moduleReports.length === 0 ? (
              <p className="p-4 text-sm text-text-muted">Module results will appear here after the VM agent completes the scan.</p>
            ) : moduleReports.map((item, index) => (
              <div key={`${item.module}-${index}`} className="p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold capitalize">{item.module}</p>
                  <span className="text-xs rounded bg-surface-container px-2 py-1">{item.status}</span>
                </div>
                <p className="mt-1 text-sm text-text-secondary">{item.findings} finding(s), risk score {item.risk_score}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6">
        <p className="text-sm font-semibold text-text-secondary mb-3">Execution log</p>
        <div className="rounded-lg bg-[#111827] p-4 min-h-[140px] max-h-[320px] overflow-y-auto">
          {report.logs?.length ? report.logs.map((entry, index) => (
            <p key={`${entry.timestamp}-${index}`} className="font-mono text-xs text-slate-200 leading-6">
              <span className="text-sky-300">{new Date(entry.timestamp).toLocaleTimeString()}</span>
              <span className="mx-2 uppercase text-slate-400">{entry.level}</span>
              {entry.message}
            </p>
          )) : (
            <p className="font-mono text-xs text-slate-400">Waiting for VM agent logs...</p>
          )}
        </div>
      </div>
    </section>
  );
}

function getStatusExplanation(report: AgentScanJob) {
  if (report.status === "queued") {
    return {
      title: "Queued: waiting for VM agent",
      description: "The backend has created the scan command. Keep the PowerShell or Bash VM agent running; it will poll the backend, pick this command, and change the status to running."
    };
  }
  if (report.status === "running") {
    return {
      title: "Running on VM agent",
      description: "The private VM agent has picked up the command and is calling the selected scanner services against the selected local paths."
    };
  }
  if (report.status === "completed") {
    return {
      title: "Completed",
      description: "The VM agent uploaded the combined module results back to the main backend. Review the module results and execution log below."
    };
  }
  if (report.status === "failed") {
    return {
      title: "Failed",
      description: report.error || "The VM agent reported a failure. Check the execution log and confirm the scanner services are running."
    };
  }
  if (report.status === "stopping") {
    return {
      title: "Stop requested",
      description: "The dashboard sent a stop command. The VM agent will stop when it next polls or reaches a safe stopping point."
    };
  }
  return {
    title: "Stopped",
    description: "The scan was stopped before completion."
  };
}

function MiniMetric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-border-divider bg-surface-container-lowest p-4">
      <p className="text-xs font-semibold uppercase text-text-muted">{label}</p>
      <p className="mt-2 text-2xl font-bold text-text-primary">{value}</p>
    </div>
  );
}

function Metric({ label, value, tone }: { label: string; value: string | number; tone: "neutral" | "warning" | "danger" }) {
  const color = tone === "danger" ? "text-severity-critical border-[#f3b4b4]" : tone === "warning" ? "text-[#8a5200] border-[#ffd6a5] bg-[#fff8eb]" : "text-text-primary border-border-divider";
  return (
    <div className={`bg-surface-container-lowest p-card-padding rounded-lg border shadow-sm flex flex-col gap-2 ${color}`}>
      <p className="font-body-sm text-body-sm text-text-muted font-medium">{label}</p>
      <p className="font-metric-value text-metric-value">{value}</p>
    </div>
  );
}

function CommandHeader({ title, copied, onCopy }: { title: string; copied: boolean; onCopy: () => void }) {
  return (
    <div className="mb-2 flex items-center justify-between gap-3">
      <p className="text-xs font-semibold text-text-primary">{title}</p>
      <button
        type="button"
        onClick={onCopy}
        className="inline-flex items-center gap-1 rounded-md border border-border-divider bg-white px-2 py-1 text-xs font-semibold text-text-secondary hover:bg-surface-container"
      >
        <span className="material-symbols-outlined text-[14px]">{copied ? "check" : "content_copy"}</span>
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}

function StatusBadge({ status }: { status: AgentScanJob["status"] }) {
  const className = status === "completed"
    ? "bg-green-100 text-green-800"
    : status === "failed" || status === "stopped"
      ? "bg-red-100 text-red-800"
      : "bg-yellow-100 text-yellow-800";
  return <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${className}`}>{status}</span>;
}
