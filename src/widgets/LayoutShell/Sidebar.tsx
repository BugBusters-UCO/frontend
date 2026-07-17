"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/shared/lib/AuthContext";

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { logout } = useAuth();

  const isDashboard = pathname === "/";
  const isRiskReports = pathname.startsWith("/risk-reports");
  const isScheduledScans = pathname.startsWith("/schedule-scans");
  const isDependency = pathname.startsWith("/dependency-scanner");
  const isConfig = pathname.startsWith("/config-scanner");
  const isSecret = pathname.startsWith("/secret-scanner");
  const isCipher = pathname.startsWith("/cipher-scanner");
  const isAgentsHistory = pathname.startsWith("/vm-agents/history") || (pathname.startsWith("/vm-agents/") && pathname !== "/vm-agents/history" && pathname !== "/vm-agents");
  const isAgents = pathname === "/vm-agents";
  // const isVCDashboard = pathname === "/vc-dashboard";

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  const getLinkClass = (isActive: boolean) => {
    return `relative flex items-center gap-3 px-3 py-2.5 rounded-2xl font-body-sm text-body-sm transition-all duration-200 group ${
      isActive
        ? "bg-primary/10 text-primary font-semibold pl-4 shadow-sm"
        : "text-text-secondary hover:text-text-primary hover:bg-surface-dim"
    }`;
  };

  const renderActiveIndicator = (isActive: boolean) => {
    if (!isActive) return null;
    return (
      <span className="absolute left-0 top-2.5 bottom-2.5 w-1 bg-primary rounded-r shadow-[0_0_10px_rgba(31,111,235,0.8)]" />
    );
  };

  return (
    <nav className="bg-surface-container-lowest text-primary text-label-caps font-label-caps fixed left-0 top-0 h-full w-64 border-r border-border-subtle shadow-sm flex flex-col py-page-margin px-4 gap-element-gap z-40 pt-20 transition-colors duration-300">
      <div className="flex flex-col gap-1 flex-1">
        <p className="text-xs font-bold text-text-muted uppercase tracking-widest mb-2 px-2 mt-4">
          Overview
        </p>
        <Link
          href="/"
          className={getLinkClass(isDashboard)}
        >
          {renderActiveIndicator(isDashboard)}
          <span className={`material-symbols-outlined text-[20px] transition-transform duration-200 group-hover:scale-110 ${isDashboard ? "text-primary" : ""}`}>dashboard</span>
          <span>Dashboard</span>
        </Link>
        <Link
          href="/risk-reports"
          className={getLinkClass(isRiskReports)}
        >
          {renderActiveIndicator(isRiskReports)}
          <span className={`material-symbols-outlined text-[20px] transition-transform duration-200 group-hover:scale-110 ${isRiskReports ? "text-primary" : ""}`}>summarize</span>
          <span>Risk Reports</span>
        </Link>
        <Link
          href="/schedule-scans"
          className={getLinkClass(isScheduledScans)}
        >
          {renderActiveIndicator(isScheduledScans)}
          <span className={`material-symbols-outlined text-[20px] transition-transform duration-200 group-hover:scale-110 ${isScheduledScans ? "text-primary" : ""}`}>event_repeat</span>
          <span>Schedule Scans</span>
        </Link>

        <p className="text-xs font-bold text-text-muted uppercase tracking-widest mb-2 px-2 mt-4">
          Module
        </p>
        <Link
          href="/vm-agents"
          className={getLinkClass(isAgents)}
        >
          {renderActiveIndicator(isAgents)}
          <span className={`material-symbols-outlined text-[20px] transition-transform duration-200 group-hover:scale-110 ${isAgents ? "text-primary" : ""}`}>
            dns
          </span>
          <span>VM Dashboard</span>
        </Link>
        {/*
        <Link
          href="/vc-dashboard"
          className={getLinkClass(isVCDashboard)}
        >
          {renderActiveIndicator(isVCDashboard)}
          <span className={`material-symbols-outlined text-[20px] transition-transform duration-200 group-hover:scale-110 ${isVCDashboard ? "text-primary" : ""}`}>
            account_tree
          </span>
          <span>VC Dashboard</span>
        </Link>
        */}

        <p className="text-xs font-bold text-text-muted uppercase tracking-widest mb-2 px-2 mt-4">
          History
        </p>
        {/*
        <Link
          href="/dependency-scanner"
          className={getLinkClass(isDependency)}
        >
          {renderActiveIndicator(isDependency)}
          <span className={`material-symbols-outlined text-[20px] transition-transform duration-200 group-hover:scale-110 ${isDependency ? "text-primary" : ""}`}>
            inventory_2
          </span>
          <span>Dependency</span>
        </Link>
        <Link
          href="/config-scanner"
          className={getLinkClass(isConfig)}
        >
          {renderActiveIndicator(isConfig)}
          <span className={`material-symbols-outlined text-[20px] transition-transform duration-200 group-hover:scale-110 ${isConfig ? "text-primary" : ""}`}>
            settings_input_component
          </span>
          <span>Config</span>
        </Link>
        <Link
          href="/secret-scanner"
          className={getLinkClass(isSecret)}
        >
          {renderActiveIndicator(isSecret)}
          <span className={`material-symbols-outlined text-[20px] transition-transform duration-200 group-hover:scale-110 ${isSecret ? "text-primary" : ""}`}>
            vpn_key
          </span>
          <span>Secret</span>
        </Link>
        <Link
          href="/cipher-scanner"
          className={getLinkClass(isCipher)}
        >
          {renderActiveIndicator(isCipher)}
          <span className={`material-symbols-outlined text-[20px] transition-transform duration-200 group-hover:scale-110 ${isCipher ? "text-primary" : ""}`}>
            encrypted
          </span>
          <span>Cipher</span>
        </Link>
        */}
        <Link
          href="/vm-agents/history"
          className={getLinkClass(isAgentsHistory)}
        >
          {renderActiveIndicator(isAgentsHistory)}
          <span className={`material-symbols-outlined text-[20px] transition-transform duration-200 group-hover:scale-110 ${isAgentsHistory ? "text-primary" : ""}`}>
            dns
          </span>
          <span>VM Agents</span>
        </Link>
      </div>

      <div className="flex flex-col gap-1 pt-4 border-t border-border-subtle">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2 rounded-2xl text-severity-critical hover:bg-severity-critical-bg transition-all duration-200 font-body-sm text-body-sm group w-full cursor-pointer"
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
