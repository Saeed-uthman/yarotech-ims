import React, { useState } from 'react';
import {
  Scale,
  Plus,
  RotateCcw,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Briefcase,
  Layers,
} from 'lucide-react';
import {
  AccountabilityFilterParams,
  AccountabilityTransaction,
  CreateExpenseInput,
  CreateBusinessFundMovementInput,
  UserRole,
} from '../../types';
import {
  useAccountabilityFeed,
  useAccountabilitySummary,
  useExpenseMutations,
} from '../../hooks/useAccountability';
import { AccountabilitySummaryCards } from './AccountabilitySummaryCards';
import { AccountabilityFilterBar } from './AccountabilityFilterBar';
import { AccountabilityFeed } from './AccountabilityFeed';
import { TransactionDetailsModal } from './TransactionDetailsModal';
import { AddExpenseModal } from './AddExpenseModal';
import { BusinessFundsModal } from './BusinessFundsModal';
import { accountabilityService } from '../../services/accountabilityService';

interface AccountabilityModuleProps {
  role?: UserRole;
  onNavigateToSource?: (
    type: 'SALE' | 'DEBT_PAYMENT' | 'STOCK_PURCHASE' | 'OTHER_EXPENSE',
    referenceId: string
  ) => void;
}

export const AccountabilityModule: React.FC<AccountabilityModuleProps> = ({
  role = 'admin',
  onNavigateToSource,
}) => {
  const currentRole: UserRole = role === 'cashier' ? 'cashier' : 'admin';

  const [filters, setFilters] = useState<AccountabilityFilterParams>({
    search: '',
    dateRange: 'today',
    direction: 'all',
    type: 'all',
    category: 'all',
    sortBy: 'date',
    sortOrder: 'desc',
    page: 1,
    limit: 100,
  });

  const [selectedTransaction, setSelectedTransaction] =
    useState<AccountabilityTransaction | null>(null);
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [isBusinessFundsOpen, setIsBusinessFundsOpen] = useState(false);
  const [toast, setToast] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // Hooks
  const {
    dateGroups,
    totalTransactions,
    isLoading: isFeedLoading,
    isSearching,
    refetch: refetchFeed,
  } = useAccountabilityFeed(filters, currentRole);

  const {
    summary,
    isLoading: isSummaryLoading,
    refetch: refetchSummary,
  } = useAccountabilitySummary(
    filters.dateRange,
    filters.startDate,
    filters.endDate,
    currentRole
  );

  const { createExpense } = useExpenseMutations(currentRole);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const handleFilterChange = (updates: Partial<AccountabilityFilterParams>) => {
    setFilters((prev) => ({ ...prev, ...updates }));
  };

  const handleResetFilters = () => {
    setFilters({
      search: '',
      dateRange: 'today',
      direction: 'all',
      type: 'all',
      category: 'all',
      sortBy: 'date',
      sortOrder: 'desc',
      page: 1,
      limit: 100,
    });
  };

  const handleRefreshAll = () => {
    refetchFeed();
    refetchSummary();
    showToast('success', 'Accountability feed updated.');
  };

  const handleAddExpenseSubmit = async (input: CreateExpenseInput) => {
    const res = await createExpense(input);
    if (res.success) {
      showToast(
        'success',
        `Expense of ₦${input.amount.toLocaleString()} recorded successfully.`
      );
      refetchFeed();
      refetchSummary();
      return { success: true };
    } else {
      return { success: false, error: res.error };
    }
  };

  const handleBusinessFundsSubmit = async (input: CreateBusinessFundMovementInput) => {
    try {
      const response = await accountabilityService.createBusinessFundMovement(input);
      showToast('success', response.message || 'Business funds updated successfully.');
      refetchFeed();
      refetchSummary();
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error?.message || 'Could not update business funds.' };
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 pb-24">
      {/* Toast Notification */}
      {toast && (
        <div
          id="accountability-toast"
          className={`fixed bottom-20 right-5 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg border text-sm font-medium animate-in slide-in-from-bottom duration-200 ${
            toast.type === 'success'
              ? 'bg-emerald-900 text-white border-emerald-700'
              : 'bg-rose-900 text-white border-rose-700'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-300 shrink-0" />
          )}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-xs">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                Accountability
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                Transparent chronological log of all money in & money out
              </p>
            </div>
          </div>
        </div>

        {/* Header Action Buttons */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            id="btn-manage-business-funds"
            onClick={() => setIsBusinessFundsOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-xs transition-colors"
          >
            <Briefcase className="w-4 h-4" />
            <span>Business Funds</span>
          </button>

          <button
            type="button"
            id="btn-refresh-accountability"
            onClick={handleRefreshAll}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg shadow-xs transition-colors"
            title="Refresh transactions"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <button
            type="button"
            id="btn-add-expense"
            onClick={() => setIsAddExpenseOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-purple-700 hover:bg-purple-800 rounded-lg shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Record Expense</span>
          </button>
        </div>
      </div>

      {/* Financial Summary KPI Cards */}
      <AccountabilitySummaryCards
        summary={summary}
        isLoading={isSummaryLoading}
      />

      {/* Filter and Search Controls */}
      <AccountabilityFilterBar
        filters={filters}
        onFilterChange={handleFilterChange}
        onResetFilters={handleResetFilters}
        isSearching={isSearching}
        totalResults={totalTransactions}
      />

      {/* Chronological Date-Grouped Transaction Feed */}
      <AccountabilityFeed
        dateGroups={dateGroups}
        isLoading={isFeedLoading}
        isSearching={isSearching}
        onViewDetails={(tx) => setSelectedTransaction(tx)}
        onNavigateToSource={onNavigateToSource}
        role={role}
        onResetFilters={handleResetFilters}
      />

      {/* Transaction Details Modal */}
      {selectedTransaction && (
        <TransactionDetailsModal
          transaction={selectedTransaction}
          onClose={() => setSelectedTransaction(null)}
          onNavigateToSource={onNavigateToSource}
          role={role}
        />
      )}

      {/* Add Operating Expense Modal */}
      {isAddExpenseOpen && (
        <AddExpenseModal
          isOpen={isAddExpenseOpen}
          onClose={() => setIsAddExpenseOpen(false)}
          onSubmit={handleAddExpenseSubmit}
          role={role}
        />
      )}

      {isBusinessFundsOpen && (
        <BusinessFundsModal
          isOpen={isBusinessFundsOpen}
          openingBalanceRecorded={summary?.openingBalanceRecorded || false}
          availableFunds={summary?.currentBusinessFunds || 0}
          onClose={() => setIsBusinessFundsOpen(false)}
          onSubmit={handleBusinessFundsSubmit}
        />
      )}
    </div>
  );
};
