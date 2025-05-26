// src/components/StatusTypesDemo.tsx
import React, { useState } from 'react';
import { Card, Tabs, Tag, Typography, Alert, Space, Button } from 'antd';
import { 
  CheckCircleOutlined, 
  CloseCircleOutlined, 
  WarningOutlined
} from '@ant-design/icons';
import StatusTypeGuide from './StatusTypeGuide';
import StatusTypeTooltip from './StatusTypeTooltip';
import { ClassificationStatus } from '../api/types';
import { SnowValidationStatus } from '../snow/types/snow.types';
import { 
  getClassificationStatusColor,
  getSnowValidationStatusColor,
  getClassificationStatusDescription,
  getSnowValidationStatusDescription
} from '../utils/statusUtils';

const { Title, Paragraph, Text } = Typography;
const { TabPane } = Tabs;

/**
 * Status Types Demo Component
 * 
 * This is a demonstration component showing how to properly use the different status types,
 * tooltip helpers, and utilities throughout the application.
 * 
 * It demonstrates:
 * 1. How to use both status types in UI elements
 * 2. How to use the StatusTypeTooltip for inline help
 * 3. How to integrate the StatusTypeGuide as a reference
 */
const StatusTypesDemo: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('usage');
  const [showFullGuide, setShowFullGuide] = useState<boolean>(false);

  // Example Categorization statuses
  const categorizationStatuses: ClassificationStatus[] = ['success', 'partial', 'failed', 'all'];
  // Example SNOW statuses
  const snowStatuses: SnowValidationStatus[] = ['pass', 'fail'];

  const renderStatusTag = (status: ClassificationStatus) => {
    const icons = {
      success: <CheckCircleOutlined />,
      partial: <WarningOutlined />,
      failed: <CloseCircleOutlined />,
      all: null
    };
    
    return (
      <Tag 
        icon={icons[status]} 
        color={getClassificationStatusColor(status)}
      >
        {status}
      </Tag>
    );
  };

  const renderSnowStatusTag = (status: SnowValidationStatus) => {
    const icons = {
      pass: <CheckCircleOutlined />,
      fail: <CloseCircleOutlined />
    };
    
    return (
      <Tag 
        icon={icons[status]} 
        color={getSnowValidationStatusColor(status)}
      >
        {status}
      </Tag>
    );
  };

  return (
    <Card className="status-types-demo">
      <Title level={3}>
        Status Types Demo
        <StatusTypeTooltip type="classification" />
      </Title>
      
      <Tabs activeKey={activeTab} onChange={setActiveTab}>
        <TabPane tab="Usage Examples" key="usage">
          <Card title={<Space>Categorization Status Types <StatusTypeTooltip type="classification" /></Space>} size="small" className="mb-4">
            <Space direction="vertical" className="w-full">
              <Paragraph>
                The Categorization system uses the following status types to indicate the result of classification:
              </Paragraph>
              
              <Space wrap>
                {categorizationStatuses.map(status => (
                  <div key={status} className="border rounded p-2">
                    {renderStatusTag(status)}
                    <Text className="ml-2">{getClassificationStatusDescription(status)}</Text>
                  </div>
                ))}
              </Space>
              
              <Alert 
                type="info" 
                message="Example Usage" 
                description={
                  <Text code>
                    {`import { ClassificationStatus } from '../api/types';`}<br />
                    {`const [selectedStatus, setSelectedStatus] = useState<ClassificationStatus>('all');`}
                  </Text>
                } 
              />
            </Space>
          </Card>
          
          <Card title={<Space>ServiceNow Status Types <StatusTypeTooltip type="snow" /></Space>} size="small">
            <Space direction="vertical" className="w-full">
              <Paragraph>
                The ServiceNow system uses the following validation result statuses:
              </Paragraph>
              
              <Space wrap>
                {snowStatuses.map(status => (
                  <div key={status} className="border rounded p-2">
                    {renderSnowStatusTag(status)}
                    <Text className="ml-2">{getSnowValidationStatusDescription(status)}</Text>
                  </div>
                ))}
              </Space>
              
              <Alert 
                type="info" 
                message="Example Usage" 
                description={
                  <Text code>
                    {`import { SnowValidationStatus } from '../snow/types/snow.types';`}<br />
                    {`const validationResult: SnowValidationStatus = result.validation_result;`}
                  </Text>
                } 
              />
            </Space>
          </Card>
          
          <div className="mt-4">
            <Button type="primary" onClick={() => setShowFullGuide(!showFullGuide)}>
              {showFullGuide ? 'Hide' : 'Show'} Complete Reference Guide
            </Button>
          </div>
          
          {showFullGuide && (
            <div className="mt-4">
              <StatusTypeGuide />
            </div>
          )}
        </TabPane>
        
        <TabPane tab="Tooltip Integration" key="tooltip">
          <Card title="How to Use Status Type Tooltips" size="small">
            <Paragraph>
              Add helpful tooltips to your UI to explain status types to users:
            </Paragraph>
            
            <Alert
              message="Import and Use in Components"
              description={
                <Text code>
                  {`import StatusTypeTooltip from '../components/StatusTypeTooltip';`}<br /><br />
                  {`// In classification-related UI:`}<br />
                  {`<Title>Classification Status <StatusTypeTooltip type="classification" /></Title>`}<br /><br />
                  {`// In SNOW-related UI:`}<br />
                  {`<Title>Validation Status <StatusTypeTooltip type="snow" /></Title>`}
                </Text>
              }
              type="info"
            />
            
            <div className="mt-4">
              <Paragraph strong>Live examples:</Paragraph>
              <div className="border rounded p-3 mb-2">
                <Text>Categorization Status</Text> <StatusTypeTooltip type="classification" /> <Text> - Hover to see details</Text>
              </div>
              <div className="border rounded p-3">
                <Text>ServiceNow Validation Status</Text> <StatusTypeTooltip type="snow" /> <Text> - Hover to see details</Text>
              </div>
            </div>
          </Card>
        </TabPane>
        
        <TabPane tab="Utility Functions" key="utils">
          <Card title="Status Utility Functions" size="small">
            <Paragraph>
              The <Text code>src/utils/statusUtils.ts</Text> file provides utility functions for working with status types:
            </Paragraph>
            
            <Alert
              message="Available Functions"
              description={
                <ul>
                  <li><Text code>isInformationalError(message: string): boolean</Text> - Checks if an error message is an "informational" status message</li>
                  <li><Text code>getClassificationStatusColor(status: ClassificationStatus): string</Text> - Gets a color for a categorization status</li>
                  <li><Text code>getSnowValidationStatusColor(status: SnowValidationStatus): string</Text> - Gets a color for a SNOW validation status</li>
                  <li><Text code>getClassificationStatusDescription(status: ClassificationStatus): string</Text> - Gets human-readable text for a categorization status</li>
                  <li><Text code>getSnowValidationStatusDescription(status: SnowValidationStatus): string</Text> - Gets human-readable text for a SNOW validation status</li>
                </ul>
              }
              type="info"
            />
            
            <Alert
              className="mt-4"
              message="Usage Example"
              description={
                <Text code>
                  {`import { getClassificationStatusColor } from '../utils/statusUtils';`}<br />
                  {`<Tag color={getClassificationStatusColor(item.status)}>{item.status}</Tag>`}
                </Text>
              }
              type="success"
            />
          </Card>
        </TabPane>
      </Tabs>
    </Card>
  );
};

export default StatusTypesDemo;
