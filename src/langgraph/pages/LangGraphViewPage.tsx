// src/langgraph/pages/LangGraphViewPage.tsx
import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useReactFlow, Controls, Background, MiniMap, BackgroundVariant } from 'reactflow';
import type { Node as ReactFlowNodeUi, Edge as ReactFlowEdgeUi, NodeMouseHandler, EdgeMouseHandler } from 'reactflow';

import { Button, Input, Card, Spin, Alert, Typography, Tooltip, Modal, Row, Col, Tag } from 'antd';
import { PlayCircleOutlined, StopOutlined, EditOutlined, ReloadOutlined, ShareAltOutlined } from '@ant-design/icons';

import { useAuth } from '../../context/AuthContext'; // Adjust path
import { useLangGraphDefinitions } from '../hooks/useLangGraphDefinitions';
import { useLangGraphRunner } from '../hooks/useLangGraphRunner';
import { useReactFlowGraphAdapter } from '../hooks/useReactFlowGraphAdapter';
import { FrontendGraphDef, ReactFlowNodeData, ReactFlowEdgeData } from '../types/langgraph';
import LangGraphCanvas from '../components/LangGraphCanvas';
import NodeInspectorPanel from '../components/NodeInspectorPanel';
// import CustomGraphNode from '../components/CustomGraphNode'; // If using custom nodes
// import CustomGraphEdge from '../components/CustomGraphEdge'; // If using custom edges

// const nodeTypes = { customGraphNode: CustomGraphNode };
// const edgeTypes = { customGraphEdge: CustomGraphEdge };

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

