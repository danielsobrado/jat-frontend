import React, { useState } from 'react';
import { ClassificationForm } from '../components/ClassificationForm';
import { ApiClient } from '../api/types';
import { useAuth } from '../context/AuthContext';

interface TestPageProps {
  apiClient: ApiClient;
}

const TestPage: React.FC<TestPageProps> = ({ apiClient }) => {
  const { checkPermission } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [description, setDescription] = useState('');

  const handleSubmit = () => {
    if (!checkPermission('classify:item')) {
      return;
    }
    
    if (description.trim() === '') {
      return;
    }
    
    setIsLoading(true);
    // Form submission is handled by ClassificationForm component
  };

  return (
    <div className="page-container">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-secondary-900">Test Classification</h1>
        <p className="text-secondary-600">
          Use this tool to test classification of individual items
        </p>
      </div>
      
      <ClassificationForm apiClient={apiClient} />
      <button
        className={`px-6 py-3 rounded-lg font-medium text-white ${
          isLoading || description.trim() === '' || !checkPermission('classify:item')
            ? 'bg-gray-400 cursor-not-allowed'
            : 'bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2'
        }`}
        onClick={handleSubmit}
        disabled={isLoading || description.trim() === '' || !checkPermission('classify:item')}
        data-testid="classify-button"
        title={!checkPermission('classify:item') ? "You don't have permission to classify items" : ""}
      >
        {isLoading ? 'Classifying...' : 'Classify'}
      </button>
    </div>
  );
};

export default TestPage;