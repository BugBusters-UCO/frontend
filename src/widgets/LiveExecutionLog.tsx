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
    <div className="bg-terminal-bg rounded-lg border border-terminal-border shadow-sm flex flex-col max-h-140">
      <div className="flex items-center justify-between px-4 py-2 border-b border-terminal-border bg-[#1e293b] rounded-t-lg">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-outline-variant text-[16px]">
            terminal
          </span>
          <span className="text-body-sm font-semibold text-outline-variant">
            Live Execution Log
          </span>
        </div>
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-surface-variant opacity-50"></div>
          <div className="w-3 h-3 rounded-full bg-surface-variant opacity-50"></div>
          <div className="w-3 h-3 rounded-full bg-surface-variant opacity-50"></div>
        </div>
      </div>
      <div
        ref={scrollRef}
        className="p-4 font-code-sm text-code-sm text-outline-variant overflow-y-auto flex-1 space-y-1"
      >
        {logs.length === 0 && !isRunning && (
          <div className="text-text-muted italic">Ready. Awaiting scan execution...</div>
        )}
        {logs.map((log, index) => {
          let colorClass = "text-tertiary-fixed"; // default info
          let badgeText = "INFO";
          
          if (log.level === "error") {
            colorClass = "text-error";
            badgeText = "ERROR";
          } else if (log.level === "warning") {
            colorClass = "text-[#fbbf24]"; // amber
            badgeText = "WARN";
          } else if (log.level === "success") {
            colorClass = "text-tertiary-fixed";
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
              <span className="text-text-muted w-16 shrink-0">{time}</span>{" "}
              <span className={`${colorClass} mr-2`}>[{badgeText}]</span>{" "}
              <span className={log.level === "error" ? "text-error-container" : ""}>
                {log.message}
              </span>
            </div>
          );
        })}
        {isRunning && (
          <div className="flex">
            <span className="text-text-muted w-16 shrink-0">--:--:--</span>{" "}
            <span className="text-tertiary-fixed mr-2 animate-pulse">_</span>
          </div>
        )}
      </div>
    </div>
  );
}
