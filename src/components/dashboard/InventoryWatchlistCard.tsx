import React from 'react';
import { 
  DashboardStockAlert, 
  UserRole 
} from '../../types';
import { 
  AlertTriangle, 
  ArrowRight, 
  Boxes, 
  CheckCircle2, 
  XCircle 
} from 'lucide-react';

interface InventoryWatchlistCardProps {
  stockAlerts: DashboardStockAlert[];
  lowStockThreshold: number;
  role: UserRole;
  onNavigate: (module: string) => void;
}

export const InventoryWatchlistCard: React.FC<InventoryWatchlistCardProps> = ({
  stockAlerts,
  lowStockThreshold,
  role,
  onNavigate,
}) => {
  return (
    <div className="bg-white rounded-xl border border-slate-200/90 p-4 sm:p-6 shadow-xs flex flex-col justify-between" id="inventory-watchlist-card">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
              <Boxes className="w-4 h-4 text-rose-500" />
              <span>Inventory Stock Watchlist</span>
            </h3>
            <p className="text-xs text-slate-500">
              Medicines requiring immediate restocking (threshold: ≤ {lowStockThreshold} units)
            </p>
          </div>

          <button
            type="button"
            onClick={() => onNavigate('inventory')}
            className="text-xs font-semibold text-blue-600 hover:text-blue-700 inline-flex items-center gap-1 group"
          >
            <span>Full Inventory</span>
            <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>

        {stockAlerts.length === 0 ? (
          <div className="py-10 text-center text-slate-400 text-xs">
            <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-400 mb-2" />
            <p className="font-semibold text-slate-600">All medicines in good standing!</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              No product is currently at or below the {lowStockThreshold} unit threshold.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {stockAlerts.slice(0, 5).map((item) => {
              const isOut = item.status === 'out_of_stock' || item.currentStock === 0;

              return (
                <div
                  key={`${item.productId}_${item.variantId}`}
                  className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between gap-3 group"
                >
                  {/* Status indicator & Name */}
                  <div className="flex items-start gap-2.5 min-w-0">
                    <div
                      className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 mt-0.5 ${
                        isOut
                          ? 'bg-rose-100 text-rose-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}
                    >
                      {isOut ? (
                        <XCircle className="w-3.5 h-3.5" />
                      ) : (
                        <AlertTriangle className="w-3.5 h-3.5" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-900 truncate">
                        {item.productName}
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-500 truncate">
                        <span className="font-medium text-slate-700">{item.companyName}</span>
                        {item.genericName && (
                          <>
                            <span>•</span>
                            <span className="text-slate-400 truncate">{item.genericName}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Stock count badge */}
                  <div className="text-right shrink-0">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${
                        isOut
                          ? 'bg-rose-50 text-rose-700 border border-rose-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}
                    >
                      {item.currentStock} units left
                    </span>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      Reorder at ≤{item.reorderLevel}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="pt-3 mt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
        <span>Order stock via Stock Purchase module</span>
        <button
          type="button"
          onClick={() => onNavigate('stock-purchase')}
          className="text-blue-600 hover:text-blue-700 font-semibold"
        >
          Create Purchase Order
        </button>
      </div>
    </div>
  );
};
