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

const PolicyNode = ({ data, selected }: NodeProps) => {
  const isHotspot = data.isHotspot as boolean;
  const kind = data.kind as string;

  let bgClass = "bg-surface transition-colors duration-300";
  let borderClass = "border-border-subtle";
  let iconClass = "text-slate-400";
  let icon = "dns";

  if (kind === "endpoint") {
    borderClass = "border-blue-300 dark:border-blue-800";
    bgClass = "bg-blue-50 dark:bg-blue-950/40";
    iconClass = "text-blue-500 dark:text-blue-400";
    icon = "router";
  } else if (kind === "policy") {
    borderClass = "border-purple-300 dark:border-purple-800";
    bgClass = "bg-purple-50 dark:bg-purple-950/40";
    iconClass = "text-purple-500 dark:text-purple-400";
    icon = "policy";
  }

  if (isHotspot) {
    borderClass = "border-red-400 dark:border-red-800";
    bgClass = "bg-red-50 dark:bg-red-950/40";
    iconClass = "text-red-500 dark:text-red-400";
    icon = "local_fire_department";
  }

  return (
    <div className={`relative flex items-center gap-3 min-w-[200px] max-w-[280px] p-3 rounded-2xl border-2 ${bgClass} ${borderClass} transition-all duration-300 ${selected ? 'shadow-lg ring-2 ring-red-400 ring-offset-2 z-10 scale-[1.02]' : 'shadow-sm hover:shadow-md'}`}>
      <Handle type="target" position={Position.Top} className="w-2 h-2 bg-slate-400 border-none" />
      
      <span className={`material-symbols-outlined ${iconClass} text-[24px]`}>{icon}</span>
      <div className="flex flex-col min-w-0 flex-1">
        <div className="text-[12px] font-bold text-text-primary break-words mb-1">
          {data.label as string}
        </div>
        <div className="text-[10px] uppercase tracking-widest font-semibold text-text-muted">
          {kind}
        </div>
      </div>
      
      <Handle type="source" position={Position.Bottom} className="w-2 h-2 bg-slate-400 border-none" />
    </div>
  );
};

const nodeTypes = { custom: PolicyNode };

interface CipherInteractiveGraphProps {
  graphData: {
    nodes: { id: string; label: string; kind?: string }[];
    edges: { source: string; target: string; relation?: string; label?: string }[];
    hotspots?: string[];
  };
}

export function CipherInteractiveGraph({ graphData }: CipherInteractiveGraphProps) {
  const { resolvedTheme } = useTheme();
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (!graphData || !graphData.nodes) return;

    const dagreGraph = new dagre.graphlib.Graph();
    dagreGraph.setDefaultEdgeLabel(() => ({}));
    dagreGraph.setGraph({ rankdir: 'TB', nodesep: 50, ranksep: 100 });

    graphData.nodes.forEach((node) => {
      dagreGraph.setNode(node.id, { width: 220, height: 60 });
    });

    graphData.edges.forEach((edge) => {
      dagreGraph.setEdge(edge.source, edge.target);
    });

    dagre.layout(dagreGraph);

    const hotspots = new Set(graphData.hotspots || []);

    const newNodes = graphData.nodes.map((node) => {
      const nodeWithPosition = dagreGraph.node(node.id);
      return {
        id: node.id,
        type: 'custom',
        position: {
          x: nodeWithPosition.x - 110,
          y: nodeWithPosition.y - 30,
        },
        data: {
          label: node.label,
          kind: node.kind || "node",
          isHotspot: hotspots.has(node.id)
        }
      };
    });

    const newEdges = graphData.edges.map((edge, idx) => ({
      id: `e-${idx}-${edge.source}-${edge.target}`,
      source: edge.source,
      target: edge.target,
      label: edge.label || edge.relation,
      animated: hotspots.has(edge.source) || hotspots.has(edge.target),
      style: { stroke: hotspots.has(edge.source) || hotspots.has(edge.target) ? '#ef4444' : '#94a3b8', strokeWidth: 2 },
    }));

    setNodes(newNodes);
    setEdges(newEdges);
  }, [graphData, setNodes, setEdges]);

  if (!graphData || !graphData.nodes || graphData.nodes.length === 0) {
    return null;
  }

  return (
    <div className={`transition-all duration-300 ease-in-out ${isFullscreen ? "fixed inset-0 z-[100] bg-surface-container-lowest p-6 md:p-8 overflow-y-auto m-0 rounded-none border-0" : "bg-surface transition-colors duration-300 rounded-2xl border border-border-subtle shadow-sm p-card-padding overflow-hidden relative"}`}>
      <div className="flex justify-between items-start mb-6">
        <div>
          <div className="flex items-center">
            <h2 className="text-section-header font-section-header">
              Policy Graph Hotspots
            </h2>
            <InfoTooltip text="Visualizes TLS policies mapping to endpoints. Hotspots indicate highly reused, risky configurations." />
          </div>
          <p className="text-body-sm text-text-muted mt-1">
            Connected TLS nodes by risk-weighted graph edges.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="px-2.5 py-1 bg-surface-container-low border border-border-subtle rounded-md text-body-xs font-semibold hidden sm:block">
            {graphData.nodes.length} nodes
          </div>
          <button 
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1.5 hover:bg-surface-container rounded-md text-text-secondary hover:text-text-primary transition-colors border border-border-subtle bg-surface transition-colors duration-300 shadow-sm flex items-center justify-center"
            title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
          >
            <span className="material-symbols-outlined text-[20px]">
              {isFullscreen ? 'fullscreen_exit' : 'fullscreen'}
            </span>
          </button>
        </div>
      </div>

      <div className={`w-full border border-border-subtle rounded-2xl bg-surface-dim shadow-inner relative overflow-hidden transition-all duration-300 ${isFullscreen ? "h-[calc(100vh-140px)]" : "h-[500px]"}`}>
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
          <Background color={resolvedTheme === "dark" ? "#1e293b" : "#cbd5e1"} gap={16} />
          <Controls />
        </ReactFlow>
      </div>
    </div>
  );
}
