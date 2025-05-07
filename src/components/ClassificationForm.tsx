import React, { useState, useEffect, ChangeEvent, FormEvent } from 'react';
import { InformationCircleIcon } from '@heroicons/react/24/outline'; // Import icon
import ReactMarkdown from 'react-markdown';
import {
  ApiClient,
  ClassificationResult,
  ClassificationSystem,
  ClassificationLevel,
  ManualClassificationRequest,
} from '../api/types';
import { ManualClassificationModal } from './ManualClassificationModal';
import { useAuth } from '../context/AuthContext'; // Import useAuth hook

interface ClassificationFormProps {
  apiClient: ApiClient;
  onResult?: (result: ClassificationResult) => void;
  onError?: (error: Error) => void;
}

export const ClassificationForm: React.FC<ClassificationFormProps> = ({
  apiClient,
  onResult,
  onError,
}) => {
  const { checkPermission } = useAuth(); // Get permission checker from auth context
  const [description, setDescription] = useState('');
  const [additionalContext, setAdditionalContext] = useState('');
  const [selectedSystem, setSelectedSystem] = useState<string>('UNSPSC');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ClassificationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [systems, setSystems] = useState<ClassificationSystem[]>([]);
  const [systemLevels, setSystemLevels] = useState<ClassificationLevel[]>([]);
  
  // Modal state
  const [showModal, setShowModal] = useState(false);
  
  // Active tab for LLM responses
  const [activeLlmTab, setActiveLlmTab] = useState<string | null>(null);
  
  // Level-specific LLM responses
  const [levelResponses, setLevelResponses] = useState<{[key: string]: string}>({});

  useEffect(() => {
    const loadSystems = async () => {
      try {
        const availableSystems = await apiClient.getClassificationSystems();
        setSystems(availableSystems);
        if (availableSystems.length > 0 && !selectedSystem) {
          setSelectedSystem(availableSystems[0].code);
        }
      } catch (error) {
        console.error('Failed to load classification systems:', error);
        setError('Failed to load classification systems');
      }
    };
    loadSystems();
  }, [apiClient]);

  useEffect(() => {
    const loadSystemLevels = async () => {
      if (!selectedSystem) return;
      try {
        const response = await apiClient.getClassificationSystem(selectedSystem);
        setSystemLevels(response.levels || []);
      } catch (error) {
        console.error('Failed to load system levels:', error);
        setError('Failed to load system levels');
      }
    };
    loadSystemLevels();
  }, [apiClient, selectedSystem]);

  // Set the active LLM tab when results are received
  useEffect(() => {
    if (result && systemLevels.length > 0) {
      // Find the first level with results
      const firstLevelCode = Object.keys(result.levels)[0] || systemLevels[0].code;
      setActiveLlmTab(firstLevelCode);
      
      // Check if the backend provided level-specific responses
      if (result.levelResponses && Object.keys(result.levelResponses).length > 0) {
        setLevelResponses(result.levelResponses);
      }
    }
  }, [result, systemLevels]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    // Clear previous results when starting a new classification
    setResult(null);
    setLevelResponses({});
    
    try {
      const classificationResult = await apiClient.classify(description, selectedSystem, additionalContext);
      setResult(classificationResult);
      
      // Check if the backend already provided level-specific responses
      if (classificationResult.levelResponses && Object.keys(classificationResult.levelResponses).length > 0) {
        setLevelResponses(classificationResult.levelResponses);
      }
      
      onResult?.(classificationResult);
    } catch (error) {
      let errorMessage = 'Classification failed';
      if (error instanceof Error) {
        if (error.message.includes('OpenRouter API request failed')) {
          errorMessage = 'LLM Service Authentication Error - Please check API configuration';
        } else {
          errorMessage = error.message;
        }
      }
      setError(errorMessage);
      onError?.(error instanceof Error ? error : new Error(errorMessage));
    } finally {
      setLoading(false);
    }
  };

  const handleDescriptionChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setDescription(e.target.value);
    setError(null);
  };

  const handleSystemChange = (e: ChangeEvent<HTMLSelectElement>) => {
    setSelectedSystem(e.target.value);
    setError(null);
    setResult(null);
    setLevelResponses({});
  };

  const handleManualClassification = async (manualResult: ClassificationResult) => {
    try {
      // Prepare the request payload according to ManualClassificationRequest interface
      const requestPayload: ManualClassificationRequest = {
        description: description,
        systemCode: selectedSystem,
        selectedSystem: selectedSystem, // As per interface, using selectedSystem state
        additionalContext: additionalContext,
        levels: Object.fromEntries(
          Object.entries(manualResult.levels).map(([levelCode, categoryLevel]) => [
            levelCode,
            categoryLevel.code, // Extract the code string
          ])
        ),
      };

      const updatedResult = await apiClient.classifyManually(requestPayload);
      setResult(updatedResult);

      // Use level-specific responses from the result if available
      if (updatedResult.levelResponses && Object.keys(updatedResult.levelResponses).length > 0) {
        setLevelResponses(updatedResult.levelResponses);
      }

      onResult?.(updatedResult);
    } catch (error) {
      console.error("Failed to save manual classification:", error);
      setError("Failed to save manual classification. Please try again.");
      onError?.(error instanceof Error ? error : new Error("Failed to save manual classification."));
    }
  };

  const getLevelClasses = (index: number): {bg: string, text: string} => {
    const colorClasses = [
      { bg: 'bg-blue-50', text: 'text-blue-600' },
      { bg: 'bg-indigo-50', text: 'text-indigo-600' },
      { bg: 'bg-purple-50', text: 'text-purple-600' },
      { bg: 'bg-pink-50', text: 'text-pink-600' },
      { bg: 'bg-rose-50', text: 'text-rose-600' },
      { bg: 'bg-orange-50', text: 'text-orange-600' },
      { bg: 'bg-amber-50', text: 'text-amber-600' },
      { bg: 'bg-emerald-50', text: 'text-emerald-600' }
    ];
    return colorClasses[index % colorClasses.length];
  };

  // Render markdown content
  const renderMarkdown = (content: string) => {
    return (
      <div className="text-xs text-secondary-600 whitespace-pre-wrap prose prose-sm max-w-none">
        <ReactMarkdown>
          {content}
        </ReactMarkdown>
      </div>
    );
  };

  const getStatusBadge = (status: 'success' | 'partial' | 'failed' | 'all') => {
    const classes = {
      success: 'bg-green-100 text-green-800 border-green-200',
      partial: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      failed: 'bg-red-100 text-red-800 border-red-200',
      all: 'bg-blue-100 text-blue-800 border-blue-200'
    };
    
    const labels = {
      success: 'Success',
      partial: 'Partial',
      failed: 'Failed',
      all: 'Complete'
    };

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${classes[status]}`}>
        {labels[status]}
      </span>
    );
  };

  return (
    <div className="max-w-8xl mx-auto space-y-10" style={{ minWidth: '40rem', paddingRight: '1rem', paddingLeft: '1rem'}}>
      <div className="bg-white shadow-card rounded-card p-8 w-full" style={{ paddingRight: '5rem', paddingLeft: '3rem'}}>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label htmlFor="system" className="block text-sm font-medium text-secondary-700">
              Classification System:
            </label>
            <select
              id="system"
              value={selectedSystem}
              onChange={handleSystemChange}
              className="w-full px-4 py-2.5 bg-white border border-secondary-200 rounded-card text-secondary-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              style={{ minWidth: '10rem', maxWidth: '30rem', paddingRight: '1rem', paddingLeft: '1rem'}}
            >
              {systems.map(system => (
                <option key={system.code} value={system.code}>
                  {system.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label htmlFor="description" className="block text-sm font-medium text-secondary-700">
              Product Description:
            </label>
            <textarea
              id="description"
              value={description}
              onChange={handleDescriptionChange}
              required
              rows={4}
              className="w-full px-4 py-2.5 bg-white border border-secondary-200 rounded-card text-secondary-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Enter product description..."
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="additionalContext" className="block text-sm font-medium text-secondary-700">
              Additional Context (Optional):
            </label>
            <textarea
              id="additionalContext"
              value={additionalContext}
              onChange={(e) => setAdditionalContext(e.target.value)}
              rows={3}
              className="w-full px-4 py-2.5 bg-white border border-secondary-200 rounded-card text-secondary-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Enter any additional context that might help with classification..."
            />
          </div>

          {error && (
            <div className="rounded-card border border-red-200 bg-red-50/50 px-4 py-3 text-red-700 text-sm">
              {error}
            </div>
          )}

          <div className="flex justify-end">
            <button
              className={`px-6 py-3 rounded-lg font-medium text-white ${
                loading || description.trim() === '' || !checkPermission('classify:item')
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2'
              }`}
              type="submit"
              disabled={loading || description.trim() === '' || !checkPermission('classify:item')}
              data-testid="classify-button"
              title={!checkPermission('classify:item') ? "You don't have permission to classify items" : ""}
            >
              {loading ? 'Classifying...' : 'Classify'}
            </button>
          </div>

          {!checkPermission('classify:item') && (
            <div className="p-4 border border-yellow-200 bg-yellow-50 rounded-md mt-4">
              <p className="text-yellow-800 text-sm">
                You don't have permission to perform classifications. Please contact your administrator.
              </p>
            </div>
          )}
        </form>
      </div>

      {result && (
        <div className="bg-white shadow-card rounded-card p-8 w-full">
          <div className="flex justify-between items-center mb-8">
            <div className="flex items-center gap-3">
              <h3 className="text-xl font-semibold text-secondary-900">
                Classification Results - {result.system_code}
              </h3>
              {getStatusBadge(result.status)}
            </div>
            <button
              onClick={() => setShowModal(true)}
              className="group relative inline-flex items-center gap-1.5 px-4 py-2.5 bg-white text-sm font-medium text-secondary-700 border border-secondary-200 rounded-lg hover:bg-secondary-50 hover:border-secondary-300 hover:text-secondary-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-all duration-200 shadow-sm"
            >
              <svg 
                className="w-4 h-4 text-secondary-500 group-hover:text-secondary-700 transition-colors" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" 
                />
              </svg>
              <span>Edit Classification</span>
              <div className="absolute inset-0 rounded-lg overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-primary-100 to-secondary-100 opacity-0 group-hover:opacity-10 transition-opacity"></div>
              </div>
            </button>
          </div>

          {result.error && (
            <div className="mb-6 rounded-lg border border-yellow-200 bg-yellow-50/50 px-4 py-3 text-yellow-800 text-sm">
              <p className="font-medium">Classification completed with issues:</p>
              <p className="mt-1">{result.error}</p>
            </div>
          )}
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Only show UNSPSC Type for UNSPSC system with valid segment classification */}
            {result.system_code === 'UNSPSC' && result.levels?.segment?.code && (
              <div className="lg:col-span-2 bg-white rounded-lg border border-secondary-200 p-6 shadow-sm">
                <div className="flex items-start space-x-4">
                  <div className="bg-primary-50 w-14 h-14 flex items-center justify-center rounded-xl shadow-sm">
                    <svg className="w-7 h-7 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <label className="block text-sm font-medium text-secondary-900 mb-1">UNSPSC Type</label>
                    <div className="flex items-center gap-2">
                      {/* UNSPSC Type based on segment code */}
                      {['1', '2', '3', '4'].some(prefix => result.levels.segment?.code?.startsWith(prefix)) ? (
                        <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full">GOOD</span>
                      ) : ['7', '8', '9'].some(prefix => result.levels.segment?.code?.startsWith(prefix)) ? (
                        <span className="bg-purple-100 text-purple-800 text-xs font-medium px-2.5 py-0.5 rounded-full">SERVICE</span>
                      ) : ['5', '6'].some(prefix => result.levels.segment?.code?.startsWith(prefix)) ? (
                        <span className="bg-amber-100 text-amber-800 text-xs font-medium px-2.5 py-0.5 rounded-full">OTHER</span>
                      ) : (
                        <span className="bg-gray-100 text-gray-800 text-xs font-medium px-2.5 py-0.5 rounded-full">UNCLASSIFIED</span>
                      )}
                      <span className="text-sm text-secondary-600">
                        {result.levels.segment ? `Based on segment code ${result.levels.segment.code}` : 'Segment not classified'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
            {systemLevels.map((level, index) => {
              const categoryLevel = result.levels[level.code];
              const colors = getLevelClasses(index);

              // If no categoryLevel exists for this level
              if (!categoryLevel) {
                return (
                  <div key={level.code} className="bg-white rounded-lg border border-red-200 p-6 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-start space-x-4">
                      <div className="bg-red-50 w-14 h-14 flex items-center justify-center rounded-xl shadow-sm shrink-0">
                        <span className="text-red-600 font-bold text-lg">
                          {String(index + 1).padStart(2, '0')}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <label className="block text-sm font-medium text-secondary-900 mb-1">{level.name}</label>
                        <div className="text-red-600 text-sm">
                          Failed to classify at this level
                        </div>
                      </div>
                    </div>
                  </div>
                );
              }
              
              return (
                <div key={level.code} className="bg-white rounded-lg border border-secondary-200 p-6 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-start space-x-4">
                    <div className={`${colors.bg} w-14 h-14 flex items-center justify-center rounded-xl shadow-sm shrink-0`}>
                      <span className={`${colors.text} font-bold text-lg`}>
                        {String(index + 1).padStart(2, '0')}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <label className="block text-sm font-medium text-secondary-900 mb-1">{level.name}</label>
                      <div className="space-y-1">
                        {categoryLevel.code === "NO_MATCH" ? (
                          <div className="text-red-600 font-medium text-sm">
                            No matching category found at this level
                          </div>
                        ) : (
                          <>
                            <div className="text-sm font-semibold text-secondary-800">{categoryLevel.code}</div>
                            <div className="text-sm text-secondary-600">{categoryLevel.name}</div>
                            {categoryLevel.description && categoryLevel.description !== categoryLevel.name && (
                              <div className="text-xs text-secondary-500 mt-1.5">{categoryLevel.description}</div>
                            )}
                            {categoryLevel.error && (
                              <div className="text-amber-600 text-xs mt-1.5">
                                {categoryLevel.error}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* RAG Context Display Section */}
          {result.ragContextUsed && (
            <div className="mt-6 pt-4 border-t border-secondary-200">
              <div className="flex items-center space-x-2 mb-2">
                <InformationCircleIcon className="h-5 w-5 text-blue-500" />
                <h4 className="text-sm font-medium text-secondary-700">
                  Context Used for Classification (from RAG)
                </h4>
              </div>
              <div className="text-xs bg-secondary-50 border border-secondary-200 rounded p-3 max-h-40 overflow-y-auto">
                <pre className="whitespace-pre-wrap font-mono text-secondary-600">
                  {result.ragContext || 'No specific context text available.'}
                </pre>
              </div>
            </div>
          )}

          {/* LLM Response Tabs */}
          {((result.levelResponses && Object.keys(result.levelResponses).length > 0) || Object.keys(levelResponses).length > 0) && (
            <div className="mt-6 pt-4 border-t border-secondary-200">
              <div className="flex items-center space-x-2 mb-2">
                <h4 className="text-sm font-medium text-secondary-700">
                  LLM Response by Level
                </h4>
              </div>
              
              {/* Tab Navigation */}
              <div className="border-b border-secondary-200">
                <nav className="flex -mb-px space-x-6 overflow-x-auto">
                  {systemLevels.filter(level => result.levels[level.code]).map((level) => (
                    <button
                      key={level.code}
                      onClick={() => setActiveLlmTab(level.code)}
                      className={`py-2 px-1 font-medium text-sm border-b-2 whitespace-nowrap ${
                        activeLlmTab === level.code
                          ? 'border-primary-500 text-primary-600'
                          : 'border-transparent text-secondary-500 hover:text-secondary-700 hover:border-secondary-300'
                      } transition-colors duration-200`}
                    >
                      {level.name} Classification
                    </button>
                  ))}
                </nav>
              </div>
              
              {/* Tab Panels */}
              <div className="mt-3">
                {systemLevels.filter(level => result.levels[level.code]).map((level) => (
                  <div 
                    key={level.code}
                    className={`${activeLlmTab === level.code ? 'block' : 'hidden'} text-xs bg-secondary-50 border border-secondary-200 rounded p-3 max-h-60 overflow-y-auto`}
                  >
                    {renderMarkdown(levelResponses[level.code] || 'No LLM response available for this level.')}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <ManualClassificationModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSubmit={handleManualClassification}
        apiClient={apiClient}
        description={description}
        systemCode={selectedSystem}
        initialLevels={result?.levels ? Object.fromEntries(
          Object.entries(result.levels).map(([code, category]) => [code, category.code])
        ) : undefined}
      />
    </div>
  );
};
