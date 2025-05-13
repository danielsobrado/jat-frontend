// src/components/BatchJobsTab/utils/csvGenerator.ts
import { saveAs } from 'file-saver';
import { BatchClassificationResult, BatchItemResult, ClassificationError } from '../../../api/types';

// Helper function to escape CSV values
const escapeCsvValue = (value: any): string => {
  if (value === null || value === undefined) return '';
  const stringValue = String(value);
  // More comprehensive check for characters requiring quoting
  const needsQuoting = stringValue.includes(',') ||
                       stringValue.includes('"') ||
                       stringValue.includes('\n') ||
                       stringValue.includes('\r') ||
                       stringValue.includes(';') ||
                       stringValue.includes('\t');
  if (!needsQuoting) return stringValue;
  return `"${stringValue.replace(/"/g, '""')}"`;
};

export type DownloadFormat = 'simple' | 'full';

const splitMultiKey = (key: string = ''): string[] => {
    if (!key) return [''];
    return key.split('|').map(k => k.trim());
};

const getMaxKeyParts = (results: BatchItemResult[]): number => {
    let maxParts = 0;
    if (!results || results.length === 0) return 0;
    for (const item of results) {
        if (item.key) {
            const keyParts = splitMultiKey(item.key);
            maxParts = Math.max(maxParts, keyParts.length);
        }
    }
    return maxParts === 0 && results.some(r => r.key !== undefined && r.key !== null && r.key !== '') ? 1 : maxParts; // If keys exist but are single, still have 1 key column
};

const getKeyHeaders = (job: BatchClassificationResult): string[] => {
    const columnNames = job.keyColumnNames || (job as any).key_column_names;
    if (columnNames && Array.isArray(columnNames) && columnNames.length > 0) {
        return columnNames;
    }
    const resultsArray = job.results || [];
    const maxParts = getMaxKeyParts(resultsArray);
    if (maxParts === 0 && resultsArray.some(item => item.key !== undefined && item.key !== null && item.key !== '')) {
        return ["Key"]; // Fallback for single key column if names not provided
    }
    if (maxParts === 0) return []; // No key columns if no keys
    return Array.from({ length: maxParts }, (_, i) => `Key_${i + 1}`);
};

export const downloadJobReport = (job: BatchClassificationResult, format: DownloadFormat = 'full') => {
    const resultsArray = job.results || [];
    if (resultsArray.length === 0) { alert('No results to download for this job.'); return; }

    try {
        const keyHeaders = getKeyHeaders(job);
        const numKeyColumns = keyHeaders.length;

        const allLevels = new Set<string>();
        resultsArray.forEach(item => { if (item.result?.levels) Object.keys(item.result.levels).forEach(level => allLevels.add(level)); });
        
        const levelOrder: Record<string, number> = {
            'segment': 1, 'family': 2, 'class': 3, 'commodity': 4,
            'subcat1': 1, 'subcat2': 2 // Ensure robust matching for common cats too
        };
        const sortedLevels = Array.from(allLevels).sort((a, b) => 
            ((levelOrder[a.toLowerCase()] ?? 999) - (levelOrder[b.toLowerCase()] ?? 999)) || a.localeCompare(b) // Use toLowerCase for robust key matching
        );

        let headers: string[] = [];
        if (numKeyColumns > 0) { // Only add key headers if there are key columns
            headers.push(...keyHeaders.map(header => escapeCsvValue(header)));
        }
        headers.push(escapeCsvValue('Description'));
        headers.push(escapeCsvValue('Additional_Context'));

        for (const level of sortedLevels) {
            headers.push(escapeCsvValue(`${level}_Code`));
            headers.push(escapeCsvValue(`${level}_Name`));
        }
        
        if (format === 'full') {
            headers.push(escapeCsvValue('Item_Classification_Status')); 
            headers.push(escapeCsvValue('RAG_Context_Used'));
            headers.push(escapeCsvValue('RAG_Context_Content'));
            for (const level of sortedLevels) {
                headers.push(escapeCsvValue(`LLM_Response_${level}`));
            }
            headers.push(escapeCsvValue('First_Level_Prompt'));
            headers.push(escapeCsvValue('All_Prompts_Detail_JSON'));
        }
        headers.push(escapeCsvValue('Item_Error_Message'));

        const csvRows = [headers.join(',')];

        resultsArray.forEach(item => {
            const row: string[] = [];
            
            if (numKeyColumns > 0) {
                const keyParts = splitMultiKey(item.key || '');
                for (let i = 0; i < numKeyColumns; i++) {
                    row.push(escapeCsvValue(keyParts[i] || ''));
                }
            }
            
            row.push(escapeCsvValue(item.description));
            row.push(escapeCsvValue(item.additional_context || '')); 

            let itemStatusValue = 'Failed'; 
            if (item.error) { itemStatusValue = 'Failed'; } 
            else if (item.result) { itemStatusValue = item.result.status; }

            for (const level of sortedLevels) {
                const category = item.result?.levels?.[level];
                row.push(escapeCsvValue(category?.code || ''));
                row.push(escapeCsvValue(category?.name || ''));
            }
            
            if (format === 'full') {
                row.push(escapeCsvValue(itemStatusValue)); 
                row.push(escapeCsvValue(item.result?.ragContextUsed ? 'Yes' : 'No'));
                row.push(escapeCsvValue(item.result?.ragContext || ''));
                
                const llmReplies = sortedLevels.map(levelCode => 
                    escapeCsvValue(item.result?.levelResponses?.[levelCode] || '')
                );
                row.push(...llmReplies);

                row.push(escapeCsvValue(item.result?.firstLevelPrompt || '')); 
                row.push(escapeCsvValue(item.result?.allPromptsDetail || ''));
            }

            let errorMessage = '';
            if (item.error) {
                errorMessage = typeof item.error === 'string' ? item.error : (item.error as ClassificationError).message || JSON.stringify(item.error);
            } else if (item.result?.error) {
                errorMessage = item.result.error;
            }
            row.push(escapeCsvValue(errorMessage));
            
            csvRows.push(row.join(','));
        });

        const csvContent = csvRows.join('\r\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const formatSuffix = format === 'simple' ? 'simple' : 'full';
        saveAs(blob, `batch_job_${job.id}_${formatSuffix}_report.csv`);

    } catch(error) {
         console.error('[CSV Generator] Error creating download:', error);
         alert(`Failed to generate download file: ${error instanceof Error ? error.message : String(error)}`);
    }
};