import React, { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, message, Space, Select, Tag, Tooltip } from 'antd';
import { useAuth } from '../../context/AuthContext';
import { EditOutlined, DeleteOutlined, EyeOutlined, PlusOutlined } from '@ant-design/icons';
import { 
  ApiClient, 
  CreateUserRequest,
  UpdateUserRequest,
  User,
  Role
} from '../../api/types';

// Define the types needed for User Management functionality
export interface UserManagementComponentProps {
  apiClient: ApiClient;
}

export const UserManagementComponent: React.FC<UserManagementComponentProps> = ({ apiClient }) => {
  // Get permission checker from auth context
  const { checkPermission } = useAuth();
  
  // Component state
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });
  const [form] = Form.useForm();
  
  // Load users and roles when component mounts
  useEffect(() => {
    loadUsers();
    loadRoles();
  }, []);
  
  const loadUsers = async (page = 1, pageSize = 10) => {
    setLoading(true);
    setError(null);
    
    try {
      const offset = (page - 1) * pageSize;
      const response = await apiClient.getUsers({ limit: pageSize, offset });
      
      setUsers(response.items || []);
      setPagination({
        current: page,
        pageSize: pageSize,
        total: response.totalCount || 0
      });
    } catch (err) {
      console.error('Failed to load users:', err);
      setError('Failed to load user accounts');
    } finally {
      setLoading(false);
    }
  };
  
  const loadRoles = async () => {
    try {
      const response = await apiClient.getRoles({ limit: 100 });
      setRoles(response.items || []);
    } catch (err) {
      console.error('Failed to load roles:', err);
      // We don't set the main error state here to avoid disrupting the UI
      message.error('Failed to load roles. Role selection may be incomplete.');
    }
  };
  
  const handleCreateUser = async (data: any) => {
    // Check if user has permission to create users
    if (!checkPermission('users:create')) {
      setError('You do not have permission to create users');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const request: CreateUserRequest = {
        username: data.username,
        password: data.password,
        roles: data.roles || []
      };
      
      await apiClient.createUser(request);
      message.success('User created successfully');
      setShowCreateModal(false);
      form.resetFields();
      loadUsers(pagination.current, pagination.pageSize); // Refresh the list
    } catch (err) {
      console.error('Failed to create user:', err);
      setError('Failed to create user account');
    } finally {
      setLoading(false);
    }
  };
  
  const handleUpdateUser = async (data: any) => {
    // Check if user has permission to update users
    if (!checkPermission('users:update')) {
      setError('You do not have permission to update users');
      return;
    }
    
    if (!selectedUser) {
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const request: UpdateUserRequest = {
        username: data.username !== selectedUser.username ? data.username : undefined,
        password: data.password || undefined, // Only include password if provided
        roles: data.roles // Always send roles to potentially update
      };
      
      // Filter out undefined fields for cleaner request
      const filteredRequest = Object.fromEntries(
        Object.entries(request).filter(([_, v]) => v !== undefined)
      ) as UpdateUserRequest;
      
      await apiClient.updateUser(selectedUser.id, filteredRequest);
      message.success('User updated successfully');
      setShowEditModal(false);
      form.resetFields();
      loadUsers(pagination.current, pagination.pageSize); // Refresh the list
    } catch (err) {
      console.error('Failed to update user:', err);
      setError('Failed to update user account');
    } finally {
      setLoading(false);
    }
  };
  
  const handleDeleteUser = async (id: number) => {
    // Check if user has permission to delete users
    if (!checkPermission('users:delete')) {
      setError('You do not have permission to delete users');
      return;
    }
    
    setLoading(true);
    
    try {
      await apiClient.deleteUser(id);
      message.success('User deleted successfully');
      
      // If we're on a page that might now be empty, go back one page
      const newTotal = pagination.total - 1;
      const newTotalPages = Math.ceil(newTotal / pagination.pageSize);
      const pageToLoad = pagination.current > newTotalPages && newTotalPages > 0 
        ? newTotalPages 
        : pagination.current;
        
      loadUsers(pageToLoad, pagination.pageSize); // Refresh the list
    } catch (err) {
      console.error('Failed to delete user:', err);
      setError('Failed to delete user account');
    } finally {
      setLoading(false);
    }
  };
  
  const showDeleteConfirm = (id: number, username: string) => {
    Modal.confirm({
      title: `Are you sure you want to delete ${username}?`,
      content: 'This action cannot be undone.',
      okText: 'Yes',
      okType: 'danger',
      cancelText: 'No',
      onOk() {
        handleDeleteUser(id);
      },
    });
  };
  
  const openCreateModal = () => {
    form.resetFields();
    setShowCreateModal(true);
  };
  
  const openEditModal = (user: User) => {
    setSelectedUser(user);
    form.setFieldsValue({
      username: user.username,
      // Don't set password field for editing
      roles: user.roles || []
    });
    setShowEditModal(true);
  };
  
  const openViewModal = (user: User) => {
    setSelectedUser(user);
    setShowViewModal(true);
  };
  
  const handlePageChange = (page: number, pageSize?: number) => {
    loadUsers(page, pageSize || pagination.pageSize);
  };
  
  const formatRoles = (roleNames: string[]) => {
    if (!roleNames || roleNames.length === 0) {
      return <Tag>No Roles</Tag>;
    }
    
    return (
      <Space size={[0, 4]} wrap>
        {roleNames.map(role => (
          <Tag color="blue" key={role}>{role}</Tag>
        ))}
      </Space>
    );
  };
  
  const columns = [
    {
      title: 'Username',
      dataIndex: 'username',
      key: 'username',
      sorter: (a: User, b: User) => a.username.localeCompare(b.username),
    },
    {
      title: 'Roles',
      dataIndex: 'roles',
      key: 'roles',
      render: (roles: string[]) => formatRoles(roles),
    },
    {
      title: 'Created At',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (text: string) => text ? new Date(text).toLocaleString() : '-',
    },
    {
      title: 'Updated At',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      render: (text: string) => text ? new Date(text).toLocaleString() : '-',
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: User) => (
        <Space size="small">
          <Button 
            type="text" 
            icon={<EyeOutlined />} 
            onClick={() => openViewModal(record)}
          />
          {checkPermission('users:update') && (
            <Button 
              type="text" 
              icon={<EditOutlined />} 
              onClick={() => openEditModal(record)}
            />
          )}
          {checkPermission('users:delete') && (
            <Button 
              type="text" 
              danger 
              icon={<DeleteOutlined />} 
              onClick={() => showDeleteConfirm(record.id, record.username)}
            />
          )}
        </Space>
      ),
    },
  ];
  
  return (
    <div className="user-management-container">
      {error && <div className="error-message mb-4 p-3 text-red-700 bg-red-50 border border-red-200 rounded">{error}</div>}
      
      <div className="actions-container" style={{ marginBottom: '16px' }}>
        {checkPermission('users:create') && (
          <Button 
            type="primary" 
            icon={<PlusOutlined />}
            onClick={openCreateModal}
          >
            Add New User
          </Button>
        )}
      </div>
      
      <Table
        dataSource={users}
        columns={columns}
        rowKey="id"
        loading={loading}
        pagination={{
          current: pagination.current,
          pageSize: pagination.pageSize,
          total: pagination.total,
          onChange: handlePageChange,
          showSizeChanger: true,
          pageSizeOptions: ['10', '20', '50'],
          showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} items`
        }}
      />
      
      {/* Create Modal */}
      <Modal
        title="Add New User"
        open={showCreateModal}
        onCancel={() => setShowCreateModal(false)}
        footer={null}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleCreateUser}
        >
          <Form.Item
            name="username"
            label="Username"
            rules={[{ required: true, message: 'Please enter a username' }]}
          >
            <Input />
          </Form.Item>
          
          <Form.Item
            name="password"
            label="Password"
            rules={[{ required: true, message: 'Please enter a password' }]}
            hasFeedback
          >
            <Input.Password />
          </Form.Item>
          
          <Form.Item
            name="confirmPassword"
            label="Confirm Password"
            dependencies={['password']}
            hasFeedback
            rules={[
              { required: true, message: 'Please confirm the password' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('password') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('The two passwords do not match'));
                },
              }),
            ]}
          >
            <Input.Password />
          </Form.Item>
          
          <Form.Item
            name="roles"
            label="Roles"
          >
            <Select
              mode="multiple"
              placeholder="Select roles"
              optionFilterProp="label"
            >
              {roles.map(role => (
                <Select.Option key={role.id} value={role.name} label={role.name}>
                  <div>
                    <div>{role.name}</div>
                    {role.description && (
                      <div className="text-xs text-gray-500">{role.description}</div>
                    )}
                  </div>
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} style={{ marginRight: 8 }}>
              Create
            </Button>
            <Button onClick={() => setShowCreateModal(false)}>
              Cancel
            </Button>
          </Form.Item>
        </Form>
      </Modal>
      
      {/* Edit Modal */}
      <Modal
        title="Edit User"
        open={showEditModal}
        onCancel={() => setShowEditModal(false)}
        footer={null}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleUpdateUser}
        >
          <Form.Item
            name="username"
            label="Username"
            rules={[{ required: true, message: 'Please enter a username' }]}
          >
            <Input disabled />
          </Form.Item>
          
          <Form.Item
            name="password"
            label="New Password (leave blank to keep current)"
            hasFeedback
          >
            <Input.Password />
          </Form.Item>
          
          <Form.Item
            name="confirmPassword"
            label="Confirm New Password"
            dependencies={['password']}
            hasFeedback
            rules={[
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!getFieldValue('password') || !value || getFieldValue('password') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('The two passwords do not match'));
                },
              }),
            ]}
          >
            <Input.Password />
          </Form.Item>
          
          <Form.Item
            name="roles"
            label="Roles"
          >
            <Select
              mode="multiple"
              placeholder="Select roles"
              optionFilterProp="label"
            >
              {roles.map(role => (
                <Select.Option key={role.id} value={role.name} label={role.name}>
                  <div>
                    <div>{role.name}</div>
                    {role.description && (
                      <div className="text-xs text-gray-500">{role.description}</div>
                    )}
                  </div>
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} style={{ marginRight: 8 }}>
              Update
            </Button>
            <Button onClick={() => setShowEditModal(false)}>
              Cancel
            </Button>
          </Form.Item>
        </Form>
      </Modal>
      
      {/* View Modal */}
      <Modal
        title="User Details"
        open={showViewModal}
        onCancel={() => setShowViewModal(false)}
        footer={[
          <Button key="close" onClick={() => setShowViewModal(false)}>
            Close
          </Button>
        ]}
      >
        {selectedUser && (
          <>
            <p><strong>Username:</strong> {selectedUser.username}</p>
            <p><strong>Roles:</strong></p>
            <div className="mb-3">{formatRoles(selectedUser.roles)}</div>
            <p><strong>Created:</strong> {selectedUser.createdAt ? new Date(selectedUser.createdAt).toLocaleString() : 'N/A'}</p>
            <p><strong>Last Updated:</strong> {selectedUser.updatedAt ? new Date(selectedUser.updatedAt).toLocaleString() : 'N/A'}</p>
          </>
        )}
      </Modal>
    </div>
  );
};

export default UserManagementComponent;