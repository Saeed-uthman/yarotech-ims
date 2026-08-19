import React from 'react';
import {
  AccountabilityDateGroup,
  AccountabilityTransaction,
  UserRole,
} from '../../types';
import { TransactionCard } from './TransactionCard';
import { Calendar, FileQuestion, ArrowDownLeft, ArrowUpRight } from 'lucide-react';

interface AccountabilityFeedProps {
  dateGroups: AccountabilityDateGroup[];
  isLoading: boolean;
  isSearching: boolean;
  onViewDetails: (transaction: AccountabilityTransaction) => void;
  onNavigateToSource?: (
    type: 'SALE' | 'DEBT_PAYMENT' | 'STOCK_PURCHASE' | 'OTHER_EXPENSE',
    referenceId: string
  ) => void;
  role?: UserRole;
  onResetFilters?: () => void;
}

export const AccountabilityFeed: React.FC<AccountabilityFeedProps> = ({
  dateGroups,
  isLoading,
  isSearching,
  onViewDetails,
  onNavigateToSource,
  role = 'admin',
  onResetFilters,
}) => {
  if (isLoading && !dateGroups.length) {
    return (
      <div className="space-y-6">
        {[1, 2].map((group) => (
          <div key={group} className="space-y-3">
            <div className="h-6 bg-slate-200 rounded w-40 animate-pulse" />
            <div className="space-y-2.5">
              {[1, 2, 3].map((card) => (
                <div
                  key={card}
                  className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 h-24 animate-pulse"
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!dateGroups.length) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-8 sm:p-12 text-center my-6">
        <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
          <FileQuestion className="w-6 h-6" />
        </div>
        <h3 className="text-base font-semibold text-slate-800 mb-1">
          No transactions found
        </h3>
        <p className="text-sm text-slate-500 max-w-sm mx-auto mb-4">
          No financial movements recorded for this search or period.
        </p>
        {onResetFilters && (
          <button
            type="button"
            onClick={onResetFilters}
            className="px-4 py-2 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors border border-emerald-200"
          >
            Reset Filters
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      {dateGroups.map((group) => (
        <section
          key={group.rawDate}
          id={`date-group-${group.rawDate}`}
          className="space-y-3"
        >
          {/* Group Header: Date label and day summary */}
          <div className="sticky top-16 z-10 bg-slate-50/95 backdrop-blur-xs py-2 px-1 flex flex-wrap items-center justify-between gap-2 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-500" />
              <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-800">
                {group.dateLabel}
              </h3>
              <span className="text-xs text-slate-400 font-medium font-mono">
                ({group.transactions.length})
              </span>
            </div>

            {/* Daily Net Movement Pill */}
            <div className="flex items-center gap-3 text-xs font-mono">
              <span className="inline-flex items-center gap-0.5 text-emerald-700 font-semibold">
                <ArrowDownLeft className="w-3 h-3" />
                +₦{group.groupMoneyIn.toLocaleString()}
              </span>
              <span className="text-slate-300">•</span>
              <span className="inline-flex items-center gap-0.5 text-slate-700 font-semibold">
                <ArrowUpRight className="w-3 h-3" />
                −₦{group.groupMoneyOut.toLocaleString()}
              </span>
              <span className="text-slate-300">•</span>
              <span
                className={`font-bold px-1.5 py-0.5 rounded text-[11px] ${
                  group.groupNet >= 0
                    ? 'bg-slate-200/80 text-slate-800'
                    : 'bg-amber-100 text-amber-900'
                }`}
              >
                Net: {group.groupNet >= 0 ? '+' : '−'}₦
                {Math.abs(group.groupNet).toLocaleString()}
              </span>
            </div>
          </div>

          {/* List of cards for this date */}
          <div className="space-y-2.5">
            {group.transactions.map((transaction) => (
              <TransactionCard
                key={transaction.id}
                transaction={transaction}
                onViewDetails={onViewDetails}
                onNavigateToSource={onNavigateToSource}
                role={role}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
};
