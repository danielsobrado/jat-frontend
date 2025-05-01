import React from 'react';
import { PreviewData, ColumnConfig } from './types';
import { BatchItemResult, ClassificationError } from '../../api/types';

interface PreviewTableProps {
  data: PreviewData;
  columnConfig: ColumnConfig | null;
  batchResults?: BatchItemResult[];
  isProcessing?: boolean;
}

const PreviewTable: React.FC<PreviewTableProps> = ({ data, columnConfig, batchResults, isProcessing }) => {
  const { headers, rows } = data;
  const previewRows = rows.slice(0, 5); // Show only first 5 rows

  // Generate keys for preview display
  const getGeneratedKey = (row: string[]): string => {
    if (!columnConfig || !columnConfig.keyColumns || columnConfig.keyColumns.length === 0) {
      return '';
    }
    
    const keyParts = columnConfig.keyColumns.map(keyCol => {
      const keyIndex = headers.indexOf(keyCol);
      return keyIndex >= 0 ? row[keyIndex] : '';
    }).filter(Boolean); // Remove empty values
    
    return keyParts.join('|'); // Join with pipe delimiter for multiple key parts
  };

  // Helper function to get error message from either string or ClassificationError
  const getErrorMessage = (error: string | ClassificationError | undefined): string => {
    if (!error) return '';
    if (typeof error === 'string') return error;
    return error.message || 'Unknown error';
  };

  const isHighlightedColumn = (header: string): boolean => {
    if (!columnConfig) return false;
    return (
      header === columnConfig.sourceColumn ||
      header === columnConfig.contextColumn ||
      columnConfig.keyColumns?.includes(header) || // Include key columns in highlighting
      columnConfig.resultColumns?.some(col =>
        col.codeColumn === header || col.nameColumn === header
      )
    );
  };

  const getColumnType = (header: string): string | null => {
    if (!columnConfig) return null;
    if (header === columnConfig.sourceColumn) return 'Source';
    if (header === columnConfig.contextColumn) return 'Context';
    if (columnConfig.keyColumns?.includes(header)) return 'Key'; // Identify key columns
    
    const resultCol = columnConfig.resultColumns?.find(
      col => col.codeColumn === header || col.nameColumn === header
    );
    if (resultCol) {
      return header === resultCol.codeColumn
        ? `${resultCol.levelName} Code`
        : `${resultCol.levelName} Name`;
    }
    
    return null;
  };

  const getCellClassName = (header: string): string => {
    const baseClass = 'px-4 py-2 whitespace-nowrap text-sm';
    
    if (!columnConfig) return `${baseClass} text-secondary-500`;
    
    // Special styling for key columns
    if (columnConfig.keyColumns?.includes(header)) {
      return `${baseClass} bg-amber-50 text-secondary-900 font-medium`;
    }
    
    if (isHighlightedColumn(header)) {
      return `${baseClass} bg-primary-50 text-secondary-900`;
    }
    
    return `${baseClass} text-secondary-500`;
  };

  const getHeaderClassName = (header: string): string => {
    const baseClass = 'px-4 py-2 text-left text-xs font-medium tracking-wider';
    
    if (!columnConfig) return `${baseClass} bg-secondary-50 text-secondary-500`;
    
    // Special styling for key columns
    if (columnConfig.keyColumns?.includes(header)) {
      return `${baseClass} bg-amber-50 text-amber-700`;
    }
    
    if (isHighlightedColumn(header)) {
      return `${baseClass} bg-primary-50 text-primary-700`;
    }
    
    return `${baseClass} bg-secondary-50 text-secondary-500`;
  };

  const getProcessingStatus = (index: number) => {
    if (!batchResults) return null;
    
    const result = batchResults[index];
    if (!result) return (
      isProcessing && (
      <div className="flex items-center space-x-2 text-secondary-600">
        <svg className="animate-pulse h-4 w-4" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
        </svg>
        <span className="ml-2">Waiting...</span>
      </div>
      )
    );

    // Check if the result is actually successful (has valid levels)
    const isSuccess = result.result?.levels && 
      Object.values(result.result.levels).some(level => level.code && level.name);

    // If it has a result but no valid levels, it's a failure
    if (result.result && !isSuccess) return (
      <div className="flex items-center space-x-2 text-red-600">
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span className="ml-2">Error: Invalid classification</span>
      </div>
    );

    if (result.error) return (
      <div className="flex items-center space-x-2 text-red-600">
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div className="flex flex-col">
          <span className="ml-2">Error</span>
          {result.error && (
            <span 
              className="ml-2 text-xs text-red-500 max-w-sm truncate" 
              title={getErrorMessage(result.error)}
            >
              {getErrorMessage(result.error)}
            </span>
          )}
        </div>
      </div>
    );

    if (isSuccess) return (
      <div className="flex items-center space-x-2 text-green-600">
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
        <span className="ml-2">Completed</span>
      </div>
    );

    return (
      isProcessing && (
      <div className="flex items-center space-x-2 text-primary-600">
        <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <span className="ml-2">Processing...</span>
      </div>
      )
    );
  };

  return (
    <div className="overflow-x-auto rounded-lg border border-secondary-200">
      <table className="min-w-full divide-y divide-secondary-200">
        <thead>
          <tr>
            {/* Processing Status column */}
            <th className="w-48 px-4 py-2 bg-secondary-50 text-left text-xs font-medium text-secondary-500 tracking-wider">Status</th>
            
            {/* Generated Key column - only show if key columns are selected */}
            {columnConfig?.keyColumns && columnConfig.keyColumns.length > 0 && (
              <th className="w-64 px-4 py-2 bg-amber-50 text-left text-xs font-medium text-amber-700 tracking-wider">
                <div className="flex flex-col">
                  <span>Generated Key</span>
                  <span className="mt-1 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800">
                    Composite Key
                  </span>
                </div>
              </th>
            )}
            
            {headers.map((header: string, index: number) => (
              <th
                key={index}
                className={getHeaderClassName(header)}
              >
                <div className="flex flex-col">
                  <span>{header}</span>
                  {isHighlightedColumn(header) && (
                    <span className="mt-1 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary-100 text-primary-800">
                      {getColumnType(header)}
                    </span>
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-secondary-200">
          {previewRows.map((row: string[], rowIndex: number) => (
            <tr key={rowIndex}>
              {/* Status cell */}
              <td className="w-48 px-4 py-2 whitespace-nowrap border-r border-secondary-200">
                {getProcessingStatus(rowIndex)}
              </td>
              
              {/* Generated Key cell - only show if key columns are selected */}
              {columnConfig?.keyColumns && columnConfig.keyColumns.length > 0 && (
                <td className="w-64 px-4 py-2 whitespace-nowrap border-r border-secondary-200 bg-amber-50 font-medium">
                  {getGeneratedKey(row)}
                </td>
              )}
              
              {row.map((cell: string, cellIndex: number) => (
                <td
                  key={cellIndex}
                  className={getCellClassName(headers[cellIndex])}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      {previewRows.length === 0 ? (
        <div className="text-center py-4 text-secondary-500">
          No preview data available
        </div>
      ) : (
        <div className="bg-secondary-50 px-4 py-2 text-sm text-secondary-500">
          Showing first {previewRows.length} of {rows.length} rows
        </div>
      )}
    </div>
  );
};

export default PreviewTable;