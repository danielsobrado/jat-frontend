// src/pages/RagInfoPage.tsx
import React from 'react';
import { ApiClient } from '../api/types';
import { RagInfoTab } from '../components/RagInfoTab'; // Correct import for the main tab component
import { useAuth } from '../context/AuthContext';

interface RagInfoPageProps {
  apiClient: ApiClient;
}

const RagInfoPage: React.FC<RagInfoPageProps> = ({ apiClient }) => {
  // Get permission checker from auth context
  const { checkPermission } = useAuth();

  return (
    <div className="page-container">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-secondary-900">Information Management</h1>
        <p className="text-secondary-600">
          Manage information for RAG classification assistance
        </p>
      </div>

      {/* Display permission warning if needed */}
      {!checkPermission('rag:view') && (
        <div className="mb-6 p-4 border border-yellow-200 bg-yellow-50 rounded-lg">
          <p className="text-yellow-800">
            You don't have permission to view or manage RAG information.
            Please contact your administrator for access.
          </p>
        </div>
      )}

      {/* Only show RAG info component if user has permission */}
      {/* Render RagInfoTab (which contains the table, filters, buttons etc.) */}
      {checkPermission('rag:view') && <RagInfoTab apiClient={apiClient} />}

    </div>
  );
};

export default RagInfoPage;