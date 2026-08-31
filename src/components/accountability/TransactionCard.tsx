import React from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Receipt,
  ShoppingCart,
  Users,
  Briefcase,
  ChevronRight,
  User,
  Clock,
  ExternalLink,
  WalletCards,
} from 'lucide-react';
import { AccountabilityTransaction, UserRole } from '../../types';

interface TransactionCardProps {
  transaction: AccountabilityTransaction;
  onViewDetails: (transaction: AccountabilityTransaction) => void;
  onNavigateToSource?: (
    type: 'SALE' | 'DEBT_PAYMENT' | 'STOCK_PURCHASE' | 'OTHER_EXPENSE',
    referenceId: string
  ) => void;
  role?: UserRole;
}

export const TransactionCard: React.FC<TransactionCardProps> = ({
  transaction,
  onViewDetails,
  onNavigateToSource,
  role = 'admin',
}) => {
  const isIncome = transaction.direction === 'IN';

  // Determine icon & theme based on type
  const getTypeConfig = () => {
    switch (transaction.type) {
      case 'SALE':
        return {
          icon: Receipt,
          badgeBg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
          label: 'Sale',
          sourcePrefix: 'Sale',
        };
      case 'DEBT_PAYMENT':
        return {
          icon: Users,
          badgeBg: 'bg-blue-50 text-blue-800 border-blue-200',
          label: 'Debt Recovery',
          sourcePrefix: 'Payment',
        };
      case 'STOCK_PURCHASE':
        return {
          icon: ShoppingCart,
          badgeBg: 'bg-amber-50 text-amber-800 border-amber-200',
          label: 'Stock Purchase',
          sourcePrefix: 'Purchase',
        };
      case 'OPENING_BALANCE':
        return { icon: WalletCards, badgeBg: 'bg-cyan-50 text-cyan-800 border-cyan-200', label: 'Opening Balance', sourcePrefix: 'Funds' };
      case 'OWNER_CAPITAL':
        return { icon: WalletCards, badgeBg: 'bg-emerald-50 text-emerald-800 border-emerald-200', label: 'Owner Capital', sourcePrefix: 'Funds' };
      case 'OWNER_WITHDRAWAL':
        return { icon: WalletCards, badgeBg: 'bg-rose-50 text-rose-800 border-rose-200', label: 'Owner Withdrawal', sourcePrefix: 'Funds' };
      case 'OTHER_EXPENSE':
      default:
        return {
          icon: Briefcase,
          badgeBg: 'bg-purple-50 text-purple-800 border-purple-200',
          label: `Expense • ${transaction.category}`,
          sourcePrefix: 'Expense',
        };
    }
  };

  const typeConfig = getTypeConfig();
  const IconComponent = typeConfig.icon;

  return (
    <div
      id={`accountability-card-${transaction.id}`}
      onClick={() => onViewDetails(transaction)}
      className="group relative bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-xs hover:shadow-md hover:border-slate-300 transition-all cursor-pointer focus-within:ring-2 focus-within:ring-emerald-500"
    >
      <div className="flex items-start justify-between gap-3">
        {/* Left: Direction Icon & Transaction Details */}
        <div className="flex items-start gap-3.5 min-w-0 flex-1">
          {/* Direction Indicator Visual + Text */}
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 font-bold ${
              isIncome
                ? 'bg-emerald-100/70 text-emerald-700 border border-emerald-200'
                : 'bg-rose-100/70 text-rose-700 border border-rose-200'
            }`}
            title={isIncome ? 'Money Received (IN)' : 'Money Spent (OUT)'}
          >
            {isIncome ? (
              <ArrowDownLeft className="w-5 h-5" />
            ) : (
              <ArrowUpRight className="w-5 h-5" />
            )}
          </div>

          {/* Core Info */}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-1">
              {/* Direction text badge */}
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold uppercase tracking-wider ${
                  isIncome
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-rose-50 text-rose-800 border border-rose-200'
                }`}
              >
                {isIncome ? 'IN' : 'OUT'}
              </span>

              {/* Type Badge */}
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-medium border ${typeConfig.badgeBg}`}
              >
                <IconComponent className="w-3 h-3 shrink-0" />
                <span className="truncate">{typeConfig.label}</span>
              </span>

              {/* Reference ID Pill */}
              <span className="inline-flex items-center text-xs font-mono font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                {transaction.referenceNumber}
              </span>
            </div>

            {/* Main Description */}
            <h4 className="text-sm sm:text-base font-semibold text-slate-900 leading-snug truncate">
              {transaction.description}
            </h4>

            {/* Secondary Metadata: Timestamp, Staff, Payment Method */}
            <div className="flex flex-wrap items-center gap-y-1 gap-x-3 text-xs text-slate-500 mt-2">
              <span className="inline-flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                {transaction.date}
              </span>

              <span className="inline-flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-slate-400" />
                <span className="truncate max-w-[140px]">
                  {transaction.recordedBy.replace('Pharm. ', '')}
                </span>
              </span>

              <span className="inline-flex items-center text-[11px] font-semibold tracking-wider text-slate-600 uppercase bg-slate-50 border border-slate-200 px-1.5 py-0.5 rounded">
                {transaction.paymentMethod}
              </span>
            </div>
          </div>
        </div>

        {/* Right: Amount & Quick View Action */}
        <div className="text-right shrink-0 flex flex-col items-end justify-between self-stretch">
          <div>
            <div
              className={`text-base sm:text-lg font-bold tracking-tight font-mono ${
                isIncome ? 'text-emerald-700' : 'text-slate-900'
              }`}
            >
              {isIncome ? '+' : '−'}₦{transaction.amount.toLocaleString()}
            </div>
            <div className="text-[11px] text-slate-400 font-medium font-mono">
              {transaction.transactionNumber}
            </div>
          </div>

          <div className="flex items-center gap-1.5 mt-2">
            {onNavigateToSource && transaction.type !== 'OTHER_EXPENSE' && (
              <button
                type="button"
                id={`btn-source-${transaction.id}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onNavigateToSource(transaction.type, transaction.referenceId);
                }}
                className="hidden sm:inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 rounded border border-transparent hover:border-emerald-200 transition-colors"
                title="Open Source Transaction"
              >
                <ExternalLink className="w-3 h-3" />
                <span>Source</span>
              </button>
            )}

            <button
              type="button"
              className="p-1 text-slate-400 group-hover:text-slate-700 transition-colors rounded hover:bg-slate-100"
              aria-label="View transaction details"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
