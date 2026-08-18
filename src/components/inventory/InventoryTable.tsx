import React from 'react';
import { 
  ChevronUp, 
  ChevronDown, 
  ChevronsUpDown, 
  Sliders, 
  ShieldAlert, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Package,
  Layers
} from 'lucide-react';
import { InventoryItem, InventoryFilterParams, UserRole } from '../../types';
import { formatCurrencyNaira, formatNumber } from '../../utils/formatters';

interface InventoryTableProps {
  items: InventoryItem[];
  isLoading: boolean;
  isStale?: boolean;
  total: number;
  currentPage: number;
  totalPages: number;
  filters: InventoryFilterParams;
  onSortChange: (field: InventoryFilterParams['sortBy']) => void;
  onPageChange: (page: number) => void;
  onAdjustStock: (item: InventoryItem) => void;
  onSelectItem?: (item: InventoryItem) => void;
  onViewProduct?: (productId: string) => void;
  currentRole: UserRole;
  onResetFilters?: () => void;
}

export const InventoryTable: React.FC<InventoryTableProps> = ({
  items,
  isLoading,
  isStale = false,
  total,
  currentPage,
  totalPages,
  filters,
  onSortChange,
  onPageChange,
  onAdjustStock,
  onSelectItem,
  onViewProduct,
  currentRole,
  onResetFilters,
}) => {
  const isAdmin = currentRole === 'admin';

  const renderSortIcon = (field: InventoryFilterParams['sortBy']) => {
    if (filters.sortBy !== field) {
      return <ChevronsUpDown className="w-3.5 h-3.5 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />;
    }
    return filters.sortOrder === 'asc' ? (
      <ChevronUp className="w-3.5 h-3.5 text-blue-600" />
    ) : (
      <ChevronDown className="w-3.5 h-3.5 text-blue-600" />
    );
  };

  const getStockBadge = (status: InventoryItem['stockStatus'], stock: number, reorder: number) => {
    if (status === 'Out of Stock') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
          <XCircle className="w-3 h-3 text-rose-600" />
          Out of Stock
        </span>
      );
    }
    if (status === 'Low Stock') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
          <AlertTriangle className="w-3 h-3 text-amber-600" />
          Low Stock
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
        In Stock
      </span>
    );
  };

  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden flex flex-col">
      {/* Table Content Container */}
      <div className="overflow-x-auto relative">
        {isStale && (
          <div className="absolute top-0 inset-x-0 bg-blue-500/10 text-blue-800 text-[11px] font-semibold text-center py-0.5 z-10">
            Updating inventory in background...
          </div>
        )}

        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[11px] font-bold select-none">
              {/* Product */}
              <th 
                onClick={() => onSortChange('name')}
                className="py-3 px-4 font-bold cursor-pointer group hover:bg-slate-100/70 transition-colors"
              >
                <div className="flex items-center gap-1.5">
                  <span>Product & Formulation</span>
                  {renderSortIcon('name')}
                </div>
              </th>

              {/* Company */}
              <th 
                onClick={() => onSortChange('company')}
                className="py-3 px-3 font-bold cursor-pointer group hover:bg-slate-100/70 transition-colors"
              >
                <div className="flex items-center gap-1.5">
                  <span>Manufacturer</span>
                  {renderSortIcon('company')}
                </div>
              </th>

              {/* Category */}
              <th className="py-3 px-3 font-bold">Category</th>

              {/* Current Stock */}
              <th 
                onClick={() => onSortChange('stock')}
                className="py-3 px-3 font-bold cursor-pointer group hover:bg-slate-100/70 transition-colors text-right"
              >
                <div className="flex items-center justify-end gap-1.5">
                  <span>Current Stock</span>
                  {renderSortIcon('stock')}
                </div>
              </th>

              {/* Reorder Level (Admin) */}
              <th 
                onClick={() => isAdmin && onSortChange('reorderLevel')}
                className={`py-3 px-3 font-bold text-right ${isAdmin ? 'cursor-pointer group hover:bg-slate-100/70' : ''}`}
              >
                <div className="flex items-center justify-end gap-1.5">
                  <span>Reorder Level</span>
                  {isAdmin && renderSortIcon('reorderLevel')}
                </div>
              </th>

              {/* Base Price (Admin Cost) */}
              <th 
                onClick={() => isAdmin && onSortChange('basePrice')}
                className={`py-3 px-3 font-bold text-right ${isAdmin ? 'cursor-pointer group hover:bg-slate-100/70' : ''}`}
              >
                <div className="flex items-center justify-end gap-1.5">
                  <span>Base Cost</span>
                  {isAdmin && renderSortIcon('basePrice')}
                </div>
              </th>

              {/* Retail Price */}
              <th className="py-3 px-3 font-bold text-right">Retail Price</th>

              {/* Total Inventory Value */}
              <th 
                onClick={() => isAdmin && onSortChange('inventoryValue')}
                className={`py-3 px-3 font-bold text-right ${isAdmin ? 'cursor-pointer group hover:bg-slate-100/70' : ''}`}
              >
                <div className="flex items-center justify-end gap-1.5">
                  <span>Inventory Value</span>
                  {isAdmin && renderSortIcon('inventoryValue')}
                </div>
              </th>

              {/* Status */}
              <th className="py-3 px-3 font-bold text-center">Status</th>

              {/* Actions */}
              <th className="py-3 px-4 font-bold text-right">Actions</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 text-slate-700">
            {isLoading && items.length === 0 ? (
              // Skeleton Rows
              [...Array(6)].map((_, idx) => (
                <tr key={idx} className="animate-pulse">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-slate-200 rounded"></div>
                      <div className="space-y-1.5 flex-1">
                        <div className="h-3.5 bg-slate-200 rounded w-36"></div>
                        <div className="h-2.5 bg-slate-100 rounded w-24"></div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-3"><div className="h-3 bg-slate-200 rounded w-20"></div></td>
                  <td className="py-3 px-3"><div className="h-3 bg-slate-200 rounded w-16"></div></td>
                  <td className="py-3 px-3 text-right"><div className="h-3 bg-slate-200 rounded w-12 ml-auto"></div></td>
                  <td className="py-3 px-3 text-right"><div className="h-3 bg-slate-200 rounded w-10 ml-auto"></div></td>
                  <td className="py-3 px-3 text-right"><div className="h-3 bg-slate-200 rounded w-14 ml-auto"></div></td>
                  <td className="py-3 px-3 text-right"><div className="h-3 bg-slate-200 rounded w-14 ml-auto"></div></td>
                  <td className="py-3 px-3 text-right"><div className="h-3 bg-slate-200 rounded w-16 ml-auto"></div></td>
                  <td className="py-3 px-3 text-center"><div className="h-4 bg-slate-200 rounded-full w-16 mx-auto"></div></td>
                  <td className="py-3 px-4 text-right"><div className="h-6 bg-slate-200 rounded w-14 ml-auto"></div></td>
                </tr>
              ))
            ) : items.length === 0 ? (
              // Empty State
              <tr>
                <td colSpan={10} className="py-12 px-4 text-center">
                  <div className="max-w-sm mx-auto flex flex-col items-center">
                    <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mb-3">
                      <Package className="w-6 h-6" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-800 mb-1">
                      No Inventory Items Found
                    </h3>
                    <p className="text-xs text-slate-500 mb-4">
                      No medication variants match the current search query or active filter settings.
                    </p>
                    {onResetFilters && (
                      <button
                        onClick={onResetFilters}
                        className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-xs font-semibold transition-colors"
                      >
                        Clear Active Filters
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              // Data Rows
              items.map((item) => {
                const isOutOfStock = item.currentStock === 0;
                const isLowStock = item.currentStock > 0 && item.currentStock <= item.reorderLevel;

                return (
                  <tr 
                    key={item.id}
                    className={`hover:bg-slate-50/80 transition-colors ${
                      isOutOfStock ? 'bg-rose-50/20' : isLowStock ? 'bg-amber-50/20' : ''
                    }`}
                  >
                    {/* Product & Formulation */}
                    <td className="py-3 px-4">
                      <div 
                        onClick={() => onSelectItem && onSelectItem(item)}
                        className={`flex items-center gap-3 ${onSelectItem ? 'cursor-pointer group' : ''}`}
                      >
                        <img
                          src={item.image}
                          alt={item.productName}
                          className="w-9 h-9 rounded object-cover border border-slate-200 shrink-0 bg-slate-100 group-hover:ring-2 group-hover:ring-blue-500/30 transition-all"
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                        <div className="min-w-0">
                          <span className="font-bold text-slate-900 block truncate max-w-[200px] group-hover:text-blue-600 transition-colors">
                            {item.productName}
                          </span>
                          <span className="text-[11px] text-slate-500 block truncate max-w-[200px]">
                            {item.genericName} • {item.dosage} ({item.form})
                          </span>
                          <span className="text-[10px] font-mono text-slate-400 block">
                            {item.barcode}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Company / Manufacturer */}
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200/80">
                        {item.companyName}
                      </span>
                    </td>

                    {/* Category */}
                    <td className="py-3 px-3 text-slate-600">
                      <span className="truncate max-w-[120px] block">
                        {item.category}
                      </span>
                    </td>

                    {/* Current Stock */}
                    <td className="py-3 px-3 text-right">
                      <div className="inline-flex flex-col items-end">
                        <span className={`font-mono font-bold text-sm ${
                          isOutOfStock ? 'text-rose-700' : isLowStock ? 'text-amber-700' : 'text-slate-900'
                        }`}>
                          {formatNumber(item.currentStock)}
                        </span>
                        <span className="text-[10px] text-slate-400">units</span>
                      </div>
                    </td>

                    {/* Reorder Level (Admin) */}
                    <td className="py-3 px-3 text-right font-mono">
                      {isAdmin ? (
                        <span className="text-slate-700 font-semibold">
                          {formatNumber(item.reorderLevel)}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[11px] flex items-center justify-end gap-1" title="Restricted to administrators">
                          <ShieldAlert className="w-3 h-3" />
                          <span>—</span>
                        </span>
                      )}
                    </td>

                    {/* Base Wholesale Price (Admin) */}
                    <td className="py-3 px-3 text-right font-mono">
                      {isAdmin ? (
                        <span className="text-slate-800 font-semibold">
                          {formatCurrencyNaira(item.basePrice)}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[11px] flex items-center justify-end gap-1" title="Restricted to administrators">
                          <ShieldAlert className="w-3 h-3" />
                          <span>—</span>
                        </span>
                      )}
                    </td>

                    {/* Retail Selling Price */}
                    <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                      {formatCurrencyNaira(item.sellingPrice)}
                    </td>

                    {/* Total Inventory Value (Admin Cost Basis) */}
                    <td className="py-3 px-3 text-right font-mono">
                      {isAdmin ? (
                        <span className="font-bold text-emerald-800">
                          {formatCurrencyNaira(item.inventoryValue)}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[11px] flex items-center justify-end gap-1" title="Restricted to administrators">
                          <ShieldAlert className="w-3 h-3" />
                          <span>—</span>
                        </span>
                      )}
                    </td>

                    {/* Stock Status Badge */}
                    <td className="py-3 px-3 text-center">
                      {getStockBadge(item.stockStatus, item.currentStock, item.reorderLevel)}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Adjust Stock Button (Admin) */}
                        {isAdmin ? (
                          <button
                            id={`adjust-stock-btn-${item.id}`}
                            onClick={() => onAdjustStock(item)}
                            className="px-2.5 py-1 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200/80 rounded-md transition-colors flex items-center gap-1"
                            title="Adjust physical inventory count"
                          >
                            <Sliders className="w-3 h-3" />
                            <span>Adjust</span>
                          </button>
                        ) : (
                          <span className="text-[11px] text-slate-400 font-medium">
                            Read-only
                          </span>
                        )}

                        {/* View in Products Module */}
                        {onViewProduct && (
                          <button
                            onClick={() => onViewProduct(item.productId)}
                            className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors"
                            title="View in Products Module"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="px-4 py-3 bg-slate-50/80 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
        <div>
          Showing{' '}
          <span className="font-bold text-slate-900">
            {total === 0 ? 0 : (currentPage - 1) * filters.limit + 1}
          </span>{' '}
          to{' '}
          <span className="font-bold text-slate-900">
            {Math.min(currentPage * filters.limit, total)}
          </span>{' '}
          of <span className="font-bold text-slate-900">{formatNumber(total)}</span> inventory items
        </div>

        <div className="flex items-center gap-1">
          <button
            id="inventory-pagination-prev-btn"
            disabled={currentPage <= 1 || isLoading}
            onClick={() => onPageChange(currentPage - 1)}
            className="p-1.5 rounded border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none transition-colors"
            title="Previous page"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {/* Page numbers */}
          <div className="flex items-center gap-1 px-1">
            {[...Array(totalPages)].map((_, i) => {
              const pageNum = i + 1;
              // Show only surrounding pages if large
              if (
                pageNum === 1 ||
                pageNum === totalPages ||
                (pageNum >= currentPage - 1 && pageNum <= currentPage + 1)
              ) {
                return (
                  <button
                    key={pageNum}
                    onClick={() => onPageChange(pageNum)}
                    className={`min-w-[28px] h-7 rounded text-xs font-bold transition-colors ${
                      pageNum === currentPage
                        ? 'bg-blue-600 text-white'
                        : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              }
              if (pageNum === currentPage - 2 || pageNum === currentPage + 2) {
                return <span key={pageNum} className="text-slate-400 px-0.5">...</span>;
              }
              return null;
            })}
          </div>

          <button
            id="inventory-pagination-next-btn"
            disabled={currentPage >= totalPages || isLoading}
            onClick={() => onPageChange(currentPage + 1)}
            className="p-1.5 rounded border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none transition-colors"
            title="Next page"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
