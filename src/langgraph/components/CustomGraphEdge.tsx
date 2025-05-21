// src/langgraph/components/CustomGraphEdge.tsx
import React, { memo } from 'react';
import {
  EdgeProps,
  getSmoothStepPath, // Or use getBezierPath, getStraightPath
  EdgeLabelRenderer, // For custom label positioning
  BaseEdge,          // Renders the path and markers
} from 'reactflow';

import { ReactFlowEdgeData } from '../types/langgraph'; // Your custom edge data type

const CustomGraphEdge: React.FC<EdgeProps<ReactFlowEdgeData>> = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  data, // Contains { label?: string, status?: 'idle' | 'traversed' }
  markerEnd,
}) => {
  const { label, status } = data || {};

  // Use getSmoothStepPath for a nice curved edge.
  // You can adjust parameters like borderRadius.
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 10, // Adjust for more or less curve at corners
  });

  // --- Dynamic Styling based on status ---
  const edgeStyle: React.CSSProperties = {
    ...style, // Apply any base styles passed as props
    strokeWidth: status === 'traversed' ? 2.5 : 1.5,
    stroke: status === 'traversed' ? '#10B981' : '#a3a3a3', // Emerald-500 for traversed, neutral-400 for idle
    transition: 'stroke 0.2s ease-in-out, stroke-width 0.2s ease-in-out',
  };

  // --- Animated SVG Dash for Traversed Edges ---
  // This creates a "marching ants" effect.
  // Adjust dasharray and animation speed as needed.
  const animationStyle = status === 'traversed' ? {
    strokeDasharray: '5, 5',
    animation: 'dashdraw 0.5s linear infinite',
  } : {};

  return (
    <>
      <BaseEdge path={edgePath} markerEnd={markerEnd} style={{...edgeStyle, ...animationStyle}} />
      {label && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              background: status === 'traversed' ? '#d1fae5' : '#f3f4f6', // emerald-100 or gray-100
              padding: '2px 6px',
              borderRadius: '4px',
              fontSize: 10,
              fontWeight: 500,
              color: status === 'traversed' ? '#059669' : '#4b5563', // emerald-700 or gray-600
              pointerEvents: 'all', // Allow interaction with the label if needed
              border: status === 'traversed' ? '1px solid #6ee7b7' : '1px solid #e5e7eb', // emerald-300 or gray-200
            }}
            className="nodrag nopan" // Prevent dragging canvas when interacting with label
          >
            {label}
          </div>
        </EdgeLabelRenderer>
      )}
      {/* CSS for animation (can be put in a global CSS file or a style tag) */}
      <style>{`
        @keyframes dashdraw {
          to {
            stroke-dashoffset: -10;
          }
        }
      `}</style>
    </>
  );
};

export default memo(CustomGraphEdge);