// src/langgraph/services/langGraphApiService.ts
// Content from the original langGraphApiService.fixed.ts

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
  stateSchemaName: string; 
  nodes: FrontendNodeDef[];
  edges: FrontendEdgeDef[];
  conditionalEdges: FrontendConditionalEdgesDef[];
  entryPointNodeId: string;
  terminalNodeIds?: string[];
  version?: number;
  createdAt?: string; 
  updatedAt?: string; 
}

/**
 * Minimal identifier for a graph definition, used in listings.
 * Mirrors backend: GraphDefinitionIdentifier
 */
export interface GraphDefinitionIdentifierFE {
  id: string;
  name: string;
  updatedAt?: string; 
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
export interface CreateGraphRequestFE extends Omit<FrontendGraphDef, 'id' | 'createdAt' | 'updatedAt' | 'version'> {}

/**
 * Request payload for updating an existing graph definition.
 * Mirrors backend: UpdateGraphRequest
 */
export interface UpdateGraphRequestFE extends CreateGraphRequestFE {}

// --- WebSocket Event Types (mirroring backend schemas) ---
export type WebSocketEventType =
  | 'graph_execution_start'
  | 'node_start'
  | 'node_end'
  | 'edge_taken'
  | 'graph_execution_end'
  | 'graph_error'
  | 'pong';

export interface WebSocketBaseEventFE {
  eventType: WebSocketEventType;
  timestamp: string; 
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

export type LangGraphExecutionEvent =
  | GraphExecutionStartEventFE
  | NodeStartEventFE
  | NodeEndEventFE
  | EdgeTakenEventFE
  | GraphExecutionEndEventFE
  | GraphErrorEventFE
  | PongEventFE;

// --- HTTP API Request/Response Types for LangGraph Management ---
export interface ExecuteGraphRequestFE {
  inputArgs?: Record<string, any>;
}

export interface ExecuteGraphResponseFE {
  executionId: string;
  message: string;
}

export interface MessageResponseFE {
  message: string;
  details?: any;
}

import { ApiClient } from '../../api/types'; // ApiClient is used for type hint, but not for its methods in direct*

// --- LangGraphApiService Class ---
export class LangGraphApiService {
  private apiClient: ApiClient; // Retained for type consistency or potential future use
  private prefix: string;

  constructor(apiClient: ApiClient, prefix: string = '/v1/lg-vis') {
    this.apiClient = apiClient;
    this.prefix = prefix;
    console.log(`[LangGraphApiService] Initialized with prefix: ${this.prefix}`);
  }

  private async directGet<T = any>(path: string, params?: Record<string, any>): Promise<T> {
    // Path is already the full path like "/v1/lg-vis/graphs"
    // Ensure it starts with a single '/'
    const fullPath = path.startsWith('/') ? path : `/${path}`;
    
    let urlString = fullPath;
    if (params && Object.keys(params).length > 0) {
      const queryParams = new URLSearchParams();
      Object.keys(params).forEach(key => {
        if (params[key] !== undefined && params[key] !== null) {
          queryParams.append(key, String(params[key]));
        }
      });
      const queryString = queryParams.toString();
      if (queryString) {
        urlString = `${fullPath}?${queryString}`;
      }
    }
    
    console.log(`[LangGraphApiService] Making direct GET request to: ${urlString}`);
    const response = await fetch(urlString, { method: 'GET' }); // Direct fetch
    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`HTTP error! status: ${response.status}, path: ${urlString}, details: ${errorData}`);
    }
    return response.json() as Promise<T>;
  }

  async listGraphDefinitions(includeStatic: boolean = false): Promise<GraphDefinitionListResponseFE> {
    console.log(`[LangGraphApiService] Listing graph definitions. Prefix: ${this.prefix}. Path for directGet: ${this.prefix}/graphs`);
    return this.directGet<GraphDefinitionListResponseFE>(`${this.prefix}/graphs`, { include_static: includeStatic });
  }

