import React from 'react';

export const DashboardSkeleton: React.FC = () => {
  return (
    <div className="space-y-6 animate-pulse" id="dashboard-skeleton-loader">
      {/* Header Skeleton */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="h-6 w-56 bg-slate-200 rounded"></div>
          <div className="h-4 w-72 bg-slate-100 rounded"></div>
        </div>
        <div className="flex gap-2">
          <div className="h-9 w-32 bg-slate-200 rounded-lg"></div>
          <div className="h-9 w-24 bg-slate-200 rounded-lg"></div>
        </div>
      </div>

      {/* Quick Actions Skeleton */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-12 bg-white rounded-xl border border-slate-200"></div>
        ))}
      </div>

      {/* Summary KPI Cards Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <div key={i} className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
            <div className="h-4 w-28 bg-slate-200 rounded"></div>
            <div className="h-7 w-36 bg-slate-300 rounded"></div>
            <div className="h-3 w-44 bg-slate-100 rounded"></div>
          </div>
        ))}
      </div>

      {/* Charts Grid Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 p-6 h-72"></div>
        <div className="bg-white rounded-xl border border-slate-200 p-6 h-72"></div>
      </div>

      {/* Operational Watchlist Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 p-6 h-80"></div>
        <div className="bg-white rounded-xl border border-slate-200 p-6 h-80"></div>
      </div>
    </div>
  );
};
