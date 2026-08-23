import React, { useState, useCallback } from 'react';
import { 
  Boxes, 
  BarChart3, 
  Layers, 
  RotateCcw, 
  Plus, 
  Sliders, 
  Download, 
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  XCircle
} from 'lucide-react';
import { 
  InventoryFilterParams, 
  UserRole, 
  InventoryItem, 
  InsightsTimeframe,
  StockAdjustmentInput
} from '../../types';
import { 
  useInventory, 
  useInventoryKPIs, 
  useInventoryInsights, 
  useStockAdjustment,
  useReferenceData 
} from '../../hooks';
import { InventoryMetricCards } from './InventoryMetricCards';
import { InventoryFilters } from './InventoryFilters';
import { InventoryTable } from './InventoryTable';
import { InventoryMobileList } from './InventoryMobileList';
import { InventoryInsightsView } from './InventoryInsightsView';
import { StockAdjustmentModal } from './StockAdjustmentModal';
import { InventoryDetailsModal } from './InventoryDetailsModal';
import { InventoryLowStockAlertBanner } from './InventoryLowStockAlertBanner';
import { exportTableToPDF } from '../../utils/pdfExport';

interface InventoryModuleProps {
  currentRole: UserRole;
  onNavigateToProduct?: (productId: string) => void;
  onOpenLowStockAlerts?: () => void;
}

