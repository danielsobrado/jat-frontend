import React, { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, message, Space } from 'antd';
import { useAuth } from '../../context/AuthContext';
import { EditOutlined, DeleteOutlined, EyeOutlined, PlusOutlined } from '@ant-design/icons';
import { 
  ApiClient, 
  CreateRagInfoRequest,
  UpdateRagInfoRequest,
  RagInfoRequestParams
} from '../../api/types';

// Define the types needed for RAG functionality
export interface RagInfoComponentProps {
  apiClient: ApiClient;
}

// Updated RagInfoData interface to match API types while adding UI-specific fields
interface RagInfoData {
  id: string;
  key: string; 
  description: string;
  createdAt: string;
  updatedAt: string;
}

interface RagFormData {
  key: string;
  description: string;
}

export const RagInfoComponent: React.FC<RagInfoComponentProps> = ({ apiClient }) => {
  // Get permission checker from auth context
  const { checkPermission } = useAuth();
  
  // Component state
  const [ragInfoItems, setRagInfoItems] = useState<RagInfoData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<RagInfoData | null>(null);
  const [form] = Form.useForm();
  
  // Load RAG info items when component mounts
  useEffect(() => {
    loadRagInfo();
  }, []);
  
  const loadRagInfo = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Use the correct API method for listing all items
      const params: RagInfoRequestParams = { limit: 100 };
      const response = await apiClient.getRagInfoList(params);
      
      // Map the API response directly to our component's data structure
      const transformedItems = response.items.map(item => ({
        ...item
      }));
      
      setRagInfoItems(transformedItems || []);
    } catch (err) {
      console.error('Failed to load RAG information:', err);
      setError('Failed to load information items');
    } finally {
      setLoading(false);
    }
  };
  
  const handleCreateInfo = async (data: RagFormData) => {
    // Check if user has permission to create RAG info
    if (!checkPermission('rag:create')) {
      setError('You do not have permission to create RAG information');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const request: CreateRagInfoRequest = {
        key: data.key,
        description: data.description
      };
      
      await apiClient.createRagInfo(request);
      message.success('RAG information created successfully');
      setShowCreateModal(false);
      form.resetFields();
      loadRagInfo(); // Refresh the list
    } catch (err) {
      console.error('Failed to create RAG information:', err);
      setError('Failed to create information item');
    } finally {
      setLoading(false);
    }
  };
  
  const handleUpdateInfo = async (data: RagFormData) => {
    // Check if user has permission to update RAG info
    if (!checkPermission('rag:update')) {
      setError('You do not have permission to update RAG information');
      return;
    }
    
    if (!selectedItem) {
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const request: UpdateRagInfoRequest = {
        key: data.key,
        description: data.description
      };
      
      await apiClient.updateRagInfo(selectedItem.id, request);
      message.success('RAG information updated successfully');
      setShowEditModal(false);
      form.resetFields();
      loadRagInfo(); // Refresh the list
    } catch (err) {
      console.error('Failed to update RAG information:', err);
      setError('Failed to update information item');
    } finally {
      setLoading(false);
    }
  };
  
  const handleDeleteInfo = async (id: string) => {
    // Check if user has permission to delete RAG info
    if (!checkPermission('rag:delete')) {
      setError('You do not have permission to delete RAG information');
      return;
    }
    
    setLoading(true);
    
    try {
      await apiClient.deleteRagInfo(id);
      message.success('RAG information deleted successfully');
      loadRagInfo(); // Refresh the list
    } catch (err) {
      console.error('Failed to delete RAG information:', err);
      setError('Failed to delete information item');
    } finally {
      setLoading(false);
    }
  };
  
  const showDeleteConfirm = (id: string) => {
    Modal.confirm({
      title: 'Are you sure you want to delete this item?',
      content: 'This action cannot be undone.',
      okText: 'Yes',
      okType: 'danger',
      cancelText: 'No',
      onOk() {
        handleDeleteInfo(id);
      },
    });
  };
  
  const openCreateModal = () => {
    form.resetFields();
    setShowCreateModal(true);
  };
  
  const openEditModal = (item: RagInfoData) => {
    setSelectedItem(item);
    form.setFieldsValue({
      key: item.key,
      description: item.description
    });
    setShowEditModal(true);
  };
  
  const openViewModal = (item: RagInfoData) => {
    setSelectedItem(item);
    setShowViewModal(true);
  };
  
  const columns = [
    {
      title: 'Key',
      dataIndex: 'key',
      key: 'key',
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: 'Created At',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (text: string) => new Date(text).toLocaleString(),
    },
    {
      title: 'Updated At',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      render: (text: string) => new Date(text).toLocaleString(),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: RagInfoData) => (
        <Space size="small">
          <Button 
            type="text" 
            icon={<EyeOutlined />} 
            onClick={() => openViewModal(record)}
          />
          {checkPermission('rag:update') && (
            <Button 
              type="text" 
              icon={<EditOutlined />} 
              onClick={() => openEditModal(record)}
            />
          )}
          {checkPermission('rag:delete') && (
            <Button 
              type="text" 
              danger 
              icon={<DeleteOutlined />} 
              onClick={() => showDeleteConfirm(record.id)}
            />
          )}
        </Space>
      ),
    },
  ];
  
  return (
    <div className="rag-info-container">
      {error && <div className="error-message">{error}</div>}
      
      <div className="actions-container" style={{ marginBottom: '16px' }}>
        {checkPermission('rag:create') && (
          <Button 
            type="primary" 
            icon={<PlusOutlined />}
            onClick={openCreateModal}
          >
            Add New Information
          </Button>
        )}
      </div>
      
      <Table
        dataSource={ragInfoItems}
        columns={columns}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 10 }}
      />
      
      {/* Create Modal */}
      <Modal
        title="Add New RAG Information"
        open={showCreateModal}
        onCancel={() => setShowCreateModal(false)}
        footer={null}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleCreateInfo}
        >
          <Form.Item
            name="key"
            label="Key"
            rules={[{ required: true, message: 'Please enter a key' }]}
          >
            <Input />
          </Form.Item>
          
          <Form.Item
            name="description"
            label="Description"
            rules={[{ required: true, message: 'Please enter a description' }]}
          >
            <Input.TextArea rows={6} />
          </Form.Item>
          
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} style={{ marginRight: 8 }}>
              Create
            </Button>
            <Button onClick={() => setShowCreateModal(false)}>
              Cancel
            </Button>
          </Form.Item>
        </Form>
      </Modal>
      
      {/* Edit Modal */}
      <Modal
        title="Edit RAG Information"
        open={showEditModal}
        onCancel={() => setShowEditModal(false)}
        footer={null}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleUpdateInfo}
        >
          <Form.Item
            name="key"
            label="Key"
            rules={[{ required: true, message: 'Please enter a key' }]}
          >
            <Input />
          </Form.Item>
          
          <Form.Item
            name="description"
            label="Description"
            rules={[{ required: true, message: 'Please enter a description' }]}
          >
            <Input.TextArea rows={6} />
          </Form.Item>
          
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} style={{ marginRight: 8 }}>
              Update
            </Button>
            <Button onClick={() => setShowEditModal(false)}>
              Cancel
            </Button>
          </Form.Item>
        </Form>
      </Modal>
      
      {/* View Modal */}
      <Modal
        title="RAG Information Details"
        open={showViewModal}
        onCancel={() => setShowViewModal(false)}
        footer={[
          <Button key="close" onClick={() => setShowViewModal(false)}>
            Close
          </Button>
        ]}
      >
        {selectedItem && (
          <>
            <p><strong>Key:</strong> {selectedItem.key}</p>
            <p><strong>Description:</strong></p>
            <pre style={{ 
              whiteSpace: 'pre-wrap', 
              backgroundColor: '#f5f5f5', 
              padding: '10px', 
              borderRadius: '4px',
              maxHeight: '300px',
              overflow: 'auto'
            }}>
              {selectedItem.description}
            </pre>
            <p><strong>Created:</strong> {new Date(selectedItem.createdAt).toLocaleString()}</p>
            <p><strong>Last Updated:</strong> {new Date(selectedItem.updatedAt).toLocaleString()}</p>
          </>
        )}
      </Modal>
    </div>
  );
};

export default RagInfoComponent;