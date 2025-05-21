// src/langgraph/hooks/useLangGraphRunner.ts
import { useState, useEffect, useCallback, useRef } from 'react';
import {
  LangGraphExecutionEvent,
  ExecuteGraphRequestFE,
  GraphExecutionStartEventFE,
  NodeStartEventFE,
  NodeEndEventFE,
  EdgeTakenEventFE,
  GraphExecutionEndEventFE,
  GraphErrorEventFE,
} from '../types/langgraph';
import { LangGraphSocketService, LangGraphSocketMessageHandler } from '../services/langGraphSocketService';

export type GraphExecutionStatus =
  | 'disconnected'
  | 'connecting'
  | 'connected' // Connected, waiting for initial message or graph start
  | 'starting'  // GraphExecutionStartEvent sent/received, graph is about to run
  | 'running'   // Actively receiving node/edge events
  | 'completed'
  | 'error'
  | 'closed';

export interface ExecutionState {
  activeNodeIds: Set<string>;
  completedNodeIds: Set<string>;
  errorNodeIds: Set<string>;
  traversedEdgeIds: Set<string>; // e.g., "source->target" or edge ID from graph def
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

export interface UseLangGraphRunnerResult {
  connectAndExecute: (
    graphId: string,
    initialArgs?: Record<string, any>,
    predefinedExecutionId?: string // For re-connecting to an existing run (if supported by backend)
  ) => void;
  disconnect: () => void;
  executionEvents: LangGraphExecutionEvent[];
  currentExecutionId: string | null;
  status: GraphExecutionStatus;
  error: string | null; // General WebSocket or connection error
  graphError: GraphErrorEventFE | null; // Specific error from graph execution
  currentGraphState: ExecutionState; // State to help visualize node/edge statuses
}

export const useLangGraphRunner = (
    baseWsUrl?: string // Optional: e.g., ws://localhost:8000 or wss://yourdomain.com
): UseLangGraphRunnerResult => {
  const [socketService, setSocketService] = useState<LangGraphSocketService | null>(null);
  const [executionEvents, setExecutionEvents] = useState<LangGraphExecutionEvent[]>([]);
  const [currentExecutionId, setCurrentExecutionId] = useState<string | null>(null);
  const [status, setStatus] = useState<GraphExecutionStatus>('disconnected');
  const [error, setError] = useState<string | null>(null);
  const [graphError, setGraphError] = useState<GraphErrorEventFE | null>(null);
  const [currentGraphState, setCurrentGraphState] = useState<ExecutionState>(initialExecutionState);

  // Ref to ensure that we don't set state on an unmounted component
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const resetExecutionVisualState = useCallback(() => {
    if (mountedRef.current) {
      setCurrentGraphState(initialExecutionState);
      setGraphError(null);
    }
  }, []);

  const handleNewEvent = useCallback((event: LangGraphExecutionEvent) => {
    if (!mountedRef.current) return;

    setExecutionEvents((prevEvents) => [...prevEvents, event]);
    setCurrentGraphState((prevState) => {
      const newState = {
        activeNodeIds: new Set(prevState.activeNodeIds),
        completedNodeIds: new Set(prevState.completedNodeIds),
        errorNodeIds: new Set(prevState.errorNodeIds),
        traversedEdgeIds: new Set(prevState.traversedEdgeIds),
        lastInputByNode: { ...prevState.lastInputByNode },
        lastOutputByNode: { ...prevState.lastOutputByNode },
      };

      switch (event.eventType) {
        case 'graph_execution_start':
          setStatus('starting');
          setCurrentExecutionId(event.executionId);
          // Reset visual state for a new run, even if it's the same graphId
          return initialExecutionState;
        case 'node_start':
          const nsEvent = event as NodeStartEventFE;
          newState.activeNodeIds.add(nsEvent.nodeId);
          newState.completedNodeIds.delete(nsEvent.nodeId); // In case of retries/loops
          newState.errorNodeIds.delete(nsEvent.nodeId);
          newState.lastInputByNode[nsEvent.nodeId] = nsEvent.inputData;
          if (status !== 'running') setStatus('running');
          break;
        case 'node_end':
          const neEvent = event as NodeEndEventFE;
          newState.activeNodeIds.delete(neEvent.nodeId);
          if (neEvent.status === 'success') {
            newState.completedNodeIds.add(neEvent.nodeId);
          } else {
            newState.errorNodeIds.add(neEvent.nodeId);
          }
          newState.lastOutputByNode[neEvent.nodeId] = neEvent.outputData;
          break;
        case 'edge_taken':
          const etEvent = event as EdgeTakenEventFE;
          // Create a unique ID for the edge, e.g., "source_target_label"
          // Note: Backend needs to send reliable edge identifiers or enough info to construct one
          const edgeId = `${etEvent.sourceNodeId}__${etEvent.targetNodeId}` + (etEvent.edgeLabel ? `__${etEvent.edgeLabel}` : '');
          newState.traversedEdgeIds.add(edgeId);
          break;
        case 'graph_execution_end':
          setStatus('completed');
          // Keep active/completed nodes as they are for final state view
          break;
        case 'graph_error':
          setGraphError(event as GraphErrorEventFE);
          setStatus('error');
          break;
        case 'pong':
          // console.debug('[useLangGraphRunner] Pong received:', event.serverTime);
          break;
      }
      return newState;
    });
  }, [status]); // status dependency to ensure setStatus('running') is correctly timed

  const handleSocketOpen = useCallback(() => {
    if (mountedRef.current) {
      setStatus('connected'); // Connected, now ready to send initial message
      setError(null);
    }
  }, []);

  const handleSocketError = useCallback((err: Event) => {
    if (mountedRef.current) {
      console.error('[useLangGraphRunner] WebSocket Error:', err);
      setError('WebSocket connection error. Please try again.');
      setStatus('error');
      resetExecutionVisualState();
    }
  }, [resetExecutionVisualState]);

  const handleSocketClose = useCallback((ev: CloseEvent) => {
    if (mountedRef.current) {
      console.log('[useLangGraphRunner] WebSocket Closed:', ev.code, ev.reason);
      if (status !== 'completed' && status !== 'error' && !ev.wasClean) {
        setError(`WebSocket closed unexpectedly: ${ev.reason || ev.code}`);
        setStatus('error'); // Or 'disconnected' if appropriate
      } else if (ev.wasClean && status !== 'completed' && status !== 'error') {
        setStatus('closed');
      }
      // Do not reset currentExecutionId or events here, they might be needed for display
      // Visual state (activeNodeIds etc.) is also kept for inspection of last state.
    }
  }, [status]);


  const connectAndExecute = useCallback((
    graphId: string,
    initialArgs: Record<string, any> = {},
    predefinedExecutionId?: string
  ) => {
    if (socketService) {
      console.warn('[useLangGraphRunner] Disconnecting existing socket before reconnecting.');
      socketService.close(1000, "New connection requested");
    }

    if (mountedRef.current) {
      setExecutionEvents([]); // Clear events from previous run
      resetExecutionVisualState();
      setStatus('connecting');
      setError(null);
      setGraphError(null);
      setCurrentExecutionId(predefinedExecutionId || null); // Set if provided, else it's set on GraphExecutionStartEvent
    }

    const newSocketService = new LangGraphSocketService({
      onMessage: handleNewEvent,
      onOpen: () => {
        handleSocketOpen(); // Sets status to 'connected'
        // Send initial message to start execution AFTER connection is open
        const initialMessage: ExecuteGraphRequestFE = { inputArgs: initialArgs || {} };
        newSocketService.send(initialMessage);
        // Status will move to 'starting' and then 'running' based on backend events
      },
      onError: handleSocketError,
      onClose: handleSocketClose,
      autoReconnect: false, // Typically, user initiates new execution explicitly
      baseWsUrl: baseWsUrl,
    });

    newSocketService.connect(graphId, predefinedExecutionId);
    if (mountedRef.current) {
      setSocketService(newSocketService);
    } else {
      // If component unmounted before socket could be set, close the new socket
      newSocketService.close();
    }
  }, [socketService, handleNewEvent, handleSocketOpen, handleSocketError, handleSocketClose, resetExecutionVisualState, baseWsUrl]);


  const disconnect = useCallback(() => {
    if (socketService) {
      socketService.close(1000, 'User disconnected'); // 1000 is normal closure
      if (mountedRef.current) {
          setSocketService(null); // Allow for a new service to be created on next connect
          if (status !== 'error' && status !== 'completed') { // Only set to 'closed' if not already in a terminal state
              setStatus('closed');
          }
      }
    }
  }, [socketService, status]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false; // Mark as unmounted
      if (socketService) {
        console.log('[useLangGraphRunner] Cleaning up WebSocket on unmount.');
        socketService.close(1000, 'Component unmounted');
      }
    };
  }, [socketService]);

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