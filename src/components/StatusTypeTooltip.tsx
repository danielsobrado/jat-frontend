// src/components/StatusTypeTooltip.tsx
import React from 'react';
import { Tooltip, Typography } from 'antd';
import { InfoCircleOutlined } from '@ant-design/icons';

const { Text } = Typography;

interface StatusTypeTooltipProps {
  type: 'classification' | 'snow';
  className?: string;
}

/**
 * A simple tooltip component to explain the different status types
 * used in the application for both Categorization and ServiceNow systems.
 * This can be easily added to forms, tables, or other UI elements where
 * status types are displayed.
 */
const StatusTypeTooltip: React.FC<StatusTypeTooltipProps> = ({ type, className }) => {
  const tooltipContent = type === 'classification' ? (
    <div>
      <Text strong>Categorization Status Types:</Text>
      <ul style={{ paddingLeft: '20px', margin: '5px 0' }}>
        <li><Text type="success">success</Text> - Classification fully completed with all required levels</li>
        <li><Text type="warning">partial</Text> - Classification is partial with some levels missing or invalid</li>
        <li><Text type="danger">failed</Text> - Classification failed to determine required levels</li>
      </ul>
      <Text>See docs/STATUS_TYPES.md for more details</Text>
    </div>
  ) : (
    <div>
      <Text strong>ServiceNow Validation Status:</Text>
      <ul style={{ paddingLeft: '20px', margin: '5px 0' }}>
        <li><Text type="success">pass</Text> - Ticket meets all quality standards</li>
        <li><Text type="danger">fail</Text> - Ticket fails quality standards and needs improvement</li>
      </ul>
      <Text>See docs/STATUS_TYPES.md for more details</Text>
    </div>
  );

  return (
    <Tooltip 
      title={tooltipContent} 
      overlayClassName="status-type-tooltip" 
      placement="top"
      color="#fff"
      overlayInnerStyle={{ color: 'rgba(0,0,0,0.85)' }}
    >
      <InfoCircleOutlined className={className} style={{ marginLeft: '4px', color: '#1890ff', cursor: 'help' }} />
    </Tooltip>
  );
};

export default StatusTypeTooltip;
