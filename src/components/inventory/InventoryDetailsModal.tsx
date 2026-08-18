import React from 'react';
import { 
  X, 
  Package, 
  Sliders, 
  ExternalLink, 
  ShieldAlert, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle,
  Building2,
  Layers,
  Hash,
  Tag,
  DollarSign,
  TrendingUp,
  Boxes
} from 'lucide-react';
import { InventoryItem, UserRole } from '../../types';
import { formatCurrencyNaira, formatNumber } from '../../utils/formatters';

interface InventoryDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: InventoryItem | null;
  currentRole: UserRole;
  onAdjustStock?: (item: InventoryItem) => void;
  onViewProduct?: (productId: string) => void;
}

export const InventoryDetailsModal: React.FC<InventoryDetailsModalProps> = ({
  isOpen,
  onClose,
  item,
  currentRole,
  onAdjustStock,
  onViewProduct,
}) => {
  if (!isOpen || !item) return null;

  const isAdmin = currentRole === 'admin';
  const isOutOfStock = item.currentStock === 0;
  const isLowStock = item.currentStock > 0 && item.currentStock <= item.reorderLevel;

  // Financial calculations
  // Inventory Value = currentStock * basePrice (Admin only, cost-basis)
  const inventoryValue = item.currentStock * item.basePrice;
  // Potential Sales Value = currentStock * sellingPrice (Retail total, clearly not profit)
  const potentialSalesValue = item.currentStock * item.sellingPrice;

  const getStatusBadge = () => {
    if (isOutOfStock) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
          <XCircle className="w-4 h-4 text-rose-600" />
          OUT OF STOCK
        </span>
      );
    }
    if (isLowStock) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
          <AlertTriangle className="w-4 h-4 text-amber-600" />
          LOW STOCK
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
        IN STOCK
      </span>
    );
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
              <Boxes className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 leading-none">
                Inventory Variant Details
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Specific manufacturer variant stock position
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto">
          {/* Main Identity Banner */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
            <img
              src={item.image}
              alt={item.productName}
              className="w-16 h-16 rounded-lg object-cover border border-slate-200 bg-white shrink-0 shadow-xs"
              referrerPolicy="no-referrer"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-bold text-slate-900">
                  {item.productName}
                </h3>
                <span className="px-2 py-0.5 rounded-md text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">
                  {item.companyName}
                </span>
              </div>
              <p className="text-xs text-slate-600">
                <span className="font-medium">Generic:</span> {item.genericName} • {item.dosage} ({item.form})
              </p>
              <div className="flex items-center gap-3 text-[11px] text-slate-500 pt-1">
                <span>Category: <strong className="text-slate-700">{item.category}</strong></span>
                <span>•</span>
                <span className="font-mono">Barcode: {item.barcode}</span>
              </div>
            </div>
          </div>

          {/* Status & Stock Levels Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {/* Stock Status */}
            <div className="p-3.5 bg-white border border-slate-200 rounded-lg shadow-xs flex flex-col justify-between">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Stock Status
              </span>
              <div>{getStatusBadge()}</div>
            </div>

            {/* Current Stock */}
            <div className="p-3.5 bg-white border border-slate-200 rounded-lg shadow-xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Current Stock On Hand
              </span>
              <div className="flex items-baseline gap-1.5 font-mono">
                <span className={`text-2xl font-bold ${
                  isOutOfStock ? 'text-rose-700' : isLowStock ? 'text-amber-700' : 'text-slate-900'
                }`}>
                  {formatNumber(item.currentStock)}
                </span>
                <span className="text-xs text-slate-500 font-sans">units</span>
              </div>
            </div>

            {/* Reorder Level (Admin) */}
            <div className="p-3.5 bg-white border border-slate-200 rounded-lg shadow-xs col-span-2 sm:col-span-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Reorder Threshold
              </span>
              {isAdmin ? (
                <div className="flex items-baseline gap-1.5 font-mono">
                  <span className="text-2xl font-bold text-slate-800">
                    {formatNumber(item.reorderLevel)}
                  </span>
                  <span className="text-xs text-slate-500 font-sans">units</span>
                </div>
              ) : (
                <span className="text-xs text-slate-400 flex items-center gap-1 mt-2">
                  <ShieldAlert className="w-3.5 h-3.5" />
                  Admin Only
                </span>
              )}
            </div>
          </div>

          {/* Financial Valuation Section */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Pricing & Valuation Breakdown
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {/* Unit Wholesale Cost (Admin) */}
              <div className="p-3 bg-white rounded-lg border border-slate-200">
                <span className="text-slate-500 block text-[11px]">Base Wholesale Cost (Unit)</span>
                {isAdmin ? (
                  <span className="text-sm font-bold font-mono text-slate-900 block mt-0.5">
                    {formatCurrencyNaira(item.basePrice)}
                  </span>
                ) : (
                  <span className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                    <ShieldAlert className="w-3.5 h-3.5" />
                    Admin Only
                  </span>
                )}
              </div>

              {/* Retail Selling Price (Public) */}
              <div className="p-3 bg-white rounded-lg border border-slate-200">
                <span className="text-slate-500 block text-[11px]">Retail Selling Price (Unit)</span>
                <span className="text-sm font-bold font-mono text-blue-900 block mt-0.5">
                  {formatCurrencyNaira(item.sellingPrice)}
                </span>
              </div>

              {/* Total Inventory Value (Admin Only: Current Stock × Base Price) */}
              <div className="p-3 bg-emerald-50/70 rounded-lg border border-emerald-200">
                <div className="flex items-center justify-between">
                  <span className="text-emerald-800 font-semibold text-[11px]">
                    Total Inventory Value (Cost Basis)
                  </span>
                  <span className="text-[10px] text-emerald-600 font-mono">Stock × Base Price</span>
                </div>
                {isAdmin ? (
                  <span className="text-base font-bold font-mono text-emerald-900 block mt-0.5">
                    {formatCurrencyNaira(inventoryValue)}
                  </span>
                ) : (
                  <span className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                    <ShieldAlert className="w-3.5 h-3.5" />
                    Admin Only
                  </span>
                )}
              </div>

              {/* Potential Retail Value (Public: Current Stock × Selling Price) */}
              <div className="p-3 bg-blue-50/70 rounded-lg border border-blue-200">
                <div className="flex items-center justify-between">
                  <span className="text-blue-800 font-semibold text-[11px]">
                    Potential Sales Value (Gross Retail)
                  </span>
                  <span className="text-[10px] text-blue-600 font-mono">Stock × Selling Price</span>
                </div>
                <span className="text-base font-bold font-mono text-blue-900 block mt-0.5">
                  {formatCurrencyNaira(potentialSalesValue)}
                </span>
              </div>
            </div>
            <p className="text-[11px] text-slate-500 italic">
              * Note: Inventory value reflects capital tied in stock at wholesale cost basis. Potential sales value is gross retail volume and does not represent net profit.
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex flex-wrap items-center justify-between gap-3">
          {onViewProduct && (
            <button
              onClick={() => {
                onClose();
                onViewProduct(item.productId);
              }}
              className="px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-200/60 rounded-lg transition-colors flex items-center gap-1.5"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>View in Product Catalog</span>
            </button>
          )}

          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200/60 rounded-lg transition-colors"
            >
              Close
            </button>

            {isAdmin && onAdjustStock && (
              <button
                onClick={() => {
                  onClose();
                  onAdjustStock(item);
                }}
                className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors flex items-center gap-1.5"
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Adjust Stock Count</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
