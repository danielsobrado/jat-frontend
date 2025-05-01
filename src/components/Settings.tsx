import React, { useState, useEffect, ReactNode, useMemo } from 'react';
import { LlmConfig } from '../api/types';
import ConfigValue from './ConfigValue';

interface SettingsProps {
  apiClient: {
    getConfig(): Promise<LlmConfig>;
    updateConfig(config: LlmConfig): Promise<void>;
  };
}

interface SectionGroups {
  rag: Record<string, any>;
  basic: Record<string, any>;
}

const Settings: React.FC<SettingsProps> = ({ apiClient }): JSX.Element => {
  const [config, setConfig] = useState<LlmConfig | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [expandedSections, setExpandedSections] = useState<{[key: string]: boolean}>({
    server: true,
    service: true,
    database: true,
    validation: true,
    alert: true
  });

  // Memoized labels for config keys
  const configLabels = useMemo<Record<string, string>>(() => ({
    ragEnabled: 'RAG Enabled',
    ragServiceUrl: 'RAG Service URL',
    ragManualInfoCollection: 'RAG Manual Info Collection',
    ragUnspscCollection: 'RAG UNSPSC Collection',
    ragCommonCollection: 'RAG Common Collection'
  }), []);

  // Function to get a user-friendly label for a config key
  const getConfigLabel = (key: string): string => configLabels[key] || key;

  // Function to toggle section expansion
  const toggleSection = (section: string): void => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  useEffect(() => {
    const loadConfig = async () => {
      try {
        const data = await apiClient.getConfig();
        setConfig(data);
      } catch (error) {
        console.error('Error loading config:', error);
        setNotification({
          type: 'error',
          message: 'Failed to load settings'
        });
      }
    };
    
    loadConfig();
  }, [apiClient]);

  // Group related settings
  const groupSettings = (obj: any): SectionGroups => {
    const groups: SectionGroups = {
      rag: {},
      basic: {},
    };

    if (!obj) return groups;

    Object.entries(obj).forEach(([key, value]) => {
      if (key.toLowerCase().startsWith('rag')) {
        groups.rag[key] = value;
      } else {
        groups.basic[key] = value;
      }
    });

    return groups;
  };

  // Recursive function to render nested config entries
  const renderEntries = (obj: any, indent: number = 0): JSX.Element[] => {
    if (obj === null || obj === undefined) return [];

    // For database section, use special grouping
    if (indent === 0 && config?.database && obj === config.database) {
      const groups = groupSettings(obj);
      const hasRagSettings = Object.keys(groups.rag).length > 0;
      const result: JSX.Element[] = [];

      if (hasRagSettings) {
        result.push(
          <div key="rag-header" className="mt-2 mb-3">
            <h4 className="text-sm font-semibold text-primary-600 mb-2">RAG Configuration</h4>
            {Object.entries(groups.rag).map(([key, value]) => (
              <div key={key} className="grid grid-cols-2 gap-x-2 py-1">
                <div className="text-sm font-medium text-secondary-700">{getConfigLabel(key)}:</div>
                <div className="text-sm">
                  <ConfigValue configKey={key} value={value} />
                </div>
              </div>
            ))}
          </div>
        );
      }

      if (Object.keys(groups.basic).length > 0) {
        result.push(
          <div key="basic-header" className={`mt-4 ${!hasRagSettings ? 'mt-2' : ''}`}>
            <h4 className="text-sm font-semibold text-secondary-600 mb-2">Database Settings</h4>
            {Object.entries(groups.basic).map(([key, value]) => {
              const isObj = typeof value === 'object' && value !== null;
              return (
                <div key={key} className="grid grid-cols-2 gap-x-2 py-1">
                  <div className="text-sm font-medium text-secondary-700">{getConfigLabel(key)}:</div>
                  <div className="text-sm">
                    {!isObj ? <ConfigValue configKey={key} value={value} /> : ''}
                  </div>
                </div>
              );
            })}
          </div>
        );
      }

      return result;
    }

    // For other sections, render nested entries
    const entries: JSX.Element[] = [];
    Object.entries(obj).forEach(([key, value]) => {
      const isObj = typeof value === 'object' && value !== null;
      const marginStyle = { marginLeft: `${indent * 1}rem` };

      entries.push(
        <div key={`${key}-${indent}`} className="grid grid-cols-2 gap-x-2 py-1" style={marginStyle}>
          <div className="text-sm font-medium text-secondary-700">{getConfigLabel(key)}:</div>
          <div className="text-sm">
            {!isObj ? <ConfigValue configKey={key} value={value} /> : ''}
          </div>
        </div>
      );

      if (Array.isArray(value)) {
        value.forEach((item, idx) => {
          entries.push(
            <div key={`${key}-${idx}`} style={{ marginLeft: `${(indent + 1) * 1}rem` }}>
              <div className="text-sm font-medium text-secondary-700">[{idx}]</div>
              {typeof item === 'object' && item !== null ?
                renderEntries(item, indent + 2) :
                <div className="text-sm">
                  <ConfigValue configKey={key} value={item} />
                </div>}
            </div>
          );
        });
      } else if (isObj) {
        entries.push(...renderEntries(value, indent + 1));
      }
    });

    return entries;
  };

  // Function to render a configuration section
  const renderConfigSection = (title: string, configSection: any, sectionKey: string): JSX.Element => {
    if (!configSection) return <></>;
    
    return (
      <div className="mb-6 bg-white shadow-card rounded-card">
        <div 
          className="flex items-center justify-between p-4 border-b cursor-pointer"
          onClick={() => toggleSection(sectionKey)}
        >
          <h3 className="text-lg font-medium text-secondary-900">{title}</h3>
          <button className="text-gray-500">
            {expandedSections[sectionKey] ? '▼' : '▶'}
          </button>
        </div>
        
        {expandedSections[sectionKey] && (
          <div className="p-4">
            {renderEntries(configSection)}
          </div>
        )}
      </div>
    );
  };

  if (!config) {
    return (
      <div className="max-w-8xl mx-auto space-y-10 p-4">
        <div className="bg-white shadow-card rounded-card p-8">
          <p className="text-secondary-700">Loading configuration...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-8xl mx-auto space-y-6" style={{ minWidth: '40rem', paddingRight: '1rem', paddingLeft: '1rem'}}>
      <div className="bg-white shadow-card rounded-card p-6 w-full">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-secondary-900">System Configuration</h2>
        </div>

        {notification && (
          <div className={`mb-6 rounded-card px-4 py-3 ${
            notification.type === 'success'
              ? 'bg-green-50/50 border border-green-200 text-green-700'
              : 'bg-red-50/50 border border-red-200 text-red-700'
          }`}>
            <p className="text-sm">{notification.message}</p>
          </div>
        )}

        <div className="text-sm text-gray-600 mb-6">
          <p>This is a read-only view of the current system configuration. Sensitive information is masked with asterisks.</p>
        </div>

        {renderConfigSection('Server Configuration', config.server, 'server')}
        {renderConfigSection('Service Configuration', config.service, 'service')}
        {renderConfigSection('Database Configuration', config.database, 'database')}
        {renderConfigSection('Validation Configuration', config.validation, 'validation')}
        {renderConfigSection('Alert Configuration', config.alert, 'alert')}
      </div>
    </div>
  );
};

export default Settings;