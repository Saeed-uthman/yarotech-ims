import React from 'react';
import {
  DollarSign,
  PackageCheck,
  TrendingDown,
  Calendar,
  Layers,
  XCircle,
  Receipt,
} from 'lucide-react';
import { PurchaseSummaryKPIs, PurchaseFilterParams } from '../../types';
import { formatNaira, formatNumber } from '../../utils/formatters';

interface PurchaseSummaryCardsProps {
  summary: PurchaseSummaryKPIs | null;
  filters: PurchaseFilterParams;
  isLoading: boolean;
}

export const PurchaseSummaryCards: React.FC<PurchaseSummaryCardsProps> = ({
  summary,
  filters,
  isLoading,
}) => {
  const getTimeframeLabel = (tf: string) => {
    switch (tf) {
      case 'today':
        return `Today (${new Date().toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })})`;
      case 'this_week': {
        const today = new Date();
        const start = new Date(today);
        start.setDate(today.getDate() - ((today.getDay() + 6) % 7));
        const end = new Date(start);
        end.setDate(start.getDate() + 6);
        return `This Week (${start.toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })}–${end.toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })})`;
      }
      case 'this_month':
        return `This Month (${new Date().toLocaleDateString('en-NG', { month: 'long', year: 'numeric' })})`;
      case 'custom':
        return filters.startDate && filters.endDate
          ? `${filters.startDate} to ${filters.endDate}`
          : 'Custom Period';
      case 'overall':
      default:
        return 'All Time';
    }
  };

  if (isLoading || !summary) {
    return (
      <div id="purchase-summary-cards-loading" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs animate-pulse flex flex-col justify-between h-28"
          >
            <div className="flex justify-between items-center">
              <div className="h-4 bg-slate-200 rounded-md w-24"></div>
              <div className="w-8 h-8 bg-slate-100 rounded-lg"></div>
            </div>
            <div className="h-7 bg-slate-200 rounded-md w-36 mt-2"></div>
            <div className="h-3 bg-slate-100 rounded-md w-20 mt-1"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div id="purchase-summary-cards" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {/* 1. Total Capital Outflow / Spent */}
      <div
        id="kpi-total-spent"
        className="bg-white rounded-xl p-5 border border-indigo-100 shadow-xs hover:border-indigo-200 transition-all flex flex-col justify-between"
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Total Capital Spent
          </span>
          <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>
        <div className="mt-3">
          <div className="text-2xl sm:text-3xl font-extrabold text-indigo-950 tracking-tight">
            {formatNaira(summary.totalSpent)}
          </div>
          <div className="flex items-center gap-1.5 mt-1.5 text-xs text-slate-500">
            <Calendar className="w-3.5 h-3.5 text-indigo-500" />
            <span className="font-medium text-indigo-700">{getTimeframeLabel(filters.dateRange)}</span>
          </div>
        </div>
      </div>

      {/* 2. Total Purchases / Consignments Count */}
      <div
        id="kpi-purchases-count"
        className="bg-white rounded-xl p-5 border border-blue-100 shadow-xs hover:border-blue-200 transition-all flex flex-col justify-between"
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Purchase Orders
          </span>
          <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
            <Receipt className="w-5 h-5" />
          </div>
        </div>
        <div className="mt-3">
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            {formatNumber(summary.completedPurchasesCount)}
            <span className="text-sm font-normal text-slate-400 ml-1.5">
              / {summary.totalPurchasesCount} total
            </span>
          </div>
          <div className="flex items-center gap-2 mt-1.5 text-xs text-slate-500">
            <span className="text-emerald-600 font-semibold">{summary.completedPurchasesCount} Completed</span>
            {summary.cancelledPurchasesCount > 0 && (
              <>
                <span>•</span>
                <span className="text-rose-600 font-semibold flex items-center gap-0.5">
                  <XCircle className="w-3 h-3 inline" /> {summary.cancelledPurchasesCount} Cancelled
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* 3. Total Units Received / Restocked */}
      <div
        id="kpi-units-restocked"
        className="bg-white rounded-xl p-5 border border-emerald-100 shadow-xs hover:border-emerald-200 transition-all flex flex-col justify-between"
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Units Restocked
          </span>
          <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <PackageCheck className="w-5 h-5" />
          </div>
        </div>
        <div className="mt-3">
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            {formatNumber(summary.totalUnitsRestocked)}
            <span className="text-sm font-normal text-slate-500 ml-1">units</span>
          </div>
          <div className="flex items-center gap-1.5 mt-1.5 text-xs text-emerald-700 font-medium">
            <Layers className="w-3.5 h-3.5" />
            <span>Added directly to live inventory</span>
          </div>
        </div>
      </div>

      {/* 4. Average Order Value */}
      <div
        id="kpi-avg-purchase-value"
        className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between"
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Average Order Size
          </span>
          <div className="w-9 h-9 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
            <TrendingDown className="w-5 h-5" />
          </div>
        </div>
        <div className="mt-3">
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            {formatNaira(summary.averagePurchaseValue)}
          </div>
          <div className="flex items-center gap-1.5 mt-1.5 text-xs text-slate-500">
            <span>Per restock transaction</span>
          </div>
        </div>
      </div>
    </div>
  );
};
