import React from 'react';
import {
  Phone,
  CreditCard,
  Eye,
  Edit2,
  AlertCircle,
  Clock,
  ChevronLeft,
  ChevronRight,
  FileText,
  User,
} from 'lucide-react';
import { Customer, UserRole } from '../../types';
import { formatNaira } from '../../utils/formatters';

interface CustomerCardListProps {
  customers: Customer[];
  isLoading: boolean;
  currentRole: UserRole;
  currentPage: number;
  totalPages: number;
  totalCount: number;
  onPageChange: (page: number) => void;
  onViewProfile: (customer: Customer) => void;
  onRecordPayment: (customer: Customer) => void;
  onEditCustomer: (customer: Customer) => void;
  onToggleStatus: (customer: Customer) => void;
}

export const CustomerCardList: React.FC<CustomerCardListProps> = ({
  customers,
  isLoading,
  currentRole,
  currentPage,
  totalPages,
  totalCount,
  onPageChange,
  onViewProfile,
  onRecordPayment,
  onEditCustomer,
  onToggleStatus,
}) => {
  if (isLoading && customers.length === 0) {
    return (
      <div className="space-y-3">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="bg-white border border-slate-200 rounded-lg p-4 animate-pulse shadow-xs"
          >
            <div className="flex justify-between items-start mb-3">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-slate-200 rounded-full"></div>
                <div>
                  <div className="h-4 bg-slate-200 rounded w-32 mb-1.5"></div>
                  <div className="h-3 bg-slate-100 rounded w-24"></div>
                </div>
              </div>
              <div className="h-5 bg-slate-100 rounded-full w-14"></div>
            </div>
            <div className="h-12 bg-slate-50 rounded-lg mb-3"></div>
            <div className="h-8 bg-slate-100 rounded w-full"></div>
          </div>
        ))}
      </div>
    );
  }

  if (customers.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-lg p-8 text-center shadow-xs">
        <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
          <User className="w-6 h-6" />
        </div>
        <h3 className="text-base font-semibold text-slate-800 mb-1">No customers found</h3>
        <p className="text-sm text-slate-500 max-w-xs mx-auto">
          No customer records match your filter criteria.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {customers.map((customer) => {
        const hasDebt = customer.outstandingDebt > 0;
        const isInactive = customer.status === 'Inactive';

        return (
          <div
            key={customer.id}
            id={`customer-mobile-card-${customer.id}`}
            className={`bg-white border rounded-lg p-4 shadow-xs transition-all ${
              hasDebt
                ? 'border-amber-300 ring-1 ring-amber-200/50'
                : isInactive
                ? 'border-slate-200 opacity-80'
                : 'border-slate-200'
            }`}
          >
            {/* Header: Avatar, Name, Phone & Status */}
            <div className="flex items-start justify-between gap-2 mb-3">
              <div className="flex items-center space-x-3 min-w-0">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${
                    hasDebt
                      ? 'bg-amber-100 text-amber-900 ring-1 ring-amber-300'
                      : isInactive
                      ? 'bg-slate-100 text-slate-500'
                      : 'bg-blue-100 text-blue-700'
                  }`}
                >
                  {customer.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h4
                      onClick={() => onViewProfile(customer)}
                      className="font-semibold text-slate-900 truncate hover:text-blue-600 cursor-pointer"
                    >
                      {customer.name}
                    </h4>
                    {customer.notes && (
                      <span title={customer.notes} className="text-slate-400">
                        <FileText className="w-3.5 h-3.5" />
                      </span>
                    )}
                  </div>
                  <a
                    href={customer.phone ? `tel:${customer.phone || 'No phone number'}` : undefined}
                    className="text-xs text-slate-500 hover:text-blue-600 inline-flex items-center gap-1 font-mono mt-0.5"
                  >
                    <Phone className="w-3 h-3 text-slate-400" />
                    {customer.phone || 'No phone number'}
                  </a>
                </div>
              </div>

              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium shrink-0 ${
                  customer.status === 'Active'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-slate-100 text-slate-600 border border-slate-200'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    customer.status === 'Active' ? 'bg-emerald-500' : 'bg-slate-400'
                  }`}
                />
                {customer.status}
              </span>
            </div>

            {/* Financial Summary Box */}
            <div className="grid grid-cols-2 gap-2 bg-slate-50 rounded-lg p-2.5 mb-3 text-xs">
              <div>
                <p className="text-[11px] text-slate-400 font-medium">Total Purchases</p>
                <p className="font-bold text-slate-800 mt-0.5">
                  {formatNaira(customer.totalPurchases)}
                </p>
                <p className="text-[10px] text-slate-400">{customer.salesCount} orders</p>
              </div>

              <div>
                <p className="text-[11px] text-slate-400 font-medium">Outstanding Debt</p>
                {hasDebt ? (
                  <p className="font-bold text-amber-900 inline-flex items-center gap-1 mt-0.5">
                    <AlertCircle className="w-3 h-3 text-amber-600" />
                    {formatNaira(customer.outstandingDebt)}
                  </p>
                ) : (
                  <p className="font-medium text-slate-500 mt-0.5">₦0</p>
                )}
                {customer.lastPurchaseDate && (
                  <p className="text-[10px] text-slate-400 truncate">
                    Last: {customer.lastPurchaseDate.split(',')[0]}
                  </p>
                )}
              </div>
            </div>

            {/* Action Buttons (Touch target >= 44px) */}
            <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
              <button
                id={`btn-mobile-view-profile-${customer.id}`}
                onClick={() => onViewProfile(customer)}
                className="flex-1 min-h-[44px] py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs rounded-lg flex items-center justify-center gap-1.5 transition-colors"
              >
                <Eye className="w-4 h-4" />
                Profile
              </button>

              {hasDebt && (
                <button
                  id={`btn-mobile-pay-debt-${customer.id}`}
                  onClick={() => onRecordPayment(customer)}
                  className="flex-1 min-h-[44px] py-2 px-3 bg-amber-500 hover:bg-amber-600 text-white font-semibold text-xs rounded-lg flex items-center justify-center gap-1.5 shadow-xs transition-colors"
                >
                  <CreditCard className="w-4 h-4" />
                  Pay Debt
                </button>
              )}

              {currentRole === 'admin' && (
                <button
                  id={`btn-mobile-edit-${customer.id}`}
                  onClick={() => onEditCustomer(customer)}
                  className="min-h-[44px] min-w-[44px] p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg flex items-center justify-center transition-colors"
                  title="Edit Customer"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        );
      })}

      {/* Pagination Footer */}
      <div className="p-3 bg-white border border-slate-200 rounded-lg flex items-center justify-between text-xs text-slate-600 shadow-xs">
        <span>
          Page {currentPage} of {totalPages || 1} ({totalCount} total)
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage <= 1 || isLoading}
            className="min-h-[38px] px-3 py-1.5 border border-slate-200 rounded hover:bg-slate-50 disabled:opacity-40"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage >= totalPages || isLoading}
            className="min-h-[38px] px-3 py-1.5 border border-slate-200 rounded hover:bg-slate-50 disabled:opacity-40"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
