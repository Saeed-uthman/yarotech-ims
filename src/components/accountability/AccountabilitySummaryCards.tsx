import React from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Scale,
  Receipt,
  ShoppingCart,
  Users,
  Briefcase,
  Info,
} from 'lucide-react';
import { AccountabilitySummary } from '../../types';

interface AccountabilitySummaryCardsProps {
  summary: AccountabilitySummary | null;
  isLoading: boolean;
}

export const AccountabilitySummaryCards: React.FC<
  AccountabilitySummaryCardsProps
> = ({ summary, isLoading }) => {
  if (isLoading || !summary) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs animate-pulse"
          >
            <div className="h-4 bg-slate-200 rounded w-28 mb-3" />
            <div className="h-8 bg-slate-200 rounded w-36 mb-2" />
            <div className="h-3 bg-slate-100 rounded w-44" />
          </div>
        ))}
      </div>
    );
  }

  const isNetPositive = summary.netMovement >= 0;

  return (
    <div className="space-y-3 mb-6">
      {/* 3 Main KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-4">
        {/* Money In Card */}
        <div
          id="kpi-card-money-in"
          className="relative bg-white border border-emerald-200/80 rounded-xl p-4 sm:p-5 shadow-xs hover:shadow-md transition-shadow"
        >
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Money Received (In)
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center">
              <ArrowDownLeft className="w-4 h-4" />
            </div>
          </div>

          <div className="text-2xl sm:text-3xl font-extrabold text-emerald-700 font-mono tracking-tight">
            +₦{summary.moneyIn.toLocaleString()}
          </div>

          <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-100 text-xs text-slate-600">
            <span className="inline-flex items-center gap-1 font-medium text-emerald-800">
              <Receipt className="w-3 h-3" />
              Sales: ₦{summary.salesIncome.toLocaleString()}
            </span>
            <span className="text-slate-300">•</span>
            <span className="inline-flex items-center gap-1 font-medium text-blue-800">
              <Users className="w-3 h-3" />
              Debts: ₦{summary.debtPaymentsIncome.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Money Out Card */}
        <div
          id="kpi-card-money-out"
          className="relative bg-white border border-rose-200/80 rounded-xl p-4 sm:p-5 shadow-xs hover:shadow-md transition-shadow"
        >
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Money Spent (Out)
            </span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 flex items-center justify-center">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>

          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono tracking-tight">
            −₦{summary.moneyOut.toLocaleString()}
          </div>

          <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-100 text-xs text-slate-600">
            <span className="inline-flex items-center gap-1 font-medium text-amber-800">
              <ShoppingCart className="w-3 h-3" />
              Restock: ₦{summary.purchasesExpense.toLocaleString()}
            </span>
            <span className="text-slate-300">•</span>
            <span className="inline-flex items-center gap-1 font-medium text-purple-800">
              <Briefcase className="w-3 h-3" />
              Expenses: ₦{summary.otherExpensesExpense.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Net Movement Card (Explicitly NOT labelled profit!) */}
        <div
          id="kpi-card-net-movement"
          className={`relative bg-white border rounded-xl p-4 sm:p-5 shadow-xs hover:shadow-md transition-shadow ${
            isNetPositive ? 'border-slate-300' : 'border-amber-300 bg-amber-50/20'
          }`}
        >
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Net Movement (Cash Flow)
              </span>
            </div>
            <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 border border-slate-200 flex items-center justify-center">
              <Scale className="w-4 h-4" />
            </div>
          </div>

          <div
            className={`text-2xl sm:text-3xl font-extrabold font-mono tracking-tight ${
              isNetPositive ? 'text-slate-900' : 'text-amber-700'
            }`}
          >
            {isNetPositive ? '+' : '−'}₦
            {Math.abs(summary.netMovement).toLocaleString()}
          </div>

          <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-slate-100 text-[11px] text-slate-500">
            <Info className="w-3 h-3 text-slate-400 shrink-0" />
            <span>Money In − Money Out ({summary.totalTransactionsCount} transactions)</span>
          </div>
        </div>
      </div>
    </div>
  );
};
