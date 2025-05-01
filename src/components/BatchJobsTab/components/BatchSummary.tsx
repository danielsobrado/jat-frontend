// src/components/BatchJobsTab/components/BatchSummary.tsx
import React, { useMemo } from 'react';
import { Button } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';
import { BatchClassificationResult } from '../../../api/types';
import { isSuccessfulItem, isFailedItem, isPartialItem } from '../utils/batchJobUtils';

interface BatchSummaryProps {
  batchJob: BatchClassificationResult;
  onViewDetails: () => void;
}

export const BatchSummary: React.FC<BatchSummaryProps> = ({ batchJob, onViewDetails }) => {
  const resultsArray = batchJob.results || [];
  const totalItems = resultsArray.length;

  // Calculate counts using our utility functions
  const successCount = useMemo(() => resultsArray.filter(isSuccessfulItem).length, [resultsArray]);
  const partialCount = useMemo(() => resultsArray.filter(isPartialItem).length, [resultsArray]);
  const failedCount = useMemo(() => resultsArray.filter(isFailedItem).length, [resultsArray]);

  // Calculate success and failure rates
  const successRate = totalItems > 0 ? Math.round((successCount / totalItems) * 100) : 0;
  const partialRate = totalItems > 0 ? Math.round((partialCount / totalItems) * 100) : 0;
  const failedRate = totalItems > 0 ? Math.round((failedCount / totalItems) * 100) : 0;

  // Function to split multi-keys into array (separated by |)
  const splitMultiKey = (key: string = ''): string[] => {
    if (!key) return [''];
    return key.split('|').map(k => k.trim());
  };

  // Determines the maximum number of key parts across all items
  const getMaxKeyParts = (results: any[]): number => {
    let maxParts = 1; // Default to at least one key column
    
    for (const item of results) {
      if (item.key) {
        const keyParts = splitMultiKey(item.key);
        maxParts = Math.max(maxParts, keyParts.length);
      }
    }
    
    return maxParts;
  };

  const handleExportCSV = () => {
    // Prepare the CSV data
    let headers = ['Item Number', 'Description', 'Additional Context', 'Status', 'Error'];
    
    // Check if keys exist in the data
    const hasKeys = resultsArray.some(r => r.key);
    const maxKeyParts = hasKeys ? getMaxKeyParts(resultsArray) : 0;
    
    // Add key columns if needed
    if (hasKeys && maxKeyParts > 0) {
      const keyHeaders = Array.from({ length: maxKeyParts }, (_, i) => `Key_${i+1}`);
      headers = [...keyHeaders, ...headers];
    }
    
    // Add category levels for UNSPSC or Common Categories
    const systemCode = batchJob.system_code || '';
    if (systemCode.toUpperCase().includes('UNSPSC')) {
      headers = [...headers, 'Segment Code', 'Segment Name', 'Family Code', 'Family Name', 
                 'Class Code', 'Class Name', 'Commodity Code', 'Commodity Name'];
    } else {
      headers = [...headers, 'SUBCAT1 Code', 'SUBCAT1 Name', 'SUBCAT2 Code', 'SUBCAT2 Name'];
    }
    
    // Convert data to CSV format
    const csvContent = [
      headers.join(','),
      ...resultsArray.map((item, index) => {
        // Determine item status
        let status = 'Failed';
        if (isSuccessfulItem(item)) {
          status = 'Success';
        } else if (isPartialItem(item)) {
          status = 'Partial';
        }
        
        // Get level data if available
        const levels = item.result?.levels || {};
        
        // Format description and context - escape quotes and commas
        const escapedDescription = item.description ? `"${item.description.replace(/"/g, '""')}"` : '';
        const escapedContext = item.additional_context ? `"${item.additional_context.replace(/"/g, '""')}"` : '';
        
        // Format error - escape quotes and commas
        const error = item.error || item.result?.error || '';
        const errorText = typeof error === 'string' ? error : (error?.message || '');
        const escapedError = errorText ? `"${errorText.replace(/"/g, '""')}"` : '';
        
        const row = [];
        
        // Add key parts if needed
        if (hasKeys && maxKeyParts > 0) {
          const keyParts = splitMultiKey(item.key || '');
          // Fill in key columns - add empty strings for missing parts
          for (let i = 0; i < maxKeyParts; i++) {
            row.push(keyParts[i] || '');
          }
        }
        
        // Add standard fields
        row.push(index + 1);
        row.push(escapedDescription);
        row.push(escapedContext);
        row.push(status);
        row.push(escapedError);
        
        // Extract level data based on system
        if (systemCode.toUpperCase().includes('UNSPSC')) {
          // UNSPSC system
          const segment = levels.segment || {};
          const family = levels.family || {};
          const classLevel = levels.class || {};
          const commodity = levels.commodity || {};
          
          row.push(segment.code || '');
          row.push(`"${(segment.name || '').replace(/"/g, '""')}"`);
          row.push(family.code || '');
          row.push(`"${(family.name || '').replace(/"/g, '""')}"`);
          row.push(classLevel.code || '');
          row.push(`"${(classLevel.name || '').replace(/"/g, '""')}"`);
          row.push(commodity.code || '');
          row.push(`"${(commodity.name || '').replace(/"/g, '""')}"`);
        } else {
          // Common Categories system
          const subcat1 = levels.SUBCAT1 || {};
          const subcat2 = levels.SUBCAT2 || {};
          
          row.push(subcat1.code || '');
          row.push(`"${(subcat1.name || '').replace(/"/g, '""')}"`);
          row.push(subcat2.code || '');
          row.push(`"${(subcat2.name || '').replace(/"/g, '""')}"`);
        }
        
        return row.join(',');
      })
    ].join('\n');
    
    // Create and trigger download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `batch-results-${batchJob.id}-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-white rounded-md border border-secondary-200 shadow-card p-6">
      <div className="flex justify-between mb-6">
        <h3 className="text-lg font-semibold text-secondary-900">Batch Results</h3>
        <div className="flex gap-3">
          <Button
            icon={<DownloadOutlined />}
            onClick={handleExportCSV}
          >
            Export CSV
          </Button>
          <Button type="primary" onClick={onViewDetails}>
            View Details
          </Button>
        </div>
      </div>
      
      <div className="mb-6">
        <div className="h-3 w-full rounded-full bg-secondary-100 overflow-hidden">
          <div className="h-full bg-green-500" style={{ width: `${successRate}%`, float: 'left' }}></div>
          <div className="h-full bg-yellow-500" style={{ width: `${partialRate}%`, float: 'left' }}></div>
          <div className="h-full bg-red-500" style={{ width: `${failedRate}%`, float: 'left' }}></div>
        </div>
        <div className="flex justify-between mt-1 text-sm">
          <span className="text-green-600 font-medium">{successCount} successful ({successRate}%)</span>
          {partialCount > 0 && (
            <span className="text-yellow-600 font-medium">{partialCount} partial ({partialRate}%)</span>
          )}
          <span className="text-red-600 font-medium">{failedCount} failed ({failedRate}%)</span>
        </div>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Successful Items */}
        <div className="rounded-md bg-green-50 p-4">
          <div className="text-sm font-medium text-green-700 mb-1">Successful</div>
          <div className="text-2xl font-semibold text-green-600">{successCount}</div>
          <div className="text-xs text-green-600 mt-1">Items classified with all levels</div>
        </div>
        
        {/* Partial Items */}
        <div className="rounded-md bg-yellow-50 p-4">
          <div className="text-sm font-medium text-yellow-700 mb-1">Partial</div>
          <div className="text-2xl font-semibold text-yellow-600">{partialCount}</div>
          <div className="text-xs text-yellow-600 mt-1">Items classified with some levels</div>
        </div>
        
        {/* Failed Items */}
        <div className="rounded-md bg-red-50 p-4">
          <div className="text-sm font-medium text-red-700 mb-1">Failed</div>
          <div className="text-2xl font-semibold text-red-600">{failedCount}</div>
          <div className="text-xs text-red-600 mt-1">Items that could not be classified</div>
        </div>
      </div>
    </div>
  );
};