// src/snow/components/SnowHistoryTable.tsx
import React from 'react';
import { Table, Button, Tag, Tooltip, Space } from 'antd';
import { EyeOutlined, DeleteOutlined } from '@ant-design/icons';
import { SnowHistoryItemFE } from '../types/snow.types';
import { formatDate } from '../../utils/dateFormat'; // Ensure this utility exists

interface SnowHistoryTableProps {
  items: SnowHistoryItemFE[];
  loading: boolean;
  onDelete: (id: string) => void;
  onViewDetails: (item: SnowHistoryItemFE) => void;
  canDelete: boolean;
}

const SnowHistoryTable: React.FC<SnowHistoryTableProps> = ({
  items,
  loading,
  onDelete,
  onViewDetails,
  canDelete,
}) => {
  const columns = [
    {
      title: 'Analysis ID',
      dataIndex: 'id',
      key: 'id',
      width: 150,
      render: (id: string) => <Tooltip title={id}><span className="font-mono truncate block max-w-[120px]">{id.substring(0, 8)}...</span></Tooltip>,
    },
    {
      title: 'Ticket Summary',
      dataIndex: ['analysis', 'summary'],
      key: 'summary',
      ellipsis: true,
      render: (summary: string) => (
        <Tooltip title={summary} placement="topLeft">
          <span className="line-clamp-2">{summary || 'N/A'}</span>
        </Tooltip>
      ),
    },
    {
      title: 'Quality Score',
      dataIndex: ['analysis', 'quality_score'],
      key: 'quality_score',
      width: 120,
      align: 'center' as const,
      render: (score: number) => {
        let color = 'red';
        if (score >= 8) color = 'green';
        else if (score >= 5) color = 'gold';
        return <Tag color={color}>{score}/10</Tag>;
      },
      sorter: (a: SnowHistoryItemFE, b: SnowHistoryItemFE) => a.analysis.quality_score - b.analysis.quality_score,
    },
    {
      title: 'Created At',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 180,
      render: (dateString: string) => {
        const formatted = formatDate(dateString);
        return <Tooltip title={formatted.fullText}>{formatted.displayText}</Tooltip>;
      },
      sorter: (a: SnowHistoryItemFE, b: SnowHistoryItemFE) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 120,
      align: 'center' as const,
      render: (_: any, record: SnowHistoryItemFE) => (
        <Space>
          <Tooltip title="View Details">
            <Button icon={<EyeOutlined />} onClick={() => onViewDetails(record)} size="small" />
          </Tooltip>
          {canDelete && (
            <Tooltip title="Delete Analysis">
              <Button
                icon={<DeleteOutlined />}
                onClick={() => onDelete(record.id)}
                danger
                size="small"
                disabled={!canDelete}
              />
            </Tooltip>
          )}
        </Space>
      ),
    },
  ];

  return (
    <Table
      dataSource={items}
      columns={columns}
      rowKey="id"
      loading={loading}
      pagination={false} // Pagination handled by parent component
      scroll={{ x: 'max-content' }}
      className="snow-history-table mt-6"
    />
  );
};

export default SnowHistoryTable;