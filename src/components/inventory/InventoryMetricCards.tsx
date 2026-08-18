import React from 'react';
import { 
  Boxes, 
  Layers, 
  CircleDollarSign, 
  AlertTriangle, 
  XCircle, 
  ShieldAlert,
  ArrowRight
} from 'lucide-react';
import { InventorySummaryKPIs, UserRole } from '../../types';
import { formatCompactNaira, formatNumber } from '../../utils/formatters';

interface InventoryMetricCardsProps {
  kpis: InventorySummaryKPIs | null;
  currentRole: UserRole;
  isLoading?: boolean;
  activeStockStatusFilter?: string;
  onSelectStockStatus?: (status: 'all' | 'in_stock' | 'low_stock' | 'out_of_stock') => void;
}

export const InventoryMetricCards: React.FC<InventoryMetricCardsProps> = ({
  kpis,
  currentRole,
  isLoading = false,
  activeStockStatusFilter = 'all',
  onSelectStockStatus,
}) => {
  const isAdmin = currentRole === 'admin';

  if (isLoading || !kpis) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 mb-6">
        {[...Array(5)].map((_, i) => (
          <div 
            key={i} 
            className="bg-white p-4 border border-slate-200 rounded-lg shadow-xs animate-pulse h-28 flex flex-col justify-between"
          >
            <div className="h-3 bg-slate-200 rounded w-24 mb-2"></div>
            <div className="h-6 bg-slate-200 rounded w-16 mb-1"></div>
            <div className="h-2.5 bg-slate-100 rounded w-20"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 mb-6">
      {/* 1. Total Inventory Items (Variants) */}
      <div
        id="metric-card-total-inventory-items"
        className="bg-white p-4 border border-slate-200 rounded-lg shadow-xs hover:border-slate-300 transition-colors flex flex-col justify-between"
      >
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Inventory Items</p>
          <div className="w-7 h-7 rounded bg-blue-50 text-blue-600 flex items-center justify-center">
            <Layers className="w-3.5 h-3.5" />
          </div>
        </div>
        <div>
          <p className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight font-mono">
            {formatNumber(kpis.totalInventoryItems)}
          </p>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
            <span>Active manufacturer variants</span>
          </div>
        </div>
      </div>

      {/* 2. Total Units in Stock */}
      <div
        id="metric-card-total-units-in-stock"
        className="bg-white p-4 border border-slate-200 rounded-lg shadow-xs hover:border-slate-300 transition-colors flex flex-col justify-between"
      >
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Units</p>
          <div className="w-7 h-7 rounded bg-slate-100 text-slate-700 flex items-center justify-center">
            <Boxes className="w-3.5 h-3.5" />
          </div>
        </div>
        <div>
          <p className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight font-mono">
            {formatNumber(kpis.totalUnitsInStock)}
          </p>
          <div className="text-[11px] text-slate-500 mt-1">
            Physical units on shelf
          </div>
        </div>
      </div>

      {/* 3. Total Inventory Value (Admin Cost Basis) */}
      <div
        id="metric-card-total-inventory-value"
        className={`p-4 border rounded-lg shadow-xs transition-colors flex flex-col justify-between ${
          isAdmin 
            ? 'bg-white border-slate-200 hover:border-slate-300' 
            : 'bg-slate-50 border-slate-200/80'
        }`}
      >
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Inventory Value</p>
          <div className={`w-7 h-7 rounded flex items-center justify-center ${
            isAdmin ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-200 text-slate-500'
          }`}>
            <CircleDollarSign className="w-3.5 h-3.5" />
          </div>
        </div>
        <div>
          {isAdmin ? (
            <>
              <p className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight font-mono truncate">
                {formatCompactNaira(kpis.totalInventoryValue)}
              </p>
              <div className="text-[11px] text-emerald-700 font-medium mt-1">
                Cost basis (Base Price × Stock)
              </div>
            </>
          ) : (
            <>
              <div className="text-xs font-semibold text-slate-400 flex items-center gap-1.5 py-1">
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>Restricted</span>
              </div>
              <div className="text-[11px] text-slate-400">
                Admin valuation only
              </div>
            </>
          )}
        </div>
      </div>

      {/* 4. Low Stock Items */}
      <div
        id="metric-card-low-stock-items"
        onClick={() => onSelectStockStatus && onSelectStockStatus(activeStockStatusFilter === 'low_stock' ? 'all' : 'low_stock')}
        className={`p-4 border rounded-lg shadow-xs transition-all flex flex-col justify-between cursor-pointer ${
          activeStockStatusFilter === 'low_stock'
            ? 'bg-amber-50/80 border-amber-400 ring-2 ring-amber-400/20'
            : 'bg-white border-slate-200 hover:border-amber-300'
        }`}
      >
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-bold text-amber-700 uppercase tracking-wider">Low Stock</p>
          <div className="w-7 h-7 rounded bg-amber-100 text-amber-700 flex items-center justify-center">
            <AlertTriangle className="w-3.5 h-3.5" />
          </div>
        </div>
        <div>
          <p className="text-xl sm:text-2xl font-bold text-amber-950 tracking-tight font-mono">
            {kpis.lowStockCount}
          </p>
          <div className="text-[11px] text-amber-700 font-medium mt-1 flex items-center justify-between">
            <span>At or below threshold</span>
            {onSelectStockStatus && <ArrowRight className="w-3 h-3 text-amber-600" />}
          </div>
        </div>
      </div>

      {/* 5. Out of Stock Items */}
      <div
        id="metric-card-out-of-stock-items"
        onClick={() => onSelectStockStatus && onSelectStockStatus(activeStockStatusFilter === 'out_of_stock' ? 'all' : 'out_of_stock')}
        className={`p-4 border rounded-lg shadow-xs transition-all flex flex-col justify-between cursor-pointer col-span-2 sm:col-span-1 ${
          activeStockStatusFilter === 'out_of_stock'
            ? 'bg-rose-50/80 border-rose-400 ring-2 ring-rose-400/20'
            : 'bg-white border-slate-200 hover:border-rose-300'
        }`}
      >
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-bold text-rose-700 uppercase tracking-wider">Out of Stock</p>
          <div className="w-7 h-7 rounded bg-rose-100 text-rose-700 flex items-center justify-center">
            <XCircle className="w-3.5 h-3.5" />
          </div>
        </div>
        <div>
          <p className="text-xl sm:text-2xl font-bold text-rose-950 tracking-tight font-mono">
            {kpis.outOfStockCount}
          </p>
          <div className="text-[11px] text-rose-700 font-medium mt-1 flex items-center justify-between">
            <span>0 units remaining</span>
            {onSelectStockStatus && <ArrowRight className="w-3 h-3 text-rose-600" />}
          </div>
        </div>
      </div>
    </div>
  );
};
