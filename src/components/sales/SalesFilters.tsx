import React, { useState } from 'react';
import {
  Search,
  X,
  Calendar,
  Filter,
  RotateCw,
  Plus,
  ArrowUpDown,
  CheckCircle2,
  AlertCircle,
  Users,
  ChevronDown,
} from 'lucide-react';
import {
  SalesFilterParams,
  SalesDateRange,
  SalePaymentStatus,
  UserRole,
} from '../../types';

interface SalesFiltersProps {
  filters: SalesFilterParams;
  onFilterChange: (updates: Partial<SalesFilterParams>) => void;
  onResetFilters: () => void;
  onRefresh: () => void;
  onOpenNewSale: () => void;
  role: UserRole;
  isSearching: boolean;
  isLoading: boolean;
}

export const SalesFilters: React.FC<SalesFiltersProps> = ({
  filters,
  onFilterChange,
  onResetFilters,
  onRefresh,
  onOpenNewSale,
  role,
  isSearching,
  isLoading,
}) => {
  const [showCustomRange, setShowCustomRange] = useState(
    filters.dateRange === 'custom'
  );
  const [customStart, setCustomStart] = useState(filters.startDate || '2026-08-01');
  const [customEnd, setCustomEnd] = useState(filters.endDate || '2026-08-19');
  const [dateError, setDateError] = useState<string | null>(null);

  const isAdmin = role === 'admin';

  const handleDateRangeSelect = (range: SalesDateRange) => {
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
    filters.paymentStatus !== 'all' ||
    filters.customerType !== 'all';

  return (
    <div id="sales-filters-panel" className="bg-white rounded-xl border border-slate-200 shadow-xs p-4 sm:p-5 mb-6 space-y-4">
      {/* Top row: Search, New Sale Button, Refresh */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search input with debounced spinner */}
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            id="sales-search-input"
            type="text"
            value={filters.search}
            onChange={(e) => onFilterChange({ search: e.target.value, page: 1 })}
            placeholder="Search by invoice #, customer name, phone, product..."
            className="w-full pl-9.5 pr-9 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
          />
          {isSearching ? (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
              <RotateCw className="w-4 h-4 text-blue-500 animate-spin" />
            </div>
          ) : filters.search ? (
            <button
              id="clear-sales-search-btn"
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
            id="refresh-sales-btn"
            type="button"
            onClick={onRefresh}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
            title="Refresh sales list"
          >
            <RotateCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-blue-600' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <button
            id="new-sale-btn"
            type="button"
            onClick={onOpenNewSale}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-sm font-semibold rounded-lg shadow-sm hover:shadow-md transition-all shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Record New Sale</span>
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
          ] as { id: SalesDateRange; label: string }[]
        ).map((tab) => {
          const isActive = filters.dateRange === tab.id;
          return (
            <button
              key={tab.id}
              id={`date-range-tab-${tab.id}`}
              type="button"
              onClick={() => handleDateRangeSelect(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Custom Date Range Picker (Shown when Custom Range is active) */}
      {showCustomRange && (
        <form
          id="custom-date-range-form"
          onSubmit={handleApplyCustomRange}
          className="p-3.5 bg-blue-50/60 rounded-lg border border-blue-100 flex flex-wrap items-center gap-3 animate-in fade-in duration-150"
        >
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-700">From:</span>
            <input
              id="custom-date-start"
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-md text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-700">To:</span>
            <input
              id="custom-date-end"
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-md text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button
            id="apply-custom-date-btn"
            type="submit"
            className="px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-md hover:bg-blue-700 transition-colors shadow-2xs"
          >
            Apply Range
          </button>

          {dateError && (
            <span className="text-xs text-rose-600 font-medium">{dateError}</span>
          )}
        </form>
      )}

      {/* Filter Badges & Sorters Row */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-slate-100 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          {/* Payment Status Filter */}
          <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg">
            <span className="px-2 text-[11px] font-semibold text-slate-500">Status:</span>
            {(['all', 'PAID', 'PARTIAL', 'UNPAID'] as ('all' | SalePaymentStatus)[]).map((status) => {
              const active = filters.paymentStatus === status;
              return (
                <button
                  key={status}
                  id={`filter-payment-${status.toLowerCase()}`}
                  type="button"
                  onClick={() => onFilterChange({ paymentStatus: status, page: 1 })}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                    active
                      ? 'bg-white text-slate-900 shadow-xs font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {status === 'all'
                    ? 'All'
                    : status === 'PAID'
                    ? 'Paid'
                    : status === 'PARTIAL'
                    ? 'Partial'
                    : 'Credit / Unpaid'}
                </button>
              );
            })}
          </div>

          {/* Customer Type Filter */}
          <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg">
            <span className="px-2 text-[11px] font-semibold text-slate-500">Customer:</span>
            {(['all', 'registered', 'walking'] as ('all' | 'registered' | 'walking')[]).map(
              (type) => {
                const active = filters.customerType === type;
                return (
                  <button
                    key={type}
                    id={`filter-customer-${type}`}
                    type="button"
                    onClick={() => onFilterChange({ customerType: type, page: 1 })}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                      active
                        ? 'bg-white text-slate-900 shadow-xs font-semibold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {type === 'all'
                      ? 'All'
                      : type === 'registered'
                      ? 'Registered'
                      : 'Walking'}
                  </button>
                );
              }
            )}
          </div>
        </div>

        {/* Sorting controls and Clear filters */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-[11px] text-slate-500 font-medium">Sort:</span>
            <select
              id="sales-sort-select"
              value={`${filters.sortBy}-${filters.sortOrder}`}
              onChange={(e) => {
                const [sortBy, sortOrder] = e.target.value.split('-') as [any, any];
                onFilterChange({ sortBy, sortOrder, page: 1 });
              }}
              className="bg-slate-50 border border-slate-200 rounded-md px-2 py-1 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="date-desc">Newest First</option>
              <option value="date-asc">Oldest First</option>
              <option value="total-desc">Highest Amount</option>
              <option value="total-asc">Lowest Amount</option>
              {isAdmin && <option value="profit-desc">Highest Profit</option>}
              <option value="customer-asc">Customer (A-Z)</option>
              <option value="invoiceNumber-desc">Invoice # (High-Low)</option>
            </select>
          </div>

          {hasActiveFilters && (
            <button
              id="reset-sales-filters-btn"
              type="button"
              onClick={onResetFilters}
              className="text-xs text-blue-600 hover:text-blue-800 font-medium underline pl-2"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
