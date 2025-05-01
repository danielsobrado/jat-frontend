import React, { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, message, Space, Select, Tag, Tooltip, Row, Col, Alert } from 'antd';
import { useAuth } from '../../context/AuthContext';
import { EditOutlined, DeleteOutlined, EyeOutlined, PlusOutlined } from '@ant-design/icons';
import { 
  ApiClient, 
  CreateRoleRequest,
  UpdateRoleRequest,
  Role,
  Permission
} from '../../api/types';

// Define the types needed for Role Management functionality
export interface RoleManagementComponentProps {
  apiClient: ApiClient;
}

export const RoleManagementComponent: React.FC<RoleManagementComponentProps> = ({ apiClient }) => {
  // Get permission checker from auth context
  const { checkPermission } = useAuth();
  
  // Component state
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingPermissions, setLoadingPermissions] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });
  const [form] = Form.useForm();
  
  // State for tracking selected permissions directly
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  
  // Load roles and permissions when component mounts
  useEffect(() => {
    loadRoles();
    loadPermissions();
  }, []);
  
  // Reset selected permissions when modals close
  useEffect(() => {
    if (!showCreateModal && !showEditModal) {
      setSelectedPermissions([]);
    }
  }, [showCreateModal, showEditModal]);
  
  const loadRoles = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await apiClient.getRoles({ limit: 500 }); // Get all roles, adjust if needed
      setRoles(response.items || []);
      setPagination({
        ...pagination,
        total: response.totalCount || 0
      });
    } catch (err) {
      console.error('Failed to load roles:', err);
      setError('Failed to load roles');
    } finally {
      setLoading(false);
    }
  };
  
  const loadPermissions = async () => {
    setLoadingPermissions(true);
    
    try {
      const response = await apiClient.getPermissions();
      setPermissions(response.items || []);
    } catch (err) {
      console.error('Failed to load permissions:', err);
      message.error('Failed to load permissions. Permission selection may be incomplete.');
    } finally {
      setLoadingPermissions(false);
    }
  };
  
  const handleCreateRole = async (data: any) => {
    // Check if user has permission to create roles
    if (!checkPermission('roles:create')) {
      setError('You do not have permission to create roles');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const request: CreateRoleRequest = {
        name: data.name,
        description: data.description || undefined,
        permissions: selectedPermissions // Use the directly managed state
      };
      
      await apiClient.createRole(request);
      message.success('Role created successfully');
      setShowCreateModal(false);
      form.resetFields();
      setSelectedPermissions([]);
      loadRoles(); // Refresh the list
    } catch (err) {
      console.error('Failed to create role:', err);
      setError('Failed to create role');
    } finally {
      setLoading(false);
    }
  };
  
  const handleUpdateRole = async (data: any) => {
    // Check if user has permission to update roles
    if (!checkPermission('roles:update')) {
      setError('You do not have permission to update roles');
      return;
    }
    
    if (!selectedRole) {
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const request: UpdateRoleRequest = {
        name: data.name !== selectedRole.name ? data.name : undefined,
        description: data.description !== selectedRole.description ? data.description : undefined,
        permissions: selectedPermissions // Use the directly managed state
      };
      
      // Filter out undefined fields for cleaner request
      const filteredRequest = Object.fromEntries(
        Object.entries(request).filter(([_, v]) => v !== undefined)
      ) as UpdateRoleRequest;

      // Ensure permissions are always sent
      if (!filteredRequest.permissions) {
        filteredRequest.permissions = selectedPermissions;
      }
      
      await apiClient.updateRole(selectedRole.id, filteredRequest);
      message.success('Role updated successfully');
      setShowEditModal(false);
      form.resetFields();
      setSelectedPermissions([]);
      loadRoles(); // Refresh the list
    } catch (err) {
      console.error('Failed to update role:', err);
      setError('Failed to update role');
    } finally {
      setLoading(false);
    }
  };
  
  const handleDeleteRole = async (id: number) => {
    // Check if user has permission to delete roles
    if (!checkPermission('roles:delete')) {
      setError('You do not have permission to delete roles');
      return;
    }
    
    setLoading(true);
    
    try {
      await apiClient.deleteRole(id);
      message.success('Role deleted successfully');
      loadRoles(); // Refresh the list
    } catch (err) {
      console.error('Failed to delete role:', err);
      setError('Failed to delete role');
    } finally {
      setLoading(false);
    }
  };
  
  const showDeleteConfirm = (id: number, name: string) => {
    // Don't allow deletion of core roles
    if (name === 'admin' || name === 'classifier') {
      message.error('Core system roles cannot be deleted');
      return;
    }
    
    Modal.confirm({
      title: `Are you sure you want to delete ${name}?`,
      content: 'This action cannot be undone. Users with only this role will lose permissions.',
      okText: 'Yes',
      okType: 'danger',
      cancelText: 'No',
      onOk() {
        handleDeleteRole(id);
      },
    });
  };
  
  const openCreateModal = () => {
    form.resetFields();
    setSelectedPermissions([]);
    setShowCreateModal(true);
  };
  
  const openEditModal = (role: Role) => {
    setSelectedRole(role);
    
    // Map role permissions to just the codes for the form
    const permissionCodes = role.permissions ? role.permissions.map(p => p.code) : [];
    
    form.setFieldsValue({
      name: role.name,
      description: role.description || '',
    });
    
    // Set selected permissions directly in state
    setSelectedPermissions(permissionCodes);
    
    setShowEditModal(true);
  };
  
  const openViewModal = (role: Role) => {
    setSelectedRole(role);
    setShowViewModal(true);
  };
  
  const isCoreRole = (name: string): boolean => {
    return name === 'admin' || name === 'classifier';
  };
  
  const formatPermissions = (perms: Permission[] | undefined) => {
    if (!perms || perms.length === 0) {
      return <Tag>No Permissions</Tag>;
    }
    
    const displayCount = 3; // Max permissions to show directly
    const hiddenCount = perms.length - displayCount;
    
    return (
      <Space size={[0, 4]} wrap>
        {perms.slice(0, displayCount).map(perm => (
          <Tooltip key={perm.id} title={perm.description || perm.code}>
            <Tag color="blue" style={{ cursor: 'help' }}>{perm.code}</Tag>
          </Tooltip>
        ))}
        {hiddenCount > 0 && (
          <Tooltip title={perms.slice(displayCount).map(p => p.code).join(', ')}>
            <Tag>+{hiddenCount} more</Tag>
          </Tooltip>
        )}
      </Space>
    );
  };
  
  const handlePermissionChange = (category: string, selected: string[]) => {
    // Get all permissions for this category
    const categoryPermissions = permissions
      .filter(p => (p.code.split(':')[0] || 'other') === category)
      .map(p => p.code);
    
    // Remove all permissions from this category from the selected list
    const filteredPermissions = selectedPermissions.filter(
      code => !categoryPermissions.includes(code)
    );
    
    // Add newly selected permissions from this category
    const newSelectedPermissions = [...filteredPermissions, ...selected];
    setSelectedPermissions(newSelectedPermissions);
  };
  
  // Group permissions by category for better organization
  const groupPermissionsByCategory = (perms: Permission[]) => {
    const grouped: Record<string, Permission[]> = {};
    
    perms.forEach(perm => {
      const category = perm.code.split(':')[0] || 'other';
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(perm);
    });
    
    return Object.entries(grouped).sort(([catA], [catB]) => {
      if (catA === 'other') return 1;
      if (catB === 'other') return -1;
      return catA.localeCompare(catB);
    });
  };

  const columns = [
    {
      title: 'Role Name',
      dataIndex: 'name',
      key: 'name',
      sorter: (a: Role, b: Role) => a.name.localeCompare(b.name),
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: 'Permissions',
      dataIndex: 'permissions',
      key: 'permissions',
      render: (permissions: Permission[]) => formatPermissions(permissions),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: Role) => (
        <Space size="small">
          <Button 
            type="text" 
            icon={<EyeOutlined />} 
            onClick={() => openViewModal(record)}
          />
          {checkPermission('roles:update') && (
            <Button 
              type="text" 
              icon={<EditOutlined />} 
              onClick={() => openEditModal(record)}
            />
          )}
          {checkPermission('roles:delete') && !isCoreRole(record.name) && (
            <Button 
              type="text" 
              danger 
              icon={<DeleteOutlined />} 
              onClick={() => showDeleteConfirm(record.id, record.name)}
            />
          )}
        </Space>
      ),
    },
  ];
  
  return (
    <div className="role-management-container">
      {error && <div className="error-message mb-4 p-3 text-red-700 bg-red-50 border border-red-200 rounded">{error}</div>}
      
      <div className="actions-container" style={{ marginBottom: '16px' }}>
        {checkPermission('roles:create') && (
          <Button 
            type="primary" 
            icon={<PlusOutlined />}
            onClick={openCreateModal}
          >
            Add New Role
          </Button>
        )}
      </div>
      
      <Table
        dataSource={roles}
        columns={columns}
        rowKey="id"
        loading={loading}
        pagination={false} // Typically roles won't require pagination
      />
      
      {/* Create Modal - Using direct state for permissions instead of form fields */}
      <Modal
        title="Add New Role"
        open={showCreateModal}
        onCancel={() => setShowCreateModal(false)}
        footer={null}
        width={700} // Wider modal for permissions list
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleCreateRole}
        >
          <Form.Item
            name="name"
            label="Role Name"
            rules={[{ required: true, message: 'Please enter a role name' }]}
          >
            <Input placeholder="Enter role name (e.g., data_analyst)" />
          </Form.Item>
          
          <Form.Item
            name="description"
            label="Description"
          >
            <Input.TextArea rows={2} placeholder="Description of the role's purpose and access level" />
          </Form.Item>
          
          <div className="form-section">
            <label className="ant-form-item-label">
              <span className="ant-form-item-label-text">Permissions</span>
            </label>
            <div className="ant-form-item-explain">Select permissions for this role</div>
            <div className="permissions-section" style={{ marginTop: '8px' }}>
              {groupPermissionsByCategory(permissions).map(([category, perms]) => {
                // Get the currently selected permissions for this category
                const categoryPermissions = selectedPermissions.filter(code => 
                  perms.some(p => p.code === code)
                );
                
                return (
                  <div key={category} className="mb-4">
                    <div className="font-medium text-gray-600 capitalize mb-2">
                      {category.replace(/_/g, ' ')} Permissions
                    </div>
                    <Select
                      mode="multiple"
                      placeholder={`Select ${category} permissions`}
                      style={{ width: '100%' }}
                      allowClear
                      options={perms.map(perm => ({
                        label: perm.code,
                        value: perm.code,
                        title: perm.description || perm.code,
                      }))}
                      value={categoryPermissions}
                      onChange={(values) => handlePermissionChange(category, values)}
                      listHeight={200}
                      maxTagCount={5}
                      optionFilterProp="label"
                    />
                  </div>
                );
              })}
              
              {selectedPermissions.length === 0 && (
                <div className="ant-form-item-explain ant-form-item-explain-error">
                  Please select at least one permission
                </div>
              )}
            </div>
          </div>
          
          <Form.Item style={{ marginTop: '16px' }}>
            <Button 
              type="primary" 
              htmlType="submit" 
              loading={loading} 
              style={{ marginRight: 8 }}
              disabled={selectedPermissions.length === 0}
            >
              Create
            </Button>
            <Button onClick={() => setShowCreateModal(false)}>
              Cancel
            </Button>
          </Form.Item>
        </Form>
      </Modal>
      
      {/* Edit Modal - Using direct state for permissions instead of form fields */}
      <Modal
        title={`Edit Role: ${selectedRole?.name}`}
        open={showEditModal}
        onCancel={() => setShowEditModal(false)}
        footer={null}
        width={700} // Wider modal for permissions list
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleUpdateRole}
        >
          {selectedRole && isCoreRole(selectedRole.name) && (
            <Alert
              message="Core Role"
              description="This is a core system role. Some properties cannot be modified to prevent system disruption."
              type="warning"
              showIcon
              className="mb-4"
            />
          )}
          
          <Form.Item
            name="name"
            label="Role Name"
            rules={[{ required: true, message: 'Please enter a role name' }]}
          >
            <Input disabled={selectedRole ? isCoreRole(selectedRole.name) : false} />
          </Form.Item>
          
          <Form.Item
            name="description"
            label="Description"
          >
            <Input.TextArea rows={2} />
          </Form.Item>
          
          <div className="form-section">
            <label className="ant-form-item-label">
              <span className="ant-form-item-label-text">Permissions</span>
            </label>
            <div className="permissions-section">
              {groupPermissionsByCategory(permissions).map(([category, perms]) => {
                // Get the currently selected permissions for this category
                const categoryPermissions = selectedPermissions.filter(code => 
                  perms.some(p => p.code === code)
                );
                
                return (
                  <div key={category} className="mb-4">
                    <div className="font-medium text-gray-600 capitalize mb-2">
                      {category.replace(/_/g, ' ')} Permissions
                    </div>
                    <Select
                      mode="multiple"
                      placeholder={`Select ${category} permissions`}
                      style={{ width: '100%' }}
                      allowClear
                      options={perms.map(perm => ({
                        label: perm.code,
                        value: perm.code,
                        title: perm.description || perm.code,
                        disabled: selectedRole && isCoreRole(selectedRole.name) ? 
                          (perm.code === 'roles:manage' || perm.code === 'users:manage') : undefined
                      }))}
                      value={categoryPermissions}
                      onChange={(values) => handlePermissionChange(category, values)}
                      listHeight={200}
                      maxTagCount={5}
                      optionFilterProp="label"
                    />
                  </div>
                );
              })}
            </div>
          </div>
          
          <Form.Item style={{ marginTop: '16px' }}>
            <Button 
              type="primary" 
              htmlType="submit" 
              loading={loading} 
              style={{ marginRight: 8 }}
              disabled={selectedPermissions.length === 0}
            >
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
        title="Role Details"
        open={showViewModal}
        onCancel={() => setShowViewModal(false)}
        footer={[
          <Button key="close" onClick={() => setShowViewModal(false)}>
            Close
          </Button>
        ]}
        width={600}
      >
        {selectedRole && (
          <>
            <p><strong>Name:</strong> {selectedRole.name}</p>
            <p><strong>Description:</strong> {selectedRole.description || 'No description'}</p>
            <p><strong>Permissions:</strong></p>
            
            {selectedRole.permissions && selectedRole.permissions.length > 0 ? (
              <div className="mb-3 border p-3 rounded bg-gray-50" style={{ maxHeight: '200px', overflow: 'auto' }}>
                {groupPermissionsByCategory(selectedRole.permissions).map(([category, perms]) => (
                  <div key={category} className="mb-3 last:mb-0">
                    <div className="font-medium capitalize mb-1">{category.replace(/_/g, ' ')}:</div>
                    <div className="pl-2">
                      {perms.map(perm => (
                        <div key={perm.id} className="mb-1">
                          <Tag color="blue">{perm.code}</Tag>
                          {perm.description && <span className="text-sm text-gray-600 ml-2">{perm.description}</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-gray-500">This role has no assigned permissions</div>
            )}
          </>
        )}
      </Modal>
    </div>
  );
};

export default RoleManagementComponent;