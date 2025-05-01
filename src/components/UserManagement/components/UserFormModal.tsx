// src/components/UserManagement/components/UserFormModal.tsx
import React, { useEffect, useState } from 'react'; // Add useState import
import { Modal, Form, Input, Select, Button, Spin, Alert, message } from 'antd';
import { User, Role, CreateUserRequest, UpdateUserRequest } from '../../../api/types';

interface UserFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateUserRequest | UpdateUserRequest) => Promise<boolean>; // Returns success status
  initialData?: User;
  availableRoles: Role[]; // Pass available roles for selection
  loading: boolean; // Loading state for submission
  loadingRoles: boolean; // Loading state for roles dropdown
}

const { Option } = Select;

export const UserFormModal: React.FC<UserFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  availableRoles,
  loading,
  loadingRoles,
}) => {
  const [form] = Form.useForm();
  const [formError, setFormError] = useState<string | null>(null);

  const isEditMode = !!initialData;

  useEffect(() => {
    if (isOpen) {
      setFormError(null); // Clear errors when opening
      if (isEditMode && initialData) {
        form.setFieldsValue({
          username: initialData.username,
          roles: initialData.roles || [],
          // Don't set password field for edit mode unless changing password
        });
      } else {
        form.resetFields();
      }
    }
  }, [isOpen, initialData, form, isEditMode]);

  const handleFinish = async (values: any) => {
    setFormError(null);
    const roles = values.roles || []; // Ensure roles is an array

    let success = false;
    if (isEditMode && initialData) {
      const updateData: UpdateUserRequest = {
        username: values.username !== initialData.username ? values.username : undefined,
        password: values.password || undefined, // Only include password if provided
        roles: roles, // Always send roles to potentially update
      };
      // Filter out undefined fields before sending
      const filteredUpdateData = Object.fromEntries(
          Object.entries(updateData).filter(([_, v]) => v !== undefined)
      ) as UpdateUserRequest;

      // Check if anything actually changed
      if (Object.keys(filteredUpdateData).length === 0 && JSON.stringify(roles) === JSON.stringify(initialData.roles || [])) {
         message.info("No changes detected.");
         onClose(); // Close if no changes
         return;
      }

      success = await onSubmit(filteredUpdateData);
    } else {
      const createData: CreateUserRequest = {
        username: values.username,
        password: values.password,
        roles: roles,
      };
      success = await onSubmit(createData);
    }

    if (success) {
      onClose(); // Close modal on successful submission
    } else {
      // Error message is usually shown via Ant message in the hook
      setFormError("Failed to save user. Please try again.");
    }
  };

  const filterOption = (input: string, option: any) => {
    const childText = option?.children;
    return childText && typeof childText === 'string' 
      ? childText.toLowerCase().includes(input.toLowerCase()) 
      : false;
  };

  return (
    <Modal
      title={isEditMode ? `Edit User: ${initialData?.username}` : 'Create New User'}
      open={isOpen}
      visible={isOpen} /* Added for backward compatibility with Ant Design v4 */
      onCancel={onClose}
      confirmLoading={loading}
      destroyOnClose // Reset form state when closed
      footer={[
        <Button key="back" onClick={onClose} disabled={loading}>
          Cancel
        </Button>,
        <Button key="submit" type="primary" loading={loading} onClick={() => form.submit()}>
          {isEditMode ? 'Save Changes' : 'Create User'}
        </Button>,
      ]}
      width={600}
    >
      <Spin spinning={loading || loadingRoles}>
        {formError && <Alert message={formError} type="error" showIcon closable onClose={() => setFormError(null)} className="mb-4" />}
        <Form
          form={form}
          layout="vertical"
          onFinish={handleFinish}
          name="userForm"
          initialValues={{ roles: isEditMode ? initialData?.roles : [] }} // Set initial roles
        >
          <Form.Item
            name="username"
            label="Username"
            rules={[{ required: true, message: 'Please input the username!' }]}
          >
            <Input placeholder="Enter username" disabled={isEditMode} />
            {/* Username usually not editable */}
          </Form.Item>

          <Form.Item
            name="password"
            label={isEditMode ? 'New Password (leave blank to keep current)' : 'Password'}
            rules={[{ required: !isEditMode, message: 'Password is required for new users!' }]}
            hasFeedback
          >
            <Input.Password placeholder={isEditMode ? 'Enter new password' : 'Enter password'} />
          </Form.Item>

          {isEditMode && (
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
                    return Promise.reject(new Error('The two passwords that you entered do not match!'));
                  },
                }),
              ]}
            >
              <Input.Password placeholder="Confirm new password" />
            </Form.Item>
          )}

          <Form.Item
            name="roles"
            label="Roles"
             rules={[{ type: 'array' }]} // Antd rule for array type
          >
             <Select
               mode="multiple"
               allowClear
               style={{ width: '100%' }}
               placeholder="Select roles"
               loading={loadingRoles}
               disabled={loadingRoles}
               filterOption={filterOption}
             >
               {availableRoles.map(role => (
                 <Option key={role.id} value={role.name} label={role.name}>
                   <div className="flex flex-col">
                      <span>{role.name}</span>
                      {role.description && <span className="text-xs text-gray-500">{role.description}</span>}
                   </div>
                 </Option>
               ))}
             </Select>
          </Form.Item>

        </Form>
      </Spin>
    </Modal>
  );
};