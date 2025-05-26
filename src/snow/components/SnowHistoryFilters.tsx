// src/snow/components/SnowHistoryFilters.tsx
import React, { useState } from 'react';
import { Input, DatePicker, Button, Row, Col, Form, Space } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { SnowHistoryFiltersState } from '../types/snow.types';
import dayjs from 'dayjs'; // Import dayjs

const { RangePicker } = DatePicker;

interface SnowHistoryFiltersProps {
  onFilter: (filters: SnowHistoryFiltersState) => void;
  loading: boolean;
}

const SnowHistoryFilters: React.FC<SnowHistoryFiltersProps> = ({ onFilter, loading }) => {
  const [form] = Form.useForm();

  const handleFinish = (values: any) => {
    onFilter({
      search: values.search || '',
      startDate: values.dateRange?.[0] ? values.dateRange[0].format('YYYY-MM-DD') : null,
      endDate: values.dateRange?.[1] ? values.dateRange[1].format('YYYY-MM-DD') : null,
    });
  };

  const handleReset = () => {
    form.resetFields();
    onFilter({ search: '', startDate: null, endDate: null });
  };

  return (
    <Form form={form} onFinish={handleFinish} layout="vertical" className="snow-history-filters mb-6">
      <Row gutter={16}>
        <Col xs={24} sm={12} md={10}>
          <Form.Item name="search" label="Search Summary / Description">
            <Input
              placeholder="Enter search term..."
              prefix={<SearchOutlined />}
              allowClear
              disabled={loading}
            />
          </Form.Item>
        </Col>
        <Col xs={24} sm={12} md={10}>
          <Form.Item name="dateRange" label="Date Range">
            <RangePicker
              style={{ width: '100%' }}
              disabled={loading}
              // Default to last 7 days and today
              defaultValue={[dayjs().subtract(7, 'days'), dayjs()]}
            />
          </Form.Item>
        </Col>
        <Col xs={24} md={4} className="flex items-end">
          <Form.Item className="w-full">
            <Space className="w-full" direction="vertical" style={{ width: '100%'}}>
                 <Button type="primary" htmlType="submit" loading={loading} block>
                   Apply Filters
                 </Button>
                 <Button onClick={handleReset} disabled={loading} block>
                   Reset
                 </Button>
            </Space>
          </Form.Item>
        </Col>
      </Row>
    </Form>
  );
};

export default SnowHistoryFilters;