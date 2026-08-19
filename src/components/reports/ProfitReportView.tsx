import React, { useState } from 'react';
import {
  DollarSign,
  Lock,
  FileSpreadsheet,
  TrendingUp,
  Award,
  Layers,
  Building2,
  Search,
} from 'lucide-react';
import { ProfitReportData, UserRole } from '../../types';
import { exportToCSV } from './exportUtils';

interface ProfitReportViewProps {
  profitReport: ProfitReportData | null;
  isLoading: boolean;
  role: UserRole;
}

export const ProfitReportView: React.FC<ProfitReportViewProps> = ({
  profitReport,
  isLoading,
  role,
}) => {
  const [activeTab, setActiveTab] = useState<'products' | 'categories' | 'companies'>('products');
  const [search, setSearch] = useState('');
  const isAdmin = role === 'admin';

  if (!isAdmin) {
    return (
      <div className="bg-white rounded-xl border border-gray-200/90 p-12 text-center max-w-xl mx-auto space-y-4 shadow-xs" id="profit-report-restricted">
        <div className="w-14 h-14 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto border border-amber-200">
          <Lock className="w-7 h-7" />
        </div>
        <div>
          <h3 className="text-base font-bold text-gray-900">
            Profit Reports Restricted to Administrators
          </h3>
          <p className="text-xs text-gray-500 mt-1 max-w-md mx-auto">
            Base procurement prices, profit calculations, and gross margin analytics are confidential business metrics reserved for administrator accounts.
          </p>
        </div>
        <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 text-xs text-gray-600">
          Current Role: <span className="font-semibold text-gray-900 uppercase">Cashier</span> (Base prices & profit margins are redacted system-wide)
        </div>
      </div>
    );
  }

  if (isLoading || !profitReport) {
    return (
      <div className="space-y-6 animate-pulse" id="profit-report-loading">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-gray-200 rounded-xl"></div>
          ))}
        </div>
        <div className="h-72 bg-gray-200 rounded-xl"></div>
      </div>
    );
  }

  const { summary, trends, topProfitableProducts, profitByCategory, profitByCompany } = profitReport;
  const maxDailyProfit = Math.max(...trends.map((t) => t.profit), 500);

  const filteredProducts = topProfitableProducts.filter(
    (p) =>
      p.productName.toLowerCase().includes(search.toLowerCase()) ||
      p.genericName.toLowerCase().includes(search.toLowerCase()) ||
      p.companyName.toLowerCase().includes(search.toLowerCase())
  );

  const handleExportCSV = () => {
    if (activeTab === 'products') {
      const headers = ['Medicine Name', 'Generic Name', 'Manufacturer', 'Units Sold', 'Revenue (₦)', 'Base Cost (₦)', 'Gross Profit (₦)', 'Margin %'];
      const rows = topProfitableProducts.map((p) => [
        p.productName,
        p.genericName,
        p.companyName,
        p.unitsSold,
        p.revenue,
        p.cost,
        p.profit,
        p.marginPct,
      ]);
      exportToCSV('profit-by-product-report', headers, rows);
    } else if (activeTab === 'categories') {
      const headers = ['Category', 'Revenue (₦)', 'Base Cost (₦)', 'Gross Profit (₦)', 'Margin %'];
      const rows = profitByCategory.map((c) => [c.categoryName, c.revenue, c.cost, c.profit, c.marginPct]);
      exportToCSV('profit-by-category-report', headers, rows);
    } else {
      const headers = ['Manufacturer / Company', 'Revenue (₦)', 'Base Cost (₦)', 'Gross Profit (₦)', 'Margin %'];
      const rows = profitByCompany.map((c) => [c.companyName, c.revenue, c.cost, c.profit, c.marginPct]);
      exportToCSV('profit-by-company-report', headers, rows);
    }
  };

  return (
    <div className="space-y-6" id="profit-report-view">
      {/* 4 Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" id="profit-kpi-summary">
        <div className="bg-white rounded-xl border border-gray-200/90 p-4 shadow-xs">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Gross Profit</span>
          <p className="text-2xl font-bold text-indigo-600 mt-1">
            ₦{summary.grossProfit.toLocaleString()}
          </p>
          <p className="text-xs text-gray-500 mt-1">Historical snapshot basis</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200/90 p-4 shadow-xs">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Gross Margin</span>
          <p className="text-2xl font-bold text-emerald-600 mt-1">
            {summary.profitMarginPercentage}%
          </p>
          <p className="text-xs text-gray-500 mt-1">Gross profit ÷ Total revenue</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200/90 p-4 shadow-xs">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Revenue</span>
          <p className="text-xl font-bold text-gray-900 mt-1">
            ₦{summary.totalRevenue.toLocaleString()}
          </p>
          <p className="text-xs text-gray-500 mt-1">{summary.totalSoldUnits} units sold</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200/90 p-4 shadow-xs">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Base Stock Cost</span>
          <p className="text-xl font-bold text-rose-600 mt-1">
            ₦{summary.totalCost.toLocaleString()}
          </p>
          <p className="text-xs text-gray-500 mt-1">Cost of goods sold (COGS)</p>
        </div>
      </div>

      {/* Daily Profit Trend */}
      <div className="bg-white rounded-xl border border-gray-200/90 p-5 shadow-xs space-y-3" id="profit-timeline-card">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-indigo-600" />
              <span>Daily Gross Profit Generation</span>
            </h4>
            <p className="text-xs text-gray-500">Calculated from snapshot selling price minus base cost at sale</p>
          </div>
          <span className="text-xs font-semibold text-gray-500">
            Peak Profit: ₦{maxDailyProfit.toLocaleString()}
          </span>
        </div>

        <div className="h-44 flex items-end gap-1.5 sm:gap-2 pt-4 pb-2 border-b border-gray-100">
          {trends.map((t, idx) => {
            const heightPct = Math.max(6, Math.round((t.profit / maxDailyProfit) * 100));
            return (
              <div
                key={idx}
                className="flex-1 flex flex-col items-center justify-end h-full group relative"
              >
                <div className="absolute -top-10 hidden group-hover:flex flex-col items-center z-10 bg-gray-900 text-white text-[10px] py-1 px-2 rounded shadow-lg whitespace-nowrap pointer-events-none">
                  <span className="font-bold">{t.label}</span>
                  <span>Profit: ₦{t.profit.toLocaleString()}</span>
                </div>

                <div
                  style={{ height: `${heightPct}%` }}
                  className="w-full bg-indigo-500 hover:bg-indigo-600 rounded-t-sm transition-all"
                ></div>
                <span className="text-[9px] text-gray-400 mt-1 truncate max-w-[32px]">
                  {t.label.split(' ')[0]}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Dimensional Breakdown Table */}
      <div className="bg-white rounded-xl border border-gray-200/90 shadow-xs overflow-hidden" id="profit-table-card">
        {/* Table Controls */}
        <div className="p-4 border-b border-gray-200/80 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('products')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                activeTab === 'products'
                  ? 'bg-indigo-50 text-indigo-700 border border-indigo-300'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Award className="w-3.5 h-3.5" />
              <span>Top Profitable Medicines ({topProfitableProducts.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('categories')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                activeTab === 'categories'
                  ? 'bg-indigo-50 text-indigo-700 border border-indigo-300'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>By Category</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('companies')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                activeTab === 'companies'
                  ? 'bg-indigo-50 text-indigo-700 border border-indigo-300'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>By Manufacturer</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {activeTab === 'products' && (
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Filter medicine or company..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 pr-3 py-1 text-xs border border-gray-300 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>
            )}

            <button
              type="button"
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-indigo-700 bg-white border border-indigo-300 rounded-lg hover:bg-indigo-50 transition-colors"
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
                <th className="py-3 px-4">
                  {activeTab === 'products'
                    ? 'Medicine & Manufacturer'
                    : activeTab === 'categories'
                    ? 'Category'
                    : 'Manufacturer'}
                </th>
                {activeTab === 'products' && <th className="py-3 px-4 text-right">Units Sold</th>}
                <th className="py-3 px-4 text-right">Revenue</th>
                <th className="py-3 px-4 text-right">Base Cost (COGS)</th>
                <th className="py-3 px-4 text-right">Gross Profit</th>
                <th className="py-3 px-4 text-right">Margin %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-700">
              {activeTab === 'products' ? (
                filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-gray-400">
                      No matching medicine profit records.
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map((p) => (
                    <tr key={p.productId} className="hover:bg-gray-50/50">
                      <td className="py-3 px-4">
                        <p className="font-semibold text-gray-900">{p.productName}</p>
                        <p className="text-[11px] text-gray-500">
                          {p.companyName} {p.genericName ? `• ${p.genericName}` : ''}
                        </p>
                      </td>
                      <td className="py-3 px-4 text-right">{p.unitsSold} units</td>
                      <td className="py-3 px-4 text-right font-medium text-gray-900">
                        ₦{p.revenue.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right text-rose-600">
                        ₦{p.cost.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-indigo-600">
                        ₦{p.profit.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right font-semibold text-emerald-600">
                        {p.marginPct}%
                      </td>
                    </tr>
                  ))
                )
              ) : activeTab === 'categories' ? (
                profitByCategory.map((c) => (
                  <tr key={c.categoryId} className="hover:bg-gray-50/50">
                    <td className="py-3 px-4 font-semibold text-gray-900">{c.categoryName}</td>
                    <td className="py-3 px-4 text-right font-medium text-gray-900">
                      ₦{c.revenue.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right text-rose-600">
                      ₦{c.cost.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-indigo-600">
                      ₦{c.profit.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-emerald-600">
                      {c.marginPct}%
                    </td>
                  </tr>
                ))
              ) : (
                profitByCompany.map((comp) => (
                  <tr key={comp.companyId} className="hover:bg-gray-50/50">
                    <td className="py-3 px-4 font-semibold text-gray-900">{comp.companyName}</td>
                    <td className="py-3 px-4 text-right font-medium text-gray-900">
                      ₦{comp.revenue.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right text-rose-600">
                      ₦{comp.cost.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-indigo-600">
                      ₦{comp.profit.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-emerald-600">
                      {comp.marginPct}%
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
