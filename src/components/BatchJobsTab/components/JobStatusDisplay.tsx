// src/components/BatchJobsTab/components/JobStatusDisplay.tsx
import React from 'react';
import { BatchClassificationResult } from '../../../api/types';
import { getExecutionStatus, calculateResultStatus, isSuccessfulItem, isFailedItem, isPartialItem } from '../utils/batchJobUtils';
import { ExecutionStatusType, ResultStatusType } from '../utils/batchJobUtils';
import { formatDate } from '../../../utils/dateFormat';

interface JobStatusDisplayProps { job: BatchClassificationResult; }

// Execution Status Badge Component
export const ExecutionStatusBadge: React.FC<{ status: ExecutionStatusType }> = ({ status }) => {
    const styles: Record<ExecutionStatusType, string> = {
        pending: "bg-blue-100 text-blue-800 border-blue-200",
        processing: "bg-yellow-100 text-yellow-800 border-yellow-200 animate-pulse",
        completed: "bg-green-100 text-green-800 border-green-200",
        error: "bg-red-100 text-red-800 border-red-200"
    };
    const labels: Record<ExecutionStatusType, string> = {
        pending: "Pending",
        processing: "Processing",
        completed: "Completed",
        error: "Error"
    };
    const style = styles[status];
    const label = labels[status];
    return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${style}`}>{label}</span>;
};

// Result Status Badge Component
export const ResultStatusBadge: React.FC<{ status: ResultStatusType }> = ({ status }) => {
    if (status === 'N/A') {
        return <span className="text-xs text-gray-400 italic">N/A</span>;
    }
    const styles: Record<Exclude<ResultStatusType, 'N/A'>, string> = {
        successful: "bg-green-100 text-green-800 border-green-200",
        partial: "bg-orange-100 text-orange-800 border-orange-200",
        failed: "bg-red-100 text-red-800 border-red-200"
    };
    const labels: Record<Exclude<ResultStatusType, 'N/A'>, string> = {
        successful: "Successful",
        partial: "Partial",
        failed: "Failed"
    };
    const style = styles[status];
    const label = labels[status];
    return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${style}`}>{label}</span>;
};

// Renders the progress bar and text
const ProgressInfo: React.FC<{ job: BatchClassificationResult }> = ({ job }) => {
    const resultsArray = job.results || job.Results || [];
    
    // Access the totalItems property from the API response
    const totalItems = job.totalItems ?? 0;
    
    // Access processedItems from the API response, fall back to counting if not available
    const processedItems = job.processedItems ?? resultsArray.filter(r => r.result || r.error).length;
    
    console.log('Job object in ProgressInfo:', job);
    console.log('Total items detected:', totalItems);
    console.log('Processed items detected:', processedItems);
    
    // Use totalItems, or fall back to array length if not available
    const total = totalItems > 0 ? totalItems : resultsArray.length;
    
    if (total === 0) return <div className="text-xs text-secondary-500">No items</div>;
    
    // Use the processed items count from the API if available
    const processed = processedItems;
    const success = resultsArray.filter(isSuccessfulItem).length;
    const partial = resultsArray.filter(isPartialItem).length;
    const failed = processed - success - partial;

    // Calculate success rate based on fully successful items
    const successRate = processed > 0 ? Math.round((success / processed) * 100) : 0;

    // Calculate partial success rate
    const partialRate = processed > 0 ? Math.round((partial / processed) * 100) : 0;

    // Determine overall success rate description
    const successRateDescription = () => {
        const combinedSuccessRate = successRate + (partialRate / 2); // Count partials as half successful for color determination
        if (combinedSuccessRate >= 80) return 'text-green-600';
        if (combinedSuccessRate >= 50) return 'text-orange-600';
        return 'text-red-600';
    };

    const executionStatus = getExecutionStatus(job);

    if (executionStatus === 'pending') {
        return (
            <div className="space-y-1">
                <div className="flex justify-between mb-1 text-xs">
                    <span>0/{total} items</span>
                    <span className="text-secondary-500">0% success</span>
                </div>
                <div className="w-full bg-secondary-200 rounded-full h-2">
                    <div className="bg-blue-500 h-full" style={{ width: '0%' }} />
                </div>
                <div className="text-xs text-blue-600 text-right">Waiting...</div>
            </div>
        );
    }

    // Calculate width percentages for the progress bar
    const successWidth = (success / total) * 100;
    const partialWidth = (partial / total) * 100;
    const failedWidth = (failed / total) * 100;
    const pendingWidth = ((total - processed) / total) * 100;

    return (
        <div className="space-y-1">
            <div className="flex justify-between mb-1 text-xs">
                <span>{processed}/{total} processed</span>
                {processed > 0 && (
                    <span className={successRateDescription()}>
                        {successRate}% success {partial > 0 ? `(+${partialRate}% partial)` : ''}
                    </span>
                )}
            </div>
            <div className="w-full bg-secondary-200 rounded-full h-2 relative overflow-hidden">
                {/* Success segment (green) */}
                {success > 0 && (
                    <div 
                        className="absolute top-0 left-0 bg-green-500 h-full transition-width duration-500 ease-out" 
                        style={{ width: `${successWidth}%` }} 
                    />
                )}
                
                {/* Partial segment (orange) */}
                {partial > 0 && (
                    <div 
                        className="absolute top-0 bg-orange-500 h-full transition-width duration-500 ease-out" 
                        style={{ left: `${successWidth}%`, width: `${partialWidth}%` }} 
                    />
                )}
                
                {/* Failed segment (red) */}
                {failed > 0 && (
                    <div 
                        className="absolute top-0 bg-red-500 h-full transition-width duration-500 ease-out" 
                        style={{ left: `${successWidth + partialWidth}%`, width: `${failedWidth}%` }} 
                    />
                )}
                
                {/* Processing segment (yellow pulse) */}
                {executionStatus === 'processing' && processed < total && (
                    <div 
                        className="absolute top-0 bg-yellow-400 h-full animate-pulse" 
                        style={{ left: `${(processed / total) * 100}%`, width: `${pendingWidth}%` }} 
                    />
                )}
            </div>
            {executionStatus === 'processing' && <div className="text-xs text-yellow-600 text-right">Processing...</div>}
            {executionStatus === 'completed' && calculateResultStatus(job) === 'successful' && 
                <div className="text-xs text-green-600 text-right">Successfully Completed</div>}
            {executionStatus === 'completed' && calculateResultStatus(job) === 'partial' && 
                <div className="text-xs text-orange-600 text-right">Partially Successful</div>}
            {executionStatus === 'completed' && calculateResultStatus(job) === 'failed' && 
                <div className="text-xs text-red-600 text-right">Failed</div>}
        </div>
    );
};

