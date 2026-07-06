import React, { useState, useEffect } from "react";
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
    case "route": return { icon: "input", color: "text-blue-500", bg: "bg-blue-50/80", border: "border-blue-200", ring: "ring-blue-400", accent: "bg-blue-400" };
    case "manifest": return { icon: "description", color: "text-purple-500", bg: "bg-purple-50/80", border: "border-purple-200", ring: "ring-purple-400", accent: "bg-purple-400" };
    case "risk": return { icon: "warning", color: "text-amber-500", bg: "bg-amber-50/80", border: "border-amber-200", ring: "ring-amber-400", accent: "bg-amber-400" };
    case "import": return { icon: "account_tree", color: "text-emerald-500", bg: "bg-emerald-50/80", border: "border-emerald-200", ring: "ring-emerald-400", accent: "bg-emerald-400" };
    case "sensitive-use": return { icon: "gpp_maybe", color: "text-red-500", bg: "bg-red-50/80", border: "border-red-200", ring: "ring-red-400", accent: "bg-red-400" };
    default: return { icon: "code", color: "text-slate-500", bg: "bg-slate-50/80", border: "border-slate-200", ring: "ring-slate-400", accent: "bg-slate-400" };
  }
};

const CustomNode = ({ data, selected }: NodeProps) => {
  const config = getKindConfig(data.kind as string);
  
  return (
    <div className={`relative flex items-center gap-3 w-56 p-2.5 rounded-xl bg-white/95 backdrop-blur-md transition-all duration-300 overflow-visible ${selected ? `shadow-lg ${config.ring} ring-2 ring-offset-2 z-10 scale-[1.02] border-transparent` : `border border-border-subtle shadow-sm hover:shadow-md hover:${config.ring} hover:ring-1 hover:border-transparent`}`}>
      
      {/* Left accent color bar inside node */}
      <div className={`absolute left-0 top-0 bottom-0 w-1.5 rounded-l-xl ${config.accent}`}></div>

      <Handle type="target" position={Position.Left} className="w-3 h-3 bg-white border-2 border-slate-400" />
      
      <div className={`w-9 h-9 shrink-0 rounded-lg flex items-center justify-center ml-2 ${config.bg} border ${config.border}`}>
        <span className={`material-symbols-outlined text-[18px] ${config.color}`}>
          {config.icon}
        </span>
      </div>
      
      <div className="flex flex-col min-w-0 flex-1 pr-1">
        <div className={`text-[9px] uppercase tracking-widest font-bold mb-0.5 ${config.color}`}>
          {data.kind as string}
        </div>
        <div className="text-[11px] font-bold text-slate-800 truncate" title={data.label as string}>
          {data.label as string}
        </div>
      </div>
      
      <Handle type="source" position={Position.Right} className="w-3 h-3 bg-white border-2 border-slate-400" />
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
      <div className="bg-white rounded-lg border border-border-subtle shadow-sm p-card-padding">
        <h2 className="text-section-header font-section-header mb-4">
          Blast Radius Map
        </h2>
        <div className="border-2 border-dashed border-border-subtle rounded-lg p-6 flex flex-col items-center justify-center text-center">
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
    <div className={`transition-all duration-300 ease-in-out ${isFullscreen ? "fixed inset-0 z-[100] bg-surface-container-lowest p-6 md:p-8 overflow-y-auto m-0 rounded-none border-0" : "bg-white rounded-xl border border-[#93c5fd] shadow-[0_4px_24px_rgba(31,111,235,0.08)] p-card-padding overflow-hidden relative"}`}>
      {!isFullscreen && <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-error"></div>}
      <div className="flex justify-between items-start mb-6">
        <div>
          <div className="flex items-center">
            <h2 className="text-section-header font-section-header">
              Interactive Blast Radius Map
            </h2>
            <InfoTooltip text="Interactive graph showing how a vulnerable package can reach your sensitive business logic. Use mouse to pan and zoom." />
          </div>
          <p className="text-body-sm text-text-muted mt-1">
            Visualizes the path from a vulnerable dependency through your code to exposed endpoints.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="px-2.5 py-1 bg-surface-container-low border border-border-subtle rounded-md text-body-xs font-semibold hidden sm:block">
            {chains.length} chains detected
          </div>
          <button 
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1.5 hover:bg-surface-container rounded-md text-text-secondary hover:text-text-primary transition-colors border border-border-subtle bg-white shadow-sm flex items-center justify-center"
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
            <div className="text-body-xs font-bold tracking-wider uppercase text-text-secondary">
              Detected Exposure Paths
            </div>
            <InfoTooltip text="List of all unique paths found connecting vulnerabilities to sensitive code. Select one to view its graph." />
          </div>
          <div className={`space-y-2.5 overflow-y-auto pr-2 pb-2 transition-all duration-300 ${isFullscreen ? "max-h-[calc(100vh-200px)]" : "max-h-[600px]"}`}>
            {chains.map((chain) => {
              const isSelected = chain.id === selectedChainId;

              let severityBg = "bg-surface-container-high";
              let severityColor = "text-text-primary";
              const severityLabel = chain.severity.toLowerCase();

              if (severityLabel === "critical") {
                severityBg = "bg-severity-critical";
                severityColor = "text-white";
              } else if (severityLabel === "high") {
                severityBg = "bg-severity-high-bg border-[#fca5a5]";
                severityColor = "text-severity-high";
              } else if (severityLabel === "medium") {
                severityBg = "bg-severity-medium-bg border-[#fcd34d]";
                severityColor = "text-severity-medium";
              } else {
                severityBg = "bg-severity-low-bg border-[#86efac]";
                severityColor = "text-severity-low";
              }

              return (
                <div
                  key={chain.id}
                  onClick={() => setSelectedChainId(chain.id)}
                  className={`relative p-3.5 rounded-xl border cursor-pointer transition-all duration-200 overflow-hidden group ${
                    isSelected
                      ? "border-[#93c5fd] bg-[#eff6ff] shadow-[0_2px_8px_rgba(31,111,235,0.08)]"
                      : "border-border-divider bg-surface-container-lowest hover:border-border-subtle hover:bg-white hover:shadow-sm"
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
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${severityBg} ${severityColor} border ${severityLabel === 'critical' ? 'border-transparent' : ''}`}
                    >
                      {chain.severity}
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {chain.sensitive_contexts.slice(0, 2).map((ctx, i) => (
                      <span
                        key={i}
                        className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border ${isSelected ? 'bg-white border-[#bfdbfe] text-primary' : 'bg-surface-container-low border-border-subtle text-text-secondary'}`}
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
          <InteractiveTraceGraph trace={selectedChain.trace || []} fix={selectedChain.fix} isFullscreen={isFullscreen} />
        </div>
      </div>
    </div>
  );
}

function InteractiveTraceGraph({ trace, fix, isFullscreen }: { trace: NonNullable<RiskChain["trace"]>, fix?: RiskChain["fix"], isFullscreen?: boolean }) {
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
        style: { stroke: '#3b82f6', strokeWidth: 2 },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: '#3b82f6',
        },
      });
    }

    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [trace, setNodes, setEdges]);

  // Update selected state of nodes based on selectedStepIdx
  useEffect(() => {
    setNodes((nds) =>
      nds.map((n) => ({
        ...n,
        selected: n.id === `node-${selectedStepIdx}`,
      }))
    );
  }, [selectedStepIdx, setNodes]);

  // Reset selected step when trace changes
  useEffect(() => {
    setSelectedStepIdx(0);
  }, [trace]);

  if (trace.length === 0) return null;

  const selectedStep = trace[selectedStepIdx];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const onNodeClick = (event: React.MouseEvent, node: any) => {
    setSelectedStepIdx(node.data.stepIdx as number);
  };

  return (
    <div className="flex flex-col gap-4 w-full h-full">
      <div className={`w-full border border-border-subtle rounded-xl bg-[#fafafa] shadow-inner relative overflow-hidden transition-all duration-300 ${isFullscreen ? "h-[50vh]" : "h-[350px]"}`}>
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
        >
          <Background color="#cbd5e1" gap={20} />
          <Controls showInteractive={false} />
        </ReactFlow>
        <div className="absolute top-2 left-2 bg-white/90 backdrop-blur border border-border-subtle px-3 py-1.5 rounded-lg text-[10px] font-bold text-text-secondary uppercase tracking-wider shadow-sm z-10 flex items-center gap-2">
          <span className="material-symbols-outlined text-[14px]">mouse</span>
          Interactive Graph
        </div>
      </div>

      {/* Selected Details Panel */}
      <div className="bg-white border border-[#bfdbfe] rounded-xl p-5 shadow-[0_4px_24px_rgba(31,111,235,0.06)] relative overflow-hidden transition-all">
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary"></div>
        <div className="flex items-start justify-between mb-4 pl-2">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="bg-surface-container-high text-text-secondary text-[11px] font-bold px-2 py-0.5 rounded-md border border-border-subtle">
                Step {selectedStep?.step}
              </span>
              <span className="text-body-md font-bold text-text-primary">{selectedStep?.label}</span>
            </div>
            {selectedStep?.file_path && (
              <div className="text-body-xs font-code-sm text-text-secondary flex items-center gap-1 mt-2 bg-surface-container-lowest px-2 py-1 rounded border border-border-subtle w-fit">
                <span className="material-symbols-outlined text-[14px]">folder</span>
                {selectedStep?.file_path}
                {selectedStep?.line_number ? <span className="text-primary-container font-bold">:{selectedStep?.line_number}</span> : ""}
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
          <div className="bg-[#0f172a] text-[#d1d5db] font-code-sm text-[13px] leading-relaxed p-4 rounded-lg overflow-x-auto whitespace-pre border border-[#334155] shadow-inner mb-4 relative ml-2">
            <div className="absolute top-2 right-2 text-[#475569] text-[10px] uppercase tracking-widest font-bold select-none pointer-events-none">Source Snippet</div>
            {selectedStep?.code}
          </div>
        )}

        {selectedStep?.details && selectedStep?.details.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2 ml-2">
            {selectedStep?.details.map((det, i) => (
              <span key={i} className="text-[11px] bg-surface-container-lowest border border-border-subtle text-text-secondary px-2.5 py-1 rounded-md shadow-sm flex items-center gap-1.5 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                {det}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Fix Panel */}
      {fix && (
        <div className="border border-[#b7e4c7] rounded-xl p-5 bg-[#effaf3] shadow-[0_4px_24px_rgba(22,101,52,0.06)] relative overflow-hidden mt-2">
          <div className="absolute top-0 left-0 w-1 h-full bg-[#176b3a]"></div>
          <div className="flex justify-between items-start mb-3 pl-2">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[#176b3a] text-xl">build</span>
              <div className="text-body-sm font-bold text-[#176b3a]">
                {fix.title}
              </div>
            </div>
            {fix.auto_remediable ? (
              <span className="px-2 py-1 bg-white text-[#176b3a] border border-[#b7e4c7] text-[10px] font-bold rounded uppercase tracking-wider shadow-sm">
                Auto fix ready
              </span>
            ) : (
              <span className="px-2 py-1 bg-white text-text-secondary border border-border-subtle text-[10px] font-bold rounded uppercase tracking-wider shadow-sm">
                Manual review
              </span>
            )}
          </div>
          <p className="text-body-sm text-[#176b3a] mb-4 opacity-90 pl-2">
            {fix.description}
          </p>
          {fix.command && (
            <div className="bg-[#0f172a] text-[#86efac] font-code-sm text-[13px] p-3 rounded-md overflow-x-auto whitespace-pre border border-[#176b3a] shadow-inner flex items-center gap-3 ml-2">
              <span className="material-symbols-outlined text-[#475569] text-[16px] select-none">terminal</span>
              {fix.command}
            </div>
          )}
        </div>
      )}

    </div>
  );
}
