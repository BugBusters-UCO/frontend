"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchProxyAlerts } from "@/shared/api/client";
import { ShieldAlert, Activity, Package, Clock, ChevronDown, ChevronUp } from "lucide-react";

export default function ProxyAlertsPage() {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: alerts = [], isLoading, error } = useQuery({
    queryKey: ["proxy-alerts"],
    queryFn: fetchProxyAlerts,
    refetchInterval: 5000 // Poll every 5 seconds for new alerts
  });

  return (
    <div className="max-w-[1280px] mx-auto flex flex-col gap-section-gap animate-in fade-in duration-500">
      
      {/* Header */}
      <div className="bg-[#2D0F0F] transition-colors duration-300 rounded-2xl border border-red-900/50 shadow-lg p-8 flex items-center justify-between gap-6 overflow-hidden relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-red-500/10 rounded-bl-[200px] -z-10 pointer-events-none"></div>
        <div className="flex items-center gap-5 relative z-10">
          <div className="w-14 h-14 rounded-2xl bg-red-500/20 flex items-center justify-center shrink-0 border border-red-500/30">
            <ShieldAlert className="text-red-500" size={32} />
          </div>
          <div>
            <h1 className="font-headline-lg text-headline-lg text-red-100 mb-1 tracking-tight">Security Gateway Alerts</h1>
            <p className="font-body-sm text-body-sm text-red-300/80">
              Live intercept logs of malicious packages blocked by the Zero Trust NPM proxy.
            </p>
          </div>
        </div>
        <div className="relative z-10 flex items-center gap-2 bg-red-950 px-4 py-2 rounded-xl border border-red-900/50">
           <span className="relative flex h-3 w-3">
             <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
             <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
           </span>
           <span className="text-red-200 text-sm font-bold uppercase tracking-widest">Active</span>
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
