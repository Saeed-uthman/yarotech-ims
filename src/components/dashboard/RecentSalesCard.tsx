import React from 'react';
import { 
  DashboardRecentSale, 
  UserRole 
} from '../../types';
import { 
  ShoppingBag, 
  ArrowRight, 
  CreditCard, 
  User, 
  Receipt 
} from 'lucide-react';

interface RecentSalesCardProps {
  recentSales: DashboardRecentSale[];
  role: UserRole;
  onNavigate: (module: string) => void;
}

export const RecentSalesCard: React.FC<RecentSalesCardProps> = ({
  recentSales,
  role,
  onNavigate,
}) => {
  return (
    <div className="bg-white rounded-xl border border-slate-200/90 p-4 sm:p-6 shadow-xs flex flex-col justify-between" id="recent-sales-card">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-blue-600" />
              <span>Recent Sales Activity</span>
            </h3>
            <p className="text-xs text-slate-500">
              Latest transactions recorded at the point of sale
            </p>
          </div>

          <button
            type="button"
            onClick={() => onNavigate('sales')}
            className="text-xs font-semibold text-blue-600 hover:text-blue-700 inline-flex items-center gap-1 group"
          >
            <span>All Sales</span>
            <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>

        {recentSales.length === 0 ? (
          <div className="py-10 text-center text-slate-400 text-xs">
            <Receipt className="w-8 h-8 mx-auto text-slate-300 mb-2" />
            <p>No transactions registered yet.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {recentSales.map((s) => {
              const isCredit = s.paymentStatus === 'CREDIT' || s.paymentStatus === 'PARTIAL';

              return (
                <div
                  key={s.id}
                  className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between gap-3 group"
                >
                  {/* Receipt & Customer */}
                  <div className="flex items-start gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 mt-0.5">
                      <Receipt className="w-3.5 h-3.5" />
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900">
                          {s.receiptNumber}
                        </span>
                        <span
                          className={`text-[10px] font-semibold px-1.5 py-0.2 rounded ${
                            s.paymentMethod === 'CASH'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : s.paymentMethod === 'TRANSFER'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : s.paymentMethod === 'POS'
                              ? 'bg-purple-50 text-purple-700 border border-purple-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          {s.paymentMethod}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 text-[11px] text-slate-500 truncate mt-0.5">
                        <span className="truncate">{s.customerName}</span>
                        <span>•</span>
                        <span>{s.itemCount} items</span>
                      </div>
                    </div>
                  </div>

                  {/* Amount & Time */}
                  <div className="text-right shrink-0">
                    <div className="text-xs font-bold text-slate-900">
                      ₦{s.totalAmount.toLocaleString()}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      {s.rawDate ? s.rawDate.split('T')[0] : s.date}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="pt-3 mt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
        <span>Instant receipt lookups & reprints in Sales module</span>
        <button
          type="button"
          onClick={() => onNavigate('sales')}
          className="text-blue-600 hover:text-blue-700 font-medium"
        >
          View Sales Register
        </button>
      </div>
    </div>
  );
};
