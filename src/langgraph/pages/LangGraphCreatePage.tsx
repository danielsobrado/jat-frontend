// src/langgraph/pages/LangGraphCreatePage.tsx
import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, Input, Typography, Alert, Modal, Row, Col, Form } from 'antd';
import { SaveOutlined, CodeOutlined, ArrowLeftOutlined, InfoCircleOutlined } from '@ant-design/icons';

import { useAuth } from '../../context/AuthContext'; // Adjust path
import { useLangGraphDefinitions } from '../hooks/useLangGraphDefinitions';
import { CreateGraphRequestFE } from '../types/langgraph';
// You might want a JSON schema or examples to guide the user
// import exampleGraphJsonSchema from './exampleGraphSchema.json'; // Example

const { Title, Paragraph, Text } = Typography;
const { TextArea } = Input;

// Basic example JSON structure to guide the user
const EXAMPLE_GRAPH_JSON = `{
  "name": "My New Workflow",
  "description": "A brief description of what this workflow does.",
  "stateSchemaName": "BasicAgentState",
  "entryPointNodeId": "start_node",
  "nodes": [
    {
      "id": "start_node",
      "type": "simple_modifier",
      "config": { "message_prefix": "Entry: " },
      "uiPosition": { "x": 100, "y": 100 }
    }, 
    {
      "id": "next_step",
      "type": "simple_modifier",
      "config": { "message_prefix": "Next: " },
      "uiPosition": { "x": 300, "y": 100 }
    }
  ],
  "edges": [
    { "id": "e_start_to_next", "source": "start_node", "target": "next_step", "label": "Proceed" }
  ],
  "conditionalEdges": [],
  "terminalNodeIds": ["next_step"]
}`;

