import React from 'react';
import {
  Users,
  UserCheck,
  CreditCard,
  AlertCircle,
  TrendingUp,
} from 'lucide-react';
import { CustomerSummaryKPIs } from '../../types';
import { formatNaira, formatNumber } from '../../utils/formatters';

interface CustomerSummaryCardsProps {
  kpis: CustomerSummaryKPIs | null;
  isLoading?: boolean;
  activeDebtStatusFilter?: string;
  onSelectDebtFilter?: (status: 'all' | 'has_debt' | 'no_debt') => void;
}

export const CustomerSummaryCards: React.FC<CustomerSummaryCardsProps> = ({
  kpis,
  isLoading = false,
  activeDebtStatusFilter = 'all',
  onSelectDebtFilter,
}) => {
  if (isLoading || !kpis) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="bg-white p-4 border border-slate-200 rounded-lg shadow-xs animate-pulse h-28 flex flex-col justify-between"
          >
            <div className="h-3 bg-slate-200 rounded w-24 mb-2"></div>
            <div className="h-6 bg-slate-200 rounded w-20 mb-1"></div>
            <div className="h-2.5 bg-slate-100 rounded w-28"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
      {/* 1. Total Registered Customers */}
      <div
        id="metric-card-total-customers"
        className="bg-white p-4 border border-slate-200 rounded-lg shadow-xs hover:border-slate-300 transition-colors flex flex-col justify-between cursor-pointer"
        onClick={() => onSelectDebtFilter && onSelectDebtFilter('all')}
      >
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Registered Customers
          </p>
          <div className="w-7 h-7 rounded bg-blue-50 text-blue-600 flex items-center justify-center">
            <Users className="w-3.5 h-3.5" />
          </div>
        </div>
        <div>
          <h3 className="text-xl sm:text-2xl font-bold text-slate-800">
            {formatNumber(kpis.totalCustomers)}
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            {formatNumber(kpis.activeCustomers)} active accounts
          </p>
        </div>
      </div>

      {/* 2. Customers With Outstanding Debt */}
      <div
        id="metric-card-customers-with-debt"
        onClick={() => onSelectDebtFilter && onSelectDebtFilter('has_debt')}
        className={`p-4 border rounded-lg shadow-xs transition-all cursor-pointer flex flex-col justify-between ${
          activeDebtStatusFilter === 'has_debt'
            ? 'bg-amber-50/70 border-amber-400 ring-2 ring-amber-400/20'
            : 'bg-white border-slate-200 hover:border-amber-300'
        }`}
      >
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-bold text-amber-700 uppercase tracking-wider">
            Accounts In Debt
          </p>
          <div className="w-7 h-7 rounded bg-amber-100 text-amber-700 flex items-center justify-center">
            <AlertCircle className="w-3.5 h-3.5" />
          </div>
        </div>
        <div>
          <h3 className="text-xl sm:text-2xl font-bold text-amber-900">
            {formatNumber(kpis.customersWithDebt)}
          </h3>
          <p className="text-xs text-amber-700 mt-0.5 font-medium">
            {kpis.totalCustomers > 0
              ? `${Math.round((kpis.customersWithDebt / kpis.totalCustomers) * 100)}% of customers`
              : '0%'}
          </p>
        </div>
      </div>

      {/* 3. Total Outstanding Debt (₦) */}
      <div
        id="metric-card-total-outstanding-debt"
        className="bg-white p-4 border border-rose-200 rounded-lg shadow-xs hover:border-rose-300 transition-colors flex flex-col justify-between"
      >
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-bold text-rose-600 uppercase tracking-wider">
            Total Outstanding Debt
          </p>
          <div className="w-7 h-7 rounded bg-rose-50 text-rose-600 flex items-center justify-center">
            <CreditCard className="w-3.5 h-3.5" />
          </div>
        </div>
        <div>
          <h3 className="text-xl sm:text-2xl font-bold text-rose-700">
            {formatNaira(kpis.totalOutstandingDebt)}
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Pending customer credit settlements
          </p>
        </div>
      </div>

      {/* 4. Total Customer Sales Volume */}
      <div
        id="metric-card-total-customer-purchases"
        className="bg-white p-4 border border-slate-200 rounded-lg shadow-xs hover:border-slate-300 transition-colors flex flex-col justify-between"
      >
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Customer Purchases
          </p>
          <div className="w-7 h-7 rounded bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <TrendingUp className="w-3.5 h-3.5" />
          </div>
        </div>
        <div>
          <h3 className="text-xl sm:text-2xl font-bold text-slate-800">
            {formatNaira(kpis.totalCustomerPurchases)}
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Cumulative registered sales
          </p>
        </div>
      </div>
    </div>
  );
};
