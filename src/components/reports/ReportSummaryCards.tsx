import React from 'react';
import {
  TrendingUp,
  DollarSign,
  ShoppingBag,
  ArrowDownRight,
  ArrowUpRight,
  CreditCard,
  Lock,
  Package,
} from 'lucide-react';
import { FinancialSummaryReport, UserRole } from '../../types';

interface ReportSummaryCardsProps {
  summary: FinancialSummaryReport | null;
  isLoading: boolean;
  role: UserRole;
}

export const ReportSummaryCards: React.FC<ReportSummaryCardsProps> = ({
  summary,
  isLoading,
  role,
}) => {
  const isAdmin = role === 'admin';

  if (isLoading || !summary) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse" id="reports-kpi-loading">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="w-20 h-4 bg-gray-200 rounded"></div>
              <div className="w-8 h-8 bg-gray-200 rounded-lg"></div>
            </div>
            <div className="w-28 h-6 bg-gray-200 rounded"></div>
            <div className="w-36 h-3 bg-gray-200 rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  const isNetPositive = summary.netMoneyMovement >= 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5" id="reports-summary-cards">
      {/* 1. Total Sales */}
      <div className="bg-white rounded-xl border border-gray-200/90 p-4 hover:border-emerald-200 transition-colors shadow-xs" id="card-total-sales">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Sales</span>
          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <TrendingUp className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2.5">
          <p className="text-xl font-bold text-gray-900 tracking-tight">
            ₦{summary.totalSales.toLocaleString()}
          </p>
          <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
            <span>{summary.totalTransactions} transactions</span>
            <span>•</span>
            <span>{summary.totalUnitsSold.toLocaleString()} units</span>
          </p>
        </div>
      </div>

      {/* 2. Total Profit (Admin only) */}
      <div className="bg-white rounded-xl border border-gray-200/90 p-4 hover:border-indigo-200 transition-colors shadow-xs" id="card-total-profit">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Gross Profit</span>
          <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
            {isAdmin ? <DollarSign className="w-4 h-4" /> : <Lock className="w-3.5 h-3.5" />}
          </div>
        </div>
        <div className="mt-2.5">
          {isAdmin ? (
            <>
              <p className="text-xl font-bold text-indigo-600 tracking-tight">
                ₦{summary.totalProfit.toLocaleString()}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                <span className="font-medium text-emerald-600">
                  {summary.profitMarginPercentage}%
                </span>{' '}
                gross margin
              </p>
            </>
          ) : (
            <>
              <p className="text-sm font-medium text-gray-400 mt-1 flex items-center gap-1">
                <Lock className="w-3 h-3 text-gray-400" /> Admin Access Only
              </p>
              <p className="text-[11px] text-gray-400 mt-1">Profit figures restricted</p>
            </>
          )}
        </div>
      </div>

      {/* 3. Stock Purchases */}
      <div className="bg-white rounded-xl border border-gray-200/90 p-4 hover:border-amber-200 transition-colors shadow-xs" id="card-stock-purchases">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Purchases</span>
          <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
            <ShoppingBag className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2.5">
          <p className="text-xl font-bold text-gray-900 tracking-tight">
            ₦{summary.totalStockPurchases.toLocaleString()}
          </p>
          <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
            <Package className="w-3 h-3 text-amber-500" />
            <span>{summary.totalUnitsPurchased.toLocaleString()} units acquired</span>
          </p>
        </div>
      </div>

      {/* 4. Money In */}
      <div className="bg-white rounded-xl border border-gray-200/90 p-4 hover:border-emerald-200 transition-colors shadow-xs" id="card-money-in">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Money In</span>
          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <ArrowDownRight className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2.5">
          <p className="text-xl font-bold text-emerald-600 tracking-tight">
            ₦{summary.moneyIn.toLocaleString()}
          </p>
          <p className="text-xs text-gray-500 mt-1">Sales + Debt payments</p>
        </div>
      </div>

      {/* 5. Money Out */}
      <div className="bg-white rounded-xl border border-gray-200/90 p-4 hover:border-rose-200 transition-colors shadow-xs" id="card-money-out">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Money Out</span>
          <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
            <ArrowUpRight className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2.5">
          <p className="text-xl font-bold text-rose-600 tracking-tight">
            ₦{summary.moneyOut.toLocaleString()}
          </p>
          <p className="text-xs text-gray-500 mt-1">Stock + Operating costs</p>
        </div>
      </div>

      {/* 6. Net Money Movement (Cash Flow) */}
      <div
        className={`rounded-xl border p-4 transition-colors shadow-xs ${
          isNetPositive
            ? 'bg-emerald-50/50 border-emerald-200'
            : 'bg-rose-50/50 border-rose-200'
        }`}
        id="card-net-movement"
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-gray-700 uppercase tracking-wider">Net Movement</span>
          <div
            className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              isNetPositive
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-rose-100 text-rose-700'
            }`}
          >
            {isNetPositive ? <ArrowDownRight className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
          </div>
        </div>
        <div className="mt-2.5">
          <p
            className={`text-xl font-bold tracking-tight ${
              isNetPositive ? 'text-emerald-700' : 'text-rose-700'
            }`}
          >
            {summary.netMoneyMovement >= 0 ? '+' : ''}₦{summary.netMoneyMovement.toLocaleString()}
          </p>
          <p className="text-[11px] text-gray-600 mt-1 font-medium">Money In − Money Out</p>
        </div>
      </div>
    </div>
  );
};
