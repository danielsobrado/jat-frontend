// src/langgraph/components/NodeInspectorPanel.tsx
import React from 'react';
import { Node as ReactFlowNode, Edge as ReactFlowEdge } from 'reactflow';
import { ReactFlowNodeData, ReactFlowEdgeData } from '../types/langgraph';
import { Button, Descriptions, Empty, Tag, Card, Typography, Tooltip } from 'antd'; // Using Ant Design components
import { InfoCircleOutlined } from '@ant-design/icons';

const { Text, Paragraph } = Typography;

interface NodeInspectorPanelProps {
  selectedElement: ReactFlowNode<ReactFlowNodeData> | ReactFlowEdge<ReactFlowEdgeData> | null;
  onClose: () => void; // Callback to close the panel
  // You might also pass node-specific data from execution state if needed
  // For example: lastInput?: any; lastOutput?: any;
}

const JsonViewer: React.FC<{ data: any; title?: string }> = ({ data, title }) => {
  if (data === undefined || data === null || Object.keys(data).length === 0) {
    return <Text type="secondary" italic>{title ? `${title}: Not available` : 'Not available'}</Text>;
  }
  try {
    return (
      <div style={{ marginTop: '8px' }}>
        {title && <Text strong className="text-sm">{title}:</Text>}
        <pre
          style={{
            background: '#f0f2f5', // Ant Design background color
            border: '1px solid #d9d9d9', // Ant Design border color
            borderRadius: '4px',
            padding: '8px',
            fontSize: '12px',
            maxHeight: '200px',
            overflowY: 'auto',
            whiteSpace: 'pre-wrap', // Ensure wrapping
            wordBreak: 'break-all', // Break long words/strings
          }}
        >
          {JSON.stringify(data, null, 2)}
        </pre>
      </div>
    );
  } catch (e) {
    return <Text type="danger" italic>{title ? `${title}: Error displaying data` : 'Error displaying data'}</Text>;
  }
};

const NodeInspectorPanel: React.FC<NodeInspectorPanelProps> = ({
  selectedElement,
  onClose,
}) => {
  if (!selectedElement) {
    return (
      <div style={{ padding: '16px', borderLeft: '1px solid #e8e8e8', height: '100%' }}>
        <Empty description="Select a node or edge to see details" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      </div>
    );
  }

  const isNode = 'data' in selectedElement && 'position' in selectedElement; // Basic check for Node type
  const data = selectedElement.data as ReactFlowNodeData | ReactFlowEdgeData; // Type assertion

  return (
    <Card
      title={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {isNode ? 'Node Details' : 'Edge Details'}
          <Button type="text" onClick={onClose} size="small">
            Close
          </Button>
        </div>
      }
      style={{ height: '100%', display: 'flex', flexDirection: 'column', borderLeft: '1px solid #f0f0f0' }}
      bodyStyle={{ flexGrow: 1, overflowY: 'auto', padding: '16px' }}
      size="small"
    >
      <Descriptions bordered column={1} size="small" layout="horizontal">
        <Descriptions.Item label="ID">
          <Text copyable style={{ fontFamily: 'monospace' }}>{selectedElement.id}</Text>
        </Descriptions.Item>

        {isNode && (selectedElement as ReactFlowNode<ReactFlowNodeData>).data.type && (
          <Descriptions.Item label="Type">
            <Tag color="blue">{(selectedElement as ReactFlowNode<ReactFlowNodeData>).data.type}</Tag>
          </Descriptions.Item>
        )}

        {isNode && (selectedElement as ReactFlowNode<ReactFlowNodeData>).data.status && (
          <Descriptions.Item label="Status">
            <Tag
              color={
                (selectedElement as ReactFlowNode<ReactFlowNodeData>).data.status === 'running' ? 'gold' :
                (selectedElement as ReactFlowNode<ReactFlowNodeData>).data.status === 'success' ? 'green' :
                (selectedElement as ReactFlowNode<ReactFlowNodeData>).data.status === 'error' ? 'red' :
                (selectedElement as ReactFlowNode<ReactFlowNodeData>).data.status === 'active' ? 'processing' :
                'default'
              }
            >
              {(selectedElement as ReactFlowNode<ReactFlowNodeData>).data.status?.toUpperCase()}
            </Tag>
          </Descriptions.Item>
        )}

        {!isNode && (data as ReactFlowEdgeData).label && (
          <Descriptions.Item label="Label">
            <Text>{(data as ReactFlowEdgeData).label}</Text>
          </Descriptions.Item>
        )}
         {!isNode && (data as ReactFlowEdgeData).status && (
          <Descriptions.Item label="Status">
             <Tag color={(data as ReactFlowEdgeData).status === 'traversed' ? 'green' : 'default'}>
                {(data as ReactFlowEdgeData).status?.toUpperCase()}
             </Tag>
          </Descriptions.Item>
        )}
      </Descriptions>

      {isNode && (selectedElement as ReactFlowNode<ReactFlowNodeData>).data.config && (
        <JsonViewer data={(selectedElement as ReactFlowNode<ReactFlowNodeData>).data.config} title="Configuration" />
      )}

      {isNode && (selectedElement as ReactFlowNode<ReactFlowNodeData>).data.inputs && (
        <JsonViewer data={(selectedElement as ReactFlowNode<ReactFlowNodeData>).data.inputs} title="Last Inputs" />
      )}

      {isNode && (selectedElement as ReactFlowNode<ReactFlowNodeData>).data.outputs && (
        <JsonViewer data={(selectedElement as ReactFlowNode<ReactFlowNodeData>).data.outputs} title="Last Outputs" />
      )}

      {/* Raw Data for Debugging - can be behind a toggle */}
      <details style={{ marginTop: '16px', cursor: 'pointer' }}>
        <summary style={{ fontSize: '12px', color: '#888' }}>
            <Tooltip title="View raw element data for debugging">
                <InfoCircleOutlined style={{marginRight: '4px'}} />
                Raw Data
            </Tooltip>
        </summary>
        <JsonViewer data={selectedElement} />
      </details>

    </Card>
  );
};

export default NodeInspectorPanel;