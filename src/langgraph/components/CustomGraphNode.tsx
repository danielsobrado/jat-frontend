// src/langgraph/components/CustomGraphNode.tsx
import React, { memo } from 'react';
import { Handle, Position, NodeProps, NodeResizer } from 'reactflow';
import {
  PlayCircleOutlined, // Example for generic runnable
  ApiOutlined,        // Example for LLM/API calls
  ToolOutlined,       // Example for tools
  ForkOutlined,       // Example for routers/conditional
  CheckCircleFilled,  // Example for success
  CloseCircleFilled,  // Example for error
  LoadingOutlined,    // Example for running
  SettingOutlined,    // Example for config/data nodes
} from '@ant-design/icons'; // Using Ant Design icons for consistency

import { ReactFlowNodeData } from '../types/langgraph'; // Your custom node data type

// Define a type for node status for clarity
type NodeDisplayStatus = 'idle' | 'running' | 'success' | 'error' | 'active';

// Helper to map node type to an icon (customize as needed)
const getNodeIcon = (nodeType?: string, status?: NodeDisplayStatus) => {
  if (status === 'running') return <LoadingOutlined spin style={{ fontSize: '16px' }} />;
  if (status === 'success') return <CheckCircleFilled style={{ fontSize: '16px', color: '#34d399' }} />; // emerald-400
  if (status === 'error') return <CloseCircleFilled style={{ fontSize: '16px', color: '#f87171' }} />;   // red-400

  switch (nodeType?.toLowerCase()) {
    case 'llm_node':
    case 'apicallnode':
      return <ApiOutlined style={{ fontSize: '16px' }} />;
    case 'tool_node':
    case 'toolnode':
      return <ToolOutlined style={{ fontSize: '16px' }} />;
    case 'router_node':
    case 'conditional_edge_router':
    case 'conditionnode':
      return <ForkOutlined style={{ fontSize: '16px' }} />;
    case 'entry_point':
    case 'entrypointnode':
      return <PlayCircleOutlined style={{ fontSize: '16px', color: '#3b82f6' }} />; // blue-500
    case 'data_node': // Example type for nodes that just hold/transform data
      return <SettingOutlined style={{ fontSize: '16px' }} />;
    default:
      return <PlayCircleOutlined style={{ fontSize: '16px' }} />; // Default icon
  }
};

// Define styles based on status
const getStatusStyles = (status?: NodeDisplayStatus): React.CSSProperties => {
  switch (status) {
    case 'running':
      return {
        borderColor: '#fbbf24', // amber-400
        backgroundColor: '#fef3c7', // amber-100
        boxShadow: '0 0 8px rgba(251, 191, 36, 0.5)',
      };
    case 'success':
      return {
        borderColor: '#34d399', // emerald-400
        backgroundColor: '#d1fae5', // emerald-100
      };
    case 'error':
      return {
        borderColor: '#f87171', // red-400
        backgroundColor: '#fee2e2', // red-100
      };
    case 'active': // When node is selected
      return {
        borderColor: '#60a5fa', // blue-400
        boxShadow: '0 0 10px rgba(96, 165, 250, 0.6)',
      };
    case 'idle':
    default:
      return {
        borderColor: '#d1d5db', // gray-300
        backgroundColor: '#ffffff', // white
      };
  }
};

const CustomGraphNode: React.FC<NodeProps<ReactFlowNodeData>> = ({
  data,
  isConnectable, // Provided by React Flow
  selected,      // Provided by React Flow
  // sourcePosition = Position.Bottom, // Default can be overridden by node instance
  // targetPosition = Position.Top,   // Default can be overridden by node instance
}) => {
  const { label, type: nodeType, status, config } = data; // Status comes from useLangGraphRunner via useReactFlowGraphAdapter

  const displayStatus = selected && status === 'idle' ? 'active' : status;
  const statusStyles = getStatusStyles(displayStatus);
  const icon = getNodeIcon(nodeType, displayStatus);

  // Base style for the node
  const nodeStyle: React.CSSProperties = {
    border: '2px solid',
    borderRadius: '8px',
    padding: '10px 15px',
    minWidth: '150px', // Ensure a minimum width
    // maxWidth: '250px', // Optional: constraint width
    textAlign: 'center',
    fontSize: '12px',
    transition: 'all 0.2s ease-out',
    ...statusStyles, // Apply status-specific styles
  };

  return (
    <div style={nodeStyle}>
      {/* NodeResizer (optional) makes node user-resizable - install @reactflow/node-resizer if used */}
      {/* <NodeResizer minWidth={100} minHeight={40} isVisible={selected} /> */}

      {/* Handles for incoming connections (targets) */}
      {/* You can have multiple handles and position them differently */}
      <Handle
        type="target"
        position={Position.Top}
        id="target-top"
        isConnectable={isConnectable}
        style={{ background: '#9ca3af' }} // gray-400
      />
      {/* <Handle type="target" position={Position.Left} id="target-left" isConnectable={isConnectable} /> */}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '5px' }}>
        {icon && <span style={{ marginRight: '8px' }}>{icon}</span>}
        <strong style={{ color: '#1f2937' /* gray-800 */, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {label}
        </strong>
      </div>

      {nodeType && (
        <div style={{ fontSize: '10px', color: '#6b7280' /* gray-500 */, marginBottom: '3px', textTransform: 'uppercase' }}>
          {nodeType.replace(/_/g, ' ')}
        </div>
      )}

      {/* Example: Displaying a piece of config if available */}
      {config?.action && typeof config.action === 'string' && (
        <div style={{ fontSize: '10px', color: '#4b5563' /* gray-600 */, fontStyle: 'italic' }}>
          Action: {config.action}
        </div>
      )}
      {/* You can add more details from `data` or `config` here */}

      {/* Handles for outgoing connections (sources) */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="source-bottom"
        isConnectable={isConnectable}
        style={{ background: '#9ca3af' }} // gray-400
      />
      {/* <Handle type="source" position={Position.Right} id="source-right" isConnectable={isConnectable} /> */}
    </div>
  );
};

export default memo(CustomGraphNode); // Use memo for performance optimization