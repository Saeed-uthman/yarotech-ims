import React, { useState } from 'react';
import { 
  AlertTriangle, 
  XCircle, 
  ArrowRight, 
  ChevronDown, 
  ChevronUp, 
  ShoppingCart, 
  ExternalLink,
  Sliders,
  X
} from 'lucide-react';
import { InventorySummaryKPIs, UserRole } from '../../types';

interface InventoryLowStockAlertBannerProps {
  kpis: InventorySummaryKPIs | null;
  currentRole: UserRole;
  onFilterLowStock: () => void;
  onFilterOutOfStock: () => void;
  onOpenAlertCenter: () => void;
}

export const InventoryLowStockAlertBanner: React.FC<InventoryLowStockAlertBannerProps> = ({
  kpis,
  currentRole,
  onFilterLowStock,
  onFilterOutOfStock,
  onOpenAlertCenter,
}) => {
  const [isDismissed, setIsDismissed] = useState(false);

  if (!kpis) return null;

  const totalAlerts = (kpis.lowStockCount || 0) + (kpis.outOfStockCount || 0);

  if (totalAlerts === 0 || isDismissed) {
    return null;
  }

  const hasOutOfStock = (kpis.outOfStockCount || 0) > 0;

  return (
    <div 
      id="inventory-low-stock-alert-banner"
      className="mb-5 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-rose-500/10 dark:from-amber-950/30 dark:via-slate-900 dark:to-rose-950/30 border border-amber-300/80 dark:border-amber-700/60 rounded-xl p-4 shadow-xs animate-in fade-in duration-150"
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
        {/* Left: Alert Icon & Messaging */}
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs mt-0.5 sm:mt-0">
            <AlertTriangle className="w-5 h-5 animate-bounce-subtle" />
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-sm font-bold text-amber-950 dark:text-amber-200 flex items-center gap-1.5">
                <span>Inventory Low Stock Alert</span>
                <span className="px-2 py-0.5 text-xs font-black rounded-full bg-amber-200 dark:bg-amber-800/80 text-amber-900 dark:text-amber-100">
                  {totalAlerts} items affected
                </span>
              </h4>
            </div>

            <p className="text-xs text-amber-900/80 dark:text-amber-300/80 mt-0.5">
              {hasOutOfStock ? (
                <>
                  <strong className="text-rose-700 dark:text-rose-400">
                    {kpis.outOfStockCount} critical out-of-stock
                  </strong>{' '}
                  and <strong>{kpis.lowStockCount} low stock</strong> medicine variants require procurement reordering.
                </>
              ) : (
                <>
                  <strong>{kpis.lowStockCount} medicine variants</strong> are at or below minimum reorder safety thresholds.
                </>
              )}
            </p>
          </div>
        </div>

        {/* Right: Quick Action Buttons */}
        <div className="flex items-center gap-2 self-stretch sm:self-auto shrink-0">
          {hasOutOfStock && (
            <button
              type="button"
              onClick={onFilterOutOfStock}
              className="px-2.5 py-1.5 bg-rose-100 hover:bg-rose-200 dark:bg-rose-900/40 dark:hover:bg-rose-900/70 text-rose-800 dark:text-rose-300 rounded-lg text-xs font-semibold transition-colors"
            >
              Show Out of Stock ({kpis.outOfStockCount})
            </button>
          )}

          <button
            type="button"
            onClick={onFilterLowStock}
            className="px-2.5 py-1.5 bg-amber-100 hover:bg-amber-200 dark:bg-amber-900/40 dark:hover:bg-amber-900/70 text-amber-900 dark:text-amber-200 rounded-lg text-xs font-semibold transition-colors"
          >
            Show Low Stock ({kpis.lowStockCount})
          </button>

          <button
            type="button"
            id="open-low-stock-modal-from-banner"
            onClick={onOpenAlertCenter}
            className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5"
          >
            <span>Alert Center</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => setIsDismissed(true)}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-md transition-colors"
            title="Dismiss banner"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
