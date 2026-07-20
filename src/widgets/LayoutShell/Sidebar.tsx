"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/shared/lib/AuthContext";
import { ProxyAlertToast } from "@/widgets/ProxyAlertToast";

interface SidebarProps {
  isOpen: boolean;
  toggleSidebar?: () => void;
}

export function Sidebar({ isOpen, toggleSidebar }: SidebarProps) {
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
  const isMonitoring = pathname === "/monitoring";
  // const isVCDashboard = pathname === "/vc-dashboard";

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  const getLinkClass = (isActive: boolean) => {
    return `relative flex items-center gap-3 px-3 py-2.5 rounded-2xl font-body-sm text-body-sm transition-all duration-200 group ${
      isOpen ? "" : "justify-center"
    } ${
      isActive
        ? `bg-primary/10 text-primary font-semibold ${isOpen ? 'pl-4' : ''} shadow-sm`
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
    <>
      <ProxyAlertToast />
      <nav className={`bg-surface-container-lowest text-primary text-label-caps font-label-caps border-r border-border-subtle shadow-sm flex flex-col py-page-margin gap-element-gap z-40 transition-all duration-300 shrink-0 ${isOpen ? 'w-64 px-4' : 'w-20 px-2'}`}>
        <div className="flex flex-col gap-1 flex-1">
          <div className={`flex items-center ${isOpen ? 'justify-between px-2' : 'justify-center'} mb-4 mt-2`}>
            {isOpen && (
              <p className="text-xs font-bold text-text-muted uppercase tracking-widest whitespace-nowrap overflow-hidden">
                Overview
              </p>
            )}
            <button 
              onClick={toggleSidebar}
              className="text-text-secondary hover:text-text-primary p-1.5 hover:bg-surface-dim rounded-full transition-colors flex items-center justify-center"
            >
              <span className="material-symbols-outlined text-[24px]">
                {isOpen ? "menu_open" : "menu"}
              </span>
            </button>
          </div>
          <Link
            href="/"
            className={getLinkClass(isDashboard)}
            title="Dashboard"
          >
            {renderActiveIndicator(isDashboard)}
            <span className={`material-symbols-outlined text-[20px] transition-transform duration-200 group-hover:scale-110 shrink-0 ${isDashboard ? "text-primary" : ""}`}>dashboard</span>
            {isOpen && <span className="whitespace-nowrap overflow-hidden">Dashboard</span>}
          </Link>
          <Link
            href="/risk-reports"
            className={getLinkClass(isRiskReports)}
            title="Risk Reports"
          >
            {renderActiveIndicator(isRiskReports)}
            <span className={`material-symbols-outlined text-[20px] transition-transform duration-200 group-hover:scale-110 shrink-0 ${isRiskReports ? "text-primary" : ""}`}>summarize</span>
            {isOpen && <span className="whitespace-nowrap overflow-hidden">Risk Reports</span>}
          </Link>
          <Link
            href="/schedule-scans"
            className={getLinkClass(isScheduledScans)}
            title="Schedule Scans"
          >
            {renderActiveIndicator(isScheduledScans)}
            <span className={`material-symbols-outlined text-[20px] transition-transform duration-200 group-hover:scale-110 shrink-0 ${isScheduledScans ? "text-primary" : ""}`}>event_repeat</span>
            {isOpen && <span className="whitespace-nowrap overflow-hidden">Schedule Scans</span>}
          </Link>
          <Link
            href="/proxy-alerts"
            className={getLinkClass(pathname === "/proxy-alerts")}
            title="Proxy Gateway"
          >
            {renderActiveIndicator(pathname === "/proxy-alerts")}
            <span className={`material-symbols-outlined text-[20px] transition-transform duration-200 group-hover:scale-110 shrink-0 ${pathname === "/proxy-alerts" ? "text-primary" : ""}`}>shield</span>
            {isOpen && <span className="whitespace-nowrap overflow-hidden">Proxy Gateway</span>}
          </Link>

          {isOpen && (
            <p className="text-xs font-bold text-text-muted uppercase tracking-widest mb-2 px-2 mt-4 whitespace-nowrap overflow-hidden">
              Module
            </p>
          )}
          {!isOpen && <div className="h-6 mt-4 border-t border-border-subtle pt-2"></div>}
          <Link
            href="/vm-agents"
            className={getLinkClass(isAgents)}
            title="VM Dashboard"
          >
            {renderActiveIndicator(isAgents)}
            <span className={`material-symbols-outlined text-[20px] transition-transform duration-200 group-hover:scale-110 shrink-0 ${isAgents ? "text-primary" : ""}`}>
              dns
            </span>
            {isOpen && <span className="whitespace-nowrap overflow-hidden">VM Dashboard</span>}
          </Link>
          <Link
            href="/monitoring"
            className={getLinkClass(isMonitoring)}
          >
            {renderActiveIndicator(isMonitoring)}
            <span className={`material-symbols-outlined text-[20px] transition-transform duration-200 group-hover:scale-110 ${isMonitoring ? "text-primary" : ""}`}>
              policy
            </span>
            <span>EDR Monitoring</span>
          </Link>
          <Link
            href="/monitoring"
            className={getLinkClass(isMonitoring)}
          >
            {renderActiveIndicator(isMonitoring)}
            <span className={`material-symbols-outlined text-[20px] transition-transform duration-200 group-hover:scale-110 ${isMonitoring ? "text-primary" : ""}`}>
              policy
            </span>
            <span>EDR Monitoring</span>
          </Link>

          {isOpen && (
            <p className="text-xs font-bold text-text-muted uppercase tracking-widest mb-2 px-2 mt-4 whitespace-nowrap overflow-hidden">
              History
            </p>
          )}
          {!isOpen && <div className="h-6 mt-4 border-t border-border-subtle pt-2"></div>}
          <Link
            href="/vm-agents/history"
            className={getLinkClass(isAgentsHistory)}
            title="VM Agents"
          >
            {renderActiveIndicator(isAgentsHistory)}
            <span className={`material-symbols-outlined text-[20px] transition-transform duration-200 group-hover:scale-110 shrink-0 ${isAgentsHistory ? "text-primary" : ""}`}>
              history
            </span>
            {isOpen && <span className="whitespace-nowrap overflow-hidden">VM Agents</span>}
          </Link>
        </div>

        <div className={`flex flex-col gap-1 pt-4 border-t border-border-subtle ${!isOpen && 'items-center'}`}>
          <button
            onClick={handleLogout}
            title="Logout"
            className={`flex items-center gap-3 px-3 py-2 rounded-2xl text-severity-critical hover:bg-severity-critical-bg transition-all duration-200 font-body-sm text-body-sm group cursor-pointer ${isOpen ? 'w-full' : 'justify-center'}`}
          >
            <span className="material-symbols-outlined text-[20px] transition-transform duration-200 group-hover:-translate-x-1 shrink-0">
              logout
            </span>
            {isOpen && <span className="whitespace-nowrap overflow-hidden">Logout</span>}
          </button>
        </div>
      </nav>
    </>
  );
}
