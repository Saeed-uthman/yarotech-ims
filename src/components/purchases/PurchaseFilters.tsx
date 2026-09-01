import React, { useState } from 'react';
import {
  Search,
  X,
  RotateCw,
  Plus,
  ArrowUpDown,
  Calendar,
} from 'lucide-react';
import {
  PurchaseFilterParams,
  PurchaseDateRange,
  StockPurchaseStatus,
  PurchasePaymentMethod,
  UserRole,
} from '../../types';

interface PurchaseFiltersProps {
  filters: PurchaseFilterParams;
  onFilterChange: (updates: Partial<PurchaseFilterParams>) => void;
  onResetFilters: () => void;
  onRefresh: () => void;
  onOpenNewPurchase: () => void;
  role: UserRole;
  isSearching: boolean;
  isLoading: boolean;
}

function localToday(): string {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

function localMonthStart(): string {
  const today = localToday();
  return `${today.slice(0, 8)}01`;
}

export const PurchaseFilters: React.FC<PurchaseFiltersProps> = ({
  filters,
  onFilterChange,
  onResetFilters,
  onRefresh,
  onOpenNewPurchase,
  role,
  isSearching,
  isLoading,
}) => {
  const [showCustomRange, setShowCustomRange] = useState(
    filters.dateRange === 'custom'
  );
  const [customStart, setCustomStart] = useState(filters.startDate || localMonthStart);
  const [customEnd, setCustomEnd] = useState(filters.endDate || localToday);
  const [dateError, setDateError] = useState<string | null>(null);

  const handleDateRangeSelect = (range: PurchaseDateRange) => {
    if (range === 'custom') {
      setShowCustomRange(true);
      onFilterChange({
        dateRange: 'custom',
        startDate: customStart,
        endDate: customEnd,
        page: 1,
      });
    } else {
      setShowCustomRange(false);
      setDateError(null);
      onFilterChange({
        dateRange: range,
        startDate: undefined,
        endDate: undefined,
        page: 1,
      });
    }
  };

  const handleApplyCustomRange = (e: React.FormEvent) => {
    e.preventDefault();
    if (customStart && customEnd && customStart > customEnd) {
      setDateError('Start date cannot be after End date.');
      return;
    }
    setDateError(null);
    onFilterChange({
      dateRange: 'custom',
      startDate: customStart,
      endDate: customEnd,
      page: 1,
    });
  };

  const hasActiveFilters =
    filters.search !== '' ||
    filters.dateRange !== 'today' ||
    filters.paymentMethod !== 'all' ||
    filters.status !== 'all';

  return (
    <div id="purchase-filters-panel" className="bg-white rounded-xl border border-slate-200 shadow-xs p-4 sm:p-5 mb-6 space-y-4">
      {/* Top row: Search, Record Purchase Button, Refresh */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search input with debounced spinner */}
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            id="purchase-search-input"
            type="text"
            value={filters.search}
            onChange={(e) => onFilterChange({ search: e.target.value, page: 1 })}
            placeholder="Search by purchase #, product, brand, supplier, recorded by, note..."
            className="w-full pl-9.5 pr-9 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
          />
          {isSearching ? (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
              <RotateCw className="w-4 h-4 text-indigo-500 animate-spin" />
            </div>
          ) : filters.search ? (
            <button
              id="clear-purchase-search-btn"
              type="button"
              onClick={() => onFilterChange({ search: '', page: 1 })}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          ) : null}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          <button
            id="refresh-purchases-btn"
            type="button"
            onClick={onRefresh}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
            title="Refresh stock purchases list"
          >
            <RotateCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-indigo-600' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <button
            id="record-stock-purchase-btn"
            type="button"
            onClick={onOpenNewPurchase}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-sm font-semibold rounded-lg shadow-sm hover:shadow-md transition-all shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Record Stock Purchase</span>
          </button>
        </div>
      </div>

      {/* Date Range Navigation Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 scrollbar-none border-t border-slate-100">
        <span className="text-xs font-semibold text-slate-500 mr-1 hidden sm:inline">Period:</span>
        {(
          [
            { id: 'today', label: 'Today' },
            { id: 'this_week', label: 'This Week' },
            { id: 'this_month', label: 'This Month' },
            { id: 'overall', label: 'All History' },
            { id: 'custom', label: 'Custom Range' },
          ] as { id: PurchaseDateRange; label: string }[]
        ).map((tab) => {
          const isActive = filters.dateRange === tab.id;
          return (
            <button
              key={tab.id}
              id={`purchase-date-tab-${tab.id}`}
              type="button"
              onClick={() => handleDateRangeSelect(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Custom Date Range Form */}
      {showCustomRange && (
        <form
          id="custom-purchase-date-form"
          onSubmit={handleApplyCustomRange}
          className="p-3.5 bg-indigo-50/60 rounded-lg border border-indigo-100 flex flex-wrap items-center gap-3 animate-in fade-in duration-150"
        >
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-700">From:</span>
            <input
              id="custom-purchase-start-date"
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-md text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-700">To:</span>
            <input
              id="custom-purchase-end-date"
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-md text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <button
            id="apply-custom-purchase-date-btn"
            type="submit"
            className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-semibold rounded-md hover:bg-indigo-700 transition-colors shadow-2xs"
          >
            Apply Range
          </button>

          {dateError && (
            <span className="text-xs text-rose-600 font-medium">{dateError}</span>
          )}
        </form>
      )}

      {/* Sorters and Status Filters Row */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-slate-100 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          {/* Payment Method Filter */}
          <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg">
            <span className="px-2 text-[11px] font-semibold text-slate-500">Payment:</span>
            {(['all', 'TRANSFER', 'CASH', 'POS'] as ('all' | PurchasePaymentMethod)[]).map((method) => {
              const active = filters.paymentMethod === method;
              return (
                <button
                  key={method}
                  id={`filter-purchase-payment-${method.toLowerCase()}`}
                  type="button"
                  onClick={() => onFilterChange({ paymentMethod: method, page: 1 })}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                    active
                      ? 'bg-white text-slate-900 shadow-xs font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {method === 'all'
                    ? 'All'
                    : method === 'TRANSFER'
                    ? 'Bank Transfer'
                    : method === 'CASH'
                    ? 'Cash'
                    : 'POS'}
                </button>
              );
            })}
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg">
            <span className="px-2 text-[11px] font-semibold text-slate-500">Status:</span>
            {(['all', 'COMPLETED', 'CANCELLED'] as ('all' | StockPurchaseStatus)[]).map((status) => {
              const active = filters.status === status;
              return (
                <button
                  key={status}
                  id={`filter-purchase-status-${status.toLowerCase()}`}
                  type="button"
                  onClick={() => onFilterChange({ status, page: 1 })}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                    active
                      ? 'bg-white text-slate-900 shadow-xs font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {status === 'all'
                    ? 'All'
                    : status === 'COMPLETED'
                    ? 'Completed'
                    : 'Cancelled'}
                </button>
              );
            })}
          </div>
        </div>

        {/* Sorting controls and Clear filters */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-[11px] text-slate-500 font-medium">Sort:</span>
            <select
              id="purchase-sort-select"
              value={`${filters.sortBy}-${filters.sortOrder}`}
              onChange={(e) => {
                const [sortBy, sortOrder] = e.target.value.split('-') as [any, any];
                onFilterChange({ sortBy, sortOrder, page: 1 });
              }}
              className="bg-slate-50 border border-slate-200 rounded-md px-2 py-1 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="date-desc">Newest First</option>
              <option value="date-asc">Oldest First</option>
              <option value="total-desc">Highest Capital Outflow</option>
              <option value="total-asc">Lowest Capital Outflow</option>
              <option value="items-desc">Most Items Count</option>
              <option value="purchaseNumber-desc">Purchase # (High-Low)</option>
            </select>
          </div>

          {hasActiveFilters && (
            <button
              id="reset-purchase-filters-btn"
              type="button"
              onClick={onResetFilters}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-medium underline pl-2"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
