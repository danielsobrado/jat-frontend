// src/langgraph/hooks/useLangGraphStreamRunner.ts
import { useState, useCallback, useRef, useEffect, SetStateAction } from 'react';
import {
  LangGraphExecutionEvent,
  ExecuteGraphRequestFE,
  GraphErrorEventFE,
} from '../types/langgraph';
import { LangGraphStreamService } from '../services/langGraphStreamService';

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

export interface UseLangGraphStreamRunnerResult {
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
  isStreaming: boolean;
}

export const useLangGraphStreamRunner = (
  baseUrl?: string
): UseLangGraphStreamRunnerResult => {
  const [streamService, setStreamService] = useState<LangGraphStreamService | null>(null);
  const [executionEvents, setExecutionEvents] = useState<LangGraphExecutionEvent[]>([]);
  const [currentExecutionId, setCurrentExecutionId] = useState<string | null>(null);
  const [status, setStatus] = useState<GraphExecutionStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [graphError, setGraphError] = useState<GraphErrorEventFE | null>(null);
  const [currentGraphState, setCurrentGraphState] = useState<ExecutionState>(initialExecutionState);
  const [isStreaming, setIsStreaming] = useState(false);

  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      disconnect();
    };
  }, []);

  const handleNewEvent = useCallback((event: LangGraphExecutionEvent) => {
    if (!mountedRef.current) return;

    console.log(`[useLangGraphStreamRunner] Received event: ${event.eventType}`, event);
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
        setIsStreaming(false);
        break;

      case 'graph_error':
        setGraphError(event as GraphErrorEventFE);
        setStatus('error');
        setIsStreaming(false);
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
    setIsStreaming(true);

    const newStreamService = new LangGraphStreamService({
      onOpen: () => {
        if (!mountedRef.current) return;
        console.log('[useLangGraphStreamRunner] Stream opened');
        setStatus('running');
      },
      onMessage: handleNewEvent,
      onError: (err: { message: SetStateAction<string | null>; }) => {
        if (!mountedRef.current) return;
        console.error('[useLangGraphStreamRunner] Stream Error:', err);
        setError(err.message);
        setStatus('error');
        setIsStreaming(false);
      },
      onClose: () => {
        if (!mountedRef.current) return;
        console.log('[useLangGraphStreamRunner] Stream closed');
        setIsStreaming(false);
        if (status === 'running' || status === 'connecting') {
          setStatus('completed');
        }
      },
      baseUrl,
    });

    try {
      const executionId = await newStreamService.connect(graphId, executionRequest);
      if (mountedRef.current) {
        setCurrentExecutionId(executionId);
        setStreamService(newStreamService);
      }
    } catch (err) {
      if (mountedRef.current) {
        console.error('[useLangGraphStreamRunner] Failed to connect:', err);
        setError(err instanceof Error ? err.message : 'Failed to connect');
        setStatus('error');
        setIsStreaming(false);
      }
    }
  }, [streamService, handleNewEvent, baseUrl, status]);

  const disconnect = useCallback(() => {
    if (streamService) {
      streamService.close();
      setStreamService(null);
      setIsStreaming(false);
      if (status === 'running' || status === 'connecting') {
        setStatus('completed');
      }
    }
  }, [streamService, status]);

  return {
    connectAndExecute,
    disconnect,
    executionEvents,
    currentExecutionId,
    status,
    error,
    graphError,
    currentGraphState,
    isStreaming,
  };
};