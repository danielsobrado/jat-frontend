// src/components/RagInfoTab/components/RagInfoTable.tsx
import React from 'react';
import { RagInfoItem } from '../../../api/types'; // Adjust path
import { formatDate } from '../../../utils/dateFormat'; // Adjust path

interface RagInfoTableProps {
    items: RagInfoItem[];
    loading: boolean;
    onEdit: (item: RagInfoItem) => void;
    onDelete: (item: RagInfoItem) => void;
    canEdit: boolean; // Add permission props
    canDelete: boolean; // Add permission props
}

export const RagInfoTable: React.FC<RagInfoTableProps> = ({
    items,
    loading,
    onEdit,
    onDelete,
    canEdit,
    canDelete
}) => {
    if (loading && items.length === 0) {
        return <div className="text-center py-8 text-secondary-500">Loading...</div>;
    }

    if (!loading && items.length === 0) {
        return <div className="text-center py-8 text-secondary-500">No information found.</div>;
    }

    return (
        <div className="overflow-x-auto rounded-card border border-secondary-200">
            <table className="min-w-full divide-y divide-secondary-200">
                <thead className="bg-secondary-50">
                    <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">Key</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">Description</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">Created At</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">Updated At</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">Actions</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-secondary-200">
                    {items.map((item) => (
                        <tr key={item.id} className="hover:bg-secondary-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-secondary-900">{item.key}</td>
                            <td className="px-6 py-4 text-sm text-secondary-600 max-w-md truncate" title={item.description}>{item.description}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500">
                                <span title={formatDate(item.createdAt).fullText}>
                                    {formatDate(item.createdAt).displayText}
                                </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500">
                                <span title={formatDate(item.updatedAt).fullText}>
                                    {formatDate(item.updatedAt).displayText}
                                </span>
                             </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                                <button
                                    onClick={() => onEdit(item)}
                                    className={`btn py-1 px-2 text-xs ${
                                        canEdit 
                                        ? 'btn-secondary hover:bg-secondary-50' 
                                        : 'btn-disabled opacity-50 cursor-not-allowed'
                                    }`}
                                    aria-label={`Edit item ${item.key}`}
                                    disabled={loading || !canEdit}
                                    title={!canEdit ? "Permission denied" : `Edit item ${item.key}`}
                                > Edit </button>
                                <button
                                    onClick={() => onDelete(item)}
                                    className={`btn py-1 px-2 text-xs ${
                                        canDelete
                                        ? 'btn-secondary text-red-600 border-red-200 hover:bg-red-50'
                                        : 'btn-disabled opacity-50 cursor-not-allowed text-red-300'
                                    }`}
                                    aria-label={`Delete item ${item.key}`}
                                    disabled={loading || !canDelete}
                                    title={!canDelete ? "Permission denied" : `Delete item ${item.key}`}
                                > Delete </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};