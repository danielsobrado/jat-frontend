// src/components/RoleManagement/components/PermissionAssignmentModal.tsx
import React, { useEffect, useState, useMemo } from 'react';
import { Modal, Form, Button, Spin, Alert, Checkbox, Row, Col, Tooltip, Input, Empty, Tag } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { Role, Permission, UpdateRoleRequest } from '../../../api/types'; 

interface PermissionAssignmentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (roleId: number, permissionCodes: string[]) => Promise<boolean>; // Takes role ID and codes, returns success
    role: Role | null; // The role being edited
    availablePermissions: Permission[];
    loading: boolean; // Loading state for the submission process
    loadingPermissions: boolean; // Loading state for fetching permissions
}

const { Search } = Input;

export const PermissionAssignmentModal: React.FC<PermissionAssignmentModalProps> = ({
    isOpen,
    onClose,
    onSubmit,
    role,
    availablePermissions,
    loading,
    loadingPermissions,
}) => {
    const [form] = Form.useForm();
    const [formError, setFormError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    const isCoreRole = role?.name === 'admin' || role?.name === 'classifier'; // Basic check for core roles

    // Set initial form values when the modal opens or the role changes
    useEffect(() => {
        if (isOpen && role) {
            setFormError(null);
            form.setFieldsValue({
                // Get the codes from the role's permissions array
                permissions: (role.permissions || []).map(p => p.code),
            });
        } else if (!isOpen) {
            form.resetFields(); // Reset form when closing
            setSearchTerm(''); // Reset search term
        }
    }, [isOpen, role, form]);

    // Filter permissions based on search term
    const filteredPermissions = useMemo(() => {
        if (!searchTerm) {
            return availablePermissions;
        }
        const lowerSearch = searchTerm.toLowerCase();
        return availablePermissions.filter(
            (perm) =>
                perm.code.toLowerCase().includes(lowerSearch) ||
                (perm.description && perm.description.toLowerCase().includes(lowerSearch))
        );
    }, [availablePermissions, searchTerm]);

    const handleFinish = async (values: { permissions: string[] }) => {
        if (!role) return;
        setFormError(null);
        const selectedPermissionCodes = values.permissions || [];

        try {
            const success = await onSubmit(role.id, selectedPermissionCodes);
            if (success) {
                onClose(); // Close modal on successful submission from parent
            } else {
                // Error handling might be done in the parent hook via message.error
                setFormError("Failed to update role permissions. Please try again.");
            }
        } catch (error) {
             console.error("Error submitting permissions:", error);
             setFormError(error instanceof Error ? error.message : "An unexpected error occurred.");
        }
    };

    // Group permissions by category (e.g., 'classify:', 'users:') for better organization
    const groupedPermissions = useMemo(() => {
        const groups: Record<string, Permission[]> = {};
        filteredPermissions.forEach(perm => {
            const category = perm.code.split(':')[0] || 'other';
            if (!groups[category]) {
                groups[category] = [];
            }
            groups[category].push(perm);
        });
         // Sort categories alphabetically, put 'other' last
         return Object.entries(groups).sort(([catA], [catB]) => {
            if (catA === 'other') return 1;
            if (catB === 'other') return -1;
            return catA.localeCompare(catB);
        });
    }, [filteredPermissions]);

    return (
        <Modal
            title={`Manage Permissions for Role: "${role?.name}"`}
            open={isOpen}
            onCancel={onClose}
            confirmLoading={loading}
            destroyOnClose
            width={800} // Wider modal for better permission layout
            footer={[
                <Button key="back" onClick={onClose} disabled={loading}>
                    Cancel
                </Button>,
                <Button key="submit" type="primary" loading={loading} onClick={() => form.submit()}>
                    Save Permissions
                </Button>,
            ]}
        >
            <Spin spinning={loadingPermissions || loading} tip={loadingPermissions ? "Loading permissions..." : "Saving..."}>
                {formError && <Alert message={formError} type="error" showIcon closable onClose={() => setFormError(null)} className="mb-4" />}

                {isCoreRole && (
                    <Alert
                        message="Core Role"
                        description={`Modifying permissions for the core "${role?.name}" role is restricted and may have unintended consequences.`}
                        type="warning"
                        showIcon
                        className="mb-4"
                    />
                )}

                <Input
                    placeholder="Search permissions by code or description..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    allowClear
                    className="mb-4"
                    prefix={<SearchOutlined />}
                />

                <Form
                    form={form}
                    layout="vertical"
                    onFinish={handleFinish}
                    name="permissionAssignmentForm"
                    style={{ maxHeight: '60vh', overflowY: 'auto', paddingRight: '10px' }} // Make the form scrollable
                >
                    <Form.Item name="permissions" noStyle>
                        <Checkbox.Group style={{ width: '100%' }}>
                            {groupedPermissions.length > 0 ? (
                                groupedPermissions.map(([category, perms]) => (
                                     <div key={category} className="mb-4 pb-2 border-b border-gray-200 last:border-b-0">
                                         <div className="mb-2 font-medium text-gray-600 capitalize">{category.replace(/_/g,' ')}</div>
                                        <Row gutter={[16, 8]}>
                                            {perms.sort((a, b) => a.code.localeCompare(b.code)).map(perm => (
                                                <Col xs={24} sm={12} key={perm.id}>
                                                    <Tooltip title={perm.description || perm.code} placement="right">
                                                        <Checkbox value={perm.code} disabled={loading || isCoreRole}>
                                                            <Tag color="blue">{perm.code}</Tag>
                                                        </Checkbox>
                                                    </Tooltip>
                                                </Col>
                                            ))}
                                        </Row>
                                    </div>
                                ))
                            ) : (
                                <Empty description={loadingPermissions ? "Loading permissions..." : "No permissions found matching your search."} />
                            )}
                        </Checkbox.Group>
                    </Form.Item>
                </Form>
            </Spin>
        </Modal>
    );
};