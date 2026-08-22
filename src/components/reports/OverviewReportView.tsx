import React from 'react';
import {
  TrendingUp,
  ArrowDownRight,
  ArrowUpRight,
  Package,
  Layers,
  FileText,
  Building2,
  AlertCircle,
} from 'lucide-react';
import {
  FinancialSummaryReport,
  SalesReportData,
  FinancialMovementReportData,
  ProductPerformanceReportData,
  DebtMovementReportData,
  UserRole,
} from '../../types';
import { exportToPDF } from './exportUtils';

interface OverviewReportViewProps {
  summary: FinancialSummaryReport | null;
  salesReport: SalesReportData | null;
  financialMovement: FinancialMovementReportData | null;
  productPerformance: ProductPerformanceReportData | null;
  debtReport: DebtMovementReportData | null;
  isLoading: boolean;
  role: UserRole;
  onNavigateTab: (tabId: string) => void;
}

export const OverviewReportView: React.FC<OverviewReportViewProps> = ({
  summary,
  salesReport,
  financialMovement,
  productPerformance,
  debtReport,
  isLoading,
  role,
  onNavigateTab,
}) => {
  const isAdmin = role === 'admin';

  if (isLoading || !summary) {
    return (
      <div className="space-y-6 animate-pulse" id="overview-loading">
        <div className="h-64 bg-gray-200 rounded-xl"></div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-48 bg-gray-200 rounded-xl"></div>
          <div className="h-48 bg-gray-200 rounded-xl"></div>
        </div>
      </div>
    );
  }

  const trends = salesReport?.trends || [];
  const maxSales = Math.max(...trends.map((t) => t.sales), 1000);
  const fastMovingProducts = productPerformance?.items.slice(0, 5) || [];
  const categories = salesReport?.salesByCategory.slice(0, 4) || [];

  const handleExportOverview = () => {
    const headers = ['Metric', 'Value', 'Notes'];
    const rows = [
      ['Date Period', summary.timeframe, `${summary.startDate} to ${summary.endDate}`],
      ['Total Sales', `₦${summary.totalSales.toLocaleString()}`, `${summary.totalTransactions} transactions`],
      ['Total Units Sold', summary.totalUnitsSold.toLocaleString(), 'units'],
      ['Average Sale Value', `₦${summary.averageSaleValue.toLocaleString()}`, 'per transaction'],
      ['Stock Purchases Spend', `₦${summary.totalStockPurchases.toLocaleString()}`, `${summary.totalUnitsPurchased} units acquired`],
      ['Money In (Receipts)', `₦${summary.moneyIn.toLocaleString()}`, 'Sales + Debt collections'],
      ['Money Out (Disbursements)', `₦${summary.moneyOut.toLocaleString()}`, 'Purchases + Operating costs'],
      ['Net Cash Movement', `₦${summary.netMoneyMovement.toLocaleString()}`, 'Money In minus Money Out (Cash Flow)'],
      ['Total Outstanding Debt', `₦${summary.outstandingDebt.toLocaleString()}`, 'Active customer credit balance'],
    ];

    if (isAdmin) {
      rows.splice(2, 0, [
        'Total Gross Profit',
        `₦${summary.totalProfit.toLocaleString()}`,
        `${summary.profitMarginPercentage}% Gross Margin (Snapshot Cost)`,
      ]);
    }

    exportToPDF(`financial-overview-${summary.timeframe}`, headers, rows, {
      title: 'Financial & Movement Executive Summary',
      subtitle: `Period: ${summary.startDate} to ${summary.endDate} (${summary.timeframe.replace('_', ' ')})`,
    });
  };

  return (
    <div className="space-y-6" id="overview-report-view">
      {/* Top Header & Quick Export */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-xl border border-gray-200/90 shadow-xs">
        <div>
          <h3 className="text-base font-bold text-gray-900">
            Financial & Movement Executive Overview
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Reporting Period: <span className="font-semibold text-gray-700">{summary.startDate}</span> to{' '}
            <span className="font-semibold text-gray-700">{summary.endDate}</span> ({summary.timeframe.replace('_', ' ')})
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportOverview}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-lg hover:bg-rose-100 transition-colors"
            id="btn-export-overview-pdf"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Export Executive Summary (PDF)</span>
          </button>
        </div>
      </div>

      {/* Primary Trend Chart: Sales & Profit Activity */}
      <div className="bg-white rounded-xl border border-gray-200/90 p-5 shadow-xs" id="overview-trend-chart-card">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <div>
            <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              <span>Sales & Daily Revenue Trajectory</span>
            </h4>
            <p className="text-xs text-gray-500">Chronological daily sales volume across the selected timeframe</p>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-emerald-500"></span>
              <span className="text-gray-600 font-medium">Daily Sales (₦)</span>
            </div>
            {isAdmin && (
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-indigo-500"></span>
                <span className="text-gray-600 font-medium">Daily Profit (₦)</span>
              </div>
            )}
          </div>
        </div>

        {/* SVG Bar / Area Chart */}
        {trends.length === 0 ? (
          <div className="h-48 flex items-center justify-center text-xs text-gray-400">
            No sales data recorded in the selected period.
          </div>
        ) : (
          <div className="space-y-2">
            <div className="h-48 flex items-end gap-1.5 sm:gap-3 pt-6 pb-2 px-2 border-b border-gray-100">
              {trends.map((t, idx) => {
                const salesHeightPct = Math.max(8, Math.round((t.sales / maxSales) * 100));
                const profitHeightPct = isAdmin
                  ? Math.max(4, Math.round((t.profit / maxSales) * 100))
                  : 0;

                return (
                  <div
                    key={idx}
                    className="flex-1 flex flex-col items-center justify-end h-full group relative"
                  >
                    {/* Tooltip */}
                    <div className="absolute -top-14 hidden group-hover:flex flex-col items-center z-10 bg-gray-900 text-white text-[10px] py-1 px-2 rounded shadow-lg whitespace-nowrap pointer-events-none">
                      <span className="font-bold">{t.label}</span>
                      <span>Sales: ₦{t.sales.toLocaleString()}</span>
                      {isAdmin && <span>Profit: ₦{t.profit.toLocaleString()}</span>}
                    </div>

                    <div className="w-full flex items-end justify-center gap-0.5 sm:gap-1 h-full">
                      {/* Sales Bar */}
                      <div
                        style={{ height: `${salesHeightPct}%` }}
                        className="w-full max-w-[28px] bg-emerald-500/85 hover:bg-emerald-600 rounded-t-sm transition-all"
                      ></div>
                      {/* Profit Bar (Admin only) */}
                      {isAdmin && (
                        <div
                          style={{ height: `${profitHeightPct}%` }}
                          className="w-full max-w-[28px] bg-indigo-500/85 hover:bg-indigo-600 rounded-t-sm transition-all"
                        ></div>
                      )}
                    </div>

                    <span className="text-[9px] sm:text-[10px] text-gray-400 mt-1 truncate max-w-[36px]">
                      {t.label.split(' ')[0]}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center justify-between text-[11px] text-gray-400 px-1">
              <span>Peak: ₦{maxSales.toLocaleString()}</span>
              <span>Daily breakdown</span>
            </div>
          </div>
        )}
      </div>

      {/* Mid Section: 2 Columns (Money Movement Breakdown + Fast Moving Products) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Money In vs Money Out Card */}
        <div className="bg-white rounded-xl border border-gray-200/90 p-5 shadow-xs space-y-4" id="overview-cashflow-card">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <ArrowDownRight className="w-4 h-4 text-emerald-600" />
              <span>Cash Flow Movement Breakdown</span>
            </h4>
            <button
              type="button"
              onClick={() => onNavigateTab('financial-movement')}
              className="text-xs font-semibold text-emerald-700 hover:text-emerald-800"
            >
              View Details →
            </button>
          </div>

          <div className="space-y-3">
            {/* Money In Bar */}
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-medium text-gray-700 flex items-center gap-1">
                  <ArrowDownRight className="w-3.5 h-3.5 text-emerald-600" /> Money In (Inflow)
                </span>
                <span className="font-bold text-emerald-700">
                  ₦{summary.moneyIn.toLocaleString()}
                </span>
              </div>
              <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full w-full"></div>
              </div>
              <p className="text-[11px] text-gray-500 mt-0.5">
                Sales counter payments: ₦{(financialMovement?.summary.salesIncome || 0).toLocaleString()} • Debt repayments: ₦{(financialMovement?.summary.debtPaymentsIncome || 0).toLocaleString()}
              </p>
            </div>

            {/* Money Out Bar */}
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-medium text-gray-700 flex items-center gap-1">
                  <ArrowUpRight className="w-3.5 h-3.5 text-rose-600" /> Money Out (Outflow)
                </span>
                <span className="font-bold text-rose-700">
                  ₦{summary.moneyOut.toLocaleString()}
                </span>
              </div>
              <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-rose-500 rounded-full"
                  style={{
                    width: `${
                      summary.moneyIn > 0
                        ? Math.min(100, (summary.moneyOut / summary.moneyIn) * 100)
                        : 100
                    }%`,
                  }}
                ></div>
              </div>
              <p className="text-[11px] text-gray-500 mt-0.5">
                Stock purchases: ₦{(financialMovement?.summary.purchasesExpense || 0).toLocaleString()} • Operating expenses: ₦{(financialMovement?.summary.operatingExpenses || 0).toLocaleString()}
              </p>
            </div>

            {/* Net Movement Alert */}
            <div
              className={`p-3 rounded-lg border text-xs flex items-start gap-2.5 mt-3 ${
                summary.netMoneyMovement >= 0
                  ? 'bg-emerald-50/70 border-emerald-200 text-emerald-800'
                  : 'bg-rose-50/70 border-rose-200 text-rose-800'
              }`}
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">
                  Net Movement: {summary.netMoneyMovement >= 0 ? '+' : ''}₦
                  {summary.netMoneyMovement.toLocaleString()}
                </span>
                <p className="text-[11px] mt-0.5 opacity-90">
                  {summary.netMoneyMovement >= 0
                    ? 'Inflows exceed disbursements for this operating cycle.'
                    : 'Disbursements exceed cash inflows during this reporting window.'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Fast Moving Medicines Card */}
        <div className="bg-white rounded-xl border border-gray-200/90 p-5 shadow-xs space-y-4" id="overview-fast-moving-card">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <Package className="w-4 h-4 text-emerald-600" />
              <span>Top Fast-Moving Medicines</span>
            </h4>
            <button
              type="button"
              onClick={() => onNavigateTab('product-performance')}
              className="text-xs font-semibold text-emerald-700 hover:text-emerald-800"
            >
              All Products →
            </button>
          </div>

          <div className="divide-y divide-gray-100">
            {fastMovingProducts.length === 0 ? (
              <p className="text-xs text-gray-400 py-4 text-center">
                No product movements recorded in this period.
              </p>
            ) : (
              fastMovingProducts.map((p, idx) => (
                <div key={idx} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 truncate">
                      {p.productName} {p.dosage ? `(${p.dosage})` : ''}
                    </p>
                    <p className="text-[11px] text-gray-500 flex items-center gap-1 mt-0.5">
                      <Building2 className="w-3 h-3 text-gray-400" />
                      <span>{p.companyName}</span>
                      <span>•</span>
                      <span>{p.categoryName}</span>
                    </p>
                  </div>

                  <div className="text-right shrink-0">
                    <p className="font-bold text-gray-900">
                      {p.unitsSold} units sold
                    </p>
                    <p className="text-[11px] text-emerald-700 font-medium">
                      ₦{p.revenue.toLocaleString()}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Bottom Section: Category Revenue & Customer Debt Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Contribution */}
        <div className="bg-white rounded-xl border border-gray-200/90 p-5 shadow-xs space-y-3" id="overview-category-card">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-600" />
              <span>Category Revenue Contribution</span>
            </h4>
            <button
              type="button"
              onClick={() => onNavigateTab('sales')}
              className="text-xs font-semibold text-emerald-700 hover:text-emerald-800"
            >
              Sales Report →
            </button>
          </div>

          <div className="space-y-2.5">
            {categories.map((c, i) => {
              const pct = summary.totalSales > 0 ? Math.round((c.revenue / summary.totalSales) * 100) : 0;
              return (
                <div key={i} className="text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-gray-700">{c.categoryName}</span>
                    <span className="font-semibold text-gray-900">
                      ₦{c.revenue.toLocaleString()} ({pct}%)
                    </span>
                  </div>
                  <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full"
                      style={{ width: `${pct}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Customer Debt Position */}
        <div className="bg-white rounded-xl border border-gray-200/90 p-5 shadow-xs space-y-3" id="overview-debt-card">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-gray-900">Active Debt Portfolio</h4>
            <button
              type="button"
              onClick={() => onNavigateTab('debt')}
              className="text-xs font-semibold text-emerald-700 hover:text-emerald-800"
            >
              Debt Movement Report →
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-lg">
              <span className="text-[11px] font-semibold text-amber-800 uppercase">Outstanding Debt</span>
              <p className="text-base font-bold text-amber-900 mt-1">
                ₦{summary.outstandingDebt.toLocaleString()}
              </p>
              <p className="text-[10px] text-amber-700 mt-0.5">
                {debtReport?.summary.activeDebtorsCount || 0} active debtors
              </p>
            </div>

            <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-lg">
              <span className="text-[11px] font-semibold text-emerald-800 uppercase">Recovered in Period</span>
              <p className="text-base font-bold text-emerald-900 mt-1">
                ₦{(debtReport?.summary.debtPaymentsInPeriod || 0).toLocaleString()}
              </p>
              <p className="text-[10px] text-emerald-700 mt-0.5">
                Debt payments collected
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
