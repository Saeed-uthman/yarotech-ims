import React from 'react';
import { 
  Sliders, 
  ShieldAlert, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Package
} from 'lucide-react';
import { InventoryItem, InventoryFilterParams, UserRole } from '../../types';
import { formatCurrencyNaira, formatNumber } from '../../utils/formatters';

interface InventoryMobileListProps {
  items: InventoryItem[];
  isLoading: boolean;
  total: number;
  currentPage: number;
  totalPages: number;
  filters: InventoryFilterParams;
  onPageChange: (page: number) => void;
  onAdjustStock: (item: InventoryItem) => void;
  onSelectItem?: (item: InventoryItem) => void;
  onViewProduct?: (productId: string) => void;
  currentRole: UserRole;
  onResetFilters?: () => void;
}

export const InventoryMobileList: React.FC<InventoryMobileListProps> = ({
  items,
  isLoading,
  total,
  currentPage,
  totalPages,
  filters,
  onPageChange,
  onAdjustStock,
  onSelectItem,
  onViewProduct,
  currentRole,
  onResetFilters,
}) => {
  const isAdmin = currentRole === 'admin';

  if (isLoading && items.length === 0) {
    return (
      <div className="space-y-3 md:hidden">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs animate-pulse space-y-2">
            <div className="h-4 bg-slate-200 rounded w-3/4"></div>
            <div className="h-3 bg-slate-100 rounded w-1/2"></div>
            <div className="h-10 bg-slate-50 rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="bg-white p-6 rounded-lg border border-slate-200 text-center md:hidden">
        <Package className="w-8 h-8 text-slate-300 mx-auto mb-2" />
        <h3 className="text-sm font-bold text-slate-800">No Inventory Items</h3>
        <p className="text-xs text-slate-500 mt-1 mb-3">
          No records match the current filters.
        </p>
        {onResetFilters && (
          <button
            onClick={onResetFilters}
            className="px-3 py-1.5 bg-slate-100 text-slate-700 text-xs font-semibold rounded-md"
          >
            Clear Filters
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3 md:hidden">
      {items.map((item) => {
        const isOutOfStock = item.currentStock === 0;
        const isLowStock = item.currentStock > 0 && item.currentStock <= item.reorderLevel;

        return (
          <div
            key={item.id}
            className={`bg-white p-4 rounded-lg border shadow-xs space-y-3 ${
              isOutOfStock
                ? 'border-rose-200 bg-rose-50/10'
                : isLowStock
                ? 'border-amber-200 bg-amber-50/10'
                : 'border-slate-200'
            }`}
          >
            {/* Header: Title & Badges */}
            <div 
              onClick={() => onSelectItem && onSelectItem(item)}
              className={`flex items-start justify-between gap-2 ${onSelectItem ? 'cursor-pointer' : ''}`}
            >
              <div>
                <h4 className="font-bold text-sm text-slate-900 leading-snug hover:text-blue-600 transition-colors">
                  {item.productName}
                </h4>
                <p className="text-xs text-slate-500">
                  {item.genericName} • {item.dosage}
                </p>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200/80 shrink-0">
                {item.companyName}
              </span>
            </div>

            {/* Stock & Value Breakdown Grid */}
            <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-xs font-mono">
              <div>
                <span className="text-slate-500 text-[10px] uppercase tracking-wider block">
                  Current Stock
                </span>
                <span className={`text-base font-bold ${
                  isOutOfStock ? 'text-rose-700' : isLowStock ? 'text-amber-700' : 'text-slate-900'
                }`}>
                  {formatNumber(item.currentStock)} units
                </span>
              </div>

              <div>
                <span className="text-slate-500 text-[10px] uppercase tracking-wider block">
                  Retail Price
                </span>
                <span className="text-sm font-bold text-slate-900">
                  {formatCurrencyNaira(item.sellingPrice)}
                </span>
              </div>

              {isAdmin && (
                <>
                  <div>
                    <span className="text-slate-500 text-[10px] uppercase tracking-wider block">
                      Base Cost
                    </span>
                    <span className="text-xs text-slate-700">
                      {formatCurrencyNaira(item.basePrice)}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-500 text-[10px] uppercase tracking-wider block">
                      Inventory Value
                    </span>
                    <span className="text-xs font-bold text-emerald-800">
                      {formatCurrencyNaira(item.inventoryValue)}
                    </span>
                  </div>
                </>
              )}
            </div>

            {/* Footer Actions & Status */}
            <div className="flex items-center justify-between pt-1 border-t border-slate-100">
              {/* Status Badge */}
              <div>
                {isOutOfStock ? (
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-700">
                    <XCircle className="w-3.5 h-3.5" />
                    Out of Stock
                  </span>
                ) : isLowStock ? (
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-700">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Low Stock
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    In Stock
                  </span>
                )}
              </div>

              {/* Adjust Stock Button */}
              {isAdmin && (
                <button
                  onClick={() => onAdjustStock(item)}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs font-bold flex items-center gap-1 shadow-xs"
                >
                  <Sliders className="w-3.5 h-3.5" />
                  <span>Adjust Stock</span>
                </button>
              )}
            </div>
          </div>
        );
      })}

      {/* Mobile Pagination */}
      <div className="flex items-center justify-between py-2 text-xs text-slate-600">
        <span>Page {currentPage} of {totalPages}</span>
        <div className="flex items-center gap-2">
          <button
            disabled={currentPage <= 1}
            onClick={() => onPageChange(currentPage - 1)}
            className="px-3 py-1 bg-white border border-slate-200 rounded disabled:opacity-40"
          >
            Prev
          </button>
          <button
            disabled={currentPage >= totalPages}
            onClick={() => onPageChange(currentPage + 1)}
            className="px-3 py-1 bg-white border border-slate-200 rounded disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
};
