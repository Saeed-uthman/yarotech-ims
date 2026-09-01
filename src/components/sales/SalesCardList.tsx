import React from 'react';
import {
  Eye,
  Receipt,
  AlertCircle,
  CheckCircle2,
  Calendar,
  ShoppingBag,
  TrendingUp,
  CreditCard,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Sale, UserRole } from '../../types';
import { formatNaira } from '../../utils/formatters';

interface SalesCardListProps {
  sales: Sale[];
  isLoading: boolean;
  role: UserRole;
  currentPage: number;
  totalPages: number;
  totalRecords: number;
  onPageChange: (page: number) => void;
  onViewSale: (sale: Sale) => void;
  onPrintReceipt: (sale: Sale) => void;
  onNavigateToCustomer?: (customerId: string) => void;
}

export const SalesCardList: React.FC<SalesCardListProps> = ({
  sales,
  isLoading,
  role,
  currentPage,
  totalPages,
  totalRecords,
  onPageChange,
  onViewSale,
  onPrintReceipt,
  onNavigateToCustomer,
}) => {
  const isAdmin = role === 'admin';

  if (isLoading) {
    return (
      <div className="md:hidden space-y-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="bg-white rounded-xl border border-slate-200 p-4 animate-pulse space-y-3"
          >
            <div className="h-4 bg-slate-200 rounded-md w-1/3"></div>
            <div className="h-5 bg-slate-200 rounded-md w-2/3"></div>
            <div className="h-4 bg-slate-100 rounded-md w-1/2"></div>
          </div>
        ))}
      </div>
    );
  }

  if (sales.length === 0) {
    return null; // Handled by desktop table container or overall empty view
  }

  return (
    <div id="sales-mobile-card-list" className="md:hidden space-y-3 mb-6">
      {sales.map((sale) => {
        const isWalking = !sale.customerId;
        const hasOutstanding = sale.outstandingAmount > 0;
        const isPartial = sale.paymentStatus === 'PARTIAL';
        const isUnpaid = sale.paymentStatus === 'UNPAID';

        return (
          <div
            key={sale.id}
            id={`sale-card-mobile-${sale.id}`}
            className="bg-white rounded-xl border border-slate-200 shadow-xs p-4 space-y-3"
          >
            {/* Header: Invoice + Status */}
            <div className="flex items-center justify-between">
              <span className="font-mono font-bold text-sm text-slate-900">
                {sale.invoiceNumber}
              </span>
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
            </div>

            {/* Customer & Date */}
            <div className="flex items-start justify-between gap-2 text-xs border-b border-slate-100 pb-2.5">
              <div>
                <span className="text-[11px] text-slate-400 block">Customer</span>
                {isWalking ? (
                  <span className="font-semibold text-slate-600">Walking Customer</span>
                ) : (
                  <span className="font-bold text-slate-900">{sale.customerName}</span>
                )}
              </div>
              <div className="text-right">
                <span className="text-[11px] text-slate-400 block">Date & Time</span>
                <span className="text-slate-600 font-medium">{sale.date}</span>
              </div>
            </div>

            {/* Items snippet */}
            <div className="bg-slate-50 rounded-lg p-2 text-xs text-slate-600">
              <div className="font-semibold text-slate-700 text-[11px] mb-1">
                {sale.itemCount} Item(s) Sold:
              </div>
              <div className="text-[11px] text-slate-500 truncate">
                {sale.items.map((it) => `${it.productName} (${it.companyName}) x${it.quantity}`).join(', ')}
              </div>
            </div>

            {/* Financial Grid */}
            <div className="grid grid-cols-2 gap-2 text-xs pt-1">
              <div>
                <span className="text-[11px] text-slate-400 block">Total Amount</span>
                <span className="font-extrabold text-sm text-slate-900">
                  {formatNaira(sale.total)}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[11px] text-slate-400 block">Paid / Outstanding</span>
                <div className="font-bold text-emerald-700">{formatNaira(sale.amountPaid)}</div>
                {hasOutstanding && (
                  <div className="text-[10px] font-bold text-amber-700">
                    Bal: {formatNaira(sale.outstandingAmount)}
                  </div>
                )}
              </div>
            </div>

            {/* Profit badge if admin */}
            {isAdmin && sale.profit !== undefined && (
              <div className="flex items-center justify-between text-xs bg-indigo-50/70 border border-indigo-100 rounded-md px-2.5 py-1.5 text-indigo-900">
                <span className="font-semibold">Gross Profit:</span>
                <span className="font-bold text-indigo-700">{formatNaira(sale.profit)}</span>
              </div>
            )}

            {/* Actions Toolbar */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => onViewSale(sale)}
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-200 transition-colors"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Details</span>
              </button>

              <button
                type="button"
                onClick={() => onPrintReceipt(sale)}
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700 transition-colors shadow-2xs"
              >
                <Receipt className="w-3.5 h-3.5" />
                <span>Receipt</span>
              </button>
            </div>
          </div>
        );
      })}

      {/* Mobile Pagination */}
      <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-200 text-xs">
        <button
          type="button"
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage <= 1}
          className="px-3 py-1.5 border border-slate-300 rounded-md bg-white disabled:opacity-40 font-medium"
        >
          Previous
        </button>

        <span className="font-semibold text-slate-700">
          Page {currentPage} of {totalPages || 1}
        </span>

        <button
          type="button"
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage >= totalPages}
          className="px-3 py-1.5 border border-slate-300 rounded-md bg-white disabled:opacity-40 font-medium"
        >
          Next
        </button>
      </div>
    </div>
  );
};
