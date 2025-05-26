// src/snow/components/SnowAnalysisResultDisplay.tsx
import React from 'react';
import { Card, Descriptions, List, Tag, Typography, Progress, Row, Col } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined, BulbOutlined, WarningOutlined } from '@ant-design/icons';
import { SnowAnalysisResultFE, SnowValidationStatus } from '../types/snow.types';

const { Title, Paragraph, Text } = Typography;

interface SnowAnalysisResultDisplayProps {
  result: SnowAnalysisResultFE;
}

const SnowAnalysisResultDisplay: React.FC<SnowAnalysisResultDisplayProps> = ({ result }) => {
  const getScoreColor = (score: number) => {
    if (score >= 8) return 'success';
    if (score >= 5) return 'warning';
    return 'error';
  };
  // Using the SnowValidationStatus type for type checking
  const validationTag = (result.validation_result as SnowValidationStatus) === 'pass' ? (
    <Tag icon={<CheckCircleOutlined />} color="success">Pass</Tag>
  ) : (
    <Tag icon={<CloseCircleOutlined />} color="error">Fail</Tag>
  );

  return (
    <Card className="snow-analysis-result-display" bordered={false}>
      <Row gutter={[16, 24]}>
        <Col xs={24} md={12} lg={8}>
          <Card title="Overall Assessment" size="small">
            <Descriptions column={1} bordered size="small">
              <Descriptions.Item label="Validation Result">{validationTag}</Descriptions.Item>
              <Descriptions.Item label="Quality Score">
                <Progress
                  percent={result.quality_score * 10}
                  steps={10}
                  strokeColor={getScoreColor(result.quality_score) === 'success' ? '#52c41a' : getScoreColor(result.quality_score) === 'warning' ? '#faad14' : '#f5222d'}
                  format={() => `${result.quality_score}/10`}
                />
              </Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>

        <Col xs={24} md={12} lg={16}>
          <Card title={<><BulbOutlined /> Summary & Suggestions</>} size="small">
            <Paragraph strong>Summary:</Paragraph>
            <Paragraph>{result.summary}</Paragraph>

            {result.missing_elements.length > 0 && (
              <>
                <Paragraph strong className="mt-4">Missing Elements:</Paragraph>
                <List
                  size="small"
                  dataSource={result.missing_elements}
                  renderItem={(item) => <List.Item><WarningOutlined className="mr-2 text-red-500" />{item}</List.Item>}
                  bordered
                  className="bg-red-50"
                />
              </>
            )}

            {result.improvement_suggestions.length > 0 && (
              <>
                <Paragraph strong className="mt-4">Improvement Suggestions:</Paragraph>
                <List
                  size="small"
                  dataSource={result.improvement_suggestions}
                  renderItem={(item) => <List.Item><BulbOutlined className="mr-2 text-blue-500" />{item}</List.Item>}
                  bordered
                  className="bg-blue-50"
                />
              </>
            )}
          </Card>
        </Col>
      </Row>

      <Title level={4} className="mt-8 mb-4">Detailed Feedback</Title>
      <Row gutter={[16, 16]}>
        {Object.entries(result.feedback).map(([criterion, feedbackItem]) => (
          <Col xs={24} sm={12} lg={8} key={criterion}>
            <Card
              title={<Text strong className="capitalize">{criterion.replace(/_/g, ' ')}</Text>}
              size="small"
              extra={<Tag color={getScoreColor(feedbackItem.score)}>{feedbackItem.score}/10</Tag>}
              className="h-full"
            >
              <Paragraph type="secondary" className="text-sm">{feedbackItem.feedback}</Paragraph>
            </Card>
          </Col>
        ))}
      </Row>
    </Card>
  );
};

export default SnowAnalysisResultDisplay;