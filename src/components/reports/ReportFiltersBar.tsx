import React, { useState } from 'react';
import {
  Calendar,
  Filter,
  RotateCcw,
  RefreshCw,
  Tag,
  Building2,
  Package,
  CreditCard,
  ChevronDown,
} from 'lucide-react';
import {
  ReportDateRange,
  ReportFilterParams,
  CategoryEntity,
  CompanyEntity,
  Product,
} from '../../types';

interface ReportFiltersBarProps {
  dateOnly?: boolean;
  filters: ReportFilterParams;
  onFilterChange: (updates: Partial<ReportFilterParams>) => void;
  onReset: () => void;
  onRefresh: () => void;
  isRefreshing?: boolean;
  categories: CategoryEntity[];
  companies: CompanyEntity[];
  products: Product[];
}

const DATE_RANGE_OPTIONS: { id: ReportDateRange; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: 'this_week', label: 'This Week' },
  { id: 'this_month', label: 'This Month' },
  { id: 'last_month', label: 'Last Month' },
  { id: 'this_year', label: 'This Year' },
  { id: 'custom', label: 'Custom' },
];

export const ReportFiltersBar: React.FC<ReportFiltersBarProps> = ({
  dateOnly = false,
  filters,
  onFilterChange,
  onReset,
  onRefresh,
  isRefreshing = false,
  categories,
  companies,
  products,
}) => {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const isCustom = filters.dateRange === 'custom';

  const hasActiveAdvancedFilters =
    Boolean(filters.categoryId) ||
    Boolean(filters.companyId) ||
    Boolean(filters.productId) ||
    Boolean(filters.paymentMethod && filters.paymentMethod !== 'all');

  return (
    <div className="bg-white rounded-xl border border-gray-200/90 p-4 space-y-3.5 shadow-xs" id="reports-filters-bar">
      {/* Top Bar: Date Range Tabs + Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Date Range Button Group */}
        <div className="inline-flex flex-wrap p-1 bg-gray-100/80 rounded-lg border border-gray-200/70" id="date-range-selector">
          {DATE_RANGE_OPTIONS.map((opt) => {
            const isActive = filters.dateRange === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => onFilterChange({ dateRange: opt.id })}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                  isActive
                    ? 'bg-white text-emerald-700 shadow-xs border border-gray-200/60'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/50'
                }`}
                id={`btn-range-${opt.id}`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>

        {/* Right side: Advanced filter toggle, refresh, reset */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={dateOnly}
            onClick={() => setShowAdvanced((prev) => !prev)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
              hasActiveAdvancedFilters || showAdvanced
                ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            }`}
            id="btn-toggle-advanced-filters"
          >
            <Filter className="w-3.5 h-3.5" />
            <span>Dimension Filters</span>
            {hasActiveAdvancedFilters && (
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            )}
            <ChevronDown
              className={`w-3.5 h-3.5 transition-transform ${
                showAdvanced ? 'rotate-180' : ''
              }`}
            />
          </button>

          <button
            type="button"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
            title="Refresh report data"
            id="btn-refresh-reports"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-emerald-600' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          {(hasActiveAdvancedFilters || isCustom) && (
            <button
              type="button"
              onClick={onReset}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:text-rose-600 bg-gray-50 border border-gray-200 rounded-lg hover:bg-rose-50 transition-colors"
              title="Reset all filters"
              id="btn-reset-report-filters"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* Custom Date Pickers (Shown if Custom selected) */}
      {isCustom && (
        <div className="flex flex-wrap items-center gap-3 p-3 bg-emerald-50/60 rounded-lg border border-emerald-200 animate-in fade-in duration-150" id="custom-date-range-inputs">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-emerald-700" />
            <span className="text-xs font-semibold text-emerald-800">Custom Date Span:</span>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <label htmlFor="report-start-date" className="text-xs text-gray-600">From:</label>
              <input
                id="report-start-date"
                type="date"
                value={filters.startDate || '2026-08-01'}
                onChange={(e) => onFilterChange({ startDate: e.target.value })}
                className="px-2.5 py-1 text-xs border border-gray-300 rounded-md bg-white focus:ring-1 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>

            <div className="flex items-center gap-1.5">
              <label htmlFor="report-end-date" className="text-xs text-gray-600">To:</label>
              <input
                id="report-end-date"
                type="date"
                value={filters.endDate || '2026-08-19'}
                onChange={(e) => onFilterChange({ endDate: e.target.value })}
                className="px-2.5 py-1 text-xs border border-gray-300 rounded-md bg-white focus:ring-1 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>
          </div>
        </div>
      )}

      {/* Advanced Filters Panel: Category, Manufacturer, Product, Payment Method */}
      {!dateOnly && showAdvanced && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t border-gray-100 animate-in fade-in duration-150" id="advanced-report-filters-grid">
          {/* Category Filter */}
          <div>
            <label htmlFor="filter-category" className="flex items-center gap-1 text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">
              <Tag className="w-3 h-3" /> Category
            </label>
            <select
              id="filter-category"
              value={filters.categoryId || ''}
              onChange={(e) => onFilterChange({ categoryId: e.target.value || undefined })}
              className="w-full px-2.5 py-1.5 text-xs bg-gray-50/50 border border-gray-300 rounded-lg focus:bg-white focus:ring-1 focus:ring-emerald-500 focus:outline-hidden text-gray-800"
            >
              <option value="">All Categories</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Company / Manufacturer Filter */}
          <div>
            <label htmlFor="filter-company" className="flex items-center gap-1 text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">
              <Building2 className="w-3 h-3" /> Manufacturer
            </label>
            <select
              id="filter-company"
              value={filters.companyId || ''}
              onChange={(e) => onFilterChange({ companyId: e.target.value || undefined })}
              className="w-full px-2.5 py-1.5 text-xs bg-gray-50/50 border border-gray-300 rounded-lg focus:bg-white focus:ring-1 focus:ring-emerald-500 focus:outline-hidden text-gray-800"
            >
              <option value="">All Manufacturers</option>
              {companies.map((comp) => (
                <option key={comp.id} value={comp.id}>
                  {comp.name}
                </option>
              ))}
            </select>
          </div>

          {/* Product Filter */}
          <div>
            <label htmlFor="filter-product" className="flex items-center gap-1 text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">
              <Package className="w-3 h-3" /> Product
            </label>
            <select
              id="filter-product"
              value={filters.productId || ''}
              onChange={(e) => onFilterChange({ productId: e.target.value || undefined })}
              className="w-full px-2.5 py-1.5 text-xs bg-gray-50/50 border border-gray-300 rounded-lg focus:bg-white focus:ring-1 focus:ring-emerald-500 focus:outline-hidden text-gray-800"
            >
              <option value="">All Products</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} {p.dosage ? `(${p.dosage})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Payment Method Filter */}
          <div>
            <label htmlFor="filter-payment-method" className="flex items-center gap-1 text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">
              <CreditCard className="w-3 h-3" /> Payment Method
            </label>
            <select
              id="filter-payment-method"
              value={filters.paymentMethod || 'all'}
              onChange={(e) => onFilterChange({ paymentMethod: e.target.value })}
              className="w-full px-2.5 py-1.5 text-xs bg-gray-50/50 border border-gray-300 rounded-lg focus:bg-white focus:ring-1 focus:ring-emerald-500 focus:outline-hidden text-gray-800"
            >
              <option value="all">All Methods</option>
              <option value="CASH">Cash</option>
              <option value="TRANSFER">Bank Transfer</option>
              <option value="POS">POS Terminal</option>
              <option value="CREDIT">Customer Credit</option>
            </select>
          </div>
        </div>
      )}
    </div>
  );
};
