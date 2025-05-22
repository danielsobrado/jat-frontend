// src/langgraph/hooks/useReactFlowGraphAdapter.ts
import { useState, useEffect, useCallback } from 'react';
import { Node as ReactFlowNode, Edge as ReactFlowEdge, Position, MarkerType } from 'reactflow';
import dagre from 'dagre'; 
import {
  FrontendGraphDef,
  FrontendNodeDef,
  FrontendEdgeDef,
  FrontendConditionalEdgesDef,
  UINodePosition,
  ReactFlowNodeData, 
  ReactFlowEdgeData, 
} from '../types/langgraph';

const dagreGraph = new dagre.graphlib.Graph({ compound: true }); 
dagreGraph.setDefaultEdgeLabel(() => ({})); 
dagreGraph.setGraph({
  rankdir: 'TB', 
  nodesep: 70,   
  ranksep: 90,   
});

const DEFAULT_NODE_WIDTH = 180;
const DEFAULT_NODE_HEIGHT = 60;

interface UseReactFlowGraphAdapterResult {
  nodes: ReactFlowNode<ReactFlowNodeData>[];
  edges: ReactFlowEdge<ReactFlowEdgeData>[];
  layoutGraph: (graphDefinition: FrontendGraphDef, currentExecutionState?: any) => void; 
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
  ) => {
    if (!graphDefinition) {
      setNodes([]);
      setEdges([]);
      return;
    }

    setIsLoadingLayout(true);
    setErrorLayout(null);
    console.log("[useReactFlowGraphAdapter] Starting layoutGraph with definition:", JSON.parse(JSON.stringify(graphDefinition)));


    try {
      const dagreNodes: ReactFlowNode<ReactFlowNodeData>[] = [];
      const dagreEdges: ReactFlowEdge<ReactFlowEdgeData>[] = [];

      // 1. Prepare nodes for Dagre and React Flow
      // Ensure graphDefinition.nodes is an array before calling forEach
      (graphDefinition.nodes || []).forEach((nodeDef: FrontendNodeDef) => {
        dagreGraph.setNode(nodeDef.id, {
          width: DEFAULT_NODE_WIDTH,
          height: DEFAULT_NODE_HEIGHT,
        });

        const nodeData: ReactFlowNodeData = {
          label: nodeDef.id, 
          type: nodeDef.type, 
          config: nodeDef.config,
          status: 'idle', 
        };

        dagreNodes.push({
          id: nodeDef.id,
          type: 'customGraphNode', 
          data: nodeData,
          position: nodeDef.uiPosition || { x: 0, y: 0 }, 
          sourcePosition: Position.Bottom, 
          targetPosition: Position.Top,
        });
      });

      // 2. Prepare standard edges for Dagre and React Flow
      // Ensure graphDefinition.edges is an array before calling forEach
      (graphDefinition.edges || []).forEach((edgeDef: FrontendEdgeDef) => {
        dagreGraph.setEdge(edgeDef.source, edgeDef.target);
        dagreEdges.push({
          id: edgeDef.id || `e_${edgeDef.source}__${edgeDef.target}`,
          source: edgeDef.source,
          target: edgeDef.target,
          label: edgeDef.label,
          type: 'customGraphEdge', 
          animated: edgeDef.animated || false,
          markerEnd: { type: MarkerType.ArrowClosed },
          data: { label: edgeDef.label, status: 'idle' } as ReactFlowEdgeData,
        });
      });

      // 3. Prepare conditional edges for Dagre and React Flow
      // Ensure graphDefinition.conditionalEdges is an array before calling forEach
      (graphDefinition.conditionalEdges || []).forEach((condEdgesDef: FrontendConditionalEdgesDef) => {
        // Ensure condEdgesDef.mappings is an array before calling forEach
        (condEdgesDef.mappings || []).forEach((mapping) => {
          dagreGraph.setEdge(condEdgesDef.sourceNodeId, mapping.targetNodeId);
          dagreEdges.push({
            id: `ce_${condEdgesDef.sourceNodeId}__${mapping.targetNodeId}__${mapping.conditionName}`,
            source: condEdgesDef.sourceNodeId,
            target: mapping.targetNodeId,
            label: mapping.conditionName, 
            type: 'customGraphEdge', 
            animated: false,
            markerEnd: { type: MarkerType.ArrowClosed, color: '#FF0072' }, 
            style: { stroke: '#FF0072' }, 
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
              x: dagreNode.x - dagreNode.width / 2, 
              y: dagreNode.y - dagreNode.height / 2,
            },
          };
        }
        console.warn(`[useReactFlowGraphAdapter] Dagre node not found for ID: ${node.id} during position update.`);
        return node; 
      });

      setNodes(layoutedNodes);
      setEdges(dagreEdges);
      console.log("[useReactFlowGraphAdapter] Layout finished successfully.");

    } catch (err) {
      console.error('[useReactFlowGraphAdapter] Error during graph layout:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to layout graph.';
      setErrorLayout(errorMessage);
      setNodes([]); 
      setEdges([]);
    } finally {
      setIsLoadingLayout(false);
    }
  }, []); 

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