import React from 'react';
import { 
  DashboardSummaryKPIs, 
  UserRole 
} from '../../types';
import { 
  ShoppingBag, 
  TrendingUp, 
  Receipt, 
  ArrowDownLeft, 
  ArrowUpRight, 
  Scale, 
  AlertCircle, 
  Boxes, 
  ArrowRight,
  ShieldCheck,
  Lock,
  WalletCards
} from 'lucide-react';

interface ExecutiveSummaryCardsProps {
  summary: DashboardSummaryKPIs;
  role: UserRole;
  onNavigate: (module: string) => void;
}

export const ExecutiveSummaryCards: React.FC<ExecutiveSummaryCardsProps> = ({
  summary,
  role,
  onNavigate,
}) => {
  const isAdmin = role === 'admin';
  const profitMargin =
    summary.totalSales > 0 && isAdmin
      ? Math.round((summary.totalProfit / summary.totalSales) * 1000) / 10
      : 0;

  if (!isAdmin) {
    return (
      <div className="space-y-3" id="cashier-summary-cards">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Cashier Operational Overview
          </h2>
          <span className="text-[11px] text-slate-400 font-medium">
            Amounts in Nigerian Naira (₦)
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 1. Total Sales */}
          <div 
            id="card-total-sales"
            className="bg-white rounded-xl border border-slate-200/90 p-4 sm:p-5 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-colors"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Period Sales
                </span>
                <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <ShoppingBag className="w-4 h-4" />
                </div>
              </div>

              <div className="space-y-0.5">
                <div className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                  ₦{summary.totalSales.toLocaleString()}
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-bold text-[10px]">
                    {summary.transactionCount} checkouts
                  </span>
                  <span>•</span>
                  <span>Processed</span>
                </div>
              </div>
            </div>

            <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between">
              <button
                type="button"
                onClick={() => onNavigate('sales')}
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 inline-flex items-center gap-1 group"
              >
                <span>Point of Sale</span>
                <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
              </button>
              <span className="text-[11px] text-slate-400">Live POS</span>
            </div>
          </div>

          {/* 2. Items Sold */}
          <div 
            id="card-items-dispensed"
            className="bg-white rounded-xl border border-slate-200/90 p-4 sm:p-5 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-colors"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Units Dispensed
                </span>
                <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Receipt className="w-4 h-4" />
                </div>
              </div>

              <div className="space-y-0.5">
                <div className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                  {summary.itemsSold.toLocaleString()} units
                </div>
                <div className="text-xs text-slate-500 font-medium">
                  Total medicines dispensed to patients
                </div>
              </div>
            </div>

            <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between">
              <button
                type="button"
                onClick={() => onNavigate('products')}
                className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 inline-flex items-center gap-1 group"
              >
                <span>View Catalog</span>
                <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
              </button>
              <span className="text-[11px] text-slate-400">Inventory items</span>
            </div>
          </div>

          {/* 3. Outstanding Debtors */}
          <div 
            id="card-outstanding-debt"
            className="bg-white rounded-xl border border-slate-200/90 p-4 sm:p-5 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-colors"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Active Debtors
                </span>
                <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                  <AlertCircle className="w-4 h-4" />
                </div>
              </div>

              <div className="space-y-0.5">
                <div className="text-xl sm:text-2xl font-bold text-amber-700 tracking-tight">
                  {summary.debtorCount} customers
                </div>
                <div className="text-xs text-slate-500 font-medium">
                  Patients with outstanding credit balances
                </div>
              </div>
            </div>

            <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between">
              <button
                type="button"
                onClick={() => onNavigate('customers')}
                className="text-xs font-semibold text-amber-700 hover:text-amber-800 inline-flex items-center gap-1 group"
              >
                <span>Customer Ledger</span>
                <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
              </button>
              <span className="text-[11px] text-slate-400">Debt Recovery</span>
            </div>
          </div>

          {/* 4. Stock Alerts */}
          <div 
            id="card-stock-health"
            className="bg-white rounded-xl border border-slate-200/90 p-4 sm:p-5 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-colors"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Stock Alerts
                </span>
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                  summary.outOfStockCount > 0
                    ? 'bg-rose-50 text-rose-600'
                    : summary.lowStockCount > 0
                    ? 'bg-amber-50 text-amber-600'
                    : 'bg-emerald-50 text-emerald-600'
                }`}>
                  <ShieldCheck className="w-4 h-4" />
                </div>
              </div>

              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-xl sm:text-2xl font-bold text-slate-900">
                    {summary.outOfStockCount + summary.lowStockCount}
                  </span>
                  <span className="text-xs font-semibold text-slate-500">alerts</span>
                </div>

                <div className="flex items-center gap-2 text-xs font-medium">
                  <span className="text-rose-600 font-bold">{summary.outOfStockCount} out of stock</span>
                  <span>•</span>
                  <span className="text-amber-600 font-bold">{summary.lowStockCount} low stock</span>
                </div>
              </div>
            </div>

            <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between">
              <button
                type="button"
                onClick={() => onNavigate('inventory')}
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 inline-flex items-center gap-1 group"
              >
                <span>Check Availability</span>
                <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
              </button>
              <span className="text-[11px] text-slate-400">Live Inventory</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3" id="executive-summary-cards">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Executive Performance & Cash Flow
        </h2>
        <span className="text-[11px] text-slate-400 font-medium">
          Amounts in Nigerian Naira (₦)
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 text-white rounded-xl border border-slate-700 p-4 sm:p-5 shadow-xs flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Current Business Funds</span>
              <WalletCards className="w-5 h-5 text-emerald-300" />
            </div>
            <div className="text-xl sm:text-2xl font-bold tracking-tight">₦{summary.currentBusinessFunds.toLocaleString()}</div>
            <div className="text-[11px] text-slate-300">
              Opening ₦{summary.openingBalance.toLocaleString()} • Capital ₦{summary.ownerCapital.toLocaleString()} • Withdrawn ₦{summary.ownerWithdrawals.toLocaleString()}
            </div>
          </div>
          <button type="button" onClick={() => onNavigate('accountability')} className="pt-3 mt-3 border-t border-slate-700 text-left text-xs font-semibold text-emerald-300 hover:text-emerald-200">Manage in Accountability →</button>
        </div>
        {/* 1. Total Sales */}
        <div 
          id="card-total-sales"
          className="bg-white rounded-xl border border-slate-200/90 p-4 sm:p-5 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-colors"
        >
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Total Sales
              </span>
              <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <ShoppingBag className="w-4 h-4" />
              </div>
            </div>

            <div className="space-y-0.5">
              <div className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                ₦{summary.totalSales.toLocaleString()}
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-bold text-[10px]">
                  {summary.transactionCount} txns
                </span>
                <span>•</span>
                <span>{summary.itemsSold.toLocaleString()} units sold</span>
              </div>
            </div>
          </div>

          <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between">
            <button
              type="button"
              onClick={() => onNavigate('sales')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 inline-flex items-center gap-1 group"
            >
              <span>View Sales</span>
              <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </button>
            <span className="text-[11px] text-slate-400">Completed only</span>
          </div>
        </div>

        {/* 2. Total Profit (Admin only) */}
        <div 
          id="card-total-profit"
          className={`bg-white rounded-xl border border-slate-200/90 p-4 sm:p-5 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-colors ${
            !isAdmin ? 'bg-slate-50/60' : ''
          }`}
        >
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Total Profit
              </span>
              <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>

            {isAdmin ? (
              <div className="space-y-0.5">
                <div className="text-xl sm:text-2xl font-bold text-emerald-700 tracking-tight">
                  ₦{summary.totalProfit.toLocaleString()}
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-bold text-[10px]">
                    {profitMargin}% margin
                  </span>
                  <span>•</span>
                  <span>Selling − Base price</span>
                </div>
              </div>
            ) : (
              <div className="py-1">
                <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-slate-200/60 text-slate-600 text-xs font-semibold rounded-md">
                  <Lock className="w-3 h-3" />
                  <span>Admin Restricted</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">Wholesale cost & profit redacted</p>
              </div>
            )}
          </div>

          <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between">
            {isAdmin ? (
              <button
                type="button"
                onClick={() => onNavigate('reports')}
                className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 inline-flex items-center gap-1 group"
              >
                <span>Profit Report</span>
                <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
              </button>
            ) : (
              <span className="text-[11px] text-slate-400">Restricted</span>
            )}
            <span className="text-[11px] text-slate-400">Historical basis</span>
          </div>
        </div>

        {/* 3. Money In */}
        <div 
          id="card-money-in"
          className="bg-white rounded-xl border border-slate-200/90 p-4 sm:p-5 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-colors"
        >
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Money In
              </span>
              <div className="w-7 h-7 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
                <ArrowDownLeft className="w-4 h-4" />
              </div>
            </div>

            <div className="space-y-0.5">
              <div className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                ₦{summary.moneyIn.toLocaleString()}
              </div>
              <div className="text-xs text-slate-500 font-medium">
                Sales payments & debt receipts
              </div>
            </div>
          </div>

          <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between">
            <button
              type="button"
              onClick={() => onNavigate('accountability')}
              className="text-xs font-semibold text-teal-600 hover:text-teal-700 inline-flex items-center gap-1 group"
            >
              <span>Accountability</span>
              <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </button>
            <span className="text-[10px] text-slate-400 font-medium bg-slate-100 px-1.5 py-0.5 rounded">
              Cash Inflow
            </span>
          </div>
        </div>

        {/* 4. Money Out */}
        <div 
          id="card-money-out"
          className="bg-white rounded-xl border border-slate-200/90 p-4 sm:p-5 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-colors"
        >
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Money Out
              </span>
              <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                <ArrowUpRight className="w-4 h-4" />
              </div>
            </div>

            <div className="space-y-0.5">
              <div className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                ₦{summary.moneyOut.toLocaleString()}
              </div>
              <div className="text-xs text-slate-500 font-medium">
                ₦{summary.totalPurchasesAmount.toLocaleString()} stock + expenses
              </div>
            </div>
          </div>

          <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between">
            <button
              type="button"
              onClick={() => onNavigate('stock-purchase')}
              className="text-xs font-semibold text-rose-600 hover:text-rose-700 inline-flex items-center gap-1 group"
            >
              <span>View Purchases</span>
              <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </button>
            <span className="text-[10px] text-slate-400 font-medium bg-slate-100 px-1.5 py-0.5 rounded">
              Disbursements
            </span>
          </div>
        </div>

        {/* 5. Net Cash Generated */}
        <div 
          id="card-net-cash-generated"
          className="bg-white rounded-xl border border-slate-200/90 p-4 sm:p-5 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-colors"
        >
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Net Cash Generated
              </span>
              <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Scale className="w-4 h-4" />
              </div>
            </div>

            <div className="space-y-0.5">
              <div className={`text-xl sm:text-2xl font-bold tracking-tight ${
                summary.netCashGenerated >= 0 ? 'text-indigo-900' : 'text-rose-600'
              }`}>
                {summary.netCashGenerated >= 0 ? '+' : '−'}₦
                {Math.abs(summary.netCashGenerated).toLocaleString()}
              </div>
              <div className="space-y-0.5 text-[11px] text-slate-500 font-medium">
                <div>
                  + Sales ₦{summary.salesCollected.toLocaleString()} + Debt ₦
                  {summary.debtRecovered.toLocaleString()}
                </div>
                <div>
                  − Stock ₦{summary.stockPurchaseSpend.toLocaleString()} − Expenses ₦
                  {summary.operatingExpenses.toLocaleString()}
                </div>
                <div>
                  − Refunds/reversals ₦{summary.cashReversals.toLocaleString()}
                </div>
                <div>
                  + Purchase refunds ₦{summary.purchaseReturns.toLocaleString()}
                </div>
              </div>
            </div>
          </div>

          <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[11px] text-amber-600 font-semibold bg-amber-50 px-1.5 py-0.5 rounded">
              Cash Generated ≠ Profit
            </span>
            <button
              type="button"
              onClick={() => onNavigate('accountability')}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 inline-flex items-center gap-1 group"
            >
              <span>Ledger</span>
              <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        </div>

        {/* 6. Outstanding Debt */}
        <div 
          id="card-outstanding-debt"
          className="bg-white rounded-xl border border-slate-200/90 p-4 sm:p-5 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-colors"
        >
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Outstanding Debt
              </span>
              <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                <AlertCircle className="w-4 h-4" />
              </div>
            </div>

            <div className="space-y-0.5">
              <div className="text-xl sm:text-2xl font-bold text-amber-700 tracking-tight">
                ₦{summary.outstandingDebt.toLocaleString()}
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 font-bold text-[10px]">
                  {summary.debtorCount} active debtors
                </span>
                <span>•</span>
                <span>Receivables</span>
              </div>
            </div>
          </div>

          <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between">
            <button
              type="button"
              onClick={() => onNavigate('customers')}
              className="text-xs font-semibold text-amber-700 hover:text-amber-800 inline-flex items-center gap-1 group"
            >
              <span>View Debtors</span>
              <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </button>
            <span className="text-[11px] text-slate-400">Current State</span>
          </div>
        </div>

        {/* 7. Inventory Value (Admin only) */}
        <div 
          id="card-inventory-value"
          className={`bg-white rounded-xl border border-slate-200/90 p-4 sm:p-5 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-colors ${
            !isAdmin ? 'bg-slate-50/60' : ''
          }`}
        >
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Inventory Value
              </span>
              <div className="w-7 h-7 rounded-lg bg-violet-50 text-violet-600 flex items-center justify-center">
                <Boxes className="w-4 h-4" />
              </div>
            </div>

            {isAdmin ? (
              <div className="space-y-0.5">
                <div className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                  ₦{summary.inventoryValue.toLocaleString()}
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                  <span className="font-semibold text-slate-700">
                    {summary.totalStockUnits.toLocaleString()} units
                  </span>
                  <span>•</span>
                  <span>Cost basis</span>
                </div>
              </div>
            ) : (
              <div className="py-1">
                <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-slate-200/60 text-slate-600 text-xs font-semibold rounded-md">
                  <Lock className="w-3 h-3" />
                  <span>Admin Restricted</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">Cost valuation protected</p>
              </div>
            )}
          </div>

          <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between">
            <button
              type="button"
              onClick={() => onNavigate('inventory')}
              className="text-xs font-semibold text-violet-600 hover:text-violet-700 inline-flex items-center gap-1 group"
            >
              <span>View Inventory</span>
              <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </button>
            <span className="text-[11px] text-slate-400 font-medium">
              Base Price × Stock
            </span>
          </div>
        </div>

        {/* 8. Stock Health / Low Stock Overview */}
        <div 
          id="card-stock-health"
          className="bg-white rounded-xl border border-slate-200/90 p-4 sm:p-5 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-colors"
        >
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Stock Alerts
              </span>
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                summary.outOfStockCount > 0
                  ? 'bg-rose-50 text-rose-600'
                  : summary.lowStockCount > 0
                  ? 'bg-amber-50 text-amber-600'
                  : 'bg-emerald-50 text-emerald-600'
              }`}>
                <ShieldCheck className="w-4 h-4" />
              </div>
            </div>

            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="text-xl sm:text-2xl font-bold text-slate-900">
                  {summary.outOfStockCount + summary.lowStockCount}
                </span>
                <span className="text-xs font-semibold text-slate-500">items need reorder</span>
              </div>

              <div className="flex items-center gap-2 text-xs font-medium">
                <span className="text-rose-600 font-bold">{summary.outOfStockCount} out of stock</span>
                <span>•</span>
                <span className="text-amber-600 font-bold">{summary.lowStockCount} low stock</span>
              </div>
            </div>
          </div>

          <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between">
            <button
              type="button"
              onClick={() => onNavigate('inventory')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 inline-flex items-center gap-1 group"
            >
              <span>Manage Stock</span>
              <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </button>
            <span className="text-[11px] text-slate-400">Real-time</span>
          </div>
        </div>
      </div>
    </div>
  );
};
