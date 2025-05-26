// src/components/HistoryTab.tsx
import React, { useEffect, useState, useCallback } from 'react'; // Added useCallback
import { Tooltip } from 'antd'; // Import Tooltip
import { ApiClient, ClassificationHistory, ClassificationSourceType, ClassificationStatus, ClassificationSystem } from '../api/types';
import { ManualClassificationModal } from './ManualClassificationModal';
import { RerunStatusModal } from './RerunStatusModal';
import { ClassificationDetailsModal } from './ClassificationDetailsModal';
import { formatDate } from '../utils/dateFormat';
import { isInformationalError } from '../utils/statusUtils';
import { useAuth } from '../context/AuthContext'; // Import useAuth hook

interface HistoryTabProps {
  apiClient: ApiClient;
}

export const HistoryTab: React.FC<HistoryTabProps> = ({ apiClient }) => {
  // Get permission checker from auth context
  const { checkPermission } = useAuth();
  
  const [history, setHistory] = useState<ClassificationHistory[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10); // Keep pageSize constant
  const [totalPages, setTotalPages] = useState(1);
  const [pageCursors, setPageCursors] = useState<string[]>([]); // Store cursors for next pages
  const [loading, setLoading] = useState(false);
  const [systems, setSystems] = useState<ClassificationSystem[]>([]);
  const [selectedSystem, setSelectedSystem] = useState<string>();
  const [error, setError] = useState<string>();
  const [showManualModal, setShowManualModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ClassificationHistory | null>(null);
  const [showRerunModal, setShowRerunModal] = useState(false);
  const [rerunningItem, setRerunningItem] = useState<ClassificationHistory | null>(null);
  
  // State for the classification details modal
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [detailsItem, setDetailsItem] = useState<ClassificationHistory | null>(null);

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<ClassificationStatus>('all');
  const [selectedSource, setSelectedSource] = useState<ClassificationSourceType>();
  const [selectedClassifier, setSelectedClassifier] = useState('');
  const [classifierOptions, setClassifierOptions] = useState<string[]>([]);
  const [startDate, setStartDate] = useState<string>(() => {
    const date = new Date();
    date.setDate(date.getDate() - 7);
    return date.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });
  // Using isInformationalError function from statusUtils.ts
  // This replaced the local informationalErrorMessages array and isInformationalError function

  useEffect(() => {
    const loadSystems = async () => {
      try {
        const systemList = await apiClient.getClassificationSystems();
        console.log('Loaded systems:', systemList);
        setSystems(systemList);
      } catch (err) {
        console.error('Failed to load systems:', err);
        setError('Failed to load classification systems');
      }
    };
    loadSystems();
  }, [apiClient]);

  const loadHistory = useCallback(async (targetPage: number = currentPage, cursorToUse?: string) => {
    setLoading(true);
    setError(undefined);
    try {
      const pageToLoad = targetPage;
      let effectiveCursor = cursorToUse;      // If we have a cursor to use (passed in), use it
      // For page 1, we always use undefined (no cursor)
      if (pageToLoad === 1) {
        effectiveCursor = undefined; // Always no cursor for page 1
      }
      // Otherwise use the provided cursor
      // The cursorToUse should be provided by the effect that tracks currentPage changes
      
      console.debug('[History] Loading data:', {
        page: pageToLoad,
        cursor: effectiveCursor,
        filters: {
          system: selectedSystem,
          status: selectedStatus === 'all' ? undefined : selectedStatus,
          search: searchTerm.trim() || undefined,
          sourceType: selectedSource || undefined,
          createdBy: selectedClassifier || undefined,
          startDate,
          endDate: endDate ? new Date(endDate + 'T23:59:59').toISOString() : undefined,
        }
      });

      const result = await apiClient.getClassificationHistory({
        systemCode: selectedSystem,
        cursor: effectiveCursor,
        limit: pageSize,
        status: selectedStatus === 'all' ? undefined : selectedStatus,
        startDate,
        endDate: endDate ? new Date(endDate + 'T23:59:59').toISOString() : undefined,
        search: searchTerm.trim() || undefined,
        sourceType: selectedSource || undefined,
        createdBy: selectedClassifier || undefined
      });
        console.debug('[History] Raw API Response:', result);
      console.debug('[History] First item from API:', result.items?.[0]);
        const firstItem = result.items?.[0];
      if (firstItem) {
        console.debug('[History] First item firstLevelPrompt:', firstItem.firstLevelPrompt);
        console.debug('[History] First item allPromptsDetail:', firstItem.allPromptsDetail);        
        console.debug('[History] First item properties:', 
          Object.keys(firstItem).map(key => {
            const value = firstItem[key as keyof typeof firstItem];
            return `${key}: ${typeof value}`;
          }).join(', '));
      }


      if (!result.items) {
        console.warn('No items array in history response');
        setHistory([]);
        setTotalCount(0);
        setTotalPages(1);
        if (pageToLoad > 1) setCurrentPage(1); // Reset to page 1 if current page had no items
        setPageCursors([]); // Reset cursors
        return;
      }

      setHistory(result.items);
      setTotalCount(result.totalCount);
      setTotalPages(Math.ceil(result.totalCount / pageSize) || 1);      if (result.nextCursor) {
        setPageCursors(prev => {
          const newCursors = [...prev];
          // Cursor returned when fetching page N is the cursor *for* page N+1
          // Store at index N-1 (0-indexed array where index corresponds to page-1)
          if (pageToLoad - 1 < newCursors.length) {
            newCursors[pageToLoad - 1] = result.nextCursor!;
          } else {
            // Ensure array is long enough, filling gaps with undefined if necessary
            for (let i = newCursors.length; i < pageToLoad - 1; i++) {
              newCursors.push(undefined as unknown as string);
            }
            newCursors.push(result.nextCursor!);
          }
          console.debug('[History] Updated pageCursors:', newCursors);
          return newCursors;
        });
      }


    } catch (err) {
      console.error('Failed to load history:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to load classification history';
      setError(`Error loading history: ${errorMessage}`);
      setHistory([]);
      setTotalCount(0);
      setTotalPages(1);
      setCurrentPage(1);
      setPageCursors([]);    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiClient, selectedSystem, selectedStatus, startDate, endDate, searchTerm, selectedSource, selectedClassifier, pageSize]); // pageCursors and currentPage removed from deps of loadHistory
  const handlePageChange = (page: number) => {
      if (page === currentPage || loading) return; // Prevent re-fetch if same page or already loading
      setCurrentPage(page);
      // loadHistory will be called by the effect watching currentPage
  };

  useEffect(() => {
    const loadClassifiers = async () => {
      try {
        // Consider if limiting this initial fetch for classifiers is needed if it's slow
        const result = await apiClient.getClassificationHistory({ limit: 1000 }); 
        const uniqueClassifiers = [...new Set(result.items
          .map(item => item.createdBy))]
          .filter(Boolean) // Remove undefined/empty strings
          .sort();
        setClassifierOptions(uniqueClassifiers);
      } catch (err) {
        console.error('Failed to load classifiers:', err);
      }
    };
    loadClassifiers();
  }, [apiClient]);
  useEffect(() => {
    // This effect resets to page 1 and clears cursors when filters change
    console.debug('[History] Filter change detected, resetting page and cursors.');
    setCurrentPage(1);
    setPageCursors([]); // Clear cursors on filter change
    // The change in currentPage will trigger the next useEffect to load data for page 1
  }, [selectedSystem, selectedStatus, startDate, endDate, searchTerm, selectedSource, selectedClassifier]);
  useEffect(() => {
    // This effect handles loading data whenever currentPage changes OR when filters have reset currentPage to 1
    // Determine the cursor: For page 1, it's always undefined.
    // For page N > 1, it's pageCursors[N-2] (the cursor that led to page N-1 gives us the cursor for page N)
    const cursorForPageToFetch = currentPage === 1 ? undefined : pageCursors[currentPage - 2];
    console.debug(`[History] CurrentPage effect: loading page ${currentPage} with cursor "${cursorForPageToFetch}"`, {pageCursors});
    loadHistory(currentPage, cursorForPageToFetch);
  }, [currentPage, loadHistory]); // pageCursors is intentionally NOT a dependency to break the loop

  const handleReclassify = async (item: ClassificationHistory) => {
    if (!item.systemCode) {
      console.error('Cannot reclassify: systemCode is missing from history item.', item);
      setError('Cannot reclassify this item because its classification system is unknown.');
      return;
    }
    setSelectedItem(item);
    setShowManualModal(true);
  };

  const handleRerun = async (item: ClassificationHistory) => {
    if (!window.confirm('Are you sure you want to rerun this classification?')) { // Changed to window.confirm
      return;
    }

    setRerunningItem(item);
    setShowRerunModal(true);
    setError(undefined);

    try {
      const result = await apiClient.rerunClassification(String(item.id));
      
      if (result.error) {
        setError(`Rerun failed: ${result.error}`);
      }
      setCurrentPage(1);
      setPageCursors([]);
      await loadHistory(1);
    } catch (err) {
      console.error('Failed to rerun classification:', err);
      setError('Failed to start rerun');
    } finally {
      setShowRerunModal(false);
      setRerunningItem(null);
    }
  };

  const handleDelete = async (item: ClassificationHistory) => {
    if (!window.confirm('Are you sure you want to delete this classification? This action cannot be undone.')) { // Changed to window.confirm
      return;
    }

    setLoading(true);
    setError(undefined);
    try {
      await apiClient.deleteClassification(String(item.id));
      setCurrentPage(1);
      setPageCursors([]);
      await loadHistory(1);
    } catch (err) {
      console.error('Failed to delete classification:', err);
      setError('Failed to delete classification');
    } finally {
      setLoading(false);
    }
  };

  const handleManualClassification = async (result: any) => {
    console.debug('[Classification] Manual result:', {
      success: !result.error,
      error: result.error,
      description: result.description
    });

    if (result.error && !isInformationalError(result.error)) {
      setError(`Classification failed: ${result.error}`);
    } else if (result.error && isInformationalError(result.error)) {
      setError(undefined);
      console.info(`Informational message from manual classification: ${result.error}`);
    }

    setCurrentPage(1);
    setPageCursors([]);
    await loadHistory(1);

    setShowManualModal(false);
    setSelectedItem(null);
  };

  const handleView = (item: ClassificationHistory) => {
    console.debug('Viewing details for history item:', item);
    setDetailsItem(item);
    setShowDetailsModal(true);
  };

  const getClassifierBadge = (createdBy: string) => {
    // ... (existing code for getClassifierBadge)
    if (!createdBy || createdBy === 'direct') { // Consider 'direct' or make it consistent from backend
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border bg-gray-100 text-gray-800 border-gray-200">
            Direct Input
          </span>
        );
      }
      // Check if createdBy looks like a user ID (number) or a batch ID (string, potentially non-numeric)
      if (/^\d+$/.test(createdBy)) { // If it's purely numeric, assume user ID
        return (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border bg-sky-100 text-sky-800 border-sky-200">
              User ID: {createdBy}
            </span>
          );
      }
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border bg-purple-100 text-purple-800 border-purple-200">
          Batch: {createdBy}
        </span>
      );
  };

  const getSourceBadge = (sourceType?: ClassificationSourceType, createdBy?: string) => { // made params optional for safety
    const classes: Record<string, string> = {
      user: 'bg-blue-100 text-blue-800 border-blue-200',       
      manual: 'bg-blue-100 text-blue-800 border-blue-200',     
      batch: 'bg-purple-100 text-purple-800 border-purple-200',
      api: 'bg-gray-100 text-gray-800 border-gray-200',         
      ui: 'bg-teal-100 text-teal-800 border-teal-200',
      unknown: 'bg-gray-100 text-gray-800 border-gray-200'      
    };

    if (!sourceType) {
      return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${classes.unknown}`}>
          Unknown
        </span>
      );
    }
    const sourceTypeLower = sourceType.toLowerCase();
    let label = 'Unknown';
    if (sourceTypeLower.includes('user') || sourceTypeLower.includes('manual')) label = 'Manual Input';
    else if (sourceTypeLower.includes('batch')) label = 'Batch';
    else if (sourceTypeLower === 'ui') label = 'UI (Web)';
    else if (sourceTypeLower.includes('api')) label = 'API Input';
    
    const detail = sourceTypeLower.includes('batch') && createdBy ? ` (${createdBy})` : '';
    let badgeClass = classes.unknown;
    for (const [key, value] of Object.entries(classes)) {
      if (sourceTypeLower.includes(key)) {
        badgeClass = value;
        break;
      }
    }
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${badgeClass}`}>
        {label}{detail}
      </span>
    );
  };

  const getStatusBadge = (status: ClassificationStatus) => {
    // ... (existing code for getStatusBadge)
    if (status === 'all') {
        console.warn('Unexpected status "all" for individual item');
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border bg-gray-100 text-gray-800 border-gray-200">
            Unknown
          </span>
        );
      }
      
      const classes = {
        success: 'bg-green-100 text-green-800 border-green-200',
        partial: 'bg-yellow-100 text-yellow-800 border-yellow-200',
        failed: 'bg-red-100 text-red-800 border-red-200'
      };
      
      const labels = {
        success: 'Success',
        partial: 'Partial',
        failed: 'Failed'
      };
  
      return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${classes[status]}`}>
          {labels[status]}
        </span>
      );
  };

  return (
    <React.Fragment>
      <div className="max-w-8xl mx-auto space-y-10" style={{ minWidth: '40rem', paddingRight: '1rem', paddingLeft: '1rem'}}>
        <div className="bg-white shadow-card rounded-card p-8 w-full" style={{ paddingRight: '5rem', paddingLeft: '3rem'}}>
          <div className="mb-2">

            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
              {/* System filter */}
              <div>
                <label htmlFor="system" className="block text-sm font-medium text-secondary-700 mb-2">
                  System
                </label>
                <select
                  id="system"
                  className="w-full px-4 py-2.5 bg-white border border-secondary-200 rounded-card text-secondary-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  value={selectedSystem || ''}
                  onChange={(e) => setSelectedSystem(e.target.value || undefined)}
                >
                  <option value="">All Systems</option>
                  {systems.map((system) => (
                    <option key={system.code} value={system.code}>
                      {system.name || system.code}
                    </option>
                  ))}
                </select>
              </div>

              {/* Search Description */}
              <div>
                <label htmlFor="search" className="block text-sm font-medium text-secondary-700 mb-2">
                  Search Description
                </label>
                <input
                  type="text"
                  id="search"
                  placeholder="Search..."
                  className="w-full px-4 py-2.5 bg-white border border-secondary-200 rounded-card text-secondary-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              {/* Status filter */}
              <div>
                <label htmlFor="status" className="block text-sm font-medium text-secondary-700 mb-2">
                  Status
                </label>
                <select
                  id="status"
                  className="w-full px-4 py-2.5 bg-white border border-secondary-200 rounded-card text-secondary-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value as ClassificationStatus)}
                >
                  <option value="all">All Status</option>
                  <option value="success">Success</option>
                  <option value="partial">Partial</option>
                  <option value="failed">Failed</option>
                </select>
              </div>

              {/* Source Type filter */}
              <div>
                <label htmlFor="sourceType" className="block text-sm font-medium text-secondary-700 mb-2">
                  Source Type
                </label>
                <select
                  id="sourceType"
                  className="w-full px-4 py-2.5 bg-white border border-secondary-200 rounded-card text-secondary-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  value={selectedSource || ''} 
                  onChange={(e) => setSelectedSource(e.target.value as '' | 'user' | 'batch' | 'api' | 'manual')}
                >
                  <option value="">All Sources</option>
                  <option value="manual">Manual</option> 
                  <option value="api">API</option> 
                  <option value="batch">Batch</option>
                  <option value="user">User (Legacy)</option>
                </select>
              </div>

              {/* Classifier filter */}
              <div>
                <label htmlFor="classifier" className="block text-sm font-medium text-secondary-700 mb-2">
                  Classified By
                </label>
                <select
                  id="classifier"
                  className="w-full px-4 py-2.5 bg-white border border-secondary-200 rounded-card text-secondary-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  value={selectedClassifier}
                  onChange={(e) => setSelectedClassifier(e.target.value)}
                >
                  <option value="">All</option>
                  {/* <option value="direct">Direct Input</option> -- consider how to filter user ID vs batch ID */}
                  {classifierOptions.map(opt => (
                    <option key={opt} value={opt}>
                        {/^\d+$/.test(opt) ? `User ID: ${opt}` : `Batch: ${opt}`}
                    </option>
                  ))}
                </select>
              </div>

              {/* Start Date filter */}
              <div>
                <label htmlFor="startDate" className="block text-sm font-medium text-secondary-700 mb-2">
                  Start Date
                </label>
                <input
                  type="date"
                  id="startDate"
                  className="w-full px-4 py-2.5 bg-white border border-secondary-200 rounded-card text-secondary-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  max={endDate}
                />
              </div>

              {/* End Date filter */}
              <div>
                <label htmlFor="endDate" className="block text-sm font-medium text-secondary-700 mb-2">
                  End Date
                </label>
                <input
                  type="date"
                  id="endDate"
                  className="w-full px-4 py-2.5 bg-white border border-secondary-200 rounded-card text-secondary-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  min={startDate}
                />
              </div>
            </div>
          </div>

          {error && (
            <div className="rounded-card border border-red-200 bg-red-50/50 px-4 py-3 mb-6" role="alert">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {loading && (
            <div className="rounded-card border border-primary-200 bg-primary-50/50 px-4 py-3 mb-6" role="status">
              <p className="text-sm text-primary-700">Loading...</p>
            </div>
          )}

          <div className="overflow-x-auto rounded-card border border-secondary-200">
            <table className="min-w-full divide-y divide-secondary-200">
              <thead className="bg-secondary-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider max-w-72 truncate">
                    Description
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider w-24">
                    System
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider w-64">
                    Categories
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                    Source
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider w-40">
                    Classified By
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-secondary-200">
                {history.map((item) => (
                  <tr key={item.id} className={`hover:bg-secondary-50 ${
                    item.status === 'failed' && !isInformationalError(item.error) ? 'bg-red-50/30' : 
                    item.status === 'partial' || (item.status === 'failed' && isInformationalError(item.error)) ? 'bg-yellow-50/30' : ''
                  }`}>
                    <td className="px-6 py-4 text-sm text-secondary-900 max-w-72">
                      {item.ragContextUsed && item.ragContext ? (
                        <Tooltip
                          title={
                            <pre className="text-xs whitespace-pre-wrap max-w-md">
                              {item.ragContext}
                            </pre>
                          }
                          placement="topLeft"
                          overlayInnerStyle={{ backgroundColor: '#fff', color: '#333', border: '1px solid #ccc', padding: '8px', whiteSpace: 'pre-wrap' }}
                        >
                          <span className="truncate block cursor-help underline decoration-dotted decoration-primary-500">
                            {item.description}
                          </span>
                        </Tooltip>
                      ) : (
                        <span className="truncate block">{item.description}</span>
                      )}
                      {item.error && (
                        <div className={`mt-1 text-xs ${
                          isInformationalError(item.error) ? 'text-yellow-600' : 'text-red-600'
                        }`}>
                          {isInformationalError(item.error) ? `Note: ${item.error}` : `Error: ${item.error}`}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-600 w-24">
                      {item.systemCode}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {getStatusBadge(item.status)}
                    </td>
                    <td className="px-6 py-4 text-sm w-64">
                      <div className="space-y-1">
                        {Object.entries(item.levels || {})
                          .sort(([a], [b]) => {
                            const levelOrder: Record<string, number> = {
                              'segment': 1, 'family': 2, 'class': 3, 'commodity': 4,
                              'SUBCAT1': 1, 'SUBCAT2': 2, 'default': 99 
                            };
                            const getOrder = (levelCode: string) => levelOrder[levelCode.toLowerCase()] ?? levelOrder['default'];
                            return getOrder(a) - getOrder(b);
                          })
                          .map(([levelCode, category]) => (
                          <div key={levelCode}>
                            <span className="font-medium text-secondary-700">{levelCode}:</span>{' '}
                            <span className="text-secondary-600">{category.code} - {category.name}</span>
                            {category.error && (
                              <div className="text-xs text-red-600 mt-0.5">
                                {category.error}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-600">
                      {getSourceBadge(item.sourceType as ClassificationSourceType, item.createdBy)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-600">
                      <span title={formatDate(item.createdAt).fullText}>
                        {formatDate(item.createdAt).displayText}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-600 w-40">
                      {getClassifierBadge(item.createdBy)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <button
                        onClick={() => handleView(item)}
                        className="group relative inline-flex items-center gap-1.5 px-3 py-2 bg-white text-sm font-medium text-secondary-700 border border-secondary-200 rounded-lg hover:bg-secondary-50 hover:border-secondary-300 hover:text-secondary-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-all duration-200 shadow-sm mr-1"
                        disabled={!checkPermission('history:view')}
                        title={!checkPermission('history:view') ? "Permission denied" : "View details"}
                      >
                        <svg 
                          className={`w-4 h-4 ${!checkPermission('history:view') ? 'text-secondary-300' : 'text-secondary-500 group-hover:text-secondary-700'} transition-colors`}
                          fill="none" 
                          viewBox="0 0 24 24" 
                          stroke="currentColor"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        <div className="absolute inset-0 rounded-lg overflow-hidden">
                          <div className="absolute inset-0 bg-gradient-to-r from-primary-100 to-secondary-100 opacity-0 group-hover:opacity-10 transition-opacity"></div>
                        </div>
                      </button>
                      <button
                        onClick={() => handleReclassify(item)}
                        className={`group relative inline-flex items-center gap-1.5 px-3 py-2 bg-white text-sm font-medium border border-secondary-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-all duration-200 shadow-sm ${
                          !checkPermission('classify:manual') 
                          ? 'text-secondary-400 border-secondary-200 cursor-not-allowed opacity-50' 
                          : 'text-secondary-700 hover:bg-secondary-50 hover:border-secondary-300 hover:text-secondary-900'
                        }`}
                        disabled={!checkPermission('classify:manual')}
                        title={!checkPermission('classify:manual') ? "Permission denied" : "Manually reclassify"}
                      >
                        <svg className={`w-4 h-4 ${!checkPermission('classify:manual') ? 'text-secondary-300' : 'text-secondary-500 group-hover:text-secondary-700'} transition-colors`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                        <div className="absolute inset-0 rounded-lg overflow-hidden"><div className="absolute inset-0 bg-gradient-to-r from-primary-100 to-secondary-100 opacity-0 group-hover:opacity-10 transition-opacity"></div></div>
                      </button>
                      <button
                        onClick={() => handleRerun(item)}
                        className={`group relative inline-flex items-center gap-1.5 px-3 py-2 bg-white text-sm font-medium border border-secondary-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-all duration-200 shadow-sm ${
                           !checkPermission('history:rerun') 
                           ? 'text-secondary-400 border-secondary-200 cursor-not-allowed opacity-50' 
                           : 'text-secondary-700 hover:bg-secondary-50 hover:border-secondary-300 hover:text-secondary-900'
                        }`}
                        disabled={!checkPermission('history:rerun')}
                        title={!checkPermission('history:rerun') ? "Permission denied" : "Rerun classification"}
                      >
                        <svg className={`w-4 h-4 ${!checkPermission('history:rerun') ? 'text-secondary-300' : 'text-secondary-500 group-hover:text-secondary-700'} transition-colors`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                        <div className="absolute inset-0 rounded-lg overflow-hidden"><div className="absolute inset-0 bg-gradient-to-r from-primary-100 to-secondary-100 opacity-0 group-hover:opacity-10 transition-opacity"></div></div>
                      </button>
                      <button
                        onClick={() => handleDelete(item)}
                        className={`group relative inline-flex items-center gap-1.5 px-3 py-2 bg-white text-sm font-medium border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-all duration-200 shadow-sm ${
                            !checkPermission('history:delete') 
                            ? 'text-red-300 border-red-100 cursor-not-allowed opacity-50' 
                            : 'text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300 hover:text-red-700'
                         }`}
                        disabled={!checkPermission('history:delete')}
                        title={!checkPermission('history:delete') ? "Permission denied" : "Delete classification"}
                      >
                        <svg className={`w-4 h-4 ${!checkPermission('history:delete') ? 'text-red-300' : 'text-red-500 group-hover:text-red-700'} transition-colors`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        <div className="absolute inset-0 rounded-lg overflow-hidden"><div className="absolute inset-0 bg-gradient-to-r from-red-100 to-red-50 opacity-0 group-hover:opacity-10 transition-opacity"></div></div>
                      </button>
                    </td>
                  </tr>
                ))}
                {history.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-6 py-8 text-center text-sm text-secondary-500">
                      No classifications found matching the current filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination controls */}
          <div className="mt-6 flex items-center justify-between">
            <div className="flex-1 flex justify-between items-center">
                <p className="text-sm text-secondary-600">
                {history.length > 0
                    ? `Showing ${Math.min((currentPage - 1) * pageSize + 1, totalCount)} - ${Math.min(currentPage * pageSize, totalCount)} of ${totalCount} results`
                    : 'No results found'}
                </p>
                
                <div className="flex items-center gap-2">
                <button
                    onClick={() => handlePageChange(1)}
                    disabled={currentPage === 1 || loading}
                    className="px-3 py-2 rounded-lg border border-secondary-200 text-sm font-medium text-secondary-700 hover:bg-secondary-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >First</button>
                <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1 || loading}
                    className="px-3 py-2 rounded-lg border border-secondary-200 text-sm font-medium text-secondary-700 hover:bg-secondary-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >Previous</button>

                {(() => {
                    const pages = [];
                    const maxButtons = 5;
                    let start = Math.max(1, currentPage - Math.floor(maxButtons / 2));
                    let end = Math.min(start + maxButtons - 1, totalPages);
                    if (end === totalPages) start = Math.max(1, end - maxButtons + 1);
                    if (start > 1) pages.push(<span key="start-dots" className="px-2 py-2 text-secondary-500">...</span>);
                    for (let i = start; i <= end; i++) {
                    pages.push(
                        <button
                        key={i}
                        onClick={() => handlePageChange(i)}
                        disabled={loading || (i > currentPage && !pageCursors[currentPage - 1])}
                        className={`px-3 py-2 rounded-lg border text-sm font-medium ${
                            i === currentPage ? 'bg-primary-600 text-white border-primary-600' : 'border-secondary-200 text-secondary-700 hover:bg-secondary-50'
                        }`}
                        >{i}</button>
                    );
                    }
                    if (end < totalPages) pages.push(<span key="end-dots" className="px-2 py-2 text-secondary-500">...</span>);
                    return pages;
                })()}

                <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages || loading || (currentPage < totalPages && !pageCursors[currentPage - 1])}
                    className="px-3 py-2 rounded-lg border border-secondary-200 text-sm font-medium text-secondary-700 hover:bg-secondary-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >Next</button>
                <button
                    onClick={() => handlePageChange(totalPages)}
                    disabled={currentPage === totalPages || loading || totalPages <= 1}
                    className="px-3 py-2 rounded-lg border border-secondary-200 text-sm font-medium text-secondary-700 hover:bg-secondary-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >Last</button>
                </div>
            </div>
           </div>
        </div>
      </div>

      {selectedItem && (
        <ManualClassificationModal
          isOpen={showManualModal}
          onClose={() => {
            setShowManualModal(false);
            setSelectedItem(null);
          }}
          onSubmit={handleManualClassification}
          apiClient={apiClient}
          description={selectedItem.description}
          systemCode={selectedItem.systemCode} 
          initialLevels={Object.fromEntries(
            Object.entries(selectedItem.levels).map(([code, category]) => [code, category.code])
          )}
        />
      )}
      <RerunStatusModal
        isOpen={showRerunModal}
        description={rerunningItem?.description || ''}
      />
      {detailsItem && (
        <ClassificationDetailsModal
          isOpen={showDetailsModal}
          onClose={() => {
            setShowDetailsModal(false);
            setDetailsItem(null);
          }}
          item={detailsItem}
        />
      )}
    </React.Fragment>
  );
};

export default HistoryTab;