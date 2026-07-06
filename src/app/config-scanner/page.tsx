"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ScanJob } from "@/shared/api/types";
import { fetchConfigScanJobs } from "@/shared/api/client";
import { RecentJobs } from "@/widgets/RecentJobs";
import { getCookie, deleteCookie } from "cookies-next";
import { useQuery } from "@tanstack/react-query";

export default function ConfigScannerLandingPage() {
  const router = useRouter();
  
  const currentSession = getCookie("bugbusters_github_session") as string | undefined;

  const { data: jobs = [], isLoading: isLoadingJobs } = useQuery({
    queryKey: ["config-jobs", currentSession],
    queryFn: async () => {
      const configJobs = await fetchConfigScanJobs();
      return (configJobs || []).sort((a: ScanJob, b: ScanJob) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    },
    enabled: !!currentSession,
  });

  return (
    <div className="max-w-[1280px] mx-auto flex flex-col gap-section-gap">
      {/* Page Header */}
      <div className="bg-white rounded-2xl border border-border-subtle shadow-sm p-8 relative overflow-hidden flex items-center justify-between">
        <div className="absolute top-0 right-0 w-48 h-48 bg-primary-container/5 rounded-bl-[150px] -z-10"></div>
        <div className="flex items-center gap-5">
           <div className="w-14 h-14 rounded-2xl bg-primary-container/10 flex items-center justify-center">
             <span className="material-symbols-outlined text-primary-container text-3xl">settings_input_component</span>
           </div>
           <div>
             <h1 className="font-headline-lg text-headline-lg text-text-primary mb-1">Config Scanner History</h1>
             <p className="font-body-sm text-body-sm text-text-secondary">Detect misconfigurations and hardcoded secrets in your codebase.</p>
           </div>
        </div>
      </div>

      <div className="flex flex-col">
        <RecentJobs jobs={jobs} isLoading={isLoadingJobs} />
      </div>
    </div>
  );
}
