import React, { useState } from 'react';
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  ShoppingBag,
  ArrowRightLeft,
  Package,
  Layers,
  Users,
  ShieldCheck,
  ShieldAlert,
} from 'lucide-react';
import {
  ReportFilterParams,
  UserRole,
  CategoryEntity,
  CompanyEntity,
  Product,
} from '../../types';
import {
  useFinancialSummaryReport,
  useSalesReport,
  useProfitReport,
  useStockPurchaseReport,
  useFinancialMovementReport,
  useProductPerformanceReport,
  useInventoryMovementReport,
  useCustomerDebtReport,
} from '../../hooks/useReports';
import { ReportSummaryCards } from './ReportSummaryCards';
import { ReportFiltersBar } from './ReportFiltersBar';
import { OverviewReportView } from './OverviewReportView';
import { SalesReportView } from './SalesReportView';
import { ProfitReportView } from './ProfitReportView';
import { StockPurchaseReportView } from './StockPurchaseReportView';
import { FinancialMovementReportView } from './FinancialMovementReportView';
import { ProductPerformanceReportView } from './ProductPerformanceReportView';
import { InventoryMovementReportView } from './InventoryMovementReportView';
import { DebtMovementReportView } from './DebtMovementReportView';

interface ReportsModuleProps {
  role: UserRole;
  categories: CategoryEntity[];
  companies: CompanyEntity[];
  products: Product[];
}

export type ReportTab =
  | 'overview'
  | 'sales'
  | 'profit'
  | 'purchases'
  | 'financial-movement'
  | 'product-performance'
  | 'inventory-movement'
  | 'debt';

const TABS: { id: ReportTab; label: string; icon: React.ElementType; adminOnly?: boolean }[] = [
  { id: 'overview', label: 'Executive Overview', icon: BarChart3 },
  { id: 'sales', label: 'Sales & Revenue', icon: TrendingUp },
  { id: 'profit', label: 'Gross Profit', icon: DollarSign, adminOnly: true },
  { id: 'purchases', label: 'Stock Purchases', icon: ShoppingBag },
  { id: 'financial-movement', label: 'Financial Movement', icon: ArrowRightLeft },
  { id: 'product-performance', label: 'Product Performance', icon: Package },
  { id: 'inventory-movement', label: 'Inventory Movement', icon: Layers },
  { id: 'debt', label: 'Debt Movement', icon: Users },
];

export const ReportsModule: React.FC<ReportsModuleProps> = ({
  role,
  categories,
  companies,
  products,
}) => {
  const [activeTab, setActiveTab] = useState<ReportTab>('overview');
  const [filters, setFilters] = useState<ReportFilterParams>({
    dateRange: 'this_month',
  });
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Hook instances for all report categories
  const summaryHook = useFinancialSummaryReport(filters, role);
  const salesHook = useSalesReport(filters, role);
  const profitHook = useProfitReport(filters, role);
  const purchaseHook = useStockPurchaseReport(filters, role);
  const financialMovementHook = useFinancialMovementReport(filters, role);
  const productPerformanceHook = useProductPerformanceReport(filters, role);
  const inventoryMovementHook = useInventoryMovementReport(filters, role);
  const debtHook = useCustomerDebtReport(filters, role);

  const handleFilterChange = (updates: Partial<ReportFilterParams>) => {
    setFilters((prev) => ({
      ...prev,
      ...updates,
    }));
  };

  const handleResetFilters = () => {
    setFilters({
      dateRange: 'this_month',
    });
  };

  const handleRefreshAll = async () => {
    setIsRefreshing(true);
    await Promise.all([
      summaryHook.refetch(),
      salesHook.refetch(),
      profitHook.refetch(),
      purchaseHook.refetch(),
      financialMovementHook.refetch(),
      productPerformanceHook.refetch(),
      inventoryMovementHook.refetch(),
      debtHook.refetch(),
    ]);
    setIsRefreshing(false);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12" id="financial-reports-module">
      {/* Module Title Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
              Financial & Movement Reports
            </h1>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              Module 9
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Auditable business intelligence, sales trajectory, procurement spend, stock movements, and debt portfolio
          </p>
        </div>

        {/* Role Badge */}
        <div className="flex items-center gap-2">
          <div
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold ${
              role === 'admin'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-amber-50 text-amber-800 border-amber-200'
            }`}
          >
            {role === 'admin' ? (
              <>
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Admin View (Full Financial & Profit Access)</span>
              </>
            ) : (
              <>
                <ShieldAlert className="w-4 h-4 text-amber-600" />
                <span>Cashier View (Base Costs & Profit Redacted)</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Date & Dimension Filters Bar */}
      <ReportFiltersBar
        filters={filters}
        onFilterChange={handleFilterChange}
        onReset={handleResetFilters}
        onRefresh={handleRefreshAll}
        isRefreshing={isRefreshing}
        categories={categories}
        companies={companies}
        products={products}
      />

      {/* Summary KPI Cards Row (Always Visible for Context) */}
      <ReportSummaryCards
        summary={summaryHook.data}
        isLoading={summaryHook.isLoading}
        role={role}
      />

      {/* Navigation Tabs Bar */}
      <div className="border-b border-gray-200 bg-white rounded-xl shadow-xs px-2 pt-2" id="reports-tab-navigation">
        <nav className="flex flex-wrap gap-1" aria-label="Report Views">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`inline-flex items-center gap-2 px-3.5 py-2.5 text-xs font-semibold rounded-t-lg transition-colors border-b-2 ${
                  isActive
                    ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50'
                    : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
                id={`tab-btn-${tab.id}`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-emerald-600' : 'text-gray-400'}`} />
                <span>{tab.label}</span>
                {tab.adminOnly && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 font-bold border border-indigo-200">
                    Admin
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content Views */}
      <div className="mt-4" id="report-active-view-container">
        {activeTab === 'overview' && (
          <OverviewReportView
            summary={summaryHook.data}
            salesReport={salesHook.data}
            financialMovement={financialMovementHook.data}
            productPerformance={productPerformanceHook.data}
            debtReport={debtHook.data}
            isLoading={summaryHook.isLoading}
            role={role}
            onNavigateTab={(tab) => setActiveTab(tab as ReportTab)}
          />
        )}

        {activeTab === 'sales' && (
          <SalesReportView
            salesReport={salesHook.data}
            isLoading={salesHook.isLoading}
            role={role}
          />
        )}

        {activeTab === 'profit' && (
          <ProfitReportView
            profitReport={profitHook.data}
            isLoading={profitHook.isLoading}
            role={role}
          />
        )}

        {activeTab === 'purchases' && (
          <StockPurchaseReportView
            purchaseReport={purchaseHook.data}
            isLoading={purchaseHook.isLoading}
            role={role}
          />
        )}

        {activeTab === 'financial-movement' && (
          <FinancialMovementReportView
            financialMovement={financialMovementHook.data}
            isLoading={financialMovementHook.isLoading}
            role={role}
          />
        )}

        {activeTab === 'product-performance' && (
          <ProductPerformanceReportView
            performanceData={productPerformanceHook.data}
            isLoading={productPerformanceHook.isLoading}
            role={role}
          />
        )}

        {activeTab === 'inventory-movement' && (
          <InventoryMovementReportView
            inventoryMovement={inventoryMovementHook.data}
            isLoading={inventoryMovementHook.isLoading}
            role={role}
          />
        )}

        {activeTab === 'debt' && (
          <DebtMovementReportView
            debtReport={debtHook.data}
            isLoading={debtHook.isLoading}
            role={role}
          />
        )}
      </div>
    </div>
  );
};
