import React from 'react';
import { BatchClassificationResult, ClassificationError, BatchItemResult } from '../../api/types';
import { saveAs } from 'file-saver';
import { formatDate } from '../../utils/dateFormat';
import { 
  isSuccessfulItem, 
  isFailedItem, 
  isPartialItem 
} from '../BatchJobsTab/utils/batchJobUtils';

interface BatchSummaryProps {
  result: BatchClassificationResult;
  originalData: {
    headers: string[];
    rows: string[][];
  };
}

// Helper function to get error message from either string or ClassificationError
const getErrorMessage = (error: string | ClassificationError | undefined): string => {
  if (!error) return '';
  if (typeof error === 'string') return error;
  return error.message || 'Unknown error';
};

// Function to split multi-keys into array (separated by |)
const splitMultiKey = (key: string = ''): string[] => {
  if (!key) return [''];
  return key.split('|').map(k => k.trim());
};

// Determines the maximum number of key parts across all items
const getMaxKeyParts = (results: BatchItemResult[]): number => {
  let maxParts = 1; // Default to at least one key column
  
  for (const item of results) {
    if (item.key) {
      const keyParts = splitMultiKey(item.key);
      maxParts = Math.max(maxParts, keyParts.length);
    }
  }
  
  return maxParts;
};

const BatchSummary: React.FC<BatchSummaryProps> = ({ result, originalData }) => {
  const results = result.Results || result.results || [];
  const successCount = results.filter(r => isSuccessfulItem(r)).length;
  const partialCount = results.filter(r => isPartialItem(r)).length;
  const failureCount = results.filter(r => isFailedItem(r)).length;

  // Check if any result has a key field
  const hasKeys = results.some(r => r.key);
  // Calculate maximum number of key parts
  const maxKeyParts = hasKeys ? getMaxKeyParts(results) : 0;

  const downloadResults = () => {
    try {
      // Get level codes from the first successful result
      const firstSuccess = results.find(r => r.result);
      
      if (!firstSuccess || !firstSuccess.result) {
        alert('No successful results to download');
        return;
      }
      
      // Verify the levels object exists
      const levels = firstSuccess.result.levels || {};
      console.log('Levels found:', Object.keys(levels).join(', '));
      
      if (Object.keys(levels).length === 0) {
        alert('Warning: No classification levels found in the results');
      }
      
      // Define the level order (if available)
      const levelOrder: Record<string, number> = {
        'segment': 1,
        'family': 2,
        'class': 3,
        'commodity': 4
      };
      
      // Get all possible level codes
      const levelCodes = Object.keys(levels).sort((a, b) =>
        (levelOrder[a] ?? 999) - (levelOrder[b] ?? 999)
      );
      
      // Create a clean CSV with the right number of columns for each row
      
      // Step 1: Analyze original data to understand the structure
      console.log('Original headers length:', originalData.headers.length);
      
      // Step 2: Create CSV content manually to ensure perfect alignment
      // Start with building the header row
      let csvContent = '';
      
      // Add Key columns based on the maximum number of key parts found
      if (hasKeys) {
        for (let i = 0; i < maxKeyParts; i++) {
          csvContent += `Key_${i+1},`;
        }
      }
      
      // Add original headers
      for (let i = 0; i < originalData.headers.length; i++) {
        const header = originalData.headers[i];
        const escapedHeader = escapeCsvValue(header);
        csvContent += escapedHeader + ',';
      }
      
      // Add classification status
      csvContent += 'Classification_Status,';

      // Add RAG context column if any result uses RAG
      const useRagColumn = results.some(r => r.result?.ragContextUsed);
      if (useRagColumn) {
        csvContent += 'RAG_Context,';
      }
      
      // Add level headers
      for (const level of levelCodes) {
        csvContent += `${level}_Code,${level}_Name,`;
      }
      
      // Add error column and end the header row
      csvContent += 'Error\n';
      
      // Add data rows
      for (let rowIdx = 0; rowIdx < results.length; rowIdx++) {
        const res = results[rowIdx];
        const originalRow = rowIdx < originalData.rows.length 
          ? originalData.rows[rowIdx] 
          : Array(originalData.headers.length).fill('');
          
        // Add key fields if present - split by | and add to separate columns
        if (hasKeys) {
          const keyParts = splitMultiKey(res.key || '');
          // Fill in key columns - add empty strings for missing parts
          for (let i = 0; i < maxKeyParts; i++) {
            csvContent += escapeCsvValue(keyParts[i] || '') + ',';
          }
        }
        
        // Add original data cells
        for (let colIdx = 0; colIdx < originalData.headers.length; colIdx++) {
          const cellValue = colIdx < originalRow.length ? originalRow[colIdx] : '';
          csvContent += escapeCsvValue(cellValue) + ',';
        }
        
        // Add status using consistent logic
        let status = 'Failed';
        if (isSuccessfulItem(res)) {
          status = 'Success';
        } else if (isPartialItem(res)) {
          status = 'Partial';
        }
        csvContent += escapeCsvValue(status) + ',';

        // Add RAG context if applicable
        if (useRagColumn) {
          csvContent += escapeCsvValue(res.result?.ragContext || '') + ',';
        }
        
        // Add level values
        for (const level of levelCodes) {
          const levelData = res.result?.levels?.[level];
          csvContent += escapeCsvValue(levelData?.code || '') + ',';
          csvContent += escapeCsvValue(levelData?.name || '') + ',';
        }
        
        // Add error message, including both explicit errors and level-specific error cases
        let errorMessage = '';
        if (res.error) {
          errorMessage = getErrorMessage(res.error);
        } else if (res.result?.error) {
          errorMessage = getErrorMessage(res.result.error);
        } else if (!res.result) {
          errorMessage = 'No classification result received';
        } else if (Object.keys(res.result.levels || {}).length === 0) {
          errorMessage = 'No category levels found';
        } else if (isPartialItem(res)) {
          errorMessage = 'Partial classification, some levels missing';
        }
        csvContent += escapeCsvValue(errorMessage);
        
        // End the row
        if (rowIdx < results.length - 1) {
          csvContent += '\n';
        }
      }
      
      // Create timestamp for filename
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      
      // Create and download the file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
      saveAs(blob, `batch_classification_${timestamp}.csv`);
      
      console.log('Download initiated with file size:', blob.size, 'bytes');
      console.log('Multi-key columns used:', maxKeyParts);
    } catch (error) {
      console.error('Error generating CSV:', error);
      alert(`Error generating download: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };
  
  // Helper function to escape CSV values
  const escapeCsvValue = (value: any): string => {
    if (value === null || value === undefined) return '';
    
    const stringValue = String(value);
    const needsQuoting = stringValue.includes(',') || 
                        stringValue.includes('"') || 
                        stringValue.includes('\n') ||
                        stringValue.includes('\r');
    
    if (!needsQuoting) return stringValue;
    
    // Double up quotes and wrap in quotes
    return `"${stringValue.replace(/"/g, '""')}"`;
  };

  return (
    <div className="rounded-lg border border-secondary-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-secondary-900">Processing Complete</h3>
      
        <span 
          className="text-sm text-secondary-600" 
          title={formatDate(result.timestamp).fullText}
        >
          {formatDate(result.timestamp).displayText}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="rounded-md bg-green-50 p-4">
          <div className="text-green-800 text-sm font-medium">Successful</div>
          <div className="text-2xl font-bold text-green-600">{successCount}</div>
        </div>
        <div className="rounded-md bg-yellow-50 p-4">
          <div className="text-yellow-800 text-sm font-medium">Partial</div>
          <div className="text-2xl font-bold text-yellow-600">{partialCount}</div>
        </div>
        <div className="rounded-md bg-red-50 p-4">
          <div className="text-red-800 text-sm font-medium">Failed</div>
          <div className="text-2xl font-bold text-red-600">{failureCount}</div>
        </div>
      </div>

      <button
        onClick={downloadResults}
        className="w-full py-3 px-4 rounded-card text-white font-medium transition-colors bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
      >
        Download Results
      </button>

      {(failureCount > 0 || partialCount > 0) && (
        <div className="mt-4">
          <h4 className="text-sm font-medium text-secondary-900 mb-2">Items with Issues:</h4>
          <div className="max-h-40 overflow-y-auto">
            {results.map((res, idx) => {
              // Show failed and partial items
              if (!isFailedItem(res) && !isPartialItem(res)) return null;

              const isProblem = isFailedItem(res);
              const bgColor = isProblem ? 'bg-red-50' : 'bg-yellow-50';
              const textColor = isProblem ? 'text-red-600' : 'text-yellow-700';
              const statusText = isProblem ? 'Failed' : 'Partial';

              return (
                <div key={idx} className={`text-sm ${textColor} mb-2 p-2 ${bgColor} rounded-md`}>
                  <div className="font-medium flex justify-between">
                    <span>Row {idx + 1} - {statusText}</span>
                    {res.key && <span className="text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded">Key: {res.key}</span>}
                  </div>
                  <div className="text-xs mt-1">
                    <span className="font-medium">Description:</span> {res.description || `Item ${idx + 1}`}
                  </div>
                  <div className="text-xs mt-1">
                    <span className="font-medium">Issue:</span>{' '}
                    {res.error
                      ? getErrorMessage(res.error)
                      : res.result?.error
                      ? getErrorMessage(res.result.error)
                      : !res.result
                      ? 'Invalid classification result'
                      : isPartialItem(res)
                      ? 'Partial classification - some levels may be missing or have errors'
                      : 'Unknown issue'}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default BatchSummary;