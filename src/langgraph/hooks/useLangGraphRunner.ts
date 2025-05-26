// src/langgraph/hooks/useLangGraphRunner.ts
import { useState, useCallback, useRef, useEffect } from 'react';
import {
  LangGraphExecutionEvent,
  ExecuteGraphRequestFE,
  GraphErrorEventFE,
} from '../types/langgraph';
import { 
  StreamServiceFactory, 
  ILangGraphStreamService,
  StreamTransportType 
} from '../services/streamServiceFactory';

export type GraphExecutionStatus =
  | 'idle'
  | 'connecting'
  | 'running'
  | 'completed'
  | 'error';

export interface ExecutionState {
  activeNodeIds: Set<string>;
  completedNodeIds: Set<string>;
  errorNodeIds: Set<string>;
  traversedEdgeIds: Set<string>;
  lastInputByNode: Record<string, any>;
  lastOutputByNode: Record<string, any>;
}

const initialExecutionState: ExecutionState = {
  activeNodeIds: new Set(),
  completedNodeIds: new Set(),
  errorNodeIds: new Set(),
  traversedEdgeIds: new Set(),
  lastInputByNode: {},
  lastOutputByNode: {},
};

export interface UseLangGraphRunnerOptions {
  baseUrl?: string;
  transport?: StreamTransportType;
  autoSelectTransport?: boolean; // Auto-select based on capabilities
}

export interface UseLangGraphRunnerResult {
  connectAndExecute: (
    graphId: string,
    executionRequest: ExecuteGraphRequestFE
  ) => Promise<void>;
  disconnect: () => void;
  executionEvents: LangGraphExecutionEvent[];
  currentExecutionId: string | null;
  status: GraphExecutionStatus;
  error: string | null;
  graphError: GraphErrorEventFE | null;
  currentGraphState: ExecutionState;
  currentTransport: StreamTransportType;
  setTransport: (transport: StreamTransportType) => void;
}

