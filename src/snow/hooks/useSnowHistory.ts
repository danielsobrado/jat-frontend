// src/snow/hooks/useSnowHistory.ts
import { useState, useCallback, useEffect, useRef } from 'react';
import { message } from 'antd';
import { ApiClient } from '../../api/types';
import { SnowHistoryItemFE, SnowHistoryPageFE, SnowHistoryRequestParamsFE } from '../types/snow.types';

export interface UseSnowHistoryResult {
  historyItems: SnowHistoryItemFE[];
  loading: boolean;
  error: string | null;
  totalCount: number;
  currentPage: number;
  totalPages: number;
  fetchHistory: (page: number, filters: SnowHistoryRequestParamsFE, cursor?: string) => Promise<void>;
  deleteHistoryItem: (id: string) => Promise<boolean>;
  pageCursors: Record<number, string | undefined>; // Store cursor for each page number
  setCurrentPage: React.Dispatch<React.SetStateAction<number>>;
}

const PAGE_SIZE = 10;

export function useSnowHistory(apiClient: ApiClient): UseSnowHistoryResult {
  const mountedRef = useRef(true);
  const [historyItems, setHistoryItems] = useState<SnowHistoryItemFE[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [pageCursors, setPageCursors] = useState<Record<number, string | undefined>>({});

  const safeSetState = <T,>(setter: React.Dispatch<React.SetStateAction<T>>) => (value: T | ((prevState: T) => T)) => {
    if (mountedRef.current) setter(value);
  };

  const safeSetHistoryItems = safeSetState(setHistoryItems);
  const safeSetLoading = safeSetState(setLoading);
  const safeSetError = safeSetState(setError);
  const safeSetTotalCount = safeSetState(setTotalCount);
  const safeSetCurrentPage = safeSetState(setCurrentPage);
  const safeSetTotalPages = safeSetState(setTotalPages);
  const safeSetPageCursors = safeSetState(setPageCursors);

  const fetchHistory = useCallback(async (page: number, filters: SnowHistoryRequestParamsFE, cursor?: string) => {
    safeSetLoading(true);
    safeSetError(null);
    try {
      const params: SnowHistoryRequestParamsFE = {
        limit: PAGE_SIZE,
        cursor: page === 1 ? undefined : cursor, // Use cursor only if not page 1
        ...filters,
      };
      console.log('Fetching SNOW history with params:', params);
      const result: SnowHistoryPageFE = await apiClient.getSnowHistory(params);
      
      safeSetHistoryItems(result.items || []);
      safeSetTotalCount(result.totalCount || 0);
      safeSetTotalPages(Math.ceil((result.totalCount || 0) / PAGE_SIZE) || 1);
      safeSetCurrentPage(page);

      if (result.nextCursor) {
        safeSetPageCursors(prev => ({ ...prev, [page]: result.nextCursor }));
      }

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
  }, [apiClient, safeSetLoading, safeSetError, safeSetHistoryItems, safeSetTotalCount, safeSetCurrentPage, safeSetTotalPages, safeSetPageCursors]);

  const deleteHistoryItem = useCallback(async (id: string): Promise<boolean> => {
    safeSetLoading(true);
    safeSetError(null);
    try {
      await apiClient.deleteSnowHistory(id);
      message.success('History item deleted successfully.');
      // Refresh current page or go to page 1 if current page becomes empty
      const newTotal = totalCount - 1;
      if (newTotal <= (currentPage - 1) * PAGE_SIZE && currentPage > 1) {
        setCurrentPage(prev => prev - 1); // This will trigger fetch in useEffect
      } else {
        // Re-fetch current page, using the cursor for the current page's *previous* page
        // (as that cursor leads to the current page). For page 1, cursor is undefined.
        await fetchHistory(currentPage, {}, currentPage > 1 ? pageCursors[currentPage - 1] : undefined);
      }
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
  }, [apiClient, fetchHistory, totalCount, currentPage, pageCursors, safeSetLoading, safeSetError]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  return {
    historyItems,
    loading,
    error,
    totalCount,
    currentPage,
    totalPages,
    fetchHistory,
    deleteHistoryItem,
    pageCursors,
    setCurrentPage: safeSetCurrentPage,
  };
}