import React, { useState } from 'react';
import {
  BarChart3,
  Calendar,
  Layers,
} from 'lucide-react';
import { PurchaseChartDataPoint, PurchaseDateRange } from '../../types';
import { formatNaira, formatNumber } from '../../utils/formatters';

interface PurchaseChartProps {
  data: PurchaseChartDataPoint[];
  dateRange: PurchaseDateRange;
  isLoading: boolean;
}

export const PurchaseChart: React.FC<PurchaseChartProps> = ({
  data,
  dateRange,
  isLoading,
}) => {
  const [hoveredPoint, setHoveredPoint] = useState<PurchaseChartDataPoint | null>(null);

  const maxSpent = Math.max(...data.map((d) => d.amountSpent), 1000);
  const totalSpent = data.reduce((sum, d) => sum + d.amountSpent, 0);
  const totalUnits = data.reduce((sum, d) => sum + d.units, 0);
  const totalOrders = data.reduce((sum, d) => sum + d.purchasesCount, 0);

  if (isLoading) {
    return (
      <div id="purchase-chart-loading" className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 mb-6 animate-pulse">
        <div className="h-5 bg-slate-200 rounded-md w-44 mb-4"></div>
        <div className="h-44 bg-slate-100 rounded-lg w-full"></div>
      </div>
    );
  }

  if (data.length === 0) {
    return null;
  }

  return (
    <div id="purchase-chart-container" className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 mb-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <BarChart3 className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">
              Stock Procurement & Capital Outflow Trend
            </h3>
            <p className="text-xs text-slate-500">
              Breakdown for {dateRange === 'today' ? 'today by hour' : dateRange === 'this_week' ? 'this week by day' : 'selected timeline'}
            </p>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-xs font-medium text-slate-600">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-xs bg-indigo-600"></div>
            <span>Capital Outflow (₦)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-xs bg-emerald-500"></div>
            <span>Units Received</span>
          </div>
        </div>
      </div>

      {/* Main Bar Chart Container */}
      <div className="relative">
        <div className="h-48 flex items-end gap-2 sm:gap-4 pt-6 pb-2 px-2 border-b border-slate-200">
          {data.map((point, index) => {
            const spentHeightPercent = Math.max(4, Math.round((point.amountSpent / maxSpent) * 100));
            const isHovered = hoveredPoint?.label === point.label;

            return (
              <div
                key={index}
                id={`purchase-chart-bar-group-${index}`}
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
                    <div className="text-indigo-300">Capital Spent: {formatNaira(point.amountSpent)}</div>
                    <div className="text-emerald-300">Units Restocked: {formatNumber(point.units)} units</div>
                    <div className="text-slate-400">{point.purchasesCount} order(s)</div>
                  </div>
                )}

                {/* Bars */}
                <div className="w-full max-w-[44px] flex items-end justify-center gap-1 h-full">
                  {/* Capital Spent Bar */}
                  <div
                    style={{ height: `${spentHeightPercent}%` }}
                    className={`w-full rounded-t-sm transition-all duration-300 ${
                      isHovered
                        ? 'bg-indigo-700 shadow-md ring-2 ring-indigo-300'
                        : 'bg-indigo-600 group-hover:bg-indigo-700'
                    }`}
                  ></div>
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
            Total Capital in Period:{' '}
            <strong className="text-indigo-950">{formatNaira(totalSpent)}</strong>
          </span>
          <span>•</span>
          <span>
            Total Stock In:{' '}
            <strong className="text-emerald-700">{formatNumber(totalUnits)} units</strong> across {totalOrders} order(s)
          </span>
        </div>
        <div className="text-slate-400 text-[11px]">
          Hover over bars to inspect detailed values
        </div>
      </div>
    </div>
  );
};
