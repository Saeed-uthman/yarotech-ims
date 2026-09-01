import React from 'react';
import {
  Calendar,
  Layers,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Eye,
  Package,
} from 'lucide-react';
import { StockPurchase, UserRole } from '../../types';
import { formatNaira, formatNumber } from '../../utils/formatters';

interface PurchaseCardListProps {
  purchases: StockPurchase[];
  isLoading: boolean;
  role: UserRole;
  currentPage: number;
  totalPages: number;
  totalRecords: number;
  onPageChange: (page: number) => void;
  onViewPurchase: (purchase: StockPurchase) => void;
}

export const PurchaseCardList: React.FC<PurchaseCardListProps> = ({
  purchases,
  isLoading,
  role,
  currentPage,
  totalPages,
  totalRecords,
  onPageChange,
  onViewPurchase,
}) => {
  if (isLoading) {
    return (
      <div id="purchases-mobile-loading" className="block md:hidden space-y-3 animate-pulse">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs h-32">
            <div className="h-4 bg-slate-200 rounded w-1/3 mb-2"></div>
            <div className="h-6 bg-slate-100 rounded w-2/3 mb-2"></div>
            <div className="h-3 bg-slate-100 rounded w-1/2"></div>
          </div>
        ))}
      </div>
    );
  }

  if (purchases.length === 0) {
    return (
      <div id="purchases-mobile-empty" className="block md:hidden bg-white rounded-xl border border-slate-200 shadow-xs p-8 text-center">
        <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-2">
          <Package className="w-6 h-6" />
        </div>
        <h3 className="text-sm font-bold text-slate-800">No Purchases Found</h3>
        <p className="text-xs text-slate-500 mt-1">No restock records match your filter.</p>
      </div>
    );
  }

  return (
    <div id="purchases-mobile-card-list" className="block md:hidden space-y-3">
      {purchases.map((purchase) => {
        const isCancelled = purchase.status === 'CANCELLED';
        const totalUnits = purchase.totalUnits || purchase.items.reduce((s, it) => s + it.quantity, 0);

        return (
          <div
            key={purchase.id}
            id={`purchase-card-${purchase.id}`}
            onClick={() => onViewPurchase(purchase)}
            className={`bg-white rounded-xl border border-slate-200 shadow-xs p-4 active:scale-[0.99] transition-all cursor-pointer ${
              isCancelled ? 'bg-rose-50/20' : ''
            }`}
          >
            {/* Header: ID, Date, Status */}
            <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2.5 mb-2.5">
              <div>
                <span className="font-mono font-bold text-indigo-900 text-sm">
                  {purchase.purchaseNumber}
                </span>
                <div className="flex items-center gap-1 text-[11px] text-slate-500 mt-0.5">
                  <Calendar className="w-3 h-3 text-slate-400" />
                  <span>{purchase.purchaseDate}</span>
                </div>
              </div>

              <div>
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
              </div>
            </div>

            {/* Item summary pills */}
            <div className="space-y-1 mb-3">
              {purchase.items.slice(0, 2).map((item, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs text-slate-700">
                  <span className="truncate pr-2">
                    <strong className="text-indigo-800 font-semibold">[{item.companyName}]</strong> {item.productName}
                  </span>
                  <span className="text-slate-500 font-medium shrink-0">
                    {item.quantity} × {formatNaira(item.unitPurchasePrice)}
                  </span>
                </div>
              ))}
              {purchase.items.length > 2 && (
                <div className="text-[11px] text-indigo-600 font-medium pt-0.5">
                  +{purchase.items.length - 2} additional product items
                </div>
              )}
            </div>

            {/* Bottom Strip: Total Units, Spent, Payment Method */}
            <div className="flex items-center justify-between pt-2.5 border-t border-slate-100 text-xs">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md font-semibold text-[11px]">
                  <Layers className="w-3 h-3 text-slate-400" />
                  {totalUnits} units
                </span>
                <span className="text-[10px] font-bold uppercase text-slate-500 bg-slate-50 border border-slate-200 px-1.5 py-0.5 rounded">
                  {purchase.paymentMethod || 'UNPAID'}
                </span>
              </div>

              <div className="text-right">
                <div className="text-base font-black text-indigo-950">
                  {formatNaira(purchase.totalAmount)}
                </div>
              </div>
            </div>
          </div>
        );
      })}

      {/* Mobile Pagination */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-3 flex items-center justify-between text-xs text-slate-600">
        <button
          type="button"
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage <= 1}
          className="px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 disabled:opacity-40 font-medium"
        >
          Previous
        </button>
        <span className="font-semibold text-slate-800">
          Page {currentPage} of {totalPages}
        </span>
        <button
          type="button"
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage >= totalPages}
          className="px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 disabled:opacity-40 font-medium"
        >
          Next
        </button>
      </div>
    </div>
  );
};
