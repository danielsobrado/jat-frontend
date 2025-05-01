// src/pages/UserManagementPage.tsx
import React from 'react';
import { ApiClient } from '../api/types';
import { useAuth } from '../context/AuthContext';
import { UserManagementComponent } from '../components/UserManagement/UserManagementComponent';

interface UserManagementPageProps {
  apiClient: ApiClient;
}

const UserManagementPage: React.FC<UserManagementPageProps> = ({ apiClient }) => {
  const { checkPermission } = useAuth();
  
  return (
    <div className="page-container">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-secondary-900">User Management</h1>
        <p className="text-secondary-600">
          View and manage user accounts and permissions
        </p>
      </div>
      
      {/* Display permission warning if needed */}
      {!checkPermission('users:manage') && (
        <div className="mb-6 p-4 border border-yellow-200 bg-yellow-50 rounded-lg">
          <p className="text-yellow-800">
            You don't have permission to view or manage users. 
            Please contact your administrator for access.
          </p>
        </div>
      )}
      
      {/* Only show user management component if user has permission */}
      {checkPermission('users:manage') && <UserManagementComponent apiClient={apiClient} />}
    </div>
  );
};

export default UserManagementPage;