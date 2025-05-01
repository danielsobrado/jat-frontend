// src/components/BatchJobsTab/hooks/useBatchJobs.ts
import { useState, useEffect, useRef, useCallback } from 'react';
import { ApiClient, BatchClassificationResult, BatchJobParams } from '../../../api/types'; // Adjust import
import { BatchJobStatusFilterType } from '../../BatchTab/types'; // Adjust import if type moved

export interface UseBatchJobsResult {
    jobs: BatchClassificationResult[];
    loading: boolean;
    error: string | undefined;
    totalCount: number;
    totalPages: number;
    currentPage: number;
    selectedStatus: BatchJobStatusFilterType;
    startDate: string;
    endDate: string;
    cursor: string | undefined;
    setSelectedStatus: React.Dispatch<React.SetStateAction<BatchJobStatusFilterType>>;
    setStartDate: React.Dispatch<React.SetStateAction<string>>;
    setEndDate: React.Dispatch<React.SetStateAction<string>>;
    setCurrentPage: React.Dispatch<React.SetStateAction<number>>;
    refreshJobs: () => Promise<void>;
}

const POLLING_INTERVAL = 5000;
const PAGE_SIZE = 10;

export function useBatchJobs(apiClient: ApiClient): UseBatchJobsResult {
    const mountedRef = useRef(true);
    const [jobs, setJobs] = useState<BatchClassificationResult[]>([]);
    const [totalCount, setTotalCount] = useState(0);
    const [cursor, setCursor] = useState<string | undefined>(undefined);
    const [currentPage, setCurrentPage] = useState(1);
    const [loading, setLoading] = useState(true); // Start loading true
    const [error, setError] = useState<string | undefined>(undefined);
    const [totalPages, setTotalPages] = useState(1);

    const [selectedStatus, setSelectedStatus] = useState<BatchJobStatusFilterType>('all');
    const [startDate, setStartDate] = useState<string>(() => { const d = new Date(); d.setDate(d.getDate() - 7); return d.toISOString().split('T')[0]; });
    const [endDate, setEndDate] = useState<string>(() => new Date().toISOString().split('T')[0]);

    const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const requestIdRef = useRef(0);
    const isInitialMount = useRef(true);
    const loadingRef = useRef(loading);

    // --- Use specific safe setters ---
    const safeSetJobs = useCallback((data: BatchClassificationResult[]) => { if (mountedRef.current) setJobs(data); }, []);
    const safeSetTotalCount = useCallback((count: number) => { if (mountedRef.current) setTotalCount(count); }, []);
    const safeSetCursor = useCallback((newCursor: string | undefined) => { if (mountedRef.current) setCursor(newCursor); }, []);
    const safeSetCurrentPage = useCallback((page: number | ((prevPage: number) => number)) => { if (mountedRef.current) setCurrentPage(page); }, []);
    const safeSetTotalPages = useCallback((pages: number) => { if (mountedRef.current) setTotalPages(pages); }, []);
    const safeSetLoading = useCallback((isLoading: boolean) => { if (mountedRef.current) { setLoading(isLoading); loadingRef.current = isLoading; } }, []);
    const safeSetError = useCallback((err: string | undefined) => { if (mountedRef.current) setError(err); }, []);
    // --- End specific safe setters ---

    // Lifecycle
    useEffect(() => {
        mountedRef.current = true;
        return () => { mountedRef.current = false; if (pollIntervalRef.current) clearInterval(pollIntervalRef.current); requestIdRef.current++; };
    }, []);

    // Core loading logic
    const loadJobs = useCallback(async (pageToLoad: number, cursorToUse: string | undefined) => {
        const currentRequestId = ++requestIdRef.current;
        console.log(`[useBatchJobs loadJobs ${currentRequestId}] Req Start. Page: ${pageToLoad}, Cursor: ${cursorToUse}`);
        if (!loadingRef.current) { safeSetLoading(true); }
        safeSetError(undefined); // Use specific safe setter
        try {
            const params: BatchJobParams = {
                cursor: cursorToUse, limit: PAGE_SIZE, status: selectedStatus === 'all' ? undefined : selectedStatus,
                startDate: startDate ? new Date(startDate).toISOString() : undefined,
                endDate: endDate ? new Date(endDate + 'T23:59:59.999Z').toISOString() : undefined,
            };
            console.log(`[useBatchJobs loadJobs ${currentRequestId}] Calling API with params:`, params);
            const result = await apiClient.getBatchJobs(params);
            console.log(`[useBatchJobs loadJobs ${currentRequestId}] API call successful.`);
            if (!mountedRef.current || currentRequestId !== requestIdRef.current) { console.log(`[useBatchJobs loadJobs ${currentRequestId}] Discarded.`); return; }
            if (!result) throw new Error('No response data');
            const items = result.items || [];
            const total = result.totalCount || 0;
            const nextCursor = result.nextCursor;
            console.log(`[useBatchJobs loadJobs ${currentRequestId}] Processing result: Items=${items.length}, Total=${total}, NextCursor=${nextCursor}`);

            // Use specific safe setters
            safeSetJobs(items);
            safeSetTotalCount(total);
            safeSetCursor(nextCursor);
            const newTotalPages = Math.ceil(total / PAGE_SIZE);
            safeSetTotalPages(newTotalPages > 0 ? newTotalPages : 1); // Use specific safe setter

            safeSetLoading(false);
            console.log(`[useBatchJobs loadJobs ${currentRequestId}] State updated, loading=false.`);
        } catch (err) {
            console.error(`[useBatchJobs loadJobs ${currentRequestId}] Error:`, err);
            if (mountedRef.current && currentRequestId === requestIdRef.current) {
                // Use specific safe setters
                safeSetError('Failed to load: ' + (err instanceof Error ? err.message : 'Unknown error'));
                safeSetJobs([]);
                safeSetTotalCount(0);
                safeSetCursor(undefined);
                safeSetTotalPages(1); // Use specific safe setter
                safeSetLoading(false);
                console.log(`[useBatchJobs loadJobs ${currentRequestId}] Error state set, loading=false.`);
            } else { console.log(`[useBatchJobs loadJobs ${currentRequestId}] Error ignored.`); }
        }
     // Update dependencies to use specific safe setters
    }, [apiClient, startDate, endDate, selectedStatus, PAGE_SIZE, safeSetLoading, safeSetError, safeSetJobs, safeSetTotalCount, safeSetCursor, safeSetTotalPages]);

    // Effect to reset page when filters change
    useEffect(() => {
        if (!isInitialMount.current) {
            console.log('[useBatchJobs] Filters changed, resetting to page 1.');
            // Use specific safe setters
            safeSetCurrentPage(1);
            safeSetCursor(undefined);
        }
     // Update dependencies to use specific safe setters
    }, [selectedStatus, startDate, endDate, safeSetCurrentPage, safeSetCursor]);

    // Effect for loading data when page changes OR after filters force page reset
    useEffect(() => {
        console.log('[useBatchJobs] Load trigger effect running for page:', currentPage);
        loadJobs(currentPage, currentPage === 1 ? undefined : cursor);
        if (isInitialMount.current) isInitialMount.current = false;
    }, [currentPage, cursor, loadJobs]); // Include loadJobs dependency

    // Refresh current page data
    const refreshJobs = useCallback(async () => {
        console.log('[useBatchJobs refreshJobs] Refreshing current page:', currentPage);
        await loadJobs(currentPage, currentPage === 1 ? undefined : cursor);
    }, [loadJobs, currentPage, cursor]);

    // Effect for polling active jobs
    useEffect(() => {
        const hasActiveJobs = jobs.some(job => job.status === 'processing' || job.status === 'pending');
        const setupPollingInterval = () => {
            if (!pollIntervalRef.current) {
                console.log('[useBatchJobs Polling] Starting interval.');
                pollIntervalRef.current = setInterval(() => {
                    if (!loadingRef.current) { console.log('[useBatchJobs Polling] Refreshing...'); refreshJobs(); }
                    else { console.log('[useBatchJobs Polling] Skipping refresh: loading.'); }
                }, POLLING_INTERVAL);
            }
        };
        const clearPollingInterval = () => {
            if (pollIntervalRef.current) { console.log('[useBatchJobs Polling] Clearing interval.'); clearInterval(pollIntervalRef.current); pollIntervalRef.current = null; }
        };
        if (hasActiveJobs && !loadingRef.current) setupPollingInterval(); else clearPollingInterval();
        return clearPollingInterval;
    }, [jobs, refreshJobs]);

    // Return hook state and *original* setters for filters/page
    return {
        jobs, loading, error, totalCount, totalPages, currentPage,
        selectedStatus, startDate, endDate, cursor,
        setSelectedStatus, // Expose original setter
        setStartDate,      // Expose original setter
        setEndDate,        // Expose original setter
        setCurrentPage,    // Expose original setter
        refreshJobs,
    };
}