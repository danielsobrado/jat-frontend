// Types for BatchTab functionality

import { ClassificationSystem, BatchStatus as ApiBatchStatus } from "../../api/types";

export interface PreviewData {
    headers: string[];
    rows: string[][];
    fileName: string;
    fileType: 'csv' | 'excel';
}

export interface ResultColumn {
    levelCode: string;
    levelName: string;
    codeColumn: string;
    nameColumn: string;
    isNewColumn: boolean;
}

export interface ColumnConfig {
    // Original properties
    descriptionColumnIndex: number;
    contextColumnIndex?: number;
    keyColumnIndex?: number;
    multiKeyIndices?: number[];
    
    // New properties being used in components
    sourceColumn: string;
    contextColumn?: string;
    keyColumns: string[];
    resultColumns: ResultColumn[];
}

export interface BatchTabProps {
    availableSystems: { system: ClassificationSystem }[];
    apiClient: any; // TODO: Replace with proper API client type
}

// Specialized types for key handling
export interface MultiKey {
    original: string;
    normalized: string;
    parts: string[];
}

// Key processing utilities
export const normalizeDecimalKey = (key: string): string => {
    // Simply return the key as is - we're no longer normalizing decimal suffixes
    return key;
};

export const splitMultiKey = (key: string): string[] => {
    if (!key) return [];
    return key.split('|');
};

export const processMultiKey = (key: string): MultiKey => {
    if (!key) return { original: '', normalized: '', parts: [] };
    
    const normalized = normalizeDecimalKey(key);
    const parts = splitMultiKey(normalized);
    
    return {
        original: key,
        normalized,
        parts
    };
}

// Define and export the filter type
export type BatchJobStatusFilterType = ApiBatchStatus | 'all' | 'partial';

export interface SystemConfig {
    system: ClassificationSystem;
    levels: Array<{
        code: string;
        name: string;
        description?: string;
    }>;
}

export interface BatchJobStatus {
    batchId: string | null;
    isProcessing: boolean;
}