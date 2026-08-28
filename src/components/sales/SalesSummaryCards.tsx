import React from 'react';
import {
  TrendingUp,
  DollarSign,
  ShoppingBag,
  Clock,
  AlertCircle,
  Percent,
  CheckCircle2,
  Calendar,
} from 'lucide-react';
import { SalesSummaryKPIs, SalesFilterParams, UserRole } from '../../types';
import { formatNaira, formatNumber } from '../../utils/formatters';

interface SalesSummaryCardsProps {
  summary: SalesSummaryKPIs | null;
  filters: SalesFilterParams;
  role: UserRole;
  isLoading: boolean;
}

export const SalesSummaryCards: React.FC<SalesSummaryCardsProps> = ({
  summary,
  filters,
  role,
  isLoading,
}) => {
  const isAdmin = role === 'admin';

  const getTimeframeLabel = (tf: string) => {
    switch (tf) {
      case 'today':
        return `Today (${new Date().toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })})`;
      case 'this_week':
        return 'This Week';
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
      <div id="sales-summary-cards-loading" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
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
    <div id="sales-summary-cards" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {/* 1. Total Revenue Card */}
      <div
        id="kpi-total-revenue"
        className="bg-white rounded-xl p-5 border border-emerald-100 shadow-xs hover:border-emerald-200 transition-all flex flex-col justify-between"
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Total Revenue
          </span>
          <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>
        <div className="mt-3">
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            {formatNaira(summary.totalRevenue)}
          </div>
          <div className="flex items-center gap-1.5 mt-1.5 text-xs text-slate-500">
            <Calendar className="w-3.5 h-3.5 text-emerald-500" />
            <span className="font-medium text-emerald-700">{getTimeframeLabel(filters.dateRange)}</span>
          </div>
        </div>
      </div>

      {/* 2. Total Profit Card (Admin Only) or Average Sale Card (Cashier) */}
      {isAdmin ? (
        <div
          id="kpi-total-profit"
          className="bg-white rounded-xl p-5 border border-indigo-100 shadow-xs hover:border-indigo-200 transition-all flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Gross Profit
              </span>
              <span className="px-1.5 py-0.5 text-[10px] font-bold bg-indigo-50 text-indigo-700 rounded-sm border border-indigo-200">
                Admin
              </span>
            </div>
            <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-extrabold text-indigo-900 tracking-tight">
              {formatNaira(summary.totalProfit)}
            </div>
            <div className="flex items-center gap-1.5 mt-1.5 text-xs text-slate-500">
              <span className="text-indigo-600 font-medium">
                {summary.totalRevenue > 0
                  ? `${Math.round((summary.totalProfit / summary.totalRevenue) * 100)}% margin`
                  : '0% margin'}
              </span>
              <span>across items</span>
            </div>
          </div>
        </div>
      ) : (
        <div
          id="kpi-avg-sale-cashier"
          className="bg-white rounded-xl p-5 border border-indigo-100 shadow-xs hover:border-indigo-200 transition-all flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Avg Transaction
            </span>
            <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Percent className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {formatNaira(summary.averageSaleValue)}
            </div>
            <div className="flex items-center gap-1.5 mt-1.5 text-xs text-slate-500">
              <span>Per customer checkout</span>
            </div>
          </div>
        </div>
      )}

      {/* 3. Completed Transactions Card */}
      <div
        id="kpi-transactions-count"
        className="bg-white rounded-xl p-5 border border-blue-100 shadow-xs hover:border-blue-200 transition-all flex flex-col justify-between"
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Transactions
          </span>
          <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
            <ShoppingBag className="w-5 h-5" />
          </div>
        </div>
        <div className="mt-3">
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            {formatNumber(summary.totalTransactions)}
          </div>
          <div className="flex items-center gap-2 mt-1.5 text-xs text-slate-500">
            <span className="text-emerald-600 font-semibold">{summary.paidCount} Paid</span>
            <span>•</span>
            <span className="text-amber-600 font-semibold">{summary.partialCount} Partial</span>
            {summary.unpaidCount > 0 && (
              <>
                <span>•</span>
                <span className="text-rose-600 font-semibold">{summary.unpaidCount} Credit</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* 4. Outstanding Credit Balance Card */}
      <div
        id="kpi-outstanding-credit"
        className="bg-white rounded-xl p-5 border border-amber-100 shadow-xs hover:border-amber-200 transition-all flex flex-col justify-between"
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Unpaid / Credit
          </span>
          <div
            className={`w-9 h-9 rounded-lg flex items-center justify-center ${
              summary.totalOutstanding > 0
                ? 'bg-amber-50 text-amber-600'
                : 'bg-emerald-50 text-emerald-600'
            }`}
          >
            {summary.totalOutstanding > 0 ? (
              <AlertCircle className="w-5 h-5" />
            ) : (
              <CheckCircle2 className="w-5 h-5" />
            )}
          </div>
        </div>
        <div className="mt-3">
          <div
            className={`text-2xl sm:text-3xl font-extrabold tracking-tight ${
              summary.totalOutstanding > 0 ? 'text-amber-700' : 'text-slate-900'
            }`}
          >
            {formatNaira(summary.totalOutstanding)}
          </div>
          <div className="flex items-center gap-1.5 mt-1.5 text-xs text-slate-500">
            {summary.totalOutstanding > 0 ? (
              <span className="text-amber-700 font-medium">Customer debt recorded</span>
            ) : (
              <span className="text-emerald-700 font-medium">All accounts settled</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
