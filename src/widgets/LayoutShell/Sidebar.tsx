"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/shared/lib/AuthContext";

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { logout } = useAuth();

  const isDashboard = pathname === "/";
  const isDependency = pathname.startsWith("/dependency-scanner");
  const isConfig = pathname.startsWith("/config-scanner");
  const isSecret = pathname.startsWith("/secret-scanner");
  const isCipher = pathname.startsWith("/cipher-scanner");
  const isStatic = pathname.startsWith("/static-analyzer");

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  return (
    <nav className="bg-surface-container-lowest text-primary text-label-caps font-label-caps fixed left-0 top-0 h-full w-64 border-r border-border-divider shadow-sm flex flex-col py-page-margin px-4 gap-element-gap z-40 pt-20">
      

      <div className="flex flex-col gap-1 flex-1">
        <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2 px-2 mt-4">
          Overview
        </p>
        <Link
          href="/"
          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg font-body-sm text-body-sm transition-all duration-200 group ${
            isDashboard
              ? "bg-primary-container/10 text-primary-container font-medium"
              : "text-text-secondary hover:text-text-primary hover:bg-surface-container hover:shadow-sm"
          }`}
        >
          <span className={`material-symbols-outlined text-[20px] transition-transform duration-200 group-hover:scale-110 ${isDashboard ? "text-primary-container" : ""}`}>dashboard</span>
          <span>Dashboard</span>
        </Link>

        <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2 px-2 mt-4">
          Modules
        </p>
        <Link
          href="/dependency-scanner"
          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg font-body-sm text-body-sm transition-all duration-200 group ${
            isDependency
              ? "bg-primary-container/10 text-primary-container font-medium"
              : "text-text-secondary hover:text-text-primary hover:bg-surface-container hover:shadow-sm"
          }`}
        >
          <span className={`material-symbols-outlined text-[20px] transition-transform duration-200 group-hover:scale-110 ${isDependency ? "text-primary-container" : ""}`}>
            inventory_2
          </span>
          <span>Dependency Scanner</span>
        </Link>
        <Link
          href="/config-scanner"
          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg font-body-sm text-body-sm transition-all duration-200 group ${
            isConfig
              ? "bg-primary-container/10 text-primary-container font-medium"
              : "text-text-secondary hover:text-text-primary hover:bg-surface-container hover:shadow-sm"
          }`}
        >
          <span className={`material-symbols-outlined text-[20px] transition-transform duration-200 group-hover:scale-110 ${isConfig ? "text-primary-container" : ""}`}>
            settings_input_component
          </span>
          <span>Config Scanner</span>
        </Link>
        <Link
          href="/secret-scanner"
          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg font-body-sm text-body-sm transition-all duration-200 group ${
            isSecret
              ? "bg-primary-container/10 text-primary-container font-medium"
              : "text-text-secondary hover:text-text-primary hover:bg-surface-container hover:shadow-sm"
          }`}
        >
          <span className={`material-symbols-outlined text-[20px] transition-transform duration-200 group-hover:scale-110 ${isSecret ? "text-primary-container" : ""}`}>
            vpn_key
          </span>
          <span>Secret Scanner</span>
        </Link>
        <Link
          href="/cipher-scanner"
          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg font-body-sm text-body-sm transition-all duration-200 group ${
            isCipher
              ? "bg-primary-container/10 text-primary-container font-medium"
              : "text-text-secondary hover:text-text-primary hover:bg-surface-container hover:shadow-sm"
          }`}
        >
          <span className={`material-symbols-outlined text-[20px] transition-transform duration-200 group-hover:scale-110 ${isCipher ? "text-primary-container" : ""}`}>
            encrypted
          </span>
          <span>Cipher Scanner</span>
        </Link>
        <Link
          href="/static-analyzer"
          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg font-body-sm text-body-sm transition-all duration-200 group ${
            isStatic
              ? "bg-primary-container/10 text-primary-container font-medium"
              : "text-text-secondary hover:text-text-primary hover:bg-surface-container hover:shadow-sm"
          }`}
        >
          <span className={`material-symbols-outlined text-[20px] transition-transform duration-200 group-hover:scale-110 ${isStatic ? "text-primary-container" : ""}`}>
            code_blocks
          </span>
          <span>Static Analyzer</span>
        </Link>
      </div>
      <Link href="/" className="w-full">
        <button className="w-full bg-primary text-on-primary py-2.5 rounded-lg font-body-sm text-body-sm font-medium hover:bg-surface-tint/80 transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-sm">
          <span className="material-symbols-outlined text-sm">play_arrow</span>{" "}
          Run New Scan
        </button>
      </Link>

      <div className="flex flex-col gap-1 pt-4 border-t border-border-divider">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-error hover:bg-error-container/20 transition-all duration-200 font-body-sm text-body-sm group w-full"
        >
          <span className="material-symbols-outlined text-[20px] transition-transform duration-200 group-hover:-translate-x-1">
            logout
          </span>
          <span>Logout</span>
        </button>
      </div>
    </nav>
  );
}
