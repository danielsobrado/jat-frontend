import React, { useState, useEffect } from 'react';
import { Tabs, Spin, Alert, Form, Input, InputNumber, Switch, Select, Descriptions, Tooltip } from 'antd';
import { QuestionCircleOutlined } from '@ant-design/icons';
import type { FormInstance } from 'antd/es/form';
import { ApiClient, LlmConfig, UpdateConfigRequest } from '../../api/types';
import ConfigValue, { getConfigLabel } from '../ConfigValue'; // Import helper too

const { TabPane } = Tabs;
const { Option } = Select;
const { Item: FormItem } = Form; // Alias Form.Item for clarity

// Define the props including edit state and handlers
export interface SettingsTabProps {
  apiClient: ApiClient;
  isEditing: boolean;
  onSave: (updatedConfig: UpdateConfigRequest) => Promise<void>; // Function to call with update payload
  form: FormInstance<any>; // Pass the form instance down
  initialConfig: LlmConfig | null; // Pass fetched config
  loading: boolean; // Pass loading state
  error: string | null; // Pass error state
}

// Helper to get description for a config key
const getConfigDescription = (keyPath: string[]): string | null => {
  const descriptions: Record<string, string> = {
    "server.logLevel": "Set the minimum level for server logs (debug, info, warn, error).",
    "server.requestTimeout": "Maximum duration for handling incoming HTTP requests (e.g., '60s', '5m').",
    "service.llmEndpoint": "The base URL of the Language Model API.",
    "service.llmApiKey": "Your API key for the LLM service. Leave blank to keep the existing key.",
    "service.llmModel": "The specific LLM model to use for classification.",
    "service.llmMaxTokens": "Maximum number of tokens the LLM can generate in a response.",
    "service.llmTemperature": "Controls randomness in LLM output (0.0 = deterministic, >1.0 = more creative).",
    "service.useTypePrompt": "Whether to include specific guidance for GOODS/SERVICE/OTHER in UNSPSC Segment prompts.",
    "service.maxSkipLogs": "Maximum number of 'skipped row' warnings to log during Excel loading.",
    "database.ragEnabled": "Enable/disable Retrieval-Augmented Generation using vector database context.",
    "database.ragServiceUrl": "The URL of the RAG vector database service.",
    "database.ragManualInfoCollection": "Name of the collection storing manually added RAG context.",
    "database.ragUnspscCollection": "Name of the collection storing UNSPSC category data for RAG.",
    "database.ragCommonCollection": "Name of the collection storing Common Categories data for RAG.",
    "validation.maxHistoryLimit": "Maximum number of classification history items to store.",
    "validation.tokenLimit": "Estimated maximum token limit supported by the configured LLM.",
    "validation.defaultTimeout": "Default timeout for external service calls (e.g., '15s').",
    "alert.emailSettings.smtpHost": "Hostname of the SMTP server for sending email alerts.",
    "alert.emailSettings.smtpPort": "Port number of the SMTP server.",
    "alert.emailSettings.smtpUser": "Username for SMTP authentication.",
    "alert.emailSettings.smtpPassword": "Password for SMTP authentication. Leave blank to keep the existing password.",
    "alert.emailSettings.fromEmail": "The 'From' email address for alerts.",
    "alert.webhookSettings.url": "The URL to send webhook alerts to.",
    "auth.enabled": "Enable or disable user authentication and authorization.",
    "auth.jwtExpirationHours": "Number of hours a user's login session (JWT token) remains valid.",
  };
  return descriptions[keyPath.join('.')] || null;
};

