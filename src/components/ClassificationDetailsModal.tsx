// src/components/ClassificationDetailsModal.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { ClassificationHistory, CategoryLevel } from '../api/types';
import { formatDate } from '../utils/dateFormat'; 
import ReactMarkdown from 'react-markdown';
// import { InformationCircleIcon } from '@heroicons/react/24/outline'; // Removed unused import

interface ClassificationDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: ClassificationHistory | null;
}

// Define informationalErrorMessages locally or import if shared
const informationalErrorMessages = [
  "Classification failed to determine required levels",
  "Classification failed to determine required levels.",
  "No matching category found at this level",
  "Failed to classify at this level",
  "Classification is partial; some levels may be missing or invalid.",
  "Classification is partial.", // Added from strategy_standard
  "Classification failed.", // Added from strategy_standard
  "Level not classified.", // Common pattern for level-specific messages
  "No match found for level", // Common pattern for no-match messages
];

const isInformationalError = (errorMessage?: string): boolean => {
  if (!errorMessage) return false;
  const lowerMessage = errorMessage.toLowerCase();
  return informationalErrorMessages.some(msg => lowerMessage.includes(msg.toLowerCase()));
};


export const ClassificationDetailsModal: React.FC<ClassificationDetailsModalProps> = ({
  isOpen,
  onClose,
  item
}) => {
  const [activeTab, setActiveTab] = useState<'details' | 'rag' | 'llm' | 'prompt'>('details');
  const [activeLlmTab, setActiveLlmTab] = useState<string | null>(null);
  const [activePromptTab, setActivePromptTab] = useState<string | null>(null);
  const levelOrder: Record<string, number> = useMemo(() => ({ 
    'segment': 1, 'family': 2, 'class': 3, 'commodity': 4,
    'subcat1': 1, 'subcat2': 2, 'default': 99, 'first_level': 0, 
    'first_level_prompt_only': 0, 'error_prompt': 0
  }), []);

  const parsedPrompts = useMemo(() => {
    if (item?.allPromptsDetail) { // allPromptsDetail is now string | undefined
      try {
        const parsed = JSON.parse(item.allPromptsDetail);
        if (typeof parsed === 'object' && parsed !== null) {
          return parsed as Record<string, string>;
        }
        console.warn("Parsed allPromptsDetail is not an object:", parsed);
        // Fallback if JSON is valid but not an object
      } catch (e) {
        console.error("Failed to parse allPromptsDetail JSON:", e, "\nContent:", item.allPromptsDetail);
        // Fall through to firstLevelPrompt if parsing fails
      }
    }
    
    // Fallback to firstLevelPrompt if allPromptsDetail is missing, unparsable, or not an object
    if (item?.firstLevelPrompt) {
        // Try to determine a sensible key for the first level prompt
        let firstLevelKey = "first_level_prompt"; // Default key
        if (item.levels && Object.keys(item.levels).length > 0) {
            const sortedLevels = Object.keys(item.levels).sort((a,b) => (levelOrder[a.toLowerCase()] ?? 99) - (levelOrder[b.toLowerCase()] ?? 99));
            if (sortedLevels.length > 0) {
                firstLevelKey = sortedLevels[0];
            }
        } else if (item.allPromptsDetail && item.allPromptsDetail.includes("error_prompt")){ 
            // Special case for error prompt
            firstLevelKey = "error_prompt";
        }
        return { [firstLevelKey]: item.firstLevelPrompt };
    }
    return null;
  }, [item?.allPromptsDetail, item?.firstLevelPrompt, item?.levels, levelOrder]);

  const sortedLevelCodesForTabs = useMemo(() => {
    if (!item) return [];
    const levelCodes = new Set<string>();
    
    // From LLM Responses
    if (item.levelResponses) {
        Object.keys(item.levelResponses).forEach(lc => levelCodes.add(lc));
    }
    
    // From Parsed Prompts
    if (parsedPrompts) {
        Object.keys(parsedPrompts).forEach(lc => levelCodes.add(lc));
    }
    
    // From actual classification levels (if available and others are not)
    if (levelCodes.size === 0 && item.levels) {
        Object.keys(item.levels).forEach(lc => levelCodes.add(lc));
    }
    
    return Array.from(levelCodes).sort((a, b) => 
      (levelOrder[a.toLowerCase()] ?? levelOrder['default']) - (levelOrder[b.toLowerCase()] ?? levelOrder['default']) || a.localeCompare(b)
    );
  }, [item, parsedPrompts, levelOrder]);
  useEffect(() => {
    if (isOpen) {
      setActiveTab('details');
      if (sortedLevelCodesForTabs.length > 0) {
        const firstTabKey = sortedLevelCodesForTabs[0];
        setActiveLlmTab(firstTabKey);
        setActivePromptTab(firstTabKey);
      } else {
        // If no specific level tabs, but a firstLevelPrompt exists, set activePromptTab to a generic key
        if (item?.firstLevelPrompt && parsedPrompts && Object.keys(parsedPrompts).length > 0) {
            setActivePromptTab(Object.keys(parsedPrompts)[0]); // Use the key from parsedPrompts
        } else {
            setActivePromptTab(null);
        }
        setActiveLlmTab(null);
      }
    }
  }, [isOpen, sortedLevelCodesForTabs, item?.firstLevelPrompt, parsedPrompts]);

  if (!isOpen || !item) {
    return null;
  }

  const getLevelResponse = (levelCode: string): string => {
    return item?.levelResponses?.[levelCode] || 'No LLM response available for this level.';
  };

  const getLevelPrompt = (levelCode: string): string => {
    return parsedPrompts?.[levelCode] || item?.firstLevelPrompt || 'No prompt available for this level.';
  }

  const formatRagContext = (ragContext: string) => { 
    return ragContext.split('\n\n').map((section, index) => (
      <div key={index} className="mb-4">
        {section.split('\n').map((line, lineIndex) => (
          <div key={lineIndex} className={lineIndex === 0 && !line.startsWith('- ') ? 'font-medium text-secondary-700' : line.startsWith('- ') ? 'ml-2 text-secondary-600' : 'ml-4 text-secondary-600'}>
            {line}
          </div>
        ))}
      </div>
    ));
  };

  const renderMarkdown = (content: string) => { 
    return (
      <div className="text-sm text-secondary-900 whitespace-pre-wrap prose prose-sm max-w-none">
        <ReactMarkdown>{content}</ReactMarkdown>
      </div>
    );
  };

  const getLevelName = (levelCode: string): string => { 
    const levelNames: Record<string, string> = {
      'segment': 'Segment', 'family': 'Family', 'class': 'Class', 'commodity': 'Commodity',
      'subcat1': 'Subcategory 1', 'subcat2': 'Subcategory 2'
    };
    return levelNames[levelCode.toLowerCase()] || levelCode;
  };

  const getSourceTypeLabel = (sourceType: string): string => { 
    if (!sourceType) return 'Unknown';
    const stLower = sourceType.toLowerCase();
    if (stLower.includes('user') || stLower.includes('manual')) return 'Manual Input';
    if (stLower.includes('batch')) return 'Batch';
    if (stLower.includes('api')) return 'API Input';
    return sourceType;
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
      <div className="fixed inset-0 bg-black opacity-30" onClick={onClose}></div>
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-5xl mx-auto max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="border-b border-secondary-200 px-6 py-4 flex justify-between items-center sticky top-0 bg-white z-10">
          <h3 className="text-xl font-semibold text-secondary-900 flex items-center">
            Classification Details
            <span className={`ml-3 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
              item.status === 'success' ? 'bg-green-100 text-green-800 border-green-200' : 
              item.status === 'partial' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' : 
              'bg-red-100 text-red-800 border-red-200'
            }`}>
              {item.status === 'success' ? 'Success' : item.status === 'partial' ? 'Partial' : 'Failed'}
            </span>
          </h3>
          <button onClick={onClose} className="text-secondary-500 hover:text-secondary-700 transition-colors">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {/* Tabs */}
        <div className="border-b border-secondary-200 px-6 sticky top-[65px] bg-white z-10"> {/* Adjust top based on header height */}
          <div className="flex space-x-6 overflow-x-auto">
            <button
              className={`py-3 text-sm font-medium border-b-2 whitespace-nowrap ${ activeTab === 'details' ? 'border-primary-500 text-primary-600' : 'border-transparent text-secondary-500 hover:text-secondary-700 hover:border-secondary-300'} transition-colors`}
              onClick={() => setActiveTab('details')}
            > Classification Details </button>
            <button
              className={`py-3 text-sm font-medium border-b-2 whitespace-nowrap ${ activeTab === 'rag' ? 'border-primary-500 text-primary-600' : 'border-transparent text-secondary-500 hover:text-secondary-700 hover:border-secondary-300'} transition-colors`}
              onClick={() => setActiveTab('rag')} disabled={!item.ragContextUsed}
            > RAG Context {item.ragContextUsed && (<span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-700">Used</span>)}</button>
            <button
              className={`py-3 text-sm font-medium border-b-2 whitespace-nowrap ${ activeTab === 'llm' ? 'border-primary-500 text-primary-600' : 'border-transparent text-secondary-500 hover:text-secondary-700 hover:border-secondary-300'} transition-colors`}
              onClick={() => setActiveTab('llm')} disabled={!item.levelResponses || sortedLevelCodesForTabs.length === 0}
            > LLM Responses {item.levelResponses && sortedLevelCodesForTabs.length > 0 && (<span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-700">{sortedLevelCodesForTabs.length}</span>)}</button>
            <button
              className={`py-3 text-sm font-medium border-b-2 whitespace-nowrap ${ activeTab === 'prompt' ? 'border-primary-500 text-primary-600' : 'border-transparent text-secondary-500 hover:text-secondary-700 hover:border-secondary-300'} transition-colors`}
              onClick={() => setActiveTab('prompt')} disabled={!parsedPrompts && !item.firstLevelPrompt}
            > Prompts </button>
          </div>
        </div>
        
        {/* Content */}
        <div className="px-6 py-4 overflow-y-auto flex-grow">
          {activeTab === 'details' && ( 
            <div className="space-y-6">
              <div>
                <h4 className="text-lg font-medium text-secondary-900 mb-3">Basic Information</h4>
                <div className="bg-secondary-50 rounded-lg p-4 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                  <div><p className="text-sm font-medium text-secondary-500">Description</p><p className="text-sm text-secondary-900 mt-1 break-words">{item.description}</p></div>
                  <div><p className="text-sm font-medium text-secondary-500">System</p><p className="text-sm text-secondary-900 mt-1">{item.systemCode}</p></div>
                  <div><p className="text-sm font-medium text-secondary-500">Created At</p>
                    <p className="text-sm text-secondary-900 mt-1" title={formatDate(item.createdAt, {includeTimezone: true}).fullText}>
                        {formatDate(item.createdAt).displayText}
                    </p>
                  </div>
                  <div><p className="text-sm font-medium text-secondary-500">Source</p><p className="text-sm text-secondary-900 mt-1">{getSourceTypeLabel(item.sourceType)}</p></div>
                  {item.key && (<div className="md:col-span-1"><p className="text-sm font-medium text-secondary-500">Item Key</p><p className="text-sm text-secondary-900 mt-1 break-words">{item.key}</p></div>)}
                  {item.additionalContext && (<div className="md:col-span-2"><p className="text-sm font-medium text-secondary-500">Additional Context</p><p className="text-sm text-secondary-900 mt-1 whitespace-pre-wrap">{item.additionalContext}</p></div>)}
                  {item.error && (
                    <div className="md:col-span-2">
                      <p className={`text-sm font-medium ${isInformationalError(item.error) ? 'text-yellow-600' : 'text-red-600'}`}>Error/Note</p>
                      <p className={`text-sm mt-1 ${isInformationalError(item.error) ? 'text-yellow-700' : 'text-red-700'}`}>{item.error}</p>
                    </div>
                  )}
                </div>
              </div>
              <div>
                <h4 className="text-lg font-medium text-secondary-900 mb-3">Classification Result</h4>
                <div className="bg-secondary-50 rounded-lg p-4">
                  <div className="space-y-3">
                    {Object.entries(item.levels || {}).sort(([aCode], [bCode]) => {
                        const orderA = levelOrder[aCode.toLowerCase()] ?? levelOrder['default'];
                        const orderB = levelOrder[bCode.toLowerCase()] ?? levelOrder['default'];
                        return orderA - orderB || aCode.localeCompare(bCode);
                      }).map(([levelCode, category]) => {
                        const typedCategory = category as CategoryLevel; 
                        return (
                          <div key={levelCode} className="pb-3 border-b border-secondary-200 last:border-b-0 last:pb-0">
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="text-sm font-medium text-secondary-700">{getLevelName(levelCode)}</p>
                                <p className="text-base font-medium text-secondary-900 mt-1">{typedCategory.code} - {typedCategory.name}</p>
                                {typedCategory.description && typedCategory.description !== typedCategory.name && (<p className="text-sm text-secondary-600 mt-1">{typedCategory.description}</p>)}
                              </div>
                              {typedCategory.error && (<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-200">Error</span>)}
                            </div>
                            {typedCategory.error && (<p className="text-sm text-red-600 mt-2">{typedCategory.error}</p>)}
                            {item.levelResponses?.[levelCode] && (
                              <div className="mt-2 pl-4 border-l-2 border-secondary-200">
                                <div className="flex items-center"><p className="text-xs font-medium text-secondary-500 mb-1 mr-2">LLM Rationale:</p>
                                  <button className="text-xs text-primary-600 hover:text-primary-800 underline" onClick={() => { setActiveTab('llm'); setActiveLlmTab(levelCode);}}>View Full Response</button>
                                </div>
                                <div className="text-sm text-secondary-700 line-clamp-3">{renderMarkdown(item.levelResponses[levelCode])}</div>
                              </div>
                            )}
                          </div>);})}
                    {(!item.levels || Object.keys(item.levels).length === 0) && (<p className="text-sm text-secondary-500 italic">No classification levels available.</p>)}
                  </div></div></div></div>
          )}
          
          {activeTab === 'rag' && ( 
            <div>
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-lg font-medium text-secondary-900">RAG Context</h4>
                {item.ragContextUsed ? (<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">Used</span>)
                : (<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200">Not Used</span>)}
              </div>
              <div className="bg-secondary-50 rounded-lg p-4 overflow-x-auto max-h-96"> {/* Added max-h-96 */}
                {item.ragContext ? (<div className="text-sm text-secondary-900 font-mono whitespace-pre-wrap">{formatRagContext(item.ragContext)}</div>)
                : (<p className="text-sm text-secondary-500 italic">No RAG context available</p>)}
              </div></div>
          )}
          
          {activeTab === 'llm' && ( 
             <div>
              <h4 className="text-lg font-medium text-secondary-900 mb-3">LLM Responses by Level</h4>
              {sortedLevelCodesForTabs.length > 0 && item.levelResponses ? (
                <div>
                  <div className="border-b border-secondary-200 mb-4">
                    <nav className="flex -mb-px space-x-4 overflow-x-auto">
                      {sortedLevelCodesForTabs.map((levelCode) => (
                        item.levelResponses?.[levelCode] && // Only show tab if response exists
                        <button key={`llm-tab-${levelCode}`} onClick={() => setActiveLlmTab(levelCode)}
                          className={`py-2 px-1 font-medium text-sm border-b-2 whitespace-nowrap ${activeLlmTab === levelCode ? 'border-primary-500 text-primary-600' : 'border-transparent text-secondary-500 hover:text-secondary-700 hover:border-secondary-300'} transition-colors`}
                        >{getLevelName(levelCode)}</button>
                      ))}
                    </nav>
                  </div>
                  <div className="bg-secondary-50 rounded-lg p-4 overflow-x-auto max-h-80">
                    {sortedLevelCodesForTabs.map((levelCode) => (
                      item.levelResponses?.[levelCode] &&
                      <div key={`llm-panel-${levelCode}`} className={`${activeLlmTab === levelCode ? 'block' : 'hidden'}`}>
                        <div className="text-sm text-secondary-900">{renderMarkdown(getLevelResponse(levelCode))}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (<div className="bg-secondary-50 rounded-lg p-6 text-center"><p className="text-sm text-secondary-500">No LLM responses available.</p></div>)}
            </div>
          )}

          {activeTab === 'prompt' && ( 
            <div>
              <h4 className="text-lg font-medium text-secondary-900 mb-3">Prompts by Level</h4>
              {parsedPrompts && sortedLevelCodesForTabs.length > 0 ? (
                <div>
                  <div className="border-b border-secondary-200 mb-4">
                    <nav className="flex -mb-px space-x-4 overflow-x-auto">
                      {sortedLevelCodesForTabs.map((levelCode) => (
                         parsedPrompts[levelCode] && 
                        <button key={`prompt-tab-${levelCode}`} onClick={() => setActivePromptTab(levelCode)}
                          className={`py-2 px-1 font-medium text-sm border-b-2 whitespace-nowrap ${activePromptTab === levelCode ? 'border-primary-500 text-primary-600' : 'border-transparent text-secondary-500 hover:text-secondary-700 hover:border-secondary-300'} transition-colors`}
                        >{getLevelName(levelCode)}</button>
                      ))}
                    </nav>
                  </div>
                  <div className="bg-secondary-50 rounded-lg p-4 overflow-x-auto max-h-80">
                    {sortedLevelCodesForTabs.map((levelCode) => (
                      parsedPrompts[levelCode] && 
                      <div key={`prompt-panel-${levelCode}`} className={`${activePromptTab === levelCode ? 'block' : 'hidden'}`}>
                        <div className="text-sm text-secondary-900 font-mono whitespace-pre-wrap">
                          {getLevelPrompt(levelCode)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : item?.firstLevelPrompt ? (
                <div className="bg-secondary-50 rounded-lg p-4 overflow-x-auto max-h-96">
                  <p className="text-sm font-medium text-secondary-700 mb-1">First Level Prompt:</p>
                  <div className="text-sm text-secondary-900 font-mono whitespace-pre-wrap">
                    {item.firstLevelPrompt}
                  </div>
                </div>
              ) : (
                <div className="bg-secondary-50 rounded-lg p-6 text-center">
                  <p className="text-sm text-secondary-500">No prompt details available.</p>
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="border-t border-secondary-200 px-6 py-4 flex justify-end sticky bottom-0 bg-white z-10">
          <button onClick={onClose} className="btn btn-secondary">Close</button>
        </div>
      </div>
    </div>
  );
};

export default ClassificationDetailsModal;