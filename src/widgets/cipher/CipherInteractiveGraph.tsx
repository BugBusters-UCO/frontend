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

  let accentColor = "bg-slate-400";
  let iconClass = "text-slate-500 dark:text-slate-400";
  let icon = "dns";

  if (kind === "endpoint") {
    accentColor = "bg-blue-500";
    iconClass = "text-blue-600 dark:text-blue-400";
    icon = "router";
  } else if (kind === "policy") {
    accentColor = "bg-purple-500";
    iconClass = "text-purple-600 dark:text-purple-400";
    icon = "policy";
  }

  if (isHotspot) {
    accentColor = "bg-red-500";
    iconClass = "text-red-600 dark:text-red-400";
    icon = "local_fire_department";
  }

  return (
    <div className={`relative flex items-center gap-3 w-64 p-3 rounded-xl bg-surface/95 border border-border-subtle backdrop-blur-md transition-all duration-300 ${
      selected ? 'ring-2 ring-primary ring-offset-2 ring-offset-background shadow-[0_0_20px_rgba(31,111,235,0.25)] scale-[1.02] z-10' : 'hover:border-primary/50 shadow-sm'
    }`}>
      <Handle type="target" position={Position.Top} className="w-2 h-2 !bg-primary border-none opacity-0" />
      
      {/* Node Icon Container */}
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center bg-surface-container-high shrink-0`}>
        <span className={`material-symbols-outlined ${iconClass} text-[20px]`}>{icon}</span>
      </div>
      
      {/* Text Details */}
      <div className="flex-1 min-w-0 flex flex-col justify-center">
        <p className="text-[10px] uppercase font-bold tracking-wider text-text-muted mb-0.5 leading-none">{kind}</p>
        <p className="text-xs font-semibold truncate text-text-primary leading-tight">{data.label as string}</p>
      </div>
      
      <Handle type="source" position={Position.Bottom} className="w-2 h-2 !bg-primary border-none opacity-0" />
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

    const newEdges = graphData.edges.map((edge, idx) => {
      const isHotspotEdge = hotspots.has(edge.source) || hotspots.has(edge.target);
      return {
        id: `e-${idx}-${edge.source}-${edge.target}`,
        source: edge.source,
        target: edge.target,
        label: edge.label || edge.relation,
        type: 'smoothstep',
        animated: true,
        style: { 
          stroke: isHotspotEdge ? '#ef4444' : (resolvedTheme === 'dark' ? 'rgba(59, 130, 246, 0.4)' : 'rgba(59, 130, 246, 0.7)'), 
          strokeWidth: isHotspotEdge ? 2 : 1.5 
        },
      };
    });

    setNodes(newNodes);
    setEdges(newEdges);
  }, [graphData, setNodes, setEdges, resolvedTheme]);

  if (!graphData || !graphData.nodes || graphData.nodes.length === 0) {
    return null;
  }

  return (
    <div className={`transition-all duration-300 ease-in-out ${isFullscreen ? "fixed inset-0 z-[100] bg-surface-container-lowest p-6 @md:p-8 overflow-y-auto m-0 rounded-none border-0" : "bg-surface transition-colors duration-300 rounded-2xl border border-border-subtle shadow-sm p-card-padding overflow-hidden relative"}`}>
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
          <div className="px-2.5 py-1 bg-surface-container-low border border-border-subtle rounded-md text-body-xs font-semibold hidden @sm:block">
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
          colorMode={resolvedTheme === 'dark' ? 'dark' : 'light'}
        >
          <Background color={resolvedTheme === "dark" ? "#1e293b" : "#cbd5e1"} gap={16} />
          <Controls />
        </ReactFlow>
      </div>
    </div>
  );
}
