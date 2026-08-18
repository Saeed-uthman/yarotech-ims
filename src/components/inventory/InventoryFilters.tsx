import React, { useState } from 'react';
import { 
  Search, 
  SlidersHorizontal, 
  ChevronDown, 
  X, 
  RotateCcw, 
  Download,
  Boxes,
  AlertTriangle,
  XCircle,
  CheckCircle2
} from 'lucide-react';
import { 
  ProductCategory, 
  Company, 
  InventoryFilterParams, 
  UserRole,
  InventorySummaryKPIs 
} from '../../types';

interface InventoryFiltersProps {
  filters: InventoryFilterParams;
  onFilterChange: (updates: Partial<InventoryFilterParams>) => void;
  categories: ProductCategory[];
  companies: Company[];
  currentRole: UserRole;
  kpis?: InventorySummaryKPIs | null;
  isSearching?: boolean;
  onExportCsv?: () => void;
}

export const InventoryFilters: React.FC<InventoryFiltersProps> = ({
  filters,
  onFilterChange,
  categories,
  companies,
  currentRole,
  kpis,
  isSearching = false,
  onExportCsv,
}) => {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const isAdmin = currentRole === 'admin';

  const hasActiveAdvancedFilters = 
    filters.company !== 'All' || 
    filters.sortBy !== 'name' ||
    filters.sortOrder !== 'asc';

  const resetAllFilters = () => {
    onFilterChange({
      search: '',
      category: 'All Categories',
      company: 'All',
      stockStatus: 'all',
      sortBy: 'name',
      sortOrder: 'asc',
      page: 1,
    });
    setShowAdvanced(false);
  };

  return (
    <div className="bg-white p-3.5 sm:p-4 rounded-lg border border-slate-200 shadow-xs mb-5 space-y-3.5">
      {/* Primary Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            id="inventory-search-input"
            type="text"
            placeholder="Search medicine, generic name, company, or barcode..."
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

        {/* Dropdowns & Actions */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {/* Category Dropdown */}
          <div className="relative flex-1 sm:flex-initial min-w-[140px]">
            <select
              id="inventory-category-select"
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

          {/* Company Dropdown */}
          <div className="relative flex-1 sm:flex-initial min-w-[130px]">
            <select
              id="inventory-company-select"
              value={filters.company}
              onChange={(e) => onFilterChange({ company: e.target.value, page: 1 })}
              className="w-full appearance-none pl-3 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-md text-xs sm:text-sm text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
            >
              <option value="All">All Companies</option>
              {companies.map((comp) => (
                <option key={comp.id} value={comp.name}>
                  {comp.name}
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Advanced toggle */}
          <button
            id="inventory-toggle-advanced-filters-btn"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className={`p-2 rounded-md border text-xs font-semibold flex items-center gap-1.5 transition-colors ${
              showAdvanced || hasActiveAdvancedFilters
                ? 'bg-blue-50 text-blue-700 border-blue-200'
                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
            }`}
            title="Sort & Export options"
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span className="hidden md:inline">Sort</span>
          </button>

          {/* Export CSV */}
          {onExportCsv && (
            <button
              id="inventory-export-csv-btn"
              onClick={onExportCsv}
              className="p-2 rounded-md border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 text-xs font-semibold flex items-center gap-1.5 transition-colors"
              title="Export filtered inventory to CSV"
            >
              <Download className="w-4 h-4 text-slate-500" />
              <span className="hidden md:inline">Export</span>
            </button>
          )}
        </div>
      </div>

      {/* Stock Status Filter Pills */}
      <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100 flex-wrap">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">Status:</span>
          
          {/* All */}
          <button
            onClick={() => onFilterChange({ stockStatus: 'all', page: 1 })}
            className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors flex items-center gap-1.5 ${
              filters.stockStatus === 'all'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <span>All Items</span>
            {kpis && <span className="text-[10px] opacity-80">({kpis.totalInventoryItems})</span>}
          </button>

          {/* In Stock */}
          <button
            onClick={() => onFilterChange({ stockStatus: 'in_stock', page: 1 })}
            className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors flex items-center gap-1.5 ${
              filters.stockStatus === 'in_stock'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'bg-emerald-50 text-emerald-700 border border-emerald-200/80 hover:bg-emerald-100'
            }`}
          >
            <CheckCircle2 className="w-3 h-3" />
            <span>In Stock</span>
            {kpis && <span className="text-[10px]">({kpis.inStockCount})</span>}
          </button>

          {/* Low Stock */}
          <button
            onClick={() => onFilterChange({ stockStatus: 'low_stock', page: 1 })}
            className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors flex items-center gap-1.5 ${
              filters.stockStatus === 'low_stock'
                ? 'bg-amber-700 text-white shadow-xs'
                : 'bg-amber-50 text-amber-800 border border-amber-200/80 hover:bg-amber-100'
            }`}
          >
            <AlertTriangle className="w-3 h-3" />
            <span>Low Stock</span>
            {kpis && <span className="text-[10px]">({kpis.lowStockCount})</span>}
          </button>

          {/* Out of Stock */}
          <button
            onClick={() => onFilterChange({ stockStatus: 'out_of_stock', page: 1 })}
            className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors flex items-center gap-1.5 ${
              filters.stockStatus === 'out_of_stock'
                ? 'bg-rose-700 text-white shadow-xs'
                : 'bg-rose-50 text-rose-800 border border-rose-200/80 hover:bg-rose-100'
            }`}
          >
            <XCircle className="w-3 h-3" />
            <span>Out of Stock</span>
            {kpis && <span className="text-[10px]">({kpis.outOfStockCount})</span>}
          </button>
        </div>

        {/* Reset button if filters active */}
        {(filters.search || filters.category !== 'All Categories' || filters.company !== 'All' || filters.stockStatus !== 'all' || hasActiveAdvancedFilters) && (
          <button
            onClick={resetAllFilters}
            className="text-xs font-semibold text-rose-600 hover:text-rose-700 flex items-center gap-1 py-1"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset filters</span>
          </button>
        )}
      </div>

      {/* Advanced Sort Drawer */}
      {showAdvanced && (
        <div className="pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-3 animate-in fade-in duration-100">
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Sort By Field
            </label>
            <select
              value={filters.sortBy}
              onChange={(e) => onFilterChange({ sortBy: e.target.value as any, page: 1 })}
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-xs font-medium text-slate-700"
            >
              <option value="name">Product Name (A-Z)</option>
              <option value="company">Company / Manufacturer</option>
              <option value="stock">Current Stock Quantity</option>
              {isAdmin && <option value="inventoryValue">Inventory Value (Cost Basis)</option>}
              {isAdmin && <option value="basePrice">Base Wholesale Price</option>}
              {isAdmin && <option value="reorderLevel">Reorder Level Threshold</option>}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Sort Order
            </label>
            <select
              value={filters.sortOrder}
              onChange={(e) => onFilterChange({ sortOrder: e.target.value as any, page: 1 })}
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-xs font-medium text-slate-700"
            >
              <option value="asc">Ascending (Lowest to Highest / A to Z)</option>
              <option value="desc">Descending (Highest to Lowest / Z to A)</option>
            </select>
          </div>
        </div>
      )}
    </div>
  );
};
