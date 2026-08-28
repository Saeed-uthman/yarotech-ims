import React from 'react';
import {
  ShoppingBag,
  Building2,
  Package,
  FileText,
  TrendingUp,
} from 'lucide-react';
import { StockPurchaseReportData, UserRole } from '../../types';
import { exportToPDF } from './exportUtils';

interface StockPurchaseReportViewProps {
  purchaseReport: StockPurchaseReportData | null;
  isLoading: boolean;
  role: UserRole;
}

export const StockPurchaseReportView: React.FC<StockPurchaseReportViewProps> = ({
  purchaseReport,
  isLoading,
}) => {
  if (isLoading || !purchaseReport) {
    return (
      <div className="space-y-6 animate-pulse" id="purchase-report-loading">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-gray-200 rounded-xl"></div>
          ))}
        </div>
        <div className="h-72 bg-gray-200 rounded-xl"></div>
      </div>
    );
  }

  const { summary, trends, purchasesByCompany, topPurchasedProducts } = purchaseReport;
  const maxTrend = Math.max(...trends.map((t) => t.amount), 1000);

  const handleExportPDF = () => {
    const headers = ['Manufacturer / Company', 'Purchases Count', 'Units Acquired', 'Total Spend (₦)', '% of Spend'];
    const rows = purchasesByCompany.map((c) => [
      c.companyName,
      c.purchasesCount,
      c.unitsPurchased,
      c.totalAmount,
      `${c.percentage}%`,
    ]);
    exportToPDF('stock-purchases-by-manufacturer', headers, rows, {
      title: 'Procurement & Stock Purchases by Manufacturer Report',
      subtitle: `Total Spend: NGN ${summary.totalSpent.toLocaleString()} | Units: ${summary.totalUnitsPurchased.toLocaleString()}`,
    });
  };

  return (
    <div className="space-y-6" id="stock-purchase-report-view">
      {/* 4 Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" id="purchase-kpi-summary">
        <div className="bg-white rounded-xl border border-gray-200/90 p-4 shadow-xs">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Procurement Spend</span>
          <p className="text-xl font-bold text-gray-900 mt-1">
            ₦{summary.totalSpent.toLocaleString()}
          </p>
          <p className="text-xs text-gray-500 mt-1">Acquisition disbursements</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200/90 p-4 shadow-xs">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Units Acquired</span>
          <p className="text-xl font-bold text-amber-600 mt-1">
            {summary.totalUnitsPurchased.toLocaleString()} units
          </p>
          <p className="text-xs text-gray-500 mt-1">Added into stock</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200/90 p-4 shadow-xs">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Purchase Records</span>
          <p className="text-xl font-bold text-gray-900 mt-1">
            {summary.totalPurchasesCount} orders
          </p>
          <p className="text-xs text-gray-500 mt-1">Completed stock restocks</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200/90 p-4 shadow-xs">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Average Order Size</span>
          <p className="text-xl font-bold text-gray-900 mt-1">
            ₦{summary.averagePurchaseValue.toLocaleString()}
          </p>
          <p className="text-xs text-gray-500 mt-1">Per restock purchase</p>
        </div>
      </div>

      {/* Middle Section: Purchases by Manufacturer + Procurement Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Manufacturer Spend Distribution */}
        <div className="bg-white rounded-xl border border-gray-200/90 p-5 shadow-xs space-y-4" id="purchase-manufacturer-card">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-amber-600" />
              <span>Spend by Manufacturer</span>
            </h4>
            <span className="text-xs text-gray-400">{purchasesByCompany.length} sources</span>
          </div>

          <div className="space-y-3 pt-1">
            {purchasesByCompany.map((comp, idx) => (
              <div key={idx} className="space-y-1 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-gray-800">{comp.companyName}</span>
                  <span className="font-bold text-gray-900">
                    ₦{comp.totalAmount.toLocaleString()} ({comp.percentage}%)
                  </span>
                </div>
                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-500 rounded-full"
                    style={{ width: `${comp.percentage}%` }}
                  ></div>
                </div>
                <div className="flex items-center justify-between text-[10px] text-gray-400">
                  <span>{comp.purchasesCount} restock events</span>
                  <span>{comp.unitsPurchased.toLocaleString()} units</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Procurement Timeline */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200/90 p-5 shadow-xs space-y-3" id="purchase-timeline-card">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-amber-600" />
                <span>Restock Purchase Timeline</span>
              </h4>
              <p className="text-xs text-gray-500">Restock procurement volume over time</p>
            </div>
            <span className="text-xs font-semibold text-gray-500">
              Peak: ₦{maxTrend.toLocaleString()}
            </span>
          </div>

          {trends.length === 0 ? (
            <div className="h-44 flex items-center justify-center text-xs text-gray-400">
              No stock purchases in the selected date range.
            </div>
          ) : (
            <div className="h-44 flex items-end gap-2 pt-4 pb-2 border-b border-gray-100">
              {trends.map((t, idx) => {
                const heightPct = Math.max(8, Math.round((t.amount / maxTrend) * 100));
                return (
                  <div
                    key={idx}
                    className="flex-1 flex flex-col items-center justify-end h-full group relative"
                  >
                    <div className="absolute -top-10 hidden group-hover:flex flex-col items-center z-10 bg-gray-900 text-white text-[10px] py-1 px-2 rounded shadow-lg whitespace-nowrap pointer-events-none">
                      <span className="font-bold">{t.label}</span>
                      <span>₦{t.amount.toLocaleString()} ({t.units} units)</span>
                    </div>

                    <div
                      style={{ height: `${heightPct}%` }}
                      className="w-full bg-amber-500 hover:bg-amber-600 rounded-t-sm transition-all"
                    ></div>
                    <span className="text-[9px] text-gray-400 mt-1 truncate max-w-[32px]">
                      {t.label.split(' ')[0]}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Top Purchased Products Table */}
      <div className="bg-white rounded-xl border border-gray-200/90 shadow-xs overflow-hidden" id="top-purchased-products-table">
        <div className="p-4 border-b border-gray-200/80 flex items-center justify-between gap-3">
          <div>
            <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <Package className="w-4 h-4 text-amber-600" />
              <span>Purchased Medicines Audit</span>
            </h4>
            <p className="text-xs text-gray-500">Products procured from manufacturers in this reporting period</p>
          </div>

          <button
            type="button"
            onClick={handleExportPDF}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-lg hover:bg-rose-100 transition-colors"
            title="Export procurement report to PDF"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Export PDF</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-gray-50/75 border-b border-gray-200 text-gray-500 uppercase font-semibold text-[11px]">
                <th className="py-3 px-4">Medicine & Manufacturer</th>
                <th className="py-3 px-4 text-right">Units Acquired</th>
                <th className="py-3 px-4 text-right">Unit Purchase Price</th>
                <th className="py-3 px-4 text-right">Total Spent</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-700">
              {topPurchasedProducts.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-gray-400">
                    No medicine restock purchases found for this period.
                  </td>
                </tr>
              ) : (
                topPurchasedProducts.map((p, idx) => (
                  <tr key={idx} className="hover:bg-gray-50/50">
                    <td className="py-3 px-4">
                      <p className="font-semibold text-gray-900">{p.productName}</p>
                      <p className="text-[11px] text-gray-500">
                        {p.companyName} {p.genericName ? `• ${p.genericName}` : ''}
                      </p>
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-amber-700">
                      {p.unitsPurchased.toLocaleString()} units
                    </td>
                    <td className="py-3 px-4 text-right text-gray-600">
                      ₦{p.unitCost.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-gray-900">
                      ₦{p.totalSpent.toLocaleString()}
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
