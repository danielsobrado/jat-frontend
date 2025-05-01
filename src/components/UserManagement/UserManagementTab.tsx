// src/components/UserManagement/UserManagementTab.tsx
import React, { useState, useCallback, useMemo } from 'react';
import { Button, Input, Space, message } from 'antd';
import { PlusOutlined, SearchOutlined } from '@ant-design/icons';
import { ApiClient, User, CreateUserRequest, UpdateUserRequest } from '../../api/types';
import { useUsers } from './hooks/useUsers'; // Import the hook
import { UserTable } from './components/UserTable';
import { UserFormModal } from './components/UserFormModal'; // Correct import path
import debounce from 'lodash/debounce'; // Import debounce

interface UserManagementTabProps {
  apiClient: ApiClient;
}

const UserManagementTab: React.FC<UserManagementTabProps> = ({ apiClient }) => {
  const {
    users,
    roles, // Get available roles
    loading,
    loadingRoles,
    error,
    pagination,
    fetchUsers,
    createUser,
    updateUser,
    deleteUser,
  } = useUsers(apiClient); // Use the hook

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | undefined>(undefined);
  const [searchTerm, setSearchTerm] = useState('');

  // Debounced search handler
   const debouncedSearch = useCallback(
       debounce((value: string) => {
           fetchUsers(1, pagination.pageSize, value); // Reset to page 1 on search
       }, 500), // 500ms debounce delay
       [fetchUsers, pagination.pageSize]
   );

   const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
       const value = e.target.value;
       setSearchTerm(value);
       debouncedSearch(value);
   };


  const handleAddUser = () => {
    setEditingUser(undefined); // Clear editing state
    setIsModalOpen(true);
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setIsModalOpen(true);
  };

  const handleDeleteUser = async (id: number) => {
    await deleteUser(id);
    // The hook handles refresh
  };

  const handleModalSubmit = async (data: CreateUserRequest | UpdateUserRequest): Promise<boolean> => {
    let success = false;
    if (editingUser) {
      const result = await updateUser(editingUser.id, data as UpdateUserRequest);
      success = !!result;
    } else {
      const result = await createUser(data as CreateUserRequest);
      success = !!result;
    }
    if (success) {
        setIsModalOpen(false); // Close modal on success
        setEditingUser(undefined);
    }
    return success; // Return success status to modal
  };

   const handleTableChange = (page: number, pageSize: number) => {
       fetchUsers(page, pageSize, searchTerm); // Fetch data for the new page/size
   };

   // Create a map of role names to descriptions for tooltips
   const rolesMap = useMemo(() => {
       const map = new Map<string, string>();
       roles.forEach(role => map.set(role.name, role.description || role.name));
       return map;
   }, [roles]);


  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <div className="flex justify-between items-center">
           <Input
               placeholder="Search users..."
               prefix={<SearchOutlined />}
               value={searchTerm}
               onChange={handleSearchChange}
               style={{ width: 300 }}
               allowClear
           />
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleAddUser}
            disabled={loading || loadingRoles} // Disable if roles haven't loaded
          >
            Add User
          </Button>
        </div>

      <UserTable
        users={users}
        rolesMap={rolesMap} // Pass the roles map
        loading={loading}
        pagination={pagination}
        onEdit={handleEditUser}
        onDelete={handleDeleteUser}
        onPageChange={handleTableChange}
      />

      <UserFormModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingUser(undefined); // Clear editing state on close
        }}
        onSubmit={handleModalSubmit}
        initialData={editingUser}
        availableRoles={roles} // Pass roles to modal
        loading={loading}
        loadingRoles={loadingRoles}
      />
    </Space>
  );
};

export default UserManagementTab;