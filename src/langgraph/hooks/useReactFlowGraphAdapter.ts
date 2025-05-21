// src/langgraph/hooks/useReactFlowGraphAdapter.ts
import { useState, useEffect, useCallback } from 'react';
import { Node as ReactFlowNode, Edge as ReactFlowEdge, Position, MarkerType } from 'reactflow';
import dagre from 'dagre'; // Graph layout library
import {
  FrontendGraphDef,
  FrontendNodeDef,
  FrontendEdgeDef,
  FrontendConditionalEdgesDef,
  UINodePosition,
  ReactFlowNodeData, // From your langgraph.ts types
  ReactFlowEdgeData, // From your langgraph.ts types
} from '../types/langgraph';

// --- Dagre Layout Configuration ---
const dagreGraph = new dagre.graphlib.Graph({ compound: true }); // Enable compound for subgraphs if needed
dagreGraph.setDefaultEdgeLabel(() => ({})); // Default empty label for edges in dagre
dagreGraph.setGraph({
  rankdir: 'TB', // Top to Bottom layout
  nodesep: 70,   // Horizontal separation between nodes
  ranksep: 90,   // Vertical separation between ranks (layers)
  // align: 'UL', // Alignment for nodes in the rank (UL, UR, DL, DR)
});

const DEFAULT_NODE_WIDTH = 180;
const DEFAULT_NODE_HEIGHT = 60;

interface UseReactFlowGraphAdapterResult {
  nodes: ReactFlowNode<ReactFlowNodeData>[];
  edges: ReactFlowEdge<ReactFlowEdgeData>[];
  layoutGraph: (graphDefinition: FrontendGraphDef, currentExecutionState?: any) => void; // Pass ExecutionState if needed for styling
  isLoadingLayout: boolean;
  errorLayout: string | null;
}

export const useReactFlowGraphAdapter = (): UseReactFlowGraphAdapterResult => {
  const [nodes, setNodes] = useState<ReactFlowNode<ReactFlowNodeData>[]>([]);
  const [edges, setEdges] = useState<ReactFlowEdge<ReactFlowEdgeData>[]>([]);
  const [isLoadingLayout, setIsLoadingLayout] = useState<boolean>(false);
  const [errorLayout, setErrorLayout] = useState<string | null>(null);

  const layoutGraph = useCallback((
    graphDefinition: FrontendGraphDef,
    // Optional: Pass current execution state to style nodes/edges during layout
    // currentExecutionState?: ExecutionState // Assuming ExecutionState is defined elsewhere
  ) => {
    if (!graphDefinition) {
      setNodes([]);
      setEdges([]);
      return;
    }

    setIsLoadingLayout(true);
    setErrorLayout(null);

    try {
      const dagreNodes: ReactFlowNode<ReactFlowNodeData>[] = [];
      const dagreEdges: ReactFlowEdge<ReactFlowEdgeData>[] = [];

      // 1. Prepare nodes for Dagre and React Flow
      graphDefinition.nodes.forEach((nodeDef: FrontendNodeDef) => {
        dagreGraph.setNode(nodeDef.id, {
          width: DEFAULT_NODE_WIDTH,
          height: DEFAULT_NODE_HEIGHT,
          // label: nodeDef.id, // Dagre uses label for its internal purposes if needed
        });

        const nodeData: ReactFlowNodeData = {
          label: nodeDef.id, // Display label for React Flow
          type: nodeDef.type, // Original type for custom rendering or logic
          config: nodeDef.config,
          status: 'idle', // Default status
        };

        dagreNodes.push({
          id: nodeDef.id,
          type: 'customGraphNode', // Or determine based on nodeDef.type for different custom nodes
          data: nodeData,
          position: nodeDef.uiPosition || { x: 0, y: 0 }, // Initial position, Dagre will override
          sourcePosition: Position.Bottom, // Default connection points
          targetPosition: Position.Top,
          // style: { width: DEFAULT_NODE_WIDTH, height: DEFAULT_NODE_HEIGHT }, // Can be set here or in custom node
        });
      });

      // 2. Prepare standard edges for Dagre and React Flow
      graphDefinition.edges.forEach((edgeDef: FrontendEdgeDef) => {
        dagreGraph.setEdge(edgeDef.source, edgeDef.target);
        dagreEdges.push({
          id: edgeDef.id || `e_${edgeDef.source}__${edgeDef.target}`,
          source: edgeDef.source,
          target: edgeDef.target,
          label: edgeDef.label,
          type: 'customGraphEdge', // Or 'default', 'smoothstep', etc.
          animated: edgeDef.animated || false,
          markerEnd: { type: MarkerType.ArrowClosed },
          data: { label: edgeDef.label, status: 'idle' } as ReactFlowEdgeData,
        });
      });

      // 3. Prepare conditional edges for Dagre and React Flow
      graphDefinition.conditionalEdges.forEach((condEdgesDef: FrontendConditionalEdgesDef) => {
        condEdgesDef.mappings.forEach((mapping) => {
          dagreGraph.setEdge(condEdgesDef.sourceNodeId, mapping.targetNodeId);
          dagreEdges.push({
            id: `ce_${condEdgesDef.sourceNodeId}__${mapping.targetNodeId}__${mapping.conditionName}`,
            source: condEdgesDef.sourceNodeId,
            target: mapping.targetNodeId,
            label: mapping.conditionName, // Use condition name as label
            type: 'customGraphEdge', // Style differently for conditional edges
            animated: false,
            markerEnd: { type: MarkerType.ArrowClosed, color: '#FF0072' }, // Example: different color
            style: { stroke: '#FF0072' }, // Example: different color
            data: { label: mapping.conditionName, status: 'idle' } as ReactFlowEdgeData,
          });
        });
      });

      // 4. Run Dagre layout
      dagre.layout(dagreGraph);

      // 5. Update React Flow node positions with Dagre's calculated layout
      const layoutedNodes = dagreNodes.map((node) => {
        const dagreNode = dagreGraph.node(node.id);
        if (dagreNode) {
          return {
            ...node,
            position: {
              x: dagreNode.x - dagreNode.width / 2, // Dagre positions are center-based
              y: dagreNode.y - dagreNode.height / 2,
            },
          };
        }
        return node; // Should not happen if node was added to dagreGraph
      });

      setNodes(layoutedNodes);
      setEdges(dagreEdges);

    } catch (err) {
      console.error('[useReactFlowGraphAdapter] Error during graph layout:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to layout graph.';
      setErrorLayout(errorMessage);
      setNodes([]); // Clear on error
      setEdges([]);
    } finally {
      setIsLoadingLayout(false);
    }
  }, []); // No dependencies, as it operates on passed graphDefinition

  // Effect to clear layout if the component unmounts (optional, for cleanup)
  useEffect(() => {
    return () => {
      setNodes([]);
      setEdges([]);
    };
  }, []);

  return {
    nodes,
    edges,
    layoutGraph,
    isLoadingLayout,
    errorLayout,
  };
};