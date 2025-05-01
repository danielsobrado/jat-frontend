import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Select, { 
  SingleValue, 
  InputActionMeta,
  GroupBase 
} from 'react-select';
import debounce from 'lodash/debounce';
import {
  ApiClient,
  ClassificationLevel,
  Category,
  ManualClassificationRequest,
  ClassificationResult,
  SystemCategoriesRequest
} from '../api/types';

// Constants
const SEARCH_DEBOUNCE_MS = 300;
const MIN_SEARCH_CHARS = 2;
const SELECT_STYLES = {
  menuPortal: (base: any) => ({ ...base, zIndex: 9999 }),
  menu: (base: any) => ({ ...base, zIndex: 9999 })
};

// Types
interface CategoryOption {
  value: string;
  label: string;
  data: Category;
}

interface ManualClassificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (result: ClassificationResult) => void;
  apiClient: ApiClient;
  description: string;
  systemCode: string;
  initialLevels?: { [levelCode: string]: string };
}

interface LevelState {
  loading: boolean;
  error: string | null;
  options: Category[];
}

// Initial state
const INITIAL_LEVEL_STATE: LevelState = {
  loading: false,
  error: null,
  options: []
};

// Utility functions
const transformCategoryToOption = (category: Category): CategoryOption => ({
  value: category.code,
  label: `${category.code} - ${category.name}`,
  data: category
});

const transformCategoriesToOptions = (categories: Category[]): CategoryOption[] => 
  categories.map(transformCategoryToOption);

