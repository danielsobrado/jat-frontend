import React, { useState, useEffect, useCallback } from 'react';
import { BatchClassificationRequest, BatchClassificationResult, BatchItemResult } from '../../api/types';
import FileUpload from './FileUpload';
import ColumnSelector from './ColumnSelector';
import BatchProgress from './BatchProgress';
import PreviewTable from './PreviewTable';
import BatchSummary from './BatchSummary';
import { BatchTabProps, ColumnConfig as ColumnConfigBase, PreviewData, SystemConfig } from './types';
import Papa from 'papaparse'; // Make sure papaparse is installed
import * as XLSX from 'xlsx'; // Make sure xlsx is installed
import { useAuth } from '../../context/AuthContext'; // Import useAuth hook

// Define a more specific type for the state if needed
interface BatchColumnConfig extends Omit<ColumnConfigBase, 'resultColumns' | 'keyColumns'> {
  keyColumnNames: string[];
}

// Helper function to check if a result has valid classification
const isValidClassification = (result: BatchItemResult): boolean => {
  try {
    if (!result?.result?.levels) {
      console.debug('Missing result or levels:', { result });
      return false;
    }

    // Check if any level has both code and name
    return Object.values(result.result.levels).some(level => 
      level && typeof level === 'object' &&
      typeof level.code === 'string' && level.code.length > 0 &&
      typeof level.name === 'string' && level.name.length > 0
    );
  } catch (error) {
    console.error('Error validating classification:', error);
    return false;
  }
};

// Parse file function to handle uploaded files (CSV/Excel)
const parseFile = async (file: File): Promise<PreviewData> => {
  return new Promise((resolve, reject) => {
    const fileType = file.name.split('.').pop()?.toLowerCase();
    
    if (fileType === 'csv') {
      // Parse CSV
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          if (results.errors && results.errors.length > 0) {
            console.error('CSV parsing errors:', results.errors);
            reject(new Error('Failed to parse CSV file'));
            return;
          }
          
          // Get headers from first row
          const headers = results.meta.fields || [];
          
          // Convert data to array of string arrays
          const rows = results.data.map((row: any) => {
            return headers.map(header => row[header] || '');
          });
          
          resolve({
            headers,
            rows,
            fileName: file.name,
            fileType: 'csv'
          });
        },
        error: (error) => {
          console.error('CSV parsing error:', error);
          reject(error);
        }
      });
    } else if (fileType === 'xlsx' || fileType === 'xls') {
      // Parse Excel
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          
          // Get first sheet
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          
          // Convert to JSON
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
          
          // Extract headers from first row
          const headers = jsonData[0].map(h => String(h));
          
          // Extract data rows, starting from second row
          const rows = jsonData.slice(1).map(row => {
            // Ensure all cells are strings and handle missing cells
            return headers.map((_, i) => row[i] !== undefined ? String(row[i]) : '');
          });
          
          resolve({
            headers,
            rows,
            fileName: file.name,
            fileType: 'excel'
          });
        } catch (error) {
          console.error('Excel parsing error:', error);
          reject(error);
        }
      };
      
      reader.onerror = (error) => {
        console.error('File reading error:', error);
        reject(error);
      };
      
      reader.readAsArrayBuffer(file);
    } else {
      reject(new Error('Unsupported file format. Please upload a CSV or Excel file.'));
    }
  });
};

