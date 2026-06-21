"use client";

import React from "react";
import { useRouter } from "next/navigation";

export default function ConfigScannerPage() {
  const router = useRouter();

  return (
    <div className="w-full h-full mx-auto bg-surface-container-lowest flex flex-col items-center justify-center py-20">
      <div className=" p-card-padding rounded-lg  text-center max-w-md w-full">
        <div className="h-16 w-16 bg-surface-container rounded-full mx-auto flex items-center justify-center mb-6">
          <span className="material-symbols-outlined text-[32px] text-primary">
            settings_input_component
          </span>
        </div>
        <h1 className="font-headline-md text-headline-md text-text-primary mb-2">
          Config Scanner
        </h1>
        <p className="font-body-sm text-body-sm text-text-muted mb-8">
          This feature is currently under development. Soon you will be able to scan infrastructure configurations (like Kubernetes manifests, Dockerfiles, and Terraform) for misconfigurations and secrets.
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
