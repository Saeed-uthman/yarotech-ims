import React, { useState } from 'react';
import {
  FileSpreadsheet,
  Search,
  Users,
  AlertCircle,
  CheckCircle2,
  TrendingUp,
} from 'lucide-react';
import { DebtMovementReportData, UserRole } from '../../types';
import { exportToCSV } from './exportUtils';

interface DebtMovementReportViewProps {
  debtReport: DebtMovementReportData | null;
  isLoading: boolean;
  role: UserRole;
}

export const DebtMovementReportView: React.FC<DebtMovementReportViewProps> = ({
  debtReport,
  isLoading,
}) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'cleared'>('all');

  if (isLoading || !debtReport) {
    return (
      <div className="space-y-6 animate-pulse" id="debt-report-loading">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-gray-200 rounded-xl"></div>
          ))}
        </div>
        <div className="h-72 bg-gray-200 rounded-xl"></div>
      </div>
    );
  }

  const { summary, trends, debtors } = debtReport;
  const maxTrend = Math.max(
    ...trends.map((t) => Math.max(t.debtCreated, t.debtRepaid)),
    1000
  );

  const filteredDebtors = debtors.filter((d) => {
    if (statusFilter === 'active' && d.currentDebtBalance <= 0) return false;
    if (statusFilter === 'cleared' && d.currentDebtBalance > 0) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchName = d.customerName.toLowerCase().includes(q);
      const matchPhone = d.customerPhone.toLowerCase().includes(q);
      if (!matchName && !matchPhone) return false;
    }
    return true;
  });

  const handleExportCSV = () => {
    const headers = [
      'Customer Name',
      'Phone Number',
      'Current Outstanding Balance (₦)',
      'Debt Incurred in Period (₦)',
      'Debt Repaid in Period (₦)',
      'Lifetime Purchases (₦)',
      'Last Payment Date',
      'Status',
    ];

    const rows = filteredDebtors.map((d) => [
      d.customerName,
      d.customerPhone || 'N/A',
      d.currentDebtBalance,
      d.debtCreatedInPeriod,
      d.debtRepaidInPeriod,
      d.totalPurchases,
      d.lastPaymentDate || 'Never',
      d.currentDebtBalance > 0 ? 'ACTIVE DEBTOR' : 'CLEARED',
    ]);

    exportToCSV('customer-debt-portfolio-report', headers, rows);
  };

  return (
    <div className="space-y-6" id="debt-movement-report-view">
      {/* 4 Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" id="debt-kpi-summary">
        <div className="bg-white rounded-xl border border-gray-200/90 p-4 shadow-xs">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Outstanding Debt</span>
          <p className="text-2xl font-bold text-amber-600 mt-1">
            ₦{summary.totalOutstandingDebt.toLocaleString()}
          </p>
          <p className="text-xs text-gray-500 mt-1">Current total unpaid customer balance</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200/90 p-4 shadow-xs">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Debt Incurred in Period</span>
          <p className="text-2xl font-bold text-rose-600 mt-1">
            ₦{summary.debtCreatedInPeriod.toLocaleString()}
          </p>
          <p className="text-xs text-gray-500 mt-1">New credit sales issued</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200/90 p-4 shadow-xs">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Debt Collected in Period</span>
          <p className="text-2xl font-bold text-emerald-600 mt-1">
            ₦{summary.debtPaymentsInPeriod.toLocaleString()}
          </p>
          <p className="text-xs text-gray-500 mt-1">Recovered cash / transfer receipts</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200/90 p-4 shadow-xs">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Active Debtors</span>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {summary.activeDebtorsCount} customers
          </p>
          <p className="text-xs text-gray-500 mt-1">Customers with balance &gt; ₦0</p>
        </div>
      </div>

      {/* Debt Created vs Recovered Timeline */}
      <div className="bg-white rounded-xl border border-gray-200/90 p-5 shadow-xs space-y-3" id="debt-timeline-card">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-amber-600" />
              <span>Credit Issued vs Debt Collections Trajectory</span>
            </h4>
            <p className="text-xs text-gray-500">Timeline tracking credit growth vs cash recovery</p>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-rose-500"></span>
              <span className="text-gray-600 font-medium">New Credit Issued</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-emerald-500"></span>
              <span className="text-gray-600 font-medium">Debt Payments Collected</span>
            </div>
          </div>
        </div>

        <div className="h-44 flex items-end gap-2 pt-6 pb-2 border-b border-gray-100">
          {trends.map((t, idx) => {
            const debtHeightPct = Math.max(6, Math.round((t.debtCreated / maxTrend) * 100));
            const repayHeightPct = Math.max(6, Math.round((t.debtRepaid / maxTrend) * 100));
            return (
              <div
                key={idx}
                className="flex-1 flex flex-col items-center justify-end h-full group relative"
              >
                <div className="absolute -top-12 hidden group-hover:flex flex-col items-center z-10 bg-gray-900 text-white text-[10px] py-1 px-2 rounded shadow-lg whitespace-nowrap pointer-events-none">
                  <span className="font-bold">{t.label}</span>
                  <span>Issued: ₦{t.debtCreated.toLocaleString()}</span>
                  <span>Repaid: ₦{t.debtRepaid.toLocaleString()}</span>
                </div>

                <div className="w-full flex items-end justify-center gap-1 h-full">
                  <div
                    style={{ height: `${debtHeightPct}%` }}
                    className="w-full max-w-[20px] bg-rose-500 hover:bg-rose-600 rounded-t-sm transition-all"
                  ></div>
                  <div
                    style={{ height: `${repayHeightPct}%` }}
                    className="w-full max-w-[20px] bg-emerald-500 hover:bg-emerald-600 rounded-t-sm transition-all"
                  ></div>
                </div>
                <span className="text-[9px] text-gray-400 mt-1 truncate max-w-[32px]">
                  {t.label.split(' ')[0]}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Debtors List Table */}
      <div className="bg-white rounded-xl border border-gray-200/90 shadow-xs overflow-hidden" id="debtors-table-card">
        {/* Table Toolbar */}
        <div className="p-4 border-b border-gray-200/80 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                statusFilter === 'all'
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              All Customers ({debtors.length})
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter('active')}
              className={`inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                statusFilter === 'active'
                  ? 'bg-amber-50 text-amber-700 border border-amber-300'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <AlertCircle className="w-3.5 h-3.5" />
              <span>Active Debtors ({summary.activeDebtorsCount})</span>
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter('cleared')}
              className={`inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                statusFilter === 'cleared'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-300'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Cleared (₦0)</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search customer or phone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-hidden w-56"
              />
            </div>

            <button
              type="button"
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-amber-700 bg-white border border-amber-300 rounded-lg hover:bg-amber-50 transition-colors"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-gray-50/75 border-b border-gray-200 text-gray-500 uppercase font-semibold text-[11px]">
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4 text-right">Current Balance</th>
                <th className="py-3 px-4 text-right">Incurred in Period</th>
                <th className="py-3 px-4 text-right">Repaid in Period</th>
                <th className="py-3 px-4 text-right">Lifetime Purchases</th>
                <th className="py-3 px-4 text-right">Last Payment</th>
                <th className="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-700">
              {filteredDebtors.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-gray-400">
                    No matching customer debt records.
                  </td>
                </tr>
              ) : (
                filteredDebtors.map((d) => (
                  <tr key={d.customerId} className="hover:bg-gray-50/50">
                    <td className="py-3 px-4">
                      <p className="font-semibold text-gray-900">{d.customerName}</p>
                      <p className="text-[11px] text-gray-500">{d.customerPhone || 'No phone'}</p>
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-amber-700">
                      ₦{d.currentDebtBalance.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right text-rose-600">
                      ₦{d.debtCreatedInPeriod.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right text-emerald-600 font-medium">
                      ₦{d.debtRepaidInPeriod.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right text-gray-600">
                      ₦{d.totalPurchases.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right text-gray-500">
                      {d.lastPaymentDate
                        ? new Date(d.lastPaymentDate).toLocaleDateString()
                        : 'Never'}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          d.currentDebtBalance > 0
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}
                      >
                        {d.currentDebtBalance > 0 ? 'Active Debtor' : 'Cleared'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
