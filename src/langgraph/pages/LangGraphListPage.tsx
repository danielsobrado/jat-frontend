// src/langgraph/pages/LangGraphListPage.tsx
import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext'; // Adjust path as needed
import { useLangGraphDefinitions } from '../hooks/useLangGraphDefinitions';
import { Button, List, Card, Typography, Spin, Alert, Tag, Empty, Tooltip, Switch } from 'antd';
import { PlusOutlined, EyeOutlined, EditOutlined, DeleteOutlined, ShareAltOutlined } from '@ant-design/icons';
import { formatDate } from '../../utils/dateFormat'; // Your existing date formatter

const { Title, Text, Paragraph } = Typography;

const LangGraphListPage: React.FC = () => {
  const { apiClient, checkPermission } = useAuth(); // Get apiClient and permission checker
  const {
    graphDefinitions,
    isLoading,
    error,
    fetchGraphDefinitions,
    deleteGraphDefinition,
  } = useLangGraphDefinitions(apiClient, '/v1/lg-vis'); // Pass the apiClient and explicitly set the prefix
  const navigate = useNavigate();
  const [includeStatic, setIncludeStatic] = useState<boolean>(true);

  useEffect(() => {
    // Fetch definitions (including static ones if you want them listed here)
    // Set includeStatic to true if your listGraphDefinitions API and hook support it.
    fetchGraphDefinitions(includeStatic);
    
    // Clean up any pending requests
    return () => {
      // Any cleanup code if needed
    };
  }, [fetchGraphDefinitions, includeStatic]); // Add includeStatic as a dependency

  const handleDelete = async (graphId: string, graphName: string) => {
    if (!checkPermission('langgraph:delete')) { // Example permission
      alert('Permission denied to delete graph definitions.');
      return;
    }
    if (window.confirm(`Are you sure you want to delete the graph "${graphName}" (ID: ${graphId})? This action cannot be undone.`)) {
      const success = await deleteGraphDefinition(graphId);
      if (success) {
        // The list should refresh automatically due to the hook's logic
        alert(`Graph "${graphName}" deleted successfully.`);
      } else {
        // Error is handled by the hook and displayed
        alert(`Failed to delete graph "${graphName}".`);
      }
    }
  };

  const handleCreateNew = () => {
     if (!checkPermission('langgraph:create')) { // Example permission
       alert('Permission denied to create graph definitions.');
       return;
     }
    // Navigate to a create page or open a modal
    navigate('/langgraph/create'); // Assuming you have a LangGraphCreatePage
  };

  if (isLoading && graphDefinitions.length === 0) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 'calc(100vh - 150px)' }}>
        <Spin size="large">
          Loading graph definitions...
        </Spin>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '20px' }}>
        <Alert message="Error Loading Graph Definitions" description={error} type="error" showIcon />
        <Button onClick={() => fetchGraphDefinitions(true)} style={{ marginTop: '16px' }}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="page-container" style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <Card
        title={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Title level={2} style={{ margin: 0 }}>
              <ShareAltOutlined style={{ marginRight: '12px' }} />
              Agentic Workflows (Graphs)
            </Title>
            {checkPermission('langgraph:create') && (
              <Button type="primary" icon={<PlusOutlined />} onClick={handleCreateNew}>
                Create New Graph
              </Button>
            )}
          </div>
        }
        variant="outlined" // Changed from bordered={false}
      >        <Paragraph type="secondary">
          Manage and explore your automated agentic workflows powered by LangGraph.
          Each graph represents a sequence of operations that can be executed and visualized.
        </Paragraph>

        <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center' }}>
          <Switch 
            checked={includeStatic} 
            onChange={(checked) => setIncludeStatic(checked)} 
            style={{ marginRight: 8 }}
          />
          <Text type="secondary">Include Static Graphs</Text>
          {isLoading && <Spin size="small" style={{ marginLeft: 16 }} />}
        </div>

        {graphDefinitions.length === 0 && !isLoading ? (
          <Empty description="No graph definitions found. Create one to get started!" style={{marginTop: '40px'}}>
            {checkPermission('langgraph:create') && (
                <Button type="primary" icon={<PlusOutlined />} onClick={handleCreateNew}>
                    Create Your First Graph
                </Button>
            )}
          </Empty>
        ) : (
          <List
            itemLayout="horizontal"
            dataSource={graphDefinitions}
            loading={isLoading} // Show loading indicator on list if fetching in background
            renderItem={(item) => {
              const isStatic = item.id.startsWith('static_');
              return (
                <List.Item
                  actions={[
                    <Tooltip title="View/Execute Graph" key="view">
                      <Link to={`/langgraph/view/${item.id}`}>
                        <Button icon={<EyeOutlined />} type="text" shape="circle" />
                      </Link>
                    </Tooltip>,
                    ...(checkPermission('langgraph:edit') && !isStatic ? [ // Assuming edit for non-static graphs
                      <Tooltip title="Edit Graph Definition" key="edit">
                         {/* Link to an edit page or open an edit modal */}
                         <Link to={`/langgraph/edit/${item.id}`}>
                            <Button icon={<EditOutlined />} type="text" shape="circle" />
                         </Link>
                      </Tooltip>
                    ] : []),
                    ...(checkPermission('langgraph:delete') && !isStatic ? [ // Prevent deleting static graphs via UI
                      <Tooltip title="Delete Graph" key="delete">
                        <Button
                          icon={<DeleteOutlined />}
                          type="text"
                          danger
                          shape="circle"
                          onClick={() => handleDelete(item.id, item.name)}
                        />
                      </Tooltip>
                    ] : []),
                  ]}
                >
                  <List.Item.Meta
                    avatar={<ShareAltOutlined style={{ fontSize: '24px', color: isStatic ? '#1677ff' : '#52c41a' }} />}
                    title={<Link to={`/langgraph/view/${item.id}`} style={{ fontSize: '1.1em' }}>{item.name}</Link>}
                    description={
                      <>
                        <Text type="secondary" style={{ display: 'block' }}>ID: <Text copyable code style={{fontSize: '0.8em'}}>{item.id}</Text></Text>
                        {item.updatedAt && (
                          <Text type="secondary" style={{ display: 'block' }}>
                            Last Updated: {formatDate(item.updatedAt).displayText}
                          </Text>
                        )}
                        {isStatic && <Tag color="geekblue" style={{marginTop: '4px'}}>Static Definition</Tag>}
                      </>
                    }
                  />
                </List.Item>
              );
            }}
            pagination={false} // Add pagination if list becomes very long
            // pagination={{
            //   pageSize: 10, // Or make it configurable
            //   total: graphDefinitions.length, // Hook doesn't provide total for this simple list yet
            //   showSizeChanger: true,
            // }}
          />
        )}
      </Card>
    </div>
  );
};

export default LangGraphListPage;