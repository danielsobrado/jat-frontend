// src/components/RagInfoTab/components/RagInfoFilters.tsx
import React from 'react';

interface RagInfoFiltersProps {
    searchTerm: string;
    onSearchChange: (term: string) => void;
    loading: boolean;
}

export const RagInfoFilters: React.FC<RagInfoFiltersProps> = ({
    searchTerm,
    onSearchChange,
    loading
}) => {
    return (
        <div className="mb-4">
            <label htmlFor="ragSearch" className="label">
                Search Key / Description
            </label>
            <input
                type="text"
                id="ragSearch"
                placeholder="Search..."
                className="input" // Use global style from index.css
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
                disabled={loading}
            />
        </div>
    );
};