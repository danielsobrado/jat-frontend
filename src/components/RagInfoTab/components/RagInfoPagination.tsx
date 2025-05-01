// src/components/RagInfoTab/components/RagInfoPagination.tsx
import React from 'react';

interface RagInfoPaginationProps {
    currentPage: number;
    totalPages: number;
    totalCount: number;
    pageSize: number; // Pass pageSize if needed for display
    loading: boolean;
    onPageChange: (page: number) => void;
}

export const RagInfoPagination: React.FC<RagInfoPaginationProps> = ({
    currentPage, totalPages, totalCount, pageSize, loading, onPageChange
}) => {
    // Don't show pagination if only one page or no results
    if (!totalCount || totalPages <= 1) {
        return null;
    }

    const firstItem = (currentPage - 1) * pageSize + 1;
    const lastItem = Math.min(currentPage * pageSize, totalCount);

    return (
        <div className="mt-6 flex items-center justify-between">
            {/* Results Count Text */}
            <p className="text-sm text-secondary-600">
                Showing <span className="font-medium">{firstItem}</span>-
                <span className="font-medium">{lastItem}</span> of{' '}
                <span className="font-medium">{totalCount}</span> results
            </p>
            {/* Pagination Buttons */}
            <div className="flex items-center gap-1">
                <button
                    onClick={() => onPageChange(1)}
                    disabled={currentPage === 1 || loading}
                    className="btn btn-secondary px-2 py-1 text-xs" // Use global style
                >First</button>
                <button
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage === 1 || loading}
                    className="btn btn-secondary px-2 py-1 text-xs" // Use global style
                >Previous</button>
                <span className="text-sm text-secondary-600 px-2">
                    Page {currentPage} of {totalPages}
                </span>
                <button
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage === totalPages || loading}
                    className="btn btn-secondary px-2 py-1 text-xs" // Use global style
                >Next</button>
                <button
                    onClick={() => onPageChange(totalPages)}
                    disabled={currentPage === totalPages || loading}
                    className="btn btn-secondary px-2 py-1 text-xs" // Use global style
                >Last</button>
            </div>
        </div>
    );
};