// src/components/BatchJobsTab/utils/csvGenerator.ts
import { saveAs } from 'file-saver';
import { BatchClassificationResult } from '../../../api/types'; 

// Helper function to escape CSV values
const escapeCsvValue = (value: any): string => {
  if (value === null || value === undefined) return '';
  
  const stringValue = String(value);
  
  // Always quote values that contain special characters
  const needsQuoting = stringValue.includes(',') || 
                       stringValue.includes('"') || 
                       stringValue.includes('\n') || 
                       stringValue.includes('\r') ||
                       stringValue.includes(';') ||  
                       stringValue.includes('\t');
  
  if (!needsQuoting) return stringValue;
  
  // Double up quotes and wrap in quotes - RFC 4180 compliant CSV escaping
  return `"${stringValue.replace(/"/g, '""')}"`;
};

// Export type for download format
export type DownloadFormat = 'simple' | 'full';

// Function to split multi-keys into array (separated by |)
const splitMultiKey = (key: string = ''): string[] => {
    if (!key) return [''];
    // Split by pipe character but preserve the original format of each key part
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

// Function to determine header names for keys
const getKeyHeaders = (job: BatchClassificationResult): string[] => {
    // Check for key column names in both camelCase and snake_case formats
    const columnNames = job.keyColumnNames || (job as any).key_column_names;
    
    if (columnNames && Array.isArray(columnNames) && columnNames.length > 0) {
        console.log("[CSV Export] Using key names from job:", columnNames);
        return columnNames; // Use names from the job if available
    }
    
    // Fallback: Generate generic names if specific names aren't stored
    const resultsArray = job.results || job.Results || [];
    const maxParts = getMaxKeyParts(resultsArray);
    console.log("[CSV Export] Falling back to generic key names. Max parts:", maxParts);
    return Array.from({ length: maxParts }, (_, i) => `Key_${i + 1}`);
};

// Generates and downloads the job results as a CSV file
export const downloadJobReport = (job: BatchClassificationResult, format: DownloadFormat = 'full') => {
    const resultsArray = job.results || job.Results || [];
    if (resultsArray.length === 0) { alert('No results to download for this job.'); return; }

    try {
        // Get key headers (either specific names or generic)
        const keyHeaders = getKeyHeaders(job);
        const numKeyColumns = keyHeaders.length; // Number of key columns to generate
        
        console.log(`CSV Export: Using ${numKeyColumns} key columns with headers:`, keyHeaders);

        // Determine and sort levels dynamically
        const allLevels = new Set<string>();
        resultsArray.forEach(item => { if (item.result?.levels) Object.keys(item.result.levels).forEach(level => allLevels.add(level)); });
        // Define level order for both systems
        const levelOrder: Record<string, number> = {
            // UNSPSC levels
            'segment': 1,
            'family': 2,
            'class': 3,
            'commodity': 4,
            // Common Categories levels
            'SUBCAT1': 1,
            'SUBCAT2': 2
        };

        // Sort levels based on system type and order
        const sortedLevels = Array.from(allLevels).sort((a, b) => {
            // If both levels are from the same system (both UNSPSC or both Common Categories)
            if ((a.startsWith('SUBCAT') && b.startsWith('SUBCAT')) ||
                (!a.startsWith('SUBCAT') && !b.startsWith('SUBCAT'))) {
                return (levelOrder[a] ?? 999) - (levelOrder[b] ?? 999);
            }
            return 0;
        });

        // Build CSV headers based on format
        let headers = [];
        
        // Add Key columns based on the maximum number of key parts found
        if (numKeyColumns > 0) {
            headers.push(...keyHeaders.map(header => escapeCsvValue(header)));
        }
        
        // Add standard fields
        headers.push(escapeCsvValue('Description'));
        headers.push(escapeCsvValue('Additional Context'));
        
        // For both formats, include code and name for each level
        for (const level of sortedLevels) {
            headers.push(escapeCsvValue(`${level}_Code`));
            headers.push(escapeCsvValue(`${level}_Name`));
        }
        
        // If full format, also include RAG context and LLM responses
        if (format === 'full') {
            headers.push(escapeCsvValue('RAG_Context')); // Add RAG context header
            
            // Add LLM response headers
            for (const level of sortedLevels) {
                headers.push(escapeCsvValue(`LLM_Response_${level}`));
            }
        }
        
        const csvRows = [headers.join(',')];

        // Data rows
        resultsArray.forEach(item => {
            const row = [];
            
            // Handle keys - split by | and add each part to a separate column
            if (numKeyColumns > 0) {
                const keyParts = splitMultiKey(item.key || '');
                // Fill in key columns - add empty strings for missing parts
                for (let i = 0; i < numKeyColumns; i++) {
                    row.push(escapeCsvValue(keyParts[i] || ''));
                }
            }
            
            // Add description and context
            row.push(escapeCsvValue(item.description));
            row.push(escapeCsvValue(item.additional_context));
            
            // Add code and name for each level
            for (const level of sortedLevels) {
                const category = item.result?.levels?.[level];
                row.push(escapeCsvValue(category?.code || ''));
                row.push(escapeCsvValue(category?.name || ''));
            }
            
            // If full format, add RAG context and LLM responses
            if (format === 'full') {
                // Add RAG context if available
                row.push(escapeCsvValue(item.result?.ragContext || ''));
                
                // Add LLM responses for each level
                const replies = sortedLevels.map(level => 
                    escapeCsvValue(item.result?.levelResponses?.[level])
                );
                row.push(...replies);
            }
            
            csvRows.push(row.join(','));
        });

        // Create and download CSV
        const csvContent = csvRows.join('\r\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const formatSuffix = format === 'simple' ? 'simple' : 'full';
        saveAs(blob, `batch_job_${job.id}_${formatSuffix}_report.csv`);
        console.log(`[CSV Generator] Download initiated for batch_job_${job.id}_${formatSuffix}_report.csv`);
        console.log(`[CSV Generator] Key columns: ${numKeyColumns}, Total columns: ${headers.length}`);

    } catch(error) {
         console.error('[CSV Generator] Error creating download:', error);
         alert('Failed to generate download file.');
    }
};