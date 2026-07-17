"use client";

import React from "react";
import { DisclaimerModal } from "@/widgets/DisclaimerModal";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { InfoTooltip } from "@/shared/ui/InfoTooltip";
import { fetchDashboardStats, fetchRiskOverview } from "@/shared/api/client";
import { CategoryDonutChart } from "@/widgets/charts/CategoryDonutChart";
import { TrendAreaChart } from "@/widgets/charts/TrendAreaChart";
import { motion } from "framer-motion";

export default function DashboardPage() {
  const { data: stats, isLoading: isStatsLoading, refetch, isFetching } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: fetchDashboardStats,
    refetchInterval: 12000,
  });

  const { data: riskOverview } = useQuery({
    queryKey: ["risk-overview"],
    queryFn: () => fetchRiskOverview({}),
    refetchInterval: 12000,
  });

  const latestRiskScore = riskOverview?.risk?.final_risk_score;

  if (!stats && isStatsLoading) {
    return (
      <div className="max-w-[1280px] mx-auto flex flex-col gap-section-gap animate-pulse">
        <div className="h-12 w-64 bg-surface-container-high rounded-md mb-6"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-element-gap">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-surface-container-high rounded-2xl"></div>
          ))}
        </div>
        <div className="h-64 bg-surface-container-high rounded-2xl"></div>
      </div>
    );
  }

  const successRate = stats?.totalScans ? Math.round((stats.successfulScans / stats.totalScans) * 100) : 0;

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 24 } }
  };

  return (
    <motion.div 
      initial="hidden"
      animate="show"
      variants={containerVariants}
      className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-8 pb-12 text-text-primary transition-colors duration-300"
    >
      <DisclaimerModal />
      
      {/* Quick Actions & Header */}
      <motion.div variants={itemVariants} className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-sans font-bold text-headline-lg text-text-primary mb-1 uppercase tracking-wider">Security Dashboard</h1>
          <p className="font-body-sm text-body-sm text-text-secondary">Comprehensive security insights and scanning metrics.</p>
        </div>
        <div className="flex items-center gap-3">
          {/*
          <Link href="/vc-dashboard" className="px-4 py-2 bg-primary text-white rounded-2xl font-medium text-sm hover:bg-primary/90 shadow-[0_0_15px_rgba(31,111,235,0.35)] transition-all duration-200 flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">add</span>
            New Scan
          </Link>
          */}
          <Link href="/schedule-scans" className="px-4 py-2 bg-surface border border-border-subtle text-text-primary rounded-2xl font-medium text-sm hover:bg-surface-dim transition-colors flex items-center gap-2 shadow-sm">
            <span className="material-symbols-outlined text-[18px]">calendar_clock</span>
            Schedule
          </Link>
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="p-2.5 bg-surface rounded-full hover:bg-surface-dim transition-colors text-text-muted hover:text-text-primary flex items-center justify-center border border-border-subtle shadow-sm disabled:opacity-50 cursor-pointer"
            title="Refresh Dashboard"
          >
            <span className={`material-symbols-outlined text-[20px] ${isFetching ? 'animate-spin text-primary' : ''}`}>
              refresh
            </span>
          </button>
        </div>
      </motion.div>

      {/* Top Metrics Row - Monochromatic with minimal accents */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-element-gap">
        <div className="bg-surface p-6 rounded-2xl border border-border-subtle shadow-sm flex flex-col gap-3 group hover:border-primary/50 hover:shadow-md transition-all duration-300 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-primary/20 group-hover:bg-primary transition-colors"></div>
          <div className="flex items-center justify-between ml-1">
            <p className="font-body-sm text-body-sm text-text-muted font-medium flex items-center gap-1.5">
              Total Scans
              <InfoTooltip text="Total number of scans executed across all categories" />
            </p>
            <span className="material-symbols-outlined text-[20px] text-text-secondary group-hover:text-primary transition-colors">fact_check</span>
          </div>
          <p className="font-metric-value text-metric-value text-text-primary ml-1">{stats?.totalScans || 0}</p>
        </div>

        <div className="bg-surface p-6 rounded-2xl border border-border-subtle shadow-sm flex flex-col gap-3 group hover:border-emerald-500/50 hover:shadow-md transition-all duration-300 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500/20 group-hover:bg-emerald-500 transition-colors"></div>
          <div className="flex items-center justify-between ml-1">
            <p className="font-body-sm text-body-sm text-text-muted font-medium flex items-center gap-1.5">
              Health Score
              <InfoTooltip text="Aggregate platform risk score based on all assets" />
            </p>
            <span className="material-symbols-outlined text-[20px] text-text-secondary group-hover:text-emerald-500 transition-colors">health_metrics</span>
          </div>
          <p className="font-metric-value text-metric-value text-text-primary ml-1">{latestRiskScore || "N/A"}</p>
        </div>

        <div className="bg-surface p-6 rounded-2xl border border-border-subtle shadow-sm flex flex-col gap-3 group hover:border-orange-500/50 hover:shadow-md transition-all duration-300 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-orange-500/20 group-hover:bg-orange-500 transition-colors"></div>
          <div className="flex items-center justify-between ml-1">
            <p className="font-body-sm text-body-sm text-text-muted font-medium flex items-center gap-1.5">
              Total Findings
              <InfoTooltip text="Sum of all vulnerabilities and misconfigurations found" />
            </p>
            <span className="material-symbols-outlined text-[20px] text-text-secondary group-hover:text-orange-500 transition-colors">warning</span>
          </div>
          <p className="font-metric-value text-metric-value text-text-primary ml-1">{stats?.totalFindings || 0}</p>
        </div>

        <div className="bg-surface p-6 rounded-2xl border border-border-subtle shadow-sm flex flex-col gap-3 group hover:border-red-500/50 hover:shadow-md transition-all duration-300 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-red-500/20 group-hover:bg-red-500 transition-colors"></div>
          <div className="flex items-center justify-between ml-1">
            <p className="font-body-sm text-body-sm text-text-muted font-medium flex items-center gap-1.5">
              Critical Issues
              <InfoTooltip text="Issues marked with critical severity requiring immediate attention" />
            </p>
            <span className="material-symbols-outlined text-[20px] text-text-secondary group-hover:text-red-500 transition-colors">error</span>
          </div>
          <p className="font-metric-value text-metric-value text-text-primary ml-1">{stats?.criticalFindings || 0}</p>
        </div>
      </motion.div>

      {/* Graphical Dashboard */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-3 gap-element-gap">
        {/* Scans by Category Chart */}
        <div className="bg-surface rounded-2xl border border-border-subtle shadow-sm p-6 group hover:shadow-md transition-all duration-300">
          <div className="flex items-center gap-2 mb-2">
            <h2 className="text-sm font-bold font-sans uppercase tracking-wider text-text-secondary">Scans by Category</h2>
            <InfoTooltip text="Distribution of executed scans across all supported security scanners." />
          </div>
          <CategoryDonutChart scanCounts={stats?.scanCounts} />
        </div>

        {/* Activity Trend (7 Days) */}
        <div className="bg-surface rounded-2xl border border-border-subtle shadow-sm p-6 group hover:shadow-md transition-all duration-300 lg:col-span-2 flex flex-col">
          <div className="flex items-center gap-2 mb-2">
            <h2 className="text-sm font-bold font-sans uppercase tracking-wider text-text-secondary">Findings Trend (7 Days)</h2>
            <InfoTooltip text="Total findings identified per day over the last week." />
          </div>
          <div className="flex-1 mt-2">
             <TrendAreaChart trendData={stats?.trendData} />
          </div>
        </div>
      </motion.div>
      
      {/* Third Row */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-3 gap-element-gap">
        
        {/* Scan Execution Status */}
        <div className="bg-surface rounded-2xl border border-border-subtle shadow-sm p-6 flex flex-col group hover:shadow-md transition-all duration-300">
          <div className="flex items-center gap-2 mb-8">
            <h2 className="text-sm font-bold font-sans uppercase tracking-wider text-text-secondary">Execution Reliability</h2>
            <InfoTooltip text="Ratio of scans that completed successfully vs failed." />
          </div>

          <div className="flex-1 flex flex-col justify-center gap-8">
            <div className="flex items-end justify-between px-2">
              <div className="text-center group-hover:-translate-y-1 transition-transform">
                <p className="text-3xl font-bold text-text-primary">{stats?.successfulScans || 0}</p>
                <p className="text-sm font-medium text-text-muted mt-1">Successful</p>
              </div>
              <div className="text-center group-hover:-translate-y-1 transition-transform">
                <p className="text-3xl font-bold text-text-primary">{stats?.totalScans || 0}</p>
                <p className="text-sm font-medium text-text-muted mt-1">Total</p>
              </div>
              <div className="text-center group-hover:-translate-y-1 transition-transform">
                <p className="text-3xl font-bold text-red-500">{stats?.failedScans || 0}</p>
                <p className="text-sm font-medium text-text-muted mt-1">Failed</p>
              </div>
            </div>

            <div className="px-2 mt-4">
              <div className="w-full h-3 bg-surface-dim rounded-full overflow-hidden flex shadow-inner">
                <div
                  className="h-full bg-emerald-500 transition-all duration-1000"
                  style={{ width: `${successRate}%` }}
                ></div>
                <div
                  className="h-full bg-red-500 transition-all duration-1000"
                  style={{ width: `${stats?.totalScans ? 100 - successRate : 0}%` }}
                ></div>
              </div>
              <div className="flex justify-between text-xs font-medium text-text-muted mt-3">
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> {successRate}% Success</span>
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-500"></span> {stats?.totalScans ? 100 - successRate : 0}% Failure</span>
              </div>
            </div>
          </div>
        </div>

        {/* Top Riskiest Assets */}
        <div className="bg-surface rounded-2xl border border-border-subtle shadow-sm p-6 group hover:shadow-md transition-all duration-300 lg:col-span-2 flex flex-col">
          <div className="flex items-center justify-between mb-4">
             <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold font-sans uppercase tracking-wider text-text-secondary">Top Riskiest Assets</h2>
              <InfoTooltip text="Targets with the highest number of critical and high severity findings." />
             </div>
             <Link href="/risk-reports" className="text-xs font-semibold text-primary hover:underline">View All</Link>
          </div>

          <div className="flex flex-col gap-0 flex-1">
            {stats?.riskiestAssets && stats.riskiestAssets.length > 0 ? (
              stats.riskiestAssets.map((asset, idx) => (
                <div key={idx} className="flex items-center justify-between border-b border-border-subtle py-3 last:border-0 hover:bg-surface-dim/50 px-2 rounded-lg transition-colors">
                  <div className="flex items-center gap-4 overflow-hidden">
                    <div className="w-6 h-6 rounded-md bg-surface-dim border border-border-subtle flex items-center justify-center flex-shrink-0 text-text-secondary text-xs font-bold">
                      {idx + 1}
                    </div>
                    <span className="font-medium text-sm text-text-primary truncate" title={asset.sourceLabel}>
                      {asset.sourceLabel}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="flex items-center gap-1.5" title="Critical Findings">
                      <span className="w-2 h-2 rounded-full bg-red-500"></span>
                      <span className="text-text-primary text-sm font-bold">{asset.criticalCount}</span>
                    </div>
                    <div className="flex items-center gap-1.5" title="High Findings">
                      <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                      <span className="text-text-primary text-sm font-bold">{asset.highCount}</span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex-1 flex items-center justify-center text-text-muted text-sm py-4">
                No high risk assets found.
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* System Status & Automation */}
      <motion.div variants={itemVariants}>
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-sm font-bold font-sans uppercase tracking-wider text-text-secondary">System Integrations</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-element-gap">
          <div className="bg-surface p-5 rounded-2xl border border-border-subtle shadow-sm flex items-center justify-between group hover:border-border-divider transition-colors">
            <div className="flex flex-col gap-1">
              <p className="font-body-sm text-sm text-text-muted font-medium">Scheduled Scans</p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-text-primary">{stats?.scheduled?.total || 0}</span>
                {stats?.scheduled?.failed ? (
                  <span className="text-xs font-medium text-red-500 bg-red-500/10 px-1.5 py-0.5 rounded">{stats.scheduled.failed} failed</span>
                ) : (
                  <span className="text-xs font-medium text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded">All Healthy</span>
                )}
              </div>
            </div>
            <div className="text-text-muted group-hover:text-primary transition-colors">
              <span className="material-symbols-outlined text-[28px]">calendar_clock</span>
            </div>
          </div>

          <div className="bg-surface p-5 rounded-2xl border border-border-subtle shadow-sm flex items-center justify-between group hover:border-border-divider transition-colors">
            <div className="flex flex-col gap-1">
              <p className="font-body-sm text-sm text-text-muted font-medium">VM Agents</p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-text-primary">{stats?.agents?.total || 0}</span>
                <span className="text-xs font-medium text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded">{stats?.agents?.connected || 0} Online</span>
              </div>
            </div>
            <div className="text-text-muted group-hover:text-primary transition-colors">
              <span className="material-symbols-outlined text-[28px]">dns</span>
            </div>
          </div>

          {/*
          <div className="bg-surface p-5 rounded-2xl border border-border-subtle shadow-sm flex items-center justify-between group hover:border-border-divider transition-colors">
            <div className="flex flex-col gap-1">
              <p className="font-body-sm text-sm text-text-muted font-medium">Version Control</p>
              <div className="flex items-center gap-2 mt-1">
                {stats?.githubConnected ? (
                  <span className="text-sm font-medium text-text-primary flex items-center gap-2">
                     <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
                     Connected
                  </span>
                ) : (
                  <span className="text-sm font-medium text-text-muted flex items-center gap-2">
                     <span className="w-2 h-2 rounded-full bg-red-500"></span>
                     Disconnected
                  </span>
                )}
              </div>
            </div>
            <div className="text-text-muted group-hover:text-primary transition-colors">
              <span className="material-symbols-outlined text-[28px]">code_blocks</span>
            </div>
          </div>
          */}
        </div>
      </motion.div>

      {/* Recent Activity Feed */}
      <motion.div variants={itemVariants} className="bg-surface rounded-2xl border border-border-subtle shadow-sm p-6 group hover:shadow-md transition-all duration-300">
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-sm font-bold font-sans uppercase tracking-wider text-text-secondary">Recent Job Activity</h2>
          <InfoTooltip text="The 5 most recently executed scan jobs." />
        </div>

        <div className="flex flex-col gap-1">
          {stats?.recentScans && stats.recentScans.length > 0 ? (
            stats.recentScans.map(scan => (
              <div key={scan.id} className="flex items-center justify-between border-b border-border-subtle py-3 last:border-0 hover:bg-surface-dim/50 px-3 rounded-lg transition-colors">
                <div className="flex items-center gap-4">
                  <div className={`w-2.5 h-2.5 rounded-full ${scan.status === 'completed' ? 'bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.4)]' : scan.status === 'failed' ? 'bg-red-500 shadow-[0_0_5px_rgba(239,68,68,0.4)]' : 'bg-primary animate-pulse shadow-[0_0_5px_rgba(59,130,246,0.4)]'}`}></div>
                  <div className="flex flex-col">
                    <span className="font-medium text-sm text-text-primary flex items-center gap-2">
                      {scan.sourceLabel}
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-surface border border-border-subtle text-text-secondary uppercase">{scan.scannerType}</span>
                    </span>
                    <span className="text-xs text-text-muted mt-0.5">
                      {new Date(scan.createdAt).toLocaleString()}
                    </span>
                  </div>
                </div>
                <Link href={`/${scan.scannerType}-scanner/${scan.id}`} className="text-text-muted hover:text-primary transition-colors p-1">
                  <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
                </Link>
              </div>
            ))
          ) : (
            <div className="text-center text-text-muted text-sm py-4">
              No recent scan activity found.
            </div>
          )}
        </div>
      </motion.div>

    </motion.div>
  );
}
