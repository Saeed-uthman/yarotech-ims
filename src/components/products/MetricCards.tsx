import React from 'react';
import { 
  Package, 
  Building2, 
  Boxes, 
  Layers, 
  CircleDollarSign, 
  ShieldAlert,
  TrendingUp,
  CheckCircle2
} from 'lucide-react';
import { ProductKPIStats, UserRole } from '../../types';
import { formatCompactNaira, formatNumber } from '../../utils/formatters';

interface MetricCardsProps {
  stats: ProductKPIStats;
  currentRole: UserRole;
}

export const MetricCards: React.FC<MetricCardsProps> = ({ stats, currentRole }) => {
  const isAdmin = currentRole === 'admin';

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 mb-6">
      {/* 1. Total Products */}
      <div 
        id="metric-card-total-products"
        className="bg-white p-4 border border-slate-200 rounded-lg shadow-xs hover:border-slate-300 transition-colors flex flex-col justify-between"
      >
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Products</p>
          <div className="w-7 h-7 rounded bg-blue-50 text-blue-600 flex items-center justify-center">
            <Package className="w-3.5 h-3.5" />
          </div>
        </div>
        <div>
          <p className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight font-mono">
            {formatNumber(stats.totalProducts)}
          </p>
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-1">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block"></span>
            <span>{stats.activeProductsCount} Active in catalogue</span>
          </div>
        </div>
      </div>

      {/* 2. Companies (Manufacturers) */}
      <div 
        id="metric-card-companies"
        className="bg-white p-4 border border-slate-200 rounded-lg shadow-xs hover:border-slate-300 transition-colors flex flex-col justify-between"
      >
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Companies</p>
          <div className="w-7 h-7 rounded bg-slate-100 text-slate-700 flex items-center justify-center">
            <Building2 className="w-3.5 h-3.5" />
          </div>
        </div>
        <div>
          <p className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight font-mono">
            {stats.totalCompanies}
          </p>
          <div className="text-[11px] text-slate-500 mt-1">
            Registered brands
          </div>
        </div>
      </div>

      {/* 3. Total Variants */}
      <div 
        id="metric-card-total-variants"
        className="bg-white p-4 border border-slate-200 rounded-lg shadow-xs hover:border-slate-300 transition-colors flex flex-col justify-between"
      >
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Variants</p>
          <div className="w-7 h-7 rounded bg-purple-50 text-purple-600 flex items-center justify-center">
            <Layers className="w-3.5 h-3.5" />
          </div>
        </div>
        <div>
          <p className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight font-mono">
            {formatNumber(stats.totalVariants)}
          </p>
          <div className="text-[11px] text-slate-500 mt-1">
            Pricing & stock items
          </div>
        </div>
      </div>

      {/* 4. Total Stock */}
      <div 
        id="metric-card-total-stock"
        className="bg-white p-4 border border-slate-200 rounded-lg shadow-xs hover:border-slate-300 transition-colors flex flex-col justify-between"
      >
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Stock</p>
          <div className="w-7 h-7 rounded bg-amber-50 text-amber-600 flex items-center justify-center">
            <Boxes className="w-3.5 h-3.5" />
          </div>
        </div>
        <div>
          <p className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight font-mono">
            {formatNumber(stats.totalStockUnits)}
          </p>
          <div className="text-[11px] text-slate-500 mt-1">
            Units available
          </div>
        </div>
      </div>

      {/* 5. Inventory Value (Admin Only) */}
      <div 
        id="metric-card-inventory-value"
        className={`p-4 border rounded-lg shadow-xs transition-colors flex flex-col justify-between col-span-2 sm:col-span-1 ${
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
              <p className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight truncate font-mono">
                {formatCompactNaira(stats.totalInventoryValueSelling)}
              </p>
              <div className="text-[11px] text-green-600 font-medium mt-1">
                At retail value
              </div>
            </>
          ) : (
            <>
              <div className="text-xs font-semibold text-slate-400 flex items-center gap-1.5 py-1">
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>Restricted (Admin Only)</span>
              </div>
              <div className="text-[11px] text-slate-400">
                Financial data hidden
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
