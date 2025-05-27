// src/snow/components/SnowHistoryFilters.tsx
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Input, DatePicker, Button, Row, Col, Form } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { SnowHistoryFiltersState } from '../types/snow.types';
import dayjs, { Dayjs } from 'dayjs';
import _ from 'lodash'; // Import lodash for debounce

const { RangePicker } = DatePicker;

interface SnowHistoryFiltersProps {
  onFilter: (filters: SnowHistoryFiltersState) => void;
  loading: boolean;
  initialFilters: SnowHistoryFiltersState; // Prop to initialize form fields from the parent hook
}

// Define the debounce delay locally or import from a constants file
const DEBOUNCE_DELAY_MS = 300; 

const SnowHistoryFilters: React.FC<SnowHistoryFiltersProps> = ({ onFilter, loading, initialFilters }) => {
  const [form] = Form.useForm();
  
  // Internal state for debounced values. These mirror the form fields.
  const [internalSearch, setInternalSearch] = useState(initialFilters.search);
  const [internalDateRange, setInternalDateRange] = useState<[Dayjs | null, Dayjs | null] | null>(
    initialFilters.startDate && initialFilters.endDate
      ? [dayjs(initialFilters.startDate), dayjs(initialFilters.endDate)]
      : null
  );

  // Ref to track if it's the initial mount to prevent immediate filter application
  const isInitialMountRef = useRef(true);

  // Effect to sync internal state and form fields when `initialFilters` prop changes.
  // This ensures the form reflects the latest state from the `useSnowHistory` hook
  // (e.g., when the parent resets filters).
  useEffect(() => {
    setInternalSearch(initialFilters.search);
    setInternalDateRange(
      initialFilters.startDate && initialFilters.endDate
        ? [dayjs(initialFilters.startDate), dayjs(initialFilters.endDate)]
        : null
    );
    form.setFieldsValue({
      search: initialFilters.search,
      dateRange: initialFilters.startDate && initialFilters.endDate
        ? [dayjs(initialFilters.startDate), dayjs(initialFilters.endDate)]
        : null,
    });
    // Set ref to false *after* the initial sync on mount
    if (isInitialMountRef.current) {
        isInitialMountRef.current = false;
    }
  }, [initialFilters, form]);

  // Debounced function to call the `onFilter` prop.
  // This function is memoized and will only be called after a delay.
  const debouncedApplyFilters = useCallback(
    _.debounce((search: string, dateRange: [Dayjs | null, Dayjs | null] | null) => {
      // Prevent applying filters on the very first render after internal state is set
      // (This only triggers if initialFilters are set after component mounts)
      if (isInitialMountRef.current) {
        return;
      }
      onFilter({
        search: search,
        startDate: dateRange?.[0] ? dateRange[0].format('YYYY-MM-DD') : null,
        endDate: dateRange?.[1] ? dateRange[1].format('YYYY-MM-DD') : null,
      });
    }, DEBOUNCE_DELAY_MS),
    [onFilter] // Only depends on the `onFilter` prop
  );

  // Effect to trigger debounced filter application when internal state (`internalSearch`, `internalDateRange`) changes.
  useEffect(() => {
    debouncedApplyFilters(internalSearch, internalDateRange);

    // Cleanup function for debounce on component unmount
    return () => debouncedApplyFilters.cancel();
  }, [internalSearch, internalDateRange, debouncedApplyFilters]); // Dependencies are internal states and the debounced function

  // Handlers for input changes, updating internal state which then triggers the debounce.
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInternalSearch(e.target.value);
  };

  const handleDateRangeChange = (dates: [Dayjs | null, Dayjs | null] | null) => {
    setInternalDateRange(dates);
  };

  // Handler for the explicit "Reset Filters" button
  const handleReset = () => {
    form.resetFields(); // Clear all fields in the Ant Design form
    setInternalSearch(''); // Reset internal search state
    setInternalDateRange(null); // Reset internal date range state
    onFilter({ search: '', startDate: null, endDate: null }); // Immediately apply reset via prop
  };

  return (
    <Form form={form} layout="vertical" className="snow-history-filters mb-6">
      <Row gutter={16}>
        <Col xs={24} sm={12} md={10}>
          <Form.Item name="search" label="Search Summary / Description">
            <Input
              placeholder="Enter search term..."
              prefix={<SearchOutlined />}
              allowClear
              disabled={loading}
              onChange={handleSearchChange} // Directly update internal state
            />
          </Form.Item>
        </Col>
        <Col xs={24} sm={12} md={10}>
          <Form.Item name="dateRange" label="Date Range">
            <RangePicker
              style={{ width: '100%' }}
              disabled={loading}
              onChange={handleDateRangeChange} // Directly update internal state
            />
          </Form.Item>
        </Col>
        <Col xs={24} md={4} className="flex items-end">
          <Form.Item className="w-full">
            {/* Only a "Reset Filters" button */}
            <Button onClick={handleReset} disabled={loading} block>
              Reset Filters
            </Button>
          </Form.Item>
        </Col>
      </Row>
    </Form>
  );
};

export default SnowHistoryFilters;