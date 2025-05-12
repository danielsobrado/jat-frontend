// src/components/BatchJobsTab/BatchJobDetailsModal.tsx
import React, { useMemo, useCallback, useRef, useEffect, memo } from 'react';
import { Modal, Typography } from 'antd';
// Import necessary types from your API types file
import { BatchClassificationResult, BatchItemResult, CategoryLevel } from '../../api/types'; // Ensure CategoryLevel is imported if used
import { 
    getExecutionStatus, 
    calculateResultStatus, 
    getFormattedErrorMessage,
    isSuccessfulItem,
    isFailedItem,
    isPartialItem,
    isProcessedItem
} from './utils/batchJobUtils'; // Import all utility functions
import { ExecutionStatusBadge, ResultStatusBadge } from './components/JobStatusDisplay'; // Assuming these exist
import './BatchJobDetailsModal.css'; // Assuming this exists

// Define Props Interface
interface BatchJobDetailsModalProps {
  job: BatchClassificationResult | null;
  open: boolean;
  onClose: () => void;
}

// Keyboard keys constant
const KEYS = {
  ESCAPE: 'Escape',
  TAB: 'Tab'
} as const;

const formatDuration = (ms: number): string => {
  if (isNaN(ms)) return 'N/A'; // Handle potential NaN
  const seconds = Math.floor(Math.abs(ms) / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  if (seconds >= 0) return `${seconds}s`; // Ensure non-negative seconds are shown
  return '0s'; // Default if calculation is odd
};

const formatDateTime = (dateInput: string | Date | undefined | null): string => {
    if (!dateInput) return 'N/A';
    try {
        const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
        if (isNaN(date.getTime())) { // Check if date is valid
           console.warn("Attempted to format invalid date:", dateInput);
           return 'Invalid Date';
        }
        return date.toLocaleString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    } catch (e) {
        console.error("Error formatting date:", dateInput, e);
        return 'Error';
    }
};


// Component Definition
const BatchJobDetailsModalComponent = ({ job, open, onClose }: BatchJobDetailsModalProps): JSX.Element | null => {
  // Early return if no job or modal not open
  if (!job || !open) return null;

  // Refs for focus management
  const modalRef = useRef<HTMLDivElement>(null);
  const lastFocusedElementRef = useRef<HTMLElement | null>(null);

  // Compute timing information safely
  const timingInfo = useMemo(() => {
        if (!job?.timestamp) {
            return { startTime: 'N/A', endTime: 'N/A', duration: 'N/A' };
        }

        const startTime = new Date(job.timestamp);
        const endTime = job.updated_at ? new Date(job.updated_at) : new Date(); // Use updated_at if available, otherwise fallback to current time.

        const duration = endTime.getTime() - startTime.getTime();

        // Format results
        const formattedStartTime = formatDateTime(startTime);
        const formattedEndTime = formatDateTime(endTime);
        const formattedDuration = formatDuration(duration);

        return {
            startTime: formattedStartTime,
            endTime: formattedEndTime,
            duration: formattedDuration,
        };
    }, [job]);

  // Effect for focus trapping when modal opens/closes
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (open) {
      lastFocusedElementRef.current = document.activeElement as HTMLElement;
      // Use timeout to ensure modal is fully rendered before focusing
      timer = setTimeout(() => {
          // Check if modalRef.current exists before focusing
          const modalContent = modalRef.current?.querySelector('.ant-modal-content');
          if (modalContent instanceof HTMLElement) {
              modalContent.focus();
          } else {
              modalRef.current?.focus(); // Fallback to modal wrapper
          }
      }, 100);

    } else if (lastFocusedElementRef.current) {
      // Ensure the element still exists and is focusable before focusing
      if (document.body.contains(lastFocusedElementRef.current) && typeof lastFocusedElementRef.current.focus === 'function') {
          lastFocusedElementRef.current.focus();
      }
      lastFocusedElementRef.current = null; // Clear ref after restoring focus or if it's no longer valid
    }
    // Cleanup timer on unmount or when 'open' changes
    return () => clearTimeout(timer);
  }, [open]);

  // Effect for handling keydown events (Escape, Tab)
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => { // Add type to event
    switch (e.key) {
      case KEYS.ESCAPE:
        onClose(); // Call the passed onClose function
        break;
      case KEYS.TAB:
        // Focus trapping logic
        if (modalRef.current) {
            // Query within the modalRef element
            const focusableElements = modalRef.current.querySelectorAll<HTMLElement>(
              'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
            );
            if (focusableElements.length > 0) {
              const firstElement = focusableElements[0];
              const lastElement = focusableElements[focusableElements.length - 1];
              const currentActive = document.activeElement as HTMLElement; // Get currently focused element

              if (e.shiftKey) { // Shift + Tab
                if (currentActive === firstElement || !modalRef.current.contains(currentActive)) {
                    // If focus is on the first element or outside the modal, wrap to last
                    e.preventDefault();
                    lastElement.focus();
                }
              } else { // Tab
                 if (currentActive === lastElement || !modalRef.current.contains(currentActive)) {
                    // If focus is on the last element or outside the modal, wrap to first
                    e.preventDefault();
                    firstElement.focus();
                 }
              }
              // Allow normal tab behavior within the modal otherwise
            }
        }
        break;
    }
  }, [onClose]); // Dependency array is correct

  // --- Render Helper Functions ---
  const renderSummary = useCallback(() => {
    const resultsArray = job.results || [];    // Filter to show only processed items, rely on server count if available
    const processedCount = job.processedItems !== undefined ? job.processedItems : resultsArray.filter(isProcessedItem).length;
    const processedResults = resultsArray.filter(isProcessedItem);

    // Use refined utils for counting on processed items only
    const successItems = processedResults.filter(isSuccessfulItem).length;
    const partialItems = processedResults.filter(isPartialItem).length;
    const failedItems = processedResults.filter(isFailedItem).length;

    return (
      <div className="mb-6 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-md bg-green-50 p-4 text-center sm:text-left">
            <div className="text-sm font-medium text-green-700">Successful</div>
            <div className="mt-1 text-2xl font-semibold text-green-600">{successItems}</div>
          </div>
          {/* Partial Count */}
          <div className="rounded-md bg-yellow-50 p-4 text-center sm:text-left">
            <div className="text-sm font-medium text-yellow-700">Partial</div>
            <div className="mt-1 text-2xl font-semibold text-yellow-600">{partialItems}</div>
          </div>
          <div className="rounded-md bg-red-50 p-4 text-center sm:text-left">
            <div className="text-sm font-medium text-red-700">Failed</div>
            <div className="mt-1 text-2xl font-semibold text-red-600">{failedItems}</div>
          </div>
        </div>
      </div>
    );
  }, [job]);

  const renderJobInfo = useCallback(() => {
    const executionStatus = getExecutionStatus(job);
    const resultStatus = calculateResultStatus(job);

    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-secondary-800">Job Information</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          <div className="p-3 bg-secondary-50 rounded-md">
            <div className="text-xs text-secondary-500 mb-1">Execution Status</div>
            <div className="flex items-center">
              <ExecutionStatusBadge status={executionStatus} />
            </div>
          </div>
          <div className="p-3 bg-secondary-50 rounded-md">
            <div className="text-xs text-secondary-500 mb-1">Result Status</div>
            <div className="flex items-center">
              <ResultStatusBadge status={resultStatus} />
            </div>
          </div>
          <div className="p-3 bg-secondary-50 rounded-md">
            <div className="text-xs text-secondary-500 mb-1">Created</div>
            <div className="text-sm text-secondary-700">{timingInfo.startTime}</div>
          </div>
          <div className="p-3 bg-secondary-50 rounded-md">
            <div className="text-xs text-secondary-500 mb-1">Completed</div>
            <div className="text-sm text-secondary-700">{timingInfo.endTime}</div>
          </div>
          <div className="p-3 bg-secondary-50 rounded-md">
            <div className="text-xs text-secondary-500 mb-1">Duration</div>
            <div className="text-sm text-secondary-700">{timingInfo.duration}</div>
          </div>          <div className="p-3 bg-secondary-50 rounded-md">
            <div className="text-xs text-secondary-500 mb-1">Batch Size</div>
            <div className="text-sm text-secondary-700">
              {(job.results || []).filter(isProcessedItem).length} / {(job.results || []).length} items processed
            </div>
          </div>
        </div>
      </div>
    );
  }, [job, timingInfo]);
  const renderResultDetails = useCallback(() => {
    const resultsArray = job.results || [];
    
    // Filter to only show processed items
    const processedResults = resultsArray.filter(isProcessedItem);
    
    if (!resultsArray.length) {
      return <div className="text-center py-8"><p className="text-secondary-600">No results available for this job yet.</p></div>;
    }
    
    if (!processedResults.length) {
      return <div className="text-center py-8"><p className="text-secondary-600">No processed items available yet. Processing is in progress.</p></div>;
    }    return (
      <div className="overflow-x-auto border border-secondary-200 rounded-md">
        <table className="min-w-full divide-y divide-secondary-200">
          <thead className="bg-secondary-50 sticky top-0 z-10"> {/* Make header sticky */}
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider w-2/5">Item Description & Context</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider w-auto">Status</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider w-3/5">Classification / Error</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-secondary-200">
            {processedResults.map((resultItem: BatchItemResult, index: number) => {
              // Determine individual item status using refined utils
              let status: 'Success' | 'Partial' | 'Failed' = 'Failed'; // Default to Failed
              let statusClass = 'bg-red-100 text-red-800 border-red-200';
              
              if (isSuccessfulItem(resultItem)) {
                status = 'Success';
                statusClass = 'bg-green-100 text-green-800 border-green-200';
              } else if (isPartialItem(resultItem)) {
                status = 'Partial';
                statusClass = 'bg-yellow-100 text-yellow-800 border-yellow-200';
              }
              // isFailedItem is implicitly covered by the default

              return (
                <tr key={index} className="hover:bg-secondary-50 align-top">
                  <td className="px-4 py-2 text-sm text-secondary-900">
                    <div className="font-medium">{resultItem.description || `Item ${index + 1}`}</div>
                    {/* Show key value if present */}
                    {resultItem.key && <p className="text-xs text-amber-700 font-medium mt-1 break-words">Key: {resultItem.key}</p>}
                    {resultItem.additional_context && (<p className="text-xs text-secondary-500 mt-1 break-words">Context: {resultItem.additional_context}</p>)}
                  </td>
                  <td className="px-4 py-2 text-sm">
                    {/* Use determined status and class */}
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${statusClass}`}>
                      {status}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-sm text-secondary-600">
                    {/* Display error OR classification */}
                    {isFailedItem(resultItem) ? (
                      <div className="text-red-600 whitespace-pre-wrap break-words">
                        {getFormattedErrorMessage(resultItem.error || resultItem.result?.error) || 'Classification failed'}
                      </div>
                    ) : resultItem.result ? (
                      <div className="text-sm space-y-1">
                        {Object.entries(resultItem.result.levels || {})
                          // Sort levels by logical order
                          .sort(([a], [b]) => {
                            const levelOrder: Record<string, number> = { 'segment': 1, 'family': 2, 'class': 3, 'commodity': 4, 'SUBCAT1': 1, 'SUBCAT2': 2 };
                            return (levelOrder[a] ?? 99) - (levelOrder[b] ?? 99);
                          })
                          .map(([levelCode, category]: [string, CategoryLevel | undefined]) => (
                            <div key={levelCode}>
                              <span className="font-medium text-secondary-700">{levelCode}:</span>{' '}
                              <span className="text-secondary-600">
                                {category ? `${category.code} - ${category.name}` : 'N/A'}
                                {/* Show level-specific error if present */}
                                {category?.error && (<span className="text-xs text-red-600 ml-2">({category.error})</span>)}
                              </span>
                            </div>
                          ))}
                        {/* Show partial status explanation if applicable */}
                        {status === 'Partial' && !getFormattedErrorMessage(resultItem.error || resultItem.result?.error) && (
                          <p className="text-xs text-yellow-700 mt-1 italic">Result is partial, check levels.</p>
                        )}
                        {/* Display RAG context if available */}
                        {resultItem.result?.ragContextUsed && (
                          <div className="mt-2 border-t border-secondary-200 pt-2">
                            <details className="text-xs">
                              <summary className="text-blue-600 cursor-pointer">RAG Context Used</summary>
                              <div className="mt-1 bg-blue-50 p-2 rounded text-secondary-700 whitespace-pre-wrap">
                                {resultItem.result.ragContext || 'No specific context text available.'}
                              </div>
                            </details>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-secondary-500">No classification data.</div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }, [job]);

  // --- Main Render ---
  return (
      <Modal
        title={
          <div className="flex items-center justify-between pr-4">
              <Typography.Title level={4} style={{ margin: 0, flexGrow: 1 }}>
                Batch Job Details
              </Typography.Title>
              <span className="text-sm text-secondary-600 font-mono">
                  ID: {job.id}
              </span>
          </div>
        }
        open={open} // Use 'open' prop for visibility (AntD v5+)
        onCancel={onClose} // Use the correct prop from Ant Design
        keyboard={true}     // Allow closing with ESC
        maskClosable={true} // Allow closing by clicking mask
        footer={null}       // No default footer buttons
        width={1000}        // Set desired width
        // Use 'styles' prop for new AntD versions v5+
        styles={{
            body: {
                maxHeight: 'calc(85vh - 120px)', // Adjust height calculation
                overflowY: 'auto', // Ensure vertical scroll
                padding: '24px' // Add padding to body
            },
            // Ensure header doesn't contribute to scroll height unnecessarily
            header: {
                padding: '16px 24px', // Standard AntD padding
                borderBottom: '1px solid #f0f0f0' // Standard AntD border
            },
            content: {
                padding: 0 // Reset padding if body padding is set
            }
        }}
        destroyOnClose={true} // Optional: Reset internal state when modal closes
        className="batch-details-modal" // Custom class for styling
        // The Modal component itself handles focus trapping. Ref and keydown on wrapper are for custom actions if needed.
        // ref={modalRef} // Not strictly needed for AntD modal focus trapping
        // onKeyDown={handleKeyDown} // Can attach here if Modal supports it, or use wrapper below
      >
          {/* Content Wrapper with Keydown Handler */}
          <div onKeyDown={handleKeyDown} tabIndex={-1} className="focus:outline-none">
             <div className="space-y-6">
                {renderSummary()}
                <div className="border-t border-secondary-200 pt-4">
                    {renderJobInfo()}
                </div>
                 <div className="border-t border-secondary-200 pt-4">                <div className="flex justify-between items-center mb-3">
                    <h3 className="text-lg font-semibold text-secondary-800">Results Breakdown</h3>                    <span className="text-sm text-secondary-500">
                        {`${job.processedItems !== undefined ? job.processedItems : (job.results || []).filter(isProcessedItem).length} of ${(job.results || []).length} items processed`}
                    </span>
                </div>
                    {renderResultDetails()}
                 </div>
             </div>
          </div>
      </Modal>
  );
};

export default memo(BatchJobDetailsModalComponent);