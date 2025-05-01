// src/components/UserManagement/components/UserTable.tsx
import React from 'react';
import { Table, Space, Button, Tag, Popconfirm, Tooltip } from 'antd';
import { EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { User } from '../../../api/types';
import { formatDate } from '../../../utils/dateFormat'; // Assuming you have this

const DEFAULT_PAGE_SIZE = 10;

interface UserTableProps {
  users: User[];
  rolesMap: Map<string, string>; // Map role name to description for tooltips
  loading: boolean;
  pagination: { current: number; pageSize: number; total: number };
  onEdit: (user: User) => void;
  onDelete: (id: number) => void;
  onPageChange: (page: number, pageSize: number) => void;
}

export const UserTable: React.FC<UserTableProps> = ({
  users,
  rolesMap,
  loading,
  pagination,
  onEdit,
  onDelete,
  onPageChange,
}) => {

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 80,
      sorter: (a: User, b: User) => a.id - b.id,
    },
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
      render: (roles: string[]) => (
        <Space wrap size={[0, 8]}>
          {roles?.map(roleName => (
             <Tooltip key={roleName} title={rolesMap.get(roleName) || 'Role description not found'}>
                <Tag color="blue">{roleName}</Tag>
             </Tooltip>
          ))}
          {(!roles || roles.length === 0) && <Tag>No Roles</Tag>}
        </Space>
      ),
    },
    {
      title: 'Created At',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => {
        const { displayText, fullText } = formatDate(date);
        return <span title={fullText}>{displayText}</span>;
      },
       sorter: (a: User, b: User) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime(),
    },
     {
      title: 'Updated At',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      render: (date: string) => {
        const { displayText, fullText } = formatDate(date);
        return <span title={fullText}>{displayText}</span>;
      },
       sorter: (a: User, b: User) => new Date(a.updatedAt || 0).getTime() - new Date(b.updatedAt || 0).getTime(),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 120,
      render: (_: any, record: User) => (
        <Space size="small">
          <Tooltip title="Edit User">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => onEdit(record)}
              aria-label={`Edit user ${record.username}`}
            />
          </Tooltip>
          <Popconfirm
            title={`Delete user "${record.username}"?`}
            description="This action cannot be undone."
            onConfirm={() => onDelete(record.id)}
            okText="Delete"
            okType="danger"
            cancelText="Cancel"
          >
            <Tooltip title="Delete User">
              <Button
                type="text"
                danger
                icon={<DeleteOutlined />}
                aria-label={`Delete user ${record.username}`}
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Table
      rowKey="id"
      columns={columns}
      dataSource={users}
      loading={loading}
      pagination={{
        current: pagination.current,
        pageSize: pagination.pageSize,
        total: pagination.total,
        showSizeChanger: true,
        pageSizeOptions: ['10', '20', '50', '100'],
        showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} users`,
      }}
      onChange={(p) => onPageChange(p.current ?? 1, p.pageSize ?? DEFAULT_PAGE_SIZE)}
      scroll={{ x: 'max-content' }} // Enable horizontal scroll if needed
      size="small"
    />
  );
};