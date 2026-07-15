"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  createScheduledScan,
  deleteScheduledScan,
  fetchImportedGithubRepos,
  fetchScheduledScans,
  fetchAgents,
  runScheduledScanNow,
  updateScheduledScan
} from "@/shared/api/client";
import type { BusinessRiskContext, ScheduledScan, ScannerModule, VmAgent } from "@/shared/api/types";
import { RemoteFileExplorer } from "@/shared/ui/RemoteFileExplorer";

const SCANNERS: Array<{ id: ScannerModule; label: string; icon: string }> = [
  { id: "dependency", label: "Dependency", icon: "inventory_2" },
  { id: "config", label: "Config", icon: "settings_input_component" },
  { id: "secret", label: "Secret", icon: "vpn_key" },
  { id: "cipher", label: "Cipher", icon: "encrypted" }
];

const BUSINESS_FIELDS: Array<{ key: keyof BusinessRiskContext; label: string; help: string }> = [
  { key: "assetCriticality", label: "Asset Criticality", help: "How important this application is to the bank. Internet banking should be higher than an internal utility." },
  { key: "dataSensitivity", label: "Data Sensitivity", help: "How much customer PII, financial data, passwords, tokens, or regulated data this service handles." },
  { key: "businessImpact", label: "Business Impact", help: "Revenue, operations, customer trust, and downtime impact if this application is compromised." },
  { key: "internetExposure", label: "Internet Exposure", help: "Whether the system is public-facing, partner-facing, internal-only, or isolated." },
  { key: "complianceRequirement", label: "Compliance Requirement", help: "How strongly this service maps to RBI, PCI-DSS, audit, or bank policy requirements." },
  { key: "exploitWindow", label: "Exploit Window", help: "How quickly the bank policy requires this issue class to be fixed once found." }
];

const DEFAULT_BUSINESS: BusinessRiskContext = {
  assetCriticality: 5,
  dataSensitivity: 5,
  businessImpact: 5,
  internetExposure: 5,
  complianceRequirement: 5,
  exploitWindow: 5
};

type Repo = {
  id: string;
  fullName: string;
  name: string;
  cloneUrl: string;
  language?: string | null;
  private?: boolean;
};

type ImportedRepoPayload = {
  id: string;
  fullName: string;
  name: string;
  cloneUrl: string;
  language?: string | null;
  private?: boolean;
};

type ScheduleFrequency = "daily" | "weekly" | "monthly";