// --- Component ---
const SettingsTab: React.FC<SettingsTabProps> = ({
  apiClient, // Keep apiClient if needed for other things, otherwise remove
  isEditing,
  onSave,
  form,
  initialConfig, // Receive config from parent
  loading: parentLoading, // Use loading state from parent
  error: parentError, // Use error state from parent
}) => {
  const [activeTab, setActiveTab] = useState<string | undefined>(undefined);

  // Initialize form when initialConfig is available or edit mode changes
  useEffect(() => {
    if (initialConfig) {
      // Prepare initial values for the form, handling nested structure
      const formValues: any = {};
      Object.keys(initialConfig).forEach(topKey => {
        const section = initialConfig[topKey as keyof LlmConfig];
        if (section && typeof section === 'object') {
          formValues[topKey] = {};
          Object.keys(section).forEach(subKey => {
            // Handle sensitive fields - DO NOT put masked value in form
            const fullKey = `${topKey}.${subKey}`;
             if (['service.llmApiKey', 'database.password', 'alert.emailSettings.smtpPassword', 'auth.jwtSecret', 'auth.initialAdminPassword'].includes(fullKey)) {
               formValues[topKey][subKey] = ''; // Set to empty for editing
             } else {
               formValues[topKey][subKey] = section[subKey as keyof typeof section];
             }
          });
        }
      });
      form.setFieldsValue(formValues);

      // Set default active tab if not already set
      if (!activeTab) {
        const firstKey = getTopLevelKeys(initialConfig)[0];
        setActiveTab(firstKey);
      }
    } else {
      form.resetFields(); // Reset form if no config
    }
  }, [initialConfig, form, activeTab]); // Add activeTab dependency

  // Recursive function to render form items OR display values
  const renderConfigEntries = (data: any, parentPath: string[] = []): React.ReactNode[] => {
    if (data === null || typeof data !== 'object' || Array.isArray(data)) {
      return []; // Should not happen at top level sections
    }

    return Object.entries(data)
      .map(([key, value]) => {
        const currentPath = [...parentPath, key];
        const fullKey = currentPath.join('.');
        const label = getConfigLabel(key);
        const description = getConfigDescription(currentPath);

        // Determine input type based on key or value type
        let inputType: 'text' | 'password' | 'number' | 'boolean' | 'select' | 'duration' | 'textarea' | 'unsupported' = 'text';
        const lowerKey = key.toLowerCase();

        // Determine if the field should be editable
        const isReadOnly = ['host', 'port', 'user', 'name', 'dataPath', 'initialAdminUser', 'jwtSecret', 'initialAdminPassword'].includes(key) || parentPath.includes('unspscExcelLoader') || parentPath.includes('commonExcelLoader');
        const isSensitive = ['llmApiKey', 'password', 'smtpPassword'].includes(key);

        if (isReadOnly && isEditing) {
           // Display read-only value even in edit mode
           return (
             <FormItem key={fullKey} label={renderLabel(label, description)} name={currentPath} style={{ marginBottom: '10px' }}>
                <ConfigValue configKey={key} value={value} className="text-secondary-500 italic" />
                <span className="text-xs text-secondary-400 ml-2">(Read-only)</span>
             </FormItem>
           );
        }

        if (typeof value === 'boolean') {
          inputType = 'boolean';
        } else if (typeof value === 'number') {
          inputType = 'number';
        } else if (lowerKey.includes('password') || lowerKey.includes('apikey') || lowerKey.includes('secret')) {
           inputType = 'password';
        } else if (key === 'logLevel') {
           inputType = 'select';
        } else if (key.includes('Timeout') || key.includes('duration')) { // Simple check for duration-like fields
          inputType = 'duration';
        } else if (typeof value === 'string' && value.length > 100) { // Treat long strings as textarea
          inputType = 'textarea';
        } else if (typeof value === 'object' || Array.isArray(value)) {
           inputType = 'unsupported'; // Don't render form items for nested objects/arrays directly here
        }

        if (inputType === 'unsupported') {
          // In read-only mode, show nested details
          if (!isEditing) {
            return (
              <Descriptions.Item key={fullKey} label={<span title={fullKey}>{label}</span>} span={1}>
                <div className="nested-config pl-4 border-l-2 border-secondary-200">
                  {renderConfigEntries(value, currentPath).map((node, idx) => <div key={idx}>{node}</div>)}
                </div>
              </Descriptions.Item>
            );
          }
          return null; // Don't show form item for complex types in edit mode here
        }

        // --- Render Edit Mode Form Item ---
        if (isEditing) {
           let fieldComponent: React.ReactNode;
           const commonProps = {
             disabled: parentLoading || isReadOnly, // Disable input if loading or read-only
             placeholder: isSensitive ? "Leave blank to keep current" : `Enter ${label}`
           };

          switch (inputType) {
            case 'boolean':
              fieldComponent = <Switch disabled={parentLoading} />;
              break;
            case 'number':
              fieldComponent = <InputNumber {...commonProps} style={{ width: '100%' }} />;
              break;
            case 'password':
               fieldComponent = <Input.Password {...commonProps} autoComplete="new-password" />;
               break;
            case 'select': // Example for logLevel
               if (key === 'logLevel') {
                 fieldComponent = (
                   <Select {...commonProps} placeholder="Select log level">
                     <Option value="debug">Debug</Option>
                     <Option value="info">Info</Option>
                     <Option value="warn">Warn</Option>
                     <Option value="error">Error</Option>
                   </Select>
                 );
               } else {
                  fieldComponent = <Input {...commonProps} />; // Fallback
               }
               break;
            case 'duration':
              fieldComponent = <Input {...commonProps} placeholder="e.g., 60s, 5m, 1h" />;
              break;
            case 'textarea':
               fieldComponent = <Input.TextArea {...commonProps} rows={3} />;
               break;
            default: // text
               fieldComponent = <Input {...commonProps} />;
          }

          // Use FormItem for layout and validation (add rules later if needed)
          return (
            <FormItem
              key={fullKey}
              name={currentPath} // Use array for nested keys
              label={renderLabel(label, description)}
              valuePropName={inputType === 'boolean' ? 'checked' : 'value'} // Important for Switch
              style={{ marginBottom: '10px' }}
            >
              {fieldComponent}
            </FormItem>
          );
        } else {
          // --- Render Read-Only Mode ---
          return (
            <Descriptions.Item key={fullKey} label={<span title={fullKey}>{label}</span>} span={1} labelStyle={{ width: '30%' }}>
              <ConfigValue configKey={key} value={value} />
            </Descriptions.Item>
          );
        }
      })
      .filter(Boolean); // Remove null entries (like unsupported types in edit mode)
  };

   // Helper to render label with tooltip
   const renderLabel = (label: string, description: string | null) => (
     <span>
       {label}
       {description && (
         <Tooltip title={description} overlayStyle={{ maxWidth: '300px' }}>
           <QuestionCircleOutlined style={{ marginLeft: 4, color: 'rgba(0,0,0,.45)', cursor: 'help' }} />
         </Tooltip>
       )}
     </span>
   );

   // Get top-level keys for Tabs
   const getTopLevelKeys = (cfg: LlmConfig | null): string[] => {
      if (!cfg) return [];
      const desiredOrder = ['server', 'service', 'database', 'auth', 'validation', 'alert'];
      const keys = Object.keys(cfg).filter(key =>
        typeof cfg[key as keyof LlmConfig] === 'object' && cfg[key as keyof LlmConfig] !== null
      );
      keys.sort((a, b) => {
         const indexA = desiredOrder.indexOf(a);
         const indexB = desiredOrder.indexOf(b);
         if (indexA === -1 && indexB === -1) return a.localeCompare(b);
         if (indexA === -1) return 1;
         if (indexB === -1) return -1;
         return indexA - indexB;
      });
      return keys;
    };

  // --- Render Logic ---

  if (parentLoading && !initialConfig) { // Show loading only on initial fetch
    return (
      <div className="flex justify-center items-center py-10">
        <Spin size="large" tip="Loading configuration..." />
      </div>
    );
  }

  if (parentError) {
    return (
      <Alert
        message="Error Loading Configuration"
        description={parentError}
        type="error"
        showIcon
      />
    );
  }

  if (!initialConfig) {
    return <Alert message="No configuration data available." type="warning" showIcon />;
  }

  const topLevelKeys = getTopLevelKeys(initialConfig);

  return (
    <Form
      form={form}
      layout="vertical"
      name="settingsForm"
      // onFinish is handled by the onSave prop passed from parent
      // initialValues are set via form.setFieldsValue in useEffect
    >
      <Tabs
         activeKey={activeTab}
         onChange={setActiveTab}
         tabPosition="top"
      >
         {topLevelKeys.map(topKey => {
            const sectionData = initialConfig[topKey as keyof LlmConfig];
            if (!sectionData || typeof sectionData !== 'object') return null; // Skip non-objects

            const sectionLabel = getConfigLabel(topKey);

            return (
               <TabPane tab={sectionLabel} key={topKey}>
                 <div className="py-4 px-2">
                   {isEditing
                     ? renderConfigEntries(sectionData, [topKey]) // Render FormItems
                     : ( // Render Descriptions for read-only
                       <Descriptions bordered column={1} size="small" className="config-descriptions">
                         {renderConfigEntries(sectionData, [topKey])}
                       </Descriptions>
                       )
                   }
                 </div>
               </TabPane>
            );
         })}
      </Tabs>
    </Form>
  );
};

export default SettingsTab;