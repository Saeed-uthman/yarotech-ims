import React, { useState } from 'react';
import {
  Package,
  Search,
  FileText,
  ArrowDownRight,
  ArrowUpRight,
  Building2,
} from 'lucide-react';
import { InventoryMovementReportData, UserRole } from '../../types';
import { exportToPDF } from './exportUtils';

interface InventoryMovementReportViewProps {
  inventoryMovement: InventoryMovementReportData | null;
  isLoading: boolean;
  role: UserRole;
}

export const InventoryMovementReportView: React.FC<InventoryMovementReportViewProps> = ({
  inventoryMovement,
  isLoading,
}) => {
  const [search, setSearch] = useState('');
  const [stockStatusFilter, setStockStatusFilter] = useState<'all' | 'in_stock' | 'low_stock' | 'out_of_stock'>('all');

  if (isLoading || !inventoryMovement) {
    return (
      <div className="space-y-6 animate-pulse" id="inventory-movement-loading">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-gray-200 rounded-xl"></div>
          ))}
        </div>
        <div className="h-72 bg-gray-200 rounded-xl"></div>
      </div>
    );
  }

  const { summary, items } = inventoryMovement;

  const filteredItems = items.filter((it) => {
    if (stockStatusFilter !== 'all' && it.status !== stockStatusFilter) return false;
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
      'Medicine Name',
      'Formulation',
      'Manufacturer',
      'Category',
      'Opening Stock',
      'Stock In (+)',
      'Stock Out (-)',
      'Current Stock',
      'Status',
    ];

    const rows = filteredItems.map((it) => [
      it.productName,
      `${it.dosage || ''} ${it.form || ''}`.trim(),
      it.companyName,
      it.categoryName,
      it.openingStock,
      it.stockIn,
      it.stockOut,
      it.currentStock,
      it.status.replace('_', ' ').toUpperCase(),
    ]);

    exportToPDF('inventory-movement-report', headers, rows, {
      title: 'Inventory Movement & Stock Reconciliation Report',
      subtitle: `Total Items: ${filteredItems.length} | Status Filter: ${stockStatusFilter.toUpperCase()}`,
      orientation: 'landscape',
    });
  };

  return (
    <div className="space-y-6" id="inventory-movement-report-view">
      {/* 4 Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" id="inv-kpi-summary">
        <div className="bg-white rounded-xl border border-gray-200/90 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Stock In</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <ArrowDownRight className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-emerald-600 mt-1">
            +{summary.totalStockIn.toLocaleString()} units
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Purchases: {summary.stockInPurchases} • Adjustments: {summary.stockInAdjustments}
          </p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200/90 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Stock Out</span>
            <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-rose-600 mt-1">
            -{summary.totalStockOut.toLocaleString()} units
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Sales: {summary.stockOutSales} • Adjustments: {summary.stockOutAdjustments}
          </p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200/90 p-4 shadow-xs">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Net Units Delta</span>
          <p
            className={`text-2xl font-bold mt-1 ${
              summary.totalStockIn - summary.totalStockOut >= 0
                ? 'text-emerald-600'
                : 'text-rose-600'
            }`}
          >
            {summary.totalStockIn - summary.totalStockOut >= 0 ? '+' : ''}
            {(summary.totalStockIn - summary.totalStockOut).toLocaleString()} units
          </p>
          <p className="text-xs text-gray-500 mt-1">Stock In − Stock Out</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200/90 p-4 shadow-xs">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Tracked Medicines</span>
          <p className="text-2xl font-bold text-gray-900 mt-1">{items.length}</p>
          <p className="text-xs text-gray-500 mt-1">
            {items.filter((i) => i.status === 'low_stock').length} low stock items
          </p>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white rounded-xl border border-gray-200/90 shadow-xs overflow-hidden" id="inventory-movement-table-card">
        {/* Table Header Toolbar */}
        <div className="p-4 border-b border-gray-200/80 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setStockStatusFilter('all')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                stockStatusFilter === 'all'
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              All Medicines ({items.length})
            </button>

            <button
              type="button"
              onClick={() => setStockStatusFilter('in_stock')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                stockStatusFilter === 'in_stock'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-300'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              In Stock
            </button>

            <button
              type="button"
              onClick={() => setStockStatusFilter('low_stock')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                stockStatusFilter === 'low_stock'
                  ? 'bg-amber-50 text-amber-700 border border-amber-300'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Low Stock (≤10)
            </button>

            <button
              type="button"
              onClick={() => setStockStatusFilter('out_of_stock')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                stockStatusFilter === 'out_of_stock'
                  ? 'bg-rose-50 text-rose-700 border border-rose-300'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Out of Stock (0)
            </button>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search medicine, manufacturer..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-hidden w-56"
              />
            </div>

            <button
              type="button"
              onClick={handleExportPDF}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-lg hover:bg-rose-100 transition-colors"
              title="Export filtered movement records to PDF"
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
                <th className="py-3 px-4">Medicine & Formulation</th>
                <th className="py-3 px-4">Manufacturer</th>
                <th className="py-3 px-4 text-right">Opening Stock</th>
                <th className="py-3 px-4 text-right">Stock In (+)</th>
                <th className="py-3 px-4 text-right">Stock Out (−)</th>
                <th className="py-3 px-4 text-right">Current Stock</th>
                <th className="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-700">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-gray-400">
                    No matching inventory movement records.
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
                      <span className="inline-flex items-center gap-1 text-gray-800">
                        <Building2 className="w-3 h-3 text-gray-400" />
                        {it.companyName}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-gray-600">
                      {it.openingStock.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-emerald-600">
                      +{it.stockIn.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-rose-600">
                      −{it.stockOut.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-gray-900">
                      {it.currentStock.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          it.status === 'in_stock'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : it.status === 'low_stock'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        {it.status === 'in_stock'
                          ? 'In Stock'
                          : it.status === 'low_stock'
                          ? 'Low Stock'
                          : 'Out of Stock'}
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
