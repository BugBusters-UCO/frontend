import React, { useEffect, useState } from "react";
import { requestAgentBrowse, pollAgentBrowse } from "@/shared/api/client";
import { motion, AnimatePresence } from "framer-motion";

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
    const isRoot = path === "C:\\" || path === "C:/";
    const label = isRoot ? "Local Disk (C:)" : path.split('\\').pop() || path;

    return (
      <div key={path} className="flex flex-col relative">
        <div 
          className={`group flex items-center h-9 px-4 cursor-pointer border-b border-border-divider/50 transition-colors ${isSelected ? 'bg-primary/10 hover:bg-primary/20' : 'hover:bg-surface-container-highest'}`}
        >
          {/* Main Column */}
          <div className="flex items-center gap-2 flex-1 overflow-hidden" style={{ paddingLeft: `${level * 20}px` }}>
            <button 
              type="button" 
              onClick={(e) => { e.stopPropagation(); toggleExpand(path); }} 
              className="w-5 h-5 flex items-center justify-center shrink-0 rounded transition-colors text-text-muted hover:text-text-primary"
              disabled={!hasAgents}
            >
              {isLoading ? (
                <span className="material-symbols-outlined text-[14px] animate-spin text-primary">sync</span>
              ) : (
                <span className={`material-symbols-outlined text-[16px] transition-transform duration-200 ${isExpanded ? 'rotate-90 text-text-secondary' : ''}`}>
                  chevron_right
                </span>
              )}
            </button>
            
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); togglePath(path); }}
              className={`w-3.5 h-3.5 rounded-sm flex items-center justify-center border transition-all duration-200 shrink-0 ${isSelected ? 'bg-primary border-primary text-white' : 'border-border-divider bg-transparent hover:border-text-secondary'}`}
              disabled={!hasAgents}
            >
              {isSelected && <span className="material-symbols-outlined text-[10px] font-bold">check</span>}
            </button>
            
            <span className={`material-symbols-outlined text-[16px] shrink-0 transition-colors ${isSelected ? 'text-primary' : (isRoot ? 'text-text-secondary' : 'text-text-muted group-hover:text-text-secondary')}`}>
              {isRoot ? 'database' : (isExpanded ? 'folder_open' : 'folder')}
            </span>
            <span className={`text-[13px] truncate select-none flex-1 transition-colors ${isSelected ? 'text-text-primary font-semibold' : 'text-text-secondary group-hover:text-text-primary'}`} onClick={() => toggleExpand(path)}>
              {label}
            </span>
          </div>

          {/* Fake Columns for Table Look */}
          <div className="hidden @sm:block w-[100px] text-[11px] font-mono text-text-muted shrink-0">--</div>
          <div className="hidden @sm:block w-[120px] text-[11px] text-text-muted shrink-0">--</div>
        </div>
        
        <AnimatePresence initial={false}>
          {isExpanded && children && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
              className="flex flex-col overflow-hidden relative"
            >
              {/* Tree guide line */}
              <div 
                className="absolute left-0 top-0 bottom-0 w-px bg-border-divider/50" 
                style={{ marginLeft: `${level * 20 + 26}px` }}
              ></div>

              {children.length === 0 ? (
                <div className="h-9 flex items-center px-4 border-b border-border-divider/50">
                  <div className="flex items-center gap-2 flex-1" style={{ paddingLeft: `${(level + 1) * 20 + 28}px` }}>
                    <span className="material-symbols-outlined text-[14px] text-text-muted opacity-50">info</span>
                    <span className="text-[11px] text-text-muted italic opacity-50">Empty folder</span>
                  </div>
                  <div className="hidden @sm:block w-[100px]"></div>
                  <div className="hidden @sm:block w-[120px]"></div>
                </div>
              ) : (
                children.map(child => renderNode(child.path, level + 1))
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  return (
    <div className="border border-border-divider rounded-xl bg-surface-container overflow-hidden flex flex-col h-[380px] relative group">
      {/* Sleek Header inspired by CloudTerm */}
      <div className="px-4 py-3 border-b border-border-divider bg-surface-container-high flex items-center justify-between">
        <h2 className="text-sm text-text-primary font-semibold flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-[18px]">folder_open</span>
          Remote File System
        </h2>
        <div className="flex gap-2">
          <button 
            type="button" 
            onClick={() => {
              setExpandedNodes(new Set(["C:\\"]));
              fetchNode("C:\\");
            }} 
            className="p-1.5 bg-primary rounded text-white hover:brightness-110 active:scale-95 transition-all flex items-center justify-center"
            disabled={!hasAgents}
          >
            <span className="material-symbols-outlined text-[16px]">refresh</span>
          </button>
        </div>
      </div>
      
      {/* Table Header */}
      <div className="flex items-center px-4 py-2 bg-surface-container-highest border-b border-border-divider text-[10px] uppercase font-bold tracking-widest text-text-muted">
        <div className="flex-1 flex items-center gap-2">
          <div className="w-[18px]"></div> {/* spacer for chevron */}
          <div className="w-[14px]"></div> {/* spacer for checkbox */}
          <span>Name</span>
        </div>
        <div className="hidden @sm:block w-[100px]">Size</div>
        <div className="hidden @sm:block w-[120px]">Last Modified</div>
      </div>

      {/* File Tree Container */}
      <div className="overflow-y-auto overflow-x-hidden custom-scrollbar flex-1 relative bg-surface-container-lowest">
        {!hasAgents ? (
          <div className="flex flex-col items-center justify-center h-full text-text-muted gap-2">
            <span className="material-symbols-outlined text-3xl opacity-20">cloud_off</span>
            <span className="text-xs">No active agent connection</span>
          </div>
        ) : (
          <div className="pb-4">
            {renderNode("C:\\")}
          </div>
        )}
      </div>
    </div>
  );
}
