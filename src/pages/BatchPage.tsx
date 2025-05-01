import React, { useState, useEffect } from 'react';
import BatchTab from '../components/BatchTab/BatchTab';
import { ApiClient, ClassificationSystem } from '../api/types';
import { useAuth } from '../context/AuthContext';

interface BatchPageProps {
  apiClient: ApiClient;
}

const BatchPage: React.FC<BatchPageProps> = ({ apiClient }) => {
  const { checkPermission } = useAuth();
  const [availableSystems, setAvailableSystems] = useState<ClassificationSystem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [canSubmit, setCanSubmit] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load available systems
  useEffect(() => {
    const loadSystems = async () => {
      try {
        const systems = await apiClient.getClassificationSystems();
        setAvailableSystems(systems);
      } catch (err) {
        console.error('Failed to load classification systems:', err);
      }
    };
    loadSystems();
  }, [apiClient]);

  const handleSubmit = async () => {
    // Check permission before submitting batch
    if (!checkPermission('classify:batch')) {
      setError('You do not have permission to perform batch classifications');
      return;
    }
  };

  return (
    <div className="page-container">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-secondary-900">Batch Classification</h1>
        <p className="text-secondary-600">Process multiple items for classification at once</p>
      </div>

      {/* Add permission check warning if user lacks permission */}
      {!checkPermission('classify:batch') && (
        <div className="mb-6 p-4 border border-yellow-200 bg-yellow-50 rounded-lg">
          <p className="text-yellow-800">
            You don't have permission to perform batch classifications. Please contact your administrator for access.
          </p>
        </div>
      )}
      
      <BatchTab apiClient={apiClient} availableSystems={availableSystems.map(s => ({ system: s }))} />
    </div>
  );
};

export default BatchPage;