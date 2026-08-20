import React, { useState } from 'react';
import { 
  UserRole, 
  DashboardPeriod, 
  DashboardFilterParams, 
  SystemSettings 
} from '../../types';
import { useDashboard } from '../../hooks/useDashboard';
import { DashboardHeader } from './DashboardHeader';
import { DashboardQuickActions } from './DashboardQuickActions';
import { ExecutiveSummaryCards } from './ExecutiveSummaryCards';
import { DashboardAlertsBanner } from './DashboardAlertsBanner';
import { SalesAndProfitTrends } from './SalesAndProfitTrends';
import { FinancialMovementTrends } from './FinancialMovementTrends';
import { TopSellingProductsCard } from './TopSellingProductsCard';
import { InventoryWatchlistCard } from './InventoryWatchlistCard';
import { RecentSalesCard } from './RecentSalesCard';
import { RecentPurchasesCard } from './RecentPurchasesCard';
import { DashboardSkeleton } from './DashboardSkeleton';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface DashboardModuleProps {
  role: UserRole;
  onNavigate: (module: string) => void;
  onOpenProductWizard?: () => void;
  settings?: SystemSettings;
}

export const DashboardModule: React.FC<DashboardModuleProps> = ({
  role,
  onNavigate,
  onOpenProductWizard = () => onNavigate('products'),
  settings,
}) => {
  const [filters, setFilters] = useState<DashboardFilterParams>({
    period: 'today',
  });

  const {
    data,
    isLoading,
    isRefreshing,
    error,
    lastUpdated,
    refetch,
  } = useDashboard(filters, role, { autoPoll: true, pollIntervalMs: 45000 });

  const handleFilterChange = (newFilters: DashboardFilterParams) => {
    setFilters(newFilters);
  };

  if (isLoading && !data) {
    return (
      <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
        <DashboardSkeleton />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="p-4 sm:p-6 max-w-7xl mx-auto">
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-6 text-center space-y-3">
          <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
          <h3 className="text-base font-bold text-rose-900">
            Failed to Load Executive Dashboard
          </h3>
          <p className="text-xs text-rose-700 max-w-md mx-auto">{error}</p>
          <button
            type="button"
            onClick={() => refetch()}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry Connection</span>
          </button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6" id="pharmacy-executive-dashboard">
      {/* 1. Header with Period Selectors and Refresh */}
      <DashboardHeader
        filters={filters}
        onFilterChange={handleFilterChange}
        role={role}
        isRefreshing={isRefreshing}
        onRefresh={refetch}
        lastUpdated={lastUpdated}
        pharmacyName={settings?.pharmacyName || 'BrightCare Pharmacy'}
      />

      {/* 2. Quick Action Shortcuts */}
      <DashboardQuickActions
        role={role}
        onNavigate={onNavigate}
        onOpenProductWizard={onOpenProductWizard}
      />

      {/* 3. Operational Alerts Banner (Stockouts, Low stock, Debt collection) */}
      <DashboardAlertsBanner
        summary={data.summary}
        stockAlerts={data.stockAlerts}
        lowStockThreshold={data.lowStockThreshold}
        role={role}
        onNavigate={onNavigate}
      />

      {/* 4. High-Level Executive KPI Summary Cards */}
      <ExecutiveSummaryCards
        summary={data.summary}
        role={role}
        onNavigate={onNavigate}
      />

      {/* 5. Visual Analytics Grid: Sales & Profit Trajectory + Money In/Out Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" id="dashboard-charts-grid">
        <SalesAndProfitTrends
          trends={data.salesTrends}
          role={role}
          onNavigate={onNavigate}
        />
        <FinancialMovementTrends
          trends={data.financialMovementTrends}
          role={role}
          onNavigate={onNavigate}
        />
      </div>

      {/* 6. High-Priority Operations: Top-Selling Medicines & Low-Stock Watchlist */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" id="dashboard-operations-grid">
        <TopSellingProductsCard
          topProducts={data.topProducts}
          role={role}
          onNavigate={onNavigate}
        />
        <InventoryWatchlistCard
          stockAlerts={data.stockAlerts}
          lowStockThreshold={data.lowStockThreshold}
          role={role}
          onNavigate={onNavigate}
        />
      </div>

      {/* 7. Real-Time Store Activity Feed: Recent Sales & Recent Stock Purchases */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" id="dashboard-activity-grid">
        <RecentSalesCard
          recentSales={data.recentSales}
          role={role}
          onNavigate={onNavigate}
        />
        <RecentPurchasesCard
          recentPurchases={data.recentPurchases}
          role={role}
          onNavigate={onNavigate}
        />
      </div>
    </div>
  );
};
