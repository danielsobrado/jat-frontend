// src/snow/hooks/useSnowHistory.ts
import { useState, useCallback, useEffect, useRef } from 'react';
import { message } from 'antd';
import { ApiClient } from '../../api/types';
import { SnowHistoryItemFE, SnowHistoryPageFE, SnowHistoryRequestParamsFE, SnowHistoryFiltersState } from '../types/snow.types';
import _ from 'lodash'; // Import lodash for debounce

export interface UseSnowHistoryResult {
  historyItems: SnowHistoryItemFE[];
  loading: boolean;
  error: string | null;
  totalCount: number;
  currentPage: number;
  totalPages: number;
  deleteHistoryItem: (id: string) => Promise<boolean>;
  setCurrentPage: React.Dispatch<React.SetStateAction<number>>; // Expose setter for page
  setFilters: React.Dispatch<React.SetStateAction<SnowHistoryFiltersState>>; // Expose setter for filters
  filters: SnowHistoryFiltersState; // Expose current filters state for child components
  refreshHistory: () => void; // New method to force a refresh of current page/filters
}

const PAGE_SIZE = 10;
const DEBOUNCE_DELAY_MS = 500; // Delay for applying filters after input changes

export function useSnowHistory(apiClient: ApiClient): UseSnowHistoryResult {
  const mountedRef = useRef(true);
  const [historyItems, setHistoryItems] = useState<SnowHistoryItemFE[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [pageCursors, setPageCursors] = useState<Record<number, string | undefined>>({});
  const [filters, setFilters] = useState<SnowHistoryFiltersState>({ // Filter state managed inside the hook
    search: '',
    startDate: null,
    endDate: null,
  });

  // Refs to hold the latest state values without being dependencies of callbacks
  // This is the key to breaking the infinite loop.
  const currentPageRef = useRef(currentPage);
  const filtersRef = useRef(filters);
  const pageCursorsRef = useRef(pageCursors);

  // Keep refs in sync with state. These effects run after every render.
  useEffect(() => { currentPageRef.current = currentPage; }, [currentPage]);
  useEffect(() => { filtersRef.current = filters; }, [filters]);
  useEffect(() => { pageCursorsRef.current = pageCursors; }, [pageCursors]);

  // Safe state setters (these functions themselves are stable memoized functions)
  // We explicitly useCallback them to ensure their references are stable.
  const safeSetHistoryItems = useCallback((value: SnowHistoryItemFE[] | ((prev: SnowHistoryItemFE[]) => SnowHistoryItemFE[])) => { if (mountedRef.current) setHistoryItems(value); }, []);
  const safeSetLoading = useCallback((value: boolean | ((prev: boolean) => boolean)) => { if (mountedRef.current) setLoading(value); }, []);
  const safeSetError = useCallback((value: string | null | ((prev: string | null) => string | null)) => { if (mountedRef.current) setError(value); }, []);
  const safeSetTotalCount = useCallback((value: number | ((prev: number) => number)) => { if (mountedRef.current) setTotalCount(value); }, []);
  const safeSetCurrentPage = useCallback((value: number | ((prev: number) => number)) => { if (mountedRef.current) setCurrentPage(value); }, []);
  const safeSetTotalPages = useCallback((value: number | ((prev: number) => number)) => { if (mountedRef.current) setTotalPages(value); }, []);
  const safeSetPageCursors = useCallback((value: Record<number, string | undefined> | ((prev: Record<number, string | undefined>) => Record<number, string | undefined>)) => { if (mountedRef.current) setPageCursors(value); }, []);
  const safeSetFilters = useCallback((value: SnowHistoryFiltersState | ((prev: SnowHistoryFiltersState) => SnowHistoryFiltersState)) => { if (mountedRef.current) setFilters(value); }, []);


  // Core data fetching logic. It reads current state values from refs.
  // Its dependencies only include `apiClient` and the `safeSet` functions, which are stable.
  // This callback itself does not recreate on every render unless `apiClient` changes.
  const fetchHistoryData = useCallback(async () => {
    safeSetLoading(true);
    safeSetError(null);
    try {
      const page = currentPageRef.current; // Get current page from ref
      const currentFilters = filtersRef.current; // Get current filters from ref
      const currentCursorsSnapshot = pageCursorsRef.current; // Get current cursors from ref

      const actualCursor = page === 1 ? undefined : currentCursorsSnapshot[page - 1];

      const params: SnowHistoryRequestParamsFE = {
        limit: PAGE_SIZE,
        cursor: actualCursor,
        search: currentFilters.search || undefined,
        startDate: currentFilters.startDate || undefined,
        endDate: currentFilters.endDate || undefined,
      };
      console.log('[useSnowHistory] Fetching SNOW history with params:', params);
      const result: SnowHistoryPageFE = await apiClient.getSnowHistory(params);
      
      safeSetHistoryItems(result.items || []);
      safeSetTotalCount(result.totalCount || 0);
      safeSetTotalPages(Math.ceil((result.totalCount || 0) / PAGE_SIZE) || 1);

      // Update pageCursors state. This will cause `pageCursors` state to update.
      // And `pageCursorsRef.current` will update on next render.
      safeSetPageCursors(prev => {
          const newCursors = { ...prev };
          if (result.nextCursor) {
              newCursors[page] = result.nextCursor; // Store cursor for page+1
          } else {
              // If no nextCursor, this is the last page. Clear cursors for pages >= current page.
              // This is safe as it doesn't affect previous pages' cursors.
              for (let key in newCursors) {
                  if (parseInt(key) >= page) { // Clear cursors for current page and beyond (to ensure fresh pagination if data shrinks)
                      delete newCursors[key];
                  }
              }
          }
          return newCursors;
      });

    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to load SNOW analysis history.';
      console.error('SNOW History fetch error:', err);
      safeSetError(errorMsg);
      message.error(errorMsg);
      safeSetHistoryItems([]);
      safeSetTotalCount(0);
      safeSetTotalPages(1);
    } finally {
      safeSetLoading(false);
    }
    // Dependencies list is stable:
    // Only `apiClient` and the `safeSet` functions (which are `useCallback` memoized)
  }, [apiClient, safeSetHistoryItems, safeSetLoading, safeSetError, safeSetTotalCount, safeSetTotalPages, safeSetPageCursors]);


  // Debounced trigger for fetching history. It just calls `fetchHistoryData` directly.
  // This callback is stable as its dependencies are stable.
  const debouncedFetchHistory = useCallback(
    _.debounce(() => {
      fetchHistoryData(); // Call the stable fetch function
    }, DEBOUNCE_DELAY_MS),
    [fetchHistoryData] // Depends only on fetchHistoryData, which is stable
  );

  // Main useEffect: Triggers debounced data fetch when currentPage or filters change.
  // This useEffect will only re-run when `currentPage` or `filters` actually change,
  // because `debouncedFetchHistory` is a stable reference.
  useEffect(() => {
    console.log('[useSnowHistory] useEffect trigger: currentPage or filters changed. Loading page:', currentPage, 'Filters:', filters);
    debouncedFetchHistory();

    // Cleanup function for debounce
    return () => {
      debouncedFetchHistory.cancel();
    };
  }, [currentPage, filters, debouncedFetchHistory]); // Dependencies are `currentPage`, `filters`, and `debouncedFetchHistory` (which is stable)


  // Delete history item. It triggers a refresh of the current view.
  const deleteHistoryItem = useCallback(async (id: string): Promise<boolean> => {
    safeSetLoading(true);
    safeSetError(null);
    try {
      await apiClient.deleteSnowHistory(id);
      message.success('History item deleted successfully.');
      
      // After delete, re-fetch the current page to refresh data.
      // This will automatically handle pagination adjustments if the current page becomes empty.
      fetchHistoryData(); // Call the stable fetch function
      
      return true;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to delete history item.';
      console.error('SNOW History delete error:', err);
      safeSetError(errorMsg);
      message.error(errorMsg);
      return false;
    } finally {
      safeSetLoading(false);
    }
  }, [apiClient, fetchHistoryData, safeSetLoading, safeSetError]);

  // Method to force a refresh (e.g., for a "Refresh" button)
  const refreshHistory = useCallback(() => {
    fetchHistoryData(); // Call the stable fetch function
  }, [fetchHistoryData]);

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      debouncedFetchHistory.cancel(); // Cancel any pending debounced calls on unmount
    };
  }, [debouncedFetchHistory]); // Depends only on debouncedFetchHistory

  return {
    historyItems,
    loading,
    error,
    totalCount,
    currentPage,
    totalPages,
    deleteHistoryItem,
    setCurrentPage: safeSetCurrentPage, // Expose direct setter for page
    setFilters: safeSetFilters, // Expose direct setter for filters
    filters, // Expose current filters state
    refreshHistory, // Expose refresh function
  };
}