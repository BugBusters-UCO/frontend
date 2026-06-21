import React from "react";
import Link from "next/link";
import { ScanJob } from "@/shared/api/types";

interface RecentJobsProps {
  jobs: ScanJob[];
  onSelectJob: (job: ScanJob) => void;
  activeJobId?: string | null;
}

export function RecentJobs({ jobs, onSelectJob, activeJobId }: RecentJobsProps) {
  return (
    <div className="bg-white rounded-lg border border-border-subtle shadow-sm p-card-padding mt-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-section-header font-section-header">Recent Jobs</h2>
        <button className="text-primary-container text-body-sm hover:underline">
          View All
        </button>
      </div>
      <div className="space-y-3 max-h-130 overflow-y-auto">
        {jobs.length === 0 && (
          <div className="text-body-sm text-text-muted text-center py-4">
            No recent jobs
          </div>
        )}
        {jobs.map((job) => {
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

          const isActive = job.id === activeJobId;

          return (
            <Link
              key={job.id}
              href={`/dependency-scanner/${job.id}`}
              className={`flex items-center justify-between p-3 border rounded-lg hover:bg-surface-container-low transition-colors cursor-pointer border-border-divider`}
            >
              <div>
                <div className="text-body-sm font-medium truncate max-w-[180px]">
                  {job.sourceLabel || job.id}
                </div>
                <div className="text-body-xs text-text-muted mt-0.5">
                  {new Date(job.createdAt).toLocaleTimeString()} •{" "}
                  {job.sourceType}
                </div>
              </div>
              {statusBadge}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
