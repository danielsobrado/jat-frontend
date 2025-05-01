// src/components/RagInfoTab/components/RagInfoFormModal.tsx
import React, { useState, useEffect } from 'react';
import { RagInfoItem, CreateRagInfoRequest, UpdateRagInfoRequest } from '../../../api/types'; // Adjust path

interface RagInfoFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: CreateRagInfoRequest | UpdateRagInfoRequest) => Promise<boolean>; // Returns true on success
    initialData?: RagInfoItem; // For editing
    loading: boolean;
}

export const RagInfoFormModal: React.FC<RagInfoFormModalProps> = ({
    isOpen,
    onClose,
    onSubmit,
    initialData,
    loading
}) => {
    const [key, setKey] = useState('');
    const [description, setDescription] = useState('');
    const [error, setError] = useState<string | null>(null);

    const isEditMode = !!initialData;

    useEffect(() => {
        if (isOpen) {
            if (isEditMode) {
                setKey(initialData.key);
                setDescription(initialData.description);
            } else {
                setKey('');
                setDescription('');
            }
            setError(null); // Reset error when modal opens
        }
    }, [isOpen, initialData, isEditMode]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        if (!key.trim() || !description.trim()) {
            setError('Key and Description cannot be empty.');
            return;
        }

        const data: CreateRagInfoRequest | UpdateRagInfoRequest = isEditMode
            ? { description: description.trim() } // Only allow updating description for now
            : { key: key.trim(), description: description.trim() };

        const success = await onSubmit(data);
        if (success) {
            onClose();
        } else {
             // Assuming the hook sets the error state visible in the main tab
             // If you want modal-specific errors, onSubmit should return error message
            setError("Operation failed. Please check the main page for errors.");
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
                <form onSubmit={handleSubmit}>
                    <div className="p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-semibold text-secondary-900">
                                {isEditMode ? 'Edit Information' : 'Add New Information'}
                            </h2>
                            <button
                                type="button"
                                onClick={onClose}
                                className="text-secondary-400 hover:text-secondary-600"
                                disabled={loading}
                                aria-label="Close modal"
                            >
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {error && (
                            <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                                {error}
                            </div>
                        )}

                        <div className="space-y-4">
                            <div>
                                <label htmlFor="ragKey" className="label">Key *</label>
                                <input
                                    type="text"
                                    id="ragKey"
                                    value={key}
                                    onChange={(e) => setKey(e.target.value)}
                                    className="input"
                                    required
                                    disabled={isEditMode || loading} // Disable key editing in edit mode
                                />
                                 {isEditMode && <p className="text-xs text-secondary-500 mt-1">Key cannot be changed after creation.</p>}
                            </div>
                            <div>
                                <label htmlFor="ragDescription" className="label">Description *</label>
                                <textarea
                                    id="ragDescription"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    className="input" // Use global style
                                    rows={4}
                                    required
                                    disabled={loading}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="bg-secondary-50 px-6 py-3 flex justify-end space-x-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="btn btn-secondary" // Use global style
                            disabled={loading}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="btn btn-primary" // Use global style
                            disabled={loading || !key.trim() || !description.trim()}
                        >
                            {loading ? 'Saving...' : (isEditMode ? 'Save Changes' : 'Add Information')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};