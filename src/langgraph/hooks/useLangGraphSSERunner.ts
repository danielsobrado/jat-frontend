// src/langgraph/hooks/useLangGraphSSERunner.ts
import { useState, useCallback, useRef } from 'react';
import {
  LangGraphExecutionEvent,
  ExecuteGraphRequestFE,
  GraphErrorEventFE,
} from '../types/langgraph';
import { LangGraphSSEService } from '../services/langGraphSSEService';

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

export interface UseLangGraphSSERunnerResult {
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
}

export const useLangGraphSSERunner = (
  baseUrl?: string
): UseLangGraphSSERunnerResult => {
  const [sseService, setSseService] = useState<LangGraphSSEService | null>(null);
  const [executionEvents, setExecutionEvents] = useState<LangGraphExecutionEvent[]>([]);
  const [currentExecutionId, setCurrentExecutionId] = useState<string | null>(null);
  const [status, setStatus] = useState<GraphExecutionStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [graphError, setGraphError] = useState<GraphErrorEventFE | null>(null);
  const [currentGraphState, setCurrentGraphState] = useState<ExecutionState>(initialExecutionState);

  const mountedRef = useRef(true);

  const handleNewEvent = useCallback((event: LangGraphExecutionEvent) => {
    if (!mountedRef.current) return;

    console.log(`[useLangGraphSSERunner] Received event: ${event.eventType}`, event);
    setExecutionEvents((prevEvents) => [...prevEvents, event]);

    switch (event.eventType) {
      case 'graph_execution_start':
        setStatus('running');
        setCurrentExecutionId(event.executionId);
        setCurrentGraphState(initialExecutionState);
        break;

      case 'node_start':
        setCurrentGraphState((prevState) => {
          const newState = { ...prevState };
          newState.activeNodeIds = new Set(prevState.activeNodeIds);
          newState.activeNodeIds.add(event.nodeId);
          newState.completedNodeIds = new Set(prevState.completedNodeIds);
          newState.completedNodeIds.delete(event.nodeId);
          newState.errorNodeIds = new Set(prevState.errorNodeIds);
          newState.errorNodeIds.delete(event.nodeId);
          newState.lastInputByNode = { ...prevState.lastInputByNode };
          newState.lastInputByNode[event.nodeId] = event.inputData;
          return newState;
        });
        break;

      case 'node_end':
        setCurrentGraphState((prevState) => {
          const newState = { ...prevState };
          newState.activeNodeIds = new Set(prevState.activeNodeIds);
          newState.activeNodeIds.delete(event.nodeId);
          
          if (event.status === 'success') {
            newState.completedNodeIds = new Set(prevState.completedNodeIds);
            newState.completedNodeIds.add(event.nodeId);
          } else {
            newState.errorNodeIds = new Set(prevState.errorNodeIds);
            newState.errorNodeIds.add(event.nodeId);
          }
          
          newState.lastOutputByNode = { ...prevState.lastOutputByNode };
          newState.lastOutputByNode[event.nodeId] = event.outputData;
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
    if (sseService) {
      sseService.close();
    }

    setExecutionEvents([]);
    setCurrentGraphState(initialExecutionState);
    setStatus('connecting');
    setError(null);
    setGraphError(null);

    const newSSEService = new LangGraphSSEService({
      onOpen: () => {
        console.log('[useLangGraphSSERunner] SSE connection opened');
        setStatus('running');
      },
      onMessage: handleNewEvent,
      onError: (err) => {
        console.error('[useLangGraphSSERunner] SSE Error:', err);
        setError(err.message);
        setStatus('error');
      },
      onClose: () => {
        console.log('[useLangGraphSSERunner] SSE connection closed');
        if (status === 'running') {
          setStatus('completed');
        }
      },
      baseUrl,
    });

    try {
      const executionId = await newSSEService.connect(graphId, executionRequest);
      setCurrentExecutionId(executionId);
      setSseService(newSSEService);
    } catch (err) {
      console.error('[useLangGraphSSERunner] Failed to connect:', err);
      setError(err instanceof Error ? err.message : 'Failed to connect');
      setStatus('error');
    }
  }, [sseService, handleNewEvent, baseUrl, status]);

  const disconnect = useCallback(() => {
    if (sseService) {
      sseService.close();
      setSseService(null);
      if (status === 'running') {
        setStatus('completed');
      }
    }
  }, [sseService, status]);

  return {
    connectAndExecute,
    disconnect,
    executionEvents,
    currentExecutionId,
    status,
    error,
    graphError,
    currentGraphState,
  };
};