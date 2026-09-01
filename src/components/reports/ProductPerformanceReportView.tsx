import React, { useState } from 'react';
import {
  Package,
  Search,
  FileText,
  Zap,
  Clock,
  AlertCircle,
  Building2,
} from 'lucide-react';
import { ProductPerformanceReportData, UserRole } from '../../types';
import { exportToPDF } from './exportUtils';

interface ProductPerformanceReportViewProps {
  performanceData: ProductPerformanceReportData | null;
  isLoading: boolean;
  role: UserRole;
}

export const ProductPerformanceReportView: React.FC<ProductPerformanceReportViewProps> = ({
  performanceData,
  isLoading,
  role,
}) => {
  const [velocityFilter, setVelocityFilter] = useState<'all' | 'fast' | 'moderate' | 'slow' | 'zero'>('all');
  const [search, setSearch] = useState('');
  const isAdmin = role === 'admin';

  if (isLoading || !performanceData) {
    return (
      <div className="space-y-6 animate-pulse" id="product-performance-loading">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-gray-200 rounded-xl"></div>
          ))}
        </div>
        <div className="h-72 bg-gray-200 rounded-xl"></div>
      </div>
    );
  }

  const { items, fastMovingCount, slowMovingCount, zeroMovementCount, totalUnitsSold, totalRevenue, totalProfit } = performanceData;

  const filteredItems = items.filter((it) => {
    if (velocityFilter !== 'all' && it.velocity !== velocityFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchName = it.productName.toLowerCase().includes(q);
      const matchGen = it.genericName.toLowerCase().includes(q);
      const matchComp = it.companyName.toLowerCase().includes(q);
      const matchCat = it.categoryName.toLowerCase().includes(q);
      if (!matchName && !matchGen && !matchComp && !matchCat) return false;
    }
    return true;
  });

  const handleExportPDF = () => {
    const headers = [
      'Product Name',
      'Dosage / Form',
      'Manufacturer',
      'Category',
      'Velocity',
      'Units Sold',
      'Revenue (₦)',
      ...(isAdmin ? ['Cost (₦)', 'Profit (₦)', 'Margin %'] : []),
      'Stock Left',
    ];

    const rows = filteredItems.map((it) => [
      it.productName,
      `${it.dosage || ''} ${it.form || ''}`.trim(),
      it.companyName,
      it.categoryName,
      it.velocity.toUpperCase(),
      it.unitsSold,
      it.revenue,
      ...(isAdmin ? [it.cost, it.profit, `${it.marginPct}%`] : []),
      it.currentStock,
    ]);

    exportToPDF('product-performance-report', headers, rows, {
      title: 'Medication Velocity & Sales Performance Report',
      subtitle: `Total Items: ${filteredItems.length} | Velocity Filter: ${velocityFilter.toUpperCase()}`,
      orientation: 'landscape',
    });
  };

  return (
    <div className="space-y-6" id="product-performance-report-view">
      {/* 4 Summary Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" id="perf-kpi-summary">
        <div className="bg-white rounded-xl border border-gray-200/90 p-4 shadow-xs">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Fast-Moving Products</span>
          <p className="text-2xl font-bold text-emerald-600 mt-1">{fastMovingCount}</p>
          <p className="text-xs text-gray-500 mt-1">≥50 units sold in period</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200/90 p-4 shadow-xs">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Slow-Moving Products</span>
          <p className="text-2xl font-bold text-amber-600 mt-1">{slowMovingCount}</p>
          <p className="text-xs text-gray-500 mt-1">1 to 9 units sold</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200/90 p-4 shadow-xs">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Zero Movement</span>
          <p className="text-2xl font-bold text-gray-400 mt-1">{zeroMovementCount}</p>
          <p className="text-xs text-gray-500 mt-1">0 units sold in period</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200/90 p-4 shadow-xs">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Sales Volume</span>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {totalUnitsSold.toLocaleString()} units
          </p>
          <p className="text-xs text-gray-500 mt-1">₦{totalRevenue.toLocaleString()} revenue</p>
        </div>
      </div>

      {/* Main Table Card with Search & Velocity Tabs */}
      <div className="bg-white rounded-xl border border-gray-200/90 shadow-xs overflow-hidden" id="product-performance-table-card">
        {/* Toolbar */}
        <div className="p-4 border-b border-gray-200/80 flex flex-wrap items-center justify-between gap-3">
          {/* Velocity Tab Filters */}
          <div className="flex flex-wrap items-center gap-1.5" id="velocity-filter-tabs">
            <button
              type="button"
              onClick={() => setVelocityFilter('all')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                velocityFilter === 'all'
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              All Products ({items.length})
            </button>

            <button
              type="button"
              onClick={() => setVelocityFilter('fast')}
              className={`inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                velocityFilter === 'fast'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-300'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Fast Moving ({fastMovingCount})</span>
            </button>

            <button
              type="button"
              onClick={() => setVelocityFilter('moderate')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                velocityFilter === 'moderate'
                  ? 'bg-blue-50 text-blue-700 border border-blue-300'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Moderate (10-49)
            </button>

            <button
              type="button"
              onClick={() => setVelocityFilter('slow')}
              className={`inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                velocityFilter === 'slow'
                  ? 'bg-amber-50 text-amber-700 border border-amber-300'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Slow Moving ({slowMovingCount})</span>
            </button>

            <button
              type="button"
              onClick={() => setVelocityFilter('zero')}
              className={`inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                velocityFilter === 'zero'
                  ? 'bg-rose-50 text-rose-700 border border-rose-300'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <AlertCircle className="w-3.5 h-3.5" />
              <span>Zero Movement ({zeroMovementCount})</span>
            </button>
          </div>

          {/* Search & Export */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search product, model, brand, category..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-hidden w-56"
              />
            </div>

            <button
              type="button"
              onClick={handleExportPDF}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-lg hover:bg-rose-100 transition-colors"
              title="Export velocity report to PDF"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Export PDF</span>
            </button>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-gray-50/75 border-b border-gray-200 text-gray-500 uppercase font-semibold text-[11px]">
                <th className="py-3 px-4">Product & Specification</th>
                <th className="py-3 px-4">Manufacturer</th>
                <th className="py-3 px-4">Velocity</th>
                <th className="py-3 px-4 text-right">Units Sold</th>
                <th className="py-3 px-4 text-right">Revenue</th>
                {isAdmin && <th className="py-3 px-4 text-right">COGS Cost</th>}
                {isAdmin && <th className="py-3 px-4 text-right">Gross Profit</th>}
                {isAdmin && <th className="py-3 px-4 text-right">Margin %</th>}
                <th className="py-3 px-4 text-right">Current Stock</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-700">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 9 : 6} className="py-8 text-center text-gray-400">
                    No product performance records match your criteria.
                  </td>
                </tr>
              ) : (
                filteredItems.map((it) => (
                  <tr key={it.variantId} className="hover:bg-gray-50/50">
                    <td className="py-3 px-4">
                      <p className="font-semibold text-gray-900">{it.productName}</p>
                      <p className="text-[11px] text-gray-500">
                        {it.dosage ? `${it.dosage} • ` : ''}
                        {it.form || 'General'}
                        {it.genericName ? ` (${it.genericName})` : ''}
                      </p>
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1 font-medium text-gray-800">
                        <Building2 className="w-3 h-3 text-gray-400" />
                        {it.companyName}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          it.velocity === 'fast'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : it.velocity === 'moderate'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : it.velocity === 'slow'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-gray-100 text-gray-600 border border-gray-200'
                        }`}
                      >
                        {it.velocity === 'fast'
                          ? 'Fast Moving'
                          : it.velocity === 'moderate'
                          ? 'Moderate'
                          : it.velocity === 'slow'
                          ? 'Slow Moving'
                          : 'Zero Movement'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-gray-900">
                      {it.unitsSold.toLocaleString()} units
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-gray-900">
                      ₦{it.revenue.toLocaleString()}
                    </td>
                    {isAdmin && (
                      <td className="py-3 px-4 text-right text-rose-600">
                        ₦{it.cost.toLocaleString()}
                      </td>
                    )}
                    {isAdmin && (
                      <td className="py-3 px-4 text-right font-bold text-indigo-600">
                        ₦{it.profit.toLocaleString()}
                      </td>
                    )}
                    {isAdmin && (
                      <td className="py-3 px-4 text-right font-semibold text-emerald-600">
                        {it.marginPct}%
                      </td>
                    )}
                    <td className="py-3 px-4 text-right">
                      <span
                        className={`font-semibold ${
                          it.currentStock === 0
                            ? 'text-rose-600'
                            : it.currentStock <= 10
                            ? 'text-amber-600'
                            : 'text-gray-900'
                        }`}
                      >
                        {it.currentStock.toLocaleString()}
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
