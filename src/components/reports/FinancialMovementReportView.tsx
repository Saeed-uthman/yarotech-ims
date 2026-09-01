import React from 'react';
import {
  ArrowDownRight,
  ArrowUpRight,
  FileText,
  TrendingUp,
  AlertCircle,
  Banknote,
} from 'lucide-react';
import { FinancialMovementReportData, UserRole } from '../../types';
import { exportToPDF } from './exportUtils';

interface FinancialMovementReportViewProps {
  financialMovement: FinancialMovementReportData | null;
  isLoading: boolean;
  role: UserRole;
}

export const FinancialMovementReportView: React.FC<FinancialMovementReportViewProps> = ({
  financialMovement,
  isLoading,
}) => {
  if (isLoading || !financialMovement) {
    return (
      <div className="space-y-6 animate-pulse" id="financial-movement-loading">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-gray-200 rounded-xl"></div>
          ))}
        </div>
        <div className="h-72 bg-gray-200 rounded-xl"></div>
      </div>
    );
  }

  const { summary, trends, moneyInBreakdown, moneyOutBreakdown } = financialMovement;
  const isNetPositive = summary.netMovement >= 0;
  const maxDayAmount = Math.max(
    ...trends.map((t) => Math.max(t.moneyIn, t.moneyOut)),
    1000
  );

  const handleExportPDF = () => {
    const headers = ['Category / Stream', 'Direction', 'Amount (₦)', 'Transactions Count', '% of Flow'];
    const rows: (string | number)[][] = [
      ...moneyInBreakdown.map((m) => [m.source, 'MONEY IN (Inflow)', m.amount, m.count, `${m.percentage}%`]),
      ...moneyOutBreakdown.map((m) => [m.category, 'MONEY OUT (Outflow)', m.amount, m.count, `${m.percentage}%`]),
      ['NET CASH MOVEMENT', isNetPositive ? 'POSITIVE' : 'NEGATIVE', summary.netMovement, '-', '100%'],
    ];
    exportToPDF('financial-movement-report', headers, rows, {
      title: 'Yarotech Group Cash Flow & Financial Movement Report',
      subtitle: `Money In: NGN ${summary.moneyIn.toLocaleString()} | Money Out: NGN ${summary.moneyOut.toLocaleString()} | Net: NGN ${summary.netMovement.toLocaleString()}`,
    });
  };

  return (
    <div className="space-y-6" id="financial-movement-report-view">
      {/* 4 Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4" id="cashflow-kpi-summary">
        <div className="bg-slate-900 text-white rounded-xl border border-slate-700 p-4 shadow-xs">
          <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Current Business Funds</span>
          <p className="text-2xl font-bold mt-1">₦{summary.currentBusinessFunds.toLocaleString()}</p>
          <p className="text-xs text-slate-300 mt-1">All-time combined shop balance</p>
        </div>
        {/* Money In */}
        <div className="bg-white rounded-xl border border-gray-200/90 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Money In</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <ArrowDownRight className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-emerald-600 mt-1">
            ₦{summary.moneyIn.toLocaleString()}
          </p>
          <p className="text-xs text-gray-500 mt-1">Cash, POS & Transfers collected</p>
        </div>

        {/* Money Out */}
        <div className="bg-white rounded-xl border border-gray-200/90 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Money Out</span>
            <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-rose-600 mt-1">
            ₦{summary.moneyOut.toLocaleString()}
          </p>
          <p className="text-xs text-gray-500 mt-1">Restock purchases & operating costs</p>
        </div>

        {/* Net Movement (Strictly Cash Flow) */}
        <div
          className={`rounded-xl border p-4 shadow-xs ${
            isNetPositive
              ? 'bg-emerald-50/50 border-emerald-200'
              : 'bg-rose-50/50 border-rose-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-700 uppercase tracking-wider">Net Cash Movement</span>
            <div
              className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                isNetPositive ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
              }`}
            >
              <Banknote className="w-4 h-4" />
            </div>
          </div>
          <p
            className={`text-2xl font-bold mt-1 ${
              isNetPositive ? 'text-emerald-700' : 'text-rose-700'
            }`}
          >
            {summary.netMovement >= 0 ? '+' : ''}₦{summary.netMovement.toLocaleString()}
          </p>
          <p className="text-[11px] text-gray-600 mt-1 font-medium">Inflows minus disbursements (Cash Flow)</p>
        </div>

        {/* Operating Expenses */}
        <div className="bg-white rounded-xl border border-gray-200/90 p-4 shadow-xs">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Operating Expenses</span>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            ₦{summary.operatingExpenses.toLocaleString()}
          </p>
          <p className="text-xs text-gray-500 mt-1">Rent, logistics, utility & supplies</p>
        </div>
      </div>

      {/* Daily Inflow vs Outflow Trajectory */}
      <div className="bg-white rounded-xl border border-gray-200/90 p-5 shadow-xs space-y-3" id="cashflow-timeline-card">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              <span>Daily Cash Flow Trajectory (Money In vs Money Out)</span>
            </h4>
            <p className="text-xs text-gray-500">Side-by-side comparison of daily operational cash inflow vs outflow</p>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-emerald-500"></span>
              <span className="text-gray-600 font-medium">Money In</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-rose-500"></span>
              <span className="text-gray-600 font-medium">Money Out</span>
            </div>
          </div>
        </div>

        <div className="h-44 flex items-end gap-1.5 sm:gap-2 pt-6 pb-2 border-b border-gray-100">
          {trends.map((t, idx) => {
            const inHeightPct = Math.max(6, Math.round((t.moneyIn / maxDayAmount) * 100));
            const outHeightPct = Math.max(6, Math.round((t.moneyOut / maxDayAmount) * 100));
            return (
              <div
                key={idx}
                className="flex-1 flex flex-col items-center justify-end h-full group relative"
              >
                <div className="absolute -top-12 hidden group-hover:flex flex-col items-center z-10 bg-gray-900 text-white text-[10px] py-1 px-2 rounded shadow-lg whitespace-nowrap pointer-events-none">
                  <span className="font-bold">{t.label}</span>
                  <span>In: ₦{t.moneyIn.toLocaleString()}</span>
                  <span>Out: ₦{t.moneyOut.toLocaleString()}</span>
                </div>

                <div className="w-full flex items-end justify-center gap-0.5 sm:gap-1 h-full">
                  <div
                    style={{ height: `${inHeightPct}%` }}
                    className="w-full max-w-[20px] bg-emerald-500 hover:bg-emerald-600 rounded-t-sm transition-all"
                  ></div>
                  <div
                    style={{ height: `${outHeightPct}%` }}
                    className="w-full max-w-[20px] bg-rose-500 hover:bg-rose-600 rounded-t-sm transition-all"
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

      {/* Two Breakdown Columns: Inflows vs Outflows */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Money In Streams */}
        <div className="bg-white rounded-xl border border-gray-200/90 p-5 shadow-xs space-y-4" id="money-in-streams-card">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <ArrowDownRight className="w-4 h-4 text-emerald-600" />
              <span>Inflow Sources (Money In)</span>
            </h4>
            <span className="text-xs font-bold text-emerald-700">
              ₦{summary.moneyIn.toLocaleString()}
            </span>
          </div>

          <div className="space-y-3 pt-1">
            {moneyInBreakdown.map((m, idx) => (
              <div key={idx} className="space-y-1 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-gray-800">{m.source}</span>
                  <span className="font-bold text-gray-900">
                    ₦{m.amount.toLocaleString()} ({m.percentage}%)
                  </span>
                </div>
                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full"
                    style={{ width: `${m.percentage}%` }}
                  ></div>
                </div>
                <p className="text-[10px] text-gray-400 text-right">{m.count} payments collected</p>
              </div>
            ))}
          </div>
        </div>

        {/* Money Out Streams */}
        <div className="bg-white rounded-xl border border-gray-200/90 p-5 shadow-xs space-y-4" id="money-out-streams-card">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <ArrowUpRight className="w-4 h-4 text-rose-600" />
              <span>Outflow Categories (Money Out)</span>
            </h4>
            <span className="text-xs font-bold text-rose-700">
              ₦{summary.moneyOut.toLocaleString()}
            </span>
          </div>

          <div className="space-y-3 pt-1">
            {moneyOutBreakdown.map((m, idx) => (
              <div key={idx} className="space-y-1 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-gray-800">{m.category}</span>
                  <span className="font-bold text-gray-900">
                    ₦{m.amount.toLocaleString()} ({m.percentage}%)
                  </span>
                </div>
                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-rose-500 rounded-full"
                    style={{ width: `${m.percentage}%` }}
                  ></div>
                </div>
                <p className="text-[10px] text-gray-400 text-right">{m.count} disbursements</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Export Action */}
      <div className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-xl p-4">
        <div className="flex items-center gap-2 text-xs text-gray-600">
          <AlertCircle className="w-4 h-4 text-gray-500" />
          <span>Financial movement reflects absolute cash inflow vs outflow across all accounts.</span>
        </div>

        <button
          type="button"
          onClick={handleExportPDF}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-lg hover:bg-rose-100 transition-colors"
          title="Export cash flow statement to PDF"
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Export Cash Flow Report (PDF)</span>
        </button>
      </div>
    </div>
  );
};
