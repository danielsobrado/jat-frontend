// src/components/RoleManagement/RoleManagementTab.tsx
import React, { useState, useCallback } from 'react';
import { Button, Space, message, Alert } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { ApiClient, Role, CreateRoleRequest, UpdateRoleRequest, Permission } from '../../api/types';
import { useRoles } from './hooks/useRoles';
import { RoleTable } from './components/RoleTable';
import { RoleFormModal } from './components/RoleFormModal';

interface RoleManagementTabProps {
  apiClient: ApiClient;
}

const RoleManagementTab: React.FC<RoleManagementTabProps> = ({ apiClient }) => {
  const {
    roles,
    permissions,
    loading,
    loadingPermissions,
    error,
    // totalRoles, // Add if using pagination
    fetchRoles, // Use to refresh
    createRole,
    updateRole,
    deleteRole,
  } = useRoles(apiClient);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | undefined>(undefined);

  const handleAddRole = () => {
    setEditingRole(undefined);
    setIsModalOpen(true);
  };

  const handleEditRole = (role: Role) => {
    // Ensure we have the permissions loaded for the role being edited
    // The hook should ideally fetch roles with their permissions,
    // but if not, you might need an extra fetch here or pass all permissions.
    console.log("Editing Role:", role);
    setEditingRole(role);
    setIsModalOpen(true);
  };

  const handleDeleteRole = async (id: number) => {
      // Confirmation is handled within the RoleTable component via Popconfirm
      await deleteRole(id);
      // Hook refreshes the list
  };

  const handleModalSubmit = async (data: CreateRoleRequest | UpdateRoleRequest): Promise<boolean> => {
    let success = false;
    if (editingRole) {
      success = !!await updateRole(editingRole.id, data as UpdateRoleRequest);
    } else {
      success = !!await createRole(data as CreateRoleRequest);
    }
    if (success) {
      setIsModalOpen(false);
      setEditingRole(undefined);
    }
    return success; // Let modal know if it succeeded
  };

  const handleModalClose = () => {
      setIsModalOpen(false);
      setEditingRole(undefined);
  }

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <div className="flex justify-end items-center">
        {/* Optional: Add Search/Filter for Roles */}
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={handleAddRole}
          disabled={loading || loadingPermissions} // Disable if loading roles or permissions
          loading={loading || loadingPermissions}
        >
          Add Role
        </Button>
      </div>

       {error && (
            <Alert message={`Error: ${error}`} type="error" showIcon className="mb-4" />
       )}

      <RoleTable
        roles={roles}
        loading={loading}
        onEdit={handleEditRole}
        onDelete={handleDeleteRole}
        // Pass pagination props if implemented
      />

      {/* Render modal only when needed */}
      {isModalOpen && (
          <RoleFormModal
            key={editingRole ? `edit-${editingRole.id}` : 'create'} // Force re-render on edit/create change
            isOpen={isModalOpen}
            onClose={handleModalClose}
            onSubmit={handleModalSubmit}
            initialData={editingRole}
            availablePermissions={permissions} // Pass all available permissions
            loading={loading} // Pass general loading state for submit button
            loadingPermissions={loadingPermissions} // Pass permission loading state
          />
      )}
    </Space>
  );
};

export default RoleManagementTab;