// src/components/RagInfoTab/RagInfoTab.tsx
import React, { useState, useCallback, useRef } from 'react';
import { ApiClient, RagInfoItem, CreateRagInfoRequest, UpdateRagInfoRequest } from '../../api/types'; // Adjust path
import { useRagInfo } from './hooks/useRagInfo';
import { RagInfoFilters } from './components/RagInfoFilters';
import { RagInfoTable } from './components/RagInfoTable';
import { RagInfoPagination } from './components/RagInfoPagination';
import { RagInfoFormModal } from './components/RagInfoFormModal';
import { PlusIcon, ArrowDownTrayIcon, ArrowUpTrayIcon } from '@heroicons/react/24/solid'; // Added ArrowUpTrayIcon
import { useAuth } from '../../context/AuthContext'; // Import useAuth hook
import { message } from 'antd'; // Import message for notifications

interface RagInfoTabProps {
    apiClient: ApiClient;
}

const PAGE_SIZE = 10; // Must match the hook

// Helper function to convert RAG info items to CSV and trigger download
const exportToCSV = (items: RagInfoItem[]): void => {
    const headers = ['Key', 'Description', 'Created At', 'Updated At'];
    const csvContent = [
        headers.join(','),
        ...items.map(item => [
            `"${item.key.replace(/"/g, '""')}"`,
            `"${item.description.replace(/"/g, '""')}"`,
            item.createdAt ? new Date(item.createdAt).toLocaleString() : '',
            item.updatedAt ? new Date(item.updatedAt).toLocaleString() : ''
        ].join(','))
    ].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `rag-info-export-${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};

// Helper function to parse CSV data into RAG info items
const parseCSV = (csvText: string): CreateRagInfoRequest[] => {
    const lines = csvText.split(/\r?\n/);
    if (lines.length < 2) {
        throw new Error('CSV file is empty or has incorrect format');
    }
    const headers = lines[0].toLowerCase().split(',');
    const keyIndex = headers.findIndex(header => header.trim() === 'key');
    const descriptionIndex = headers.findIndex(header => header.trim() === 'description');
    if (keyIndex === -1 || descriptionIndex === -1) {
        throw new Error('CSV must contain "Key" and "Description" columns');
    }
    const items: CreateRagInfoRequest[] = [];
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        const values: string[] = [];
        let inQuote = false;
        let currentValue = '';
        for (let j = 0; j < line.length; j++) {
            const char = line[j];
            if (char === '"') {
                if (j + 1 < line.length && line[j + 1] === '"') {
                    currentValue += '"';
                    j++;
                } else {
                    inQuote = !inQuote;
                }
            } else if (char === ',' && !inQuote) {
                values.push(currentValue);
                currentValue = '';
            } else {
                currentValue += char;
            }
        }
        values.push(currentValue);
        const key = values[keyIndex]?.trim();
        const description = values[descriptionIndex]?.trim();
        if (key && description) {
            items.push({ key, description });
        }
    }
    return items;
};

export const RagInfoTab: React.FC<RagInfoTabProps> = ({ apiClient }) => {
    const { checkPermission } = useAuth(); // Get permission checker
    
    const {
        items,
        loading,
        error,
        totalCount,
        totalPages,
        currentPage,
        searchTerm,
        setCurrentPage,
        setSearchTerm,
        refreshList,
        createItem,
        updateItem,
        deleteItem,
        fetchAllForExport,
    } = useRagInfo(apiClient);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<RagInfoItem | undefined>(undefined);
    const [isExporting, setIsExporting] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [importStatus, setImportStatus] = useState<{
        total: number;
        success: number;
        failed: number;
        message?: string;
    } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleAddClick = () => {
        if (!checkPermission('rag:manage')) { 
            message.error("Permission denied."); 
            return; 
        }
        setEditingItem(undefined);
        setIsModalOpen(true);
    };

    const handleEditClick = (item: RagInfoItem) => {
        if (!checkPermission('rag:manage')) { 
            message.error("Permission denied."); 
            return; 
        }
        setEditingItem(item);
        setIsModalOpen(true);
    };

    const handleDeleteClick = async (item: RagInfoItem) => {
        if (!checkPermission('rag:manage')) { 
            message.error("Permission denied."); 
            return; 
        }
        if (window.confirm(`Are you sure you want to delete the item "${item.key}"?`)) {
            await deleteItem(item.id); // deleteItem hook handles loading/error state
        }
    };

    const handleExportClick = async () => {
        if (!checkPermission('rag:view')) { // Use view permission for export
            message.error("Permission denied to export data.");
            return;
        }
        setIsExporting(true);
        try {
            const allItems = await fetchAllForExport(searchTerm);
            if (allItems.length === 0) {
                message.info('No RAG info items to export.');
                return;
            }
            exportToCSV(allItems);
            console.log(`Successfully exported ${allItems.length} RAG info items to CSV`);
        } catch (error) {
            console.error('Error exporting data:', error);
            message.error('Failed to export data. Please try again.');
        } finally {
            setIsExporting(false);
        }
    };

    const handleImportClick = () => {
        if (!checkPermission('rag:manage')) { 
            message.error("Permission denied to import data."); 
            return; 
        }
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
            fileInputRef.current.click();
        }
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        // Permission check already done in handleImportClick
        const file = e.target.files?.[0];
        if (!file) return;
        setIsImporting(true);
        setImportStatus(null);
        try {
            const text = await readFileAsText(file);
            const itemsToImport = parseCSV(text);
            if (itemsToImport.length === 0) {
                throw new Error('No valid items found in the CSV file');
            }
            const importResults = await importItems(itemsToImport);
            setImportStatus({
                total: itemsToImport.length,
                success: importResults.success,
                failed: importResults.failed,
                message: `Successfully imported ${importResults.success} items. ${importResults.failed} items failed.`
            });
            await refreshList();
        } catch (error) {
            console.error('Import error:', error);
            setImportStatus({
                total: 0,
                success: 0,
                failed: 0,
                message: `Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`
            });
        } finally {
            setIsImporting(false);
        }
    };

    const readFileAsText = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target?.result as string);
            reader.onerror = (e) => reject(new Error('Failed to read file'));
            reader.readAsText(file);
        });
    };

    const importItems = async (items: CreateRagInfoRequest[]): Promise<{ success: number; failed: number }> => {
        let success = 0;
        let failed = 0;
        const batchSize = 10;
        for (let i = 0; i < items.length; i += batchSize) {
            const batch = items.slice(i, i + batchSize);
            const results = await Promise.allSettled(
                batch.map(item => createItem(item))
            );
            results.forEach(result => {
                if (result.status === 'fulfilled' && result.value) {
                    success++;
                } else {
                    failed++;
                }
            });
        }
        return { success, failed };
    };

    const handleModalSubmit = async (data: CreateRagInfoRequest | UpdateRagInfoRequest): Promise<boolean> => {
        // Permissions checked before opening modal, but double-check is safe
        if (!checkPermission('rag:manage')) {
            message.error("Permission denied.");
            return false;
        }
        let success = false;
        if (editingItem) {
            success = !!(await updateItem(editingItem.id, data as UpdateRagInfoRequest));
        } else {
            success = !!(await createItem(data as CreateRagInfoRequest));
        }
        return success;
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div className="flex-grow mr-4">
                    <RagInfoFilters
                        searchTerm={searchTerm}
                        onSearchChange={setSearchTerm}
                        loading={loading}
                    />
                </div>
                <div className="flex space-x-2">
                    <button
                        onClick={handleImportClick}
                        className="btn btn-secondary inline-flex items-center"
                        disabled={loading || isImporting || isExporting || !checkPermission('rag:manage')}
                        title={!checkPermission('rag:manage') ? "Permission denied" : "Import data from CSV file"}
                    >
                        <ArrowUpTrayIcon className={`h-5 w-5 mr-1 ${!checkPermission('rag:manage') ? 'opacity-50' : ''}`} />
                        {isImporting ? 'Importing...' : 'Import CSV'}
                    </button>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".csv"
                        className="hidden"
                        onChange={handleFileChange}
                    />
                    <button
                        onClick={handleExportClick}
                        className="btn btn-secondary inline-flex items-center"
                        disabled={loading || isExporting || isImporting || items.length === 0 || !checkPermission('rag:view')}
                        title={!checkPermission('rag:view') ? "Permission denied" : "Export data to CSV file"}
                    >
                        <ArrowDownTrayIcon className={`h-5 w-5 mr-1 ${!checkPermission('rag:view') ? 'opacity-50' : ''}`} />
                        {isExporting ? 'Exporting...' : 'Export CSV'}
                    </button>
                    <button
                        onClick={handleAddClick}
                        className="btn btn-primary inline-flex items-center"
                        disabled={loading || isImporting || !checkPermission('rag:manage')}
                        title={!checkPermission('rag:manage') ? "Permission denied" : "Add new RAG info item"}
                    >
                        <PlusIcon className={`h-5 w-5 mr-1 ${!checkPermission('rag:manage') ? 'opacity-50' : ''}`} />
                        Add Info
                    </button>
                </div>
            </div>

            {!checkPermission('rag:view') && (
                <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
                    You don't have permission to view or manage RAG information items.
                </div>
            )}

            {importStatus && importStatus.message && (
                <div className={`rounded-md border p-4 text-sm ${
                    importStatus.failed > 0 
                    ? 'border-yellow-200 bg-yellow-50 text-yellow-700' 
                    : 'border-green-200 bg-green-50 text-green-700'
                }`}>
                    {importStatus.message}
                </div>
            )}

            {error && (
                <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                    Error: {error}
                </div>
            )}

            <RagInfoTable
                items={items}
                loading={loading}
                onEdit={handleEditClick}
                onDelete={handleDeleteClick}
                canEdit={checkPermission('rag:manage')}
                canDelete={checkPermission('rag:manage')}
            />

            <RagInfoPagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalCount={totalCount}
                pageSize={PAGE_SIZE}
                loading={loading}
                onPageChange={setCurrentPage}
            />

            <RagInfoFormModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSubmit={handleModalSubmit}
                initialData={editingItem}
                loading={loading}
            />
        </div>
    );
};