export default function ScheduleScansPage() {
  const [repos, setRepos] = useState<Repo[]>([]);
  const [agents, setAgents] = useState<VmAgent[]>([]);
  const [schedules, setSchedules] = useState<ScheduledScan[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const [sourceType, setSourceType] = useState<"github" | "vm-agent">("github");
  const [selectedRepoId, setSelectedRepoId] = useState("");
  const [selectedAgentId, setSelectedAgentId] = useState("");
  const [selectedPaths, setSelectedPaths] = useState<string[]>([]);
  
  const [name, setName] = useState("Daily banking security scan");
  const [selectedScanners, setSelectedScanners] = useState<ScannerModule[]>(["dependency", "config", "secret", "cipher"]);
  const [frequency, setFrequency] = useState<ScheduleFrequency>("daily");
  const [timeOfDay, setTimeOfDay] = useState("09:00");
  const [timesPerDay, setTimesPerDay] = useState(1);
  const [weekdays, setWeekdays] = useState<number[]>([1]);
  const [monthDays, setMonthDays] = useState<number[]>([1]);
  const [reportEmail, setReportEmail] = useState("");
  const [businessContext, setBusinessContext] = useState<BusinessRiskContext>(DEFAULT_BUSINESS);

  const selectedRepo = useMemo(() => repos.find((repo) => repo.id === selectedRepoId), [repos, selectedRepoId]);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [repoPayload, schedulePayload, agentsPayload] = await Promise.all([
        fetchImportedGithubRepos(),
        fetchScheduledScans(),
        fetchAgents()
      ]);
      const nextRepos = ((repoPayload.repositories || []) as ImportedRepoPayload[]).map((repo) => ({
        id: repo.id,
        fullName: repo.fullName,
        name: repo.name,
        cloneUrl: repo.cloneUrl,
        language: repo.language,
        private: repo.private
      }));
      setRepos(nextRepos);
      setSchedules(schedulePayload);
      setAgents(agentsPayload);
      setSelectedRepoId((current) => current || nextRepos[0]?.id || "");
      setSelectedAgentId((current) => current || agentsPayload[0]?.id || "");
    } catch (err: unknown) {
      setError(errorMessage(err, "Failed to load schedules"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void refresh();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [refresh]);

  async function submitSchedule() {
    if (sourceType === "github" && !selectedRepo) {
      setError("Import a GitHub repository before creating a schedule.");
      return;
    }
    if (sourceType === "vm-agent" && !selectedAgentId) {
      setError("Connect a VM Agent before creating a schedule.");
      return;
    }
    if (sourceType === "vm-agent" && selectedPaths.length === 0) {
      setError("Select at least one path to scan for VM Agent.");
      return;
    }
    if (!selectedScanners.length) {
      setError("Select at least one scanner module.");
      return;
    }
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      await createScheduledScan({
        name,
        sourceType,
        importedRepositoryId: sourceType === "github" ? selectedRepo?.id : undefined,
        agentId: sourceType === "vm-agent" ? selectedAgentId : undefined,
        selectedPaths: sourceType === "vm-agent" ? selectedPaths : undefined,
        scope: sourceType === "vm-agent" ? "selected" : undefined,
        scanners: selectedScanners,
        frequency,
        timeOfDay,
        timesPerDay,
        weekdays: frequency === "weekly" ? weekdays : [],
        monthDays: frequency === "monthly" ? monthDays : [],
        timezone: "Asia/Calcutta",
        businessContext,
        reportEmail,
        enabled: true
      });
      setMessage("Schedule created. Results will appear in each scanner history and risk reports after every run.");
      await refresh();
    } catch (err: unknown) {
      setError(errorMessage(err, "Failed to create schedule"));
    } finally {
      setSaving(false);
    }
  }

  function toggleScanner(scanner: ScannerModule) {
    setSelectedScanners((current) =>
      current.includes(scanner) ? current.filter((item) => item !== scanner) : [...current, scanner]
    );
  }

  function toggleWeekday(day: number) {
    setWeekdays((current) => current.includes(day) ? current.filter((item) => item !== day) : [...current, day].sort());
  }

  function setBusinessValue(key: keyof BusinessRiskContext, value: number) {
    setBusinessContext((current) => ({ ...current, [key]: value }));
  }

  return (
    <div className="max-w-[1280px] mx-auto flex flex-col gap-section-gap animate-in fade-in duration-500 pb-12">
      <section className="mx-auto w-full px-8 py-8">
        <div className="mb-8 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary shadow-inner">
              <span className="material-symbols-outlined text-[24px] text-white">schedule</span>
            </div>
            <div>
              <h1 className="text-headline-lg font-headline-lg text-text-primary mb-1">Schedule Scans</h1>
              <p className="text-body-sm text-text-secondary">Run dependency, config, secret, and cipher scans automatically for repositories and agents.</p>
            </div>
          </div>
          <button onClick={refresh} className="rounded-md border border-border-divider bg-surface transition-colors duration-300 px-4 py-2 text-body-sm font-bold text-text-primary hover:bg-surface-container transition shadow-sm">
            <span className="material-symbols-outlined text-[16px] mr-2 align-text-bottom">refresh</span>
            Refresh
          </button>
        </div>

        {(error || message) && (
          <div className={`mb-5 rounded-md border px-4 py-3 text-body-sm ${error ? "border-red-200 bg-red-50 text-red-700" : "border-green-200 bg-green-50 text-green-700"}`}>
            {error || message}
          </div>
        )}

        <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <section className="rounded-2xl border border-border-divider bg-surface-container-lowest p-5 shadow-sm">
            <h2 className="text-title-md font-title-md text-text-primary">Create Schedule</h2>
            
            <div className="mb-5 mt-4 flex border-b border-border-divider">
              <button
                type="button"
                className={`flex-1 py-3 text-body-sm font-bold transition-colors ${sourceType === "github" ? "border-b-2 border-primary text-primary" : "text-text-secondary hover:bg-surface-container/50"}`}
                onClick={() => setSourceType("github")}
              >
                GitHub Repository
              </button>
              <button
                type="button"
                className={`flex-1 py-3 text-body-sm font-bold transition-colors ${sourceType === "vm-agent" ? "border-b-2 border-primary text-primary" : "text-text-secondary hover:bg-surface-container/50"}`}
                onClick={() => setSourceType("vm-agent")}
              >
                VM Agent
              </button>
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              <label className="space-y-2">
                <span className="text-body-sm font-medium text-text-secondary">Schedule name</span>
                <input value={name} onChange={(event) => setName(event.target.value)} className="w-full rounded-md border border-border-divider px-3 py-2 text-body-sm outline-none focus:border-primary" />
              </label>
              
              {sourceType === "github" ? (
                <label className="space-y-2">
                  <span className="text-body-sm font-medium text-text-secondary">Repository</span>
                  <select value={selectedRepoId} onChange={(event) => setSelectedRepoId(event.target.value)} className="w-full rounded-md border border-border-divider px-3 py-2 text-body-sm outline-none focus:border-primary">
                    {repos.map((repo) => (
                      <option key={repo.id} value={repo.id}>{repo.fullName}</option>
                    ))}
                  </select>
                </label>
              ) : (
                <label className="space-y-2">
                  <span className="text-body-sm font-medium text-text-secondary">VM Agent</span>
                  <select value={selectedAgentId} onChange={(event) => setSelectedAgentId(event.target.value)} className="w-full rounded-md border border-border-divider px-3 py-2 text-body-sm outline-none focus:border-primary">
                    {agents.map((agent) => (
                      <option key={agent.id} value={agent.id}>{agent.name} ({agent.hostname})</option>
                    ))}
                  </select>
                </label>
              )}
            </div>

            {sourceType === "vm-agent" && (
              <div className="mt-5">
                <p className="text-body-sm font-medium text-text-secondary mb-2">Paths to scan</p>
                <RemoteFileExplorer
                  agentId={selectedAgentId}
                  hasAgents={agents.length > 0}
                  selectedPaths={selectedPaths}
                  togglePath={(path) => setSelectedPaths((current) => current.includes(path) ? current.filter((item) => item !== path) : [...current, path])}
                />
              </div>
            )}

            <div className="mt-5">
              <p className="text-body-sm font-medium text-text-secondary">Scanner modules</p>
              <div className="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {SCANNERS.map((scanner) => {
                  const selected = selectedScanners.includes(scanner.id);
                  return (
                    <button key={scanner.id} type="button" onClick={() => toggleScanner(scanner.id)} className={`rounded-md border p-3 text-left transition ${selected ? "border-primary bg-primary-container/10" : "border-border-divider hover:border-primary/50"}`}>
                      <span className="material-symbols-outlined text-[20px] text-primary">{scanner.icon}</span>
                      <span className="mt-2 block text-body-sm font-semibold text-text-primary">{scanner.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-3">
              <label className="space-y-2">
                <span className="text-body-sm font-medium text-text-secondary">Frequency</span>
                <select value={frequency} onChange={(event) => setFrequency(event.target.value as ScheduleFrequency)} className="w-full rounded-md border border-border-divider px-3 py-2 text-body-sm outline-none focus:border-primary">
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </label>
              <label className="space-y-2">
                <span className="text-body-sm font-medium text-text-secondary">First run time</span>
                <input type="time" value={timeOfDay} onChange={(event) => setTimeOfDay(event.target.value)} className="w-full rounded-md border border-border-divider px-3 py-2 text-body-sm outline-none focus:border-primary" />
              </label>
              <label className="space-y-2">
                <span className="text-body-sm font-medium text-text-secondary">Runs per day</span>
                <input type="number" min={1} max={8} value={timesPerDay} onChange={(event) => setTimesPerDay(Number(event.target.value))} className="w-full rounded-md border border-border-divider px-3 py-2 text-body-sm outline-none focus:border-primary" />
              </label>
            </div>

            {frequency === "weekly" && (
              <div className="mt-5">
                <p className="text-body-sm font-medium text-text-secondary">Weekly days</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((label, index) => (
                    <button key={label} type="button" onClick={() => toggleWeekday(index)} className={`rounded-md border px-3 py-2 text-body-sm ${weekdays.includes(index) ? "border-primary bg-primary-container/10 text-primary" : "border-border-divider text-text-secondary"}`}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {frequency === "monthly" && (
              <label className="mt-5 block space-y-2">
                <span className="text-body-sm font-medium text-text-secondary">Month days</span>
                <input value={monthDays.join(",")} onChange={(event) => setMonthDays(event.target.value.split(",").map((item) => Number(item.trim())).filter(Boolean))} placeholder="1,15,28" className="w-full rounded-md border border-border-divider px-3 py-2 text-body-sm outline-none focus:border-primary" />
              </label>
            )}

            <label className="mt-5 block space-y-2">
              <span className="text-body-sm font-medium text-text-secondary">Mail report to</span>
              <input type="email" value={reportEmail} onChange={(event) => setReportEmail(event.target.value)} placeholder="security-team@bank.com" className="w-full rounded-md border border-border-divider px-3 py-2 text-body-sm outline-none focus:border-primary" />
            </label>

            <div className="mt-5">
              <p className="text-body-sm font-semibold text-text-primary">Business risk inputs</p>
              <div className="mt-3 grid gap-3 lg:grid-cols-2">
                {BUSINESS_FIELDS.map((field) => (
                  <label key={field.key} className="rounded-md border border-border-divider p-3" title={field.help}>
                    <div className="flex items-center justify-between">
                      <span className="text-body-sm font-medium text-text-primary">{field.label}</span>
                      <span className="rounded bg-surface-container px-2 py-1 text-label-sm text-text-secondary">{businessContext[field.key]}/10</span>
                    </div>
                    <input type="range" min={0} max={10} value={businessContext[field.key]} onChange={(event) => setBusinessValue(field.key, Number(event.target.value))} className="mt-3 w-full" />
                  </label>
                ))}
              </div>
            </div>

            <button disabled={saving || loading || !repos.length} onClick={submitSchedule} className="mt-6 w-full rounded-md bg-primary px-4 py-3 text-body-sm font-semibold text-on-primary shadow-sm disabled:cursor-not-allowed disabled:opacity-60">
              {saving ? "Creating schedule..." : "Create Scheduled Scan"}
            </button>
          </section>

          <section className="space-y-4">
            <div className="rounded-2xl border border-border-divider bg-surface-container-lowest p-5 shadow-sm">
              <h2 className="text-title-md font-title-md text-text-primary">Active Schedules</h2>
              <p className="mt-1 text-body-sm text-text-secondary">
                Scheduler runs in the backend every minute. Each run creates scanner jobs and a risk report.
              </p>
            </div>

            {loading ? (
              <div className="rounded-2xl border border-border-divider bg-surface-container-lowest p-6 text-body-sm text-text-secondary">Loading schedules...</div>
            ) : schedules.length ? (
              schedules.map((schedule) => (
                <ScheduleCard key={schedule.id} schedule={schedule} onRefresh={refresh} />
              ))
            ) : (
              <div className="rounded-2xl border border-border-divider bg-surface-container-lowest p-6 text-center text-body-sm text-text-secondary">
                No schedules yet. Create one for a GitHub repository or VM Agent.
              </div>
            )}
          </section>
        </div>
      </section>
    </div>
  );
}

function ScheduleCard({ schedule, onRefresh }: { schedule: ScheduledScan; onRefresh: () => Promise<void> }) {
  const [busy, setBusy] = useState(false);

  async function action(fn: () => Promise<unknown>) {
    setBusy(true);
    try {
      await fn();
      await onRefresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className="rounded-2xl border border-border-divider bg-surface-container-lowest p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-title-sm font-title-sm text-text-primary">{schedule.name}</h3>
          <p className="mt-1 text-body-sm text-text-secondary">{schedule.sourceLabel}</p>
        </div>
        <span className={`rounded px-2 py-1 text-label-sm font-semibold ${schedule.enabled ? "bg-green-50 text-green-700" : "bg-surface-container text-text-secondary"}`}>
          {schedule.enabled ? "enabled" : "disabled"}
        </span>
      </div>
      <div className="mt-4 grid gap-3 text-body-sm text-text-secondary sm:grid-cols-2">
        <p><span className="font-semibold text-text-primary">Next:</span> {formatDate(schedule.nextRunAt)}</p>
        <p><span className="font-semibold text-text-primary">Last:</span> {formatDate(schedule.lastRunAt)}</p>
        <p><span className="font-semibold text-text-primary">Frequency:</span> {schedule.frequency}, {schedule.timesPerDay}x/day</p>
        <p><span className="font-semibold text-text-primary">Status:</span> {schedule.running ? "running" : schedule.lastStatus || "not run"}</p>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {schedule.scanners.map((scanner) => (
          <span key={scanner} className="rounded bg-surface-container px-2 py-1 text-label-sm text-text-secondary">{scanner}</span>
        ))}
      </div>
      {schedule.lastError && (
        <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-body-sm text-red-700">{schedule.lastError}</p>
      )}
      {schedule.lastRiskAssessmentId && (
        <Link href={`/risk-reports/${schedule.lastRiskAssessmentId}`} className="mt-3 inline-flex text-body-sm font-semibold text-primary">
          Open latest risk report
        </Link>
      )}
      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        <button disabled={busy || schedule.running} onClick={() => action(() => runScheduledScanNow(schedule.id))} className="rounded-md border border-primary px-3 py-2 text-body-sm font-semibold text-primary disabled:opacity-60">
          Run now
        </button>
        <button disabled={busy} onClick={() => action(() => updateScheduledScan(schedule.id, { enabled: !schedule.enabled }))} className="rounded-md border border-border-divider px-3 py-2 text-body-sm font-semibold text-text-primary disabled:opacity-60">
          {schedule.enabled ? "Disable" : "Enable"}
        </button>
        <button disabled={busy || schedule.running} onClick={() => action(() => deleteScheduledScan(schedule.id))} className="rounded-md border border-red-200 px-3 py-2 text-body-sm font-semibold text-red-700 disabled:opacity-60">
          Delete
        </button>
      </div>
    </article>
  );
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleString();
}

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}
