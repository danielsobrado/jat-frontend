// src/langgraph/hooks/useLangGraphDefinitions.ts
import { useState, useCallback, useMemo } from 'react';
import {
  FrontendGraphDef,
  GraphDefinitionIdentifierFE,
  GraphDefinitionListResponseFE,
  CreateGraphRequestFE,
  UpdateGraphRequestFE,
  MessageResponseFE,
} from '../types/langgraph';
import { LangGraphApiService } from '../services/langGraphApiService';
import { ApiClient } from '../../api/types'; // main ApiClient type

export interface UseLangGraphDefinitionsResult {
  graphDefinitions: GraphDefinitionIdentifierFE[];
  isLoading: boolean;
  error: string | null;
  fetchGraphDefinitions: (includeStatic?: boolean) => Promise<void>;
  getGraphDefinition: (graphId: string) => Promise<FrontendGraphDef | null>;
  createGraphDefinition: (data: CreateGraphRequestFE) => Promise<FrontendGraphDef | null>;
  updateGraphDefinition: (graphId: string, data: UpdateGraphRequestFE) => Promise<FrontendGraphDef | null>;
  deleteGraphDefinition: (graphId: string) => Promise<boolean>;
}

export const useLangGraphDefinitions = (
  apiClient: ApiClient, // Pass your main ApiClient instance
  lgVisApiPrefix: string = '/v1/lg-vis' // Default prefix for LangGraph Vis backend
): UseLangGraphDefinitionsResult => {
  const [graphDefinitions, setGraphDefinitions] = useState<GraphDefinitionIdentifierFE[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);  // Initialize the langGraphApiService once and memoize it to prevent recreation on every render
  const langGraphService = useMemo(
    () => new LangGraphApiService(apiClient, lgVisApiPrefix),
    [apiClient, lgVisApiPrefix]
  );

  const fetchGraphDefinitions = useCallback(async (includeStatic: boolean = false) => {
    setIsLoading(true);
    setError(null);
    try {
      console.log('[useLangGraphDefinitions] Fetching graphs with includeStatic =', includeStatic);
      const response: GraphDefinitionListResponseFE = await langGraphService.listGraphDefinitions(includeStatic);
      console.log('[useLangGraphDefinitions] Received response:', response);
      setGraphDefinitions(response.graphs || []);
    } catch (err) {
      console.error('[useLangGraphDefinitions] Error fetching graph definitions:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to load graph definitions.';
      setError(errorMessage);
      // Only clear data on error if we don't have any existing data to maintain UX
      if (graphDefinitions.length === 0) {
        setGraphDefinitions([]);
      }
    } finally {
      setIsLoading(false);
    }
  }, [langGraphService, graphDefinitions.length]); // Dependency: langGraphService and current graphDefinitions length

  const getGraphDefinition = useCallback(async (graphId: string): Promise<FrontendGraphDef | null> => {
    setIsLoading(true);
    setError(null);
    try {
      const graphDef: FrontendGraphDef = await langGraphService.getGraphDefinition(graphId);
      return graphDef;
    } catch (err) {
      console.error(`[useLangGraphDefinitions] Error fetching graph definition ${graphId}:`, err);
      const errorMessage = err instanceof Error ? err.message : `Failed to load graph definition ${graphId}.`;
      setError(errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [langGraphService]); // Dependency: langGraphService

  const createGraphDefinition = useCallback(async (data: CreateGraphRequestFE): Promise<FrontendGraphDef | null> => {
    setIsLoading(true);
    setError(null);
    try {
      const newGraphDef: FrontendGraphDef = await langGraphService.createGraphDefinition(data);
      // After creating, refresh the list of definitions
      await fetchGraphDefinitions(); // Or optimistically add to list
      return newGraphDef;
    } catch (err) {
      console.error('[useLangGraphDefinitions] Error creating graph definition:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to create graph definition.';
      setError(errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [langGraphService, fetchGraphDefinitions]);

  const updateGraphDefinition = useCallback(async (graphId: string, data: UpdateGraphRequestFE): Promise<FrontendGraphDef | null> => {
    setIsLoading(true);
    setError(null);
    try {
      const updatedGraphDef: FrontendGraphDef = await langGraphService.updateGraphDefinition(graphId, data);
      // After updating, refresh the list of definitions
      await fetchGraphDefinitions(); // Or optimistically update in list
      return updatedGraphDef;
    } catch (err) {
      console.error(`[useLangGraphDefinitions] Error updating graph definition ${graphId}:`, err);
      // Ensure err is treated as Error type for message property
      const errorMessage = err instanceof Error ? err.message : `Failed to update graph definition ${graphId}.`;
      setError(errorMessage);
      return null; // Ensure null is returned here
    } finally {
      setIsLoading(false);
    }
  }, [langGraphService, fetchGraphDefinitions]);

  const deleteGraphDefinition = useCallback(async (graphId: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    try {
      const response: MessageResponseFE = await langGraphService.deleteGraphDefinition(graphId);
      console.log(response.message); // Keep or remove logging as needed
      // After deleting, refresh the list of definitions
      await fetchGraphDefinitions();
      return true;
    } catch (err) {
      console.error(`[useLangGraphDefinitions] Error deleting graph definition ${graphId}:`, err);
      const errorMessage = err instanceof Error ? err.message : `Failed to delete graph definition ${graphId}.`;
      setError(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [langGraphService, fetchGraphDefinitions]);

  // Removed initial useEffect for fetching definitions, as per original commented-out code.
  // Pages can trigger fetchGraphDefinitions as needed.

  return {
    graphDefinitions,
    isLoading,
    error,
    fetchGraphDefinitions,
    getGraphDefinition,
    createGraphDefinition,
    updateGraphDefinition,
    deleteGraphDefinition,
  };
};