// Renders a summary of counts
const JobSummary: React.FC<{ job: BatchClassificationResult }> = ({ job }) => {
    const resultsArray = job.results || job.Results || [];
    
    // Access the totalItems property, but handle the case where the server sends it as total_items
    const totalItems = job.totalItems ?? (job as any).total_items;
    
    console.log('Job object in JobSummary:', job);
    console.log('Total items detected in summary:', totalItems);
    
    // Use totalItems, or fall back to array length if not available
    const total = totalItems ?? resultsArray.length;
    
    if (total === 0) return <div className="text-xs text-secondary-500">No items</div>;
    
    const success = resultsArray.filter(isSuccessfulItem).length;
    const partial = resultsArray.filter(isPartialItem).length;
    const failed = resultsArray.filter(isFailedItem).length;
    const processed = resultsArray.filter(r => r.result || r.error).length;
    const pending = total - processed;
    
    const executionStatus = getExecutionStatus(job);

    return (
        <div className="text-xs text-secondary-600 space-y-0.5">
            <div>Total: <span className="font-medium">{total}</span></div>
            <div className="text-green-600">Success: <span className="font-medium">{success}</span></div>
            {partial > 0 && (
                <div className="text-orange-600">Partial: <span className="font-medium">{partial}</span></div>
            )}
            <div className="text-red-600">Failed: <span className="font-medium">{failed}</span></div>
            {(executionStatus === 'pending' || executionStatus === 'processing') && pending > 0 && 
                <div className="text-yellow-600">Pending: <span className="font-medium">{pending}</span></div>}
            {processed > 0 && (
                <div className="text-secondary-500 pt-1">
                    Success Rate: <span className="font-medium">{Math.round((success / processed) * 100)}%</span>
                    {partial > 0 && (
                        <> (+<span className="font-medium">{Math.round((partial / processed) * 100)}%</span> partial)</>
                    )}
                </div>
            )}
        </div>
    );
};

// Combined component to render multiple cells related to status/progress
export const JobStatusDisplay: React.FC<JobStatusDisplayProps> = ({ job }) => {
    const executionStatus = getExecutionStatus(job);
    const resultStatus = calculateResultStatus(job);

    return (
        <>
            {/* Execution Status Cell */}
            <td className="px-4 py-4 whitespace-nowrap text-sm">
                <ExecutionStatusBadge status={executionStatus} />
            </td>
            {/* Result Status Cell */}
            <td className="px-4 py-4 whitespace-nowrap text-sm">
                <ResultStatusBadge status={resultStatus} />
            </td>
            {/* Created Date Cell */}
            <td className="px-4 py-4 whitespace-nowrap text-sm text-secondary-600">
                <span title={formatDate(job.timestamp).fullText}>
                    {formatDate(job.timestamp).displayText}
                </span>
            </td>
            {/* Progress Info Cell */}
            <td className="px-4 py-4 text-sm w-52">
                <ProgressInfo job={job} />
            </td>
            {/* Summary Info Cell */}
            <td className="px-4 py-4 text-sm">
                <JobSummary job={job} />
            </td>
        </>
    );
};