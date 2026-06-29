import React from "react";
import Link from "next/link";
import { ScanJob } from "@/shared/api/types";
import { SkeletonJobRow } from "@/widgets/Skeleton";

interface RecentJobsProps {
  jobs: ScanJob[];
  isLoading?: boolean;
}

export function RecentJobs({ jobs, isLoading }: RecentJobsProps) {
  // Group jobs by sourceLabel
  const groupedJobs = jobs.reduce((acc, job) => {
    const label = job.sourceLabel || "Unknown Project";
    if (!acc[label]) acc[label] = [];
    acc[label].push(job);
    return acc;
  }, {} as Record<string, ScanJob[]>);

  return (
    <div className="bg-white rounded-lg border border-border-subtle shadow-sm p-card-padding mt-4">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-section-header font-section-header">Recent Scans by Project</h2>
      </div>
      
      <div className="space-y-6 max-h-[600px] overflow-y-auto pr-2">
        {isLoading ? (
          <div className="border border-border-divider rounded-lg overflow-hidden">
            <div className="bg-surface-container-lowest px-4 py-3 border-b border-border-divider flex items-center gap-2">
               <span className="material-symbols-outlined text-text-secondary text-xl">folder_open</span>
               <div className="h-4 bg-surface-container-high animate-pulse rounded w-32" />
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
          <div key={project} className="border border-border-divider rounded-lg overflow-hidden">
            <div className="bg-surface-container-lowest px-4 py-3 border-b border-border-divider flex items-center gap-2">
              <span className="material-symbols-outlined text-text-secondary text-xl">folder_open</span>
              <h3 className="font-semibold text-body-sm text-text-primary">{project}</h3>
            </div>
            <div className="divide-y divide-border-divider">
              {projectJobs.map((job) => {
                let statusBadge = null;
                if (job.status === "completed") {
                  statusBadge = (
                    <span className="px-2.5 py-0.5 rounded-full text-body-xs font-semibold bg-severity-low-bg text-severity-low">
                      Completed
                    </span>
                  );
                } else if (job.status === "failed") {
                  statusBadge = (
                    <span className="px-2.5 py-0.5 rounded-full text-body-xs font-semibold bg-severity-high-bg text-severity-high">
                      Failed
                    </span>
                  );
                } else {
                  statusBadge = (
                    <span className="px-2.5 py-0.5 rounded-full text-body-xs font-semibold bg-surface-container-highest text-text-secondary flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-primary-container animate-pulse"></span>
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
                    className="flex items-center justify-between p-4 hover:bg-surface-container-low transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center">
                        <span className="material-symbols-outlined text-[18px] text-text-secondary">{icon}</span>
                      </div>
                      <div>
                        <div className="text-body-sm font-medium text-text-primary">
                          {scanTypeName}
                        </div>
                        <div className="text-body-xs text-text-muted mt-0.5">
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
