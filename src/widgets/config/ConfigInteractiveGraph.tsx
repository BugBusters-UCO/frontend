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

const CustomNode = ({ data, selected }: NodeProps) => {
  return (
    <div className={`relative flex items-center gap-3 w-64 p-3 rounded-2xl bg-surface/95 backdrop-blur-md transition-all duration-300 overflow-visible ${selected ? 'shadow-lg ring-red-400 ring-2 ring-offset-2 z-10 scale-[1.02] border-transparent' : 'border border-border-subtle shadow-sm hover:shadow-md hover:ring-red-400 hover:ring-1 hover:border-transparent'}`}>
      <Handle type="target" position={Position.Top} className="w-3 h-3 bg-surface transition-colors duration-300 border-2 border-slate-400" />
      
      <div className="flex flex-col min-w-0 flex-1 pl-2">
        <div className="text-[10px] uppercase tracking-widest font-bold mb-0.5 text-red-500">
          Step {data.stepIndex as number}
        </div>
        <div className="text-[12px] font-bold text-text-primary break-words mb-1">
          {data.label as string}
        </div>
        <div className="text-[10px] font-mono text-text-muted truncate" title={data.location as string}>
          {data.location as string}
        </div>
      </div>
      
      <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-surface transition-colors duration-300 border-2 border-slate-400" />
    </div>
  );
};

const PathHeaderNode = ({ data }: NodeProps) => {
  return (
    <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 p-3 rounded-2xl shadow-sm w-72 text-center relative">
      <div className="text-sm font-bold text-red-900 dark:text-red-400 mb-1">{data.title as string}</div>
      <div className="text-xs text-red-700 dark:text-red-500">{data.story as string}</div>
      <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-surface border-2 border-red-400" />
    </div>
  )
}

const nodeTypes = { custom: CustomNode, header: PathHeaderNode };

interface ConfigInteractiveGraphProps {
  attackPaths: any[];
}

export function ConfigInteractiveGraph({ attackPaths }: ConfigInteractiveGraphProps) {
  const { resolvedTheme } = useTheme();
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (!attackPaths || attackPaths.length === 0) return;

    const newNodes: Node[] = [];
    const newEdges: Edge[] = [];

    attackPaths.forEach((path, pathIdx) => {
      const xOffset = pathIdx * 400; // Space paths horizontally
      const headerId = `path-${pathIdx}-header`;
      
      newNodes.push({
        id: headerId,
        type: 'header',
        position: { x: xOffset, y: 0 },
        data: { title: path.title, story: path.attack_story }
      });

      let prevId = headerId;

      (path.steps || []).forEach((step: any, stepIdx: number) => {
        const stepId = `path-${pathIdx}-step-${stepIdx}`;
        newNodes.push({
          id: stepId,
          type: 'custom',
          position: { x: xOffset + 16, y: 150 + stepIdx * 150 },
          data: {
            label: step.title,
            stepIndex: stepIdx + 1,
            location: `${step.file_path}:${step.line_number}`
          }
        });

        newEdges.push({
          id: `e-${prevId}-${stepId}`,
          source: prevId,
          target: stepId,
          animated: true,
          type: 'smoothstep',
          style: { 
            stroke: resolvedTheme === 'dark' ? 'rgba(239, 68, 68, 0.4)' : 'rgba(239, 68, 68, 0.7)', 
            strokeWidth: 1.5 
          },
        });
        
        prevId = stepId;
      });
    });

    setNodes(newNodes);
    setEdges(newEdges);
  }, [attackPaths, setNodes, setEdges, resolvedTheme]);

  if (!attackPaths || attackPaths.length === 0) {
    return null;
  }

  return (
    <div className={`transition-all duration-300 ease-in-out ${isFullscreen ? "fixed inset-0 z-[100] bg-surface-container-lowest p-6 @md:p-8 overflow-y-auto m-0 rounded-none border-0" : "bg-surface transition-colors duration-300 rounded-2xl border border-border-subtle shadow-sm p-card-padding overflow-hidden relative"}`}>
      <div className="flex justify-between items-start mb-6">
        <div>
          <div className="flex items-center">
            <h2 className="text-section-header font-section-header">
              Config Attack Paths
            </h2>
            <InfoTooltip text="Interactive flowcharts showing how an attacker exploits a chain of misconfigurations." />
          </div>
          <p className="text-body-sm text-text-muted mt-1">
            Visual representation of discovered attack vectors.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="px-2.5 py-1 bg-surface-container-low border border-border-subtle rounded-md text-body-xs font-semibold hidden @sm:block">
            {attackPaths.length} paths
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
