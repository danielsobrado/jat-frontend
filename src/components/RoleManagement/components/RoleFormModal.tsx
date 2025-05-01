// src/components/RoleManagement/components/RoleFormModal.tsx
import React, { useEffect, useState } from 'react';
import { Modal, Form, Input, Select, Button, Spin, Alert, Checkbox, Row, Col, Tooltip, message } from 'antd';
import { Role, Permission, CreateRoleRequest, UpdateRoleRequest } from '../../../api/types';

interface RoleFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateRoleRequest | UpdateRoleRequest) => Promise<boolean>; // Returns success status
  initialData?: Role;
  availablePermissions: Permission[];
  loading: boolean; // Loading state for submission
  loadingPermissions: boolean; // Loading state for permissions list
}

const { Option } = Select;

export const RoleFormModal: React.FC<RoleFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  availablePermissions,
  loading,
  loadingPermissions,
}) => {
  const [form] = Form.useForm();
  const [formError, setFormError] = useState<string | null>(null);

  const isEditMode = !!initialData;
  const isCoreRole = isEditMode && (initialData?.name === 'admin' || initialData?.name === 'classifier');

  useEffect(() => {
    if (isOpen) {
      setFormError(null);
      if (isEditMode && initialData) {
        form.setFieldsValue({
          name: initialData.name,
          description: initialData.description || '',
          permissions: (initialData.permissions || []).map(p => p.code), // Set codes for Checkbox.Group
        });
      } else {
        form.resetFields();
      }
    }
  }, [isOpen, initialData, form, isEditMode]);

  const handleFinish = async (values: any) => {
    setFormError(null);
    const permissionCodes = values.permissions || [];

    let success = false;
    if (isEditMode && initialData) {
      const updateData: UpdateRoleRequest = {
        name: values.name !== initialData.name ? values.name : undefined, // Only send if changed
        description: values.description !== (initialData.description || '') ? values.description : undefined,
        permissions: permissionCodes, // Always send permissions array
      };
       // Filter out undefined fields
       const filteredUpdateData = Object.fromEntries(
           Object.entries(updateData).filter(([_, v]) => v !== undefined)
       ) as UpdateRoleRequest;

        // Check if anything changed (permissions comparison needs care)
        const initialPermCodes = (initialData.permissions || []).map(p => p.code).sort();
        const currentPermCodes = [...permissionCodes].sort();
        const permsChanged = JSON.stringify(initialPermCodes) !== JSON.stringify(currentPermCodes);

        if (Object.keys(filteredUpdateData).length === 0 && !permsChanged) {
            message.info("No changes detected.");
            onClose();
            return;
        }
        // If only permissions changed, ensure the permissions field is included
        if (Object.keys(filteredUpdateData).length === 0 && permsChanged) {
            filteredUpdateData.permissions = permissionCodes;
        }


      success = await onSubmit(filteredUpdateData);
    } else {
      const createData: CreateRoleRequest = {
        name: values.name,
        description: values.description || undefined,
        permissions: permissionCodes,
      };
      success = await onSubmit(createData);
    }

    if (success) {
      onClose();
    } else {
      setFormError("Failed to save role. Please check the console for details.");
    }
  };

  return (
    <Modal
      title={isEditMode ? `Edit Role: ${initialData?.name}` : 'Create New Role'}
      open={isOpen}
      onCancel={onClose}
      confirmLoading={loading}
      destroyOnClose
      footer={[
        <Button key="back" onClick={onClose} disabled={loading}>
          Cancel
        </Button>,
        <Button key="submit" type="primary" loading={loading} onClick={() => form.submit()}>
          {isEditMode ? 'Save Changes' : 'Create Role'}
        </Button>,
      ]}
      width={700} // Wider modal for permissions
    >
      <Spin spinning={loading || loadingPermissions}>
        {formError && <Alert message={formError} type="error" showIcon closable onClose={() => setFormError(null)} className="mb-4" />}
        <Form
          form={form}
          layout="vertical"
          onFinish={handleFinish}
          name="roleForm"
        >
          <Form.Item
            name="name"
            label="Role Name"
            rules={[{ required: true, message: 'Please input the role name!' }]}
          >
            <Input placeholder="Enter role name (e.g., data_viewer)" disabled={isCoreRole} />
            {isCoreRole && <p className="text-xs text-amber-600 mt-1">Core role names cannot be changed.</p>}
          </Form.Item>

          <Form.Item
            name="description"
            label="Description"
          >
            <Input.TextArea rows={2} placeholder="Optional: Describe the role's purpose" />
          </Form.Item>

          <Form.Item
            name="permissions"
            label="Permissions"
             rules={[{ type: 'array' }]}
          >
            <Checkbox.Group style={{ width: '100%' }}>
                <Row gutter={[8, 8]}>
                    {availablePermissions.sort((a, b) => a.code.localeCompare(b.code)).map(perm => (
                        <Col span={12} key={perm.id}>
                           <Tooltip title={perm.description || perm.code} placement="right">
                             <Checkbox value={perm.code} disabled={isCoreRole && perm.code !== 'config:update' && perm.code !== 'classify:item'}> {/* Example: prevent removing most admin perms */}
                                {perm.code}
                             </Checkbox>
                           </Tooltip>
                        </Col>
                    ))}
                     {availablePermissions.length === 0 && !loadingPermissions && (
                        <Col span={24}><Alert message="No permissions found or failed to load." type="warning" showIcon /></Col>
                    )}
                 </Row>
            </Checkbox.Group>
            {isCoreRole && <p className="text-xs text-amber-600 mt-1">Permissions for core roles ('admin', 'classifier') cannot be modified significantly.</p>}
          </Form.Item>

        </Form>
      </Spin>
    </Modal>
  );
};