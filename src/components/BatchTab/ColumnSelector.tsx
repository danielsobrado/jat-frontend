import React, { useState, useEffect } from 'react';
import { ColumnConfig, ResultColumn, SystemConfig } from './types';

interface ColumnSelectorProps {
  headers: string[];
  onColumnSelect: (config: Omit<ColumnConfig, 'resultColumns'> & { keyColumnNames: string[] }) => void; // Pass key names separately for clarity initially
  availableSystems: SystemConfig[];
  onSystemSelect: (systemCode: string) => void;
  selectedSystem: SystemConfig | null;
}

const ColumnSelector: React.FC<ColumnSelectorProps> = ({
  headers,
  onColumnSelect,
  availableSystems,
  onSystemSelect,
  selectedSystem
}) => {
  const [sourceColumn, setSourceColumn] = useState('');
  const [contextColumn, setContextColumn] = useState('');
  const [keyColumns, setKeyColumns] = useState<string[]>([]); // State for key column names
  const [resultColumns, setResultColumns] = useState<ResultColumn[]>([]);

  // Initialize result columns when system changes
  useEffect(() => {
    if (selectedSystem) {
      const initialResultColumns: ResultColumn[] = selectedSystem.levels.map(level => ({
        levelCode: level.code,
        levelName: level.name,
        codeColumn: `${level.name}_Code`,
        nameColumn: `${level.name}_Name`,
        isNewColumn: true
      }));
      setResultColumns(initialResultColumns);
    }
  }, [selectedSystem]);

  // Effect to call onColumnSelect when selections change
  useEffect(() => {
    if (sourceColumn) { // Only call if source is selected
      onColumnSelect({
        sourceColumn,
        contextColumn: contextColumn || undefined, // Ensure undefined if empty
        keyColumnNames: keyColumns, // Pass selected key columns 
        keyColumns: keyColumns, // Also map to keyColumns for type compatibility
        descriptionColumnIndex: -1 // Keep dummy value for backward compatibility
      });
    }
  }, [sourceColumn, contextColumn, keyColumns, onColumnSelect]);

  const handleSourceColumnChange = (value: string) => {
    setSourceColumn(value);
  };

  const handleContextColumnChange = (value: string) => {
    setContextColumn(value);
  };

  const handleKeyColumnChange = (header: string, isChecked: boolean) => {
    setKeyColumns(prev => {
      if (isChecked) {
        // Add to key columns if not already present
        return [...prev, header];
      } else {
        // Remove from key columns
        return prev.filter(col => col !== header);
      }
    });
    // Note: The useEffect above will trigger onColumnSelect
  };

  const handleResultColumnChange = (levelCode: string, changes: Partial<ResultColumn>) => {
    setResultColumns(prev => ({
      ...prev,
      resultColumns: prev.map(col =>
        col.levelCode === levelCode
          ? { ...col, ...changes }
          : col
      )
    }));
  };

  const isColumnDisabled = (header: string, currentType: keyof ColumnConfig | string) => {
    if (currentType === 'sourceColumn' || currentType === 'contextColumn') {
      return (
        (currentType === 'sourceColumn' ? sourceColumn !== header : contextColumn !== header) &&
        (sourceColumn === header || contextColumn === header)
      );
    }
    // Key columns can overlap with any column
    if (currentType === 'keyColumns') {
      return false;
    }
    // For result columns
    return sourceColumn === header || contextColumn === header;
  };

  return (
    <div className="space-y-4">
      {/* Classification System Selection */}
      <div className="space-y-2">
        <label 
          htmlFor="systemSelect"
          className="block text-sm font-medium text-secondary-700"
        >
          Classification System *
        </label>
        <select
          id="systemSelect"
          value={selectedSystem?.system.code || ''}
          onChange={(e) => onSystemSelect(e.target.value)}
          className="w-full px-4 py-2.5 bg-white border border-secondary-200 rounded-card text-secondary-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          required
        >
          <option value="">Select a classification system</option>
          {availableSystems.map((sys) => (
            <option key={sys.system.code} value={sys.system.code}>
              {sys.system.name} ({sys.levels.length} levels)
            </option>
          ))}
        </select>
      </div>

      {/* Source Column Selection */}
      <div className="space-y-2">
        <label 
          htmlFor="sourceColumn"
          className="block text-sm font-medium text-secondary-700"
        >
          Source Description Column *
        </label>
        <select
          id="sourceColumn"
          value={sourceColumn}
          onChange={(e) => handleSourceColumnChange(e.target.value)}
          className="w-full px-4 py-2.5 bg-white border border-secondary-200 rounded-card text-secondary-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          required
        >
          <option value="">Select a column</option>
          {headers.map((header) => (
            <option 
              key={header} 
              value={header}
              disabled={isColumnDisabled(header, 'sourceColumn')}
            >
              {header}
            </option>
          ))}
        </select>
      </div>

      {/* Context Column Selection */}
      <div className="space-y-2">
        <label 
          htmlFor="contextColumn"
          className="block text-sm font-medium text-secondary-700"
        >
          Additional Context Column (Optional)
        </label>
        <select
          id="contextColumn"
          value={contextColumn}
          onChange={(e) => handleContextColumnChange(e.target.value)}
          className="w-full px-4 py-2.5 bg-white border border-secondary-200 rounded-card text-secondary-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        >
          <option value="">None</option>
          {headers.map((header) => (
            <option 
              key={header} 
              value={header}
              disabled={isColumnDisabled(header, 'contextColumn')}
            >
              {header}
            </option>
          ))}
        </select>
      </div>

      {/* Key Column Selection */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-secondary-700">
          Key Columns (Select one or more columns to use as unique identifiers)
        </label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 p-3 border border-secondary-200 rounded-card bg-white">
          {headers.map((header) => (
            <div key={header} className="flex items-center">
              <input
                type="checkbox"
                id={`key-${header}`}
                // Use keyColumns state here
                checked={keyColumns.includes(header)}
                onChange={(e) => handleKeyColumnChange(header, e.target.checked)}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-secondary-300 rounded"
              />
              <label htmlFor={`key-${header}`} className="ml-2 block text-sm text-secondary-900 truncate">
                {header}
              </label>
            </div>
          ))}
        </div>
        <p className="text-xs text-secondary-500">
          These columns will be combined to form a unique key for each row. When downloading results, 
          they will be available as separate columns (key1, key2, etc.).
        </p>
      </div>

      {/* Result Columns Selection */}
      {selectedSystem && (
        <div className="space-y-4">
          <h4 className="font-medium text-secondary-700">Result Columns</h4>
          {resultColumns.map((resultCol) => (
            <div key={resultCol.levelCode} className="space-y-2">
              <label className="block text-sm font-medium text-secondary-700">
                {resultCol.levelName} Result Columns *
              </label>
              <div className="grid grid-cols-2 gap-4">
               {/* Code Column Selection */}
               <div>
                 <select
                   value={resultCol.isNewColumn ? '__new__' : resultCol.codeColumn}
                   onChange={(e) => {
                     const isNew = e.target.value === '__new__';
                     handleResultColumnChange(resultCol.levelCode, {
                       isNewColumn: isNew,
                       codeColumn: isNew ? `${resultCol.levelName}_Code` : e.target.value
                     });
                   }}
                   className="w-full px-4 py-2.5 bg-white border border-secondary-200 rounded-card text-secondary-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    <option value="__new__">{resultCol.levelName} Code (New)</option>
                    {headers.map((header) => (
                      <option 
                        key={header} 
                        value={header}
                        disabled={isColumnDisabled(header, resultCol.levelCode)}
                      >
                        {header}
                      </option>
                    ))}
                  </select>
                  {resultCol.isNewColumn && (
                    <input
                      type="text"
                      value={resultCol.codeColumn}
                      onChange={(e) => handleResultColumnChange(resultCol.levelCode, {
                        codeColumn: e.target.value
                      })}
                      placeholder="Code column name"
                      className="mt-2 w-full px-4 py-2.5 bg-white border border-secondary-200 rounded-card text-secondary-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  )}
                </div>

                {/* Name Column Selection */}
                <div>
                  <select
                    value={resultCol.isNewColumn ? '__new__' : resultCol.nameColumn}
                    onChange={(e) => {
                      const isNew = e.target.value === '__new__';
                      handleResultColumnChange(resultCol.levelCode, {
                        isNewColumn: isNew,
                        nameColumn: isNew ? `${resultCol.levelName}_Name` : e.target.value
                      });
                    }}
                    className="w-full px-4 py-2.5 bg-white border border-secondary-200 rounded-card text-secondary-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    <option value="__new__">{resultCol.levelName} Name (New)</option>
                    {headers.map((header) => (
                      <option 
                        key={header} 
                        value={header}
                        disabled={isColumnDisabled(header, resultCol.levelCode)}
                      >
                        {header}
                      </option>
                    ))}
                  </select>
                  {resultCol.isNewColumn && (
                    <input
                      type="text"
                      value={resultCol.nameColumn}
                      onChange={(e) => handleResultColumnChange(resultCol.levelCode, {
                        nameColumn: e.target.value
                      })}
                      placeholder="Name column name"
                      className="mt-2 w-full px-4 py-2.5 bg-white border border-secondary-200 rounded-card text-secondary-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Helper Text */}
      <p className="text-sm text-secondary-500 mt-2">
        * Required fields. Each column must be unique.
      </p>
    </div>
  );
};

export default ColumnSelector;