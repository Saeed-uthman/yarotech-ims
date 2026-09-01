import React from 'react';
import {
  Search,
  X,
  Calendar,
  Filter,
  ArrowDownLeft,
  ArrowUpRight,
  Receipt,
  ShoppingCart,
  Users,
  Briefcase,
  WalletCards,
  RotateCcw,
} from 'lucide-react';
import {
  AccountabilityFilterParams,
  AccountabilityDateRange,
  AccountabilityDirection,
  AccountabilityType,
} from '../../types';

interface AccountabilityFilterBarProps {
  filters: AccountabilityFilterParams;
  onFilterChange: (updates: Partial<AccountabilityFilterParams>) => void;
  onResetFilters: () => void;
  isSearching: boolean;
  totalResults: number;
}

export const AccountabilityFilterBar: React.FC<
  AccountabilityFilterBarProps
> = ({
  filters,
  onFilterChange,
  onResetFilters,
  isSearching,
  totalResults,
}) => {
  const dateRanges: { id: AccountabilityDateRange; label: string }[] = [
    { id: 'today', label: 'Today' },
    { id: 'this_week', label: 'This Week' },
    { id: 'this_month', label: 'This Month' },
    { id: 'overall', label: 'All Time' },
    { id: 'custom', label: 'Custom Range' },
  ];

  const directionTabs: {
    id: 'all' | AccountabilityDirection;
    label: string;
    icon?: React.ComponentType<{ className?: string }>;
  }[] = [
    { id: 'all', label: 'All Movements' },
    { id: 'IN', label: 'Money In (+)', icon: ArrowDownLeft },
    { id: 'OUT', label: 'Money Out (−)', icon: ArrowUpRight },
  ];

  const typePills: {
    id: 'all' | AccountabilityType;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }[] = [
    { id: 'all', label: 'All Types', icon: Filter },
    { id: 'SALE', label: 'Sales', icon: Receipt },
    { id: 'DEBT_PAYMENT', label: 'Debt Payments', icon: Users },
    { id: 'STOCK_PURCHASE', label: 'Stock Purchases', icon: ShoppingCart },
    { id: 'OTHER_EXPENSE', label: 'Other Expenses', icon: Briefcase },
    { id: 'OWNER_CAPITAL', label: 'Owner Capital', icon: WalletCards },
    { id: 'OWNER_WITHDRAWAL', label: 'Owner Withdrawals', icon: WalletCards },
  ];

  const isFiltered =
    filters.search !== '' ||
    filters.dateRange !== 'today' ||
    filters.direction !== 'all' ||
    filters.type !== 'all' ||
    filters.category !== 'all';

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-xs mb-5 space-y-4">
      {/* Search and Direction Tabs */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            id="input-accountability-search"
            type="text"
            value={filters.search}
            onChange={(e) => onFilterChange({ search: e.target.value, page: 1 })}
            placeholder="Search by transaction #, reference, description, customer, product..."
            className="w-full pl-10 pr-9 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
          />
          {filters.search && (
            <button
              type="button"
              id="btn-clear-accountability-search"
              onClick={() => onFilterChange({ search: '', page: 1 })}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Direction Segmented Control (IN / OUT / ALL) */}
        <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200 shrink-0 self-start md:self-auto">
          {directionTabs.map((tab) => {
            const isActive = filters.direction === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                id={`tab-direction-${tab.id}`}
                type="button"
                onClick={() => onFilterChange({ direction: tab.id, page: 1 })}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  isActive
                    ? tab.id === 'IN'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : tab.id === 'OUT'
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {Icon && <Icon className="w-3.5 h-3.5" />}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Date Range Selector */}
      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
        <span className="text-xs font-semibold text-slate-500 mr-1 flex items-center gap-1">
          <Calendar className="w-3.5 h-3.5" />
          Period:
        </span>
        {dateRanges.map((range) => {
          const isActive = filters.dateRange === range.id;
          return (
            <button
              key={range.id}
              id={`btn-period-${range.id}`}
              type="button"
              onClick={() => onFilterChange({ dateRange: range.id, page: 1 })}
              className={`px-3 py-1 text-xs font-medium rounded-full border transition-all ${
                isActive
                  ? 'bg-slate-900 text-white border-slate-900 font-semibold shadow-xs'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              {range.label}
            </button>
          );
        })}

        {/* Custom date range inputs */}
        {filters.dateRange === 'custom' && (
          <div className="flex items-center gap-2 mt-2 sm:mt-0 w-full sm:w-auto">
            <input
              type="date"
              value={filters.startDate || ''}
              onChange={(e) =>
                onFilterChange({ startDate: e.target.value, page: 1 })
              }
              className="px-2.5 py-1 text-xs bg-white border border-slate-300 rounded-md focus:ring-1 focus:ring-emerald-500"
            />
            <span className="text-xs text-slate-400">to</span>
            <input
              type="date"
              value={filters.endDate || ''}
              onChange={(e) =>
                onFilterChange({ endDate: e.target.value, page: 1 })
              }
              className="px-2.5 py-1 text-xs bg-white border border-slate-300 rounded-md focus:ring-1 focus:ring-emerald-500"
            />
          </div>
        )}
      </div>

      {/* Transaction Type Filters */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          <span className="text-xs font-semibold text-slate-500 mr-1 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" />
            Source:
          </span>
          {typePills.map((type) => {
            const isActive = filters.type === type.id;
            const Icon = type.icon;
            return (
              <button
                key={type.id}
                id={`btn-type-${type.id}`}
                type="button"
                onClick={() => onFilterChange({ type: type.id, page: 1 })}
                className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md border transition-all ${
                  isActive
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300 font-semibold'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <Icon className="w-3 h-3 text-slate-500" />
                <span>{type.label}</span>
              </button>
            );
          })}
        </div>

        {/* Reset filter action */}
        {isFiltered && (
          <button
            type="button"
            id="btn-reset-accountability-filters"
            onClick={onResetFilters}
            className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 font-medium px-2 py-1 rounded hover:bg-slate-100 transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset Filters</span>
          </button>
        )}
      </div>
    </div>
  );
};
