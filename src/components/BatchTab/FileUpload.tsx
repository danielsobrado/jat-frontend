import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import type { PreviewData } from './types';

export interface FileUploadProps {
  onFileUpload: (file: File, sheetName?: string) => void;
}

export const parseFile = async (file: File, sheetName?: string): Promise<PreviewData> => {
  return new Promise((resolve, reject) => {
    if (file.type === 'text/csv') {
      Papa.parse(file, {
        complete: (result) => {
          if (!result.data || result.data.length === 0) {
            return reject(new Error('CSV file is empty or invalid'));
          }
          
          resolve({
            headers: result.data[0] as string[],
            rows: result.data.slice(1) as string[][],
            fileName: file.name,
            fileType: 'csv'
          });
        },
        error: (error) => reject(error)
      });
    } else {
      // Excel files
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          const workbook = XLSX.read(data, { type: 'binary' });
          
          // If no sheet is specified, use the first one
          const selectedSheet = sheetName || workbook.SheetNames[0];
          
          if (!workbook.SheetNames.includes(selectedSheet)) {
            return reject(new Error(`Sheet "${selectedSheet}" not found in workbook`));
          }
          
          const worksheet = workbook.Sheets[selectedSheet];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
          
          if (!jsonData || jsonData.length === 0) {
            return reject(new Error('Excel sheet is empty or invalid'));
          }
          
          resolve({
            headers: jsonData[0] as string[],
            rows: jsonData.slice(1) as string[][],
            fileName: file.name,
            fileType: 'excel'
          });
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = (error) => reject(error);
      reader.readAsBinaryString(file);
    }
  });
};

const FileUpload: React.FC<FileUploadProps> = ({ onFileUpload }) => {
  const [currentFile, setCurrentFile] = useState<File | null>(null);
  const [sheetOptions, setSheetOptions] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string>('');

  const processExcelFile = async (file: File) => {
    try {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          const workbook = XLSX.read(data, { type: 'binary' });
          const sheets = workbook.SheetNames;
          
          if (sheets.length === 1) {
            // If there's only one sheet, just use it directly
            setCurrentFile(file);
            onFileUpload(file, sheets[0]);
          } else if (sheets.length > 1) {
            // If there are multiple sheets, show selector
            setSheetOptions(sheets);
            setSelectedSheet(sheets[0]);
            setCurrentFile(file);
          } else {
            throw new Error('No sheets found in the Excel file');
          }
        } catch (error) {
          console.error('Error processing Excel file:', error);
          alert('Failed to process Excel file: ' + (error instanceof Error ? error.message : 'Unknown error'));
        }
      };
      reader.onerror = (error) => {
        console.error('Error reading file:', error);
        alert('Failed to read file');
      };
      reader.readAsBinaryString(file);
    } catch (error) {
      console.error('Error reading Excel file:', error);
      alert('Failed to read Excel file. Please check if the file is valid.');
    }
  };

  const handleSheetSelect = async () => {
    if (!currentFile || !selectedSheet) return;

    try {
      await parseFile(currentFile, selectedSheet);
      onFileUpload(currentFile, selectedSheet);
      setSheetOptions([]); // Hide selector after selection
    } catch (error) {
      console.error('Error parsing file:', error);
      alert('Failed to parse file: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    // Validate file type
    if (!isValidFileType(file)) {
      alert('Please upload a CSV or Excel file');
      return;
    }

    // Validate file size (50MB limit)
    if (file.size > 50 * 1024 * 1024) {
      alert('File size must be less than 50MB');
      return;
    }
    
    // Reset state
    setSheetOptions([]);
    
    // Handle Excel files with potential multiple sheets
    if (file.type.includes('excel') || file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
      processExcelFile(file);
    } else {
      // For CSV files, process directly
      try {
        await parseFile(file);
        setCurrentFile(file);
        onFileUpload(file);
      } catch (error) {
        console.error('Error parsing file:', error);
        alert('Failed to parse file: ' + (error instanceof Error ? error.message : 'Unknown error'));
      }
    }
  }, [onFileUpload]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls']
    },
    multiple: false
  });

  return (
    <>
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer
          ${isDragActive 
            ? 'border-primary-500 bg-primary-50' 
            : 'border-secondary-300 hover:border-primary-400'
          }`}
      >
        <input {...getInputProps()} />
        <div className="space-y-2">
          {currentFile && sheetOptions.length === 0 ? (
            <div>
              <svg 
                className="mx-auto h-12 w-12 text-green-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M5 13l4 4L19 7" 
                />
              </svg>
              <div className="mt-2">
                <p className="text-sm font-medium text-secondary-900">{currentFile.name}</p>
                <p className="text-xs text-secondary-500">
                  {(currentFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
                <p className="text-xs text-primary-500 mt-2">
                  Click or drop to replace file
                </p>
              </div>
            </div>
          ) : (
            <>
              <svg 
                className="mx-auto h-12 w-12 text-secondary-400"
                stroke="currentColor"
                fill="none"
                viewBox="0 0 48 48"
                aria-hidden="true"
              >
                <path
                  d="M24 8v24m12-12H12"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <div className="text-secondary-600">
                {isDragActive ? (
                  <p>Drop the file here...</p>
                ) : (
                  <p>
                    Drag and drop a file here, or{' '}
                    <span className="text-primary-500">browse</span>
                  </p>
                )}
              </div>
              <p className="text-sm text-secondary-500">
                Supported formats: CSV, Excel (.xlsx, .xls)
              </p>
            </>
          )}
        </div>
      </div>

      {/* Sheet selector only shown when multiple sheets are detected */}
      {sheetOptions.length > 1 && (
        <div className="mt-4 p-4 border border-secondary-200 rounded-lg bg-secondary-50">
          <h4 className="text-sm font-medium text-secondary-900 mb-2">
            This Excel file contains multiple sheets. Please select one to process:
          </h4>
          <div className="flex space-x-4">
            <select
              value={selectedSheet}
              onChange={(e) => setSelectedSheet(e.target.value)}
              className="w-full px-4 py-2.5 bg-white border border-secondary-200 rounded-card text-secondary-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              {sheetOptions.map((sheet) => (
                <option key={sheet} value={sheet}>
                  {sheet}
                </option>
              ))}
            </select>
            <button
              onClick={handleSheetSelect}
              className="px-4 py-2 rounded-card text-white font-medium bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
            >
              Use This Sheet
            </button>
          </div>
        </div>
      )}
    </>
  );
};

// Utility functions
const isValidFileType = (file: File): boolean => {
  const validTypes = [
    'text/csv',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel'
  ];
  
  // Also check file extension for cases where MIME type isn't reliable
  const fileExtension = file.name.split('.').pop()?.toLowerCase() ?? '';
  const validExtensions = ['csv', 'xlsx', 'xls'];
  
  return validTypes.includes(file.type) || 
    validExtensions.includes(fileExtension);
};

export default FileUpload;