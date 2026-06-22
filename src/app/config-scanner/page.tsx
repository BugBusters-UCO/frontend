"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ScanJob } from "@/shared/api/types";
import { fetchConfigScanJobs } from "@/shared/api/client";
import { RecentJobs } from "@/widgets/RecentJobs";
import { getCookie, deleteCookie } from "cookies-next";

export default function ConfigScannerLandingPage() {
  const router = useRouter();
  const [jobs, setJobs] = useState<ScanJob[]>([]);
  const [isLoadingJobs, setIsLoadingJobs] = useState(true);

  useEffect(() => {
    const currentSession = getCookie("bugbusters_github_session") as string | undefined;

    if (currentSession) {
      fetchConfigScanJobs()
        .then((configJobs) => {
          setJobs((configJobs || []).sort((a: ScanJob, b: ScanJob) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
          setIsLoadingJobs(false);
        })
        .catch((err) => {
          console.error("Failed to load config scans", err);
          if (err.message && err.message.includes("401")) {
             deleteCookie("bugbusters_github_session");
          }
          setJobs([]);
          setIsLoadingJobs(false);
        });
    } else {
      setJobs([]);
      setIsLoadingJobs(false);
    }
  }, []);

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
             <h1 className="font-headline-lg text-headline-lg text-text-primary mb-1">Config Scanner</h1>
             <p className="font-body-sm text-body-sm text-text-secondary">Detect misconfigurations and hardcoded secrets in your codebase.</p>
           </div>
        </div>

        <button
          onClick={() => router.push("/")}
          className="relative overflow-hidden group bg-primary-container text-white py-2.5 px-5 rounded-xl font-semibold text-body-sm transition-all duration-300 hover:shadow-lg transform active:scale-[0.98] flex items-center gap-2"
        >
          <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]"></div>
          <span className="material-symbols-outlined text-[18px] relative z-10">add</span>
          <span className="relative z-10">Scan New Target</span>
        </button>
      </div>

      <div className="flex flex-col">
        <RecentJobs jobs={jobs} isLoading={isLoadingJobs} />
      </div>
    </div>
  );
}
