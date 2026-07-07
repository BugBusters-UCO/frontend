"use client";

import React, { useState, useEffect } from "react";
import { DisclaimerModal } from "@/widgets/DisclaimerModal";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { InfoTooltip } from "@/shared/ui/InfoTooltip";
import { fetchDashboardStats, fetchRiskOverview } from "@/shared/api/client";

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
            <div key={i} className="h-28 bg-surface-container-high rounded-xl"></div>
          ))}
        </div>
        <div className="h-64 bg-surface-container-high rounded-xl"></div>
      </div>
    );
  }

  const successRate = stats?.totalScans ? Math.round((stats.successfulScans / stats.totalScans) * 100) : 0;

  const getCategoryWidth = (count: number) => {
    if (!stats?.totalScans) return '0%';
    return `${Math.max(2, (count / stats.totalScans) * 100)}%`;
  };

  return (
    <div className="max-w-[1280px] mx-auto flex flex-col gap-section-gap pb-12 animate-in fade-in duration-500">
      <DisclaimerModal />
      {/* Quick Actions & Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-headline-lg text-headline-lg text-text-primary mb-1">Security Dashboard</h1>
          <p className="font-body-sm text-body-sm text-text-secondary">Comprehensive security insights and scanning metrics.</p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/vc-dashboard" className="px-4 py-2 bg-primary text-white rounded-lg font-medium text-sm hover:bg-primary/90 transition-colors flex items-center gap-2 shadow-sm">
            <span className="material-symbols-outlined text-[18px]">add</span>
            New Scan
          </Link>
          <Link href="/schedule-scans" className="px-4 py-2 bg-white border border-border-subtle text-text-primary rounded-lg font-medium text-sm hover:bg-surface-container-low transition-colors flex items-center gap-2 shadow-sm">
            <span className="material-symbols-outlined text-[18px]">calendar_clock</span>
            Schedule
          </Link>
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="p-2.5 bg-white rounded-full hover:bg-surface-container-high transition-colors text-text-muted hover:text-text-primary flex items-center justify-center border border-transparent hover:border-border-subtle shadow-sm disabled:opacity-50"
            title="Refresh Dashboard"
          >
            <span className={`material-symbols-outlined text-[20px] ${isFetching ? 'animate-spin text-primary' : ''}`}>
              refresh
            </span>
          </button>
        </div>
      </div>

      {/* Top Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-element-gap">
        <div className="bg-white p-5 rounded-xl border border-border-subtle shadow-sm flex flex-col gap-3 group hover:border-primary/30 transition-colors">
          <div className="flex items-center justify-between">
            <p className="font-body-sm text-body-sm text-text-muted font-medium flex items-center gap-1.5">
              Total Scans
              <InfoTooltip text="Total number of scans executed across all categories" />
            </p>
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined text-[18px]">fact_check</span>
            </div>
          </div>
          <p className="font-metric-value text-metric-value text-text-primary">{stats?.totalScans || 0}</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-border-subtle shadow-sm flex flex-col gap-3 group hover:border-tertiary/30 transition-colors">
          <div className="flex items-center justify-between">
            <p className="font-body-sm text-body-sm text-text-muted font-medium flex items-center gap-1.5">
              Health Score
              <InfoTooltip text="Aggregate platform risk score based on all assets" />
            </p>
            <div className="w-8 h-8 rounded-full bg-tertiary/10 flex items-center justify-center text-tertiary group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined text-[18px]">health_metrics</span>
            </div>
          </div>
          <div className="flex items-end gap-2">
            <p className="font-metric-value text-metric-value text-text-primary">{latestRiskScore || "N/A"}</p>
          </div>
        </div>



        <div className="bg-[#fff8eb] p-5 rounded-xl border border-[#ffd6a5] shadow-sm flex flex-col gap-3 group hover:border-[#8a5200]/40 transition-colors">
          <div className="flex items-center justify-between">
            <p className="font-body-sm text-body-sm text-[#8a5200] font-medium flex items-center gap-1.5">
              Total Findings
              <InfoTooltip text="Sum of all vulnerabilities and misconfigurations found" />
            </p>
            <div className="w-8 h-8 rounded-full bg-[#8a5200]/10 flex items-center justify-center text-[#8a5200] group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined text-[18px]">warning</span>
            </div>
          </div>
          <p className="font-metric-value text-metric-value text-[#8a5200]">{stats?.totalFindings || 0}</p>
        </div>

        <div className="bg-[#fff0f0] p-5 rounded-xl border border-[#f3b4b4] shadow-sm flex flex-col gap-3 group hover:border-severity-critical/40 transition-colors">
          <div className="flex items-center justify-between">
            <p className="font-body-sm text-body-sm text-severity-critical font-medium flex items-center gap-1.5">
              Critical Issues
              <InfoTooltip text="Issues marked with critical severity requiring immediate attention" />
            </p>
            <div className="w-8 h-8 rounded-full bg-severity-critical/10 flex items-center justify-center text-severity-critical group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined text-[18px]">error</span>
            </div>
          </div>
          <p className="font-metric-value text-metric-value text-severity-critical">{stats?.criticalFindings || 0}</p>
        </div>
      </div>

      {/* Graphical Dashboard */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-element-gap">
        {/* Scans by Category Chart */}
        <div className="bg-white rounded-xl border border-border-subtle shadow-sm p-6 group hover:shadow-md transition-shadow">
          <div className="flex items-center gap-2 mb-6">
            <span className="material-symbols-outlined text-primary">pie_chart</span>
            <h2 className="text-lg font-semibold text-text-primary">Scans by Category</h2>
            <InfoTooltip text="Distribution of executed scans across all supported security scanners." />
          </div>

          <div className="space-y-6">
            {/* Dependency */}
            <div>
              <div className="flex justify-between text-sm mb-1.5 font-medium">
                <span className="text-text-secondary flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#3b82f6]"></span>
                  Dependency Scan
                </span>
                <span className="text-text-primary">{stats?.scanCounts?.dependency || 0}</span>
              </div>
              <div className="w-full bg-surface-container-high rounded-full h-2 overflow-hidden">
                <div
                  className="bg-[#3b82f6] h-2 rounded-full transition-all duration-1000 ease-out"
                  style={{ width: getCategoryWidth(stats?.scanCounts?.dependency || 0) }}
                ></div>
              </div>
            </div>

            {/* Config */}
            <div>
              <div className="flex justify-between text-sm mb-1.5 font-medium">
                <span className="text-text-secondary flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#a855f7]"></span>
                  Config Scan
                </span>
                <span className="text-text-primary">{stats?.scanCounts?.config || 0}</span>
              </div>
              <div className="w-full bg-surface-container-high rounded-full h-2 overflow-hidden">
                <div
                  className="bg-[#a855f7] h-2 rounded-full transition-all duration-1000 ease-out"
                  style={{ width: getCategoryWidth(stats?.scanCounts?.config || 0) }}
                ></div>
              </div>
            </div>

            {/* Secret */}
            <div>
              <div className="flex justify-between text-sm mb-1.5 font-medium">
                <span className="text-text-secondary flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#f59e0b]"></span>
                  Secret Scan
                </span>
                <span className="text-text-primary">{stats?.scanCounts?.secret || 0}</span>
              </div>
              <div className="w-full bg-surface-container-high rounded-full h-2 overflow-hidden">
                <div
                  className="bg-[#f59e0b] h-2 rounded-full transition-all duration-1000 ease-out"
                  style={{ width: getCategoryWidth(stats?.scanCounts?.secret || 0) }}
                ></div>
              </div>
            </div>

            {/* Cipher */}
            <div>
              <div className="flex justify-between text-sm mb-1.5 font-medium">
                <span className="text-text-secondary flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#14b8a6]"></span>
                  Cipher Scan
                </span>
                <span className="text-text-primary">{stats?.scanCounts?.cipher || 0}</span>
              </div>
              <div className="w-full bg-surface-container-high rounded-full h-2 overflow-hidden">
                <div
                  className="bg-[#14b8a6] h-2 rounded-full transition-all duration-1000 ease-out"
                  style={{ width: getCategoryWidth(stats?.scanCounts?.cipher || 0) }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        {/* Scan Execution Status */}
        <div className="bg-white rounded-xl border border-border-subtle shadow-sm p-6 flex flex-col group hover:shadow-md transition-shadow">
          <div className="flex items-center gap-2 mb-6">
            <span className="material-symbols-outlined text-primary">monitoring</span>
            <h2 className="text-lg font-semibold text-text-primary">Execution Status</h2>
            <InfoTooltip text="Ratio of scans that completed successfully vs failed." />
          </div>

          <div className="flex-1 flex flex-col justify-center gap-8">
            <div className="flex items-end justify-between px-4">
              <div className="text-center group-hover:-translate-y-1 transition-transform">
                <p className="text-3xl font-bold text-severity-low">{stats?.successfulScans || 0}</p>
                <p className="text-sm font-medium text-text-muted mt-1">Successful</p>
              </div>
              <div className="text-center group-hover:-translate-y-1 transition-transform">
                <p className="text-3xl font-bold text-text-primary">{stats?.totalScans || 0}</p>
                <p className="text-sm font-medium text-text-muted mt-1">Total</p>
              </div>
              <div className="text-center group-hover:-translate-y-1 transition-transform">
                <p className="text-3xl font-bold text-severity-critical">{stats?.failedScans || 0}</p>
                <p className="text-sm font-medium text-text-muted mt-1">Failed</p>
              </div>
            </div>

            <div className="px-4">
              <div className="w-full h-4 bg-surface-container-high rounded-full overflow-hidden flex">
                <div
                  className="h-full bg-severity-low transition-all duration-1000"
                  style={{ width: `${successRate}%` }}
                ></div>
                <div
                  className="h-full bg-severity-critical transition-all duration-1000"
                  style={{ width: `${stats?.totalScans ? 100 - successRate : 0}%` }}
                ></div>
              </div>
              <div className="flex justify-between text-xs font-medium text-text-muted mt-2">
                <span>{successRate}% Success</span>
                <span>{stats?.totalScans ? 100 - successRate : 0}% Failure</span>
              </div>
            </div>
          </div>
        </div>

        {/* Top Riskiest Assets */}
        <div className="bg-white rounded-xl border border-border-subtle shadow-sm p-6 group hover:shadow-md transition-shadow flex flex-col">
          <div className="flex items-center gap-2 mb-6">
            <span className="material-symbols-outlined text-severity-high">warning</span>
            <h2 className="text-lg font-semibold text-text-primary">Top Riskiest Assets</h2>
            <InfoTooltip text="Targets with the highest number of critical and high severity findings." />
          </div>

          <div className="flex flex-col gap-4 flex-1 justify-center">
            {stats?.riskiestAssets && stats.riskiestAssets.length > 0 ? (
              stats.riskiestAssets.map((asset, idx) => (
                <div key={idx} className="flex items-center justify-between border-b border-border-subtle pb-3 last:border-0 last:pb-0">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="w-8 h-8 rounded-full bg-surface-container-low flex items-center justify-center flex-shrink-0 text-text-muted">
                      {idx + 1}
                    </div>
                    <span className="font-medium text-sm text-text-primary truncate" title={asset.sourceLabel}>
                      {asset.sourceLabel}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="px-2 py-0.5 rounded-full bg-severity-critical/10 text-severity-critical text-xs font-bold">
                      {asset.criticalCount} C
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-severity-high/10 text-severity-high text-xs font-bold">
                      {asset.highCount} H
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center text-text-muted text-sm py-4">
                No high risk assets found.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Scanner metrics */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <span className="material-symbols-outlined text-primary">analytics</span>
          <h2 className="text-lg font-semibold text-text-primary">Scanner metrics</h2>
          <InfoTooltip text="Detailed breakdown of findings by scanner and severity." />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-element-gap">
          {[
            { id: 'dependency', name: 'Dependency Scan', icon: 'deployed_code' },
            { id: 'config', name: 'Config Scan', icon: 'settings_b_roll' },
            { id: 'secret', name: 'Secret Scan', icon: 'key' },
            { id: 'cipher', name: 'Cipher Scan', icon: 'lock' },
          ].map((scanner) => {
            const data = stats?.scannerDetails?.[scanner.id as keyof typeof stats.scannerDetails] || { findings: 0, critical: 0, high: 0, medium: 0, low: 0 };
            return (
              <div key={scanner.id} className="bg-white p-5 rounded-xl border border-border-subtle shadow-sm flex flex-col gap-4 group hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-text-primary flex items-center gap-2">
                    <span className="material-symbols-outlined text-text-muted text-[20px]">{scanner.icon}</span>
                    {scanner.name}
                  </span>
                  <span className="text-2xl font-bold text-text-primary">{data.findings}</span>
                </div>

                <div className="grid grid-cols-4 gap-1 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-severity-critical" style={{ width: data.findings ? `${(data.critical / data.findings) * 100}%` : '0%' }}></div>
                  <div className="bg-severity-high" style={{ width: data.findings ? `${(data.high / data.findings) * 100}%` : '0%' }}></div>
                  <div className="bg-severity-medium" style={{ width: data.findings ? `${(data.medium / data.findings) * 100}%` : '0%' }}></div>
                  <div className="bg-severity-low" style={{ width: data.findings ? `${(data.low / data.findings) * 100}%` : '0%' }}></div>
                </div>

                <div className="flex justify-between text-xs font-medium mt-1">
                  <div className="flex flex-col items-center">
                    <span className="text-severity-critical">{data.critical}</span>
                    <span className="text-text-muted text-[10px]">CRIT</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="text-severity-high">{data.high}</span>
                    <span className="text-text-muted text-[10px]">HIGH</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="text-severity-medium">{data.medium}</span>
                    <span className="text-text-muted text-[10px]">MED</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="text-severity-low">{data.low}</span>
                    <span className="text-text-muted text-[10px]">LOW</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* System Status & Automation */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <span className="material-symbols-outlined text-primary">hub</span>
          <h2 className="text-lg font-semibold text-text-primary">System Status & Automation</h2>
          <InfoTooltip text="Overview of connected integrations and scheduled jobs." />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-element-gap">
          {/* Scheduled Scans */}
          <div className="bg-white p-5 rounded-xl border border-border-subtle shadow-sm flex items-center justify-between group hover:border-primary/30 transition-colors">
            <div className="flex flex-col gap-1">
              <p className="font-body-sm text-body-sm text-text-muted font-medium flex items-center gap-1.5">
                Scheduled Scans
                <InfoTooltip text="Automated scan jobs currently registered in the system." />
              </p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-text-primary">{stats?.scheduled?.total || 0}</span>
                <span className="text-sm font-medium text-text-secondary">total</span>
                {stats?.scheduled?.failed ? (
                  <span className="text-sm font-medium text-severity-critical ml-2">{stats.scheduled.failed} failed</span>
                ) : (
                  <span className="text-sm font-medium text-severity-low ml-2">all healthy</span>
                )}
              </div>
            </div>
            <div className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center text-text-secondary group-hover:bg-primary/10 group-hover:text-primary transition-colors">
              <span className="material-symbols-outlined text-[20px]">calendar_clock</span>
            </div>
          </div>

          {/* VM Agents */}
          <div className="bg-white p-5 rounded-xl border border-border-subtle shadow-sm flex items-center justify-between group hover:border-primary/30 transition-colors">
            <div className="flex flex-col gap-1">
              <p className="font-body-sm text-body-sm text-text-muted font-medium flex items-center gap-1.5">
                VM Agents
                <InfoTooltip text="Registered virtual machine agents for local scanning." />
              </p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-text-primary">{stats?.agents?.total || 0}</span>
                <span className="text-sm font-medium text-text-secondary">total</span>
                <span className="text-sm font-medium text-severity-low ml-2">{stats?.agents?.connected || 0} connected</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center text-text-secondary group-hover:bg-primary/10 group-hover:text-primary transition-colors">
              <span className="material-symbols-outlined text-[20px]">dns</span>
            </div>
          </div>

          {/* GitHub Connection */}
          <div className="bg-white p-5 rounded-xl border border-border-subtle shadow-sm flex items-center justify-between group hover:border-primary/30 transition-colors">
            <div className="flex flex-col gap-1">
              <p className="font-body-sm text-body-sm text-text-muted font-medium flex items-center gap-1.5">
                Version Control
                <InfoTooltip text="Integration status with your GitHub account." />
              </p>
              <div className="flex items-center gap-2 mt-1">
                {stats?.githubConnected ? (
                  <>
                    <span className="w-2.5 h-2.5 rounded-full bg-severity-low"></span>
                    <span className="text-sm font-medium text-text-primary">Connected</span>
                  </>
                ) : (
                  <>
                    <span className="w-2.5 h-2.5 rounded-full bg-severity-high"></span>
                    <span className="text-sm font-medium text-text-muted">Not Connected</span>
                  </>
                )}
              </div>
            </div>
            <div className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center text-text-secondary group-hover:bg-primary/10 group-hover:text-primary transition-colors">
              <span className="material-symbols-outlined text-[20px]">code_blocks</span>
            </div>
          </div>
        </div>
      </div>

      {/* Activity Trend (7 Days) */}
      <div className="bg-white rounded-xl border border-border-subtle shadow-sm p-6 group hover:shadow-md transition-shadow">
        <div className="flex items-center gap-2 mb-6">
          <span className="material-symbols-outlined text-primary">trending_up</span>
          <h2 className="text-lg font-semibold text-text-primary">Activity Trend (7 Days)</h2>
          <InfoTooltip text="Total findings identified per day over the last week." />
        </div>
        <div className="flex items-end gap-2 h-32 w-full pt-4">
          {stats?.trendData ? (
            stats.trendData.map((point, idx) => {
              const maxFindings = Math.max(...stats.trendData.map(d => d.findingsCount), 1);
              const height = `${(point.findingsCount / maxFindings) * 100}%`;
              return (
                <div key={idx} className="flex-1 flex flex-col justify-end items-center group/bar relative h-full">
                  <div
                    className="w-full bg-primary/20 hover:bg-primary transition-all duration-300 rounded-t-sm"
                    style={{ height }}
                  ></div>
                  <div className="text-[10px] text-text-muted mt-2 font-medium">
                    {new Date(point.date).toLocaleDateString('en-US', { weekday: 'short' })}
                  </div>
                  <div className="absolute -top-8 bg-surface-container-highest text-white text-xs px-2 py-1 rounded opacity-0 group-hover/bar:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none">
                    {point.findingsCount} findings
                  </div>
                </div>
              );
            })
          ) : (
            <div className="w-full h-full flex items-center justify-center text-text-muted text-sm">Loading trend data...</div>
          )}
        </div>
      </div>

      {/* Recent Activity Feed */}
      <div className="bg-white rounded-xl border border-border-subtle shadow-sm p-6 group hover:shadow-md transition-shadow">
        <div className="flex items-center gap-2 mb-6">
          <span className="material-symbols-outlined text-primary">history</span>
          <h2 className="text-lg font-semibold text-text-primary">Recent Scan Activity</h2>
          <InfoTooltip text="The 5 most recently executed scan jobs." />
        </div>

        <div className="flex flex-col gap-4">
          {stats?.recentScans && stats.recentScans.length > 0 ? (
            stats.recentScans.map(scan => (
              <div key={scan.id} className="flex items-center justify-between border-b border-border-subtle pb-3 last:border-0 last:pb-0">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${scan.status === 'completed' ? 'bg-severity-low' : scan.status === 'failed' ? 'bg-severity-critical' : 'bg-primary animate-pulse'}`}></div>
                  <div className="flex flex-col">
                    <span className="font-medium text-sm text-text-primary flex items-center gap-2">
                      {scan.sourceLabel}
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-container text-text-secondary uppercase">{scan.scannerType}</span>
                    </span>
                    <span className="text-xs text-text-muted">
                      {new Date(scan.createdAt).toLocaleString()}
                    </span>
                  </div>
                </div>
                <Link href={`/${scan.scannerType}-scanner/${scan.id}`} className="p-1.5 rounded-md hover:bg-surface-container-high text-text-muted hover:text-primary transition-colors">
                  <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                </Link>
              </div>
            ))
          ) : (
            <div className="text-center text-text-muted text-sm py-4">
              No recent scan activity found.
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
