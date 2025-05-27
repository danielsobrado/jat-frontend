import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Form, Input, Button, Alert, Row, Col, Select, Typography, Popover, Tooltip } from 'antd';
import { InfoCircleOutlined, CloseCircleOutlined } from '@ant-design/icons'; // No longer need SyncOutlined for real-time sync
import { SnowAnalyzeRequestFE } from '../types/snow.types';
import _ from 'lodash'; // Using lodash for deep cloning and debounce

const { TextArea } = Input;
const { Option } = Select;
const { Text } = Typography;

interface SnowAnalyzeFormProps {
  onSubmit: (ticketData: SnowAnalyzeRequestFE) => void;
  loading: boolean;
  disabled?: boolean;
}

// --- Constants for Ticket Types and Fields ---

type TicketType = 'incident' | 'universal_request';

// Define the core set of fields that are typically relevant for the LLM
// Based on internal/services/analyzer_service.go -> extractRelevantFields
const CORE_SNOW_FIELDS: string[] = [
  "number", "sys_id", "state", "priority", "impact", "urgency",
  "short_description", "description",
  "assignment_group", "service_offering", "cmdb_ci", "category", "subcategory",
  "opened_at", "opened_by", "caller_id",
  "contact_type", "close_code", "close_notes"
];

// Example data for different ticket types
// Note: The backend expects a single ticket object, not a "records" array.
// The `extractPrimaryTicket` helper below handles this if the input has a "records" key.
const EXAMPLE_TICKET_DATA: Record<TicketType, Record<string, any>> = {
  universal_request: {
    "number": "UR0114676",
    "short_description": "P3 | OPEN APPLICATION P-25032006 [Problem]:[Container restarts] [Severity]:[ERROR]",
    "description": "OPEN Problem P-25032006 in environment TAMM Staging\nProblem detected at: 17:06 (EDT) 30.03.2025\n\n1 impacted application\n\nKubernetes workload\ntamm-svc-nexus-backend\n\nContainer restarts\nObserved container restarts exceed the specified threshold.\nSource: Kubernetes anomaly detection\ndt.entity.cloud_application_namespace: CLOUD_APPLICATION_NAMESPACE-F1FB6D0B1AC6C3E3\ndt.entity.kubernetes_cluster: KUBERNETES_CLUSTER-3A366C89FFCE7B84\nk8s.cluster.name: tamm-svc\nk8s.cluster.uid: 24536e39-4381-4c58-b893-4317243306a8\nk8s.namespace.name: tamm-svc-internal-stg\n\nRoot cause\n\nBased on our dependency analysis all incidents are part of the same overall problem.\n\nhttps:\/\/dmm-srv-stg.tamm.abudhabi\/e\/39e893a9-c325-499f-b61b-856ba82a4865\/#problems\/problemdetails;pid=-3911365896398794816_1743368760000V2",
    "opened_by": "3ed272c89decd25087cf3827c448e228",
    "opened_at": "2025-03-30 21:21:28",
    "state": "7",
    "priority": "3",
    "impact": "2",
    "urgency": "2",
    "assignment_group": "1e1cfbb29f4cde9c416bf275ae24ab4d",
    "service_offering": "0d4a192b7d19929087cfc5c6d3fd1e39",
    "cmdb_ci": "example_ci_for_ur",
    "contact_type": "web",
    "close_notes": "Incident is Closed",
    "close_code": "Resolved by workaround",
    "category": "Software",
    "subcategory": "Application Issue"
  },
  incident: {
    "number": "INC0440897",
    "short_description": "P3 | OPEN APPLICATION P-2504280 [Problem]:[Out-of-memory kills] [Severity]:[ERROR]",
    "description": "OPEN Problem P-2504280 in environment TAMM Staging\nProblem detected at: 15:48 (EDT) 06.04.2025\n\n1 impacted application\n\nKubernetes workload\ntamm-svc-payment-hub-backend\n\nOut-of-memory kills\nOut-of-memory kills have been observed for pods of this workload.\nSource: Kubernetes anomaly detection\ndt.entity.cloud_application_namespace: CLOUD_APPLICATION_NAMESPACE-F1FB6D0B1AC6C3E3\ndt.entity.kubernetes_cluster: KUBERNETES_CLUSTER-3A366C89FFCE7B84\nk8s.cluster.name: tamm-svc\nk8s.cluster.uid: 24536e39-4381-4c58-b893-4317243306a8\nk8s.namespace.name: tamm-svc-internal-stg\n\nRoot cause\n\nBased on our dependency analysis all incidents are part of the same overall problem.\n\nhttps:\/\/dmm-srv-stg.tamm.abudhabi\/e\/39e893a9-c325-499f-b61b-856ba82a4865\/#problems\/problemdetails;pid=2801568736737721973_1743968880000V2",
    "opened_by": "3ed272c89decd25087cf3827c448e228",
    "opened_at": "2025-04-06 20:03:36",
    "state": "6",
    "priority": "3",
    "impact": "2",
    "urgency": "2",
    "assignment_group": "1e1cfbb29f4cde9c416bf275ae24ab4d",
    "service_offering": "0d4a192b7d19929087cfc5c6d3fd1e39",
    "cmdb_ci": "example_ci_for_incident",
    "contact_type": "alert",
    "close_notes": "Dynatrace detected recovery",
    "close_code": "Resolved – Fixed Without Action",
    "category": "Network",
    "subcategory": "Connectivity"
  }
};