export const ManualClassificationModal: React.FC<ManualClassificationModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  apiClient,
  description,
  systemCode,
  initialLevels,
}) => {
  const [selectedCategories, setSelectedCategories] = useState<{ [levelCode: string]: string }>(initialLevels || {});
  const [levels, setLevels] = useState<ClassificationLevel[]>([]);
  const [levelStates, setLevelStates] = useState<{ [levelCode: string]: LevelState }>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const levelSequence = useMemo(() => 
    levels.sort((a, b) => a.levelNumber - b.levelNumber).map(level => level.code), 
    [levels]
  );

  useEffect(() => {
    if (!isOpen) return;

    const initializeLevelStates = () => {
      setLevelStates(prev => {
        const newStates = { ...prev };
        levels.forEach(level => {
          if (!newStates[level.code]) {
            newStates[level.code] = { ...INITIAL_LEVEL_STATE };
          }
        });
        return newStates;
      });
    };

    // Reset selected categories when modal opens
    if (initialLevels) {
      setSelectedCategories(initialLevels);
    } else {
      setSelectedCategories({});
    }

    initializeLevelStates();
  }, [levels, isOpen, initialLevels]);

  useEffect(() => {
    let mounted = true;

    const loadInitialData = async () => {
      if (!isOpen) return;
      // Add guard clause to prevent API call with undefined systemCode
      if (!systemCode) {
        setError('System code is not provided.');
        console.error('Attempted to load initial data without a system code.');
        setLoading(false); // Ensure loading state is reset
        return;
      }
      
      try {
        setError(null);
        setLoading(true);
        
        const { levels: systemLevels } = await apiClient.getClassificationSystem(systemCode);
        if (!mounted) return;
        
        const sortedLevels = systemLevels.sort((a, b) => a.levelNumber - b.levelNumber);
        setLevels(sortedLevels);

        // Initialize all level states
        const initialStates: { [key: string]: LevelState } = {};
        sortedLevels.forEach(level => {
          initialStates[level.code] = { ...INITIAL_LEVEL_STATE };
        });
        setLevelStates(initialStates);

        // Load initial categories for levels with selected values
        if (initialLevels && mounted) {
          // Load levels sequentially to maintain parent-child relationships
          for (const level of sortedLevels) {
            const parentLevel = sortedLevels.find(l => l.levelNumber === level.levelNumber - 1);
            const parentCode = parentLevel ? selectedCategories[parentLevel.code] : undefined;
            
            // Load categories for this level
            await loadLevelCategories(level.code, parentCode);

            // Pre-select the category if it exists in initialLevels
            if (level.code in initialLevels) {
              setSelectedCategories(prev => ({
                ...prev,
                [level.code]: initialLevels[level.code]
              }));
            }
          }
        }
      } catch (error) {
        if (!mounted) return;
        setError(error instanceof Error ? error.message : 'Failed to load system levels');
        console.error('Failed to load system levels:', error);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadInitialData();
    return () => { mounted = false; };
  }, [apiClient, systemCode, isOpen, initialLevels]);

  const loadLevelCategories = useCallback(async (
    levelCode: string,
    parentCode?: string,
    search?: string
  ) => {
    console.debug('Loading categories:', { levelCode, parentCode, search });
    
    setLevelStates(prev => ({
      ...prev,
      [levelCode]: {
        ...prev[levelCode],
        loading: true,
        error: null
      }
    }));
    
    try {
      const request: SystemCategoriesRequest = {
        systemCode,
        level: levelCode,
        parentCode,
        search: search?.trim()
      };

      const categories = await apiClient.getSystemCategories(request);
      
      console.debug('Categories loaded:', {
        levelCode,
        parentCode,
        count: categories.length,
        categories: categories.map(c => `${c.code} - ${c.name}`)
      });
      
      setLevelStates(prev => ({
        ...prev,
        [levelCode]: {
          loading: false,
          error: null,
          options: categories
        }
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : `Failed to load categories for ${levelCode}`;
      console.error('Category loading error:', { levelCode, parentCode, error });
      
      setLevelStates(prev => ({
        ...prev,
        [levelCode]: {
          ...prev[levelCode],
          loading: false,
          error: message
        }
      }));
    }
  }, [apiClient, systemCode]);

  const debouncedLoadCategories = useMemo(
    () => debounce(loadLevelCategories, SEARCH_DEBOUNCE_MS),
    [loadLevelCategories]
  );

  const getParentLevelCode = useCallback((currentLevelCode: string): string | undefined => {
    const currentLevel = levels.find(l => l.code === currentLevelCode);
    if (!currentLevel) return undefined;
    
    const parentLevel = levels.find(l => l.levelNumber === currentLevel.levelNumber - 1);
    return parentLevel?.code;
  }, [levels]);

  const handleCategoryChange = useCallback(async (
    levelCode: string, 
    option: SingleValue<CategoryOption>
  ) => {
    const level = levels.find(l => l.code === levelCode);
    if (!level) return;

    const levelIndex = levelSequence.indexOf(levelCode);
    if (levelIndex === -1) return;

    const categoryCode = option?.value || '';

    setSelectedCategories(prev => {
      const newSelected = { ...prev };
      // Clear subsequent levels
      levelSequence.slice(levelIndex + 1).forEach(nextLevel => {
        delete newSelected[nextLevel];
      });
      
      if (categoryCode) {
        newSelected[levelCode] = categoryCode;
      } else {
        delete newSelected[levelCode];
      }
      
      return newSelected;
    });

    // Clear states for subsequent levels
    setLevelStates(prev => {
      const newStates = { ...prev };
      levelSequence.slice(levelIndex + 1).forEach(nextLevel => {
        newStates[nextLevel] = { ...INITIAL_LEVEL_STATE };
      });
      return newStates;
    });

    // Load next level's categories if a category was selected
    if (categoryCode) {
      const nextLevelCode = levelSequence[levelIndex + 1];
      if (nextLevelCode) {
        await loadLevelCategories(nextLevelCode, categoryCode);
      }
    }
  }, [levels, levelSequence, loadLevelCategories]);

  const handleInputChange = useCallback((
    levelCode: string,
    newValue: string,
    actionMeta: InputActionMeta
  ) => {
    if (actionMeta.action !== 'input-change') return;

    const parentLevelCode = getParentLevelCode(levelCode);
    const parentCategoryCode = parentLevelCode ? selectedCategories[parentLevelCode] : undefined;

    if (newValue.length >= MIN_SEARCH_CHARS) {
      debouncedLoadCategories(levelCode, parentCategoryCode, newValue);
    } else if (newValue.length === 0) {
      loadLevelCategories(levelCode, parentCategoryCode);
    }
  }, [debouncedLoadCategories, loadLevelCategories, getParentLevelCode, selectedCategories]);

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const request: ManualClassificationRequest = {
        description,
        systemCode,
        levels: selectedCategories,
      };
      
      const result = await apiClient.classifyManually(request);
      onSubmit(result);
      onClose();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Classification failed';
      console.error('Classification error:', error);
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-secondary-900">
              Manual Classification
            </h2>
            <button
              onClick={onClose}
              className="text-secondary-500 hover:text-secondary-700"
            >
              <span className="sr-only">Close</span>
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="border rounded-lg p-4 bg-secondary-50 text-sm">
            <p className="font-medium">Description:</p>
            <p className="mt-1">{description}</p>
          </div>

          <div className="space-y-4">
            {levels.map((level, index) => {
              const levelState = levelStates[level.code] || { ...INITIAL_LEVEL_STATE };
              const isDisabled = index > 0 && !selectedCategories[levels[index - 1].code];
              const selectedValue = selectedCategories[level.code];
              const selectedOption = selectedValue 
                ? levelState.options.find(cat => cat.code === selectedValue)
                : null;
              
              return (
                <div key={level.code} className="space-y-2">
                  <label className="block text-sm font-medium text-secondary-700">
                    {level.name}:
                  </label>
                  <Select<CategoryOption, false, GroupBase<CategoryOption>>
                    value={selectedOption ? transformCategoryToOption(selectedOption) : null}
                    onChange={(option) => handleCategoryChange(level.code, option)}
                    options={transformCategoriesToOptions(levelState.options)}
                    onInputChange={(newValue, actionMeta) => 
                      handleInputChange(level.code, newValue, actionMeta)
                    }
                    isDisabled={isDisabled || levelState.loading}
                    isLoading={levelState.loading}
                    placeholder={`Search ${level.name}...`}
                    noOptionsMessage={({inputValue}) => 
                      inputValue.length < MIN_SEARCH_CHARS 
                        ? `Type ${MIN_SEARCH_CHARS} or more characters to search...` 
                        : "No options found"
                    }
                    isClearable
                    menuPortalTarget={document.body}
                    styles={SELECT_STYLES}
                    classNamePrefix="react-select"
                  />
                  {levelState.error && (
                    <div className="text-sm text-red-600">
                      {levelState.error}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50/50 px-4 py-3 text-red-700 text-sm">
              {error}
            </div>
          )}

          <div className="flex justify-end space-x-4">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-secondary-700 hover:text-secondary-800 focus:outline-none focus:ring-2 focus:ring-secondary-500 focus:ring-offset-2"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading || Object.keys(selectedCategories).length === 0}
              className={`px-4 py-2 text-sm font-medium text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                loading || Object.keys(selectedCategories).length === 0
                  ? 'bg-secondary-400 cursor-not-allowed'
                  : 'bg-primary-600 hover:bg-primary-700 focus:ring-primary-500'
              }`}
            >
              {loading ? (
                <div className="flex items-center space-x-2">
                  <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Saving...</span>
                </div>
              ) : (
                'Save Classification'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
