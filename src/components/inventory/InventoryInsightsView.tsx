import React from 'react';
import { 
  BarChart3, 
  ArrowUpRight, 
  ArrowDownRight, 
  Sliders, 
  ShieldAlert, 
  Clock, 
  PieChart, 
  TrendingUp,
  Layers,
  ArrowRight,
  RotateCcw
} from 'lucide-react';
import { 
  InventoryInsightsData, 
  InsightsTimeframe, 
  UserRole,
  InventoryMovement 
} from '../../types';
import { formatCurrencyNaira, formatNumber, formatCompactNaira } from '../../utils/formatters';

interface InventoryInsightsViewProps {
  insights: InventoryInsightsData | null;
  isLoading: boolean;
  timeframe: InsightsTimeframe;
  onTimeframeChange: (tf: InsightsTimeframe) => void;
  currentRole: UserRole;
  onSelectProduct?: (productId: string) => void;
  onRefresh?: () => void;
}

export const InventoryInsightsView: React.FC<InventoryInsightsViewProps> = ({
  insights,
  isLoading,
  timeframe,
  onTimeframeChange,
  currentRole,
  onSelectProduct,
  onRefresh,
}) => {
  const isAdmin = currentRole === 'admin';

  if (isLoading || !insights) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-pulse">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-white border border-slate-200 rounded-lg p-4">
              <div className="h-3 bg-slate-200 rounded w-20 mb-2"></div>
              <div className="h-6 bg-slate-200 rounded w-16"></div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-pulse">
          <div className="h-72 bg-white border border-slate-200 rounded-lg"></div>
          <div className="h-72 bg-white border border-slate-200 rounded-lg"></div>
        </div>
      </div>
    );
  }

  const { summary, movementSummary, topValuedItems, topQuantityItems, categoryDistribution } = insights;

  const renderMovementTypeBadge = (type: InventoryMovement['type'], qty: number) => {
    if (type === 'STOCK_IN') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <ArrowUpRight className="w-3 h-3 text-emerald-600" />
          Stock Intake (+{Math.abs(qty)})
        </span>
      );
    }
    if (type === 'STOCK_OUT') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
          <ArrowDownRight className="w-3 h-3 text-rose-600" />
          Sold (-{Math.abs(qty)})
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
        <Sliders className="w-3 h-3 text-blue-600" />
        Adjustment ({qty > 0 ? `+${qty}` : qty})
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Header / Timeframe Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-600" />
            <span>Inventory Operational Insights</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Stock movement metrics, capital allocation, and audit accountability
          </p>
        </div>

        {/* Timeframe selector pills */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg self-start sm:self-auto">
          {[
            { id: 'today', label: 'Today' },
            { id: 'this_week', label: 'This Week' },
            { id: 'this_month', label: 'This Month' },
            { id: 'all_time', label: 'All Time' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => onTimeframeChange(tab.id as InsightsTimeframe)}
              className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                timeframe === tab.id
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}

          {onRefresh && (
            <button
              onClick={onRefresh}
              className="p-1 text-slate-400 hover:text-slate-700 ml-1 rounded hover:bg-slate-200 transition-colors"
              title="Refresh insights"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Movement Metric Summary Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* 1. Total Stock In */}
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Total Inbound
            </p>
            <p className="text-xl sm:text-2xl font-bold text-emerald-700 font-mono mt-1">
              +{formatNumber(movementSummary.totalStockIn)}
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">Units received into stock</p>
          </div>
          <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <ArrowUpRight className="w-5 h-5" />
          </div>
        </div>

        {/* 2. Total Stock Out */}
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Total Outbound
            </p>
            <p className="text-xl sm:text-2xl font-bold text-rose-700 font-mono mt-1">
              -{formatNumber(movementSummary.totalStockOut)}
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">Units sold</p>
          </div>
          <div className="w-9 h-9 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
            <ArrowDownRight className="w-5 h-5" />
          </div>
        </div>

        {/* 3. Net Movement */}
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Net Stock Delta
            </p>
            <p className={`text-xl sm:text-2xl font-bold font-mono mt-1 ${
              movementSummary.netMovement >= 0 ? 'text-blue-700' : 'text-amber-700'
            }`}>
              {movementSummary.netMovement >= 0 ? `+${formatNumber(movementSummary.netMovement)}` : formatNumber(movementSummary.netMovement)}
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">Net inventory change</p>
          </div>
          <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        {/* 4. Total Manual Adjustments */}
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Audit Adjustments
            </p>
            <p className="text-xl sm:text-2xl font-bold text-slate-900 font-mono mt-1">
              {formatNumber(movementSummary.totalAdjustmentsCount)}
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">Admin corrections logged</p>
          </div>
          <div className="w-9 h-9 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
            <Sliders className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Analytics Grid: Top Value vs Top Volume */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top 6 Holdings by Inventory Value (Cost Basis) */}
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <span>Top Holdings by Capital Value</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Stock Units × Base Wholesale Cost (Admin View)
                </p>
              </div>
              <span className="text-[11px] font-bold px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded">
                Cost Basis
              </span>
            </div>

            {isAdmin ? (
              <div className="space-y-3">
                {topValuedItems.map((item, idx) => {
                  const maxVal = topValuedItems[0]?.inventoryValue || 1;
                  const pct = Math.max(10, Math.round((item.inventoryValue / maxVal) * 100));

                  return (
                    <div 
                      key={item.variantId} 
                      className="p-2.5 rounded-lg border border-slate-100 hover:border-slate-300 hover:bg-slate-50/60 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2 text-xs mb-1.5">
                        <div className="min-w-0">
                          <span className="font-bold text-slate-900 block truncate">
                            {idx + 1}. {item.productName}
                          </span>
                          <span className="text-[11px] text-slate-500">
                            {item.genericName} • <span className="font-semibold text-blue-700">{item.companyName}</span>
                          </span>
                        </div>
                        <div className="text-right font-mono shrink-0">
                          <span className="font-bold text-emerald-800 text-sm block">
                            {formatCurrencyNaira(item.inventoryValue)}
                          </span>
                          <span className="text-[10px] text-slate-500">
                            {formatNumber(item.currentStock)} units @ {formatCurrencyNaira(item.basePrice)}
                          </span>
                        </div>
                      </div>

                      {/* Visual Bar */}
                      <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-emerald-600 h-full rounded-full transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-12 text-center bg-slate-50 rounded-lg border border-slate-200">
                <ShieldAlert className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <h4 className="text-xs font-bold text-slate-700">Financial Valuation Redacted</h4>
                <p className="text-[11px] text-slate-500 max-w-xs mx-auto mt-1">
                  Cost basis valuation rankings are restricted to Company Administrators.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Top 6 Volume Stock Holdings (Quantity on Hand) */}
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Top Stock Volume on Hand
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Largest physical quantities currently held in stock
                </p>
              </div>
              <span className="text-[11px] font-bold px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded">
                Unit Count
              </span>
            </div>

            <div className="space-y-3">
              {topQuantityItems.map((item, idx) => {
                const maxQty = topQuantityItems[0]?.currentStock || 1;
                const pct = Math.max(10, Math.round((item.currentStock / maxQty) * 100));

                return (
                  <div 
                    key={item.variantId} 
                    className="p-2.5 rounded-lg border border-slate-100 hover:border-slate-300 hover:bg-slate-50/60 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2 text-xs mb-1.5">
                      <div className="min-w-0">
                        <span className="font-bold text-slate-900 block truncate">
                          {idx + 1}. {item.productName}
                        </span>
                        <span className="text-[11px] text-slate-500">
                          {item.genericName} • <span className="font-semibold text-blue-700">{item.companyName}</span>
                        </span>
                      </div>
                      <div className="text-right font-mono shrink-0">
                        <span className="font-bold text-slate-900 text-sm block">
                          {formatNumber(item.currentStock)} units
                        </span>
                        <span className="text-[10px] text-slate-400">
                          Threshold: {formatNumber(item.reorderLevel)}
                        </span>
                      </div>
                    </div>

                    {/* Visual Bar */}
                    <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-blue-600 h-full rounded-full transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Category Stock Distribution */}
      <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <PieChart className="w-4 h-4 text-slate-500" />
              <span>Category Stock Distribution</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Unit allocation and active variant volume across therapeutic categories
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {categoryDistribution.map((cat) => (
            <div
              key={cat.categoryId}
              className="p-3.5 rounded-lg border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-start justify-between gap-1 mb-2">
                <span className="font-bold text-xs text-slate-900">
                  {cat.categoryName}
                </span>
                <span className="text-[11px] font-bold font-mono text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">
                  {cat.percentageOfTotalUnits}%
                </span>
              </div>

              <div className="flex items-center justify-between text-xs font-mono text-slate-600 mb-2">
                <span>{formatNumber(cat.totalUnits)} units</span>
                <span className="text-slate-400">{cat.totalVariants} variants</span>
              </div>

              <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-blue-600 h-full rounded-full"
                  style={{ width: `${Math.min(100, Math.max(5, cat.percentageOfTotalUnits))}%` }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Stock Movement Audit Trail Ledger */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-500" />
              <span>Recent Stock Movement Audit Ledger</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Traceable movements with responsible user signatures and reason justifications
            </p>
          </div>
        </div>

        <div className="divide-y divide-slate-100 text-xs">
          {movementSummary.recentMovements.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              No stock movements recorded for this timeframe.
            </div>
          ) : (
            movementSummary.recentMovements.map((mov) => (
              <div
                key={mov.id}
                className="p-4 hover:bg-slate-50/70 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                {/* Movement Info */}
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {renderMovementTypeBadge(mov.type, mov.quantity)}
                    <span className="font-bold text-slate-900 text-xs">
                      {mov.productName}
                    </span>
                    <span className="text-[11px] text-blue-700 bg-blue-50 px-2 py-0.5 rounded font-semibold border border-blue-200/60">
                      {mov.companyName}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600">
                    <strong className="text-slate-700">Reason:</strong> {mov.reason}
                  </p>

                  <div className="text-[11px] text-slate-400 flex items-center gap-3">
                    <span>Logged by: <strong>{mov.createdBy}</strong></span>
                    <span>•</span>
                    <span>{mov.createdAt}</span>
                    {mov.referenceId && (
                      <>
                        <span>•</span>
                        <span className="font-mono text-slate-500">Ref: {mov.referenceId}</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Stock Level Delta Display */}
                <div className="text-right font-mono shrink-0 sm:self-center bg-slate-50 px-3 py-2 rounded-lg border border-slate-100">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
                    Stock Level
                  </span>
                  <div className="flex items-center gap-1.5 text-xs">
                    <span className="text-slate-500">{formatNumber(mov.previousStock)}</span>
                    <span className="text-slate-400">➔</span>
                    <span className="font-bold text-slate-900">{formatNumber(mov.newStock)}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
