import React from 'react';
import {
  User,
  Phone,
  CreditCard,
  Eye,
  Edit2,
  UserX,
  UserCheck,
  AlertCircle,
  Clock,
  ArrowRight,
  FileText,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Customer, UserRole } from '../../types';
import { formatNaira, formatNumber } from '../../utils/formatters';

interface CustomerTableProps {
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

export const CustomerTable: React.FC<CustomerTableProps> = ({
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
      <div className="bg-white border border-slate-200 rounded-lg shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50/50">
          <div className="h-4 bg-slate-200 rounded w-48 animate-pulse"></div>
        </div>
        <div className="divide-y divide-slate-100">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="p-4 flex items-center justify-between animate-pulse">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 bg-slate-200 rounded-full"></div>
                <div>
                  <div className="h-4 bg-slate-200 rounded w-36 mb-1.5"></div>
                  <div className="h-3 bg-slate-100 rounded w-24"></div>
                </div>
              </div>
              <div className="h-4 bg-slate-200 rounded w-24"></div>
              <div className="h-4 bg-slate-200 rounded w-20"></div>
              <div className="h-6 bg-slate-100 rounded-full w-16"></div>
              <div className="h-8 bg-slate-100 rounded w-24"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (customers.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-lg p-12 text-center shadow-xs">
        <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
          <User className="w-6 h-6" />
        </div>
        <h3 className="text-base font-semibold text-slate-800 mb-1">No customers found</h3>
        <p className="text-sm text-slate-500 max-w-sm mx-auto">
          No customer records match your current search or filter criteria. Try adjusting your filters.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-xs overflow-hidden flex flex-col">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm border-collapse">
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <th className="py-3.5 px-4">Customer</th>
              <th className="py-3.5 px-4">Phone</th>
              <th className="py-3.5 px-4 text-right">Total Purchases</th>
              <th className="py-3.5 px-4 text-right">Outstanding Debt</th>
              <th className="py-3.5 px-4 text-center">Status</th>
              <th className="py-3.5 px-4">Last Activity</th>
              <th className="py-3.5 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {customers.map((customer) => {
              const hasDebt = customer.outstandingDebt > 0;
              const isInactive = customer.status === 'Inactive';

              return (
                <tr
                  key={customer.id}
                  id={`customer-row-${customer.id}`}
                  className={`hover:bg-slate-50/70 transition-colors ${
                    isInactive ? 'bg-slate-50/40 opacity-75' : ''
                  }`}
                >
                  {/* Customer Info */}
                  <td className="py-3.5 px-4">
                    <div className="flex items-center space-x-3">
                      <div
                        className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                          hasDebt
                            ? 'bg-amber-100 text-amber-800 ring-1 ring-amber-300'
                            : isInactive
                            ? 'bg-slate-100 text-slate-500'
                            : 'bg-blue-100 text-blue-700'
                        }`}
                      >
                        {customer.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => onViewProfile(customer)}
                            className="font-semibold text-slate-800 hover:text-blue-600 transition-colors text-left truncate"
                          >
                            {customer.name}
                          </button>
                          {customer.notes && (
                            <span
                              title={`Note: ${customer.notes}`}
                              className="text-slate-400 hover:text-slate-600"
                            >
                              <FileText className="w-3 h-3" />
                            </span>
                          )}
                        </div>
                        {customer.address ? (
                          <p className="text-xs text-slate-400 truncate max-w-[200px]">
                            {customer.address}
                          </p>
                        ) : customer.email ? (
                          <p className="text-xs text-slate-400 truncate max-w-[200px]">
                            {customer.email}
                          </p>
                        ) : (
                          <p className="text-[11px] text-slate-400 italic">No address</p>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Phone */}
                  <td className="py-3.5 px-4 font-mono text-xs text-slate-700 whitespace-nowrap">
                    <a
                      href={`tel:${customer.phone}`}
                      className="inline-flex items-center gap-1.5 hover:text-blue-600 transition-colors"
                      title="Call customer"
                    >
                      <Phone className="w-3 h-3 text-slate-400" />
                      {customer.phone}
                    </a>
                  </td>

                  {/* Total Purchases */}
                  <td className="py-3.5 px-4 text-right font-medium text-slate-800 whitespace-nowrap">
                    <div>{formatNaira(customer.totalPurchases)}</div>
                    <div className="text-[11px] text-slate-400 font-normal">
                      {customer.salesCount} order{customer.salesCount === 1 ? '' : 's'}
                    </div>
                  </td>

                  {/* Outstanding Debt */}
                  <td className="py-3.5 px-4 text-right whitespace-nowrap">
                    {hasDebt ? (
                      <div className="inline-flex flex-col items-end">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
                          <AlertCircle className="w-3 h-3 text-amber-700" />
                          {formatNaira(customer.outstandingDebt)}
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400 font-medium">₦0</span>
                    )}
                  </td>

                  {/* Status */}
                  <td className="py-3.5 px-4 text-center whitespace-nowrap">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${
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
                  </td>

                  {/* Last Activity */}
                  <td className="py-3.5 px-4 text-xs text-slate-500 whitespace-nowrap">
                    {customer.lastPurchaseDate ? (
                      <div className="flex items-center gap-1 text-slate-600">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>{customer.lastPurchaseDate}</span>
                      </div>
                    ) : (
                      <span className="text-slate-400 italic">No purchases yet</span>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="py-3.5 px-4 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1">
                      {/* View Profile */}
                      <button
                        id={`btn-view-customer-${customer.id}`}
                        onClick={() => onViewProfile(customer)}
                        className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        title="View Customer Profile"
                      >
                        <Eye className="w-4 h-4" />
                      </button>

                      {/* Record Debt Payment (if debt > 0) */}
                      {hasDebt && (
                        <button
                          id={`btn-record-debt-payment-${customer.id}`}
                          onClick={() => onRecordPayment(customer)}
                          className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold text-amber-900 bg-amber-100 hover:bg-amber-200 border border-amber-300 rounded transition-colors"
                          title="Record Debt Payment"
                        >
                          <CreditCard className="w-3 h-3 text-amber-800" />
                          Pay Debt
                        </button>
                      )}

                      {/* Edit Customer */}
                      <button
                        id={`btn-edit-customer-${customer.id}`}
                        onClick={() => onEditCustomer(customer)}
                        className="p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded transition-colors"
                        title="Edit Customer"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      {/* Activate/Deactivate */}
                      <button
                        id={`btn-toggle-status-${customer.id}`}
                        onClick={() => onToggleStatus(customer)}
                        className={`p-1.5 rounded transition-colors ${
                          customer.status === 'Active'
                            ? 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                            : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'
                        }`}
                        title={
                          customer.status === 'Active'
                            ? 'Deactivate Customer'
                            : 'Activate Customer'
                        }
                      >
                        {customer.status === 'Active' ? (
                          <UserX className="w-3.5 h-3.5" />
                        ) : (
                          <UserCheck className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="py-3 px-4 bg-slate-50/50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
        <div>
          Showing{' '}
          <strong className="font-semibold text-slate-800">
            {Math.min(totalCount, (currentPage - 1) * 10 + 1)}-
            {Math.min(totalCount, currentPage * 10)}
          </strong>{' '}
          of <strong className="font-semibold text-slate-800">{totalCount}</strong> customers
        </div>

        <div className="flex items-center gap-1.5">
          <button
            id="btn-customer-page-prev"
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage <= 1 || isLoading}
            className="p-1.5 border border-slate-200 rounded hover:bg-white disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
            title="Previous page"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>

          <span className="px-2.5 py-1 text-xs font-medium">
            Page {currentPage} of {totalPages || 1}
          </span>

          <button
            id="btn-customer-page-next"
            onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage >= totalPages || isLoading}
            className="p-1.5 border border-slate-200 rounded hover:bg-white disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
            title="Next page"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
