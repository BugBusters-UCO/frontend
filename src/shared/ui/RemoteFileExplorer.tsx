import React, { useEffect, useState } from "react";
import { requestAgentBrowse, pollAgentBrowse } from "@/shared/api/client";

export function RemoteFileExplorer({ 
  agentId, 
  selectedPaths, 
  togglePath, 
  hasAgents 
}: { 
  agentId: string; 
  selectedPaths: string[]; 
  togglePath: (path: string) => void; 
  hasAgents: boolean; 
}) {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set(["C:\\"]));
  const [treeData, setTreeData] = useState<Record<string, Array<{name: string, path: string}>>>({});
  const [loadingNodes, setLoadingNodes] = useState<Set<string>>(new Set());

  const fetchNode = async (path: string) => {
    if (!agentId || !hasAgents) return;
    try {
      setLoadingNodes(prev => new Set(prev).add(path));
      const { requestId } = await requestAgentBrowse(agentId, path);
      
      const poll = async () => {
        const res = await pollAgentBrowse(agentId, requestId);
        if (res.pending) {
          setTimeout(poll, 2000);
        } else {
          const resultArr = Array.isArray(res.result) ? res.result : (res.result ? [res.result] : []);
          setTreeData(prev => ({ ...prev, [path]: resultArr }));
          setLoadingNodes(prev => {
            const next = new Set(prev);
            next.delete(path);
            return next;
          });
        }
      };
      
      poll();
    } catch (e) {
      console.error(e);
      setLoadingNodes(prev => {
        const next = new Set(prev);
        next.delete(path);
        return next;
      });
    }
  };

  useEffect(() => {
    if (hasAgents && agentId) {
      fetchNode("C:\\");
    }
  }, [hasAgents, agentId]);

  const toggleExpand = (path: string) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
        if (!treeData[path]) {
          fetchNode(path);
        }
      }
      return next;
    });
  };

  const renderNode = (path: string, level: number = 0) => {
    const isExpanded = expandedNodes.has(path);
    const isLoading = loadingNodes.has(path);
    const children = treeData[path];
    const isSelected = selectedPaths.includes(path);
    const label = path === "C:\\" ? "C:\\" : path.split('\\').pop() || path;

    return (
      <div key={path} className="flex flex-col">
        <div 
          className={`flex items-center gap-2 py-1.5 px-2 hover:bg-surface-container rounded-md transition-colors ${isSelected ? 'bg-primary-container/5' : ''}`}
          style={{ paddingLeft: `${level * 16 + 8}px` }}
        >
          <button 
            type="button" 
            onClick={() => toggleExpand(path)} 
            className="w-5 h-5 flex items-center justify-center shrink-0"
            disabled={!hasAgents}
          >
            {isLoading ? (
              <span className="material-symbols-outlined text-[14px] animate-spin text-text-muted">sync</span>
            ) : (
              <span className={`material-symbols-outlined text-[16px] text-text-muted transition-transform ${isExpanded ? 'rotate-90' : ''}`}>
                chevron_right
              </span>
            )}
          </button>
          
          <button
            type="button"
            onClick={() => togglePath(path)}
            className={`w-4 h-4 rounded flex items-center justify-center border transition-colors shrink-0 ${isSelected ? 'bg-primary border-primary text-white' : 'border-border-divider bg-white'}`}
            disabled={!hasAgents}
          >
            {isSelected && <span className="material-symbols-outlined text-[12px]">check</span>}
          </button>
          
          <span className="material-symbols-outlined text-[16px] text-primary-container shrink-0">
            {isExpanded ? 'folder_open' : 'folder'}
          </span>
          <span className="text-xs font-mono truncate cursor-pointer select-none flex-1" onClick={() => toggleExpand(path)}>
            {label}
          </span>
        </div>
        
        {isExpanded && children && (
          <div className="flex flex-col">
            {children.length === 0 ? (
              <div className="text-[10px] text-text-muted italic py-1" style={{ paddingLeft: `${(level + 1) * 16 + 32}px` }}>
                Empty
              </div>
            ) : (
              children.map(child => renderNode(child.path, level + 1))
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="border border-border-divider rounded-lg bg-white overflow-hidden flex flex-col h-[280px]">
      <div className="p-2 border-b border-border-divider bg-surface-container-lowest flex items-center justify-between">
        <span className="text-xs font-bold text-text-secondary">Remote File Explorer</span>
        <button 
          type="button" 
          onClick={() => {
            setExpandedNodes(new Set(["C:\\"]));
            fetchNode("C:\\");
          }} 
          className="text-[10px] uppercase font-bold text-primary hover:underline flex items-center gap-1"
          disabled={!hasAgents}
        >
          <span className="material-symbols-outlined text-[12px]">refresh</span> Refresh
        </button>
      </div>
      <div className="p-2 overflow-y-auto custom-scrollbar flex-1">
        {!hasAgents ? (
          <div className="text-xs text-text-muted text-center py-8">No agent available</div>
        ) : (
          renderNode("C:\\")
        )}
      </div>
    </div>
  );
}
