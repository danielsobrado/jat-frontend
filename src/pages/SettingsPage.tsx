import React, { useState, useEffect, useCallback } from 'react';
import { ApiClient, LlmConfig, UpdateConfigRequest } from '../api/types';
import SettingsTab from '../components/Settings/SettingsTab';
import { useAuth } from '../context/AuthContext';
import { Button, Spin, Alert, message, Form } from 'antd';
import { EditOutlined, SaveOutlined, CloseOutlined } from '@ant-design/icons';

interface SettingsPageProps {
  apiClient: ApiClient;
}

const SettingsPage: React.FC<SettingsPageProps> = ({ apiClient }) => {
  const { checkPermission } = useAuth();
  const [form] = Form.useForm(); // Create form instance here

  const [config, setConfig] = useState<LlmConfig | null>(null);
  const [loading, setLoading] = useState(true); // Loading state for initial fetch
  const [saving, setSaving] = useState(false); // Separate state for saving operation
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const canView = checkPermission('config:view');
  const canUpdate = checkPermission('config:update');

  const loadConfig = useCallback(async () => {
    if (!canView) {
        setLoading(false);
        return; // Don't load if user can't view
    }
    setLoading(true);
    setError(null);
    try {
      const fetchedConfig = await apiClient.getConfig();
      setConfig(fetchedConfig);
      form.resetFields(); // Reset form when new config is loaded
    } catch (err) {
      console.error('Failed to load settings:', err);
      setError(err instanceof Error ? err.message : 'Failed to load configuration');
      setConfig(null);
    } finally {
      setLoading(false);
    }
  }, [apiClient, canView, form]); // Add form dependency

  useEffect(() => {
    loadConfig();
  }, [loadConfig]); // Reload if loadConfig changes

  const handleEdit = () => {
    if (canUpdate) {
      setIsEditing(true);
      // Form initialization happens in SettingsTab's useEffect
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    form.resetFields(); // Reset form to initial values on cancel
    message.info('Changes discarded.');
  };

  // This function will be called by SettingsTab's Form onFinish
  const handleSave = async () => {
    if (!canUpdate) return;
    setSaving(true);
    setError(null);
    try {
      const formValues = await form.validateFields();

      // Construct the UpdateConfigRequest payload
      // Only include sections that have changed or contain updatable fields
      const updatePayload: UpdateConfigRequest = {};

      // Helper function to prune unchanged/sensitive fields before sending
      const buildUpdateSection = (sectionKey: keyof LlmConfig, formSectionValues: any) => {
        if (!formSectionValues || typeof formSectionValues !== 'object') return null;
        const originalSection = config?.[sectionKey] as any;
        const updateSection: any = {};
        let hasChanges = false;

        Object.keys(formSectionValues).forEach(key => {
          const fullKey = `${sectionKey}.${key}`;
          const newValue = formSectionValues[key];
          const originalValue = originalSection?.[key];

          // Special handling for sensitive fields: only include if non-empty
          if (['llmApiKey', 'smtpPassword'].includes(key)) {
            if (newValue && typeof newValue === 'string' && newValue.trim() !== '') {
              updateSection[key] = newValue.trim();
              hasChanges = true;
              console.log(`[SAVE] Including updated sensitive field: ${fullKey}`);
            } else {
              console.log(`[SAVE] Skipping empty/unchanged sensitive field: ${fullKey}`);
            }
          } else if (newValue !== originalValue) {
            // Basic change detection (might need deep compare for objects/arrays)
            updateSection[key] = newValue;
            hasChanges = true;
            console.log(`[SAVE] Field changed: ${fullKey}`, { from: originalValue, to: newValue });
          } else {
            console.log(`[SAVE] Field unchanged: ${fullKey}`);
          }
        });
        return hasChanges ? updateSection : null;
      };

      // Iterate through top-level keys present in the form
      const topLevelKeys = ['server', 'service', 'database', 'auth', 'validation', 'alert'] as const; // Add all keys
      topLevelKeys.forEach(key => {
        if (formValues[key]) {
          const updateSectionData = buildUpdateSection(key, formValues[key]);
          if (updateSectionData) {
            updatePayload[key] = updateSectionData;
          }
        }
      });

      if (Object.keys(updatePayload).length === 0) {
        message.info('No changes detected to save.');
        setIsEditing(false); // Exit edit mode if no changes
        setSaving(false);
        return;
      }

      console.log("Submitting update payload:", updatePayload); // Log the final payload

      await apiClient.updateConfig(updatePayload);
      message.success('Configuration updated successfully!');
      setIsEditing(false);
      await loadConfig(); // Reload config to show persisted values

    } catch (err) {
      console.error('Failed to save settings:', err);
      setError(err instanceof Error ? err.message : 'Failed to save configuration');
      message.error(`Save failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
      // Keep form values on error so user can fix them
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page-container">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-secondary-900">Settings</h1>
          <p className="text-secondary-600">
            {isEditing ? 'Modify' : 'View'} application and service configuration.
          </p>
        </div>
        {canView && ( // Show buttons only if user can view
          <div className="flex space-x-2">
            {isEditing ? (
              <>
                <Button
                  icon={<CloseOutlined />}
                  onClick={handleCancel}
                  disabled={saving}
                >
                  Cancel
                </Button>
                <Button
                  type="primary"
                  icon={<SaveOutlined />}
                  onClick={() => form.submit()} // Trigger form submission via AntD form instance
                  loading={saving}
                  disabled={!canUpdate} // Also disable if user lost update permission while editing
                >
                  Save Changes
                </Button>
              </>
            ) : (
              <Button
                icon={<EditOutlined />}
                onClick={handleEdit}
                disabled={loading || !canUpdate} // Disable if loading or no update permission
                title={!canUpdate ? "Permission denied to edit settings" : "Edit Settings"}
              >
                Edit
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Permission Warning */}
      {!canView ? (
        <Alert
          message="Permission Denied"
          description="You don't have permission to view configuration settings. Please contact your administrator."
          type="warning"
          showIcon
        />
      ) : loading ? (
          <div className="flex justify-center items-center py-10">
            <Spin size="large" tip="Loading configuration..." />
          </div>
      ) : error ? (
         <Alert
             message="Error Loading Configuration"
             description={error}
             type="error"
             showIcon
             closable
             onClose={() => setError(null)}
             className="mb-4"
           />
      ) : (
        // Pass relevant state and handlers to SettingsTab
        <SettingsTab
          apiClient={apiClient}
          isEditing={isEditing}
          onSave={handleSave} // Pass the save handler
          form={form} // Pass the form instance
          initialConfig={config} // Pass the loaded config
          loading={saving} // Indicate loading state during save
          error={error} // Pass error to potentially display within tabs
        />
      )}
       {/* Display persistent errors from save below the tabs */}
       {error && !loading && (
           <Alert
             message="Save Error"
             description={error}
             type="error"
             showIcon
             closable
             onClose={() => setError(null)}
             className="mt-4"
           />
        )}
    </div>
  );
};

export default SettingsPage;