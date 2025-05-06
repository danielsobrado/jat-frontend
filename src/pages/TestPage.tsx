import React, { useState } from 'react'; // Remove unused useState and related hooks if not needed elsewhere
import { ClassificationForm } from '../components/ClassificationForm';
import { ApiClient } from '../api/types';
// Remove useAuth if checkPermission is no longer needed here
// import { useAuth } from '../context/AuthContext';

interface TestPageProps {
  apiClient: ApiClient;
}

const TestPage: React.FC<TestPageProps> = ({ apiClient }) => {
  // Remove state and handlers related to the deleted button
  // const { checkPermission } = useAuth();
  // const [isLoading, setIsLoading] = useState(false);
  // const [description, setDescription] = useState('');

  // const handleSubmit = () => { ... }; // This handler is no longer needed

  return (
    <div className="page-container">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-secondary-900">Test Classification</h1>
        <p className="text-secondary-600">
          Use this tool to test classification of individual items
        </p>
      </div>

      {/* The ClassificationForm component already contains the necessary inputs and its own submit button */}
      <ClassificationForm apiClient={apiClient} />

      {/* The redundant button has been removed from here */}

    </div>
  );
};

export default TestPage;