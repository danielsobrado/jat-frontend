// src/langgraph/components/TransportSelector.tsx
import React from 'react';
import { Select, Tooltip, Space, Tag } from 'antd';
import { 
  ApiOutlined, 
  CloudDownloadOutlined, 
  ThunderboltOutlined,
  InfoCircleOutlined 
} from '@ant-design/icons';
import { StreamTransportType } from '../services/streamServiceFactory';

const { Option } = Select;

interface TransportSelectorProps {
  currentTransport: StreamTransportType;
  onTransportChange: (transport: StreamTransportType) => void;
  disabled?: boolean;
}

const transportInfo = {
  'websocket': {
    label: 'WebSocket',
    icon: <ThunderboltOutlined />,
    description: 'Bidirectional real-time connection. Requires special proxy configuration.',
    pros: ['Real-time bidirectional', 'Low latency'],
    cons: ['Complex proxy setup', 'Connection state management'],
    color: 'purple',
  },
  'sse': {
    label: 'Server-Sent Events',
    icon: <CloudDownloadOutlined />,
    description: 'Server-to-client streaming with automatic reconnection.',
    pros: ['Auto-reconnect', 'Simple implementation'],
    cons: ['Text-only data', 'One-way communication'],
    color: 'blue',
  },
  'http-stream': {
    label: 'HTTP Streaming',
    icon: <ApiOutlined />,
    description: 'Standard HTTP response streaming. Most compatible.',
    pros: ['Best compatibility', 'Standard HTTP', 'Binary support'],
    cons: ['Manual reconnection needed'],
    color: 'green',
  },
};

export const TransportSelector: React.FC<TransportSelectorProps> = ({
  currentTransport,
  onTransportChange,
  disabled = false,
}) => {
  const currentInfo = transportInfo[currentTransport];

  return (
    <Space>
      <Select
        value={currentTransport}
        onChange={onTransportChange}
        disabled={disabled}
        style={{ width: 200 }}
        suffixIcon={currentInfo.icon}
      >
        {Object.entries(transportInfo).map(([value, info]) => (
          <Option key={value} value={value}>
            <Space>
              {info.icon}
              <span>{info.label}</span>
            </Space>
          </Option>
        ))}
      </Select>
      
      <Tooltip
        title={
          <div>
            <p><strong>{currentInfo.label}</strong></p>
            <p>{currentInfo.description}</p>
            <div style={{ marginTop: 8 }}>
              <strong>Pros:</strong>
              <ul style={{ margin: '4px 0', paddingLeft: 20 }}>
                {currentInfo.pros.map((pro, i) => (
                  <li key={i}>{pro}</li>
                ))}
              </ul>
            </div>
            <div>
              <strong>Cons:</strong>
              <ul style={{ margin: '4px 0', paddingLeft: 20 }}>
                {currentInfo.cons.map((con, i) => (
                  <li key={i}>{con}</li>
                ))}
              </ul>
            </div>
          </div>
        }
      >
        <InfoCircleOutlined style={{ cursor: 'help' }} />
      </Tooltip>
      
      <Tag color={currentInfo.color}>{currentInfo.label}</Tag>
    </Space>
  );
};

// Usage in LangGraphViewPage.tsx:
/*
import { TransportSelector } from '../components/TransportSelector';

// In your component:
const { 
  connectAndExecute, 
  currentTransport, 
  setTransport,
  // ... other properties 
} = useLangGraphRunner();

// In the UI:
<TransportSelector
  currentTransport={currentTransport}
  onTransportChange={setTransport}
  disabled={executionStatus === 'running' || executionStatus === 'connecting'}
/>
*/