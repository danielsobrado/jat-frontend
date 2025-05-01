// src/components/BatchJobsTab/BatchJobsTab.tsx
import React, { useState, useCallback, useRef, useEffect } from 'react';
import type { JSX } from 'react';
import { Spin } from 'antd';
import { ApiClient, BatchClassificationResult } from '../../api/types';
import { ExecutionStatusFilterType, ResultStatusFilterType, getExecutionStatus, calculateResultStatus } from './utils/batchJobUtils';
import BatchJobDetailsModal from './BatchJobDetailsModal';
import { BatchJobsFilters } from './components/BatchJobsFilters';
import { BatchJobsTable } from './components/BatchJobsTable';

interface BatchJobsTabProps {
  apiClient: ApiClient;
}

export const BatchJobsTab = ({ apiClient }: BatchJobsTabProps): JSX.Element => {
  const mountedRef = useRef(true);
  const [jobs, setJobs] = useState<BatchClassificationResult[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>(undefined);
  const [selectedJob, setSelectedJob] = useState<BatchClassificationResult | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [pageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);

  const [selectedExecutionStatus, setSelectedExecutionStatus] = useState<ExecutionStatusFilterType>('all');
  const [selectedResultStatus, setSelectedResultStatus] = useState<ResultStatusFilterType>('all');
  const [startDate, setStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState<string>(() => new Date().toISOString().split('T')[0]);

  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const requestIdRef = useRef(0);
  const isInitialMount = useRef(true);
  const loadingRef = useRef(loading);

  // Safe state updates
  const safeSetJobs = useCallback((data: BatchClassificationResult[]) => {
    if (mountedRef.current) setJobs(data);
  }, []);
  const safeSetTotalCount = useCallback((count: number) => {
    if (mountedRef.current) setTotalCount(count);
  }, []);
  const safeSetCursor = useCallback((newCursor: string | undefined) => {
    if (mountedRef.current) setCursor(newCursor);
  }, []);
  const safeSetLoading = useCallback((isLoading: boolean) => {
    if (mountedRef.current) {
      setLoading(isLoading);
      loadingRef.current = isLoading;
    }
  }, []);
  const safeSetError = useCallback((err: string | undefined) => {
    if (mountedRef.current) setError(err);
  }, []);

  // Component lifecycle
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
      requestIdRef.current++;
    };
  }, []);

  // Load jobs data
  const loadJobs = useCallback(async (pageToLoad: number, cursorToUse: string | undefined) => {
    const currentRequestId = ++requestIdRef.current;
    if (!loadingRef.current) {
      safeSetLoading(true);
    }
    safeSetError(undefined);

    try {
      const formattedStartDate = startDate ? new Date(startDate).toISOString() : undefined;
      const formattedEndDate = endDate ? new Date(endDate + 'T23:59:59.999Z').toISOString() : undefined;

      const result = await apiClient.getBatchJobs({
        cursor: cursorToUse,
        limit: pageSize,
        status: selectedExecutionStatus === 'all' ? undefined : selectedExecutionStatus,
        startDate: formattedStartDate,
        endDate: formattedEndDate,
      });

      // Debug the raw response from the backend
      console.log('Batch jobs API response:', result);
      console.log('First job totalItems value:', result.items?.[0]?.totalItems);

      if (!mountedRef.current || currentRequestId !== requestIdRef.current) {
        return;
      }

      const resultItems = result.items || [];
      // Apply client-side filtering for result status
      const filteredItems = selectedResultStatus !== 'all'
        ? resultItems.filter(job => {
            if (getExecutionStatus(job) === 'pending' || getExecutionStatus(job) === 'processing') {
              return false;
            }
            return calculateResultStatus(job) === selectedResultStatus;
          })
        : resultItems;

      safeSetJobs(filteredItems);
      safeSetTotalCount(result.totalCount || 0);
      safeSetCursor(result.nextCursor);
      const newTotalPages = Math.ceil((result.totalCount || 0) / pageSize);
      setTotalPages(newTotalPages > 0 ? newTotalPages : 1);
      safeSetLoading(false);

    } catch (err) {
      if (mountedRef.current && currentRequestId === requestIdRef.current) {
        safeSetError('Failed to load batch jobs: ' + (err instanceof Error ? err.message : 'Unknown error'));
        safeSetJobs([]);
        safeSetTotalCount(0);
        safeSetCursor(undefined);
        setTotalPages(1);
        safeSetLoading(false);
      }
    }
  }, [apiClient, startDate, endDate, selectedExecutionStatus, selectedResultStatus, pageSize, safeSetLoading, safeSetError, safeSetJobs, safeSetTotalCount, safeSetCursor]);

  // Reset page when filters change
  useEffect(() => {
    if (!isInitialMount.current) {
      setCurrentPage(1);
      setCursor(undefined);
    }
  }, [selectedExecutionStatus, selectedResultStatus, startDate, endDate]);

  // Load data when page changes
  useEffect(() => {
    loadJobs(currentPage, currentPage === 1 ? undefined : cursor);
    if (isInitialMount.current) {
      isInitialMount.current = false;
    }
  }, [currentPage, cursor, loadJobs]);

  // Polling for active jobs
  const refreshJobs = useCallback(async () => {
    await loadJobs(currentPage, currentPage === 1 ? undefined : cursor);
  }, [loadJobs, currentPage, cursor]);

  useEffect(() => {
    const hasActiveJobs = jobs.some(job => 
      getExecutionStatus(job) === 'processing' || getExecutionStatus(job) === 'pending'
    );

    if (hasActiveJobs && !loadingRef.current && !pollIntervalRef.current) {
      pollIntervalRef.current = setInterval(refreshJobs, 5000);
    } else if (!hasActiveJobs && pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, [jobs, refreshJobs]);

  // Pagination handler
  const handlePageChange = useCallback((newPage: number) => {
    if (loadingRef.current || newPage < 1 || newPage > totalPages || newPage === currentPage) return;
    setCurrentPage(newPage);
  }, [currentPage, totalPages]);

  return (
    <div className="max-w-8xl mx-auto space-y-6" style={{ minWidth: '40rem', paddingRight: '1rem', paddingLeft: '1rem' }}>
      {/* Filters */}
      <div className="bg-white shadow-card rounded-card p-6 w-full">
        <BatchJobsFilters
          selectedExecutionStatus={selectedExecutionStatus}
          selectedResultStatus={selectedResultStatus}
          startDate={startDate}
          endDate={endDate}
          onExecutionStatusChange={setSelectedExecutionStatus}
          onResultStatusChange={setSelectedResultStatus}
          onStartDateChange={setStartDate}
          onEndDateChange={setEndDate}
          loading={loadingRef.current}
        />
      </div>

      {/* Main Content */}
      <div className="bg-white shadow-card rounded-card p-6 w-full">
        {error && (
          <div className="rounded-card border border-red-200 bg-red-50/50 px-4 py-3 mb-4" role="alert">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {loadingRef.current && jobs.length === 0 && (
          <div className="text-center py-8">
            <div className="flex justify-center">
              <Spin size="large" />
              <span className="ml-3">Loading jobs...</span>
            </div>
          </div>
        )}

        {!loadingRef.current && jobs.length === 0 && !error && (
          <div className="text-center py-8 text-sm text-secondary-500">
            No batch jobs found.
          </div>
        )}

        {jobs.length > 0 && (
          <>
            <BatchJobsTable
              jobs={jobs}
              onViewDetails={(job) => {
                setSelectedJob(job);
                setIsModalOpen(true);
              }}
            />

            {/* Always show pagination when we have jobs */}
            {jobs.length > 0 && (
              <div className="mt-6 flex items-center justify-between">
                <div className="flex-1 flex justify-between items-center">
                  <p className="text-sm text-secondary-600">
                    Showing {Math.min((currentPage - 1) * pageSize + 1, totalCount || jobs.length)} - {Math.min(currentPage * pageSize, totalCount || jobs.length)} of {totalCount || jobs.length} results
                  </p>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handlePageChange(1)}
                      disabled={currentPage === 1 || loading}
                      className="px-3 py-2 rounded-lg border border-secondary-200 text-sm font-medium text-secondary-700 hover:bg-secondary-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      First
                    </button>
                    
                    <button
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1 || loading}
                      className="px-3 py-2 rounded-lg border border-secondary-200 text-sm font-medium text-secondary-700 hover:bg-secondary-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>

                    {(() => {
                      const pages = [];
                      const maxButtons = 5;
                      let start = Math.max(1, currentPage - Math.floor(maxButtons / 2));
                      let end = Math.min(start + maxButtons - 1, totalPages);

                      // Adjust start if we're at the end
                      if (end === totalPages) {
                        start = Math.max(1, end - maxButtons + 1);
                      }

                      // Show dots at start if needed
                      if (start > 1) {
                        pages.push(
                          <span key="start-dots" className="px-2 py-2 text-secondary-500">...</span>
                        );
                      }

                      // Page numbers
                      for (let i = start; i <= end; i++) {
                        pages.push(
                          <button
                            key={i}
                            onClick={() => handlePageChange(i)}
                            disabled={loading || (i > currentPage && !cursor)}
                            className={`px-3 py-2 rounded-lg border text-sm font-medium ${
                              i === currentPage
                                ? 'bg-primary-600 text-white border-primary-600'
                                : 'border-secondary-200 text-secondary-700 hover:bg-secondary-50'
                            }`}
                          >
                            {i}
                          </button>
                        );
                      }

                      // Show dots at end if needed
                      if (end < totalPages) {
                        pages.push(
                          <span key="end-dots" className="px-2 py-2 text-secondary-500">...</span>
                        );
                      }

                      return pages;
                    })()}

                    <button
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages || loading || !cursor}
                      className="px-3 py-2 rounded-lg border border-secondary-200 text-sm font-medium text-secondary-700 hover:bg-secondary-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                    
                    <button
                      onClick={() => handlePageChange(totalPages)}
                      disabled={currentPage === totalPages || loading}
                      className="px-3 py-2 rounded-lg border border-secondary-200 text-sm font-medium text-secondary-700 hover:bg-secondary-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Last
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* Job Details Modal */}
        <BatchJobDetailsModal
          job={selectedJob}
          open={isModalOpen}
          onClose={() => {
            setSelectedJob(null);
            setIsModalOpen(false);
          }}
        />
      </div>
    </div>
  );
};

export default BatchJobsTab;