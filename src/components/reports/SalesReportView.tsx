import React, { useState } from 'react';
import {
  TrendingUp,
  FileText,
  Layers,
  Building2,
  CreditCard,
  Search,
} from 'lucide-react';
import { SalesReportData, UserRole } from '../../types';
import { exportToPDF } from './exportUtils';

interface SalesReportViewProps {
  salesReport: SalesReportData | null;
  isLoading: boolean;
  role: UserRole;
}

export const SalesReportView: React.FC<SalesReportViewProps> = ({
  salesReport,
  isLoading,
  role,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'categories' | 'companies'>('categories');
  const [searchFilter, setSearchFilter] = useState('');
  const isAdmin = role === 'admin';

  if (isLoading || !salesReport) {
    return (
      <div className="space-y-6 animate-pulse" id="sales-report-loading">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-gray-200 rounded-xl"></div>
          ))}
        </div>
        <div className="h-72 bg-gray-200 rounded-xl"></div>
      </div>
    );
  }

  const { summary, trends, salesByPaymentMethod, salesByCategory, salesByCompany } = salesReport;
  const maxDailySale = Math.max(...trends.map((t) => t.sales), 1000);

  const filteredCategories = salesByCategory.filter((c) =>
    c.categoryName.toLowerCase().includes(searchFilter.toLowerCase())
  );

  const filteredCompanies = salesByCompany.filter((c) =>
    c.companyName.toLowerCase().includes(searchFilter.toLowerCase())
  );

  const handleExportSalesPDF = () => {
    if (activeSubTab === 'categories') {
      const headers = ['Category', 'Units Sold', 'Total Revenue (₦)', ...(isAdmin ? ['Gross Profit (₦)'] : [])];
      const rows = salesByCategory.map((c) => [
        c.categoryName,
        c.unitsSold,
        c.revenue,
        ...(isAdmin ? [c.profit] : []),
      ]);
      exportToPDF('sales-by-category-report', headers, rows, {
        title: 'Sales & Revenue Contribution by Category',
        subtitle: `Total Categories: ${salesByCategory.length} | Revenue: NGN ${summary.totalSales.toLocaleString()}`,
      });
    } else {
      const headers = ['Manufacturer / Company', 'Units Sold', 'Total Revenue (₦)', ...(isAdmin ? ['Gross Profit (₦)'] : [])];
      const rows = salesByCompany.map((c) => [
        c.companyName,
        c.unitsSold,
        c.revenue,
        ...(isAdmin ? [c.profit] : []),
      ]);
      exportToPDF('sales-by-company-report', headers, rows, {
        title: 'Sales & Revenue Contribution by Manufacturer',
        subtitle: `Total Manufacturers: ${salesByCompany.length} | Revenue: NGN ${summary.totalSales.toLocaleString()}`,
      });
    }
  };

  return (
    <div className="space-y-6" id="sales-report-view">
      {/* 4 Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" id="sales-kpi-summary">
        <div className="bg-white rounded-xl border border-gray-200/90 p-4 shadow-xs">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Gross Sales Revenue</span>
          <p className="text-xl font-bold text-gray-900 mt-1">
            ₦{summary.totalSales.toLocaleString()}
          </p>
          <p className="text-xs text-gray-500 mt-1">{summary.transactionsCount} completed sales</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200/90 p-4 shadow-xs">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Units Sold</span>
          <p className="text-xl font-bold text-gray-900 mt-1">
            {summary.totalItemsSold.toLocaleString()} units
          </p>
          <p className="text-xs text-gray-500 mt-1">Across all products</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200/90 p-4 shadow-xs">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Average Sale Value</span>
          <p className="text-xl font-bold text-gray-900 mt-1">
            ₦{summary.averageSaleValue.toLocaleString()}
          </p>
          <p className="text-xs text-gray-500 mt-1">Per customer transaction</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200/90 p-4 shadow-xs">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            {isAdmin ? 'Gross Profit (Snapshot)' : 'Profit Margins'}
          </span>
          <p className="text-xl font-bold text-indigo-600 mt-1">
            {isAdmin ? `₦${summary.totalProfit.toLocaleString()}` : 'Admin Protected'}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {isAdmin ? `${summary.profitMarginPercentage}% overall margin` : 'Viewable by admins'}
          </p>
        </div>
      </div>

      {/* Payment Methods Breakdown + Daily Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Payment Methods */}
        <div className="bg-white rounded-xl border border-gray-200/90 p-5 shadow-xs space-y-4" id="sales-payment-methods-card">
          <div>
            <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-emerald-600" />
              <span>Sales by Payment Method</span>
            </h4>
            <p className="text-xs text-gray-500">Distribution across settlement channels</p>
          </div>

          <div className="space-y-3.5 pt-1">
            {salesByPaymentMethod.map((pm, idx) => (
              <div key={idx} className="space-y-1 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-gray-700">{pm.method}</span>
                  <span className="font-bold text-gray-900">
                    ₦{pm.amount.toLocaleString()} ({pm.percentage}%)
                  </span>
                </div>
                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      pm.method === 'CASH'
                        ? 'bg-emerald-500'
                        : pm.method === 'TRANSFER'
                        ? 'bg-blue-500'
                        : pm.method === 'POS'
                        ? 'bg-purple-500'
                        : 'bg-amber-500'
                    }`}
                    style={{ width: `${pm.percentage}%` }}
                  ></div>
                </div>
                <p className="text-[10px] text-gray-400 text-right">{pm.count} transactions</p>
              </div>
            ))}
          </div>
        </div>

        {/* Daily Sales Trajectory */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200/90 p-5 shadow-xs space-y-3" id="sales-timeline-card">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
                <span>Daily Sales Timeline</span>
              </h4>
              <p className="text-xs text-gray-500">Daily revenue and transaction counts</p>
            </div>
            <span className="text-xs font-semibold text-gray-500">
              Peak: ₦{maxDailySale.toLocaleString()}
            </span>
          </div>

          <div className="h-44 flex items-end gap-1.5 sm:gap-2 pt-4 pb-2 border-b border-gray-100">
            {trends.map((t, idx) => {
              const heightPct = Math.max(6, Math.round((t.sales / maxDailySale) * 100));
              return (
                <div
                  key={idx}
                  className="flex-1 flex flex-col items-center justify-end h-full group relative"
                >
                  <div className="absolute -top-12 hidden group-hover:flex flex-col items-center z-10 bg-gray-900 text-white text-[10px] py-1 px-2 rounded shadow-lg whitespace-nowrap pointer-events-none">
                    <span className="font-bold">{t.label}</span>
                    <span>₦{t.sales.toLocaleString()} ({t.transactionsCount} txns)</span>
                  </div>

                  <div
                    style={{ height: `${heightPct}%` }}
                    className="w-full bg-emerald-500 hover:bg-emerald-600 rounded-t-sm transition-all"
                  ></div>
                  <span className="text-[9px] text-gray-400 mt-1 truncate max-w-[32px]">
                    {t.label.split(' ')[0]}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Dimensional Breakdown Table: By Category or Manufacturer */}
      <div className="bg-white rounded-xl border border-gray-200/90 shadow-xs overflow-hidden" id="sales-dimensions-table">
        {/* Table Controls */}
        <div className="p-4 border-b border-gray-200/80 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveSubTab('categories')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                activeSubTab === 'categories'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-300'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Sales by Category ({salesByCategory.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSubTab('companies')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                activeSubTab === 'companies'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-300'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Sales by Manufacturer ({salesByCompany.length})</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search dimension..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="pl-8 pr-3 py-1 text-xs border border-gray-300 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>

            <button
              type="button"
              onClick={handleExportSalesPDF}
              className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-lg hover:bg-rose-100 transition-colors"
              title="Export sales breakdown to PDF"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Export PDF</span>
            </button>
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-gray-50/75 border-b border-gray-200 text-gray-500 uppercase font-semibold text-[11px]">
                <th className="py-3 px-4">
                  {activeSubTab === 'categories' ? 'Category Name' : 'Manufacturer / Company'}
                </th>
                <th className="py-3 px-4 text-right">Units Sold</th>
                <th className="py-3 px-4 text-right">Total Revenue</th>
                {isAdmin && <th className="py-3 px-4 text-right">Gross Profit</th>}
                {isAdmin && <th className="py-3 px-4 text-right">Margin %</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-700">
              {activeSubTab === 'categories' ? (
                filteredCategories.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-gray-400">
                      No matching category sales found.
                    </td>
                  </tr>
                ) : (
                  filteredCategories.map((c) => {
                    const margin = c.revenue > 0 ? Math.round((c.profit / c.revenue) * 1000) / 10 : 0;
                    return (
                      <tr key={c.categoryId} className="hover:bg-gray-50/50">
                        <td className="py-3 px-4 font-semibold text-gray-900">{c.categoryName}</td>
                        <td className="py-3 px-4 text-right">{c.unitsSold.toLocaleString()} units</td>
                        <td className="py-3 px-4 text-right font-bold text-gray-900">
                          ₦{c.revenue.toLocaleString()}
                        </td>
                        {isAdmin && (
                          <td className="py-3 px-4 text-right font-semibold text-indigo-600">
                            ₦{c.profit.toLocaleString()}
                          </td>
                        )}
                        {isAdmin && (
                          <td className="py-3 px-4 text-right font-medium text-emerald-600">
                            {margin}%
                          </td>
                        )}
                      </tr>
                    );
                  })
                )
              ) : (
                filteredCompanies.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-gray-400">
                      No matching manufacturer sales found.
                    </td>
                  </tr>
                ) : (
                  filteredCompanies.map((comp) => {
                    const margin = comp.revenue > 0 ? Math.round((comp.profit / comp.revenue) * 1000) / 10 : 0;
                    return (
                      <tr key={comp.companyId} className="hover:bg-gray-50/50">
                        <td className="py-3 px-4 font-semibold text-gray-900">{comp.companyName}</td>
                        <td className="py-3 px-4 text-right">{comp.unitsSold.toLocaleString()} units</td>
                        <td className="py-3 px-4 text-right font-bold text-gray-900">
                          ₦{comp.revenue.toLocaleString()}
                        </td>
                        {isAdmin && (
                          <td className="py-3 px-4 text-right font-semibold text-indigo-600">
                            ₦{comp.profit.toLocaleString()}
                          </td>
                        )}
                        {isAdmin && (
                          <td className="py-3 px-4 text-right font-medium text-emerald-600">
                            {margin}%
                          </td>
                        )}
                      </tr>
                    );
                  })
                )
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
