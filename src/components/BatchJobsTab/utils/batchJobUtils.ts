// src/components/BatchJobsTab/utils/batchJobUtils.ts
import { BatchClassificationResult, BatchItemResult, CategoryLevel, ClassificationError } from '../../../api/types';

// Define types for execution and result statuses
export type ExecutionStatusType = 'pending' | 'processing' | 'completed' | 'error';
export type ResultStatusType = 'successful' | 'partial' | 'failed' | 'N/A';
export type ExecutionStatusFilterType = 'all' | ExecutionStatusType;
export type ResultStatusFilterType = 'all' | Exclude<ResultStatusType, 'N/A'>;

// Function to check if a single classification level is valid (has code and name)
const isValidLevel = (level: CategoryLevel | undefined | null): boolean => {
    // Check if level exists, is an object, and has non-empty code and name strings
    return !!level &&
           typeof level === 'object' &&
           typeof level.code === 'string' && level.code.length > 0 &&
           typeof level.name === 'string' && level.name.length > 0;
};

// Function to ensure a key preserves decimal format (if it exists in original form)
export const preserveDecimalInKey = (key: string | undefined | null): string => {
    if (!key) return '';
    
    // If the key already ends with '.0', return it as is
    if (key.endsWith('.0')) return key;
    
    // Check if the key might be a normalized version of a decimal key (missing the .0)
    // Multi-part keys are typically delimited by pipe (|) character
    if (key.includes('|')) {
        const parts = key.split('|');
        // If the last part is a number without decimal, add .0 to restore original format
        const lastPart = parts[parts.length - 1];
        if (/^\d+$/.test(lastPart)) {
            parts[parts.length - 1] = `${lastPart}.0`;
            return parts.join('|');
        }
    }
    return key;
};

// Function to check if a result item represents a fully successful classification
export const isSuccessfulItem = (item: BatchItemResult | undefined | null): boolean => {
    if (!item || !item.result || item.error) {
        return false; // Explicit error or no result means not successful
    }
    // Check the explicit status from the backend result if available
    if (item.result.status === 'failed' || item.result.status === 'partial') {
        return false;
    }
    // Check if it has levels and at least one level is valid
    // A successful item should ideally have *all* expected levels, but for robustness,
    // let's stick to the backend 'success' status or having at least one valid level if status is missing.
    if (item.result.status === 'success') {
        return true;
    }
    // Fallback: If status is missing, consider successful if it has levels and at least one is valid
    return !!item.result.levels && Object.values(item.result.levels).some(isValidLevel);
};

// Function to check if a result item represents a failed classification attempt
export const isFailedItem = (item: BatchItemResult | undefined | null): boolean => {
    if (!item) return false; // If item doesn't exist, don't count as failed from this perspective
    if (item.error) return true; // Explicit top-level error means failure
    if (item.result && item.result.status === 'failed') {
        return true; // Explicit 'failed' status from backend result
    }
    // If there's a result object, but it contains no valid levels at all, treat as failure
    if (item.result && (!item.result.levels || Object.values(item.result.levels).length === 0 || Object.values(item.result.levels).every(level => !isValidLevel(level)))) {
         // Consider logging this case: console.warn('Treating item as failed due to no valid levels:', item);
        return true;
    }
    return false; // Otherwise, it's not considered a failure (could be success or partial)
};

// Function to check if a result item is partial
export const isPartialItem = (item: BatchItemResult | undefined | null): boolean => {
    if (!item || item.error) return false; // Cannot be partial if errored or non-existent
    if (!item.result) return false; // Cannot be partial without a result object

    // Explicit 'partial' status from backend is the clearest indicator
    if (item.result.status === 'partial') {
        return true;
    }

    // Implicit partial: If status isn't explicitly 'success' or 'failed',
    // and it's not considered a full failure (has *some* valid level),
    // but also not considered fully successful (e.g., missing some levels or backend didn't mark as 'success')
    // This relies heavily on the backend providing the status correctly.
    // For now, let's primarily rely on the explicit status or the derivation below.

    // Derive partial status if not explicitly set: Not fully successful AND not fully failed
    return !isSuccessfulItem(item) && !isFailedItem(item);
};


/**
 * Determines the Execution Status based on the job's top-level status field
 */
export const getExecutionStatus = (job: BatchClassificationResult): ExecutionStatusType => {
    // Handle potential case difference from backend ('Results' vs 'results')
    const resultsArray = job.results || job.Results || [];
    // Trust the totalItems from the backend, only add nullish coalescing for TypeScript safety
    const totalItems = job.totalItems ?? 0;
    const processedCount = resultsArray.filter(r => r.result || r.error).length;

    // Prioritize job-level status if available and valid
    if (job.status && ['pending', 'processing', 'completed', 'error'].includes(job.status)) {
        // Trust the server's status - don't override it
        return job.status as ExecutionStatusType;
    }

    // Infer status if job.status is missing or invalid
    if (totalItems === 0) return 'completed'; // Or 'error' if empty is unexpected
    if (processedCount === 0) return 'pending';
    if (processedCount < totalItems) return 'processing';
    return 'completed'; // All items have some result/error entry
};

/**
 * Calculates the Result Status based on the content of the results array for a finished job
 * Returns 'N/A' if the job execution is not finished
 */
export const calculateResultStatus = (job: BatchClassificationResult): ResultStatusType => {
    const executionStatus = getExecutionStatus(job);

    // Only return N/A for pending jobs - allow processing jobs to show interim result status
    if (executionStatus === 'pending') {
        return 'N/A';
    }

    const resultsArray = job.results || job.Results || [];
    
    // Take totalItems from backend if present, otherwise use array length
    // Use type assertion to handle the case where the server returns 'total_items'
    const serverTotalItems = job.totalItems ?? (job as any).total_items;
    const totalItems = serverTotalItems ?? resultsArray.length;

    // Handle empty results case
    if (resultsArray.length === 0) {
        return executionStatus === 'error' ? 'failed' : 'N/A';
    }

    // Count different result types
    let successCount = 0;
    let partialCount = 0;
    let failedCount = 0;

    for (const item of resultsArray) {
        if (isSuccessfulItem(item)) {
            successCount++;
        } else if (isFailedItem(item)) {
            failedCount++;
        } else {
            partialCount++;
        }
    }
    
    console.log(`Job ${job.id} status counts: S=${successCount}, F=${failedCount}, P=${partialCount}, Total=${totalItems}`);

    // Determine overall status based on processed items
    if (successCount === totalItems) {
        return 'successful';
    } else if (failedCount === totalItems) {
        return 'failed';
    } else if (successCount > 0 || partialCount > 0) {
        // If there's any success or partial success, it's partial overall
        return 'partial';
    } else {
        // If we have results but couldn't categorize them, default to failed
        return 'failed';
    }
};

// Helper function to get error message
export const getFormattedErrorMessage = (error: string | ClassificationError | undefined): string => {
    if (!error) return '';
    if (typeof error === 'string') return error;
    if (typeof error === 'object' && error !== null) {
        // Check for common error message structures
        if ('message' in error && typeof error.message === 'string') {
            return error.message;
        }
        if ('error' in error && typeof error.error === 'string') {
             return error.error;
        }
        // Attempt to stringify if specific fields aren't found
        try { return JSON.stringify(error); } catch { /* ignore stringify error */ }
    }
    return 'Unknown error format';
};