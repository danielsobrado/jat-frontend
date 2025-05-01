import React from 'react';
import { HistoryTab } from '../components/HistoryTab';
import { ApiClient } from '../api/types';

interface HistoryPageProps {
  apiClient: ApiClient;
}

const HistoryPage: React.FC<HistoryPageProps> = ({ apiClient }) => {
  return (
    <div className="page-container">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-secondary-900">Classification History</h1>
        <p className="text-secondary-600">
          View and manage previous classification results
        </p>
      </div>
      
      <HistoryTab apiClient={apiClient} />
    </div>
  );
};

export default HistoryPage;