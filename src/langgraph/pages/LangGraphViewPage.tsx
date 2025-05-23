// src/langgraph/pages/LangGraphViewPage.tsx

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
// Import ReactFlowProvider and ensure useReactFlow is imported
import { useReactFlow, ReactFlowProvider, Node, Edge, NodeMouseHandler, EdgeMouseHandler } from 'reactflow'; // Removed Connection
import { Button, Input, Card, Spin, Alert, Typography, Tooltip, Modal, Row, Col, Tag, Checkbox, InputNumber } from 'antd';
import { PlayCircleOutlined, StopOutlined, EditOutlined, ReloadOutlined, ShareAltOutlined } from '@ant-design/icons';

import { useAuth } from '../../context/AuthContext'; 
import { useLangGraphDefinitions } from '../hooks/useLangGraphDefinitions';
import { useLangGraphSSERunner } from '../hooks/useLangGraphSSERunner'; // Updated import
import { useReactFlowGraphAdapter } from '../hooks/useReactFlowGraphAdapter';
import { FrontendGraphDef, ReactFlowNodeData, ReactFlowEdgeData, ExecuteGraphRequestFE } from '../types/langgraph';
import LangGraphCanvas from '../components/LangGraphCanvas';
import NodeInspectorPanel from '../components/NodeInspectorPanel';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

// Using direct string comparisons for execution status checks

