import React from 'react';
import { 
  DashboardSalesTrendPoint, 
  UserRole 
} from '../../types';
import { 
  TrendingUp, 
  ShoppingBag, 
  DollarSign, 
  Receipt 
} from 'lucide-react';

interface SalesAndProfitTrendsProps {
  trends: DashboardSalesTrendPoint[];
  role: UserRole;
  onNavigate: (module: string) => void;
}

export const SalesAndProfitTrends: React.FC<SalesAndProfitTrendsProps> = ({
  trends,
  role,
  onNavigate,
}) => {
  const isAdmin = role === 'admin';
  const maxSales = Math.max(...trends.map((t) => t.sales), 1000);
  const totalPeriodSales = trends.reduce((sum, t) => sum + t.sales, 0);
  const totalPeriodProfit = trends.reduce((sum, t) => sum + t.profit, 0);
  const totalPeriodTxns = trends.reduce((sum, t) => sum + t.transactions, 0);

  return (
    <div className="bg-white rounded-xl border border-slate-200/90 p-4 sm:p-6 shadow-xs space-y-4" id="sales-profit-trend-card">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-blue-600" />
            <span>Sales & Revenue Trajectory</span>
          </h3>
          <p className="text-xs text-slate-500">
            Daily turnover progression across the selected reporting timeframe
          </p>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5 font-semibold text-slate-700">
            <span className="w-3 h-3 rounded-xs bg-blue-600 inline-block"></span>
            <span>Sales</span>
          </div>
          {isAdmin && (
            <div className="flex items-center gap-1.5 font-semibold text-emerald-700">
              <span className="w-3 h-3 rounded-xs bg-emerald-500 inline-block"></span>
              <span>Profit (Gross)</span>
            </div>
          )}
        </div>
      </div>

      {/* Summary Mini-stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200/70">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Period Total Sales
          </span>
          <div className="text-sm sm:text-base font-bold text-slate-900">
            ₦{totalPeriodSales.toLocaleString()}
          </div>
        </div>

        {isAdmin && (
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">
              Period Gross Profit
            </span>
            <div className="text-sm sm:text-base font-bold text-emerald-700">
              ₦{totalPeriodProfit.toLocaleString()}
            </div>
          </div>
        )}

        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Total Sales Count
          </span>
          <div className="text-sm sm:text-base font-bold text-slate-900">
            {totalPeriodTxns} transactions
          </div>
        </div>
      </div>

      {/* Daily Chart Visualization */}
      {trends.length === 0 ? (
        <div className="h-44 flex items-center justify-center text-xs text-slate-400">
          No transaction history for the selected date range.
        </div>
      ) : (
        <div className="space-y-2">
          <div className="h-48 flex items-end gap-1.5 sm:gap-2.5 pt-6 pb-2 border-b border-slate-100">
            {trends.map((t, idx) => {
              const salesHeightPct = Math.max(6, Math.round((t.sales / maxSales) * 100));
              const profitHeightPct = isAdmin
                ? Math.max(4, Math.round((t.profit / maxSales) * 100))
                : 0;

              return (
                <div
                  key={idx}
                  className="flex-1 flex flex-col items-center justify-end h-full group relative"
                >
                  {/* Hover Tooltip */}
                  <div className="absolute -top-16 hidden group-hover:flex flex-col items-center z-20 bg-slate-900 text-white text-[11px] py-1.5 px-2.5 rounded-lg shadow-xl whitespace-nowrap pointer-events-none">
                    <span className="font-bold text-slate-200">{t.label}</span>
                    <span className="text-blue-300 font-semibold">
                      Sales: ₦{t.sales.toLocaleString()} ({t.transactions} txns)
                    </span>
                    {isAdmin && (
                      <span className="text-emerald-400 font-medium">
                        Profit: ₦{t.profit.toLocaleString()}
                      </span>
                    )}
                    <div className="w-2 h-2 bg-slate-900 rotate-45 -mb-1 mt-0.5"></div>
                  </div>

                  {/* Dual Bar Group */}
                  <div className="w-full flex items-end justify-center gap-0.5 sm:gap-1 h-full">
                    {/* Sales Bar */}
                    <div
                      className="w-full max-w-[18px] bg-blue-600 hover:bg-blue-700 rounded-t-sm transition-all shadow-2xs"
                      style={{ height: `${salesHeightPct}%` }}
                    ></div>

                    {/* Profit Bar (Admin only) */}
                    {isAdmin && (
                      <div
                        className="w-full max-w-[14px] bg-emerald-500 hover:bg-emerald-600 rounded-t-sm transition-all"
                        style={{ height: `${profitHeightPct}%` }}
                      ></div>
                    )}
                  </div>

                  {/* X-axis Label */}
                  <span className="text-[10px] text-slate-400 font-medium mt-1 truncate max-w-full text-center">
                    {t.label.split(' ')[0]}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span>Baseline ₦0</span>
            <span>Peak daily sales: ₦{maxSales.toLocaleString()}</span>
          </div>
        </div>
      )}
    </div>
  );
};
