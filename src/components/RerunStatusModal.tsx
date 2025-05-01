import React from 'react';

interface RerunStatusModalProps {
  isOpen: boolean;
  description: string;
}

export const RerunStatusModal: React.FC<RerunStatusModalProps> = ({ isOpen, description }) => {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50">
      <div className="fixed inset-0 bg-black opacity-30"></div>
      <div className="relative bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <h3 className="text-lg font-medium text-secondary-900 mb-2">
            Rerunning Classification
          </h3>
          <p className="text-sm text-secondary-600 mb-4">
            {description}
          </p>
          <p className="text-xs text-secondary-500">
            This may take a few moments...
          </p>
        </div>
      </div>
    </div>
  );
};

export default RerunStatusModal;