// src/snow/pages/SnowHistoryPage.tsx
import React, { useEffect, useState, useCallback } from 'react';
import { Card, Alert, Pagination, Empty, Button } from 'antd';
import { useAuth } from '../../context/AuthContext';
import { useSnowHistory } from '../hooks/useSnowHistory';
import SnowHistoryTable from '../components/SnowHistoryTable';
import SnowHistoryFilters from '../components/SnowHistoryFilters';
import SnowAnalysisDetailsModal from '../components/SnowAnalysisDetailsModal';
import { SnowHistoryItemFE, SnowHistoryFiltersState } from '../types/snow.types';
import { ReloadOutlined } from '@ant-design/icons'; // Import ReloadOutlined

const PAGE_SIZE = 10; // Define the number of items per page

const SnowHistoryPage: React.FC = () => {
  const { apiClient, checkPermission } = useAuth();
  const {
    historyItems,
    loading,
    error,
    totalCount,
    currentPage,
    totalPages,
    deleteHistoryItem,
    setCurrentPage,
    setFilters, // Get setFilters from hook
    filters, // Get filters state from hook
    refreshHistory, // Get refreshHistory from hook
  } = useSnowHistory(apiClient);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<SnowHistoryItemFE | null>(null);

  // handleFilterChange now just updates filters in the hook.
  // This will trigger the useSnowHistory hook's internal useEffect, which debounces the fetch.
  const handleFilterChange = useCallback((newFilters: SnowHistoryFiltersState) => {
    setFilters(newFilters);
    setCurrentPage(1); // Always reset to page 1 on filter change
  }, [setFilters, setCurrentPage]);

  // handlePageChange directly updates currentPage in the hook.
  // This will trigger the useSnowHistory hook's internal useEffect, which debounces the fetch.
  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
  }, [setCurrentPage]);

  const handleDelete = async (id: string) => {
    if (!checkPermission('snow:history:delete')) {
      alert("Permission denied to delete history items.");
      return;
    }
    await deleteHistoryItem(id);
    // The hook now handles refreshing the list or adjusting pagination
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
      <Card
        title="ServiceNow Analysis History"
        bordered={false}
        extra={ // Add refresh button here
          <Button
            type="default"
            icon={<ReloadOutlined />}
            onClick={refreshHistory} // Call the new refreshHistory method
            loading={loading}
            disabled={loading}
          >
            Refresh
          </Button>
        }
      >
        <SnowHistoryFilters
          onFilter={handleFilterChange} // This will trigger filter change and page reset in the hook
          loading={loading}
          initialFilters={filters} // Pass current filters from the hook to initialize the form
        />

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
            pageSize={PAGE_SIZE} // Use the constant PAGE_SIZE
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