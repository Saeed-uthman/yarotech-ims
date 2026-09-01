import React from 'react';
import {
  Eye,
  CreditCard,
  Building2,
  Calendar,
  Layers,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  Ban,
  Package,
} from 'lucide-react';
import { StockPurchase, UserRole } from '../../types';
import { formatNaira, formatNumber } from '../../utils/formatters';

interface PurchaseTableProps {
  purchases: StockPurchase[];
  isLoading: boolean;
  role: UserRole;
  currentPage: number;
  totalPages: number;
  totalRecords: number;
  perPage: number;
  onPageChange: (page: number) => void;
  onPerPageChange: (limit: number) => void;
  onViewPurchase: (purchase: StockPurchase) => void;
  onCancelPurchase: (purchase: StockPurchase) => void;
}

export const PurchaseTable: React.FC<PurchaseTableProps> = ({
  purchases,
  isLoading,
  role,
  currentPage,
  totalPages,
  totalRecords,
  perPage,
  onPageChange,
  onPerPageChange,
  onViewPurchase,
  onCancelPurchase,
}) => {
  const [copiedId, setCopiedId] = React.useState<string | null>(null);

  const handleCopyId = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const startRecord = totalRecords > 0 ? (currentPage - 1) * perPage + 1 : 0;
  const endRecord = Math.min(currentPage * perPage, totalRecords);

  if (isLoading) {
    return (
      <div id="purchases-table-loading" className="hidden md:block bg-white rounded-xl border border-slate-200 shadow-xs p-6 animate-pulse">
        <div className="space-y-4">
          <div className="h-6 bg-slate-200 rounded-md w-48"></div>
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-12 bg-slate-100 rounded-lg w-full"></div>
          ))}
        </div>
      </div>
    );
  }

  if (purchases.length === 0) {
    return (
      <div id="purchases-table-empty" className="hidden md:block bg-white rounded-xl border border-slate-200 shadow-xs p-12 text-center">
        <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-3">
          <Package className="w-7 h-7" />
        </div>
        <h3 className="text-base font-bold text-slate-800">No Stock Purchases Found</h3>
        <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 mb-4">
          No stock purchase records match your selected timeframe and search criteria.
        </p>
      </div>
    );
  }

  return (
    <div id="purchases-table-container" className="hidden md:block bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <th className="py-3.5 px-4">Purchase #</th>
              <th className="py-3.5 px-4">Date & Time</th>
              <th className="py-3.5 px-4">Products Restocked</th>
              <th className="py-3.5 px-4 text-center">Total Units</th>
              <th className="py-3.5 px-4 text-right">Capital Spent</th>
              <th className="py-3.5 px-4 text-center">Payment</th>
              <th className="py-3.5 px-4 text-center">Status</th>
              <th className="py-3.5 px-4">Recorded By</th>
              <th className="py-3.5 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs">
            {purchases.map((purchase) => {
              const isCancelled = purchase.status === 'CANCELLED';
              const firstItem = purchase.items[0];
              const remainingCount = purchase.items.length - 1;

              return (
                <tr
                  key={purchase.id}
                  id={`purchase-row-${purchase.id}`}
                  onClick={() => onViewPurchase(purchase)}
                  className={`hover:bg-slate-50/80 transition-colors cursor-pointer ${
                    isCancelled ? 'bg-rose-50/20 opacity-75' : ''
                  }`}
                >
                  {/* 1. Purchase ID */}
                  <td className="py-3.5 px-4 font-mono font-bold text-indigo-900">
                    <div className="flex items-center gap-1.5">
                      <span>{purchase.purchaseNumber}</span>
                      <button
                        type="button"
                        onClick={(e) => handleCopyId(e, purchase.purchaseNumber)}
                        title="Copy purchase number"
                        className="text-slate-400 hover:text-slate-600 p-0.5"
                      >
                        {copiedId === purchase.purchaseNumber ? (
                          <Check className="w-3 h-3 text-emerald-600" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    </div>
                  </td>

                  {/* 2. Date */}
                  <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{purchase.purchaseDate}</span>
                    </div>
                  </td>

                  {/* 3. Items Summary */}
                  <td className="py-3.5 px-4 max-w-xs">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {firstItem && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 border border-slate-200 text-slate-800 rounded-md font-medium text-[11px] truncate max-w-[220px]">
                          <span className="font-bold text-indigo-700">[{firstItem.companyName}]</span>
                          <span className="truncate">{firstItem.productName}</span>
                          <span className="text-slate-500 font-normal">×{firstItem.quantity}</span>
                        </span>
                      )}
                      {remainingCount > 0 && (
                        <span className="px-1.5 py-0.5 bg-indigo-50 text-indigo-700 rounded-md text-[10px] font-bold border border-indigo-100">
                          +{remainingCount} more
                        </span>
                      )}
                    </div>
                  </td>

                  {/* 4. Total Units */}
                  <td className="py-3.5 px-4 text-center">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-800 rounded-full font-bold text-xs">
                      <Layers className="w-3 h-3 text-slate-500" />
                      {formatNumber(purchase.totalUnits || purchase.items.reduce((s, it) => s + it.quantity, 0))}
                    </span>
                  </td>

                  {/* 5. Total Spent */}
                  <td className="py-3.5 px-4 text-right font-bold text-indigo-950 text-sm whitespace-nowrap">
                    {formatNaira(purchase.totalAmount)}
                  </td>

                  {/* 6. Payment Method */}
                  <td className="py-3.5 px-4 text-center">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        purchase.paymentMethod === 'TRANSFER'
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : purchase.paymentMethod === 'CASH'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-purple-50 text-purple-700 border border-purple-200'
                      }`}
                    >
                      {purchase.paymentMethod || 'UNPAID'}
                    </span>
                  </td>

                  {/* 7. Status */}
                  <td className="py-3.5 px-4 text-center whitespace-nowrap">
                    {isCancelled ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                        <XCircle className="w-3 h-3" />
                        Cancelled
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3" />
                        Completed
                      </span>
                    )}
                  </td>

                  {/* 8. Recorded By */}
                  <td className="py-3.5 px-4 text-slate-600 text-[11px] truncate max-w-[140px]">
                    {purchase.recordedBy}
                  </td>

                  {/* 9. Actions */}
                  <td className="py-3.5 px-4 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                      <button
                        id={`view-purchase-${purchase.id}`}
                        type="button"
                        onClick={() => onViewPurchase(purchase)}
                        className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        title="View Full Purchase Voucher"
                      >
                        <Eye className="w-4 h-4" />
                      </button>

                      {!isCancelled && (
                        <button
                          id={`cancel-purchase-${purchase.id}`}
                          type="button"
                          onClick={() => onCancelPurchase(purchase)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Cancel purchase and adjust inventory"
                        >
                          <Ban className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination Strip */}
      <div className="bg-slate-50/70 border-t border-slate-200 px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
        <div className="flex items-center gap-3">
          <span>
            Showing <strong className="font-semibold text-slate-900">{startRecord}</strong> to{' '}
            <strong className="font-semibold text-slate-900">{endRecord}</strong> of{' '}
            <strong className="font-semibold text-slate-900">{totalRecords}</strong> purchases
          </span>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">•</span>
            <span className="text-slate-500">Per page:</span>
            <select
              id="purchases-per-page-select"
              value={perPage}
              onChange={(e) => onPerPageChange(Number(e.target.value))}
              className="bg-white border border-slate-200 rounded-md px-2 py-0.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            id="purchases-prev-page-btn"
            type="button"
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage <= 1}
            className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            title="Previous page"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="px-3 py-1 font-semibold text-slate-800">
            Page {currentPage} of {totalPages}
          </span>
          <button
            id="purchases-next-page-btn"
            type="button"
            onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage >= totalPages}
            className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            title="Next page"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