export const BatchTab: React.FC<BatchTabProps> = ({ apiClient }) => {
  // Get permission checker from auth context
  const { checkPermission } = useAuth();

  const [file, setFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [sourceColumn, setSourceColumn] = useState<string>('');
  const [contextColumn, setContextColumn] = useState<string | undefined>(undefined);
  const [selectedKeyColumns, setSelectedKeyColumns] = useState<string[]>([]); // Store key names
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedItems, setProcessedItems] = useState<number>(0);
  const [batchId, setBatchId] = useState<string | null>(null);
  const [batchResults, setBatchResults] = useState<BatchItemResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [completedBatch, setCompletedBatch] = useState<BatchClassificationResult | null>(null);
  const [rowsToProcess, setRowsToProcess] = useState<number>(5);
  const [processAll, setProcessAll] = useState<boolean>(false);
  const [batchTotalItems, setBatchTotalItems] = useState<number>(0);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [availableSystems, setAvailableSystems] = useState<SystemConfig[]>([]);
  const [selectedSystem, setSelectedSystem] = useState<SystemConfig | null>(null);

  // Load classification systems on mount
  useEffect(() => {
    const loadSystems = async () => {
      try {
        const systems = await apiClient.getClassificationSystems();
        const systemConfigs = await Promise.all(
          systems.map(async (system: { code: any; }) => {
            const details = await apiClient.getClassificationSystem(system.code);
            return details;
          })
        );
        setAvailableSystems(systemConfigs);
      } catch (error) {
        console.error('Error loading classification systems:', error);
        setError('Failed to load classification systems');
      }
    };
    loadSystems();
  }, [apiClient]);

  // Effect for polling batch status
  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    const pollBatchStatus = async () => {
      if (!batchId || !isProcessing) return;

      try {
        setError(null);
        console.log('Polling batch status:', batchId);
        const status = await apiClient.getBatchStatus(batchId);
        console.log('Received status:', status);

        if (!status) {
          throw new Error('No status received from server');
        }

        // Fix case sensitivity issue - server returns lowercase 'results'
        const resultsArray = status.results || [];
        console.log('Got results array with', resultsArray.length, 'items');

        // Clone and validate results
        const results = resultsArray.map((r: BatchItemResult) => ({
          description: r.description || '',
          additional_context: r.additional_context || '',
          key: r.key || '', // Ensure key field is preserved
          error: r.error || null,
          result: r.result ? {
            ...r.result,
            levels: r.result.levels ? { ...r.result.levels } : {}
          } : null
        }));

        // Update batch results
        const totalItems = results.length;
        setTotalCount(totalItems);
        setTotalPages(Math.ceil(totalItems / pageSize));
        
        // Calculate paginated results
        const startIndex = (currentPage - 1) * pageSize;
        const endIndex = startIndex + pageSize;
        const paginatedResults = results.slice(startIndex, endIndex);
        setBatchResults(paginatedResults);

        // Count valid results
        const validResults = results.filter(isValidClassification);
        console.log('Processing status:', {
          total: totalItems,
          valid: validResults.length,
          currentPage,
          totalPages: Math.ceil(totalItems / pageSize)
        });
        
        // Check if results have key fields
        const hasKeys = results.some((r: { key: any; }) => r.key);
        console.log('Batch contains key fields:', hasKeys);
        
        // Count only items that have been actually processed (either success or error)
        const processedCount = results.filter((r: { result: { status: string }; }) =>
          r.result && r.result.status && r.result.status !== 'pending'
        ).length;
        setProcessedItems(processedCount);

        if (status.status === 'completed' || status.status === 'error') {
          console.log('Batch processing finished:', status.status);

          // Set completed batch state
          setCompletedBatch({
            id: status.id || batchId,
            status: status.status,
            timestamp: status.timestamp || new Date().toISOString(),
            results: results
          });

          // Clear processing state
          setIsProcessing(false);
          setBatchId(null);
        }
      } catch (error) {
        console.error('Error polling batch status:', error);
        setError('Failed to get batch status');
        setIsProcessing(false);
        setBatchId(null);
        setCompletedBatch(null);
        setBatchResults([]);
      }
    };

    if (isProcessing && batchId) {
      intervalId = setInterval(pollBatchStatus, 2000);
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [batchId, isProcessing, apiClient, currentPage, pageSize]);

  const handleFileUpload = async (uploadedFile: File) => {
    setFile(uploadedFile);
    setError(null);
    setBatchResults([]);
    setCompletedBatch(null);
    setProcessedItems(0);

    try {
      const result = await parseFile(uploadedFile);
      setPreviewData(result);
      setRowsToProcess(Math.min(5, result.rows.length));
    } catch (error) {
      console.error('Error parsing file:', error);
      setError('Failed to parse file. Please make sure it is a valid CSV or Excel file.');
    }
  };

  const handleSystemSelect = (systemCode: string) => {
    setSelectedSystem(availableSystems.find(s => s.system.code === systemCode) || null);
  };

  // Modify handler passed to ColumnSelector
  const handleColumnSelectionUpdate = useCallback((
    config: { sourceColumn: string; contextColumn?: string; keyColumnNames: string[] }
  ) => {
    setSourceColumn(config.sourceColumn);
    setContextColumn(config.contextColumn);
    setSelectedKeyColumns(config.keyColumnNames);
    setError(null); // Reset error on selection change
  }, []);

  const handleRowCountChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(event.target.value, 10);
    if (!isNaN(value) && value > 0 && previewData) {
      setRowsToProcess(Math.min(value, previewData.rows.length));
    }
  };

  const handleStartProcessing = async () => {
    if (!checkPermission('classify:batch')) {
      setError('You do not have permission to perform batch classifications');
      return;
    }

    if (!file || !sourceColumn || !previewData || !selectedSystem) {
      setError("Please select the source description column.");
      return;
    }

    // Determine and set the fixed total for this run
    const totalForThisBatch = processAll ? previewData.rows.length : rowsToProcess;
    setBatchTotalItems(totalForThisBatch);

    setIsProcessing(true);
    setBatchResults([]);
    setProcessedItems(0);
    setError(null);
    setCompletedBatch(null);

    try {
      const allRows = previewData.rows;
      const rowsToUse = allRows.slice(0, totalForThisBatch);

      const items = rowsToUse.map(row => {
        const sourceIndex = previewData.headers.indexOf(sourceColumn);
        const contextIndex = contextColumn
          ? previewData.headers.indexOf(contextColumn)
          : -1;
        
        // Generate composite key from selected key columns
        let key = '';
        if (selectedKeyColumns && selectedKeyColumns.length > 0) {
          const keyParts = selectedKeyColumns.map(keyCol => {
            const keyIndex = previewData.headers.indexOf(keyCol);
            return keyIndex >= 0 ? row[keyIndex] : '';
          }).filter(Boolean); // Remove empty values
          
          key = keyParts.join('|'); // Join with pipe delimiter for multiple key parts
        }

        return {
          description: row[sourceIndex],
          additionalContext: contextIndex >= 0 ? row[contextIndex] : undefined,
          key: key || undefined // Only include key if it has a value
        };
      });

      // Create request with key column names
      const request: BatchClassificationRequest & { key_column_names?: string[] } = {
        items,
        systemCode: selectedSystem.system.code,
        key_column_names: selectedKeyColumns // Pass the selected key names
      };

      console.log('Starting batch with request:', { 
        itemCount: request.items.length,
        systemCode: request.systemCode,
        keyColumnNames: request.key_column_names
      });

      const result = await apiClient.classifyBatch(request);
      console.log('Started batch processing:', result?.id);

      if (!result?.id) {
        throw new Error('No batch ID received from server');
      }

      setBatchId(result.id);
    } catch (error) {
      console.error('Error starting batch process:', error);
      setError('Failed to start batch processing');
      setIsProcessing(false);
      setBatchTotalItems(0); // Reset total on error
    }
  };

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      // Results will be updated by the polling effect
      console.debug('Changing to page:', page);
    }
  };

  return (
    <div className="max-w-8xl mx-auto space-y-10" style={{ minWidth: '40rem', paddingRight: '1rem', paddingLeft: '1rem'}}>
      {!checkPermission('classify:batch') && (
        <div className="bg-white shadow-card rounded-card p-6 border-l-4 border-yellow-500">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">Permission Notice</h3>
              <div className="mt-2 text-sm text-yellow-700">
                <p>You don't have permission to perform batch classifications. Contact your administrator for access.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white shadow-card rounded-card p-8 w-full" style={{ paddingRight: '5rem', paddingLeft: '3rem'}}>
        <div className="space-y-8">
          {error && (
            <div className="rounded-card border border-red-200 bg-red-50/50 px-4 py-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <div className="border-b pb-6">
            <h3 className="text-lg font-medium mb-3">1. Upload File</h3>
            <FileUpload onFileUpload={handleFileUpload} />
          </div>

          {previewData && (
            <>
              <div className="border-b pb-6">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-lg font-medium">2. Preview Data</h3>
                  {isProcessing && (
                    <div className="ml-4">
                      <BatchProgress 
                        current={processedItems} 
                        total={batchTotalItems}
                      />
                    </div>
                  )}
                </div>
                <PreviewTable 
                  data={previewData}
                  columnConfig={{
                    sourceColumn,
                    contextColumn,
                    keyColumns: selectedKeyColumns, // Pass key columns to preview
                    resultColumns: [],
                    descriptionColumnIndex: sourceColumn ? previewData.headers.indexOf(sourceColumn) : -1
                  }}
                  batchResults={batchResults}
                  isProcessing={isProcessing}
                />
              </div>

              <div className="border-b pb-6">
                <h3 className="text-lg font-medium mb-3">3. Select Columns</h3>
                <ColumnSelector 
                  headers={previewData.headers}
                  onColumnSelect={handleColumnSelectionUpdate}
                  availableSystems={availableSystems}
                  onSystemSelect={handleSystemSelect}
                  selectedSystem={selectedSystem}
                />
              </div>
            </>
          )}

          {!isProcessing && completedBatch && (
            <div className="border-b pb-6">
              <h3 className="text-lg font-medium mb-3">Results</h3>
              <BatchSummary
                result={completedBatch}
                originalData={{
                  headers: previewData?.headers || [],
                  rows: previewData?.rows || []
                }}
              />
              
              {/* Move pagination controls here */}
              {batchResults.length > 0 && (
                <div className="mt-6 flex items-center justify-between">
                  <div className="flex-1 flex justify-between items-center">
                    <p className="text-sm text-secondary-600">
                      Showing {Math.min((currentPage - 1) * pageSize + 1, totalCount)} - {Math.min(currentPage * pageSize, totalCount)} of {totalCount} results
                    </p>
                    
                    {/* Pagination buttons */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handlePageChange(1)}
                        disabled={currentPage === 1 || isProcessing}
                        className="px-3 py-2 rounded-lg border border-secondary-200 text-sm font-medium text-secondary-700 hover:bg-secondary-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        First
                      </button>
                      
                      <button
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1 || isProcessing}
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
                              disabled={isProcessing}
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
                        disabled={currentPage === totalPages || isProcessing}
                        className="px-3 py-2 rounded-lg border border-secondary-200 text-sm font-medium text-secondary-700 hover:bg-secondary-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Next
                      </button>
                      
                      <button
                        onClick={() => handlePageChange(totalPages)}
                        disabled={currentPage === totalPages || isProcessing || totalPages <= 1}
                        className="px-3 py-2 rounded-lg border border-secondary-200 text-sm font-medium text-secondary-700 hover:bg-secondary-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Last
                      </button>
                    </div>
                  </div>
                </div>
              )}
              
              <button
                onClick={() => {
                  setCompletedBatch(null);
                  setBatchResults([]);
                  setProcessedItems(0);
                  setError(null);
                }}
                className="mt-4 w-full py-3 px-4 rounded-card text-white font-medium transition-colors bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
              >
                Process Another Batch
              </button>
            </div>
          )}

          {previewData && sourceColumn && selectedSystem && !completedBatch && (
            <div className="space-y-6">
              {/* Selected System Display */}
              <div className="flex flex-col space-y-3">
                <h3 className="text-lg font-medium">4. Selected System</h3>
                <div className="bg-secondary-50 rounded-card border border-secondary-200 p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-secondary-700">System Name</p>
                      <p className="mt-1 text-sm text-secondary-900">{selectedSystem.system.name}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-secondary-700">System Code</p>
                      <p className="mt-1 text-sm text-secondary-900">{selectedSystem.system.code}</p>
                    </div>
                    {selectedSystem.system.description && (
                      <div className="col-span-2">
                        <p className="text-sm font-medium text-secondary-700">Description</p>
                        <p className="mt-1 text-sm text-secondary-900">{selectedSystem.system.description}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Processing Options */}
              <div className="flex flex-col space-y-3">
                <h3 className="text-lg font-medium">5. Processing Options</h3>
                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-1">
                    Rows to Process
                  </label>
                    
                  {/* Restructure to a single line with flex layout */}
                  <div className="flex items-center">
                    <div className="flex items-center mr-6">
                    <input
                      type="number"
                      min="1"
                      max={previewData.rows.length}
                      value={processAll ? previewData.rows.length : rowsToProcess}
                      onChange={handleRowCountChange}
                      disabled={processAll || isProcessing}
                      className="w-24 px-4 py-2.5 bg-white border border-secondary-200 rounded-card text-secondary-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-gray-100"
                    />
                    </div>
                    
                    <div className="flex items-center mr-6">
                    <input
                      type="checkbox"
                      id="processAll"
                      checked={processAll}
                      onChange={(e) => setProcessAll(e.target.checked)}
                      disabled={isProcessing}
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-secondary-300 rounded"
                    />
                    <label htmlFor="processAll" className="ml-2 text-sm text-secondary-700">
                      Process all rows ({previewData.rows.length} total)
                    </label>
                    </div>
     
                
                  {/* Progress indicator takes remaining space */}
                  {isProcessing && (
                    <div className="flex-grow max-w-">
                    <BatchProgress 
                      current={processedItems} 
                      total={batchTotalItems}
                    />
                    </div>
                  )}
                  </div>
                </div>
              </div>

              <div className="flex justify-center items-center pt-4">
                <button
                  onClick={handleStartProcessing}
                  disabled={isProcessing}
                  className={`py-3 rounded-card text-white font-medium transition-colors ${
                    isProcessing 
                      ? 'bg-secondary-400 cursor-not-allowed w-full' 
                      : 'bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 px-8'
                  }`}
                >
                  {isProcessing ? 'Processing...' : 'Start Processing'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BatchTab;
