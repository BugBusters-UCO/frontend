"use client";

import React from "react";
import { useRouter } from "next/navigation";

export default function StaticAnalyzerPage() {
  const router = useRouter();

  return (
    <div className="max-w-[1280px] bg-surface-container-lowest w-full h-full mx-auto flex flex-col items-center justify-center py-20">
      <div className=" p-card-padding rounded-lg text-center max-w-md w-full">
        <div className="h-16 w-16 bg-surface-container rounded-full mx-auto flex items-center justify-center mb-6">
          <span className="material-symbols-outlined text-[32px] text-primary">
            code_blocks
          </span>
        </div>
        <h1 className="font-headline-md text-headline-md text-text-primary mb-2">
          Static Code Analyzer
        </h1>
        <p className="font-body-sm text-body-sm text-text-muted mb-8">
          This feature is currently under development. Soon you will be able to perform deep static application security testing (SAST) to identify vulnerabilities in your source code.
        </p>
        <div className="inline-block bg-primary-fixed text-on-primary-fixed px-3 py-1 rounded-full text-body-xs font-semibold uppercase tracking-wider mb-6">
          Upcoming Feature
        </div>
        <button
          onClick={() => router.push("/")}
          className="w-full bg-primary text-on-primary py-2.5 rounded-lg font-body-sm font-medium hover:bg-surface-tint transition-colors"
        >
          Return to Dashboard
        </button>
      </div>
    </div>
  );
}
