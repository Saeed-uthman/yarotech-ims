import React, { useState } from 'react';
import { Search, SlidersHorizontal, ChevronDown, X, RotateCcw } from 'lucide-react';
import { ProductCategory, Company, ProductFilterParams, UserRole } from '../../types';

interface ProductFiltersProps {
  filters: ProductFilterParams;
  onFilterChange: (updates: Partial<ProductFilterParams>) => void;
  categories: ProductCategory[];
  companies: Company[];
  currentRole: UserRole;
  isSearching?: boolean;
}

export const ProductFilters: React.FC<ProductFiltersProps> = ({
  filters,
  onFilterChange,
  categories,
  companies,
  currentRole,
  isSearching = false,
}) => {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const isAdmin = currentRole === 'admin';

  const hasActiveAdvancedFilters = 
    filters.company !== 'All' || 
    filters.stockStatus !== 'all' || 
    filters.sortBy !== 'name' ||
    filters.sortOrder !== 'asc';

  const resetAllFilters = () => {
    onFilterChange({
      search: '',
      category: 'All Categories',
      status: 'All Status',
      company: 'All',
      stockStatus: 'all',
      sortBy: 'name',
      sortOrder: 'asc',
      page: 1,
    });
    setShowAdvanced(false);
  };

  return (
    <div className="bg-white p-3.5 sm:p-4 rounded-lg border border-slate-200 shadow-xs mb-5">
      {/* Primary Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            id="filter-search-input"
            type="text"
            placeholder="Search medicines, generic name, barcode or company..."
            value={filters.search}
            onChange={(e) => onFilterChange({ search: e.target.value, page: 1 })}
            className="block w-full pl-10 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-md text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white transition-colors"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {isSearching && (
              <span className="w-3.5 h-3.5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></span>
            )}
            {filters.search && !isSearching && (
              <button
                onClick={() => onFilterChange({ search: '', page: 1 })}
                className="text-slate-400 hover:text-slate-600 p-0.5"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Dropdowns group */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {/* Category Dropdown */}
          <div className="relative flex-1 sm:flex-initial min-w-[140px]">
            <select
              id="filter-category-select"
              value={filters.category}
              onChange={(e) => onFilterChange({ category: e.target.value, page: 1 })}
              className="w-full appearance-none pl-3 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-md text-xs sm:text-sm text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
            >
              <option value="All Categories">All Categories</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.name}>
                  {cat.name}
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Status Dropdown */}
          <div className="relative flex-1 sm:flex-initial min-w-[120px]">
            <select
              id="filter-status-select"
              value={filters.status}
              onChange={(e) => onFilterChange({ status: e.target.value, page: 1 })}
              className="w-full appearance-none pl-3 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-md text-xs sm:text-sm text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
            >
              <option value="All Status">All Status</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Filters toggle button */}
          <button
            id="toggle-advanced-filters-btn"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className={`flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-md border text-xs sm:text-sm font-semibold shadow-xs transition-colors ${
              showAdvanced || hasActiveAdvancedFilters
                ? 'bg-blue-50 border-blue-200 text-blue-700'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Filter</span>
            {hasActiveAdvancedFilters && (
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
            )}
          </button>
        </div>
      </div>

      {/* Advanced Filter Drawer / Panel */}
      {showAdvanced && (
        <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-3 animate-in fade-in duration-150">
          {/* Company Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Manufacturer / Company
            </label>
            <select
              id="filter-advanced-company"
              value={filters.company}
              onChange={(e) => onFilterChange({ company: e.target.value, page: 1 })}
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-xs font-medium text-slate-700 focus:ring-1 focus:ring-blue-500"
            >
              <option value="All">All Manufacturers</option>
              {companies.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Stock Level Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Stock Availability
            </label>
            <select
              id="filter-advanced-stock"
              value={filters.stockStatus}
              onChange={(e) => onFilterChange({ stockStatus: e.target.value as any, page: 1 })}
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-xs font-medium text-slate-700 focus:ring-1 focus:ring-blue-500"
            >
              <option value="all">All Inventory</option>
              <option value="in_stock">In Stock (&gt;0 units)</option>
              <option value="low_stock">Low Stock (≤ Reorder Level)</option>
              <option value="out_of_stock">Out of Stock (0 units)</option>
            </select>
          </div>

          {/* Sort By & Order */}
          <div className="flex items-end justify-between gap-2">
            <div className="flex-1">
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Sort By
              </label>
              <div className="flex gap-1.5">
                <select
                  id="filter-advanced-sortby"
                  value={filters.sortBy}
                  onChange={(e) => onFilterChange({ sortBy: e.target.value as any, page: 1 })}
                  className="flex-1 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-xs font-medium text-slate-700"
                >
                  <option value="name">Product Name</option>
                  <option value="genericName">Generic Name</option>
                  <option value="stock">Stock Quantity</option>
                  <option value="price">Selling Price</option>
                  {isAdmin && <option value="basePrice">Base Price (Cost)</option>}
                  <option value="date">Date Updated</option>
                </select>
                <button
                  id="toggle-sort-order-btn"
                  onClick={() => onFilterChange({ sortOrder: filters.sortOrder === 'asc' ? 'desc' : 'asc' })}
                  className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-md text-xs font-bold text-slate-700 transition-colors"
                  title="Toggle Ascending / Descending"
                >
                  {filters.sortOrder === 'asc' ? '↑ Asc' : '↓ Desc'}
                </button>
              </div>
            </div>

            <button
              id="reset-filters-btn"
              onClick={resetAllFilters}
              className="px-3 py-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-md text-xs flex items-center gap-1 font-semibold border border-slate-200 bg-white shadow-xs transition-colors"
              title="Reset all filters"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
