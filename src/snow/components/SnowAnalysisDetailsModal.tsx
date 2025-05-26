// src/snow/components/SnowAnalysisDetailsModal.tsx
import React from 'react';
import { Modal, Descriptions, Tabs, Typography, Card } from 'antd';
import { SnowHistoryItemFE } from '../types/snow.types';
import SnowAnalysisResultDisplay from './SnowAnalysisResultDisplay'; // Reuse existing component
import { formatDate } from '../../utils/dateFormat';

const { TabPane } = Tabs;
const { Paragraph } = Typography;

interface SnowAnalysisDetailsModalProps {
  item: SnowHistoryItemFE | null;
  isOpen: boolean;
  onClose: () => void;
}

const SnowAnalysisDetailsModal: React.FC<SnowAnalysisDetailsModalProps> = ({ item, isOpen, onClose }) => {
  if (!item) return null;

  return (
    <Modal
      title={`Analysis Details - ${item.id.substring(0,8)}...`}
      open={isOpen}
      onCancel={onClose}
      footer={null} // No OK/Cancel buttons, just close
      width="70vw" // Wider modal
      destroyOnClose
      className="snow-analysis-details-modal"
      styles={{ body: { maxHeight: '75vh', overflowY: 'auto' } }}
    >
      <Tabs defaultActiveKey="1">
        <TabPane tab="Analysis Result" key="1">
          <SnowAnalysisResultDisplay result={item.analysis} />
        </TabPane>
        <TabPane tab="Ticket & LLM Data" key="2">
          <Descriptions bordered column={1} size="small" className="mb-6">
            <Descriptions.Item label="Analysis ID">{item.id}</Descriptions.Item>
            <Descriptions.Item label="Created At">
              {formatDate(item.created_at).fullText}
            </Descriptions.Item>
          </Descriptions>

          <Card title="Ticket Subset Sent to LLM" size="small" className="mb-6">
            <Paragraph
             ellipsis={{ rows: 10, expandable: true, symbol: 'more' }}
             className="text-xs bg-gray-100 p-2 rounded font-mono"
            >
              <pre>{JSON.stringify(item.ticket_subset, null, 2)}</pre>
            </Paragraph>
          </Card>

          <Card title="LLM Prompt" size="small" className="mb-6">
            <Paragraph
              ellipsis={{ rows: 15, expandable: true, symbol: 'more' }}
              className="text-xs bg-gray-100 p-2 rounded font-mono"
            >
               <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{item.llm_prompt}</pre>
            </Paragraph>
          </Card>

          <Card title="Raw LLM Response" size="small">
             <Paragraph
                ellipsis={{ rows: 15, expandable: true, symbol: 'more' }}
                className="text-xs bg-gray-100 p-2 rounded font-mono"
             >
                <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{item.llm_response_raw}</pre>
             </Paragraph>
          </Card>
        </TabPane>
      </Tabs>
    </Modal>
  );
};

export default SnowAnalysisDetailsModal;