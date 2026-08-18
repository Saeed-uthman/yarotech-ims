import React from 'react';
import {
  Search,
  X,
  RotateCw,
  SlidersHorizontal,
  ArrowUpDown,
  Filter,
  Users,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { CustomerFilterParams } from '../../types';

interface CustomerFiltersProps {
  filters: CustomerFilterParams;
  onFilterChange: (updates: Partial<CustomerFilterParams>) => void;
  onReset: () => void;
  onRefresh: () => void;
  totalCount: number;
  isLoading?: boolean;
  isSearching?: boolean;
  isStale?: boolean;
}

export const CustomerFilters: React.FC<CustomerFiltersProps> = ({
  filters,
  onFilterChange,
  onReset,
  onRefresh,
  totalCount,
  isLoading = false,
  isSearching = false,
  isStale = false,
}) => {
  const hasActiveFilters = Boolean(
    (filters.search && filters.search.trim()) ||
    (filters.status && filters.status !== 'all') ||
    (filters.debtStatus && filters.debtStatus !== 'all')
  );

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4 mb-4 shadow-xs">
      <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
        {/* Search Bar */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            id="customer-search-input"
            type="text"
            placeholder="Search by customer name, phone number, email, or address..."
            value={filters.search || ''}
            onChange={(e) => onFilterChange({ search: e.target.value, page: 1 })}
            className="w-full pl-9 pr-9 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
          />
          {filters.search ? (
            <button
              id="btn-clear-customer-search"
              onClick={() => onFilterChange({ search: '', page: 1 })}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded transition-colors"
              title="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : isSearching ? (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <RotateCw className="w-3.5 h-3.5 text-blue-500 animate-spin" />
            </div>
          ) : null}
        </div>

        {/* Filter Controls Row */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Debt Status Quick Tabs */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
            <button
              id="filter-debt-all"
              onClick={() => onFilterChange({ debtStatus: 'all', page: 1 })}
              className={`px-2.5 py-1.5 rounded-md font-medium transition-all ${
                !filters.debtStatus || filters.debtStatus === 'all'
                  ? 'bg-white text-slate-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All
            </button>
            <button
              id="filter-debt-has-debt"
              onClick={() => onFilterChange({ debtStatus: 'has_debt', page: 1 })}
              className={`px-2.5 py-1.5 rounded-md font-medium flex items-center gap-1 transition-all ${
                filters.debtStatus === 'has_debt'
                  ? 'bg-amber-500 text-white shadow-xs font-semibold'
                  : 'text-amber-700 hover:text-amber-800'
              }`}
            >
              <AlertCircle className="w-3 h-3" />
              In Debt
            </button>
            <button
              id="filter-debt-no-debt"
              onClick={() => onFilterChange({ debtStatus: 'no_debt', page: 1 })}
              className={`px-2.5 py-1.5 rounded-md font-medium flex items-center gap-1 transition-all ${
                filters.debtStatus === 'no_debt'
                  ? 'bg-white text-emerald-700 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              No Debt
            </button>
          </div>

          {/* Customer Status Dropdown */}
          <select
            id="filter-customer-status"
            value={filters.status || 'all'}
            onChange={(e) => onFilterChange({ status: e.target.value as any, page: 1 })}
            className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
          >
            <option value="all">Status: All</option>
            <option value="active">Status: Active</option>
            <option value="inactive">Status: Inactive</option>
          </select>

          {/* Sort By Dropdown */}
          <select
            id="sort-customer-by"
            value={filters.sortBy || 'name'}
            onChange={(e) => onFilterChange({ sortBy: e.target.value as any, page: 1 })}
            className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
          >
            <option value="name">Sort: Name</option>
            <option value="debt">Sort: Debt Amount</option>
            <option value="purchases">Sort: Total Purchases</option>
            <option value="date">Sort: Recent Activity</option>
          </select>

          {/* Sort Order Toggle */}
          <button
            id="btn-sort-order-toggle"
            onClick={() =>
              onFilterChange({
                sortOrder: filters.sortOrder === 'asc' ? 'desc' : 'asc',
                page: 1,
              })
            }
            className="p-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-colors"
            title={`Sort Order: ${filters.sortOrder === 'asc' ? 'Ascending' : 'Descending'}`}
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
          </button>

          {/* Refresh Data Button */}
          <button
            id="btn-refresh-customers"
            onClick={onRefresh}
            disabled={isLoading}
            className="p-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 hover:border-slate-300 disabled:opacity-50 transition-colors"
            title="Refresh customer database"
          >
            <RotateCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-blue-600' : ''}`} />
          </button>

          {/* Clear Filters (if active) */}
          {hasActiveFilters && (
            <button
              id="btn-reset-customer-filters"
              onClick={onReset}
              className="text-xs text-rose-600 hover:text-rose-700 font-medium px-2 py-1.5 hover:bg-rose-50 rounded-lg transition-colors flex items-center gap-1"
            >
              <X className="w-3.5 h-3.5" />
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Filter Status Bar */}
      <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-slate-100 text-xs text-slate-500">
        <div className="flex items-center gap-2">
          <span>
            Found <strong className="text-slate-800 font-semibold">{totalCount}</strong> registered customer{totalCount === 1 ? '' : 's'}
          </span>
          {isStale && (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
              Updating in background...
            </span>
          )}
        </div>

        {hasActiveFilters && (
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] text-slate-400">Active:</span>
            {filters.search && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] bg-slate-100 text-slate-700 border border-slate-200">
                "{filters.search}"
              </span>
            )}
            {filters.debtStatus && filters.debtStatus !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] bg-amber-50 text-amber-800 border border-amber-200">
                {filters.debtStatus === 'has_debt' ? 'Has Debt' : 'No Debt'}
              </span>
            )}
            {filters.status && filters.status !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] bg-blue-50 text-blue-700 border border-blue-200">
                {filters.status === 'active' ? 'Active' : 'Inactive'}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
