import React from 'react';
import { ApiClient } from '../api/types';
import { useAuth } from '../context/AuthContext';
import { RoleManagementComponent } from '../components/RoleManagement/RoleManagementComponent';

interface RoleManagementPageProps {
  apiClient: ApiClient;
}

const RoleManagementPage: React.FC<RoleManagementPageProps> = ({ apiClient }) => {
  const { checkPermission } = useAuth();
  
  return (
    <div className="page-container">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-secondary-900">Role Management</h1>
        <p className="text-secondary-600">
          View and manage roles and their permissions
        </p>
      </div>
      
      {/* Display permission warning if needed */}
      {!checkPermission('roles:manage') && (
        <div className="mb-6 p-4 border border-yellow-200 bg-yellow-50 rounded-lg">
          <p className="text-yellow-800">
            You don't have permission to view or manage roles. 
            Please contact your administrator for access.
          </p>
        </div>
      )}
      
      {/* Only show role management component if user has permission */}
      {checkPermission('roles:manage') && <RoleManagementComponent apiClient={apiClient} />}
    </div>
  );
};

export default RoleManagementPage;