  async getGraphDefinition(graphId: string): Promise<FrontendGraphDef> {
    return this.directGet<FrontendGraphDef>(`${this.prefix}/graphs/${graphId}`);
  }

  private async directPost<T = any>(path: string, body: any): Promise<T> {
    const fullPath = path.startsWith('/') ? path : `/${path}`;
    console.log(`[LangGraphApiService] Making direct POST request to: ${fullPath}`);
    const response = await fetch(fullPath, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`HTTP error! status: ${response.status}, path: ${fullPath}, details: ${errorData}`);
    }
    return response.json() as Promise<T>;
  }

  async createGraphDefinition(data: CreateGraphRequestFE): Promise<FrontendGraphDef> {
    const transformedData = {
      name: data.name,
      description: data.description,
      state_schema_name: data.stateSchemaName,
      entry_point_node_id: data.entryPointNodeId,
      nodes: data.nodes.map(node => ({
        id: node.id, type: node.type, config: node.config,
        ui_position: node.uiPosition ? { x: node.uiPosition.x, y: node.uiPosition.y } : undefined
      })),
      edges: data.edges.map(edge => ({
        id: edge.id, source: edge.source, target: edge.target, label: edge.label, animated: edge.animated
      })),
      conditional_edges: data.conditionalEdges.map(condEdge => ({
        source_node_id: condEdge.sourceNodeId,
        mappings: condEdge.mappings.map(mapping => ({
          condition_name: mapping.conditionName, target_node_id: mapping.targetNodeId
        }))
      })),
      terminal_node_ids: data.terminalNodeIds
    };
    return this.directPost<FrontendGraphDef>(`${this.prefix}/graphs`, transformedData);
  }

  private async directPut<T = any>(path: string, body: any): Promise<T> {
    const fullPath = path.startsWith('/') ? path : `/${path}`;
    console.log(`[LangGraphApiService] Making direct PUT request to: ${fullPath}`);
    const response = await fetch(fullPath, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`HTTP error! status: ${response.status}, path: ${fullPath}, details: ${errorData}`);
    }
    return response.json() as Promise<T>;
  }

  async updateGraphDefinition(graphId: string, data: UpdateGraphRequestFE): Promise<FrontendGraphDef> {
    const transformedData = {
      name: data.name,
      description: data.description,
      state_schema_name: data.stateSchemaName,
      entry_point_node_id: data.entryPointNodeId,
      nodes: data.nodes.map(node => ({
        id: node.id, type: node.type, config: node.config,
        ui_position: node.uiPosition ? { x: node.uiPosition.x, y: node.uiPosition.y } : undefined
      })),
      edges: data.edges.map(edge => ({
        id: edge.id, source: edge.source, target: edge.target, label: edge.label, animated: edge.animated
      })),
      conditional_edges: data.conditionalEdges.map(condEdge => ({
        source_node_id: condEdge.sourceNodeId,
        mappings: condEdge.mappings.map(mapping => ({
          condition_name: mapping.conditionName, target_node_id: mapping.targetNodeId
        }))
      })),
      terminal_node_ids: data.terminalNodeIds
    };
    return this.directPut<FrontendGraphDef>(`${this.prefix}/graphs/${graphId}`, transformedData);
  }

  private async directDelete<T = any>(path: string): Promise<T> {
    const fullPath = path.startsWith('/') ? path : `/${path}`;
    console.log(`[LangGraphApiService] Making direct DELETE request to: ${fullPath}`);
    const response = await fetch(fullPath, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' }
    });
    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`HTTP error! status: ${response.status}, path: ${fullPath}, details: ${errorData}`);
    }
    return response.json() as Promise<T>;
  }

  async deleteGraphDefinition(graphId: string): Promise<MessageResponseFE> {
    return this.directDelete<MessageResponseFE>(`${this.prefix}/graphs/${graphId}`);
  }

  async executeGraph(graphId: string, request: ExecuteGraphRequestFE): Promise<ExecuteGraphResponseFE> {
    return this.directPost<ExecuteGraphResponseFE>(`${this.prefix}/graphs/${graphId}/execute`, request);
  }
}