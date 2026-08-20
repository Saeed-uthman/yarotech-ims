import React from 'react';
import { 
  DashboardFinancialMovementPoint, 
  UserRole 
} from '../../types';
import { 
  ArrowLeftRight, 
  ArrowDownLeft, 
  ArrowUpRight, 
  Info 
} from 'lucide-react';

interface FinancialMovementTrendsProps {
  trends: DashboardFinancialMovementPoint[];
  role: UserRole;
  onNavigate: (module: string) => void;
}

export const FinancialMovementTrends: React.FC<FinancialMovementTrendsProps> = ({
  trends,
  role,
  onNavigate,
}) => {
  const maxFlow = Math.max(
    ...trends.map((t) => Math.max(t.moneyIn, t.moneyOut)),
    1000
  );

  const totalMoneyIn = trends.reduce((sum, t) => sum + t.moneyIn, 0);
  const totalMoneyOut = trends.reduce((sum, t) => sum + t.moneyOut, 0);
  const netMovement = totalMoneyIn - totalMoneyOut;

  return (
    <div className="bg-white rounded-xl border border-slate-200/90 p-4 sm:p-6 shadow-xs space-y-4" id="financial-movement-trend-card">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
            <ArrowLeftRight className="w-4 h-4 text-teal-600" />
            <span>Money In vs Money Out Flow</span>
          </h3>
          <p className="text-xs text-slate-500">
            Cash receipts vs procurement disbursements and operating expenses
          </p>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5 font-semibold text-teal-700">
            <span className="w-3 h-3 rounded-xs bg-teal-600 inline-block"></span>
            <span>Money In</span>
          </div>
          <div className="flex items-center gap-1.5 font-semibold text-rose-700">
            <span className="w-3 h-3 rounded-xs bg-rose-500 inline-block"></span>
            <span>Money Out</span>
          </div>
        </div>
      </div>

      {/* Summary Mini-stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200/70">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-teal-700 flex items-center gap-1">
            <ArrowDownLeft className="w-3 h-3" />
            Total Money In
          </span>
          <div className="text-sm sm:text-base font-bold text-slate-900">
            ₦{totalMoneyIn.toLocaleString()}
          </div>
        </div>

        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700 flex items-center gap-1">
            <ArrowUpRight className="w-3 h-3" />
            Total Money Out
          </span>
          <div className="text-sm sm:text-base font-bold text-slate-900">
            ₦{totalMoneyOut.toLocaleString()}
          </div>
        </div>

        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Net Cash Flow
          </span>
          <div className={`text-sm sm:text-base font-bold ${
            netMovement >= 0 ? 'text-teal-700' : 'text-rose-700'
          }`}>
            {netMovement >= 0 ? '+' : ''}₦{netMovement.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Daily Chart */}
      {trends.length === 0 ? (
        <div className="h-44 flex items-center justify-center text-xs text-slate-400">
          No financial movement history for the selected date range.
        </div>
      ) : (
        <div className="space-y-2">
          <div className="h-48 flex items-end gap-1.5 sm:gap-2.5 pt-6 pb-2 border-b border-slate-100">
            {trends.map((t, idx) => {
              const inHeightPct = Math.max(4, Math.round((t.moneyIn / maxFlow) * 100));
              const outHeightPct = Math.max(4, Math.round((t.moneyOut / maxFlow) * 100));

              return (
                <div
                  key={idx}
                  className="flex-1 flex flex-col items-center justify-end h-full group relative"
                >
                  {/* Tooltip */}
                  <div className="absolute -top-16 hidden group-hover:flex flex-col items-center z-20 bg-slate-900 text-white text-[11px] py-1.5 px-2.5 rounded-lg shadow-xl whitespace-nowrap pointer-events-none">
                    <span className="font-bold text-slate-200">{t.label}</span>
                    <span className="text-teal-300 font-semibold">
                      In: ₦{t.moneyIn.toLocaleString()}
                    </span>
                    <span className="text-rose-300 font-semibold">
                      Out: ₦{t.moneyOut.toLocaleString()}
                    </span>
                    <div className="w-2 h-2 bg-slate-900 rotate-45 -mb-1 mt-0.5"></div>
                  </div>

                  {/* Dual Bar Group */}
                  <div className="w-full flex items-end justify-center gap-0.5 sm:gap-1 h-full">
                    {/* Inflow */}
                    <div
                      className="w-full max-w-[16px] bg-teal-600 hover:bg-teal-700 rounded-t-sm transition-all"
                      style={{ height: `${inHeightPct}%` }}
                    ></div>

                    {/* Outflow */}
                    <div
                      className="w-full max-w-[16px] bg-rose-500 hover:bg-rose-600 rounded-t-sm transition-all"
                      style={{ height: `${outHeightPct}%` }}
                    ></div>
                  </div>

                  {/* Label */}
                  <span className="text-[10px] text-slate-400 font-medium mt-1 truncate max-w-full text-center">
                    {t.label.split(' ')[0]}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span>Peak daily flow: ₦{maxFlow.toLocaleString()}</span>
            <div className="flex items-center gap-1 text-[11px] text-slate-400">
              <Info className="w-3.5 h-3.5 text-slate-400" />
              <span>Outflows represent inventory procurement & expenses</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