export const useLangGraphRunner = (
  options: UseLangGraphRunnerOptions = {}
): UseLangGraphRunnerResult => {
  const factory = StreamServiceFactory.getInstance();
  const [streamService, setStreamService] = useState<ILangGraphStreamService | null>(null);
  const [executionEvents, setExecutionEvents] = useState<LangGraphExecutionEvent[]>([]);
  const [currentExecutionId, setCurrentExecutionId] = useState<string | null>(null);
  const [status, setStatus] = useState<GraphExecutionStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [graphError, setGraphError] = useState<GraphErrorEventFE | null>(null);
  const [currentGraphState, setCurrentGraphState] = useState<ExecutionState>(initialExecutionState);
  
  // Transport selection
  const [currentTransport, setCurrentTransport] = useState<StreamTransportType>(() => {
    return options.transport || StreamServiceFactory.getTransportFromConfig();
  });

  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    // Set default transport in factory
    factory.setDefaultTransport(currentTransport);
    
    return () => {
      mountedRef.current = false;
      disconnect();
    };
  }, []);

  const handleNewEvent = useCallback((event: LangGraphExecutionEvent) => {
    if (!mountedRef.current) return;

    console.log(`[useLangGraphRunner] Received event: ${event.eventType}`, event);
    setExecutionEvents((prevEvents) => [...prevEvents, event]);

    switch (event.eventType) {
      case 'graph_execution_start':
        setStatus('running');
        setCurrentExecutionId(event.executionId);
        setCurrentGraphState(initialExecutionState);
        break;

      case 'node_start':
        setCurrentGraphState((prevState) => {
          const newState = {
            ...prevState,
            activeNodeIds: new Set(prevState.activeNodeIds),
            completedNodeIds: new Set(prevState.completedNodeIds),
            errorNodeIds: new Set(prevState.errorNodeIds),
            lastInputByNode: { ...prevState.lastInputByNode },
          };
          
          newState.activeNodeIds.add(event.nodeId);
          newState.completedNodeIds.delete(event.nodeId);
          newState.errorNodeIds.delete(event.nodeId);
          newState.lastInputByNode[event.nodeId] = event.inputData;
          
          return newState;
        });
        break;

      case 'node_end':
        setCurrentGraphState((prevState) => {
          const newState = {
            ...prevState,
            activeNodeIds: new Set(prevState.activeNodeIds),
            completedNodeIds: new Set(prevState.completedNodeIds),
            errorNodeIds: new Set(prevState.errorNodeIds),
            lastOutputByNode: { ...prevState.lastOutputByNode },
          };
          
          newState.activeNodeIds.delete(event.nodeId);
          
          if (event.status === 'success') {
            newState.completedNodeIds.add(event.nodeId);
          } else {
            newState.errorNodeIds.add(event.nodeId);
          }
          
          newState.lastOutputByNode[event.nodeId] = event.outputData;
          
          return newState;
        });
        break;

      case 'edge_taken':
        setCurrentGraphState((prevState) => {
          const newState = {
            ...prevState,
            traversedEdgeIds: new Set(prevState.traversedEdgeIds),
          };
          
          const edgeId = `${event.sourceNodeId}__${event.targetNodeId}${
            event.edgeLabel ? `__${event.edgeLabel}` : ''
          }`;
          newState.traversedEdgeIds.add(edgeId);
          
          return newState;
        });
        break;

      case 'graph_execution_end':
        setStatus('completed');
        break;

      case 'graph_error':
        setGraphError(event as GraphErrorEventFE);
        setStatus('error');
        break;
    }
  }, []);

  const connectAndExecute = useCallback(async (
    graphId: string,
    executionRequest: ExecuteGraphRequestFE
  ) => {
    if (streamService) {
      streamService.close();
    }

    if (!mountedRef.current) return;

    setExecutionEvents([]);
    setCurrentGraphState(initialExecutionState);
    setStatus('connecting');
    setError(null);
    setGraphError(null);

    // Create service using factory
    const newService = factory.createService({
      transport: currentTransport,
      baseUrl: options.baseUrl,
      handlers: {
        onOpen: () => {
          if (!mountedRef.current) return;
          console.log(`[useLangGraphRunner] ${currentTransport} connection opened`);
          setStatus('running');
        },
        onMessage: handleNewEvent,
        onError: (err) => {
          if (!mountedRef.current) return;
          console.error(`[useLangGraphRunner] ${currentTransport} Error:`, err);
          setError(err.message);
          setStatus('error');
        },
        onClose: () => {
          if (!mountedRef.current) return;
          console.log(`[useLangGraphRunner] ${currentTransport} connection closed`);
          if (status === 'running' || status === 'connecting') {
            setStatus('completed');
          }
        },
      },
    });

    try {
      const executionId = await newService.connect(graphId, executionRequest);
      if (mountedRef.current) {
        setCurrentExecutionId(executionId);
        setStreamService(newService);
      }
    } catch (err) {
      if (mountedRef.current) {
        console.error('[useLangGraphRunner] Failed to connect:', err);
        setError(err instanceof Error ? err.message : 'Failed to connect');
        setStatus('error');
      }
    }
  }, [streamService, handleNewEvent, currentTransport, options.baseUrl, factory, status]);

  const disconnect = useCallback(() => {
    if (streamService) {
      streamService.close();
      setStreamService(null);
      if (status === 'running' || status === 'connecting') {
        setStatus('completed');
      }
    }
  }, [streamService, status]);

  const setTransport = useCallback((transport: StreamTransportType) => {
    console.log(`[useLangGraphRunner] Changing transport from ${currentTransport} to ${transport}`);
    
    // Disconnect current service if any
    disconnect();
    
    // Update transport
    setCurrentTransport(transport);
    factory.setDefaultTransport(transport);
    
    // Save preference
    localStorage.setItem('langgraph_transport', transport);
  }, [currentTransport, disconnect, factory]);

  return {
    connectAndExecute,
    disconnect,
    executionEvents,
    currentExecutionId,
    status,
    error,
    graphError,
    currentGraphState,
    currentTransport,
    setTransport,
  };
};