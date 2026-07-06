import React, { useState, useEffect } from "react";
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
    case "secret": return { icon: "key", color: "text-red-500", bg: "bg-red-50/80", border: "border-red-200", ring: "ring-red-400", accent: "bg-red-400" };
    case "capability": return { icon: "bolt", color: "text-amber-500", bg: "bg-amber-50/80", border: "border-amber-200", ring: "ring-amber-400", accent: "bg-amber-400" };
    case "service": return { icon: "dns", color: "text-blue-500", bg: "bg-blue-50/80", border: "border-blue-200", ring: "ring-blue-400", accent: "bg-blue-400" };
    default: return { icon: "code", color: "text-slate-500", bg: "bg-slate-50/80", border: "border-slate-200", ring: "ring-slate-400", accent: "bg-slate-400" };
  }
};

const CustomNode = ({ data, selected }: NodeProps) => {
  const config = getKindConfig(data.kind as string);
  
  return (
    <div className={`relative flex items-center gap-3 w-56 p-2.5 rounded-xl bg-white/95 backdrop-blur-md transition-all duration-300 overflow-visible ${selected ? `shadow-lg ${config.ring} ring-2 ring-offset-2 z-10 scale-[1.02] border-transparent` : `border border-border-subtle shadow-sm hover:shadow-md hover:${config.ring} hover:ring-1 hover:border-transparent`}`}>
      <div className={`absolute left-0 top-0 bottom-0 w-1.5 rounded-l-xl ${config.accent}`}></div>
      <Handle type="target" position={Position.Top} className="w-3 h-3 bg-white border-2 border-slate-400" />
      
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
      
      <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-white border-2 border-slate-400" />
    </div>
  );
};

const nodeTypes = { custom: CustomNode };

interface SecretInteractiveGraphProps {
  graphData: {
    nodes: any[];
    edges: any[];
  };
}

export function SecretInteractiveGraph({ graphData }: SecretInteractiveGraphProps) {
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

    (graphData.edges || []).forEach((edge: any) => {
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

    const initialEdges: Edge[] = (graphData.edges || []).map((e: any, idx: number) => ({
      id: `e-${idx}-${e.source}-${e.target}`,
      source: e.source,
      target: e.target,
      animated: true,
      label: e.label,
      type: 'smoothstep',
      style: { stroke: '#ef4444', strokeWidth: 2 },
    }));

    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [graphData, setNodes, setEdges]);

  if (!graphData || !graphData.nodes || graphData.nodes.length === 0) {
    return null;
  }

  return (
    <div className={`transition-all duration-300 ease-in-out ${isFullscreen ? "fixed inset-0 z-[100] bg-surface-container-lowest p-6 md:p-8 overflow-y-auto m-0 rounded-none border-0" : "bg-white rounded-xl border border-border-subtle shadow-sm p-card-padding overflow-hidden relative"}`}>
      <div className="flex justify-between items-start mb-6">
        <div>
          <div className="flex items-center">
            <h2 className="text-section-header font-section-header">
              Secret Exposure Graph
            </h2>
            <InfoTooltip text="Interactive graph showing relationships from exposed secrets to capabilities and affected services." />
          </div>
          <p className="text-body-sm text-text-muted mt-1">
            File to secret to asset to required rotation control.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="px-2.5 py-1 bg-surface-container-low border border-border-subtle rounded-md text-body-xs font-semibold hidden sm:block">
            {graphData.nodes.length} nodes / {graphData.edges.length} edges
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

      <div className={`w-full border border-border-subtle rounded-xl bg-[#fafafa] shadow-inner relative overflow-hidden transition-all duration-300 ${isFullscreen ? "h-[calc(100vh-140px)]" : "h-[400px]"}`}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          minZoom={0.2}
        >
          <Background color="#ccc" gap={16} />
          <Controls />
        </ReactFlow>
      </div>
    </div>
  );
}
