import React, { useEffect, useRef } from "react";
import { LogEntry } from "@/shared/api/types";

interface LiveExecutionLogProps {
  logs: LogEntry[];
  isRunning: boolean;
}

export function LiveExecutionLog({ logs, isRunning }: LiveExecutionLogProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div className="bg-terminal-bg rounded-2xl border border-terminal-border shadow-sm flex flex-col max-h-140 transition-colors duration-300">
      <div className="flex items-center justify-between px-4 py-2 border-b border-terminal-border bg-terminal-bg/80 rounded-t-2xl backdrop-blur">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[#94a3b8] text-[16px]">
            terminal
          </span>
          <span className="text-body-sm font-semibold text-[#94a3b8]">
            Live Execution Log
          </span>
        </div>
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-[#475569] opacity-50"></div>
          <div className="w-3 h-3 rounded-full bg-[#475569] opacity-50"></div>
          <div className="w-3 h-3 rounded-full bg-[#475569] opacity-50"></div>
        </div>
      </div>
      <div
        ref={scrollRef}
        className="p-4 font-code-sm text-code-sm text-[#cbd5e1] overflow-y-auto flex-1 space-y-1"
      >
        {logs.length === 0 && !isRunning && (
          <div className="text-text-muted italic">Ready. Awaiting scan execution...</div>
        )}
        {logs.map((log, index) => {
          let colorClass = "text-[#60a5fa]"; // blue-400
          let badgeText = "INFO";
          
          if (log.level === "error") {
            colorClass = "text-[#f87171]"; // red-400
            badgeText = "ERROR";
          } else if (log.level === "warning") {
            colorClass = "text-[#fbbf24]"; // amber-400
            badgeText = "WARN";
          } else if (log.level === "success") {
            colorClass = "text-[#34d399]"; // emerald-400
            badgeText = "SUCCESS";
          }

          const time = new Date(log.timestamp).toLocaleTimeString([], {
            hour12: false,
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          });

          return (
            <div key={`${log.id}-${index}`} className="flex">
              <span className="text-[#64748b] w-16 shrink-0">{time}</span>{" "}
              <span className={`${colorClass} mr-2`}>[{badgeText}]</span>{" "}
              <span className={log.level === "error" ? "text-[#f87171]" : "text-[#e2e8f0]"}>
                {log.message}
              </span>
            </div>
          );
        })}
        {isRunning && (
          <div className="flex">
            <span className="text-[#64748b] w-16 shrink-0">--:--:--</span>{" "}
            <span className="text-[#60a5fa] mr-2 animate-pulse">_</span>
          </div>
        )}
      </div>
    </div>
  );
}
