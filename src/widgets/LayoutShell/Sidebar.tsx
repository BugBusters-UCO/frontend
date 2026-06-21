"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function Sidebar() {
  const pathname = usePathname();

  const isDashboard = pathname === "/";
  const isDependency = pathname.startsWith("/dependency-scanner");

  return (
    <nav className="bg-surface-container-lowest text-primary text-label-caps font-label-caps fixed left-0 top-0 h-full w-64 border-r border-border-divider shadow-sm flex flex-col py-page-margin px-4 gap-element-gap z-40 pt-20">
      

      <div className="flex flex-col gap-1 flex-1">
        <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2 px-2 mt-4">
          Overview
        </p>
        <Link
          href="/"
          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg font-body-sm text-body-sm transition-colors ${
            isDashboard
              ? "bg-surface-container text-text-primary font-medium"
              : "text-text-secondary hover:text-text-primary hover:bg-surface-container"
          }`}
        >
          <span className="material-symbols-outlined text-[20px]">dashboard</span>
          <span>Platform Dashboard</span>
        </Link>

        <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2 px-2 mt-4">
          Modules
        </p>
        <Link
          href="/dependency-scanner"
          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg font-body-sm text-body-sm transition-colors ${
            isDependency
              ? "bg-surface-container text-text-primary font-medium"
              : "text-text-secondary hover:text-text-primary hover:bg-surface-container"
          }`}
        >
          <span className="material-symbols-outlined text-[20px]">
            inventory_2
          </span>
          <span>Dependency Scanner</span>
        </Link>
        <Link
          href="/config-scanner"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-container transition-colors font-body-sm text-body-sm"
        >
          <span className="material-symbols-outlined text-[20px]">
            settings_input_component
          </span>
          <span>Config Scanner</span>
        </Link>
        <Link
          href="/static-analyzer"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-container transition-colors font-body-sm text-body-sm"
        >
          <span className="material-symbols-outlined text-[20px]">
            code_blocks
          </span>
          <span>Static Analyzer</span>
        </Link>
      </div>
      <Link href="/" className="w-full">
        <button className="w-full bg-primary text-on-primary py-2.5 rounded-lg font-body-sm text-body-sm font-medium hover:bg-surface-tint transition-colors mb-4 flex items-center justify-center gap-2 shadow-sm">
          <span className="material-symbols-outlined text-sm">play_arrow</span>{" "}
          Run New Scan
        </button>
      </Link>

      <div className="flex flex-col gap-1 pt-4 border-t border-border-divider">
        <a
          href="#"
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-container transition-colors font-body-sm text-body-sm"
        >
          <span className="material-symbols-outlined text-[20px]">
            description
          </span>
          <span>Docs</span>
        </a>
        <a
          href="#"
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-container transition-colors font-body-sm text-body-sm"
        >
          <span className="material-symbols-outlined text-[20px]">help</span>
          <span>Support</span>
        </a>
      </div>
    </nav>
  );
}
