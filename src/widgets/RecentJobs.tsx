import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ScanJob } from "@/shared/api/types";
import { SkeletonJobRow } from "@/widgets/Skeleton";

interface RecentJobsProps {
  jobs: ScanJob[];
  isLoading?: boolean;
}

export function RecentJobs({ jobs, isLoading }: RecentJobsProps) {
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);
  const groupedJobs = jobs.reduce((acc, job) => {
    const label = job.sourceLabel || "Unknown Project";
    if (!acc[label]) acc[label] = [];
    acc[label].push(job);
    return acc;
  }, {} as Record<string, ScanJob[]>);

  return (
    <div className="bg-surface rounded-2xl border border-border-subtle shadow-sm p-6 mt-6 transition-colors duration-300">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-section-header font-section-header text-text-primary">Recent Scans by Project</h2>
      </div>
      
      <div className="space-y-6 max-h-[600px] overflow-y-auto pr-2">
        {(!mounted || isLoading) ? (
          <div className="border border-border-divider rounded-2xl overflow-hidden bg-surface-container-lowest">
            <div className="bg-surface-container-highest px-4 py-3 border-b border-border-divider flex items-center gap-2">
               <span className="material-symbols-outlined text-text-secondary text-xl">folder_open</span>
               <div className="h-4 bg-surface-dim animate-pulse rounded w-32" />
            </div>
            <div className="divide-y divide-border-divider">
               <SkeletonJobRow />
               <SkeletonJobRow />
               <SkeletonJobRow />
            </div>
          </div>
        ) : Object.keys(groupedJobs).length === 0 ? (
          <div className="text-body-sm text-text-muted text-center py-8">
            No recent jobs found
          </div>
        ) : (
          Object.entries(groupedJobs).map(([project, projectJobs]) => (
          <div key={project} className="border border-border-divider rounded-2xl overflow-hidden bg-surface-container-lowest shadow-sm hover:shadow-md transition-shadow">
            <div className="bg-surface-container px-4 py-3 border-b border-border-divider flex items-center gap-2">
              <span className="material-symbols-outlined text-text-secondary text-xl">folder_open</span>
              <h3 className="font-semibold text-body-sm text-text-primary">{project}</h3>
            </div>
            <div className="divide-y divide-border-divider">
              {projectJobs.map((job) => {
                let statusBadge = null;
                if (job.status === "completed") {
                  statusBadge = (
                    <span className="px-3 py-1 rounded-full text-body-xs font-semibold bg-severity-low-bg text-severity-low border border-severity-low/20">
                      Completed
                    </span>
                  );
                } else if (job.status === "failed") {
                  statusBadge = (
                    <span className="px-3 py-1 rounded-full text-body-xs font-semibold bg-severity-high-bg text-severity-high border border-severity-high/20">
                      Failed
                    </span>
                  );
                } else {
                  statusBadge = (
                    <span className="px-3 py-1 rounded-full text-body-xs font-semibold bg-surface-container-high text-text-secondary flex items-center gap-1.5 border border-border-subtle">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
                      Running
                    </span>
                  );
                }

                const scannerRoute = job.scannerType === "config" ? "config-scanner" : job.scannerType === "secret" ? "secret-scanner" : job.scannerType === "cipher" ? "cipher-scanner" : "dependency-scanner";
                const icon = job.scannerType === "config" ? "settings_input_component" : job.scannerType === "secret" ? "vpn_key" : job.scannerType === "cipher" ? "encrypted" : "account_tree";
                const scanTypeName = job.scannerType === "config" ? "Config Scan" : job.scannerType === "secret" ? "Secret Scan" : job.scannerType === "cipher" ? "Cipher Scan" : "Dependency Scan";

                return (
                  <Link
                    key={job.id}
                    href={`/${scannerRoute}/${job.id}`}
                    className="flex items-center justify-between p-4 hover:bg-surface-container-high transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-surface-dim flex items-center justify-center group-hover:scale-105 transition-transform">
                        <span className="material-symbols-outlined text-[20px] text-text-secondary">{icon}</span>
                      </div>
                      <div>
                        <div className="text-body-sm font-medium text-text-primary group-hover:text-primary transition-colors">
                          {scanTypeName}
                        </div>
                        <div className="text-body-xs text-text-muted mt-1">
                          {new Date(job.createdAt).toLocaleDateString()} at {new Date(job.createdAt).toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                    {statusBadge}
                  </Link>
                );
              })}
            </div>
          </div>
        ))
      )}
      </div>
    </div>
  );
}
