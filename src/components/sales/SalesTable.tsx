import React from 'react';
import {
  Eye,
  Receipt,
  AlertCircle,
  User,
  ShoppingBag,
  Clock,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  CreditCard,
} from 'lucide-react';
import { Sale, UserRole } from '../../types';
import { formatNaira, formatNumber } from '../../utils/formatters';

interface SalesTableProps {
  sales: Sale[];
  isLoading: boolean;
  role: UserRole;
  currentPage: number;
  totalPages: number;
  totalRecords: number;
  perPage: number;
  onPageChange: (page: number) => void;
  onPerPageChange: (limit: number) => void;
  onViewSale: (sale: Sale) => void;
  onPrintReceipt: (sale: Sale) => void;
  onNavigateToCustomer?: (customerId: string) => void;
}

export const SalesTable: React.FC<SalesTableProps> = ({
  sales,
  isLoading,
  role,
  currentPage,
  totalPages,
  totalRecords,
  perPage,
  onPageChange,
  onPerPageChange,
  onViewSale,
  onPrintReceipt,
  onNavigateToCustomer,
}) => {
  const isAdmin = role === 'admin';

  if (isLoading) {
    return (
      <div id="sales-table-loading" className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-8 text-center">
          <div className="inline-block w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-2 text-sm text-slate-500 font-medium">Loading sales records...</p>
        </div>
      </div>
    );
  }

  if (sales.length === 0) {
    return (
      <div id="sales-table-empty" className="bg-white rounded-xl border border-slate-200 shadow-xs p-10 text-center">
        <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
          <ShoppingBag className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-slate-800">No Sales Records Found</h3>
        <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
          No sales match your current search filters or date range. Try clearing or expanding your criteria.
        </p>
      </div>
    );
  }

  return (
    <div id="sales-table-container" className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden hidden md:block">
      <div className="overflow-x-auto">
        <table id="sales-data-table" className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <th className="py-3 px-4">Invoice #</th>
              <th className="py-3 px-4">Date & Time</th>
              <th className="py-3 px-4">Customer</th>
              <th className="py-3 px-4">Items Sold</th>
              <th className="py-3 px-4 text-right">Total (₦)</th>
              <th className="py-3 px-4 text-right">Paid / Balance</th>
              <th className="py-3 px-4 text-center">Status</th>
              <th className="py-3 px-4">Method</th>
              {isAdmin && <th className="py-3 px-4 text-right">Profit (₦)</th>}
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
            {sales.map((sale) => {
              const isWalking = !sale.customerId;
              const hasOutstanding = sale.outstandingAmount > 0;
              const isPartial = sale.paymentStatus === 'PARTIAL';
              const isUnpaid = sale.paymentStatus === 'UNPAID';

              return (
                <tr
                  key={sale.id}
                  id={`sale-row-${sale.id}`}
                  className="hover:bg-slate-50/70 transition-colors"
                >
                  {/* Invoice # */}
                  <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                    {sale.invoiceNumber}
                  </td>

                  {/* Date & Time */}
                  <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">
                    <div className="font-medium text-slate-800">{sale.date.split(',')[0]}</div>
                    <div className="text-[11px] text-slate-400">{sale.date.split(',')[1]?.trim()}</div>
                  </td>

                  {/* Customer */}
                  <td className="py-3.5 px-4">
                    {isWalking ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                        Walking Customer
                      </span>
                    ) : (
                      <div>
                        {onNavigateToCustomer ? (
                          <button
                            type="button"
                            onClick={() => onNavigateToCustomer(sale.customerId!)}
                            className="font-semibold text-blue-600 hover:text-blue-800 hover:underline text-left block truncate max-w-[140px]"
                            title="View Customer Profile"
                          >
                            {sale.customerName}
                          </button>
                        ) : (
                          <span className="font-semibold text-slate-900 truncate block max-w-[140px]">
                            {sale.customerName}
                          </span>
                        )}
                        {sale.customerPhone && (
                          <span className="text-[10px] text-slate-400 block font-mono">
                            {sale.customerPhone}
                          </span>
                        )}
                      </div>
                    )}
                  </td>

                  {/* Items Preview */}
                  <td className="py-3.5 px-4 max-w-[200px]">
                    <div className="flex items-center gap-1.5">
                      <span className="px-1.5 py-0.5 rounded-sm bg-slate-100 font-bold text-[10px] text-slate-700">
                        {sale.itemCount}
                      </span>
                      <span className="truncate text-slate-600 text-[11px]" title={sale.items.map((it) => `${it.productName} (${it.companyName}) x${it.quantity}`).join(', ')}>
                        {sale.items.map((it) => it.productName).slice(0, 2).join(', ')}
                        {sale.itemCount > 2 ? ` +${sale.itemCount - 2} more` : ''}
                      </span>
                    </div>
                  </td>

                  {/* Total */}
                  <td className="py-3.5 px-4 text-right font-bold text-slate-900 whitespace-nowrap">
                    {formatNaira(sale.total)}
                  </td>

                  {/* Paid / Outstanding */}
                  <td className="py-3.5 px-4 text-right whitespace-nowrap">
                    <div className="font-medium text-emerald-700">
                      {formatNaira(sale.amountPaid)}
                    </div>
                    {hasOutstanding && (
                      <div className="text-[10px] font-bold text-amber-700">
                        Bal: {formatNaira(sale.outstandingAmount)}
                      </div>
                    )}
                  </td>

                  {/* Status Badge */}
                  <td className="py-3.5 px-4 text-center whitespace-nowrap">
                    {sale.paymentStatus === 'PAID' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3" />
                        PAID
                      </span>
                    ) : isPartial ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                        <AlertCircle className="w-3 h-3" />
                        PARTIAL
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                        <AlertCircle className="w-3 h-3" />
                        UNPAID
                      </span>
                    )}
                  </td>

                  {/* Payment Method */}
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-100 text-slate-700">
                      {sale.paymentMethod}
                    </span>
                  </td>

                  {/* Profit (Admin Only) */}
                  {isAdmin && (
                    <td className="py-3.5 px-4 text-right font-bold text-indigo-700 whitespace-nowrap">
                      {sale.profit !== undefined ? formatNaira(sale.profit) : '—'}
                    </td>
                  )}

                  {/* Actions */}
                  <td className="py-3.5 px-4 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        id={`view-sale-btn-${sale.id}`}
                        type="button"
                        onClick={() => onViewSale(sale)}
                        className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                        title="View Sale Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>

                      <button
                        id={`receipt-sale-btn-${sale.id}`}
                        type="button"
                        onClick={() => onPrintReceipt(sale)}
                        className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors"
                        title="Print / View Receipt"
                      >
                        <Receipt className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="bg-slate-50/80 px-4 py-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
        <div className="flex items-center gap-2">
          <span>Rows per page:</span>
          <select
            id="sales-per-page-select"
            value={perPage}
            onChange={(e) => onPerPageChange(Number(e.target.value))}
            className="bg-white border border-slate-300 rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
          </select>
          <span className="text-slate-400">|</span>
          <span>
            Showing <strong>{(currentPage - 1) * perPage + 1}</strong> -{' '}
            <strong>{Math.min(currentPage * perPage, totalRecords)}</strong> of{' '}
            <strong>{totalRecords}</strong> sales
          </span>
        </div>

        {/* Page Nav */}
        <div className="flex items-center gap-1">
          <button
            id="sales-prev-page-btn"
            type="button"
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage <= 1}
            className="p-1.5 rounded-md border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            title="Previous Page"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <span className="px-3 py-1 font-semibold text-slate-700">
            Page {currentPage} of {totalPages || 1}
          </span>

          <button
            id="sales-next-page-btn"
            type="button"
            onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage >= totalPages}
            className="p-1.5 rounded-md border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            title="Next Page"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
