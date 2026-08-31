import React, { useState } from 'react';
import {
  PackageCheck,
  Plus,
  RotateCw,
  CheckCircle2,
  AlertCircle,
  Building2,
  Layers,
} from 'lucide-react';
import {
  StockPurchase,
  PurchaseFilterParams,
  UserRole,
} from '../../types';
import {
  usePurchases,
  usePurchaseSummary,
  usePurchaseChart,
  usePurchaseDetails,
} from '../../hooks/usePurchases';
import { PurchaseSummaryCards } from './PurchaseSummaryCards';
import { PurchaseFilters } from './PurchaseFilters';
import { PurchaseChart } from './PurchaseChart';
import { PurchaseTable } from './PurchaseTable';
import { PurchaseCardList } from './PurchaseCardList';
import { CreatePurchaseModal } from './CreatePurchaseModal';
import { PurchaseDetailsModal } from './PurchaseDetailsModal';
import { CancelPurchaseConfirmModal } from './CancelPurchaseConfirmModal';
import { PurchaseReturnModal } from './PurchaseReturnModal';

interface PurchasesModuleProps {
  role: UserRole;
  onNavigateToInventory?: () => void;
}

export const PurchasesModule: React.FC<PurchasesModuleProps> = ({
  role,
  onNavigateToInventory,
}) => {
  // Filter state
  const [filters, setFilters] = useState<PurchaseFilterParams>({
    search: '',
    dateRange: 'today',
    paymentMethod: 'all',
    status: 'all',
    sortBy: 'date',
    sortOrder: 'desc',
    page: 1,
    limit: 10,
  });

  // Modal states
  const [selectedPurchaseForDetails, setSelectedPurchaseForDetails] = useState<StockPurchase | null>(null);
  const [selectedPurchaseForCancel, setSelectedPurchaseForCancel] = useState<StockPurchase | null>(null);
  const [selectedPurchaseForReturn, setSelectedPurchaseForReturn] = useState<StockPurchase | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Data fetching hooks
  const {
    purchases,
    total,
    currentPage,
    totalPages,
    isLoading: isLoadingPurchases,
    isSearching,
    error: purchasesError,
    refetch: refetchPurchases,
  } = usePurchases(filters, role);

  const {
    summary,
    isLoading: isLoadingSummary,
    error: summaryError,
    refetch: refetchSummary,
  } = usePurchaseSummary(filters, role);

  const {
    chartData,
    isLoading: isLoadingChart,
    refetch: refetchChart,
  } = usePurchaseChart(filters.dateRange, role, filters.startDate, filters.endDate);

  const {
    purchase: detailedPurchase,
    isLoading: isLoadingPurchaseDetails,
    error: purchaseDetailsError,
    refetch: refetchPurchaseDetails,
  } = usePurchaseDetails(selectedPurchaseForDetails?.id || null, role);

  // Filter handlers
  const handleFilterChange = (updates: Partial<PurchaseFilterParams>) => {
    setFilters((prev) => ({ ...prev, ...updates }));
  };

  const handleResetFilters = () => {
    setFilters({
      search: '',
      dateRange: 'today',
      startDate: undefined,
      endDate: undefined,
      paymentMethod: 'all',
      status: 'all',
      sortBy: 'date',
      sortOrder: 'desc',
      page: 1,
      limit: 10,
    });
  };

  const handleRefreshAll = () => {
    refetchPurchases();
    refetchSummary();
    refetchChart();
  };

  // Handlers for creations & cancellations
  const handlePurchaseCreated = (newPurchase: StockPurchase) => {
    setIsCreateModalOpen(false);
    handleRefreshAll();
    setSuccessToast(`Stock Purchase ${newPurchase.purchaseNumber} recorded and inventory updated successfully!`);
    setTimeout(() => setSuccessToast(null), 5000);
    setSelectedPurchaseForDetails(newPurchase);
  };

  const handlePurchaseCancelled = (cancelledPurchase: StockPurchase) => {
    setSelectedPurchaseForCancel(null);
    handleRefreshAll();
    setSuccessToast(`Purchase ${cancelledPurchase.purchaseNumber} has been cancelled. Inventory additions were reversed.`);
    setTimeout(() => setSuccessToast(null), 5000);
  };

  return (
    <div id="purchases-module" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 animate-in fade-in duration-200">
      {/* Header Strip */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">
              Stock Purchases & Procurement
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
              Part 7 Stock In
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Log procurement from manufacturers, track capital outflow, and maintain strict inventory accountability.
          </p>
        </div>

        {/* Action button */}
        <div className="flex items-center gap-2.5">
          <button
            id="header-record-purchase-btn"
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-xl text-xs sm:text-sm font-bold shadow-xs hover:shadow-md transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Record Stock Purchase</span>
          </button>
        </div>
      </div>

      {/* Success Notification Banner */}
      {successToast && (
        <div
          id="purchases-success-toast"
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
      {(purchasesError || summaryError) && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600" />
          <span>{purchasesError || summaryError}</span>
        </div>
      )}

      {/* KPI Cards Strip */}
      <PurchaseSummaryCards
        summary={summary}
        filters={filters}
        isLoading={isLoadingSummary}
      />

      {/* Trend Chart */}
      <PurchaseChart
        data={chartData}
        dateRange={filters.dateRange}
        isLoading={isLoadingChart}
      />

      {/* Filter Controls Panel */}
      <PurchaseFilters
        filters={filters}
        onFilterChange={handleFilterChange}
        onResetFilters={handleResetFilters}
        onRefresh={handleRefreshAll}
        onOpenNewPurchase={() => setIsCreateModalOpen(true)}
        role={role}
        isSearching={isSearching}
        isLoading={isLoadingPurchases}
      />

      {/* Desktop Purchases Table */}
      <PurchaseTable
        purchases={purchases}
        isLoading={isLoadingPurchases}
        role={role}
        currentPage={currentPage}
        totalPages={totalPages}
        totalRecords={total}
        perPage={filters.limit || 10}
        onPageChange={(page) => handleFilterChange({ page })}
        onPerPageChange={(limit) => handleFilterChange({ limit, page: 1 })}
        onViewPurchase={(purchase) => setSelectedPurchaseForDetails(purchase)}
        onCancelPurchase={(purchase) => setSelectedPurchaseForCancel(purchase)}
      />

      {/* Mobile Purchases Card List */}
      <PurchaseCardList
        purchases={purchases}
        isLoading={isLoadingPurchases}
        role={role}
        currentPage={currentPage}
        totalPages={totalPages}
        totalRecords={total}
        onPageChange={(page) => handleFilterChange({ page })}
        onViewPurchase={(purchase) => setSelectedPurchaseForDetails(purchase)}
      />

      {/* Create Purchase Modal */}
      <CreatePurchaseModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={handlePurchaseCreated}
        role={role}
      />

      {/* Purchase Details Modal */}
      <PurchaseDetailsModal
        purchase={detailedPurchase}
        isOpen={!!selectedPurchaseForDetails}
        isLoading={isLoadingPurchaseDetails}
        error={purchaseDetailsError}
        onRetry={refetchPurchaseDetails}
        onClose={() => setSelectedPurchaseForDetails(null)}
        onCancelPurchase={(p) => setSelectedPurchaseForCancel(p)}
        onReturnPurchase={(p) => setSelectedPurchaseForReturn(p)}
        onSupplierPayment={() => {
          handleRefreshAll();
          setSuccessToast('Supplier payment recorded and outstanding purchase balance updated.');
          setTimeout(() => setSuccessToast(null), 5000);
        }}
        role={role}
      />

      <PurchaseReturnModal
        purchase={selectedPurchaseForReturn}
        isOpen={!!selectedPurchaseForReturn}
        onClose={() => setSelectedPurchaseForReturn(null)}
        onSuccess={() => {
          handleRefreshAll();
          setSuccessToast('Stock purchase return recorded and inventory adjusted.');
          setTimeout(() => setSuccessToast(null), 5000);
        }}
      />

      {/* Cancel Purchase Confirm Modal */}
      <CancelPurchaseConfirmModal
        purchase={selectedPurchaseForCancel}
        isOpen={!!selectedPurchaseForCancel}
        onClose={() => setSelectedPurchaseForCancel(null)}
        onSuccess={handlePurchaseCancelled}
      />
    </div>
  );
};
