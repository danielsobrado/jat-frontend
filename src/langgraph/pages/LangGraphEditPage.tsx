// src/langgraph/pages/LangGraphEditPage.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react'; 
import { useParams, useNavigate } from 'react-router-dom';
import { Button, Card, Typography, Spin, Alert, Modal, Row, Col, Form } from 'antd';
import { SaveOutlined, CodeOutlined, ArrowLeftOutlined } from '@ant-design/icons'; 
import Editor, { Monaco } from '@monaco-editor/react';

import { useAuth } from '../../context/AuthContext';
import { useLangGraphDefinitions } from '../hooks/useLangGraphDefinitions';
import { UpdateGraphRequestFE, FrontendGraphDef } from '../types/langgraph';

const { Title, Paragraph } = Typography;
// const { TextArea } = Input; // No longer using Ant Design TextArea

const LangGraphEditPage: React.FC = () => {
  const { graphId } = useParams<{ graphId: string }>();
  const navigate = useNavigate();
  const { apiClient, checkPermission } = useAuth();
  const { getGraphDefinition, updateGraphDefinition, isLoading, error } = useLangGraphDefinitions(apiClient, '/v1/lg-vis');

  const [graphJson, setGraphJson] = useState<string>(''); // Store as string for Monaco
  const [initialGraphName, setInitialGraphName] = useState<string>('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isFetching, setIsFetching] = useState<boolean>(false);
  const editorRef = useRef<any>(null); // Ref for Monaco editor instance

  const canEdit = checkPermission('langgraph:edit');

  useEffect(() => {
    if (graphId && canEdit) {
      setIsFetching(true);
      getGraphDefinition(graphId)
        .then(definition => {
          if (definition) {
            setInitialGraphName(definition.name);
            const editableDefinition: Partial<FrontendGraphDef> = { ...definition };
            delete editableDefinition.id;
            delete editableDefinition.createdAt;
            delete editableDefinition.updatedAt;
            delete editableDefinition.version;
            setGraphJson(JSON.stringify(editableDefinition, null, 2)); // Pretty print for editor
          } else {
            setFormError(`Graph definition with ID '${graphId}' not found.`);
            setGraphJson(''); // Clear JSON if not found
          }
        })
        .catch(fetchError => {
          setFormError(fetchError.message || `Failed to load graph definition for ID '${graphId}'.`);
          setGraphJson(''); // Clear JSON on error
        })
        .finally(() => setIsFetching(false));
    } else if (!canEdit) {
        setFormError("You do not have permission to edit this graph.");
        setGraphJson('');
    }
  }, [graphId, getGraphDefinition, canEdit]);
  const handleEditorDidMount = (editor: any, _monaco: Monaco) => {
    editorRef.current = editor;
    // You can configure the editor here, e.g., monaco.languages.json.jsonDefaults.setDiagnosticsOptions
    console.log('Monaco Editor mounted:', editor);
  };

  const handleEditorChange = (value: string | undefined) => {
    setGraphJson(value || '');
    if (formError) setFormError(null); // Clear parse error if user starts typing
  };

  const handleSubmit = useCallback(async () => {
    if (!canEdit) {
      Modal.error({ title: 'Permission Denied', content: 'You do not have permission to edit graph definitions.' });
      return;
    }
    if (!graphId) {
        setFormError('Graph ID is missing.');
        return;
    }

    setFormError(null);
    let parsedData: Partial<UpdateGraphRequestFE>;

    try {
      parsedData = JSON.parse(graphJson); // graphJson is directly from Monaco editor
      if (!parsedData.name || !parsedData.stateSchemaName || !parsedData.entryPointNodeId || !parsedData.nodes) {
        setFormError('Required fields missing: name, stateSchemaName, entryPointNodeId, and nodes are mandatory.');
        return;
      }
    } catch (e: any) {
      setFormError(`Invalid JSON format: ${e.message}. Please check the syntax.`);
      return;
    }

    const updatedGraph = await updateGraphDefinition(graphId, parsedData as UpdateGraphRequestFE);

    if (updatedGraph && updatedGraph.id) {
      Modal.success({
        title: 'Graph Updated Successfully!',
        content: `Graph "${updatedGraph.name}" has been updated.`,
        onOk: () => navigate(`/langgraph/view/${updatedGraph.id}`),
      });
    } else {
      setFormError(error || 'Failed to update graph. Please check the details and try again.');
    }
  }, [graphJson, updateGraphDefinition, navigate, error, graphId, canEdit]);


  if (!canEdit && !isFetching) {
     return (
         <div className="page-container">
            <Alert
                message="Permission Denied"
                description={formError || "You do not have permission to edit graph definitions. Please contact your administrator."}
                type="error"
                showIcon
            />
            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/langgraph')} style={{ marginTop: 16 }}>
                Back to Graph List
            </Button>
        </div>
    );
  }

  if (isFetching && !graphJson) { // Show spinner only if no content is loaded yet
    return (
      <div className="page-container flex justify-center items-center" style={{ height: 'calc(100vh - 150px)' }}>
        <Spin size="large" tip={`Loading graph '${graphId}' for editing...`} />
      </div>
    );
  }

  if (formError && !isFetching && !graphJson) { 
    return (
      <div className="page-container">
        <Alert
          message="Error Loading Graph"
          description={formError}
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
              Edit Workflow: {initialGraphName || graphId}
            </Title>
            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(`/langgraph/view/${graphId}`)}>
                Back to View
            </Button>          </div>
        }
        variant="borderless"
      >
        <Paragraph type="secondary">
          Modify the LangGraph workflow definition in JSON format.
          The ID, creation date, and version are managed by the system.
        </Paragraph>

        {/* Ant Design Form is used for layout and button, not for direct field control of Monaco */}
        <Form layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            label="Graph Definition (JSON)"
            help={formError || (error && `API Error: ${error}`)} // Display general API errors or JSON parse errors
            validateStatus={formError || error ? 'error' : ''}
            required
            style={{ marginBottom: '16px' }} // Add some bottom margin
          >
            {/* Monaco Editor Integration */}
            <div style={{ border: '1px solid #d9d9d9', borderRadius: '2px', height: '60vh', minHeight: '400px' }}>
              {isFetching && graphJson === '' ? ( // Show placeholder or spinner while fetching
                 <div className="flex justify-center items-center h-full">
                    <Spin tip="Loading definition..." />
                 </div>
              ) : (
                <Editor
                  height="100%" // Use 100% of the div's height
                  language="json"
                  value={graphJson}
                  onChange={handleEditorChange}
                  onMount={handleEditorDidMount}
                  theme="vs-dark" // Or "light"
                  options={{
                    selectOnLineNumbers: true,
                    minimap: { enabled: true },
                    automaticLayout: true, // Important for responsiveness
                    wordWrap: "on", // Enable word wrapping
                  }}
                />
              )}
            </div>
          </Form.Item>

          <Row justify="end">
            <Col>
              <Button
                type="primary"
                htmlType="submit"
                icon={<SaveOutlined />}
                loading={isLoading} 
                disabled={!graphJson.trim() || isFetching || !!formError} // Disable if JSON is empty, fetching, or has parse error
              >
                Save Changes
              </Button>
            </Col>
          </Row>
        </Form>
      </Card>
    </div>
  );
};

export default LangGraphEditPage;