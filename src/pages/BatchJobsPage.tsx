import React from 'react';
import BatchJobsTab from '../components/BatchJobsTab/BatchJobsTab';
import { ApiClient } from '../api/types';

interface BatchJobsPageProps {
  apiClient: ApiClient;
}

const BatchJobsPage: React.FC<BatchJobsPageProps> = ({ apiClient }) => {
  return (
    <div className="page-container">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-secondary-900">Batch Jobs</h1>
        <p className="text-secondary-600">
          View and manage batch classification jobs
        </p>
      </div>
      
      <BatchJobsTab apiClient={apiClient} />
    </div>
  );
};

export default BatchJobsPage;