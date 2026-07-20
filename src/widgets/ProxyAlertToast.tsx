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
    <div className="fixed top-24 right-8 z-[100] flex flex-col gap-4 w-96 pointer-events-none">
      {alerts.map((alert) => (
        <div 
          key={alert.id}
          className="bg-[#2D0F0F] border-l-4 border-red-500 rounded-lg shadow-2xl p-5 pointer-events-auto animate-in slide-in-from-right fade-in duration-300"
        >
          <div className="flex items-start gap-3">
            <span className="material-symbols-outlined text-red-500 text-3xl animate-pulse">
              {alert.type === 'PAYLOAD_BLOCK' ? 'bug_report' : 'security'}
            </span>
            <div>
              <h3 className="text-red-400 font-bold uppercase tracking-wider text-sm mb-1">
                Zero Trust Proxy Block
              </h3>
              <p className="text-white text-sm font-medium leading-relaxed">
                {alert.message}
              </p>
              <div className="mt-3 flex gap-2">
                <span className="bg-red-900/50 text-red-200 text-xs px-2 py-1 rounded font-mono border border-red-800/50">
                  {alert.package}
                </span>
                <span className="bg-red-900/50 text-red-200 text-xs px-2 py-1 rounded border border-red-800/50">
                  {alert.type === 'PAYLOAD_BLOCK' ? 'Deep Scan' : 'Metadata Check'}
                </span>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