const LangGraphCreatePage: React.FC = () => {
  const navigate = useNavigate();  const { apiClient, checkPermission } = useAuth();
  const { createGraphDefinition, isLoading, error } = useLangGraphDefinitions(apiClient, '/v1/lg-vis');

  const [graphJson, setGraphJson] = useState<string>(EXAMPLE_GRAPH_JSON);
  const [formError, setFormError] = useState<string | null>(null);
  const [bordered] = useState(false); // Default to false to match previous behavior

  // Permission check
  const canCreate = checkPermission('langgraph:create'); // Example permission

  const handleSubmit = useCallback(async () => {
    if (!canCreate) {
      Modal.error({ title: 'Permission Denied', content: 'You do not have permission to create graph definitions.' });
      return;
    }

    setFormError(null);
    let parsedData: Partial<CreateGraphRequestFE>;

    try {
      parsedData = JSON.parse(graphJson);
      // Basic validation (more thorough validation should happen on the backend via Pydantic)
      if (!parsedData.name || !parsedData.stateSchemaName || !parsedData.entryPointNodeId || !parsedData.nodes) {
        setFormError('Required fields missing: name, stateSchemaName, entryPointNodeId, and nodes are mandatory.');
        return;
      }
    } catch (e) {
      setFormError('Invalid JSON format. Please check the syntax.');
      return;
    }

    const newGraph = await createGraphDefinition(parsedData as CreateGraphRequestFE);

    if (newGraph && newGraph.id) {
      Modal.success({
        title: 'Graph Created Successfully!',
        content: `Graph "${newGraph.name}" has been created.`,
        onOk: () => navigate(`/langgraph/view/${newGraph.id}`),
      });
    } else {
      // Error is handled by the hook and displayed via the 'error' state variable
      // but we can also set a form-specific error if the hook's error isn't user-friendly enough
      setFormError(error || 'Failed to create graph. Please check the details and try again.');
    }
  }, [graphJson, createGraphDefinition, navigate, error, canCreate]);

  if (!canCreate) {
    return (
         <div className="page-container">
            <Alert
                message="Permission Denied"
                description="You do not have permission to create new graph definitions. Please contact your administrator."
                type="error"
                showIcon
            />
            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/langgraph')} style={{ marginTop: 16 }}>
                Back to Graph List
            </Button>
        </div>
    );
  }

  return (
    <div className="page-container" style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <Card
        title={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Title level={2} style={{ margin: 0 }}>
              <CodeOutlined style={{ marginRight: '12px' }} />
              Create New Agentic Workflow
            </Title>
            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/langgraph')}>
                Back to List
            </Button>          </div>
        }
        variant={bordered ? "outlined" : "borderless"}
      >
        <Paragraph type="secondary">
          Define your LangGraph workflow by providing its structure in JSON format.
          Ensure the node types and state schema name correspond to definitions known by the backend.
          Refer to the documentation or examples for the correct schema.
        </Paragraph>

        <Form layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            label="Graph Definition (JSON)"
            help={formError || (error && `API Error: ${error}`) || "Paste your graph definition JSON here."}
            validateStatus={formError || error ? 'error' : ''}
            required
          >
            <TextArea
              rows={20}
              value={graphJson}
              onChange={(e) => setGraphJson(e.target.value)}
              placeholder={EXAMPLE_GRAPH_JSON}
              style={{ fontFamily: 'monospace', fontSize: '13px' }}
              disabled={isLoading}
            />
          </Form.Item>

          <Row justify="end">
            <Col>
              <Button
                type="primary"
                htmlType="submit"
                icon={<SaveOutlined />}
                loading={isLoading}
                disabled={!graphJson.trim()}
              >
                Create Graph
              </Button>
            </Col>
          </Row>
        </Form>

        <details style={{ marginTop: '24px', cursor: 'pointer', border: '1px solid #e8e8e8', padding: '12px', borderRadius: '4px' }}>
            <summary style={{ fontWeight: '500', fontSize: '0.9em' }}>
                <InfoCircleOutlined style={{marginRight: '6px'}} />
                Example JSON Structure & Key Fields
            </summary>
            <Paragraph style={{marginTop: '8px', fontSize: '0.85em'}}>
                <Text strong>Required fields:</Text>
                <ul>
                    <li><Text code>name</Text>: (string) Human-readable name.</li>
                    <li><Text code>stateSchemaName</Text>: (string) Name of a Pydantic state model registered in the backend (e.g., "BasicAgentState", "DocumentProcessingState").</li>
                    <li><Text code>entryPointNodeId</Text>: (string) The ID of one of your defined nodes.</li>
                    <li><Text code>nodes</Text>: (array) List of node definitions. Each node needs:
                        <ul>
                            <li><Text code>id</Text>: (string) Unique ID for the node.</li>
                            <li><Text code>type</Text>: (string) Type string matching a key in backend's `NODE_IMPLEMENTATIONS` (e.g., "llm_node", "simple_modifier").</li>
                            <li><Text code>config</Text>: (object, optional) Configuration for the node type.</li>
                            <li><Text code>uiPosition</Text>: (object, optional) <Text code>{`{ "x": number, "y": number }`}</Text> for initial UI placement.</li>
                        </ul>
                    </li>
                </ul>
                <Text strong>Optional but important fields:</Text>
                <ul>
                    <li><Text code>description</Text>: (string) What the graph does.</li>
                    <li><Text code>edges</Text>: (array) Standard edges. Each edge needs:
                        <ul>
                             <li><Text code>id</Text>: (string) Unique ID for the edge.</li>
                             <li><Text code>source</Text>: (string) Source node ID.</li>
                             <li><Text code>target</Text>: (string) Target node ID.</li>
                             <li><Text code>label</Text>: (string, optional) Edge label.</li>
                        </ul>
                    </li>
                    <li><Text code>conditionalEdges</Text>: (array) For branching logic. Each entry needs:
                        <ul>
                            <li><Text code>sourceNodeId</Text>: (string) The node whose config specifies a `router_function_name`.</li>
                            <li><Text code>mappings</Text>: (array) Each mapping needs:
                                <ul>
                                    <li><Text code>conditionName</Text>: (string) Key returned by the router function.</li>
                                    <li><Text code>targetNodeId</Text>: (string) Target node ID for this condition.</li>
                                </ul>
                            </li>
                        </ul>
                        (Note: The router function itself is specified in the source node's `config` via `router_function_name`.)
                    </li>
                     <li><Text code>terminalNodeIds</Text>: (array of strings, optional) Node IDs that should implicitly connect to END.</li>
                </ul>
            </Paragraph>
        </details>
      </Card>
    </div>
  );
};

export default LangGraphCreatePage;