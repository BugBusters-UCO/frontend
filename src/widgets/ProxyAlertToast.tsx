"use client";

import React, { useEffect, useState } from "react";

export function ProxyAlertToast() {
  const [alerts, setAlerts] = useState<any[]>([]);

  useEffect(() => {
    // Connect to the SSE stream on the main backend
    const eventSource = new EventSource("http://127.0.0.1:5000/api/proxy/events");

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log("Received Proxy Alert:", data);
        
        // Add new alert to the list
        setAlerts((prev) => [...prev, data]);
        
        // Auto-remove after 8 seconds
        setTimeout(() => {
          setAlerts((prev) => prev.filter(a => a.id !== data.id));
        }, 8000);
      } catch (e) {
        console.error("Failed to parse proxy alert", e);
      }
    };

    return () => {
      eventSource.close();
    };
  }, []);

  if (alerts.length === 0) return null;

  return (
    <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-4 w-[500px] pointer-events-none">
      {alerts.map((alert) => (
        <div 
          key={alert.id}
          className="bg-[#0A0A0A]/95 border border-red-500/40 rounded-xl shadow-[0_10px_40px_rgba(255,0,0,0.2)] p-4 backdrop-blur-xl pointer-events-auto animate-in slide-in-from-top-10 fade-in duration-300 relative overflow-hidden"
        >
          <div className="flex items-start gap-4">
            <div className="bg-red-500/10 p-2 rounded-lg border border-red-500/20 mt-1 shrink-0">
              <span className="material-symbols-outlined text-red-500 text-2xl animate-pulse">
                {alert.type === 'PAYLOAD_BLOCK' ? 'bug_report' : 
                 alert.type === 'CODEBASE_COMPROMISE' ? 'gavel' :
                 alert.type === 'SECRET_BLOCK' ? 'key' :
                 alert.type === 'CONFIG_BLOCK' ? 'settings_alert' :
                 alert.type === 'CIPHER_BLOCK' ? 'policy' :
                 'security'}
              </span>
            </div>
            <div className="flex-1">
              <div className="flex justify-between items-center mb-1">
                <h3 className="text-red-500 font-black uppercase tracking-widest text-xs">
                  {alert.type === 'CODEBASE_COMPROMISE' ? 'Zero Trust EDR Alert' : 'Zero Trust Proxy Block'}
                </h3>
                <span className="text-red-400/50 text-[10px] font-mono">JUST NOW</span>
              </div>
              <p className="text-gray-200 text-sm font-medium leading-relaxed mb-3">
                {alert.message}
              </p>
              <div className="flex flex-wrap gap-2">
                <span className="bg-red-950/60 text-red-300 text-[10px] px-2 py-1 rounded font-mono border border-red-900/50 tracking-wider">
                  {alert.package}
                </span>
                <span className="bg-red-950/60 text-red-300 text-[10px] px-2 py-1 rounded font-mono border border-red-900/50 tracking-wider">
                  {alert.type.replace('_', ' ')}
                </span>
                {alert.findings?.threatLevel && (
                  <span className="bg-red-500/20 text-red-300 font-bold text-[10px] px-2 py-1 rounded border border-red-500/40 tracking-wider">
                    {alert.findings.threatLevel}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
