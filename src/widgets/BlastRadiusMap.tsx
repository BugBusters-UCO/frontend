import React, { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import { RiskChain } from "@/shared/api/types";
import { InfoTooltip } from "@/shared/ui/InfoTooltip";
import {
  ReactFlow,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  Handle,
  Position,
  NodeProps,
  Node,
  Edge,
  MarkerType,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

interface BlastRadiusMapProps {
  chains: RiskChain[];
}

const getKindConfig = (kind: string) => {
  switch (kind) {
    case "route": return { icon: "input", color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-100/50 dark:bg-blue-950/40", border: "border-blue-200 dark:border-blue-900/50", ring: "ring-blue-500", accent: "bg-blue-500" };
    case "manifest": return { icon: "description", color: "text-purple-600 dark:text-purple-400", bg: "bg-purple-100/50 dark:bg-purple-950/40", border: "border-purple-200 dark:border-purple-900/50", ring: "ring-purple-500", accent: "bg-purple-500" };
    case "risk": return { icon: "warning", color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-100/50 dark:bg-amber-950/40", border: "border-amber-200 dark:border-amber-900/50", ring: "ring-amber-500", accent: "bg-amber-500" };
    case "import": return { icon: "account_tree", color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-100/50 dark:bg-emerald-950/40", border: "border-emerald-200 dark:border-emerald-900/50", ring: "ring-emerald-500", accent: "bg-emerald-500" };
    case "sensitive-use": return { icon: "gpp_maybe", color: "text-red-600 dark:text-red-400", bg: "bg-red-100/50 dark:bg-red-950/40", border: "border-red-200 dark:border-red-900/50", ring: "ring-red-500", accent: "bg-red-500" };
    default: return { icon: "code", color: "text-text-muted dark:text-slate-400", bg: "bg-slate-100/50 dark:bg-slate-900/40", border: "border-border-subtle dark:border-slate-800/50", ring: "ring-slate-500", accent: "bg-surface-dim transition-colors duration-3000" };
  }
};

const CustomNode = ({ data, selected }: NodeProps) => {
  const config = getKindConfig(data.kind as string);
  
  return (
    <div className={`relative flex items-center gap-3 w-56 p-2.5 rounded-2xl bg-surface/95 border backdrop-blur-md transition-all duration-300 overflow-visible ${
      selected 
        ? `border-primary shadow-[0_0_20px_rgba(31,111,235,0.3)] ring-1 ring-primary/50 z-10 scale-[1.02]` 
        : `border-border-subtle shadow-sm hover:border-primary/50`
    }`}>
      
      {/* Left accent color bar inside node */}
      <div className={`absolute left-0 top-0 bottom-0 w-1.5 rounded-l-xl ${config.accent}`}></div>

      <Handle 
        type="target" 
        position={Position.Left} 
        className="!w-2.5 !h-2.5 !bg-primary !border-2 !border-background shadow-[0_0_8px_rgba(31,111,235,0.8)]" 
      />
      
      <div className={`w-9 h-9 shrink-0 rounded-2xl flex items-center justify-center ml-2 ${config.bg} border ${config.border}`}>
        <span className={`material-symbols-outlined text-[18px] ${config.color}`}>
          {config.icon}
        </span>
      </div>
      
      <div className="flex flex-col min-w-0 flex-1 pr-1">
        <div className={`text-[9px] uppercase tracking-widest font-bold mb-0.5 ${config.color}`}>
          {data.kind as string}
        </div>
        <div className="text-[11px] font-bold text-text-primary truncate" title={data.label as string}>
          {data.label as string}
        </div>
      </div>
      
      <Handle 
        type="source" 
        position={Position.Right} 
        className="!w-2.5 !h-2.5 !bg-primary !border-2 !border-background shadow-[0_0_8px_rgba(31,111,235,0.8)]" 
      />
    </div>
  );
};

const nodeTypes = { custom: CustomNode };

export function BlastRadiusMap({ chains }: BlastRadiusMapProps) {
  const [selectedChainId, setSelectedChainId] = useState<string | null>(
    chains.length > 0 ? chains[0].id : null
  );
  const [isFullscreen, setIsFullscreen] = useState(false);

  if (!chains || chains.length === 0) {
    return (
      <div className="bg-surface rounded-2xl border border-border-subtle shadow-sm p-card-padding text-text-primary">
        <h2 className="text-section-header font-sans font-bold uppercase tracking-wider mb-4">
          Blast Radius Map
        </h2>
        <div className="border-2 border-dashed border-border-subtle rounded-2xl p-6 flex flex-col items-center justify-center text-center">
          <span className="material-symbols-outlined text-text-muted text-4xl mb-2">
            account_tree
          </span>
          <div className="text-body-sm font-semibold">
            No blast-radius chains yet.
          </div>
          <div className="text-body-xs text-text-muted mt-1 max-w-md">
            Chains appear when a vulnerable dependency connects to sensitive
            banking code paths.
          </div>
        </div>
      </div>
    );
  }

  const selectedChain = chains.find((c) => c.id === selectedChainId) || chains[0];

  return (
    <div className={`transition-all duration-300 ease-in-out ${isFullscreen ? "fixed inset-0 z-[100] bg-background p-6 md:p-8 overflow-y-auto m-0 rounded-none border-0" : "bg-surface rounded-2xl border border-border-subtle shadow-[0_4px_30px_rgba(0,0,0,0.4)] p-card-padding overflow-hidden relative"}`}>
      {!isFullscreen && <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-primary to-severity-critical"></div>}
      <div className="flex justify-between items-start mb-6">
        <div>
          <div className="flex items-center gap-1.5">
            <h2 className="text-section-header font-sans font-bold uppercase tracking-wider text-text-primary">
              Interactive Blast Radius Map
            </h2>
            <InfoTooltip text="Interactive graph showing how a vulnerable package can reach your sensitive business logic. Use mouse to pan and zoom." />
          </div>
          <p className="text-body-sm text-text-secondary mt-1">
            Visualizes the path from a vulnerable dependency through your code to exposed endpoints.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="px-2.5 py-1 bg-surface-container border border-border-subtle rounded-md text-body-xs font-semibold text-text-secondary hidden sm:block">
            {chains.length} chains detected
          </div>
          <button 
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1.5 hover:bg-surface-container-high rounded-md text-text-secondary hover:text-text-primary transition-colors border border-border-subtle bg-surface-dim shadow-sm flex items-center justify-center cursor-pointer"
            title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
          >
            <span className="material-symbols-outlined text-[20px]">
              {isFullscreen ? 'fullscreen_exit' : 'fullscreen'}
            </span>
          </button>
        </div>
      </div>

      <div className="flex flex-col xl:flex-row gap-6">
        {/* Chain Selector */}
        <div className="xl:w-[280px] shrink-0">
          <div className="flex items-center mb-3">
            <span className="material-symbols-outlined text-text-muted text-[18px] mr-2">list_alt</span>
            <div className="text-body-xs font-bold tracking-widest uppercase text-text-muted">
              Detected Exposure Paths
            </div>
            <InfoTooltip text="List of all unique paths found connecting vulnerabilities to sensitive code. Select one to view its graph." />
          </div>
          <div className={`space-y-2.5 overflow-y-auto pr-2 pb-2 transition-all duration-300 ${isFullscreen ? "max-h-[calc(100vh-200px)]" : "max-h-[600px]"}`}>
            {chains.map((chain) => {
              const isSelected = chain.id === selectedChainId;

              let severityBg = "bg-surface-container-high";
              let severityColor = "text-text-primary";
              let severityBorder = "border-border-subtle";
              const severityLabel = chain.severity.toLowerCase();

              if (severityLabel === "critical") {
                severityBg = "bg-severity-critical/20";
                severityColor = "text-severity-critical";
                severityBorder = "border-severity-critical/30";
              } else if (severityLabel === "high") {
                severityBg = "bg-severity-high-bg";
                severityColor = "text-severity-high";
                severityBorder = "border-severity-high/30";
              } else if (severityLabel === "medium") {
                severityBg = "bg-severity-medium-bg";
                severityColor = "text-severity-medium";
                severityBorder = "border-severity-medium/30";
              } else {
                severityBg = "bg-severity-low-bg";
                severityColor = "text-severity-low";
                severityBorder = "border-severity-low/30";
              }

              return (
                <div
                  key={chain.id}
                  onClick={() => setSelectedChainId(chain.id)}
                  className={`relative p-3.5 rounded-2xl border cursor-pointer transition-all duration-200 overflow-hidden group ${
                    isSelected
                      ? "border-primary/50 bg-primary/10 shadow-[0_2px_12px_rgba(31,111,235,0.15)]"
                      : "border-border-subtle bg-surface-dim hover:border-primary/30 hover:bg-surface-container hover:shadow-sm"
                  }`}
                >
                  {isSelected && (
                    <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-primary rounded-l-xl"></div>
                  )}
                  
                  <div className="flex justify-between items-start mb-1.5">
                    <div className={`text-body-sm font-bold truncate pr-2 transition-colors ${isSelected ? "text-primary" : "text-text-primary group-hover:text-primary"}`}>
                      {chain.dependency_name}
                    </div>
                    <div
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${severityBg} ${severityColor} border ${severityBorder}`}
                    >
                      {chain.severity}
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {chain.sensitive_contexts.slice(0, 2).map((ctx, i) => (
                      <span
                        key={i}
                        className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border ${isSelected ? 'bg-primary/20 border-primary/30 text-primary' : 'bg-surface-container border-border-subtle text-text-secondary'}`}
                      >
                        {ctx}
                      </span>
                    ))}
                    {chain.sensitive_contexts.length > 2 && (
                      <span className="text-[10px] text-text-muted font-semibold flex items-center px-1">
                        +{chain.sensitive_contexts.length - 2}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Graph Area */}
        <div className="flex-1 min-w-0 flex flex-col gap-6">
          <InteractiveTraceGraph key={selectedChain.id} trace={selectedChain.trace || []} fix={selectedChain.fix} isFullscreen={isFullscreen} />
        </div>
      </div>
    </div>
  );
}

function InteractiveTraceGraph({ trace, fix, isFullscreen }: { trace: NonNullable<RiskChain["trace"]>, fix?: RiskChain["fix"], isFullscreen?: boolean }) {
  const { resolvedTheme } = useTheme();
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [selectedStepIdx, setSelectedStepIdx] = useState<number>(0);

  useEffect(() => {
    if (!trace || trace.length === 0) return;

    // Build nodes
    const initialNodes = trace.map((step, idx) => ({
      id: `node-${idx}`,
      type: 'custom',
      position: { x: idx * 270, y: 100 },
      data: {
        label: step.label,
        kind: step.kind,
        stepIdx: idx,
      },
    }));

    // Build edges
    const initialEdges: Edge[] = [];
    for (let i = 0; i < trace.length - 1; i++) {
      initialEdges.push({
        id: `e-${i}-${i + 1}`,
        source: `node-${i}`,
        target: `node-${i + 1}`,
        animated: true,
        type: 'smoothstep',
        style: { 
          stroke: resolvedTheme === 'dark' ? 'rgba(59, 130, 246, 0.4)' : 'rgba(59, 130, 246, 0.7)', 
          strokeWidth: 1.5 
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: resolvedTheme === 'dark' ? 'rgba(59, 130, 246, 0.4)' : 'rgba(59, 130, 246, 0.7)',
        },
      });
    }

    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [trace, setNodes, setEdges, resolvedTheme]);

  // Update selected state of nodes based on selectedStepIdx
  useEffect(() => {
    setNodes((nds) =>
      nds.map((n) => ({
        ...n,
        selected: n.id === `node-${selectedStepIdx}`,
      }))
    );
  }, [selectedStepIdx, setNodes]);



  if (trace.length === 0) return null;

  const selectedStep = trace[selectedStepIdx];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const onNodeClick = (event: React.MouseEvent, node: any) => {
    setSelectedStepIdx(node.data.stepIdx as number);
  };

  return (
    <div className="flex flex-col gap-4 w-full h-full text-text-primary">
      <div className={`w-full border border-border-subtle rounded-2xl bg-surface-dim shadow-inner relative overflow-hidden transition-all duration-300 ${isFullscreen ? "h-[50vh]" : "h-[350px]"}`}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={onNodeClick}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          minZoom={0.5}
          maxZoom={2}
          attributionPosition="bottom-right"
          colorMode={resolvedTheme === 'dark' ? 'dark' : 'light'}
        >
          <Background color={resolvedTheme === "dark" ? "#1e293b" : "#cbd5e1"} gap={20} />
          <Controls showInteractive={false} />
        </ReactFlow>
        <div className="absolute top-2 left-2 bg-surface/90 backdrop-blur border border-border-subtle px-3 py-1.5 rounded-2xl text-[10px] font-bold text-text-secondary uppercase tracking-widest shadow-sm z-10 flex items-center gap-2">
          <span className="material-symbols-outlined text-[14px]">mouse</span>
          Interactive Graph
        </div>
      </div>

      {/* Selected Details Panel */}
      <div className="bg-surface border border-primary/20 rounded-2xl p-5 shadow-[0_4px_24px_rgba(31,111,235,0.1)] relative overflow-hidden transition-all">
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary"></div>
        <div className="flex items-start justify-between mb-4 pl-2">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="bg-surface-container text-text-secondary text-[11px] font-bold px-2 py-0.5 rounded-md border border-border-subtle">
                Step {selectedStep?.step}
              </span>
              <span className="text-body-md font-bold text-text-primary">{selectedStep?.label}</span>
            </div>
            {selectedStep?.file_path && (
              <div className="text-body-xs font-code-sm text-text-secondary flex items-center gap-1 mt-2 bg-surface-dim px-2 py-1 rounded border border-border-subtle w-fit">
                <span className="material-symbols-outlined text-[14px]">folder</span>
                {selectedStep?.file_path}
                {selectedStep?.line_number ? <span className="text-primary font-bold">:{selectedStep?.line_number}</span> : ""}
              </div>
            )}
          </div>
          <div className="flex items-center gap-4">
            <span className={`px-2.5 py-1 text-[10px] uppercase tracking-wider font-bold rounded border ${getKindConfig(selectedStep?.kind as string).bg} ${getKindConfig(selectedStep?.kind as string).color} ${getKindConfig(selectedStep?.kind as string).border}`}>
              {selectedStep?.kind}
            </span>
          </div>
        </div>

        {selectedStep?.code && (
          <div className="bg-terminal-bg text-[#d1d5db] font-code-sm text-[13px] leading-relaxed p-4 rounded-2xl overflow-x-auto whitespace-pre border border-terminal-border shadow-inner mb-4 relative ml-2">
            <div className="absolute top-2 right-2 text-text-muted text-[10px] uppercase tracking-widest font-bold select-none pointer-events-none">Source Snippet</div>
            {selectedStep?.code}
          </div>
        )}

        {selectedStep?.details && selectedStep?.details.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2 ml-2">
            {selectedStep?.details.map((det, i) => (
              <span key={i} className="text-[11px] bg-surface-dim border border-border-subtle text-text-secondary px-2.5 py-1 rounded-md shadow-sm flex items-center gap-1.5 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
                {det}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Fix Panel */}
      {fix && (
        <div className="border border-severity-low/20 rounded-2xl p-5 bg-severity-low-bg shadow-[0_4px_24px_rgba(16,185,129,0.06)] relative overflow-hidden mt-2">
          <div className="absolute top-0 left-0 w-1 h-full bg-severity-low"></div>
          <div className="flex justify-between items-start mb-3 pl-2">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-severity-low text-xl">build</span>
              <div className="text-body-sm font-bold text-severity-low">
                {fix.title}
              </div>
            </div>
            {fix.auto_remediable ? (
              <span className="px-2 py-1 bg-surface text-severity-low border border-severity-low/20 text-[10px] font-bold rounded uppercase tracking-wider shadow-sm">
                Auto fix ready
              </span>
            ) : (
              <span className="px-2 py-1 bg-surface text-text-secondary border border-border-subtle text-[10px] font-bold rounded uppercase tracking-wider shadow-sm">
                Manual review
              </span>
            )}
          </div>
          <p className="text-body-sm text-severity-low mb-4 opacity-90 pl-2">
            {fix.description}
          </p>
          {fix.command && (
            <div className="bg-terminal-bg text-severity-low font-code-sm text-[13px] p-3 rounded-md overflow-x-auto whitespace-pre border border-severity-low/30 shadow-inner flex items-center gap-3 ml-2">
              <span className="material-symbols-outlined text-[#475569] text-[16px] select-none">terminal</span>
              {fix.command}
            </div>
          )}
        </div>
      )}

    </div>
  );
}
