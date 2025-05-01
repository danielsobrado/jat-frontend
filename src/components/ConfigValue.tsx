/**
 * ConfigValue is a reusable component for rendering configuration values of different types.
 * It handles special cases like sensitive data masking, boolean styling, and complex object display.
 *
 * @component
 * @example
 * ```tsx
 * <ConfigValue configKey="apiKey" value="secret" />        // Renders: ********
 * <ConfigValue configKey="enabled" value={true} />         // Renders: True (with green styling)
 * <ConfigValue configKey="items" value={[1, 2, 3]} />     // Renders: Array[3]
 * ```
 */
import React from 'react';

// Helper function to generate user-friendly labels from keys
export const getConfigLabel = (key: string): string => {
  // Replace underscores/camelCase with spaces and capitalize words
  const result = key
    .replace(/_/g, ' ') // Replace underscores with spaces
    .replace(/([A-Z])/g, ' $1') // Add space before uppercase letters
    .replace(/^./, (str) => str.toUpperCase()) // Capitalize first letter
    .trim();

  // Specific replacements for acronyms or common terms
  return result
    .replace(/Llm/g, 'LLM')
    .replace(/Api/g, 'API')
    .replace(/Id/g, 'ID')
    .replace(/Url/g, 'URL')
    .replace(/Db/g, 'DB')
    .replace(/Jwt/g, 'JWT')
    .replace(/Rag /g, 'RAG ') // Keep RAG capitalized
    .replace(/Unspsc/g, 'UNSPSC');
};

interface ConfigValueProps {
  /** The configuration key, used to determine if value should be masked */
  configKey: string;
  /** The value to render */
  value: any;
  /** Optional className for styling override */
  className?: string;
}

const ConfigValue: React.FC<ConfigValueProps> = ({ value, configKey, className = '' }): JSX.Element => {
  // Function to check if a value should be masked (for sensitive data)
  const shouldMaskValueByKey = (key: string): boolean => {
    const lowerKey = key.toLowerCase();
    const sensitiveKeys = ['password', 'apikey', 'secret', 'token']; // Add 'token'
    return sensitiveKeys.some(sensitiveKey => lowerKey.includes(sensitiveKey));
  };

  const isRedactedValue = (val: any): boolean => {
    return typeof val === 'string' && val.toUpperCase().includes('[REDACTED]');
  };

  if (value === null || value === undefined) {
    return <span className={`text-secondary-400 italic ${className}`}>Not set</span>;
  }

  // Check if backend already redacted it OR if key indicates sensitivity
  if (isRedactedValue(value) || shouldMaskValueByKey(configKey)) {
    return <span className={`text-secondary-700 font-mono ${className}`}>••••••••</span>; // Consistent masking
  }

  if (typeof value === 'boolean') {
    return (
      <span className={`px-2 py-0.5 text-xs rounded-full font-medium border ${className} ${
        value
          ? 'bg-green-100 text-green-800 border-green-200'
          : 'bg-red-100 text-red-800 border-red-200'
      }`}>
        {value ? 'Enabled' : 'Disabled'}
      </span>
    );
  }

   if (typeof value === 'object' && value !== null) {
     // Don't display complex objects directly, parent component will handle recursion
     return <span className={`text-secondary-500 italic ${className}`}>Object</span>;
   }

   // Render arrays as comma-separated list (or count)
   if (Array.isArray(value)) {
     if (value.length === 0) {
       return <span className={`text-secondary-400 italic ${className}`}>Empty List</span>;
     }
     const displayLimit = 5;
     const displayValue = value.slice(0, displayLimit).map(item => typeof item === 'object' ? '[Object]' : String(item)).join(', ');
     return (
       <span className={`text-secondary-700 ${className}`} title={value.join(', ')}>
         {displayValue}{value.length > displayLimit ? `... (${value.length} items)` : ''}
       </span>
     );
   }

  // Default: render as string
  return <span className={`text-secondary-700 ${className}`}>{String(value)}</span>;
};

export default ConfigValue;