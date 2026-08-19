import React, { useState } from 'react';
import {
  TrendingUp,
  BarChart3,
  Calendar,
  DollarSign,
  Info,
} from 'lucide-react';
import { SalesChartDataPoint, SalesDateRange, UserRole } from '../../types';
import { formatNaira, formatNumber } from '../../utils/formatters';

interface SalesChartProps {
  data: SalesChartDataPoint[];
  dateRange: SalesDateRange;
  role: UserRole;
  isLoading: boolean;
}

export const SalesChart: React.FC<SalesChartProps> = ({
  data,
  dateRange,
  role,
  isLoading,
}) => {
  const [hoveredPoint, setHoveredPoint] = useState<SalesChartDataPoint | null>(null);
  const isAdmin = role === 'admin';

  const maxRevenue = Math.max(...data.map((d) => d.revenue), 1000);
  const totalRevenue = data.reduce((sum, d) => sum + d.revenue, 0);
  const totalProfit = data.reduce((sum, d) => sum + d.profit, 0);
  const totalTransactions = data.reduce((sum, d) => sum + d.transactions, 0);

  if (isLoading) {
    return (
      <div id="sales-chart-loading" className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 mb-6 animate-pulse">
        <div className="h-5 bg-slate-200 rounded-md w-44 mb-4"></div>
        <div className="h-44 bg-slate-100 rounded-lg w-full"></div>
      </div>
    );
  }

  if (data.length === 0) {
    return null;
  }

  return (
    <div id="sales-chart-container" className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 mb-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
            <BarChart3 className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">
              Sales & Revenue Performance
            </h3>
            <p className="text-xs text-slate-500">
              Period breakdown ({dateRange === 'today' ? 'Hourly' : 'Daily timeline'})
            </p>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-xs font-medium text-slate-600">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-xs bg-blue-600"></div>
            <span>Revenue (₦)</span>
          </div>
          {isAdmin && (
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-xs bg-emerald-500"></div>
              <span>Gross Profit (₦)</span>
            </div>
          )}
        </div>
      </div>

      {/* Main Bar Chart Container */}
      <div className="relative">
        <div className="h-48 flex items-end gap-2 sm:gap-4 pt-6 pb-2 px-2 border-b border-slate-200">
          {data.map((point, index) => {
            const revHeightPercent = Math.max(4, Math.round((point.revenue / maxRevenue) * 100));
            const profHeightPercent = isAdmin
              ? Math.max(2, Math.round((point.profit / maxRevenue) * 100))
              : 0;

            const isHovered = hoveredPoint?.label === point.label;

            return (
              <div
                key={index}
                id={`chart-bar-group-${index}`}
                onMouseEnter={() => setHoveredPoint(point)}
                onMouseLeave={() => setHoveredPoint(null)}
                className="flex-1 flex flex-col items-center justify-end h-full group cursor-pointer relative"
              >
                {/* Tooltip on Hover */}
                {isHovered && (
                  <div className="absolute -top-16 z-20 bg-slate-900 text-white text-[11px] py-1.5 px-2.5 rounded-lg shadow-xl whitespace-nowrap pointer-events-none animate-in fade-in zoom-in-95 duration-100">
                    <div className="font-bold text-slate-200 border-b border-slate-700 pb-1 mb-1">
                      {point.label}
                    </div>
                    <div className="text-blue-300">Revenue: {formatNaira(point.revenue)}</div>
                    {isAdmin && (
                      <div className="text-emerald-300">Profit: {formatNaira(point.profit)}</div>
                    )}
                    <div className="text-slate-400">{point.transactions} sale(s)</div>
                  </div>
                )}

                {/* Bars */}
                <div className="w-full max-w-[40px] flex items-end justify-center gap-1 h-full">
                  {/* Revenue Bar */}
                  <div
                    style={{ height: `${revHeightPercent}%` }}
                    className={`w-full rounded-t-sm transition-all duration-300 ${
                      isHovered
                        ? 'bg-blue-700 shadow-md ring-2 ring-blue-300'
                        : 'bg-blue-600 group-hover:bg-blue-700'
                    }`}
                  ></div>

                  {/* Profit Bar (Admin Only) */}
                  {isAdmin && point.profit > 0 && (
                    <div
                      style={{ height: `${profHeightPercent}%` }}
                      className={`w-full rounded-t-sm transition-all duration-300 ${
                        isHovered
                          ? 'bg-emerald-600 shadow-md ring-2 ring-emerald-300'
                          : 'bg-emerald-500 group-hover:bg-emerald-600'
                      }`}
                    ></div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* X-Axis Labels */}
        <div className="flex items-center justify-between gap-2 sm:gap-4 px-2 pt-2 text-[10px] sm:text-xs text-slate-500 font-medium overflow-x-hidden">
          {data.map((point, index) => (
            <div key={index} className="flex-1 text-center truncate">
              {point.label}
            </div>
          ))}
        </div>
      </div>

      {/* Footer Info Strip */}
      <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
        <div className="flex items-center gap-3">
          <span>
            Total Volume in Period:{' '}
            <strong className="text-slate-800">{formatNaira(totalRevenue)}</strong>
          </span>
          {isAdmin && (
            <span>
              Net Period Profit:{' '}
              <strong className="text-emerald-700">{formatNaira(totalProfit)}</strong>
            </span>
          )}
        </div>
        <div className="text-slate-400 text-[11px]">
          Hover over bars to inspect detailed breakdowns
        </div>
      </div>
    </div>
  );
};
