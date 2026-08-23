import React, { useState } from 'react';
import { 
  DashboardPeriod, 
  DashboardFilterParams, 
  UserRole 
} from '../../types';
import { 
  Calendar, 
  RefreshCw, 
  Shield, 
  UserCheck, 
  Clock, 
  ChevronDown 
} from 'lucide-react';

interface DashboardHeaderProps {
  filters: DashboardFilterParams;
  onFilterChange: (newFilters: DashboardFilterParams) => void;
  role: UserRole;
  isRefreshing: boolean;
  onRefresh: () => void;
  lastUpdated: Date | null;
  pharmacyName?: string;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  filters,
  onFilterChange,
  role,
  isRefreshing,
  onRefresh,
  lastUpdated,
  pharmacyName = 'Al-Amaan Medicine Store',
}) => {
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [customStart, setCustomStart] = useState(filters.startDate || '2026-08-01');
  const [customEnd, setCustomEnd] = useState(filters.endDate || '2026-08-19');

  const periodOptions: { id: DashboardPeriod; label: string }[] = [
    { id: 'today', label: 'Today' },
    { id: 'this_week', label: 'This Week' },
    { id: 'this_month', label: 'This Month' },
    { id: 'last_month', label: 'Last Month' },
    { id: 'custom', label: 'Custom Range' },
  ];

  const handleSelectPeriod = (p: DashboardPeriod) => {
    if (p === 'custom') {
      setShowCustomModal(true);
    } else {
      onFilterChange({
        period: p,
      });
    }
  };

  const handleApplyCustom = () => {
    onFilterChange({
      period: 'custom',
      startDate: customStart,
      endDate: customEnd,
    });
    setShowCustomModal(false);
  };

  const formattedTime = lastUpdated
    ? lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : 'Just now';

  return (
    <div className="bg-white rounded-xl border border-slate-200/90 p-4 sm:p-6 shadow-xs space-y-4" id="dashboard-header">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Title & Status */}
        <div className="space-y-1">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Executive Dashboard
            </h1>
            {role === 'admin' ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                <Shield className="w-3.5 h-3.5" />
                Administrator View
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <UserCheck className="w-3.5 h-3.5" />
                Cashier View
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-slate-500">
            Real-time business performance, inventory health, and cash flow summary for{' '}
            <span className="font-semibold text-slate-700">{pharmacyName}</span>.
          </p>
        </div>

        {/* Controls: Last sync + Refresh button */}
        <div className="flex items-center gap-2.5 self-start md:self-auto">
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-400 font-medium px-2.5 py-1.5 bg-slate-50 rounded-lg border border-slate-200">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>Synced: {formattedTime}</span>
          </div>

          <button
            type="button"
            id="dashboard-refresh-btn"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg shadow-2xs transition-colors disabled:opacity-50"
            title="Refresh dashboard metrics"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-600 ${isRefreshing ? 'animate-spin text-blue-600' : ''}`} />
            <span>{isRefreshing ? 'Syncing...' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {/* Period Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-1 shrink-0 flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" />
            Period:
          </span>

          <div className="inline-flex bg-slate-100/80 p-0.5 rounded-lg border border-slate-200/80 shrink-0">
            {periodOptions.map((opt) => {
              const isSelected = filters.period === opt.id;
              return (
                <button
                  key={opt.id}
                  id={`period-filter-${opt.id}`}
                  type="button"
                  onClick={() => handleSelectPeriod(opt.id)}
                  className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                    isSelected
                      ? 'bg-white text-blue-600 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                  }`}
                >
                  {opt.label}
                  {opt.id === 'custom' && filters.period === 'custom' && filters.startDate && (
                    <span className="ml-1 text-[10px] text-blue-600 font-normal">
                      ({filters.startDate} to {filters.endDate})
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="text-[11px] text-slate-400 font-medium">
          {filters.period === 'today' && 'Showing today\'s transactions and financial records'}
          {filters.period === 'this_week' && 'Aggregating last 7 days of store activity'}
          {filters.period === 'this_month' && 'Aggregating current month to date'}
          {filters.period === 'last_month' && 'Showing full previous month archive'}
          {filters.period === 'custom' && `Custom range: ${filters.startDate} to ${filters.endDate}`}
        </div>
      </div>

      {/* Custom Date Range Modal */}
      {showCustomModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-sm w-full border border-slate-200 p-5 shadow-xl space-y-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Select Custom Date Range</h3>
              <p className="text-xs text-slate-500 mt-0.5">Filter sales, profit, and financial movements.</p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowCustomModal(false)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApplyCustom}
                className="px-4 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-xs"
              >
                Apply Range
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