const LangGraphViewPage: React.FC = () => {
  const { graphId } = useParams<{ graphId: string }>();
  const navigate = useNavigate();
  const { apiClient, checkPermission } = useAuth();
  const { fitView } = useReactFlow(); // React Flow hook for controlling the viewport

  // --- State for Graph Definition ---
  const { getGraphDefinition, isLoading: isLoadingDefinition, error: definitionError } = useLangGraphDefinitions(apiClient, '/v1/lg-vis');
  const [graphDefinition, setGraphDefinition] = useState<FrontendGraphDef | null>(null);

  // --- State for React Flow Adaptation & Layout ---
  const {
    nodes: rfNodes,
    edges: rfEdges,
    layoutGraph,
    isLoadingLayout,
    errorLayout,
  } = useReactFlowGraphAdapter();

  // --- State for Graph Execution via WebSocket ---
  const {
    connectAndExecute,
    disconnect,
    // executionEvents, // For logging or advanced display - remove if not used
    currentExecutionId,
    status: executionStatus,
    error: runnerError,
    graphError: executionGraphError,
    currentGraphState, // This is key for styling nodes/edges
  } = useLangGraphRunner(); // Pass baseWsUrl if not default and configured

  // --- UI State ---
  const [initialArgsJson, setInitialArgsJson] = useState<string>('{}');
  const [selectedElement, setSelectedElement] = useState<ReactFlowNodeUi<ReactFlowNodeData> | ReactFlowEdgeUi<ReactFlowEdgeData> | null>(null);
  const [isInspectorPanelOpen, setIsInspectorPanelOpen] = useState<boolean>(false);

  // Fetch graph definition when graphId changes
  useEffect(() => {
    if (graphId) {
      const fetchDef = async () => {
        setSelectedElement(null); // Clear selection when graph changes
        setIsInspectorPanelOpen(false);
        setGraphDefinition(null); // Clear previous definition
        const definition = await getGraphDefinition(graphId);
        if (definition) {
          setGraphDefinition(definition);
        }
        // Error is handled by definitionError state
      };
      fetchDef();
    }
    // Cleanup: disconnect WebSocket if graphId changes or component unmounts
    return () => {
      disconnect();
    };
  }, [graphId, getGraphDefinition, disconnect]);

  // Layout graph when definition is loaded or changes
  useEffect(() => {
    if (graphDefinition) {
      layoutGraph(graphDefinition);
      // Add Controls, Background, MiniMap here if they are part of the layout or canvas setup
      // For example, if LangGraphCanvas takes them as props or if they are added directly
    }
  }, [graphDefinition, layoutGraph]);

  // Fit view when nodes are initially layouted or execution ends/starts
  useEffect(() => {
    if (rfNodes.length > 0) {
      // Timeout to ensure layout has been applied by the browser
      const timer = setTimeout(() => fitView({ duration: 500, padding: 0.1 }), 100);
      return () => clearTimeout(timer);
    }
  }, [rfNodes, fitView, executionStatus]); // Also re-fit on execution status change to recenter


  const handleExecuteGraph = useCallback(() => {
    if (!graphId || !graphDefinition) {
      Modal.error({ title: 'Error', content: 'Graph definition not loaded.' });
      return;
    }
    if (executionStatus === 'running' || executionStatus === 'connecting' || executionStatus === 'starting') {
      Modal.warn({ title: 'In Progress', content: 'Graph is already running or attempting to connect.' });
      return;
    }

    let parsedArgs: Record<string, any> = {};
    try {
      parsedArgs = JSON.parse(initialArgsJson);
    } catch (e) {
      Modal.error({ title: 'Invalid Input', content: 'Initial arguments must be valid JSON.' });
      return;
    }
    connectAndExecute(graphId, parsedArgs /*, optional predefinedExecutionId */);
  }, [graphId, graphDefinition, initialArgsJson, connectAndExecute, executionStatus]);

  const handleStopExecution = useCallback(() => {
    disconnect();
  }, [disconnect]);

  // --- Node and Edge Click Handlers for Inspector ---
  const onNodeClickHandler: NodeMouseHandler = useCallback((_event, node) => {
    const enrichedNodeData: ReactFlowNodeData = {
      ...node.data,
      inputs: currentGraphState.lastInputByNode[node.id],
      outputs: currentGraphState.lastOutputByNode[node.id],
    };
    setSelectedElement({ ...node, data: enrichedNodeData });
    setIsInspectorPanelOpen(true);
  }, [currentGraphState]);

  const onEdgeClickHandler: EdgeMouseHandler = useCallback((_event, edge) => {
    setSelectedElement(edge);
    setIsInspectorPanelOpen(true);
  }, []);

  const closeInspectorPanel = useCallback(() => {
    setIsInspectorPanelOpen(false);
    setSelectedElement(null); // Deselect
  }, []);

  // --- Memoized Nodes and Edges with Dynamic Styling from Execution State ---
  const styledNodes = useMemo(() => {
    return rfNodes.map(node => {
      const data = node.data as ReactFlowNodeData;
      let newStatus: ReactFlowNodeData['status'] = 'idle';

      if (currentGraphState.activeNodeIds.has(node.id)) newStatus = 'running';
      else if (currentGraphState.errorNodeIds.has(node.id)) newStatus = 'error';
      else if (currentGraphState.completedNodeIds.has(node.id)) newStatus = 'success';
      else if (selectedElement?.id === node.id) newStatus = 'active';

      return { ...node, data: { ...data, status: newStatus } };
    });
  }, [rfNodes, currentGraphState, selectedElement]);

  const styledEdges = useMemo(() => {
    return rfEdges.map(edge => {
      const data = edge.data as ReactFlowEdgeData;
      // Construct edge ID like "source__target" or "source__target__label" if that's how you store it
      const edgeKeyForTraversalCheck = `${edge.source}__${edge.target}` + (edge.label ? `__${edge.label}` : '');
      const isTraversed = currentGraphState.traversedEdgeIds.has(edgeKeyForTraversalCheck);

      return {
        ...edge,
        animated: isTraversed && (executionStatus === 'running' || executionStatus === 'starting'),
        data: { ...data, status: isTraversed ? 'traversed' : 'idle' } as ReactFlowEdgeData,
        // Style can be set directly here, or better, handled by CustomGraphEdge based on data.status
      };
    });
  }, [rfEdges, currentGraphState, executionStatus]);


  // --- Render Logic ---
  if (isLoadingDefinition || (!graphDefinition && !definitionError && graphId)) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 'calc(100vh - 100px)' }}>
        <Spin size="large" tip={`Loading graph definition for ${graphId}...`} />
      </div>
    );
  }

  if (definitionError) {
    return (
      <div className="page-container">
        <Alert message="Error Loading Graph Definition" description={definitionError} type="error" showIcon />
        <Button onClick={() => navigate('/langgraph')} style={{ marginTop: '16px' }}>Back to List</Button>
      </div>
    );
  }

  if (!graphDefinition) {
    return (
      <div className="page-container">
        <Alert message="Graph Not Found" description={`Could not find graph definition for ID: ${graphId}`} type="warning" showIcon />
         <Button onClick={() => navigate('/langgraph')} style={{ marginTop: '16px' }}>Back to List</Button>
      </div>
    );
  }

  return (
    <div className="page-container" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 64px)', /* Adjust based on your app's header height */ }}>
      <Card
        title={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Title level={3} style={{ margin: 0, display: 'flex', alignItems: 'center' }}>
              <ShareAltOutlined style={{ marginRight: '10px' }} />
              {graphDefinition.name}
              <Text type="secondary" style={{ marginLeft: '10px', fontSize: '0.9em' }}>(ID: {graphDefinition.id})</Text>
            </Title>
            {checkPermission('langgraph:edit') && !graphDefinition.id.startsWith('static_') && (
                <Tooltip title="Edit Graph Definition">
                    <Button
                        icon={<EditOutlined />}
                        onClick={() => navigate(`/langgraph/edit/${graphId}`)} // Assuming an edit route
                    >
                        Edit
                    </Button>
                </Tooltip>
            )}
          </div>
        }
        bordered={false}
        style={{ marginBottom: '16px' }}
      >
        {graphDefinition.description && <Paragraph type="secondary">{graphDefinition.description}</Paragraph>}
        <Row gutter={16} align="bottom">
          <Col flex="auto">
            <Text strong>Initial Arguments (JSON):</Text>
            <TextArea
              rows={3}
              value={initialArgsJson}
              onChange={(e) => setInitialArgsJson(e.target.value)}
              placeholder='e.g., {"input": "User query here..."}'
              disabled={executionStatus === 'running' || executionStatus === 'starting'}
              style={{ fontFamily: 'monospace', fontSize: '12px' }}
            />
          </Col>
          <Col>
            {executionStatus !== 'running' && executionStatus !== 'starting' ? (
              <Tooltip title="Start graph execution">
                <Button
                  type="primary"
                  icon={<PlayCircleOutlined />}
                  onClick={handleExecuteGraph}
                  loading={executionStatus === 'connecting'}
                  disabled={!checkPermission('langgraph:execute')} // Example permission
                >
                  Execute
                </Button>
              </Tooltip>
            ) : (
              <Tooltip title="Stop graph execution">
                <Button
                  type="default"
                  danger
                  icon={<StopOutlined />}
                  onClick={handleStopExecution}
                >
                  Stop
                </Button>
              </Tooltip>
            )}
          </Col>
           <Col>
                <Tooltip title="Reload graph definition and reset layout">
                    <Button
                        icon={<ReloadOutlined />}
                        onClick={() => {
                            disconnect(); // Stop any current execution
                            if(graphId) getGraphDefinition(graphId).then(def => def && setGraphDefinition(def));
                        }}
                        disabled={isLoadingDefinition || isLoadingLayout}
                    >
                        Reload Graph
                    </Button>
                </Tooltip>
            </Col>
        </Row>
        <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <Text>Execution Status: <Tag color={
                executionStatus === 'running' || executionStatus === 'starting' ? 'blue' :
                executionStatus === 'completed' ? 'green' :
                executionStatus === 'error' ? 'red' :
                executionStatus === 'connecting' ? 'geekblue' :
                'default'
            }>{executionStatus.toUpperCase()}</Tag></Text>
            {currentExecutionId && <Text type="secondary" style={{fontSize: '0.8em'}}>Run ID: <Text copyable code style={{fontSize: '1em'}}>{currentExecutionId}</Text></Text>}
        </div>
        {runnerError && <Alert message="Connection Error" description={runnerError} type="error" showIcon style={{marginTop: '8px'}} />}
        {executionGraphError && (
          <Alert
            message={`Graph Execution Error (Node: ${executionGraphError.nodeId || 'Unknown'})`}
            description={executionGraphError.message + (executionGraphError.details ? ` | Details: ${executionGraphError.details}` : '')}
            type="error"
            showIcon
            style={{marginTop: '8px'}}
          />
        )}
      </Card>

      <div style={{ display: 'flex', flexGrow: 1, height: '100%', overflow: 'hidden' }}>
        <div style={{ flexGrow: 1, height: '100%', position: 'relative' /* For React Flow */ }}>
          {isLoadingLayout ? (
             <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                <Spin size="large" tip="Applying graph layout..." />
             </div>
          ) : errorLayout ? (
            <Alert message="Layout Error" description={errorLayout} type="error" showIcon />
          ) : (
            <>
              <LangGraphCanvas
                nodes={styledNodes}
                edges={styledEdges}
                onNodeClick={onNodeClickHandler}
                onEdgeClick={onEdgeClickHandler}
                // Pass nodeTypes and edgeTypes if you have CustomGraphNode/CustomGraphEdge
                // nodeTypes={nodeTypes}
                // edgeTypes={edgeTypes}
              />
              <Controls />
              <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
              <MiniMap nodeStrokeWidth={3} zoomable pannable />
            </>
          )}
        </div>
        {isInspectorPanelOpen && (
          <div style={{ width: '320px', minWidth: '280px', height: '100%', borderLeft: '1px solid #f0f0f0', backgroundColor: '#ffffff' }}>
            <NodeInspectorPanel
              selectedElement={selectedElement}
              onClose={closeInspectorPanel}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default LangGraphViewPage;