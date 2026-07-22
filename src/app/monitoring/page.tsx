"use client";

import React, { useState } from "react";
import { fetchAgents } from "@/shared/api/client";
import { useQuery } from "@tanstack/react-query";
import { RemoteFileExplorer } from "@/shared/ui/RemoteFileExplorer";
import axios from "axios";
import { usePageContext } from "@/features/chatbot/usePageContext";

export default function EdrMonitoringPage() {
  const { data: agents = [], isLoading } = useQuery({
    queryKey: ["agents"],
    queryFn: fetchAgents,
  });

  const [selectedAgentId, setSelectedAgentId] = useState("");
  const [selectedPaths, setSelectedPaths] = useState<string[]>([]);
  const [isWatching, setIsWatching] = useState(false);
  const [watchSuccess, setWatchSuccess] = useState(false);

  const activeAgent = agents.find(a => a.id === selectedAgentId);

  usePageContext({
    page: "EDR Monitoring",
    agentsCount: agents?.length || 0,
    activeAgent,
    selectedPaths,
    isWatching
  });

  const handleStartWatcher = async () => {
    if (selectedPaths.length === 0) return;
    
    setIsWatching(true);
    setWatchSuccess(false);

    try {
      // In a real app we might watch multiple, but we just watch the first selected one for the demo
      const folderPath = selectedPaths[0];
      await axios.post(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/edr/start-watch`, { folderPath }, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      setWatchSuccess(true);
    } catch (error) {
      console.error("Failed to start watcher", error);
    } finally {
      setIsWatching(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-background relative z-10 overflow-hidden">
      <div className="px-10 py-6 border-b border-border-subtle bg-surface-base">
        <h1 className="text-display-sm font-display-sm font-semibold text-text-primary tracking-tight">
          Real-Time EDR Monitoring
        </h1>
        <p className="text-body-base font-body-base text-text-secondary mt-1 max-w-2xl">
          Select a folder from a connected agent to monitor in real-time. Any malicious changes to files within the watched folder will instantly trigger a Codebase Compromise alert.
        </p>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Column: Agents */}
        <div className="w-1/3 min-w-[300px] border-r border-border-subtle bg-surface-base p-6 overflow-y-auto">
          <h2 className="text-label-lg font-label-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[20px]">router</span>
            Connected Agents
          </h2>
          {isLoading ? (
            <div className="text-text-secondary text-sm">Loading agents...</div>
          ) : agents.length === 0 ? (
            <div className="p-4 rounded-xl border border-border-subtle bg-surface-dim text-text-secondary text-sm">
              No agents connected. Run the agent script on your machine to connect.
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {agents.map((agent) => (
                <div
                  key={agent.id}
                  onClick={() => setSelectedAgentId(agent.id)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all duration-200 ${
                    selectedAgentId === agent.id
                      ? "border-primary bg-primary/5 shadow-sm"
                      : "border-border-subtle bg-surface-base hover:border-primary/50 hover:bg-surface-dim"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-semibold text-text-primary flex items-center gap-2">
                      <span className="material-symbols-outlined text-success text-[18px]">cloud_done</span>
                      {agent.hostname}
                    </div>
                  </div>
                  <div className="text-xs text-text-secondary">
                    {agent.inventory?.paths?.length || 0} monitored paths
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Folders & Watch Button */}
        <div className="flex-1 flex flex-col p-6 bg-surface-dim overflow-y-auto">
          {!activeAgent ? (
            <div className="flex-1 flex items-center justify-center text-text-secondary text-sm">
              Select an agent to view available folders
            </div>
          ) : (
            <div className="flex flex-col h-full max-w-4xl mx-auto w-full">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-heading-sm font-heading-sm font-semibold text-text-primary flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">folder_open</span>
                  Select Target Folder
                </h2>
                
                <button
                  onClick={handleStartWatcher}
                  disabled={selectedPaths.length === 0 || isWatching}
                  className={`px-6 py-2.5 rounded-xl font-semibold flex items-center gap-2 transition-all ${
                    selectedPaths.length === 0 || isWatching
                      ? "bg-surface-base text-text-muted border border-border-subtle cursor-not-allowed"
                      : "bg-primary text-white hover:bg-primary-hover shadow-sm"
                  }`}
                >
                  <span className="material-symbols-outlined text-[20px]">
                    {isWatching ? 'hourglass_empty' : 'policy'}
                  </span>
                  {isWatching ? "Starting..." : "Start Real-Time Watcher"}
                </button>
              </div>

              {watchSuccess && (
                <div className="mb-6 p-4 rounded-xl bg-success/10 border border-success/30 text-success flex items-center gap-3">
                  <span className="material-symbols-outlined">check_circle</span>
                  <div>
                    <div className="font-bold">EDR Watcher Active</div>
                    <div className="text-sm opacity-90">The selected folder is now being monitored in real-time.</div>
                  </div>
                </div>
              )}

              <div className="flex-1 rounded-2xl border border-border-subtle bg-surface-base overflow-hidden flex flex-col shadow-sm">
                <RemoteFileExplorer
                  agentId={activeAgent.id}
                  selectedPaths={selectedPaths}
                  togglePath={(path) => {
                    if (!isWatching) {
                      setSelectedPaths(prev => prev.includes(path) ? [] : [path]);
                    }
                  }}
                  hasAgents={!!activeAgent}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
