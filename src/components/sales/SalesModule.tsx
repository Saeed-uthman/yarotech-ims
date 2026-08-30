import React, { useState } from 'react';
import {
  DollarSign,
  TrendingUp,
  Receipt,
  Plus,
  ShoppingBag,
  RotateCw,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
} from 'lucide-react';
import {
  Sale,
  SalesFilterParams,
  SalesDateRange,
  UserRole,
  SystemSettings,
} from '../../types';
import {
  useSales,
  useSalesSummary,
  useSalesChart,
  useSaleReceipt,
} from '../../hooks/useSales';
import { SalesSummaryCards } from './SalesSummaryCards';
import { SalesFilters } from './SalesFilters';
import { SalesChart } from './SalesChart';
import { SalesTable } from './SalesTable';
import { SalesCardList } from './SalesCardList';
import { SaleDetailsModal } from './SaleDetailsModal';
import { SaleReceiptModal } from './SaleReceiptModal';
import { NewSaleModal } from './NewSaleModal';
import { SaleReturnModal } from './SaleReturnModal';

interface SalesModuleProps {
  role: UserRole;
  settings: SystemSettings;
  onNavigateToCustomer?: (customerId: string) => void;
}

export const SalesModule: React.FC<SalesModuleProps> = ({
  role,
  settings,
  onNavigateToCustomer,
}) => {
  // Filter state
  const [filters, setFilters] = useState<SalesFilterParams>({
    search: '',
    dateRange: 'today',
    paymentStatus: 'all',
    customerType: 'all',
    sortBy: 'date',
    sortOrder: 'desc',
    page: 1,
    limit: 10,
  });

  // Modal states
  const [selectedSaleForDetails, setSelectedSaleForDetails] = useState<Sale | null>(null);
  const [selectedSaleIdForReceipt, setSelectedSaleIdForReceipt] = useState<string | null>(null);
  const [isNewSaleOpen, setIsNewSaleOpen] = useState(false);
  const [selectedSaleForReturn, setSelectedSaleForReturn] = useState<Sale | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Data fetching hooks
  const {
    sales,
    total,
    currentPage,
    totalPages,
    isLoading: isLoadingSales,
    isSearching,
    isStale,
    error: salesError,
    refetch: refetchSales,
  } = useSales(filters, role);

  const {
    summary,
    isLoading: isLoadingSummary,
    error: summaryError,
    refetch: refetchSummary,
  } = useSalesSummary(filters, role);

  const {
    chartData,
    isLoading: isLoadingChart,
    refetch: refetchChart,
  } = useSalesChart(filters.dateRange, role, filters.startDate, filters.endDate);

  const {
    sale: selectedSaleForReceipt,
    isLoading: isLoadingReceipt,
    error: receiptError,
    refetch: refetchReceipt,
  } = useSaleReceipt(selectedSaleIdForReceipt, role);

  // Filter change handlers
  const handleFilterChange = (updates: Partial<SalesFilterParams>) => {
    setFilters((prev) => ({ ...prev, ...updates }));
  };

  const handleResetFilters = () => {
    setFilters({
      search: '',
      dateRange: 'today',
      startDate: undefined,
      endDate: undefined,
      paymentStatus: 'all',
      customerType: 'all',
      sortBy: 'date',
      sortOrder: 'desc',
      page: 1,
      limit: 10,
    });
  };

  const handleRefreshAll = () => {
    refetchSales();
    refetchSummary();
    refetchChart();
  };

  // Handlers for modal interactions
  const handleViewSale = (sale: Sale) => {
    setSelectedSaleForDetails(sale);
  };

  const handlePrintReceipt = (sale: Sale) => {
    setSelectedSaleIdForReceipt(sale.id);
  };

  const handleSaleCreated = (newSale: Sale) => {
    setIsNewSaleOpen(false);
    handleRefreshAll();
    setSuccessToast(`Sale ${newSale.invoiceNumber} recorded successfully!`);
    setTimeout(() => setSuccessToast(null), 5000);
    // Optionally open receipt immediately
    setSelectedSaleIdForReceipt(newSale.id);
  };

  return (
    <div id="sales-module" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 animate-in fade-in duration-200">
      {/* Module Title & Header Action Strip */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">
              Sales History & Revenue
            </h1>
            <span
              className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                role === 'admin'
                  ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                  : 'bg-blue-50 text-blue-700 border border-blue-200'
              }`}
            >
              {role === 'admin' ? 'Admin Full Access' : 'Cashier View'}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Track daily receipts, analyze profit margins, inspect customer orders, and manage sales records.
          </p>
        </div>

        {/* Header Action Buttons */}
        <div className="flex items-center gap-2.5">
          <button
            id="header-record-sale-btn"
            type="button"
            onClick={() => setIsNewSaleOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl text-xs sm:text-sm font-bold shadow-xs hover:shadow-md transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Record New Sale</span>
          </button>
        </div>
      </div>

      {/* Success Notification Banner */}
      {successToast && (
        <div
          id="sales-success-toast"
          className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center justify-between shadow-2xs animate-in fade-in slide-in-from-top-2"
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{successToast}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessToast(null)}
            className="text-emerald-600 hover:text-emerald-900 text-xs"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Error Alert */}
      {(salesError || summaryError) && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600" />
          <span>{salesError || summaryError}</span>
        </div>
      )}

      {/* KPI Cards Strip */}
      <SalesSummaryCards
        summary={summary}
        filters={filters}
        role={role}
        isLoading={isLoadingSummary}
      />

      {/* Timeline Chart */}
      <SalesChart
        data={chartData}
        dateRange={filters.dateRange}
        role={role}
        isLoading={isLoadingChart}
      />

      {/* Filter Controls Panel */}
      <SalesFilters
        filters={filters}
        onFilterChange={handleFilterChange}
        onResetFilters={handleResetFilters}
        onRefresh={handleRefreshAll}
        onOpenNewSale={() => setIsNewSaleOpen(true)}
        role={role}
        isSearching={isSearching}
        isLoading={isLoadingSales}
      />

      {/* Desktop Sales Table View */}
      <SalesTable
        sales={sales}
        isLoading={isLoadingSales}
        role={role}
        currentPage={currentPage}
        totalPages={totalPages}
        totalRecords={total}
        perPage={filters.limit || 10}
        onPageChange={(page) => handleFilterChange({ page })}
        onPerPageChange={(limit) => handleFilterChange({ limit, page: 1 })}
        onViewSale={handleViewSale}
        onPrintReceipt={handlePrintReceipt}
        onNavigateToCustomer={onNavigateToCustomer}
      />

      {/* Mobile Sales Card List View */}
      <SalesCardList
        sales={sales}
        isLoading={isLoadingSales}
        role={role}
        currentPage={currentPage}
        totalPages={totalPages}
        totalRecords={total}
        onPageChange={(page) => handleFilterChange({ page })}
        onViewSale={handleViewSale}
        onPrintReceipt={handlePrintReceipt}
        onNavigateToCustomer={onNavigateToCustomer}
      />

      {/* Sale Details Modal */}
      <SaleDetailsModal
        sale={selectedSaleForDetails}
        isOpen={!!selectedSaleForDetails}
        onClose={() => setSelectedSaleForDetails(null)}
        onPrintReceipt={handlePrintReceipt}
        onNavigateToCustomer={onNavigateToCustomer}
        role={role}
        onReturnSale={(sale) => {
          setSelectedSaleForDetails(null);
          setSelectedSaleForReturn(sale);
        }}
      />

      <SaleReturnModal
        sale={selectedSaleForReturn}
        isOpen={!!selectedSaleForReturn}
        onClose={() => setSelectedSaleForReturn(null)}
        onSuccess={() => {
          handleRefreshAll();
          setSuccessToast('Sale return recorded and inventory restored.');
          setTimeout(() => setSuccessToast(null), 5000);
        }}
      />

      {/* Sale Receipt Modal */}
      <SaleReceiptModal
        sale={selectedSaleForReceipt}
        isOpen={!!selectedSaleIdForReceipt}
        isLoading={isLoadingReceipt}
        error={receiptError}
        onRetry={refetchReceipt}
        onClose={() => setSelectedSaleIdForReceipt(null)}
      />

      {/* New Sale POS Checkout Modal */}
      <NewSaleModal
        isOpen={isNewSaleOpen}
        onClose={() => setIsNewSaleOpen(false)}
        onSuccess={handleSaleCreated}
        role={role}
        settings={settings}
      />
    </div>
  );
};
