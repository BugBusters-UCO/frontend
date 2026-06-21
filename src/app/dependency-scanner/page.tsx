"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ScanJob } from "@/shared/api/types";
import { fetchScanJobs } from "@/shared/api/client";
import { RecentJobs } from "@/widgets/RecentJobs";

export default function DependencyScannerLandingPage() {
  const router = useRouter();
  const [jobs, setJobs] = useState<ScanJob[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchScanJobs()
      .then((data) => {
        setJobs(data || []);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error("Failed to fetch jobs", err);
        setIsLoading(false);
      });
  }, []);

  return (
    <div className="max-w-[1280px] mx-auto flex flex-col gap-section-gap">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="font-headline-lg text-headline-lg text-text-primary mb-1">
            Dependency Scanner
          </h1>
          <p className="font-body-sm text-body-sm text-text-secondary">
            View results from recent dependency scans or start a new one.
          </p>
        </div>
        <button
          onClick={() => router.push("/")}
          className="bg-primary text-on-primary py-2 px-4 rounded-lg font-body-sm font-medium hover:bg-surface-tint transition-colors flex items-center gap-2 shadow-sm"
        >
          <span className="material-symbols-outlined text-[18px]">play_arrow</span>
          Scan New
        </button>
      </div>

      <div className="max-w-[800px] w-full">
        {isLoading ? (
          <div className="text-center py-8 text-text-muted">Loading recent jobs...</div>
        ) : (
          <RecentJobs jobs={jobs} onSelectJob={() => {}} />
        )}
      </div>
    </div>
  );
}
