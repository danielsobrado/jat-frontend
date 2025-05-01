// src/components/RoleManagement/components/RoleTable.tsx
import React from 'react';
import { Table, Space, Button, Tag, Popconfirm, Tooltip } from 'antd';
import { EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { Role, Permission } from '../../../api/types'; // Adjust path

interface RoleTableProps {
  roles: Role[];
  loading: boolean;
  onEdit: (role: Role) => void;
  onDelete: (id: number) => void;
  // Add pagination props if implemented in useRoles hook
  // pagination: { current: number; pageSize: number; total: number };
  // onPageChange: (page: number, pageSize: number) => void;
}

export const RoleTable: React.FC<RoleTableProps> = ({
  roles,
  loading,
  onEdit,
  onDelete,
  // pagination,
  // onPageChange,
}) => {

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 80,
      sorter: (a: Role, b: Role) => a.id - b.id,
    },
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
      ellipsis: true, // Truncate long descriptions
    },
    {
        title: 'Permissions',
        key: 'permissions',
        render: (_: any, record: Role) => {
            const permissions = record.permissions || [];
            const displayCount = 3; // Max permissions to show directly
            const hiddenCount = permissions.length - displayCount;

            return (
                <Space wrap size={[4, 4]}>
                    {permissions.slice(0, displayCount).map((perm: Permission) => (
                        <Tooltip key={perm.id} title={perm.description || perm.code}>
                             <Tag color="geekblue" style={{ cursor: 'help' }}>{perm.code}</Tag>
                        </Tooltip>
                    ))}
                    {hiddenCount > 0 && (
                        <Tooltip title={permissions.slice(displayCount).map(p => p.code).join(', ')}>
                            <Tag>+{hiddenCount} more</Tag>
                        </Tooltip>
                    )}
                    {permissions.length === 0 && <Tag>No Permissions</Tag>}
                </Space>
            );
        },
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 120,
      render: (_: any, record: Role) => (
        <Space size="small">
          <Tooltip title="Edit Role">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => onEdit(record)}
              aria-label={`Edit role ${record.name}`}
            />
          </Tooltip>
          {/* Prevent deleting core roles like 'admin' if needed */}
          {record.name !== 'admin' && record.name !== 'classifier' && (
              <Popconfirm
                title={`Delete role "${record.name}"?`}
                description="Users assigned only this role will lose its permissions. This cannot be undone."
                onConfirm={() => onDelete(record.id)}
                okText="Delete"
                okType="danger"
                cancelText="Cancel"
              >
                <Tooltip title="Delete Role">
                  <Button
                    type="text"
                    danger
                    icon={<DeleteOutlined />}
                    aria-label={`Delete role ${record.name}`}
                  />
                </Tooltip>
              </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <Table
      rowKey="id"
      columns={columns}
      dataSource={roles}
      loading={loading}
      pagination={false} // Add pagination prop from hook if implemented
      // onChange={(p) => onPageChange(p.current ?? 1, p.pageSize ?? 10)} // Add if paginated
      scroll={{ x: 'max-content' }}
      size="small"
    />
  );
};