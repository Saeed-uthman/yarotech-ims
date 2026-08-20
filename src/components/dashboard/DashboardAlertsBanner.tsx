import React from 'react';
import { 
  DashboardSummaryKPIs, 
  DashboardStockAlert, 
  UserRole 
} from '../../types';
import { 
  AlertTriangle, 
  XCircle, 
  Coins, 
  CheckCircle2, 
  ArrowRight,
  Boxes
} from 'lucide-react';

interface DashboardAlertsBannerProps {
  summary: DashboardSummaryKPIs;
  stockAlerts: DashboardStockAlert[];
  lowStockThreshold: number;
  role: UserRole;
  onNavigate: (module: string) => void;
}

export const DashboardAlertsBanner: React.FC<DashboardAlertsBannerProps> = ({
  summary,
  stockAlerts,
  lowStockThreshold,
  role,
  onNavigate,
}) => {
  const hasOutOfStock = summary.outOfStockCount > 0;
  const hasLowStock = summary.lowStockCount > 0;
  const hasDebt = summary.outstandingDebt > 0;

  if (!hasOutOfStock && !hasLowStock && !hasDebt) {
    return (
      <div 
        id="dashboard-operational-status-ok"
        className="bg-emerald-50/80 border border-emerald-200/90 rounded-xl p-4 flex items-center justify-between gap-3 text-emerald-800"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-900">
              Operational Status: Excellent
            </h4>
            <p className="text-xs text-emerald-700 mt-0.5">
              All active product lines are above the configured low-stock threshold ({lowStockThreshold} units) with zero critical stockouts.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => onNavigate('inventory')}
          className="hidden sm:inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors shrink-0"
        >
          <span>Check Inventory</span>
          <ArrowRight className="w-3 h-3" />
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2.5" id="dashboard-alerts-banner">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
          <span>Operational Attention Required</span>
        </h3>
        <span className="text-[11px] text-slate-400 font-medium">
          Configured threshold: ≤ {lowStockThreshold} units
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* 1. Out of Stock Alert */}
        {hasOutOfStock ? (
          <div className="bg-rose-50/90 border border-rose-200/90 rounded-xl p-3.5 flex items-start justify-between gap-3 text-rose-900 shadow-2xs">
            <div className="flex items-start gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-rose-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                <XCircle className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-rose-900">
                  {summary.outOfStockCount} Product{summary.outOfStockCount > 1 ? 's' : ''} Out of Stock
                </div>
                <div className="text-[11px] text-rose-700 mt-0.5 truncate">
                  Zero units available for dispensing.
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('inventory')}
              className="text-xs font-semibold text-rose-700 hover:text-rose-900 underline shrink-0 self-center"
            >
              Resolve
            </button>
          </div>
        ) : (
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex items-center gap-2.5 text-slate-500 text-xs">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>No products currently at zero stock.</span>
          </div>
        )}

        {/* 2. Low Stock Alert */}
        {hasLowStock ? (
          <div className="bg-amber-50/90 border border-amber-200/90 rounded-xl p-3.5 flex items-start justify-between gap-3 text-amber-900 shadow-2xs">
            <div className="flex items-start gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-amber-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                <Boxes className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-amber-900">
                  {summary.lowStockCount} Product{summary.lowStockCount > 1 ? 's' : ''} Running Low
                </div>
                <div className="text-[11px] text-amber-700 mt-0.5 truncate">
                  At or below {lowStockThreshold} units. Reorder recommended.
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('inventory')}
              className="text-xs font-semibold text-amber-800 hover:text-amber-950 underline shrink-0 self-center"
            >
              Restock
            </button>
          </div>
        ) : (
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex items-center gap-2.5 text-slate-500 text-xs">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>All stock above threshold (≤{lowStockThreshold}).</span>
          </div>
        )}

        {/* 3. Outstanding Customer Debt Alert */}
        {hasDebt ? (
          <div className="bg-indigo-50/90 border border-indigo-200/90 rounded-xl p-3.5 flex items-start justify-between gap-3 text-indigo-900 shadow-2xs">
            <div className="flex items-start gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                <Coins className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-indigo-900">
                  ₦{summary.outstandingDebt.toLocaleString()} Outstanding Debt
                </div>
                <div className="text-[11px] text-indigo-700 mt-0.5 truncate">
                  Owed across {summary.debtorCount} customer{summary.debtorCount > 1 ? 's' : ''}.
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('customers')}
              className="text-xs font-semibold text-indigo-700 hover:text-indigo-900 underline shrink-0 self-center"
            >
              Collect
            </button>
          </div>
        ) : (
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex items-center gap-2.5 text-slate-500 text-xs">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>Zero unpaid customer debt balances.</span>
          </div>
        )}
      </div>
    </div>
  );
};
