import React from 'react';
import { 
  DashboardRecentPurchase, 
  UserRole 
} from '../../types';
import { 
  ShoppingCart, 
  ArrowRight, 
  Building2, 
  CheckCircle2, 
  Clock 
} from 'lucide-react';

interface RecentPurchasesCardProps {
  recentPurchases: DashboardRecentPurchase[];
  role: UserRole;
  onNavigate: (module: string) => void;
}

export const RecentPurchasesCard: React.FC<RecentPurchasesCardProps> = ({
  recentPurchases,
  role,
  onNavigate,
}) => {
  return (
    <div className="bg-white rounded-xl border border-slate-200/90 p-4 sm:p-6 shadow-xs flex flex-col justify-between" id="recent-purchases-card">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-purple-600" />
              <span>Recent Stock Purchases</span>
            </h3>
            <p className="text-xs text-slate-500">
              Procurement orders received from pharmaceutical manufacturers
            </p>
          </div>

          <button
            type="button"
            onClick={() => onNavigate('stock-purchase')}
            className="text-xs font-semibold text-purple-600 hover:text-purple-700 inline-flex items-center gap-1 group"
          >
            <span>All Purchases</span>
            <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>

        {recentPurchases.length === 0 ? (
          <div className="py-10 text-center text-slate-400 text-xs">
            <ShoppingCart className="w-8 h-8 mx-auto text-slate-300 mb-2" />
            <p>No procurement records found.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {recentPurchases.map((p) => (
              <div
                key={p.id}
                className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between gap-3 group"
              >
                {/* Invoice & Manufacturer */}
                <div className="flex items-start gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 mt-0.5">
                    <Building2 className="w-3.5 h-3.5" />
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900 truncate">
                        {p.companyName}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-1 rounded">
                        #{p.invoiceNumber}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 text-[11px] text-slate-500 truncate mt-0.5">
                      <span>{p.itemsCount} product line{p.itemsCount > 1 ? 's' : ''}</span>
                      <span>•</span>
                      <span className="text-emerald-600 font-semibold">{p.paymentStatus}</span>
                    </div>
                  </div>
                </div>

                {/* Amount & Date */}
                <div className="text-right shrink-0">
                  <div className="text-xs font-bold text-slate-900">
                    ₦{p.totalAmount.toLocaleString()}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    {p.rawDate ? p.rawDate.split('T')[0] : p.purchaseDate}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="pt-3 mt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
        <span>Restock orders update inventory immediately</span>
        <button
          type="button"
          onClick={() => onNavigate('stock-purchase')}
          className="text-purple-600 hover:text-purple-700 font-medium"
        >
          New Procurement
        </button>
      </div>
    </div>
  );
};
