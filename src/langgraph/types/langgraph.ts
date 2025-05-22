// src/langgraph/types/langgraph.ts

/**
 * Represents the UI position of a node for visualization.
 * Mirrors backend: NodeUIPosition
 */
export interface UINodePosition {
  x: number;
  y: number;
}

/**
 * Defines a single node in the graph structure for frontend use.
 * Mirrors backend: NodeDefinition
 */
export interface FrontendNodeDef {
  id: string;
  type: string; // Maps to backend logic (e.g., 'llm_node', 'tool_node')
  config: Record<string, any>; // Configuration specific to this node type
  uiPosition?: UINodePosition; // Optional UI positioning
  // Frontend-specific display properties can be added here if needed
  // e.g., customData?: { label?: string; icon?: string; status?: 'running' | 'completed' | 'error' };
}

/**
 * Defines a directed edge between two nodes for frontend use.
 * Mirrors backend: EdgeDefinition
 */
export interface FrontendEdgeDef {
  id: string;
  source: string; // ID of the source node
  target: string; // ID of the target node
  label?: string; // Optional label for the edge
  animated?: boolean;
  // type?: string; // For custom React Flow edge rendering
}

/**
 * Defines the target node for a specific condition name.
 * Mirrors backend: ConditionalEdgeMapping
 */
export interface FrontendConditionalEdgeMapping {
  conditionName: string; // The name of the condition
  targetNodeId: string;  // The ID of the node to transition to
}

/**
 * Defines conditional outgoing edges for a specific source node.
 * Mirrors backend: ConditionalEdgesDefinition
 */
export interface FrontendConditionalEdgesDef {
  sourceNodeId: string;
  // routerFunctionName?: string; // Name of the router function in backend's ROUTER_IMPLEMENTATIONS
  mappings: FrontendConditionalEdgeMapping[];
}

/**
 * Full definition of a LangGraph workflow for frontend use.
 * Mirrors backend: GraphDefinition
 */
export interface FrontendGraphDef {
  id: string;
  name: string;
  description?: string;
  stateSchemaName: string; // Name of the Pydantic model for LangGraph state
  nodes: FrontendNodeDef[];
  edges: FrontendEdgeDef[];
  conditionalEdges: FrontendConditionalEdgesDef[];
  entryPointNodeId: string;
  terminalNodeIds?: string[];
  version?: number;
  createdAt?: string; // ISO date string
  updatedAt?: string; // ISO date string
}

/**
 * Minimal identifier for a graph definition, used in listings.
 * Mirrors backend: GraphDefinitionIdentifier
 */
export interface GraphDefinitionIdentifierFE {
  id: string;
  name: string;
  updatedAt?: string; // ISO date string
}

/**
 * Response for listing graph definitions.
 * Mirrors backend: GraphDefinitionListResponse
 */
export interface GraphDefinitionListResponseFE {
  graphs: GraphDefinitionIdentifierFE[];
}

/**
 * Request payload for creating a new graph definition.
 * Mirrors backend: CreateGraphRequest
 */
export interface CreateGraphRequestFE extends Omit<FrontendGraphDef, 'id' | 'createdAt' | 'updatedAt' | 'version'> {
  // id, createdAt, updatedAt, version are typically server-generated
}

/**
 * Request payload for updating an existing graph definition.
 * Mirrors backend: UpdateGraphRequest
 */
export interface UpdateGraphRequestFE extends CreateGraphRequestFE {
  // Inherits all fields from CreateGraphRequestFE.
  // The ID of the graph to update is usually passed as a path parameter.
}


// --- WebSocket Event Types (mirroring backend schemas) ---

export type WebSocketEventType =
  | 'graph_execution_start'
  | 'node_start'
  | 'node_end'
  | 'edge_taken' // You might need to infer this or have backend send it explicitly
  | 'graph_execution_end'
  | 'graph_error'
  | 'pong'; // For keep-alive if implemented

export interface WebSocketBaseEventFE {
  eventType: WebSocketEventType;
  timestamp: string; // ISO date string
  executionId: string;
  graphId: string;
}

export interface GraphExecutionStartEventFE extends WebSocketBaseEventFE {
  eventType: 'graph_execution_start';
  inputArgs: Record<string, any>;
}

export interface NodeLifecycleEventFE extends WebSocketBaseEventFE {
  nodeId: string;
  nodeType?: string;
}

export interface NodeStartEventFE extends NodeLifecycleEventFE {
  eventType: 'node_start';
  inputData: Record<string, any>;
}

export interface NodeEndEventFE extends NodeLifecycleEventFE {
  eventType: 'node_end';
  outputData: Record<string, any>;
  status: 'success' | 'failure';
  errorMessage?: string;
  durationMs?: number;
}

export interface EdgeTakenEventFE extends WebSocketBaseEventFE {
  eventType: 'edge_taken';
  sourceNodeId: string;
  targetNodeId: string;
  edgeLabel?: string;
  isConditional: boolean;
}

export interface GraphExecutionEndEventFE extends WebSocketBaseEventFE {
  eventType: 'graph_execution_end';
  finalState: Record<string, any>;
  status: 'completed' | 'failed' | 'interrupted';
  totalDurationMs?: number;
}

export interface GraphErrorEventFE extends WebSocketBaseEventFE {
  eventType: 'graph_error';
  message: string;
  details?: string;
  nodeId?: string;
}

export interface PongEventFE extends Omit<WebSocketBaseEventFE, 'executionId' | 'graphId'> {
    eventType: 'pong';
    serverTime: string;
}

// Union type for all possible incoming WebSocket messages
export type LangGraphExecutionEvent =
  | GraphExecutionStartEventFE
  | NodeStartEventFE
  | NodeEndEventFE
  | EdgeTakenEventFE
  | GraphExecutionEndEventFE
  | GraphErrorEventFE
  | PongEventFE;

// --- HTTP API Request/Response Types for LangGraph Management ---

/**
 * Request to initiate execution of a graph via HTTP (if implemented).
 * This is also the structure of the initial message sent over WebSocket.
 */
export interface ExecuteGraphRequestFE {
  inputArgs?: Record<string, any>;
  configOverrides?: Record<string, any>; // Keep if you plan to use it
  simulation_delay_ms?: number; // Milliseconds to delay each node step
}

/**
 * Response after initiating a graph execution via HTTP.
 * Mirrors backend: ExecuteGraphResponse
 */
export interface ExecuteGraphResponseFE {
  executionId: string;
  message: string;
  websocketUrl?: string;
}

/**
 * Generic message response.
 * Mirrors backend: MessageResponse
 */
export interface MessageResponseFE {
    message: string;
}

// --- React Flow Specific Types (can be extended as needed) ---
// These types are what React Flow expects for its `nodes` and `edges` props.
// We will adapt FrontendNodeDef and FrontendEdgeDef to these.

export interface ReactFlowNodeData {
  label: string;
  // Custom data for rendering or logic
  type?: string; // Original node type from definition
  status?: 'idle' | 'running' | 'success' | 'error' | 'active'; // For visual styling
  config?: Record<string, any>; // Original config for inspection
  inputs?: Record<string, any>; // Last known inputs to this node
  outputs?: Record<string, any>; // Last known outputs from this node
}

export interface ReactFlowEdgeData {
  label?: string;
  // Custom data for rendering or logic
  status?: 'idle' | 'traversed'; // For visual styling
}

// Example of how you might type the nodes and edges for React Flow itself
// import { Node, Edge } from 'reactflow';
// export type LangGraphReactFlowNode = Node<ReactFlowNodeData>;
// export type LangGraphReactFlowEdge = Edge<ReactFlowEdgeData>;