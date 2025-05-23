// src/langgraph/pages/LangGraphViewPage.tsx

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
// Import ReactFlowProvider and ensure useReactFlow is imported
import { useReactFlow, ReactFlowProvider } from 'reactflow'; 
import type { Node as ReactFlowNodeUi, Edge as ReactFlowEdgeUi, NodeMouseHandler, EdgeMouseHandler } from 'reactflow';

import { Button, Input, Card, Spin, Alert, Typography, Tooltip, Modal, Row, Col, Tag, Checkbox, InputNumber } from 'antd';
import { PlayCircleOutlined, StopOutlined, EditOutlined, ReloadOutlined, ShareAltOutlined } from '@ant-design/icons';

import { useAuth } from '../../context/AuthContext'; 
import { useLangGraphDefinitions } from '../hooks/useLangGraphDefinitions';
import { useLangGraphRunner } from '../hooks/useLangGraphRunner';
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
  const { fitView } = useReactFlow(); // This hook is now within the Provider context

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
    currentExecutionId,
    status: executionStatus,
    error: runnerError,
    graphError: executionGraphError,
    currentGraphState
  } = useLangGraphRunner();
    // Using the GraphExecutionStatus from useLangGraphRunner
  // --- UI State ---
  const [initialArgsJson, setInitialArgsJson] = useState<string>('{}');
  const [selectedElement, setSelectedElement] = useState<ReactFlowNodeUi<ReactFlowNodeData> | ReactFlowEdgeUi<ReactFlowEdgeData> | null>(null);
  const [isInspectorPanelOpen, setIsInspectorPanelOpen] = useState<boolean>(false);
  const [simulateDelay, setSimulateDelay] = useState<boolean>(false);
  const [delayMs, setDelayMs] = useState<number>(1000); // Default 1 second delay

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
    return () => {
      disconnect();
    };
  }, [graphId, getGraphDefinition, disconnect]);

  useEffect(() => {
    if (graphDefinition) {
      layoutGraph(graphDefinition);
    }
  }, [graphDefinition, layoutGraph]);

  useEffect(() => {
    if (rfNodes.length > 0 && fitView) { // Ensure fitView is available
      const timer = setTimeout(() => fitView({ duration: 500, padding: 0.1 }), 100);
      return () => clearTimeout(timer);
    }
  }, [rfNodes, fitView, executionStatus]); 

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

    const executionOptions: ExecuteGraphRequestFE = {
      inputArgs: parsedArgs,
    };

    if (simulateDelay && delayMs > 0) {
      executionOptions.simulation_delay_ms = delayMs;
    }

    console.log('[LangGraphViewPage] Executing graph with options:', executionOptions);
    connectAndExecute(graphId, executionOptions);
  }, [graphId, graphDefinition, initialArgsJson, connectAndExecute, executionStatus, simulateDelay, delayMs]);

  const handleStopExecution = useCallback(() => {
    disconnect();
  }, [disconnect]);

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
    setSelectedElement(null); 
  }, []);

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
      const edgeKeyForTraversalCheck = `${edge.source}__${edge.target}` + (edge.label ? `__${edge.label}` : '');
      const isTraversed = currentGraphState.traversedEdgeIds.has(edgeKeyForTraversalCheck);

      return {
        ...edge,
        animated: isTraversed && ['running', 'starting'].includes(executionStatus as string),
        data: { ...data, status: isTraversed ? 'traversed' : 'idle' } as ReactFlowEdgeData,
      };
    });
  }, [rfEdges, currentGraphState, executionStatus]);


  if (isLoadingDefinition || (!graphDefinition && !definitionError && graphId)) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 'calc(100vh - 100px)' }}>
        <Spin size="large" tip={`Loading graph definition for ${graphId}...`} />
      </div>
    );
  }

  if (definitionError) {
    return (      <div className="page-container">
        <Alert message="Error Loading Graph Definition" description={definitionError} type="error" showIcon />
        <Button 
          htmlType="button"
          onClick={(e) => {
            e.preventDefault();
            navigate('/langgraph');
          }} 
          style={{ marginTop: '16px' }}
        >
          Back to List
        </Button>
      </div>
    );
  }

  if (!graphDefinition) {
    return (      <div className="page-container">
        <Alert message="Graph Not Found" description={`Could not find graph definition for ID: ${graphId}`} type="warning" showIcon />
         <Button 
           htmlType="button"
           onClick={(e) => {
             e.preventDefault();
             navigate('/langgraph');
           }} 
           style={{ marginTop: '16px' }}
         >
           Back to List
         </Button>
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
            </Title>            {checkPermission('langgraph:edit') && !graphDefinition.id.startsWith('static_') && (
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
        
        {/* Replace Form with div */}
        <div>
          <Row gutter={16} align="bottom" style={{ marginBottom: '16px' }}>
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
          </Row>
          
          {/* Simulation Delay Row */}
          <Row gutter={16} align="middle" style={{ marginBottom: '16px' }}>
            <Col>
              <Checkbox
                checked={simulateDelay}
                onChange={(e) => setSimulateDelay(e.target.checked)}
                disabled={executionStatus === 'running' || executionStatus === 'starting'}
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
                disabled={!simulateDelay || executionStatus === 'running' || executionStatus === 'starting'}
                addonAfter="ms"
              />
            </Col>
          </Row>
            <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '16px' }}>
            {!['running', 'starting'].includes(executionStatus) ? (
              <Tooltip title="Start graph execution">
                <Button
                  type="primary"
                  icon={<PlayCircleOutlined />}
                  onClick={handleExecuteGraph}
                  loading={executionStatus === 'connecting'}
                  disabled={!checkPermission('langgraph:execute') || ['running', 'starting', 'connecting'].includes(executionStatus)}
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
                  disabled={!['running', 'starting'].includes(executionStatus)}
                >
                  Stop
                </Button>
              </Tooltip>
            )}
              <Tooltip title="Reload graph definition and reset layout">
              <Button
                icon={<ReloadOutlined />}
                onClick={() => {
                  disconnect(); 
                  if(graphId) getGraphDefinition(graphId).then(def => def && setGraphDefinition(def));
                }}
                disabled={isLoadingDefinition || isLoadingLayout}
              >
                Reload Graph
              </Button>
            </Tooltip>
            
            <Text>Execution Status: <Tag color={
              ['running', 'starting'].includes(executionStatus as string) ? 'blue' :
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
            // LangGraphCanvas renders ReactFlow and its children (Controls, MiniMap, Background)
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