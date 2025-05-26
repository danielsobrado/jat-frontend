// src/components/StatusTypeGuide.tsx
import React from 'react';
import { Card, Divider, Typography, Table } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined, WarningOutlined, InfoCircleOutlined } from '@ant-design/icons';

const { Title, Paragraph, Text } = Typography;

/**
 * StatusTypeGuide - A documentation component that explains the different status types
 * used in the application for both Categorization and ServiceNow systems.
 */
const StatusTypeGuide: React.FC = () => {
  // Classification system status columns
  const classificationColumns = [
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (text: string) => {
        switch (text) {
          case 'success':
            return <><CheckCircleOutlined style={{ color: '#52c41a' }} /> success</>;
          case 'partial':
            return <><WarningOutlined style={{ color: '#faad14' }} /> partial</>;
          case 'failed':
            return <><CloseCircleOutlined style={{ color: '#f5222d' }} /> failed</>;
          default:
            return <>{text}</>;
        }
      },
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
    },
    {
      title: 'Used In',
      dataIndex: 'usedIn',
      key: 'usedIn',
    },
  ];

  // SNOW system status columns
  const snowColumns = [
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (text: string) => {
        switch (text) {
          case 'pass':
            return <><CheckCircleOutlined style={{ color: '#52c41a' }} /> pass</>;
          case 'fail':
            return <><CloseCircleOutlined style={{ color: '#f5222d' }} /> fail</>;
          default:
            return <>{text}</>;
        }
      },
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
    },
    {
      title: 'Used In',
      dataIndex: 'usedIn',
      key: 'usedIn',
    },
  ];

  // Data for classification statuses
  const classificationData = [
    {
      key: '1',
      status: 'success',
      description: 'Classification was fully completed with all required levels',
      usedIn: 'Categorization system for product/service classification',
    },
    {
      key: '2',
      status: 'partial',
      description: 'Classification is partially complete; some levels may be missing or invalid',
      usedIn: 'Categorization system for product/service classification',
    },
    {
      key: '3',
      status: 'failed',
      description: 'Classification failed to determine required levels',
      usedIn: 'Categorization system for product/service classification',
    },
    {
      key: '4',
      status: 'all',
      description: 'Filter option that shows classifications with any status',
      usedIn: 'UI filtering in the History tab for categorization',
    },
  ];

  // Data for SNOW validation statuses
  const snowData = [
    {
      key: '1',
      status: 'pass',
      description: 'Ticket meets all validation criteria and quality standards',
      usedIn: 'ServiceNow ticket analysis system',
    },
    {
      key: '2',
      status: 'fail',
      description: 'Ticket fails to meet quality standards and requires improvement',
      usedIn: 'ServiceNow ticket analysis system',
    },
  ];

  return (
    <Card className="status-type-guide">
      <Title level={3}>Status Types Guide</Title>
      <Paragraph>
        <InfoCircleOutlined /> This guide explains the different status types used in the application.
      </Paragraph>

      <Divider orientation="left">Categorization System Status Types</Divider>
      <Paragraph>
        In the categorization system, the following status types are used to indicate the result of classifying products or services:
      </Paragraph>
      <Table 
        columns={classificationColumns} 
        dataSource={classificationData} 
        pagination={false} 
        bordered 
      />

      <Divider orientation="left" style={{ marginTop: '2rem' }}>ServiceNow System Validation Status</Divider>
      <Paragraph>
        The ServiceNow ticket analysis system uses a different set of status indicators for ticket validation:
      </Paragraph>
      <Table 
        columns={snowColumns} 
        dataSource={snowData} 
        pagination={false} 
        bordered 
      />

      <Divider />
      <Paragraph>
        <Text strong>Note:</Text> These are completely different status types used in different parts of the application.
      </Paragraph>
    </Card>
  );
};

export default StatusTypeGuide;