// Renamed the original component to be wrapped by the Provider
const LangGraphViewPageContent: React.FC = () => {
  const { graphId } = useParams<{ graphId: string }>();
  const navigate = useNavigate();
  const { apiClient, checkPermission } = useAuth();
  const { fitView } = useReactFlow();

  const { getGraphDefinition, isLoading: isLoadingDefinition, error: definitionLoadingError } = useLangGraphDefinitions(apiClient, '/v1/lg-vis');
  const [graphDefinition, setGraphDefinition] = useState<FrontendGraphDef | null>(null);

  const {
    nodes: rfNodes,
    edges: rfEdges,
    layoutGraph,
    isLoadingLayout,
    errorLayout,
  } = useReactFlowGraphAdapter();
  
  const {
    currentGraphState,
    connectAndExecute,
    status,
    // executionEvents, // Commented out as unused for now
    currentExecutionId,
    error, 
    graphError, 
  } = useLangGraphSSERunner('/v1');

  const [initialArgsJson, setInitialArgsJson] = useState<string>('{}');
  const [selectedElement, setSelectedElement] = useState<Node<ReactFlowNodeData> | Edge<ReactFlowEdgeData> | null>(null);
  const [isInspectorPanelOpen, setIsInspectorPanelOpen] = useState<boolean>(false);
  const [simulateDelay, setSimulateDelay] = useState<boolean>(false);
  const [delayMs, setDelayMs] = useState<number>(1000);

  useEffect(() => {
    if (graphId) {
      const fetchDef = async () => {
        setSelectedElement(null); 
        setIsInspectorPanelOpen(false);
        setGraphDefinition(null); 
        const definition = await getGraphDefinition(graphId);
        if (definition) {
          setGraphDefinition(definition);
        }
      };
      fetchDef();
    }
    // Optional: return disconnect function from useLangGraphSSERunner if needed for cleanup
    // return () => { disconnect?.(); }; 
  }, [graphId, getGraphDefinition]);

  useEffect(() => {
    if (graphDefinition) {
      layoutGraph(graphDefinition);
    }
  }, [graphDefinition, layoutGraph]);

  useEffect(() => {
    if (rfNodes.length > 0 && fitView) {
      const timer = setTimeout(() => fitView({ duration: 500, padding: 0.1 }), 100);
      return () => clearTimeout(timer);
    }
  }, [rfNodes, fitView, status]); 

  const handleExecuteGraph = useCallback(() => {
    if (!graphId || !graphDefinition) {
      Modal.error({ title: 'Error', content: 'Graph definition not loaded.' });
      return;
    }
    // Removed 'starting' from comparison as it's not in GraphExecutionStatus
    if (status === 'running' || status === 'connecting') { 
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

    const executionOptions: ExecuteGraphRequestFE = {
      inputArgs: parsedArgs,
    };

    if (simulateDelay && delayMs > 0) {
      executionOptions.simulation_delay_ms = delayMs;
    }

    connectAndExecute(graphId, executionOptions);
  }, [graphId, graphDefinition, initialArgsJson, connectAndExecute, status, simulateDelay, delayMs]);

  const handleStopExecution = useCallback(() => {
    // Call disconnect from useLangGraphSSERunner if available and needed
    // disconnect?.(); 
  }, []); // Add disconnect to dependency array if used

  const onNodeClickHandler: NodeMouseHandler = useCallback((_event: React.MouseEvent, node: Node<ReactFlowNodeData>) => { // Prefixed event with _
    const enrichedNodeData: ReactFlowNodeData = {
      ...node.data,
      inputs: currentGraphState.lastInputByNode[node.id],
      outputs: currentGraphState.lastOutputByNode[node.id],
    };
    setSelectedElement({ ...node, data: enrichedNodeData } as Node<ReactFlowNodeData>);
    setIsInspectorPanelOpen(true);
  }, [currentGraphState]);

  const onEdgeClickHandler: EdgeMouseHandler = useCallback((_event: React.MouseEvent, edge: Edge<ReactFlowEdgeData>) => { // Prefixed event with _
    setSelectedElement(edge as Edge<ReactFlowEdgeData>);
    setIsInspectorPanelOpen(true);
  }, []);

  const closeInspectorPanel = useCallback(() => {
    setIsInspectorPanelOpen(false);
    setSelectedElement(null); 
  }, []);

  const styledNodes = useMemo(() => {
    if (!rfNodes) return [];
    return rfNodes.map(node => {
      const graphNodeState: ReactFlowNodeData['status'] =
                             currentGraphState.activeNodeIds.has(node.id) ? 'running' :
                             currentGraphState.completedNodeIds.has(node.id) ? 'success' : // Changed 'completed' to 'success'
                             currentGraphState.errorNodeIds.has(node.id) ? 'error' : 
                             'idle';
      const lastOutput = currentGraphState.lastOutputByNode[node.id];
      const nodeSpecificError = graphError?.nodeId === node.id ? graphError : null;

      return {
        ...node,
        data: {
          ...node.data,
          status: graphNodeState,
          outputData: lastOutput,
          errorMessage: nodeSpecificError?.message, // Use .message from GraphErrorEventFE
        },
      };
    });
  }, [rfNodes, currentGraphState, graphError]);

  const styledEdges = useMemo(() => {
    if (!rfEdges) return [];
    return rfEdges.map(edge => {
      const currentEdgeData = edge.data || {};
      return {
        ...edge,
        animated: false,
        style: {
          stroke: '#b1b1b7',
          strokeWidth: 1.5,
        },
        data: {
          ...currentEdgeData,
          status: 'idle', // This should now be correctly typed via ReactFlowEdgeData
        } as ReactFlowEdgeData, // Explicitly cast the data object
      };
    });
  }, [rfEdges]);

  if (isLoadingDefinition) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 'calc(100vh - 64px)' }}>
        <Spin size="large" tip="Loading graph definition..." />
      </div>
    );
  }

  if (definitionLoadingError) {
    return (
      <div style={{ padding: '20px' }}>
        <Alert message="Error Loading Graph Definition" description={definitionLoadingError} type="error" showIcon />
      </div>
    );
  }

  if (!graphDefinition) {
    return (
      <div style={{ padding: '20px' }}>
        <Alert message="Graph Not Found" description={`The graph with ID "${graphId}" could not be found or loaded.`} type="warning" showIcon />
        <Button onClick={() => navigate('/langgraph/graphs')} style={{ marginTop: '10px' }}>Back to Graphs List</Button>
      </div>
    );
  }

  return (
    <div className="page-container" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 64px)'}}>
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
                        htmlType="button"
                        icon={<EditOutlined />}
                        onClick={(e) => {
                            e.preventDefault();
                            navigate(`/langgraph/edit/${graphId}`);
                        }}
                    >
                        Edit
                    </Button>                
                </Tooltip>
            )}
          </div>
        }
        variant="borderless"
        style={{ marginBottom: '16px' }}
      >
        {graphDefinition.description && <Paragraph type="secondary">{graphDefinition.description}</Paragraph>}
        
        <div>
          <Row gutter={16} align="bottom" style={{ marginBottom: '16px' }}>
            <Col flex="auto">
              <Text strong>Initial Arguments (JSON):</Text>
              <TextArea
                rows={3}
                value={initialArgsJson}
                onChange={(e) => setInitialArgsJson(e.target.value)}
                placeholder='e.g., {"input": "User query here..."}'
                disabled={status === 'running' || status === 'connecting'} // Removed 'starting'
                style={{ fontFamily: 'monospace', fontSize: '12px' }}
              />
            </Col>
          </Row>
          
          <Row gutter={16} align="middle" style={{ marginBottom: '16px' }}>
            <Col>
              <Checkbox
                checked={simulateDelay}
                onChange={(e) => setSimulateDelay(e.target.checked)}
                disabled={status === 'running' || status === 'connecting'} // Removed 'starting'
              >
                Simulate Node Delay
              </Checkbox>
            </Col>
            <Col>
              <InputNumber
                min={100}
                max={10000}
                step={100}
                value={delayMs}
                onChange={(value) => setDelayMs(value || 100)}
                disabled={!simulateDelay || status === 'running' || status === 'connecting'} // Removed 'starting'
                addonAfter="ms"
              />
            </Col>
          </Row>
            <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '16px' }}>
            {!['running', 'connecting'].includes(status) ? ( // Removed 'starting'
              <Tooltip title="Start graph execution">
                <Button
                  type="primary"
                  icon={<PlayCircleOutlined />}
                  onClick={handleExecuteGraph}
                  loading={status === 'connecting'}
                  disabled={!checkPermission('langgraph:execute') || ['running', 'connecting'].includes(status)} // Removed 'starting'
                >
                  Execute
                </Button>
              </Tooltip>
            ) : (
              <Tooltip title="Stop graph execution (Note: SSE stop might be server-side or client-side navigation)">
                <Button
                  type="default"
                  danger
                  icon={<StopOutlined />}
                  onClick={handleStopExecution} // Ensure this function correctly stops SSE if possible
                  disabled={!['running'].includes(status)} // Removed 'starting', only 'running' makes sense for stop
                >
                  Stop
                </Button>
              </Tooltip>
            )}
              <Tooltip title="Reload graph definition and reset layout">
              <Button
                icon={<ReloadOutlined />}
                onClick={() => {
                  // disconnect?.(); // Optional: disconnect before reloading
                  if(graphId) getGraphDefinition(graphId).then(def => def && setGraphDefinition(def));
                }}
                disabled={isLoadingDefinition || isLoadingLayout}
              >
                Reload Graph
              </Button>
            </Tooltip>
            
            <Text>Execution Status: <Tag color={
              status === 'running' ? 'blue' : // Removed 'starting'
              status === 'completed' ? 'green' :
              status === 'error' ? 'red' :
              status === 'connecting' ? 'geekblue' :
              'default'
            }>{status.toUpperCase()}</Tag></Text>
            {currentExecutionId && <Text type="secondary" style={{fontSize: '0.8em'}}>Run ID: <Text copyable code style={{fontSize: '1em'}}>{currentExecutionId}</Text></Text>}
          </div>
          
          {error && <Alert message="Connection Error" description={error} type="error" showIcon style={{marginTop: '8px'}} />}
          {graphError && (
            <Alert
              message={`Graph Execution Error (Node: ${graphError.nodeId || 'N/A'})`}
              description={graphError.message + (graphError.details ? ` | Details: ${graphError.details}` : '')}
              type="error"
              showIcon
              style={{marginTop: '8px'}}
            />
          )}
        </div>
      </Card>

      <div style={{ display: 'flex', flexGrow: 1, height: '100%', overflow: 'hidden' }}>
        <div style={{ flexGrow: 1, height: '100%', position: 'relative' }}>
          {isLoadingLayout ? (
             <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                <Spin size="large" tip="Applying graph layout..." />
             </div>
          ) : errorLayout ? (
            <Alert message="Layout Error" description={errorLayout} type="error" showIcon />
          ) : (
            <LangGraphCanvas
              nodes={styledNodes}
              edges={styledEdges}
              onNodeClick={onNodeClickHandler}
              onEdgeClick={onEdgeClickHandler}
            />
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

// New wrapper component that provides the ReactFlowProvider
const LangGraphViewPage: React.FC = () => {
  return (
    <ReactFlowProvider>
      <LangGraphViewPageContent />
    </ReactFlowProvider>
  );
};

export default LangGraphViewPage;