// Helper to extract the primary ticket object from various ServiceNow API response formats.
// The backend `AnalyzeTicket` endpoint expects a single ticket object directly,
// not an object with a "records" array. This helper handles parsing JSON that
// might come in a "records" wrapper.
function extractPrimaryTicket(data: any): Record<string, any> | null {
  if (!data) return null;
  // If 'records' array exists and is not empty, use the first record
  if (Array.isArray(data.records) && data.records.length > 0) {
    return data.records[0];
  }
  // Otherwise, assume the top-level object is the ticket
  if (typeof data === 'object' && data !== null) {
    return data;
  }
  return null;
}

// Function to safely get a value from a potentially complex object given a dot-separated path.
// Necessary because Ant Design's Form.Item `name` prop supports arrays for nesting,
// but our ticket data is a flat object where keys might contain dots (e.g., 'sys_id' vs 'user.name').
// For this form, we'll assume flat top-level keys as defined in CORE_SNOW_FIELDS.
// If you had deeply nested keys like 'user.name', you'd adapt CORE_SNOW_FIELDS and this helper.
function getFieldValue(obj: Record<string, any>, fieldName: string): any {
    return obj[fieldName];
}

// Function to safely set a value in a ticket object.
function setFieldValue(obj: Record<string, any>, fieldName: string, value: any): Record<string, any> {
    const newObj = { ...obj }; // Shallow clone is fine for top-level fields
    newObj[fieldName] = value;
    return newObj;
}