export const InventoryModule: React.FC<InventoryModuleProps> = ({
  currentRole,
  onNavigateToProduct,
  onOpenLowStockAlerts,
}) => {
  const [activeTab, setActiveTab] = useState<'inventory_list' | 'insights'>('inventory_list');
  const [insightsTimeframe, setInsightsTimeframe] = useState<InsightsTimeframe>('this_month');

  // Filter State
  const [filters, setFilters] = useState<InventoryFilterParams>({
    search: '',
    category: 'All Categories',
    company: 'All',
    stockStatus: 'all',
    sortBy: 'name',
    sortOrder: 'asc',
    page: 1,
    limit: 12,
  });

  // Reference Data (Categories & Companies)
  const { categories, companies } = useReferenceData();

  // Inventory Data Hooks
  const {
    inventoryItems,
    total,
    currentPage,
    totalPages,
    isLoading,
    isSearching,
    isStale,
    error: listError,
    refetch: refetchInventory,
  } = useInventory(filters, currentRole);

  const {
    kpis,
    isLoading: isKpiLoading,
    refetch: refetchKPIs,
  } = useInventoryKPIs(currentRole);

  const {
    insights,
    isLoading: isInsightsLoading,
    refetch: refetchInsights,
  } = useInventoryInsights(insightsTimeframe, currentRole);

  const { adjustStock } = useStockAdjustment();

  // Stock Adjustment Modal State
  const [selectedItemForAdjustment, setSelectedItemForAdjustment] = useState<InventoryItem | null>(null);
  const [isAdjustmentModalOpen, setIsAdjustmentModalOpen] = useState(false);

  // Inventory Item Details Modal State
  const [selectedItemForDetails, setSelectedItemForDetails] = useState<InventoryItem | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  // Success Notification Toast
  const [notification, setNotification] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => {
      setNotification(null);
    }, 4500);
  };

  const handleFilterChange = useCallback((updates: Partial<InventoryFilterParams>) => {
    setFilters((prev) => ({ ...prev, ...updates }));
  }, []);

  const handleSortChange = useCallback((field: InventoryFilterParams['sortBy']) => {
    setFilters((prev) => {
      const isSameField = prev.sortBy === field;
      const newOrder = isSameField && prev.sortOrder === 'asc' ? 'desc' : 'asc';
      return { ...prev, sortBy: field, sortOrder: newOrder, page: 1 };
    });
  }, []);

  const handlePageChange = useCallback((page: number) => {
    setFilters((prev) => ({ ...prev, page }));
  }, []);

  const handleOpenAdjustmentModal = (item: InventoryItem) => {
    setSelectedItemForAdjustment(item);
    setIsAdjustmentModalOpen(true);
  };

  const handleOpenDetailsModal = (item: InventoryItem) => {
    setSelectedItemForDetails(item);
    setIsDetailsModalOpen(true);
  };

  const handleConfirmAdjustment = async (input: StockAdjustmentInput) => {
    const updated = await adjustStock(input, currentRole);
    showToast(`Stock updated: ${updated.productName} (${updated.companyName}) is now ${updated.currentStock} units.`);
    await Promise.all([
      refetchInventory(true),
      refetchKPIs(),
      refetchInsights(),
    ]);
  };

  // PDF Export
  const handleExportPdf = () => {
    if (inventoryItems.length === 0) return;

    const isAdmin = currentRole === 'admin';
    const headers = [
      'Product Name',
      'Generic Name',
      'Dosage & Form',
      'Manufacturer',
      'Category',
      'Barcode',
      'Stock',
      ...(isAdmin ? ['Reorder', 'Base Cost (₦)', 'Value (₦)'] : []),
      'Price (₦)',
      'Status',
    ];

    const rows = inventoryItems.map((item) => [
      item.productName,
      item.genericName,
      `${item.dosage} ${item.form}`,
      item.companyName,
      item.category,
      item.barcode,
      item.currentStock,
      ...(isAdmin ? [item.reorderLevel, item.basePrice.toLocaleString(), item.inventoryValue.toLocaleString()] : []),
      item.sellingPrice.toLocaleString(),
      item.stockStatus,
    ]);

    exportTableToPDF('inventory_stock_report', headers, rows, {
      title: 'Current Medicine Store Inventory & Stock Level Report',
      subtitle: `Total Items: ${inventoryItems.length} | Exported on ${new Date().toLocaleDateString()}`,
      orientation: 'landscape',
      includeSignatures: true,
      footerNote: 'Confidential - Al-Amaan Medicine Store Stock Register',
    });
  };

  return (
    <div className="space-y-5">
      {/* Toast Notification */}
      {notification && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-lg shadow-xl border border-slate-700 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-xs font-semibold">{notification}</span>
        </div>
      )}

      {/* Module Title & Tab Navigation Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2">
            <Boxes className="w-5 h-5 text-blue-600" />
            <span>Inventory Management</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Monitor real-time physical stock levels, low-stock warnings, and audit adjustments
          </p>
        </div>

        {/* View Tabs */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg self-start sm:self-auto">
          <button
            id="tab-inventory-list"
            onClick={() => setActiveTab('inventory_list')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-md flex items-center gap-1.5 transition-all ${
              activeTab === 'inventory_list'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Current Stock</span>
          </button>

          <button
            id="tab-inventory-insights"
            onClick={() => setActiveTab('insights')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-md flex items-center gap-1.5 transition-all ${
              activeTab === 'insights'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Insights & Audit</span>
          </button>
        </div>
      </div>

      {/* Low Stock Alert Banner */}
      {activeTab === 'inventory_list' && (
        <InventoryLowStockAlertBanner
          kpis={kpis}
          currentRole={currentRole}
          onFilterLowStock={() => handleFilterChange({ stockStatus: 'low_stock', page: 1 })}
          onFilterOutOfStock={() => handleFilterChange({ stockStatus: 'out_of_stock', page: 1 })}
          onOpenAlertCenter={() => onOpenLowStockAlerts && onOpenLowStockAlerts()}
        />
      )}

      {/* 5 KPI Metric Summary Cards (Always Visible in List Tab) */}
      {activeTab === 'inventory_list' && (
        <InventoryMetricCards
          kpis={kpis}
          currentRole={currentRole}
          isLoading={isKpiLoading}
          activeStockStatusFilter={filters.stockStatus}
          onSelectStockStatus={(status) => handleFilterChange({ stockStatus: status, page: 1 })}
        />
      )}

      {/* Main Tab Content */}
      {activeTab === 'inventory_list' ? (
        <div className="space-y-4">
          {/* Low / Out of stock informative alert if filtered */}
          {filters.stockStatus === 'low_stock' && (
            <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-lg flex items-center justify-between gap-3 text-xs text-amber-900">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  <strong>Low-Stock View:</strong> Displaying {total} items at or below reorder threshold. Inspect lines to decide replenishment. Note: Procurement is not automated.
                </span>
              </div>
              <button
                onClick={() => handleFilterChange({ stockStatus: 'all', page: 1 })}
                className="font-bold underline hover:text-amber-950 shrink-0"
              >
                Show All
              </button>
            </div>
          )}

          {filters.stockStatus === 'out_of_stock' && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-lg flex items-center justify-between gap-3 text-xs text-rose-900">
              <div className="flex items-center gap-2">
                <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>
                  <strong>Out-of-Stock View:</strong> Displaying {total} products with zero units on hand. Review affected lines for replenishment planning.
                </span>
              </div>
              <button
                onClick={() => handleFilterChange({ stockStatus: 'all', page: 1 })}
                className="font-bold underline hover:text-rose-950 shrink-0"
              >
                Show All
              </button>
            </div>
          )}

          {/* Filters Bar */}
          <InventoryFilters
            filters={filters}
            onFilterChange={handleFilterChange}
            categories={categories}
            companies={companies}
            currentRole={currentRole}
            kpis={kpis}
            isSearching={isSearching}
            onExportPdf={handleExportPdf}
          />

          {/* Error Alert */}
          {listError && (
            <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{listError}</span>
              </div>
              <button
                onClick={() => refetchInventory(true)}
                className="px-3 py-1 bg-white border border-rose-300 rounded font-semibold text-rose-700 hover:bg-rose-100"
              >
                Retry
              </button>
            </div>
          )}

          {/* Desktop & Tablet Table */}
          <div className="hidden md:block">
            <InventoryTable
              items={inventoryItems}
              isLoading={isLoading}
              isStale={isStale}
              total={total}
              currentPage={currentPage}
              totalPages={totalPages}
              filters={filters}
              onSortChange={handleSortChange}
              onPageChange={handlePageChange}
              onAdjustStock={handleOpenAdjustmentModal}
              onSelectItem={handleOpenDetailsModal}
              onViewProduct={onNavigateToProduct}
              currentRole={currentRole}
              onResetFilters={() =>
                handleFilterChange({
                  search: '',
                  category: 'All Categories',
                  company: 'All',
                  stockStatus: 'all',
                  sortBy: 'name',
                  sortOrder: 'asc',
                  page: 1,
                })
              }
            />
          </div>

          {/* Mobile Card List */}
          <InventoryMobileList
            items={inventoryItems}
            isLoading={isLoading}
            total={total}
            currentPage={currentPage}
            totalPages={totalPages}
            filters={filters}
            onPageChange={handlePageChange}
            onAdjustStock={handleOpenAdjustmentModal}
            onSelectItem={handleOpenDetailsModal}
            onViewProduct={onNavigateToProduct}
            currentRole={currentRole}
            onResetFilters={() =>
              handleFilterChange({
                search: '',
                category: 'All Categories',
                company: 'All',
                stockStatus: 'all',
                page: 1,
              })
            }
          />
        </div>
      ) : (
        /* Operational Insights & Audit Ledger View */
        <InventoryInsightsView
          insights={insights}
          isLoading={isInsightsLoading}
          timeframe={insightsTimeframe}
          onTimeframeChange={setInsightsTimeframe}
          currentRole={currentRole}
          onSelectProduct={onNavigateToProduct}
          onRefresh={() => refetchInsights()}
        />
      )}

      {/* Stock Adjustment Modal */}
      <StockAdjustmentModal
        isOpen={isAdjustmentModalOpen}
        onClose={() => {
          setIsAdjustmentModalOpen(false);
          setSelectedItemForAdjustment(null);
        }}
        item={selectedItemForAdjustment}
        onConfirm={handleConfirmAdjustment}
        currentRole={currentRole}
      />

      {/* Product Variant Details Modal */}
      <InventoryDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={() => {
          setIsDetailsModalOpen(false);
          setSelectedItemForDetails(null);
        }}
        item={selectedItemForDetails}
        currentRole={currentRole}
        onAdjustStock={handleOpenAdjustmentModal}
        onViewProduct={onNavigateToProduct}
      />
    </div>
  );
};
