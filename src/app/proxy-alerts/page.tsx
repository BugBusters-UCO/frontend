"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchProxyAlerts } from "@/shared/api/client";
import { ShieldAlert, Activity, Package, Clock, ChevronDown, ChevronUp } from "lucide-react";
import { SecurityRadar } from "@/widgets/SecurityRadar";
import { usePageContext } from "@/features/chatbot/usePageContext";

export default function ProxyAlertsPage() {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: alerts = [], isLoading, error } = useQuery({
    queryKey: ["proxy-alerts"],
    queryFn: fetchProxyAlerts,
    refetchInterval: 5000 // Poll every 5 seconds for new alerts
  });

  usePageContext({
    page: "Proxy Gateway",
    alertsCount: alerts?.length || 0,
    topAlerts: alerts?.slice(0, 5),
  });

  return (
    <div className="max-w-[1280px] mx-auto flex flex-col gap-section-gap animate-in fade-in duration-500">
      
      {/* Header & Radar Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Header */}
        <div className="lg:col-span-2 bg-[#0A0A0A] transition-colors duration-300 rounded-2xl border border-green-900/30 shadow-[inset_0_0_50px_rgba(0,255,0,0.02)] p-8 flex flex-col justify-center overflow-hidden relative">
          {/* Abstract Grid Background */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(0,255,0,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,255,0,0.03)_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none"></div>
          <div className="absolute top-0 right-0 w-96 h-96 bg-green-500/5 rounded-full blur-3xl -z-10 pointer-events-none transform translate-x-1/3 -translate-y-1/3"></div>
          
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10 w-full h-full">
            <div className="flex items-center gap-5">
              <div className="w-16 h-16 rounded-2xl bg-[#0A0A0A] flex items-center justify-center shrink-0 border border-green-500/20 shadow-[0_0_15px_rgba(0,255,0,0.1)] relative overflow-hidden">
                <div className="absolute inset-0 bg-green-500/10 animate-pulse"></div>
                <ShieldAlert className="text-green-500 relative z-10" size={32} />
              </div>
              <div>
                <h1 className="text-3xl font-black text-white mb-2 tracking-wide uppercase drop-shadow-sm">Security Gateway</h1>
                <p className="font-mono text-xs text-green-400/80 max-w-md leading-relaxed">
                  Live intercept logs of malicious packages blocked by the Zero Trust proxy.
                </p>
              </div>
            </div>
            
            <div className="flex flex-col items-start md:items-end gap-2">
              <div className="flex items-center gap-3 bg-green-950/40 px-4 py-2.5 rounded-lg border border-green-900/50 backdrop-blur-sm">
                 <span className="relative flex h-3 w-3">
                   <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                   <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                 </span>
                 <span className="text-green-400 font-mono text-xs font-bold uppercase tracking-widest">System Online</span>
              </div>
              <div className="text-[10px] font-mono text-green-600/50 tracking-widest pr-1">
                Z-TRUST ENGINE v1.0
              </div>
            </div>
          </div>
        </div>

        {/* Radar */}
        <div className="lg:col-span-1 h-[250px] lg:h-auto">
          <SecurityRadar />
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-5">
         <div className="bg-surface rounded-2xl p-5 border border-border-subtle shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center shrink-0"><ShieldAlert /></div>
            <div>
              <p className="text-sm font-bold text-text-muted uppercase tracking-wider">Total Blocks</p>
              <p className="text-2xl font-black text-text-primary">{alerts.length}</p>
            </div>
         </div>
         <div className="bg-surface rounded-2xl p-5 border border-border-subtle shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center shrink-0"><Activity /></div>
            <div>
              <p className="text-sm font-bold text-text-muted uppercase tracking-wider">NPM Payload</p>
              <p className="text-2xl font-black text-text-primary">{alerts.filter(a => a.type === 'PAYLOAD_BLOCK' || a.type === 'METADATA_BLOCK').length}</p>
            </div>
         </div>
         <div className="bg-surface rounded-2xl p-5 border border-border-subtle shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center shrink-0"><Package /></div>
            <div>
              <p className="text-sm font-bold text-text-muted uppercase tracking-wider">Config Blocks</p>
              <p className="text-2xl font-black text-text-primary">{alerts.filter(a => a.type === 'CONFIG_BLOCK').length}</p>
            </div>
         </div>
         <div className="bg-surface rounded-2xl p-5 border border-border-subtle shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-yellow-100 text-yellow-600 rounded-full flex items-center justify-center shrink-0"><Package /></div>
            <div>
              <p className="text-sm font-bold text-text-muted uppercase tracking-wider">Secret Blocks</p>
              <p className="text-2xl font-black text-text-primary">{alerts.filter(a => a.type === 'SECRET_BLOCK').length}</p>
            </div>
         </div>
         <div className="bg-surface rounded-2xl p-5 border border-border-subtle shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center shrink-0"><ShieldAlert /></div>
            <div>
              <p className="text-sm font-bold text-text-muted uppercase tracking-wider">Cipher Blocks</p>
              <p className="text-2xl font-black text-text-primary">{alerts.filter(a => a.type === 'CIPHER_BLOCK').length}</p>
            </div>
         </div>
         <div className="bg-surface rounded-2xl p-5 border border-border-subtle shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-gray-100 text-gray-800 rounded-full flex items-center justify-center shrink-0"><ShieldAlert /></div>
            <div>
              <p className="text-sm font-bold text-text-muted uppercase tracking-wider">EDR Alerts</p>
              <p className="text-2xl font-black text-text-primary">{alerts.filter(a => a.type === 'CODEBASE_COMPROMISE').length}</p>
            </div>
         </div>
      </div>

      {/* Main Table */}
      <div className="bg-surface rounded-2xl border border-border-subtle shadow-sm flex flex-col overflow-hidden">
        <div className="p-5 border-b border-border-divider bg-surface-container-lowest">
           <h2 className="text-section-header font-bold flex items-center gap-2 text-text-primary">
             <span className="material-symbols-outlined text-primary">history</span>
             Intercept History
           </h2>
        </div>
        
        {isLoading ? (
          <div className="p-10 flex justify-center text-text-muted animate-pulse">Loading history...</div>
        ) : error ? (
          <div className="p-10 flex justify-center text-red-500">Error loading alerts.</div>
        ) : alerts.length === 0 ? (
          <div className="p-20 flex flex-col items-center justify-center text-text-muted">
            <ShieldAlert size={48} className="opacity-20 mb-4" />
            <p className="font-semibold text-lg">No security blocks yet</p>
            <p className="text-sm">The proxy is actively monitoring traffic.</p>
          </div>
        ) : (
          <div className="overflow-x-auto p-5">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-border-divider text-xs uppercase tracking-wider text-text-secondary">
                  <th className="pb-3 font-semibold px-2">Timestamp</th>
                  <th className="pb-3 font-semibold px-2">Type</th>
                  <th className="pb-3 font-semibold px-2">Target Package</th>
                  <th className="pb-3 font-semibold px-2">Reason</th>
                  <th className="pb-3 font-semibold px-2 text-right">Details</th>
                </tr>
              </thead>
              <tbody>
                {alerts.map((alert) => (
                  <React.Fragment key={alert.id}>
                    <tr 
                      onClick={() => alert.findings && setExpandedId(expandedId === alert.id ? null : alert.id)}
                      className={`border-b border-border-divider transition-colors ${alert.findings ? 'cursor-pointer hover:bg-surface-container-lowest' : ''} ${expandedId === alert.id ? 'bg-surface-container-lowest' : ''}`}
                    >
                      <td className="py-4 px-2 align-top w-48">
                        <div className="flex items-center gap-2 text-sm text-text-primary font-medium">
                          <Clock size={14} className="text-text-muted" />
                          {new Date(alert.createdAt).toLocaleString()}
                        </div>
                      </td>
                      <td className="py-4 px-2 align-top w-40">
                         <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded border ${
                           alert.type === 'PAYLOAD_BLOCK' ? 'bg-purple-100 text-purple-800 border-purple-200' :
                           alert.type === 'CODEBASE_COMPROMISE' ? 'bg-red-100 text-red-800 border-red-200' :
                           alert.type === 'SECRET_BLOCK' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                           alert.type === 'CONFIG_BLOCK' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                           alert.type === 'CIPHER_BLOCK' ? 'bg-indigo-100 text-indigo-800 border-indigo-200' :
                           'bg-orange-100 text-orange-800 border-orange-200'
                         }`}>
                           {alert.type.replace('_', ' ')}
                         </span>
                      </td>
                      <td className="py-4 px-2 align-top w-48">
                        <code className="text-sm font-bold bg-surface-container px-2 py-1 rounded text-text-primary border border-border-subtle">
                          {alert.packageName || alert.package || 'Unknown'}
                        </code>
                      </td>
                      <td className="py-4 px-2 align-top text-sm font-medium text-text-secondary">
                        {alert.message}
                      </td>
                      <td className="py-4 px-2 align-top text-right w-24">
                        {alert.findings ? (
                           <div className="flex items-center justify-end gap-1 text-primary">
                             <span className="text-xs font-bold">{expandedId === alert.id ? "Hide" : "View"}</span>
                             {expandedId === alert.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                           </div>
                        ) : (
                          <span className="text-text-muted text-xs">-</span>
                        )}
                      </td>
                    </tr>
                    {expandedId === alert.id && alert.findings && (
                      <tr className="border-b border-border-divider bg-[#1E1E1E]">
                        <td colSpan={5} className="p-6">
                           <div className="flex flex-col gap-2">
                             <h4 className="text-xs font-bold text-text-secondary uppercase tracking-widest border-b border-gray-700 pb-2">Raw JSON Findings</h4>
                             <pre className="text-green-400 font-mono text-xs whitespace-pre-wrap break-words">
                               {JSON.stringify(alert.findings, null, 2)}
                             </pre>
                           </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
