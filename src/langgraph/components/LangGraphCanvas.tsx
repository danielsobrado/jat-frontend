// src/langgraph/components/LangGraphCanvas.tsx
import React, { useMemo } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  MiniMap,
  ReactFlowProvider, // Good practice to wrap if using hooks like useReactFlow
  BackgroundVariant,
} from 'reactflow';
import 'reactflow/dist/style.css'; // Ensure styles are imported

import { ReactFlowNodeData, ReactFlowEdgeData } from '../types/langgraph';
// import CustomGraphNode from './CustomGraphNode'; // Placeholder for custom node
// import CustomGraphEdge from './CustomGraphEdge'; // Placeholder for custom edge

// --- Optional: Define Custom Node and Edge Types for React Flow ---
// const nodeTypes = {
//   customGraphNode: CustomGraphNode, // Maps 'customGraphNode' type from adapter to this component
//   // You can add more types: 'llmNodeType': LlmNodeComponent, 'toolNodeType': ToolNodeComponent etc.
// };

// const edgeTypes = {
//   customGraphEdge: CustomGraphEdge, // Maps 'customGraphEdge' type from adapter
// };
// --- End Optional Custom Types ---

interface LangGraphCanvasProps {
  nodes: Node<ReactFlowNodeData, string | undefined>[]; // Nodes from useReactFlowGraphAdapter
  edges: Edge<ReactFlowEdgeData>[];                   // Edges from useReactFlowGraphAdapter
  onNodeClick?: (event: React.MouseEvent, node: Node<ReactFlowNodeData>) => void;
  onEdgeClick?: (event: React.MouseEvent, edge: Edge<ReactFlowEdgeData>) => void;
  // Add other React Flow props you might need, like onConnect, onNodesChange, onEdgesChange if editable
  isLoading?: boolean; // To show a loading overlay or message
}

const LangGraphCanvas: React.FC<LangGraphCanvasProps> = ({
  nodes,
  edges,
  onNodeClick,
  onEdgeClick,
  isLoading = false,
}) => {
  // Memoize node and edge types if they were defined
  // const memoizedNodeTypes = useMemo(() => nodeTypes, []);
  // const memoizedEdgeTypes = useMemo(() => edgeTypes, []);

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <p>Loading graph data...</p> {/* Or use an Ant Design Spin component */}
      </div>
    );
  }

  return (
    // It's good practice to wrap ReactFlow with ReactFlowProvider if you plan to use
    // React Flow hooks like useNodesState, useEdgesState, useReactFlow within this component
    // or its children, though for a display-only canvas it might not be strictly necessary
    // if nodes/edges are fully managed by the parent hook.
    <ReactFlowProvider>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        // nodeTypes={memoizedNodeTypes} // Uncomment if using custom nodes
        // edgeTypes={memoizedEdgeTypes} // Uncomment if using custom edges
        onNodeClick={onNodeClick}
        onEdgeClick={onEdgeClick}
        fitView // Automatically fits the graph into the view on initial render or when nodes/edges change
        fitViewOptions={{ padding: 0.1, duration: 300 }}
        nodesDraggable={true} // Allow dragging nodes
        nodesConnectable={false} // Disable manual connection creation for display
        elementsSelectable={true} // Allow selecting nodes/edges
        attributionPosition="bottom-left" // Default position for React Flow attribution
        proOptions={{ hideAttribution: false }} // Shows "React Flow" attribution; set to true to hide
        // style={{ background: '#f8f9fa' }} // Optional: background color for the canvas
      >
        <Controls
          showInteractive={false} // Simplifies controls if graph is not interactive for connections
        />
        <MiniMap
          nodeStrokeColor={(n: Node): string => { // Type annotation for n
            if (n.type === 'input') return '#0041d0';
            if (n.type === 'output') return '#ff0072';
            if (n.data?.status === 'running') return '#fbbf24'; // amber-400
            if (n.data?.status === 'success') return '#34d399'; // emerald-400
            if (n.data?.status === 'error') return '#f87171'; // red-400
            return '#9ca3af'; // gray-400
          }}
          nodeColor={(n: Node): string => { // Type annotation for n
            if (n.data?.status === 'running') return '#fef3c7'; // amber-100
            if (n.data?.status === 'success') return '#d1fae5'; // emerald-100
            if (n.data?.status === 'error') return '#fee2e2'; // red-100
            return '#ffffff';
          }}
          nodeBorderRadius={2}
          pannable={true}
          zoomable={true}
        />
        <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
      </ReactFlow>
    </ReactFlowProvider>
  );
};

export default LangGraphCanvas;