// src/components/BatchJobsTab/components/BatchJobsTable.tsx
import React, { useState } from 'react';
import { BatchClassificationResult } from '../../../api/types';
import { JobStatusDisplay } from './JobStatusDisplay';
import { downloadJobReport, DownloadFormat } from '../utils/csvGenerator';

interface BatchJobsTableProps {
    jobs: BatchClassificationResult[];
    onViewDetails: (job: BatchClassificationResult) => void;
}

export const BatchJobsTable: React.FC<BatchJobsTableProps> = ({ jobs, onViewDetails }) => {
    // Track open dropdown state for each job
    const [openDropdown, setOpenDropdown] = useState<string | null>(null);

    // Handle download with specified format
    const handleDownload = (job: BatchClassificationResult, format: DownloadFormat) => {
        // No longer need to normalize keys - we want to preserve decimal suffixes
        downloadJobReport(job, format);
        setOpenDropdown(null); // Close dropdown after action
    };

    // Toggle dropdown visibility
    const toggleDropdown = (jobId: string) => {
        setOpenDropdown(openDropdown === jobId ? null : jobId);
    };

    return (
        <div className="overflow-x-auto rounded-card border border-secondary-200 mb-6">
            <table className="min-w-full divide-y divide-secondary-200">
                <thead className="bg-secondary-50">
                    <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">Job ID</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">System</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">Exec. Status</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">Result Status</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">Created</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider w-52">Progress</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">Summary</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">Actions</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-secondary-200">
                    {jobs.map((job) => (
                        <tr key={job.id} className="hover:bg-secondary-50">
                            {/* Job ID */}
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-secondary-900 font-mono">{job.id}</td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-secondary-900">
                                {(job.system_code) ? (
                                    <div className="flex flex-col">
                                        <span className="font-medium">{job.system_code}</span>
                                    </div>
                                ) : (
                                    <span className="text-secondary-400">N/A</span>
                                )}
                            </td>
                            {/* Execution Status, Result Status, Created, Progress, Summary (rendered by JobStatusDisplay) */}
                            <JobStatusDisplay job={job} />
                            {/* Actions */}
                            <td className="px-4 py-4 whitespace-nowrap text-sm">
                                <div className="flex space-x-2">
                                    <button
                                        onClick={() => onViewDetails(job)}
                                        className="btn btn-secondary py-1 px-2 text-xs" // Use global style
                                        aria-label={`View details for job ${job.id}`}
                                    > View </button>
                                    
                                    {/* Download Dropdown */}
                                    <div className="relative">
                                        <button
                                            onClick={() => toggleDropdown(job.id)}
                                            disabled={job.status === 'pending' || job.status === 'processing'}
                                            className="btn btn-secondary py-1 px-2 text-xs text-green-600 border-green-200 hover:bg-green-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                                            aria-label={`Download options for job ${job.id}`}
                                            aria-expanded={openDropdown === job.id}
                                            aria-haspopup="true"
                                        >
                                            Download
                                            <svg className="ml-1 -mr-1 h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a 1 1 0 010-1.414z" clipRule="evenodd" />
                                            </svg>
                                        </button>
                                        
                                        {/* Dropdown Menu - Increased width from w-48 to w-64 (33% wider) */}
                                        {openDropdown === job.id && (
                                            <div 
                                                className="origin-top-right absolute right-0 mt-2 w-64 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 divide-y divide-gray-100 focus:outline-none z-10"
                                                role="menu"
                                                aria-orientation="vertical"
                                                aria-labelledby="download-options-menu"
                                            >
                                                <div className="py-1" role="none">
                                                    <button
                                                        onClick={() => handleDownload(job, 'simple')}
                                                        className="text-gray-700 block w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
                                                        role="menuitem"
                                                    >
                                                        Basic (without LLM responses)
                                                    </button>
                                                    <button
                                                        onClick={() => handleDownload(job, 'full')}
                                                        className="text-gray-700 block w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
                                                        role="menuitem"
                                                    >
                                                        Complete (with LLM responses)
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};