const SnowAnalyzeForm: React.FC<SnowAnalyzeFormProps> = ({ onSubmit, loading, disabled }) => {
  const [form] = Form.useForm();
  const [rawJsonInput, setRawJsonInput] = useState<string>(
    JSON.stringify(EXAMPLE_TICKET_DATA.universal_request, null, 2)
  );
  const [parsedTicketData, setParsedTicketData] = useState<Record<string, any> | null>(
    EXAMPLE_TICKET_DATA.universal_request
  );
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [selectedTicketType, setSelectedTicketType] = useState<TicketType>('universal_request');

  // Debounce the JSON input parsing to avoid frequent re-renders while typing
  const debouncedParseJson = useMemo(
    () =>
      _.debounce((jsonString: string) => {
        try {
          const parsed = JSON.parse(jsonString);
          const primaryTicket = extractPrimaryTicket(parsed);
          setParsedTicketData(primaryTicket); // Update parsed data
          setJsonError(null); // Clear any previous JSON errors
        } catch (e: any) {
          setParsedTicketData(null); // Clear parsed data on error
          setJsonError(e.message || 'Invalid JSON format'); // Set JSON parsing error
        }
      }, 500), // 500ms debounce delay
    [] // Memoize debounce function
  );

  // Effect to sync raw JSON input -> parsed data -> form fields
  useEffect(() => {
    // Call the debounced function whenever rawJsonInput changes
    debouncedParseJson(rawJsonInput);
    // Cleanup debounce on component unmount
    return () => debouncedParseJson.cancel();
  }, [rawJsonInput, debouncedParseJson]);

  // Effect to sync parsed data -> Ant Design form fields
  // This ensures form fields reflect changes from both JSON input and direct field edits.
  useEffect(() => {
    if (parsedTicketData) {
        // Create a flat object to set form values, ensuring all CORE_SNOW_FIELDS are represented
        const formFields: Record<string, any> = {};
        CORE_SNOW_FIELDS.forEach(field => {
            formFields[field] = getFieldValue(parsedTicketData, field);
        });
        form.setFieldsValue(formFields);
    } else {
      form.resetFields(); // Clear form fields if parsed data is null
    }
  }, [parsedTicketData, form]); // Rerun when parsedTicketData changes

  // Handle changes in the raw JSON input textarea
  const handleRawJsonChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setRawJsonInput(e.target.value);
  };

  // Handle changes in individual form fields
  const handleFieldChange = useCallback(
    (fieldName: string, value: any) => {
      // Create a new object based on current parsedTicketData, or an empty one if null
      const currentTicketData = parsedTicketData || {};
      const updatedTicketData = setFieldValue(currentTicketData, fieldName, value);
      
      setParsedTicketData(updatedTicketData); // Update parsed data state
      setRawJsonInput(JSON.stringify(updatedTicketData, null, 2)); // Update raw JSON input
      setJsonError(null); // Clear JSON error if user is actively editing fields
    },
    [parsedTicketData] // Dependency: parsedTicketData to ensure we work with the latest state
  );

  // Handle form submission (from the "Analyze Ticket" button)
  const handleSubmit = () => {
    // Only submit if parsedTicketData is available and there's no JSON parsing error
    if (parsedTicketData && !jsonError) {
      onSubmit(parsedTicketData);
    } else if (jsonError) {
      // JSON error is already displayed by the Alert component
      // No additional action needed here
    } else {
      // This case should ideally not be reachable if the button is disabled correctly
      setJsonError('No ticket data to analyze. Please provide valid JSON.');
    }
  };

  // Handle loading example data when ticket type selection changes
  const loadExample = (type: TicketType) => {
    const example = EXAMPLE_TICKET_DATA[type];
    const exampleJson = JSON.stringify(example, null, 2);
    setRawJsonInput(exampleJson); // Update raw JSON string
    // setParsedTicketData(example) will be called by the useEffect watching rawJsonInput
    // form.setFieldsValue will then be called by the useEffect watching parsedTicketData
    setSelectedTicketType(type); // Update selected type state
    setJsonError(null); // Clear any errors
  };

  // Handle clearing all input fields and JSON
  const handleClear = () => {
    setRawJsonInput('');
    setParsedTicketData(null); // Clear parsed data
    setJsonError(null); // Clear any errors
    form.resetFields(); // Reset Ant Design form fields
  };

  return (
    <Form
      form={form} // Pass the form instance
      layout="vertical"
      onFinish={handleSubmit} // Bind to the Ant Design Form's onFinish
      disabled={disabled || loading} // Disable entire form if loading or prop-disabled
    >
      <Row gutter={[16, 16]}>
        {/* Left Column: Extracted Ticket Fields (formerly Right) */}
        <Col span={12}>
          <div className="flex justify-between items-center mb-2">
            <Text strong>Extracted Ticket Fields</Text>
            <Tooltip title="Clear all input">
                 <Button icon={<CloseCircleOutlined />} onClick={handleClear} disabled={disabled || loading} />
            </Tooltip>
          </div>
          <div className="snow-ticket-fields-form" style={{ maxHeight: '450px', overflowY: 'auto', paddingRight: '10px' }}>
            {CORE_SNOW_FIELDS.map((field) => (
              <Form.Item label={_.startCase(field)} name={field} key={field}>
                {/* Render Input or TextArea based on field name */}
                {field.includes('description') || field.includes('notes') ? (
                  <Input.TextArea
                    autoSize={{ minRows: 1, maxRows: 4 }}
                    // Use Ant Design's Form.Item value management,
                    // but also call handleFieldChange to sync back to raw JSON
                    onChange={(e) => handleFieldChange(field, e.target.value)}
                    disabled={disabled || loading}
                  />
                ) : (
                  <Input
                    onChange={(e) => handleFieldChange(field, e.target.value)}
                    disabled={disabled || loading}
                  />
                )}
              </Form.Item>
            ))}
            {/* If there's an active ticket, but no core fields populated, indicate */}
            {!parsedTicketData && !jsonError && (
              <Alert message="No data or invalid ticket selected. Load an example or paste JSON." type="info" showIcon />
            )}
          </div>
        </Col>

        {/* Right Column: Raw JSON Input (formerly Left) */}
        <Col span={12}>
          <div className="flex justify-between items-center mb-2">
            <Text strong>Raw JSON Input</Text>
            <Popover
              content={
                <div>
                  <p>Paste the full JSON output from a ServiceNow API call (e.g., Table API for an incident or universal request).</p>
                  <p>The form will attempt to extract the primary ticket object, even if it's nested (e.g., within a "records" array).</p>
                  <p>Changes made in the "Extracted Ticket Fields" will reflect back into this JSON, and vice-versa.</p>
                  <p><strong>Examples:</strong></p>
                  <Select defaultValue={selectedTicketType} onChange={loadExample} style={{ width: '100%' }} disabled={disabled || loading}>
                    <Option value="universal_request">Universal Request</Option>
                    <Option value="incident">Incident</Option>
                  </Select>
                </div>
              }
              title="JSON Input Guide"
              trigger="hover"
            >
              <InfoCircleOutlined style={{ color: 'rgba(0,0,0,.45)' }} />
            </Popover>
          </div>
          <TextArea
            value={rawJsonInput}
            onChange={handleRawJsonChange}
            rows={20}
            placeholder='Paste your ServiceNow ticket JSON here...'
            disabled={disabled || loading}
            style={{ fontFamily: 'monospace' }}
          />
          {jsonError && (
            <Alert message="JSON Error" description={jsonError} type="error" showIcon className="mt-2" />
          )}
        </Col>
      </Row>

      {/* Submit Button */}
      <Form.Item className="mt-4">
        <Button
          type="primary"
          htmlType="submit" // Triggers form's onFinish
          loading={loading}
          // Button is disabled if: disabled prop is true, loading, there's a JSON error, or no valid parsed data
          disabled={disabled || loading || jsonError !== null || !parsedTicketData}
          size="large"
        >
          Analyze Ticket
        </Button>
      </Form.Item>
    </Form>
  );
};

export default SnowAnalyzeForm;