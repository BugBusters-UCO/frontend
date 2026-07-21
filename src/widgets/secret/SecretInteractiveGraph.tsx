import React, { useState, useEffect } from "react";
import { useTheme } from "next-themes";
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
  Edge,
  Node,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import dagre from "dagre";

const getKindConfig = (kind: string) => {
  switch (kind) {
    case "secret": return { icon: "key", color: "text-red-600 dark:text-red-400", bg: "bg-red-100/50 dark:bg-red-950/40", border: "border-red-200 dark:border-red-900/50", ring: "ring-red-500", accent: "bg-red-500" };
    case "capability": return { icon: "bolt", color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-100/50 dark:bg-amber-950/40", border: "border-amber-200 dark:border-amber-900/50", ring: "ring-amber-500", accent: "bg-amber-500" };
    case "service": return { icon: "dns", color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-100/50 dark:bg-blue-950/40", border: "border-blue-200 dark:border-blue-900/50", ring: "ring-blue-500", accent: "bg-blue-500" };
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
      <Handle 
        type="target" 
        position={Position.Top} 
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
        position={Position.Bottom} 
        className="!w-2.5 !h-2.5 !bg-primary !border-2 !border-background shadow-[0_0_8px_rgba(31,111,235,0.8)]" 
      />
    </div>
  );
};

const nodeTypes = { custom: CustomNode };

interface SecretNode {
  id: string;
  label: string;
  node_type: string;
}

interface SecretEdge {
  source: string;
  target: string;
  label?: string;
}

interface SecretInteractiveGraphProps {
  graphData: {
    nodes: SecretNode[];
    edges: SecretEdge[];
  };
}

export function SecretInteractiveGraph({ graphData }: SecretInteractiveGraphProps) {
  const { resolvedTheme } = useTheme();
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (!graphData || !graphData.nodes || graphData.nodes.length === 0) return;

    const dagreGraph = new dagre.graphlib.Graph();
    dagreGraph.setDefaultEdgeLabel(() => ({}));
    dagreGraph.setGraph({ rankdir: 'TB', nodesep: 100, ranksep: 150 });

    graphData.nodes.forEach((node) => {
      dagreGraph.setNode(node.id, { width: 224, height: 60 });
    });

    (graphData.edges || []).forEach((edge: SecretEdge) => {
      dagreGraph.setEdge(edge.source, edge.target);
    });

    dagre.layout(dagreGraph);

    const initialNodes: Node[] = graphData.nodes.map((n) => {
      const nodeWithPosition = dagreGraph.node(n.id);
      return {
        id: n.id,
        type: 'custom',
        position: { 
          x: nodeWithPosition.x - 112, 
          y: nodeWithPosition.y - 30 
        },
        data: {
          label: n.label,
          kind: n.node_type,
        },
      };
    });

    const initialEdges: Edge[] = (graphData.edges || []).map((e: SecretEdge, idx: number) => ({
      id: `e-${idx}-${e.source}-${e.target}`,
      source: e.source,
      target: e.target,
      animated: true,
      label: e.label,
      type: 'smoothstep',
      style: { 
        stroke: resolvedTheme === 'dark' ? 'rgba(239, 68, 68, 0.4)' : 'rgba(239, 68, 68, 0.7)', 
        strokeWidth: 1.5 
      },
    }));

    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [graphData, setNodes, setEdges, resolvedTheme]);

  if (!graphData || !graphData.nodes || graphData.nodes.length === 0) {
    return null;
  }

  return (
    <div className={`transition-all duration-300 ease-in-out ${isFullscreen ? "fixed inset-0 z-[100] bg-background p-6 @md:p-8 overflow-y-auto m-0 rounded-none border-0" : "bg-surface rounded-2xl border border-border-subtle shadow-[0_4px_30px_rgba(0,0,0,0.4)] p-card-padding overflow-hidden relative"}`}>
      <div className="flex justify-between items-start mb-6">
        <div>
          <div className="flex items-center gap-1.5">
            <h2 className="text-section-header font-sans font-bold uppercase tracking-wider text-text-primary">
              Secret Exposure Graph
            </h2>
            <InfoTooltip text="Interactive graph showing relationships from exposed secrets to capabilities and affected services." />
          </div>
          <p className="text-body-sm text-text-secondary mt-1">
            File to secret to asset to required rotation control.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="px-2.5 py-1 bg-surface-container border border-border-subtle rounded-md text-body-xs font-semibold text-text-secondary hidden @sm:block">
            {graphData.nodes.length} nodes / {graphData.edges.length} edges
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

      <div className={`w-full border border-border-subtle rounded-2xl bg-surface-dim shadow-inner relative overflow-hidden transition-all duration-300 ${isFullscreen ? "h-[calc(100vh-140px)]" : "h-[400px]"}`}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          minZoom={0.2}
          colorMode={resolvedTheme === 'dark' ? 'dark' : 'light'}
        >
          <Background color={resolvedTheme === "dark" ? "#1e293b" : "#cbd5e1"} gap={16} />
          <Controls />
        </ReactFlow>
      </div>
    </div>
  );
}
