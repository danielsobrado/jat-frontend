// src/components/RagInfoTab/hooks/useRagInfo.ts
import { useState, useEffect, useCallback, useRef } from 'react';
import {
  ApiClient,
  RagInfoItem,
  RagInfoPage,
  RagInfoRequestParams,
  CreateRagInfoRequest,
  UpdateRagInfoRequest,
} from '../../../api/types'; // Adjust path as needed

const PAGE_SIZE = 10; // Or your preferred page size

export interface UseRagInfoResult {
  items: RagInfoItem[];
  loading: boolean;
  error: string | undefined;
  totalCount: number;
  totalPages: number;
  currentPage: number;
  searchTerm: string;
  setCurrentPage: (page: number) => void;
  setSearchTerm: (term: string) => void;
  refreshList: () => Promise<void>;
  createItem: (data: CreateRagInfoRequest) => Promise<RagInfoItem | null>;
  updateItem: (id: string, data: UpdateRagInfoRequest) => Promise<RagInfoItem | null>;
  deleteItem: (id: string) => Promise<boolean>;
  fetchAllForExport: (search?: string) => Promise<RagInfoItem[]>; // New method for export
}

export function useRagInfo(apiClient: ApiClient): UseRagInfoResult {
  const mountedRef = useRef(true);
  const [items, setItems] = useState<RagInfoItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>(undefined);
  const [searchTerm, setSearchTerm] = useState('');

  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Safe state setters
  const safeSetItems = useCallback((data: RagInfoItem[]) => { if (mountedRef.current) setItems(data); }, []);
  const safeSetTotalCount = useCallback((count: number) => { if (mountedRef.current) setTotalCount(count); }, []);
  const safeSetTotalPages = useCallback((pages: number) => { if (mountedRef.current) setTotalPages(pages); }, []);
  const safeSetCurrentPage = useCallback((page: number) => { if (mountedRef.current) setCurrentPage(page); }, []);
  const safeSetLoading = useCallback((isLoading: boolean) => { if (mountedRef.current) setLoading(isLoading); }, []);
  const safeSetError = useCallback((err: string | undefined) => { if (mountedRef.current) setError(err); }, []);

  const fetchList = useCallback(async (page: number, search: string) => {
    safeSetLoading(true);
    safeSetError(undefined);
    console.log(`Fetching RAG Info - Page: ${page}, Search: "${search}"`);
    try {
      const params: RagInfoRequestParams = {
        page,
        limit: PAGE_SIZE,
        search: search.trim() || undefined,
      };
      const result = await apiClient.getRagInfoList(params);
      safeSetItems(result.items);
      safeSetTotalCount(result.totalCount);
      safeSetTotalPages(result.totalPages);
      // Ensure current page from response is reflected, though usually driven by request
      if (result.currentPage !== page) {
        console.warn(`API response page ${result.currentPage} differs from requested page ${page}`);
        // Optionally force set page based on response: safeSetCurrentPage(result.currentPage);
      }
    } catch (err) {
      console.error('Failed to fetch RAG info list:', err);
      safeSetError(err instanceof Error ? err.message : 'Failed to load data');
      safeSetItems([]);
      safeSetTotalCount(0);
      safeSetTotalPages(1);
    } finally {
      safeSetLoading(false);
    }
  }, [apiClient, safeSetItems, safeSetTotalCount, safeSetTotalPages, safeSetLoading, safeSetError]);

  // New function to fetch all items for export
  const fetchAllForExport = useCallback(async (search?: string): Promise<RagInfoItem[]> => {
    console.log(`Fetching all RAG info items for export. Search filter: "${search || ''}"`);
    
    try {
      // First, try to get a count of all items with the optional search filter
      const countParams: RagInfoRequestParams = {
        page: 1,
        limit: 1, // Just need count, not actual items
        search: search?.trim(),
      };
      
      const countResult = await apiClient.getRagInfoList(countParams);
      const totalItems = countResult.totalCount;
      
      if (totalItems === 0) {
        return []; // No items to export
      }
      
      // Calculate how many pages we need to fetch with a larger page size for efficiency
      const exportPageSize = 100; // Use a larger page size for export
      const pagesToFetch = Math.ceil(totalItems / exportPageSize);
      
      // Fetch all pages in parallel
      const requests: Promise<RagInfoPage>[] = [];
      for (let i = 1; i <= pagesToFetch; i++) {
        const params: RagInfoRequestParams = {
          page: i,
          limit: exportPageSize,
          search: search?.trim(),
        };
        requests.push(apiClient.getRagInfoList(params));
      }
      
      const results = await Promise.all(requests);
      
      // Combine all items from all pages
      const allItems: RagInfoItem[] = [];
      results.forEach(result => {
        allItems.push(...result.items);
      });
      
      console.log(`Successfully fetched ${allItems.length} items for export`);
      return allItems;
    } catch (err) {
      console.error('Failed to fetch all items for export:', err);
      throw new Error(err instanceof Error ? err.message : 'Failed to export data');
    }
  }, [apiClient]);

  // Effect to fetch data when page or search term changes (debounced)
  useEffect(() => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    debounceTimeoutRef.current = setTimeout(() => {
        // Reset to page 1 when search term changes
        const pageToFetch = searchTerm !== (debounceTimeoutRef.current as any)?.lastSearchTerm ? 1 : currentPage;
        if (pageToFetch === 1 && currentPage !== 1) {
            safeSetCurrentPage(1); // Reset page state visually
        }
        fetchList(pageToFetch, searchTerm);
        (debounceTimeoutRef.current as any).lastSearchTerm = searchTerm; // Store last search term
    }, 300); // 300ms debounce

    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [currentPage, searchTerm, fetchList, safeSetCurrentPage]);

   // Cleanup on unmount
   useEffect(() => {
       mountedRef.current = true;
       return () => {
           mountedRef.current = false;
           if (debounceTimeoutRef.current) {
               clearTimeout(debounceTimeoutRef.current);
           }
       };
   }, []);

  const refreshList = useCallback(async () => {
    await fetchList(currentPage, searchTerm);
  }, [fetchList, currentPage, searchTerm]);

  const createItem = useCallback(async (data: CreateRagInfoRequest): Promise<RagInfoItem | null> => {
    safeSetLoading(true);
    safeSetError(undefined);
    try {
      const newItem = await apiClient.createRagInfo(data);
      await refreshList(); // Refresh list after creation
      return newItem;
    } catch (err) {
      safeSetError(err instanceof Error ? err.message : 'Failed to create item');
      return null;
    } finally {
      safeSetLoading(false);
    }
  }, [apiClient, refreshList, safeSetLoading, safeSetError]);

  const updateItem = useCallback(async (id: string, data: UpdateRagInfoRequest): Promise<RagInfoItem | null> => {
    safeSetLoading(true);
    safeSetError(undefined);
    try {
      const updatedItem = await apiClient.updateRagInfo(id, data);
      // Update item in the local list optimistically or refresh
       setItems(prevItems => prevItems.map(item => item.id === id ? updatedItem : item));
      // await refreshList(); // Or refresh for simplicity
      return updatedItem;
    } catch (err) {
      safeSetError(err instanceof Error ? err.message : 'Failed to update item');
      return null;
    } finally {
      safeSetLoading(false);
    }
  }, [apiClient, /* refreshList */ safeSetLoading, safeSetError]);

  const deleteItem = useCallback(async (id: string): Promise<boolean> => {
    safeSetLoading(true);
    safeSetError(undefined);
    try {
      await apiClient.deleteRagInfo(id);
      // Remove item locally or refresh
      setItems(prevItems => prevItems.filter(item => item.id !== id));
      // Decrement total count (be careful with pagination edge cases)
      setTotalCount(prev => Math.max(0, prev - 1));
      // Optional: Check if current page becomes empty and go back one page
      // await refreshList(); // Or refresh for simplicity
      return true;
    } catch (err) {
      safeSetError(err instanceof Error ? err.message : 'Failed to delete item');
      return false;
    } finally {
      safeSetLoading(false);
    }
  }, [apiClient, /* refreshList */ safeSetLoading, safeSetError]);


  return {
    items,
    loading,
    error,
    totalCount,
    totalPages,
    currentPage,
    searchTerm,
    setCurrentPage: safeSetCurrentPage, // Expose safe setter
    setSearchTerm, // Direct setter is fine for input state
    refreshList,
    createItem,
    updateItem,
    deleteItem,
    fetchAllForExport, // Expose the new method for export
  };
}