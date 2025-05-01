import React, { useState, useEffect } from 'react';
import { ClassificationHistory } from '../api/types';
import { formatDate } from '../utils/dateFormat';
import ReactMarkdown from 'react-markdown';

interface ClassificationDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: ClassificationHistory | null;
}

export const ClassificationDetailsModal: React.FC<ClassificationDetailsModalProps> = ({
  isOpen,
  onClose,
  item
}) => {
  const [activeTab, setActiveTab] = useState<'details' | 'rag' | 'llm' | 'prompt'>('details');
  const [activeLlmTab, setActiveLlmTab] = useState<string | null>(null);
  
  // Set initial active LLM tab when data changes
  useEffect(() => {
    if (item?.levelResponses && Object.keys(item.levelResponses).length > 0) {
      const firstLevelCode = Object.keys(item.levelResponses)[0];
      setActiveLlmTab(firstLevelCode);
      console.log('Setting active LLM tab to:', firstLevelCode);
      console.log('Available levelResponses:', item.levelResponses);
    } else {
      console.log('No levelResponses available:', item?.levelResponses);
      console.log('Full item structure:', JSON.stringify(item, null, 2));
    }
  }, [item]);

  // Debug each level's LLM response availability and prompt details
  useEffect(() => {
    if (item) {
      console.log('[Debug] Item object in modal:', item);
      // Check for missing essential properties
      console.log('[Debug] Missing properties check:', {
        hasSystemCode: !!item.systemCode,
        hasSourceType: !!item.sourceType,
        hasRagContext: !!item.ragContext,
        hasRagContextUsed: item.ragContextUsed !== undefined,
        hasPrompt: !!item.prompt
      });
      
      // Debug prompt field specifically
      console.log('[Debug] Prompt field:', {
        type: typeof item.prompt,
        value: item.prompt,
        length: item.prompt ? item.prompt.length : 0,
        isNull: item.prompt === null,
        isUndefined: item.prompt === undefined,
        isEmpty: item.prompt === ''
      });
      
      Object.keys(item.levels || {}).forEach(level => {
        console.log(`[Debug] Level: ${level}, LevelResponses: ${item.levelResponses?.[level] ? 'available' : 'undefined'}`);
      });
    }
  }, [item]);

  if (!isOpen || !item) {
    return null;
  }

  // Get all level codes that have LLM responses
  const getLevelsWithResponses = () => {
    // Only check for levelResponses - no backward compatibility needed
    if (item?.levelResponses && Object.keys(item.levelResponses).length > 0) {
      return Object.keys(item.levelResponses);
    }
    
    // No responses found
    return [];
  };
  
  const levelsWithResponses = getLevelsWithResponses();
  
  // Get the LLM response for a specific level
  const getLevelResponse = (levelCode: string): string => {
    // Get from levelResponses if available
    if (item?.levelResponses && item.levelResponses[levelCode]) {
      return item.levelResponses[levelCode];
    }
    
    // No response available
    return 'No LLM response available for this level';
  };

  // Format RAG Context for better readability
  const formatRagContext = (ragContext: string) => {
    return ragContext.split('\n\n').map((section, index) => (
      <div key={index} className="mb-4">
        {section.split('\n').map((line, lineIndex) => (
          <div key={lineIndex} className={lineIndex === 0 ? 'font-medium' : 'ml-4'}>
            {line}
          </div>
        ))}
      </div>
    ));
  };

  // Render markdown content
  const renderMarkdown = (content: string) => {
    return (
      <div className="text-sm text-secondary-900 whitespace-pre-wrap prose prose-sm max-w-none">
        <ReactMarkdown>
          {content}
        </ReactMarkdown>
      </div>
    );
  };

  // Get level name from code
  const getLevelName = (levelCode: string): string => {
    // Common mapping of level codes to friendly names
    const levelNames: Record<string, string> = {
      'segment': 'Segment',
      'family': 'Family',
      'class': 'Class',
      'commodity': 'Commodity',
      'SUBCAT1': 'Subcategory 1',
      'SUBCAT2': 'Subcategory 2'
    };
    
    return levelNames[levelCode] || levelCode;
  };

  // Correct label for sourceType
  const getSourceTypeLabel = (sourceType: string): string => {
    console.log('Getting source type label for:', sourceType);
    
    if (!sourceType) return 'Unknown';
    
    const sourceTypeLower = sourceType.toLowerCase();
    
    if (sourceTypeLower.includes('user') || sourceTypeLower.includes('manual')) {
      return 'Manual Input';
    } else if (sourceTypeLower.includes('batch')) {
      return 'Batch';
    } else if (sourceTypeLower.includes('api')) {
      return 'API Input';
    }
    
    return sourceType; // Return the original if no match
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black opacity-30" onClick={onClose}></div>
      
      {/* Modal Content */}
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-5xl mx-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="border-b border-secondary-200 px-6 py-4 flex justify-between items-center">
          <h3 className="text-xl font-semibold text-secondary-900 flex items-center">
            Classification Details
            <span className={`ml-3 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
              item.status === 'success' ? 'bg-green-100 text-green-800 border-green-200' : 
              item.status === 'partial' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' : 
              'bg-red-100 text-red-800 border-red-200'
            }`}>
              {item.status === 'success' ? 'Success' : 
               item.status === 'partial' ? 'Partial' : 
               'Failed'}
            </span>
          </h3>
          <button 
            onClick={onClose}
            className="text-secondary-500 hover:text-secondary-700 transition-colors"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {/* Tabs */}
        <div className="border-b border-secondary-200 px-6">
          <div className="flex space-x-6">
            <button
              className={`py-3 text-sm font-medium border-b-2 ${
                activeTab === 'details' 
                  ? 'border-primary-500 text-primary-600' 
                  : 'border-transparent text-secondary-500 hover:text-secondary-700 hover:border-secondary-300'
              } transition-colors`}
              onClick={() => setActiveTab('details')}
            >
              Classification Details
            </button>
            <button
              className={`py-3 text-sm font-medium border-b-2 ${
                activeTab === 'rag' 
                  ? 'border-primary-500 text-primary-600' 
                  : 'border-transparent text-secondary-500 hover:text-secondary-700 hover:border-secondary-300'
              } transition-colors`}
              onClick={() => setActiveTab('rag')}
              disabled={!item.ragContextUsed}
            >
              RAG Context
              {item.ragContextUsed && (
                <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-700">
                  Used
                </span>
              )}
            </button>
            <button
              className={`py-3 text-sm font-medium border-b-2 ${
                activeTab === 'llm' 
                  ? 'border-primary-500 text-primary-600' 
                  : 'border-transparent text-secondary-500 hover:text-secondary-700 hover:border-secondary-300'
              } transition-colors`}
              onClick={() => setActiveTab('llm')}
              disabled={!item.levelResponses || Object.keys(item.levelResponses).length === 0}
            >
              LLM Responses
              {item.levelResponses && Object.keys(item.levelResponses).length > 0 && (
                <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-700">
                  {Object.keys(item.levelResponses).length}
                </span>
              )}
            </button>
            <button
              className={`py-3 text-sm font-medium border-b-2 ${
                activeTab === 'prompt' 
                  ? 'border-primary-500 text-primary-600' 
                  : 'border-transparent text-secondary-500 hover:text-secondary-700 hover:border-secondary-300'
              } transition-colors`}
              onClick={() => setActiveTab('prompt')}
              disabled={!item.prompt}
            >
              Prompt
            </button>
          </div>
        </div>
        
        {/* Content */}
        <div className="px-6 py-4 overflow-y-auto flex-grow">
          {activeTab === 'details' && (
            <div className="space-y-6">
              {/* Basic Information */}
              <div>
                <h4 className="text-lg font-medium text-secondary-900 mb-3">Basic Information</h4>
                <div className="bg-secondary-50 rounded-lg p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-secondary-500">Description</p>
                    <p className="text-sm text-secondary-900 mt-1">{item.description}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-secondary-500">System</p>
                    <p className="text-sm text-secondary-900 mt-1">{item.systemCode}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-secondary-500">Created At</p>
                    <p className="text-sm text-secondary-900 mt-1">{formatDate(item.createdAt).fullText}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-secondary-500">Source</p>
                    <p className="text-sm text-secondary-900 mt-1">{getSourceTypeLabel(item.sourceType)}</p>
                  </div>
                  {item.additionalContext && (
                    <div className="col-span-2">
                      <p className="text-sm font-medium text-secondary-500">Additional Context</p>
                      <p className="text-sm text-secondary-900 mt-1 whitespace-pre-wrap">{item.additionalContext}</p>
                    </div>
                  )}
                  {item.error && (
                    <div className="col-span-2">
                      <p className="text-sm font-medium text-red-500">Error</p>
                      <p className="text-sm text-red-700 mt-1">{item.error}</p>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Classification Result */}
              <div>
                <h4 className="text-lg font-medium text-secondary-900 mb-3">Classification Result</h4>
                <div className="bg-secondary-50 rounded-lg p-4">
                  <div className="space-y-3">
                    {Object.entries(item.levels || {})
                      .sort(([a], [b]) => {
                        const levelOrder: Record<string, number> = {
                          'SUBCAT1': 1,
                          'SUBCAT2': 2,
                          'segment': 1,
                          'family': 2,
                          'class': 3,
                          'commodity': 4
                        };
                        
                        if ((a.startsWith('SUBCAT') && b.startsWith('SUBCAT')) ||
                            (!a.startsWith('SUBCAT') && !b.startsWith('SUBCAT'))) {
                          return (levelOrder[a] ?? 99) - (levelOrder[b] ?? 99);
                        }
                        return a.localeCompare(b);
                      })
                      .map(([levelCode, category]) => {
                        // Use type assertion to tell TypeScript about category structure
                        const typedCategory = category as {
                          code: string;
                          name: string;
                          description?: string;
                          error?: string;
                        };
                        
                        return (
                          <div key={levelCode} className="pb-3 border-b border-secondary-200 last:border-0 last:pb-0">
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="text-sm font-medium text-secondary-700">{levelCode}</p>
                                <p className="text-base font-medium text-secondary-900 mt-1">{typedCategory.code} - {typedCategory.name}</p>
                                {typedCategory.description && (
                                  <p className="text-sm text-secondary-600 mt-1">{typedCategory.description}</p>
                                )}
                              </div>
                              {typedCategory.error && (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-200">
                                  Error
                                </span>
                              )}
                            </div>
                            {typedCategory.error && (
                              <p className="text-sm text-red-600 mt-2">{typedCategory.error}</p>
                            )}
                            {item.levelResponses?.[levelCode] && (
                              <div className="mt-2 pl-4 border-l-2 border-secondary-200">
                                <div className="flex items-center">
                                  <p className="text-xs font-medium text-secondary-500 mb-1 mr-2">LLM Rationale:</p>
                                  <button 
                                    className="text-xs text-primary-600 hover:text-primary-800 underline"
                                    onClick={() => {
                                      setActiveTab('llm');
                                      setActiveLlmTab(levelCode);
                                    }}
                                  >
                                    View Full Response
                                  </button>
                                </div>
                                <div className="text-sm text-secondary-700 line-clamp-3">
                                  {renderMarkdown(item.levelResponses[levelCode])}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })
                    }
                    {(!item.levels || Object.keys(item.levels).length === 0) && (
                      <p className="text-sm text-secondary-500 italic">No classification levels available</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {activeTab === 'rag' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-lg font-medium text-secondary-900">RAG Context</h4>
                {item.ragContextUsed ? (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
                    Used in Classification
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200">
                    Not Used
                  </span>
                )}
              </div>
              <div className="bg-secondary-50 rounded-lg p-4 overflow-x-auto">
                {item.ragContext ? (
                  <div className="text-sm text-secondary-900 font-mono whitespace-pre-wrap">
                    {formatRagContext(item.ragContext)}
                  </div>
                ) : (
                  <p className="text-sm text-secondary-500 italic">No RAG context available</p>
                )}
              </div>
            </div>
          )}
          
          {activeTab === 'llm' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-lg font-medium text-secondary-900">LLM Responses By Level</h4>
                {!item.levelResponses && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">
                    Using shared response
                  </span>
                )}
              </div>
              
              {levelsWithResponses.length > 0 ? (
                <div>
                  {/* Tab Navigation */}
                  <div className="border-b border-secondary-200 mb-4">
                    <nav className="flex -mb-px space-x-6 overflow-x-auto">
                      {levelsWithResponses.map((levelCode) => (
                        <button
                          key={levelCode}
                          onClick={() => setActiveLlmTab(levelCode)}
                          className={`py-2 px-1 font-medium text-sm border-b-2 whitespace-nowrap ${
                            activeLlmTab === levelCode
                              ? 'border-primary-500 text-primary-600'
                              : 'border-transparent text-secondary-500 hover:text-secondary-700 hover:border-secondary-300'
                          } transition-colors duration-200`}
                        >
                          {getLevelName(levelCode)} Classification
                        </button>
                      ))}
                    </nav>
                  </div>
                  
                  {/* Tab Panels */}
                  <div className="bg-secondary-50 rounded-lg p-4 overflow-x-auto">
                    {levelsWithResponses.map((levelCode) => (
                      <div 
                        key={levelCode}
                        className={`${activeLlmTab === levelCode ? 'block' : 'hidden'}`}
                      >
                        <div className="flex items-center mb-2">
                          <h5 className="text-sm font-semibold text-secondary-800">
                            {getLevelName(levelCode)} Classification Reasoning:
                          </h5>
                        </div>
                        <div className="text-sm text-secondary-900">
                          {renderMarkdown(getLevelResponse(levelCode))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="bg-secondary-50 rounded-lg p-6 text-center">
                  <p className="text-sm text-secondary-500">No LLM responses available for this classification</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'prompt' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-lg font-medium text-secondary-900">Full Prompt</h4>
              </div>
              <div className="bg-secondary-50 rounded-lg p-4 overflow-x-auto">
                {item.prompt ? (
                  <div className="text-sm text-secondary-900 font-mono whitespace-pre-wrap">
                    {item.prompt}
                  </div>
                ) : (
                  <p className="text-sm text-secondary-500 italic">No prompt available</p>
                )}
              </div>
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="border-t border-secondary-200 px-6 py-4 flex justify-end">
          <button
            onClick={onClose}
            className="inline-flex items-center px-4 py-2 border border-secondary-300 text-sm font-medium rounded-md text-secondary-700 bg-white hover:bg-secondary-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ClassificationDetailsModal;