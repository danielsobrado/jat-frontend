// src/components/BatchJobsTab/components/BatchJobsFilters.tsx
import React from 'react';
import { ExecutionStatusFilterType, ResultStatusFilterType } from '../utils/batchJobUtils';

interface BatchJobsFiltersProps {
    selectedExecutionStatus: ExecutionStatusFilterType;
    selectedResultStatus: ResultStatusFilterType;
    startDate: string;
    endDate: string;
    onExecutionStatusChange: (status: ExecutionStatusFilterType) => void;
    onResultStatusChange: (status: ResultStatusFilterType) => void;
    onStartDateChange: (date: string) => void;
    onEndDateChange: (date: string) => void;
    loading: boolean;
}

export const BatchJobsFilters: React.FC<BatchJobsFiltersProps> = ({
    selectedExecutionStatus,
    selectedResultStatus,
    startDate,
    endDate,
    onExecutionStatusChange,
    onResultStatusChange,
    onStartDateChange,
    onEndDateChange,
    loading
}) => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Execution Status Filter */}
            <div>
                <label htmlFor="execStatusFilter" className="block text-sm font-medium text-secondary-700 mb-1">
                    Exec. Status
                </label>
                <select
                    id="execStatusFilter"
                    className="input"
                    value={selectedExecutionStatus}
                    onChange={(e) => onExecutionStatusChange(e.target.value as ExecutionStatusFilterType)}
                    disabled={loading}
                >
                    <option value="all">All Execution</option>
                    <option value="pending">Pending</option>
                    <option value="processing">Processing</option>
                    <option value="completed">Completed</option>
                    <option value="error">Error</option>
                </select>
            </div>

            {/* Result Status Filter */}
            <div>
                <label htmlFor="resultStatusFilter" className="block text-sm font-medium text-secondary-700 mb-1">
                    Result Status
                </label>
                <select
                    id="resultStatusFilter"
                    className="input"
                    value={selectedResultStatus}
                    onChange={(e) => onResultStatusChange(e.target.value as ResultStatusFilterType)}
                    disabled={loading || selectedExecutionStatus === 'pending' || selectedExecutionStatus === 'processing'}
                >
                    <option value="all">All Results</option>
                    <option value="successful">Successful</option>
                    <option value="partial">Partial</option>
                    <option value="failed">Failed</option>
                </select>
            </div>

            {/* Start Date Filter */}
            <div>
                <label htmlFor="startDateFilter" className="block text-sm font-medium text-secondary-700 mb-1">
                    Start Date
                </label>
                <input
                    type="date"
                    id="startDateFilter"
                    className="input"
                    value={startDate}
                    onChange={(e) => onStartDateChange(e.target.value)}
                    max={endDate}
                    disabled={loading}
                />
            </div>

            {/* End Date Filter */}
            <div>
                <label htmlFor="endDateFilter" className="block text-sm font-medium text-secondary-700 mb-1">
                    End Date
                </label>
                <input
                    type="date"
                    id="endDateFilter"
                    className="input"
                    value={endDate}
                    onChange={(e) => onEndDateChange(e.target.value)}
                    min={startDate}
                    disabled={loading}
                />
            </div>
        </div>
    );
};