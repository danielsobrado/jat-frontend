// src/snow/pages/SnowHistoryPage.tsx
import React, { useEffect, useState, useCallback } from 'react';
import { Card, Alert, Pagination, Empty, Button } from 'antd';
import { useAuth } from '../../context/AuthContext';
import { useSnowHistory } from '../hooks/useSnowHistory';
import SnowHistoryTable from '../components/SnowHistoryTable';
import SnowHistoryFilters from '../components/SnowHistoryFilters';
import SnowAnalysisDetailsModal from '../components/SnowAnalysisDetailsModal';
import { SnowHistoryItemFE, SnowHistoryFiltersState, SnowHistoryRequestParamsFE } from '../types/snow.types';

const SnowHistoryPage: React.FC = () => {
  const { apiClient, checkPermission } = useAuth();
  const {
    historyItems,
    loading,
    error,
    totalCount,
    currentPage,
    totalPages,
    fetchHistory,
    deleteHistoryItem,
    pageCursors,
    setCurrentPage,
  } = useSnowHistory(apiClient);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<SnowHistoryItemFE | null>(null);
  const [filters, setFilters] = useState<SnowHistoryFiltersState>({
    search: '',
    startDate: null,
    endDate: null,
  });

  const handleFetchHistory = useCallback((page: number, currentFilters: SnowHistoryFiltersState) => {
    const params: SnowHistoryRequestParamsFE = {
      search: currentFilters.search || undefined,
      startDate: currentFilters.startDate || undefined,
      endDate: currentFilters.endDate || undefined,
    };
    const cursor = page === 1 ? undefined : pageCursors[page - 1];
    fetchHistory(page, params, cursor);
  }, [fetchHistory, pageCursors]);

  useEffect(() => {
    if (checkPermission('snow:history:view')) {
      handleFetchHistory(currentPage, filters);
    }
  }, [currentPage, filters, checkPermission, handleFetchHistory]);


  const handleFilterChange = (newFilters: SnowHistoryFiltersState) => {
    setFilters(newFilters);
    setCurrentPage(1); // Reset to first page on filter change
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleDelete = async (id: string) => {
    if (!checkPermission('snow:history:delete')) {
      alert("Permission denied to delete history items.");
      return;
    }
    await deleteHistoryItem(id);
    // The hook should handle refreshing the list or adjusting pagination
  };

  const handleViewDetails = (item: SnowHistoryItemFE) => {
    setSelectedItem(item);
    setIsModalOpen(true);
  };

  if (!checkPermission('snow:history:view')) {
    return (
      <div className="page-container">
        <Alert
          message="Permission Denied"
          description="You do not have permission to view ServiceNow analysis history. Please contact your administrator."
          type="error"
          showIcon
        />
      </div>
    );
  }

  return (
    <div className="page-container snow-history-page">
      <Card title="ServiceNow Analysis History" bordered={false}>
        <SnowHistoryFilters onFilter={handleFilterChange} loading={loading} />

        {error && <Alert message="Error" description={error} type="error" showIcon className="my-4" />}

        <SnowHistoryTable
          items={historyItems}
          loading={loading}
          onDelete={handleDelete}
          onViewDetails={handleViewDetails}
          canDelete={checkPermission('snow:history:delete')}
        />

        {historyItems.length === 0 && !loading && !error && (
          <Empty description="No analysis history found matching your criteria." className="my-8" />
        )}

        {totalCount > 0 && (
          <Pagination
            current={currentPage}
            total={totalCount}
            pageSize={10} // Should match PAGE_SIZE in hook
            onChange={handlePageChange}
            showSizeChanger={false}
            className="mt-6 text-center"
            disabled={loading}
          />
        )}
      </Card>

      {selectedItem && (
        <SnowAnalysisDetailsModal
          item={selectedItem}
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </div>
  );
};

export default SnowHistoryPage;