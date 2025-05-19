// src/pages/ChatPage.tsx
import React from 'react';
import { useChat, Message as VercelMessage } from '@ai-sdk/react';
import { Input, Button, List, Avatar, Alert, Form } from 'antd';
import { UserOutlined, RobotOutlined, SendOutlined } from '@ant-design/icons';
import { API_ENDPOINTS, formatEndpoint } from '../config/api'; // To construct the API path
import { useAuth } from '../context/AuthContext'; // To get user info for display

import './ChatPage.css'; // We'll create this file for custom styles

const ChatPage: React.FC = () => {
  const { user } = useAuth(); // Get current user for avatar or display name
  const { messages, input, handleInputChange, handleSubmit, isLoading, error } = useChat({
    api: formatEndpoint(API_ENDPOINTS.chat.completions), // Your Go backend endpoint
    onError: (err) => {
      // Handle API errors (e.g., display a toast message)
      console.error("Chat API error:", err);
    },
  });

  const onFormSubmit = () => {
    handleSubmit({ preventDefault: () => {} } as React.FormEvent<HTMLFormElement>);
  };

  // Scroll to bottom of message list when new messages are added
  const messagesEndRef = React.useRef<HTMLDivElement | null>(null);
  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="page-container chat-page-container">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-secondary-900">AI Chat</h1>
        <p className="text-secondary-600">
          Chat with the AI assistant for to discusss your classification tasks.
        </p>
      </div>

      {error && (
        <Alert
          message="Chat Error"
          description={error.message || 'An unexpected error occurred.'}
          type="error"
          showIcon
          closable
          className="mb-4"
        />
      )}

      <div className="chat-messages-list">
        <List
          itemLayout="horizontal"
          dataSource={messages}
          renderItem={(message: VercelMessage, index: number) => (
            <List.Item
              key={message.id || `msg-${index}`}
              className={message.role === 'user' ? 'chat-message user' : 'chat-message assistant'}
            >
              <List.Item.Meta
                avatar={
                  message.role === 'user' ? (
                    <Avatar icon={<UserOutlined />} />
                  ) : (
                    <Avatar icon={<RobotOutlined />} style={{ backgroundColor: '#1890ff' }} />
                  )
                }
                title={
                  message.role === 'user'
                    ? (user?.username || 'You')
                    : 'AI Assistant'
                }
                description={
                  <div className="message-content">
                    {message.content.split('\n').map((line, i) => (
                      <React.Fragment key={i}>
                        {line}
                        {i < message.content.split('\n').length - 1 && <br />}
                      </React.Fragment>
                    ))}
                  </div>
                }
              />
            </List.Item>
          )}
        />
        {isLoading && messages.length > 0 && messages[messages.length -1].role === 'user' && (
          <div className="chat-message assistant loading-dots-container">
             <Avatar icon={<RobotOutlined />} style={{ backgroundColor: '#1890ff' }} />
             <div className="loading-dots">
                <span></span><span></span><span></span>
             </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <Form onFinish={onFormSubmit} className="chat-input-form">
        <Input.Group compact style={{ display: 'flex' }}>
          <Input.TextArea
            value={input}
            onChange={handleInputChange}
            placeholder="Type your message..."
            disabled={isLoading}
            onPressEnter={(e) => {
              if (!e.shiftKey && !isLoading && input.trim()) {
                e.preventDefault();
                onFormSubmit();
              }
            }}
            autoSize={{ minRows: 1, maxRows: 5 }}
            style={{ flexGrow: 1, marginRight: 8 }}
          />
          <Button
            type="primary"
            htmlType="submit"
            icon={<SendOutlined />}
            loading={isLoading}
            disabled={!input.trim()}
          >
            Send
          </Button>
        </Input.Group>
      </Form>
    </div>
  );
};

export default ChatPage;