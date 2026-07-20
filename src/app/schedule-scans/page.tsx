"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  createScheduledScan,
  deleteScheduledScan,
  fetchScheduledScans,
  fetchAgents,
  runScheduledScanNow,
  updateScheduledScan
} from "@/shared/api/client";
import type { BusinessRiskContext, ScheduledScan, ScannerModule, VmAgent } from "@/shared/api/types";
import { RemoteFileExplorer } from "@/shared/ui/RemoteFileExplorer";
import { InfoTooltip } from "@/shared/ui/InfoTooltip";
import { usePageContext } from "@/features/chatbot/usePageContext";

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

type ScheduleFrequency = "daily" | "weekly" | "monthly";

export default function ScheduleScansPage() {
  const [agents, setAgents] = useState<VmAgent[]>([]);
  const [schedules, setSchedules] = useState<ScheduledScan[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
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

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [schedulePayload, agentsPayload] = await Promise.all([
        fetchScheduledScans(),
        fetchAgents()
      ]);
      setSchedules(schedulePayload);
      setAgents(agentsPayload);
      setSelectedAgentId((current) => current || agentsPayload[0]?.id || "");
    } catch (err: unknown) {
      setError(errorMessage(err, "Failed to load schedules"));
    } finally {
      setLoading(false);
    }
  }, []);

  usePageContext({
    page: "Scheduled Scans Management",
    totalSchedules: schedules.length,
    availableAgents: agents.length,
    activeSchedules: schedules.filter((s) => s.status === "active").length,
    schedulesList: schedules.slice(0, 5).map((s) => ({
      id: s.id,
      name: s.name,
      status: s.status,
      frequency: s.frequency,
      agentCount: (s.target_agents || []).length,
    })),
  });

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void refresh();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [refresh]);

  async function submitSchedule() {
    if (!selectedAgentId) {
      setError("Connect a VM Agent before creating a schedule.");
      return;
    }
    if (selectedPaths.length === 0) {
      setError("Select at least one path to scan on the VM.");
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
        sourceType: "vm-agent",
        agentId: selectedAgentId,
        selectedPaths: selectedPaths,
        scope: "selected",
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

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 24 } }
  };

  return (
    <motion.div 
      initial="hidden" 
      animate="show" 
      variants={containerVariants}
      className="max-w-[1280px] mx-auto flex flex-col gap-8 py-8 px-4 sm:px-6 lg:px-8 pb-12"
    >
      <motion.div variants={itemVariants} className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-sans font-bold text-headline-lg text-text-primary mb-1 uppercase tracking-wider">Schedule Scans</h1>
          <p className="font-body-sm text-body-sm text-text-secondary">Automate security assessments for your VM infrastructure.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={refresh}
            disabled={loading}
            className="px-4 py-2 bg-surface border border-border-subtle text-text-primary rounded-xl font-medium text-sm hover:bg-surface-dim transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            <span className={`material-symbols-outlined text-[18px] ${loading ? 'animate-spin' : ''}`}>refresh</span>
            Refresh
          </button>
        </div>
      </motion.div>

      {(error || message) && (
        <motion.div variants={itemVariants} className={`rounded-xl border px-4 py-3 text-sm flex items-center gap-2 ${error ? "border-red-500/20 bg-red-500/10 text-red-400" : "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"}`}>
          <span className="material-symbols-outlined text-[20px]">{error ? "error" : "check_circle"}</span>
          {error || message}
        </motion.div>
      )}

      <div className="grid gap-8 lg:grid-cols-12 items-start">
        {/* Left Side: Create Form */}
        <motion.div variants={itemVariants} className="lg:col-span-7 flex flex-col gap-6">
          <div className="rounded-2xl border border-border-subtle bg-surface p-6 overflow-hidden">
            <div className="flex items-center gap-2 mb-6">
              <span className="material-symbols-outlined text-primary text-[24px]">calendar_add_on</span>
              <h2 className="text-section-header font-bold font-sans uppercase tracking-wider text-text-primary">Create Schedule</h2>
            </div>
            
            <div className="flex flex-col gap-6">
              {/* Basic Info */}
              <div className="flex flex-col gap-4">
                <label className="space-y-1.5">
                  <span className="text-xs font-bold uppercase tracking-widest text-text-secondary">Schedule Name</span>
                  <input 
                    value={name} 
                    onChange={(e) => setName(e.target.value)} 
                    className="w-full rounded-xl bg-surface-container-highest border border-border-subtle px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary text-text-primary transition-all"
                    placeholder="E.g., Production Core API Daily Scan"
                  />
                </label>

                <label className="space-y-1.5">
                  <span className="text-xs font-bold uppercase tracking-widest text-text-secondary">Target VM Agent</span>
                  <select 
                    value={selectedAgentId} 
                    onChange={(e) => setSelectedAgentId(e.target.value)} 
                    className="w-full rounded-xl bg-surface-container-highest border border-border-subtle px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary text-text-primary transition-all"
                  >
                    <option value="" disabled>Select an agent...</option>
                    {agents.map((agent) => (
                      <option key={agent.id} value={agent.id}>{agent.name} ({agent.hostname})</option>
                    ))}
                  </select>
                </label>
              </div>

              {/* Path Selection */}
              <div className="flex flex-col gap-1.5 pt-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-widest text-text-secondary">Paths to scan</span>
                  <InfoTooltip text="Select specific directories on the VM to isolate scanning scope." />
                </div>
                <div className="rounded-xl border border-border-subtle bg-surface-container overflow-hidden min-h-[200px]">
                  <RemoteFileExplorer
                    agentId={selectedAgentId}
                    hasAgents={agents.length > 0}
                    selectedPaths={selectedPaths}
                    togglePath={(path) => setSelectedPaths((current) => current.includes(path) ? current.filter((item) => item !== path) : [...current, path])}
                  />
                </div>
              </div>

              {/* Scanners */}
              <div className="flex flex-col gap-1.5 pt-2">
                <span className="text-xs font-bold uppercase tracking-widest text-text-secondary">Active Modules</span>
                <div className="grid gap-3 grid-cols-2 sm:grid-cols-4 mt-1">
                  {SCANNERS.map((scanner) => {
                    const selected = selectedScanners.includes(scanner.id);
                    return (
                      <button 
                        key={scanner.id} 
                        type="button" 
                        onClick={() => toggleScanner(scanner.id)} 
                        className={`rounded-xl border p-3 flex flex-col items-center justify-center gap-2 transition-all duration-200 ${selected ? "border-primary bg-primary-container/10 ring-1 ring-primary/50" : "border-border-subtle bg-surface-container hover:border-primary/50 hover:bg-surface-container-highest"}`}
                      >
                        <span className={`material-symbols-outlined text-[24px] ${selected ? "text-primary" : "text-text-muted"}`}>{scanner.icon}</span>
                        <span className={`text-xs font-bold tracking-wide ${selected ? "text-primary" : "text-text-secondary"}`}>{scanner.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Frequency Settings */}
              <div className="flex flex-col gap-1.5 pt-2">
                <span className="text-xs font-bold uppercase tracking-widest text-text-secondary">Timing & Frequency</span>
                <div className="grid gap-4 sm:grid-cols-3 mt-1 p-4 rounded-xl border border-border-subtle bg-surface-container">
                  <label className="space-y-1.5">
                    <span className="text-xs font-semibold text-text-muted">Type</span>
                    <select 
                      value={frequency} 
                      onChange={(e) => setFrequency(e.target.value as ScheduleFrequency)} 
                      className="w-full rounded-lg bg-surface-dim border border-border-subtle px-3 py-2 text-sm outline-none focus:border-primary text-text-primary"
                    >
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  </label>
                  <label className="space-y-1.5">
                    <span className="text-xs font-semibold text-text-muted">Start Time</span>
                    <input 
                      type="time" 
                      value={timeOfDay} 
                      onChange={(e) => setTimeOfDay(e.target.value)} 
                      className="w-full rounded-lg bg-surface-dim border border-border-subtle px-3 py-2 text-sm outline-none focus:border-primary text-text-primary" 
                    />
                  </label>
                  <label className="space-y-1.5">
                    <span className="text-xs font-semibold text-text-muted">Runs / Day</span>
                    <input 
                      type="number" 
                      min={1} 
                      max={8} 
                      value={timesPerDay} 
                      onChange={(e) => setTimesPerDay(Number(e.target.value))} 
                      className="w-full rounded-lg bg-surface-dim border border-border-subtle px-3 py-2 text-sm outline-none focus:border-primary text-text-primary" 
                    />
                  </label>
                </div>
              </div>

              {frequency === "weekly" && (
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-semibold text-text-muted">Days of Week</span>
                  <div className="flex flex-wrap gap-2">
                    {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((label, index) => (
                      <button 
                        key={label} 
                        type="button" 
                        onClick={() => toggleWeekday(index)} 
                        className={`rounded-lg border px-3 py-1.5 text-xs font-bold transition-colors ${weekdays.includes(index) ? "border-primary bg-primary text-white" : "border-border-subtle bg-surface-container text-text-secondary hover:bg-surface-container-highest"}`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {frequency === "monthly" && (
                <label className="space-y-1.5">
                  <span className="text-xs font-semibold text-text-muted">Days of Month (comma separated)</span>
                  <input 
                    value={monthDays.join(",")} 
                    onChange={(e) => setMonthDays(e.target.value.split(",").map((item) => Number(item.trim())).filter(Boolean))} 
                    placeholder="1,15,28" 
                    className="w-full rounded-lg bg-surface-container-highest border border-border-subtle px-3 py-2 text-sm outline-none focus:border-primary text-text-primary" 
                  />
                </label>
              )}

              {/* Reporting & Context */}
              <div className="flex flex-col gap-4 pt-2">
                <label className="space-y-1.5">
                  <span className="text-xs font-bold uppercase tracking-widest text-text-secondary">Reporting Email</span>
                  <input 
                    type="email" 
                    value={reportEmail} 
                    onChange={(e) => setReportEmail(e.target.value)} 
                    placeholder="security-team@bank.com" 
                    className="w-full rounded-xl bg-surface-container-highest border border-border-subtle px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary text-text-primary transition-all" 
                  />
                </label>
              </div>

              {/* Business Context */}
              <div className="flex flex-col gap-3 pt-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-widest text-text-secondary">Business Risk Context</span>
                  <InfoTooltip text="These parameters weight the final risk score in the unified reports." />
                </div>
                <div className="grid gap-3 sm:grid-cols-2 p-4 rounded-xl border border-border-subtle bg-surface-container">
                  {BUSINESS_FIELDS.map((field) => (
                    <label key={field.key} className="flex flex-col gap-1.5 p-2" title={field.help}>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-text-primary">{field.label}</span>
                        <span className="rounded bg-surface-dim px-1.5 py-0.5 text-[10px] font-mono text-text-secondary border border-border-subtle">{businessContext[field.key]}/10</span>
                      </div>
                      <input 
                        type="range" 
                        min={0} 
                        max={10} 
                        value={businessContext[field.key]} 
                        onChange={(e) => setBusinessValue(field.key, Number(e.target.value))} 
                        className="w-full accent-primary h-1.5 bg-surface-dim rounded-lg appearance-none cursor-pointer" 
                      />
                    </label>
                  ))}
                </div>
              </div>

              <button 
                disabled={saving || loading || !agents.length} 
                onClick={submitSchedule} 
                className="mt-2 w-full rounded-xl bg-primary px-4 py-3.5 text-sm font-bold text-white hover:bg-primary/90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-[20px]">send</span>
                {saving ? "Creating Schedule..." : "Activate Scheduled Scan"}
              </button>
            </div>
          </div>
        </motion.div>

        {/* Right Side: Active Schedules */}
        <motion.div variants={itemVariants} className="lg:col-span-5 flex flex-col gap-4">
          <div className="flex items-center gap-2 mb-2 px-1">
            <span className="material-symbols-outlined text-text-secondary text-[20px]">list_alt</span>
            <h2 className="text-sm font-bold font-sans uppercase tracking-wider text-text-secondary">Active Configurations</h2>
          </div>

          <div className="flex flex-col gap-4">
            {loading ? (
              <div className="rounded-2xl border border-border-subtle bg-surface p-8 text-center animate-pulse flex flex-col items-center gap-3">
                <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin"></div>
                <p className="text-sm text-text-muted font-medium">Loading schedules...</p>
              </div>
            ) : schedules.length ? (
              schedules.map((schedule) => (
                <ScheduleCard key={schedule.id} schedule={schedule} onRefresh={refresh} />
              ))
            ) : (
              <div className="rounded-2xl border border-border-subtle bg-surface p-10 text-center flex flex-col items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-surface-container flex items-center justify-center">
                  <span className="material-symbols-outlined text-text-muted text-3xl">inbox</span>
                </div>
                <div>
                  <p className="text-sm font-bold text-text-primary mb-1">No Active Schedules</p>
                  <p className="text-xs text-text-secondary">Configure a new automated VM scan to see it here.</p>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </motion.div>
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
    <article className="rounded-2xl border border-border-subtle bg-surface p-5 transition-shadow relative overflow-hidden flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 border-b border-border-divider pb-3">
        <div className="flex flex-col gap-1">
          <h3 className="text-sm font-bold text-text-primary leading-tight">{schedule.name}</h3>
          <div className="flex items-center gap-1.5 text-xs text-text-secondary font-mono">
            <span className="material-symbols-outlined text-[14px]">dns</span>
            {schedule.sourceLabel}
          </div>
        </div>
        <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider border ${schedule.enabled ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : "bg-surface-container text-text-muted border-border-subtle"}`}>
          {schedule.enabled ? "Active" : "Disabled"}
        </span>
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-2 gap-y-3 gap-x-2 text-xs">
        <div className="flex flex-col">
          <span className="text-text-muted font-semibold uppercase tracking-wider text-[10px] mb-0.5">Next Run</span>
          <span className="text-text-primary font-mono bg-surface-container-highest px-1.5 py-0.5 rounded border border-border-subtle w-fit">{formatDate(schedule.nextRunAt)}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-text-muted font-semibold uppercase tracking-wider text-[10px] mb-0.5">Last Run</span>
          <span className="text-text-primary font-mono bg-surface-container-highest px-1.5 py-0.5 rounded border border-border-subtle w-fit">{formatDate(schedule.lastRunAt)}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-text-muted font-semibold uppercase tracking-wider text-[10px] mb-0.5">Pattern</span>
          <span className="text-text-primary capitalize">{schedule.frequency} ({schedule.timesPerDay}x/day)</span>
        </div>
        <div className="flex flex-col">
          <span className="text-text-muted font-semibold uppercase tracking-wider text-[10px] mb-0.5">Status</span>
          <span className={`flex items-center gap-1 font-semibold ${schedule.running ? 'text-primary' : 'text-text-secondary'}`}>
            {schedule.running && <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>}
            {schedule.running ? "Running..." : schedule.lastStatus || "Pending"}
          </span>
        </div>
      </div>

      {/* Scanners Badges */}
      <div className="flex flex-wrap gap-1.5">
        {schedule.scanners.map((scanner) => (
          <span key={scanner} className="rounded bg-surface-container border border-border-subtle px-1.5 py-0.5 text-[10px] font-bold text-text-secondary uppercase tracking-wider flex items-center gap-1">
            <span className="w-1 h-1 rounded-full bg-text-muted"></span>
            {scanner}
          </span>
        ))}
      </div>

      {/* Errors / Links */}
      {schedule.lastError && (
        <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2 text-xs text-red-400 flex items-start gap-2">
          <span className="material-symbols-outlined text-[16px] shrink-0">error</span>
          <span>{schedule.lastError}</span>
        </div>
      )}
      {schedule.lastRiskAssessmentId && (
        <Link href={`/risk-reports/${schedule.lastRiskAssessmentId}`} className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline group w-fit">
          <span className="material-symbols-outlined text-[16px] group-hover:translate-x-0.5 transition-transform">article</span>
          View latest risk report
        </Link>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 pt-2 border-t border-border-divider mt-1">
        <button 
          disabled={busy || schedule.running} 
          onClick={() => action(() => runScheduledScanNow(schedule.id))} 
          className="flex-1 rounded-lg border border-primary/50 bg-primary/10 px-2 py-1.5 text-xs font-bold text-primary hover:bg-primary/20 transition-colors disabled:opacity-50 flex items-center justify-center gap-1"
        >
          <span className="material-symbols-outlined text-[14px]">play_arrow</span>
          Run
        </button>
        <button 
          disabled={busy} 
          onClick={() => action(() => updateScheduledScan(schedule.id, { enabled: !schedule.enabled }))} 
          className="flex-1 rounded-lg border border-border-subtle bg-surface-container px-2 py-1.5 text-xs font-bold text-text-primary hover:bg-surface-container-highest transition-colors disabled:opacity-50 flex items-center justify-center gap-1"
        >
          <span className="material-symbols-outlined text-[14px]">{schedule.enabled ? "pause" : "play_circle"}</span>
          {schedule.enabled ? "Pause" : "Enable"}
        </button>
        <button 
          disabled={busy || schedule.running} 
          onClick={() => action(() => deleteScheduledScan(schedule.id))} 
          className="rounded-lg border border-red-500/30 bg-red-500/10 px-2 py-1.5 text-xs font-bold text-red-500 hover:bg-red-500/20 transition-colors disabled:opacity-50 flex items-center justify-center"
          title="Delete Schedule"
        >
          <span className="material-symbols-outlined text-[16px]">delete</span>
        </button>
      </div>
    </article>
  );
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}
