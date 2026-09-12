import React, { useState } from 'react';
import {
  X,
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  CreditCard,
  Edit2,
  UserX,
  UserCheck,
  AlertCircle,
  Clock,
  ShoppingBag,
  Receipt,
  FileText,
  TrendingUp,
  CheckCircle2,
  RotateCw,
} from 'lucide-react';
import { Customer, CustomerSale, CustomerDebtPayment, UserRole } from '../../types';
import { formatNaira, formatNumber } from '../../utils/formatters';

interface CustomerProfileModalProps {
  customer: Customer | null;
  error?: string | null;
  sales: CustomerSale[];
  debtPayments: CustomerDebtPayment[];
  isOpen: boolean;
  isLoading: boolean;
  isSalesLoading: boolean;
  isDebtLoading: boolean;
  currentRole: UserRole;
  onClose: () => void;
  onRecordPayment: (customer: Customer) => void;
  onEditCustomer: (customer: Customer) => void;
  onToggleStatus: (customer: Customer) => void;
  onRefresh: () => void;
}

export const CustomerProfileModal: React.FC<CustomerProfileModalProps> = ({
  customer,
  error,
  sales,
  debtPayments,
  isOpen,
  isLoading,
  isSalesLoading,
  isDebtLoading,
  currentRole,
  onClose,
  onRecordPayment,
  onEditCustomer,
  onToggleStatus,
  onRefresh,
}) => {
  const [activeTab, setActiveTab] = useState<'sales' | 'debt' | 'details'>('sales');

  if (!isOpen || !customer) return null;

  const hasDebt = customer.outstandingDebt > 0;
  const isInactive = customer.status === 'Inactive';

  return (
    <div
      id="customer-profile-modal-overlay"
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="customer-profile-modal-dialog"
        className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
      >
        {/* Modal Top Header */}
        <div className="bg-slate-900 text-white p-4 sm:p-6 flex items-start justify-between">
          <div className="flex items-start space-x-3.5 sm:space-x-4">
            <div
              className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center font-bold text-lg sm:text-xl shrink-0 shadow-md ${
                hasDebt
                  ? 'bg-amber-500 text-slate-950 ring-2 ring-amber-300'
                  : isInactive
                  ? 'bg-slate-700 text-slate-300'
                  : 'bg-blue-600 text-white'
              }`}
            >
              {customer.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                  {customer.name}
                </h2>
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                    customer.status === 'Active'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : 'bg-slate-700 text-slate-300 border border-slate-600'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      customer.status === 'Active' ? 'bg-emerald-400' : 'bg-slate-400'
                    }`}
                  />
                  {customer.status} Customer
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-slate-300">
                <a
                  href={customer.phone ? `tel:${customer.phone || 'No phone number'}` : undefined}
                  className="inline-flex items-center gap-1 text-slate-200 hover:text-white font-mono hover:underline"
                >
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  {customer.phone || 'No phone number'}
                </a>

                {customer.email && (
                  <a
                    href={`mailto:${customer.email}`}
                    className="inline-flex items-center gap-1 text-slate-300 hover:text-white hover:underline"
                  >
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    {customer.email}
                  </a>
                )}

                {customer.address && (
                  <span className="inline-flex items-center gap-1 text-slate-300 truncate max-w-xs">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    {customer.address}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onRefresh}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
              title="Refresh customer profile"
            >
              <RotateCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-blue-400' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
              title="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Financial KPI Highlights Bar */}
        <div className="bg-slate-50 border-b border-slate-200 p-4 sm:px-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Total Purchases */}
            <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-xs">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Total Purchases
              </p>
              <p className="text-base sm:text-lg font-bold text-slate-800 mt-0.5">
                {formatNaira(customer.totalPurchases)}
              </p>
              <p className="text-[10px] text-slate-500">{customer.salesCount} total sales</p>
            </div>

            {/* Total Initial Debt */}
            <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-xs">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Total Credit
              </p>
              <p className="text-base sm:text-lg font-bold text-slate-700 mt-0.5">
                {formatNaira(customer.totalDebt)}
              </p>
              <p className="text-[10px] text-slate-500">Cumulative credit issued</p>
            </div>

            {/* Amount Paid Towards Debt */}
            <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-xs">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Debt Paid
              </p>
              <p className="text-base sm:text-lg font-bold text-emerald-700 mt-0.5">
                {formatNaira(customer.amountPaid)}
              </p>
              <p className="text-[10px] text-slate-500">
                {debtPayments.length} payment record{debtPayments.length === 1 ? '' : 's'}
              </p>
            </div>

            {/* Outstanding Balance */}
            <div
              className={`p-3 rounded-lg border shadow-xs ${
                hasDebt
                  ? 'bg-amber-50/80 border-amber-300'
                  : 'bg-emerald-50/50 border-emerald-200'
              }`}
            >
              <p
                className={`text-[11px] font-bold uppercase tracking-wider ${
                  hasDebt ? 'text-amber-800' : 'text-emerald-700'
                }`}
              >
                Outstanding Debt
              </p>
              <p
                className={`text-base sm:text-lg font-bold mt-0.5 ${
                  hasDebt ? 'text-amber-950' : 'text-emerald-800'
                }`}
              >
                {formatNaira(customer.outstandingDebt)}
              </p>
              {hasDebt ? (
                <button
                  onClick={() => onRecordPayment(customer)}
                  className="text-[11px] text-amber-900 font-bold underline hover:text-amber-950 mt-0.5 block text-left"
                >
                  Pay Debt &rarr;
                </button>
              ) : (
                <p className="text-[10px] text-emerald-700">Account settled</p>
              )}
            </div>
          </div>
        </div>

        {/* Action Toolbar */}
        <div className="px-4 sm:px-6 py-2.5 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
          {/* Tabs */}
          <div className="flex items-center gap-1 sm:gap-2">
            <button
              onClick={() => setActiveTab('sales')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors ${
                activeTab === 'sales'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              Sales History ({sales.length})
            </button>

            <button
              onClick={() => setActiveTab('debt')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors ${
                activeTab === 'debt'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Receipt className="w-3.5 h-3.5" />
              Debt Payments ({debtPayments.length})
            </button>

            <button
              onClick={() => setActiveTab('details')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors ${
                activeTab === 'details'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              Customer Details
            </button>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2">
            {hasDebt && (
              <button
                onClick={() => onRecordPayment(customer)}
                className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white font-semibold text-xs rounded-lg flex items-center gap-1.5 shadow-xs transition-colors"
              >
                <CreditCard className="w-3.5 h-3.5" />
                Record Debt Payment
              </button>
            )}

            {currentRole === 'admin' && (
              <button
                onClick={() => onEditCustomer(customer)}
                className="px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium text-xs rounded-lg flex items-center gap-1.5 transition-colors"
              >
                <Edit2 className="w-3.5 h-3.5" />
                Edit
              </button>
            )}

            {currentRole === 'admin' && (
              <button
                onClick={() => onToggleStatus(customer)}
                className={`px-3 py-1.5 border text-xs rounded-lg flex items-center gap-1.5 transition-colors ${
                  customer.status === 'Active'
                    ? 'border-rose-200 text-rose-700 hover:bg-rose-50'
                    : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                }`}
              >
                {customer.status === 'Active' ? (
                  <>
                    <UserX className="w-3.5 h-3.5" />
                    Deactivate
                  </>
                ) : (
                  <>
                    <UserCheck className="w-3.5 h-3.5" />
                    Activate
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Tab Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-slate-50/50">
          {error && <div role="alert" className="mb-3 p-3 bg-rose-50 text-rose-700 text-sm rounded-lg">{error} <button type="button" onClick={onRefresh} className="underline">Retry</button></div>}
          {/* TAB 1: SALES HISTORY */}
          {activeTab === 'sales' && (
            <div>
              {isSalesLoading ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="bg-white p-4 rounded-lg border border-slate-200 animate-pulse">
                      <div className="h-4 bg-slate-200 rounded w-1/4 mb-2"></div>
                      <div className="h-3 bg-slate-100 rounded w-1/2"></div>
                    </div>
                  ))}
                </div>
              ) : sales.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-lg p-8 text-center">
                  <ShoppingBag className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-slate-700">No Sales Recorded Yet</p>
                  <p className="text-xs text-slate-500 mt-1">
                    When this customer makes purchases at POS, their sales history will appear here.
                  </p>
                </div>
              ) : (
                <div className="bg-white border border-slate-200 rounded-lg shadow-xs overflow-x-auto">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        <th className="py-3 px-4">Invoice #</th>
                        <th className="py-3 px-4">Date & Time</th>
                        <th className="py-3 px-4">Items Summary</th>
                        <th className="py-3 px-4 text-right">Total</th>
                        <th className="py-3 px-4 text-right">Paid</th>
                        <th className="py-3 px-4 text-right">Debt</th>
                        <th className="py-3 px-4 text-center">Payment Mode</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {sales.map((sale) => (
                        <tr key={sale.id} className="hover:bg-slate-50/70 transition-colors text-xs">
                          <td className="py-3 px-4 font-mono font-semibold text-slate-800">
                            {sale.invoiceNumber}
                            {sale.status === 'CANCELLED' && <span className="block text-xs text-rose-700">Cancelled</span>}
                          </td>
                          <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                            {sale.date}
                          </td>
                          <td className="py-3 px-4 text-slate-600 max-w-xs">
                            <div className="truncate font-medium text-slate-800">
                              {sale.items.map((i) => `${i.productName} (${i.quantity})`).join(', ')}
                            </div>
                            <div className="text-[11px] text-slate-400">
                              {sale.items.length} product{sale.items.length === 1 ? '' : 's'}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-right font-semibold text-slate-800 whitespace-nowrap">
                            {formatNaira(sale.total, true)}
                          </td>
                          <td className="py-3 px-4 text-right text-emerald-700 font-medium whitespace-nowrap">
                            {formatNaira(sale.amountPaid, true)}
                          </td>
                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            {sale.outstandingAmount > 0 ? (
                              <span className="font-bold text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                                {formatNaira(sale.outstandingAmount, true)}
                              </span>
                            ) : (
                              <span className="text-slate-400">₦0</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center whitespace-nowrap">
                            <span
                              className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                sale.paymentMethod === 'CREDIT'
                                  ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                  : sale.paymentMethod === 'SPLIT'
                                  ? 'bg-purple-100 text-purple-800 border border-purple-200'
                                  : 'bg-slate-100 text-slate-700 border border-slate-200'
                              }`}
                            >
                              {sale.paymentMethod}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: DEBT PAYMENTS LEDGER */}
          {activeTab === 'debt' && (
            <div>
              {isDebtLoading ? (
                <div className="space-y-3">
                  {[...Array(2)].map((_, i) => (
                    <div key={i} className="bg-white p-4 rounded-lg border border-slate-200 animate-pulse">
                      <div className="h-4 bg-slate-200 rounded w-1/4 mb-2"></div>
                      <div className="h-3 bg-slate-100 rounded w-1/2"></div>
                    </div>
                  ))}
                </div>
              ) : debtPayments.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-lg p-8 text-center">
                  <Receipt className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-slate-700">No Debt Payment Records</p>
                  <p className="text-xs text-slate-500 mt-1">
                    No debt settlements have been recorded for this customer account.
                  </p>
                </div>
              ) : (
                <div className="bg-white border border-slate-200 rounded-lg shadow-xs overflow-x-auto">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        <th className="py-3 px-4">Receipt #</th>
                        <th className="py-3 px-4">Date & Time</th>
                        <th className="py-3 px-4">Method</th>
                        <th className="py-3 px-4 text-right">Balance Before</th>
                        <th className="py-3 px-4 text-right">Amount Paid</th>
                        <th className="py-3 px-4 text-right">Balance After</th>
                        <th className="py-3 px-4">Notes & Staff</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {debtPayments.map((payment) => (
                        <tr key={payment.id} className="hover:bg-slate-50/70 transition-colors text-xs">
                          <td className="py-3 px-4 font-mono font-semibold text-slate-800">
                            {payment.receiptNumber}
                          </td>
                          <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                            {payment.paymentDate}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                              {payment.paymentMethod}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right text-slate-500 whitespace-nowrap">
                            {formatNaira(payment.balanceBefore)}
                          </td>
                          <td className="py-3 px-4 text-right font-bold text-emerald-700 whitespace-nowrap">
                            +{formatNaira(payment.amount)}
                          </td>
                          <td className="py-3 px-4 text-right font-semibold text-slate-800 whitespace-nowrap">
                            {formatNaira(payment.balanceAfter)}
                          </td>
                          <td className="py-3 px-4 text-slate-600 max-w-xs">
                            {payment.referenceNotes ? (
                              <p className="truncate font-medium text-slate-700">
                                {payment.referenceNotes}
                              </p>
                            ) : null}
                            <p className="text-[11px] text-slate-400">
                              By: {payment.recordedBy}
                            </p>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: CUSTOMER DETAILS & NOTES */}
          {activeTab === 'details' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs space-y-4">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Registration & Contact Profile
                </h4>

                <div>
                  <label className="text-xs text-slate-400 block font-medium">Customer Full Name</label>
                  <p className="text-sm font-semibold text-slate-900 mt-0.5">{customer.name}</p>
                </div>

                <div>
                  <label className="text-xs text-slate-400 block font-medium">Phone Number</label>
                  <p className="text-sm font-mono text-slate-800 mt-0.5">{customer.phone || 'No phone number'}</p>
                </div>

                <div>
                  <label className="text-xs text-slate-400 block font-medium">Email Address</label>
                  <p className="text-sm text-slate-800 mt-0.5">
                    {customer.email || <span className="text-slate-400 italic">Not provided</span>}
                  </p>
                </div>

                <div>
                  <label className="text-xs text-slate-400 block font-medium">Physical Address</label>
                  <p className="text-sm text-slate-800 mt-0.5">
                    {customer.address || <span className="text-slate-400 italic">Not provided</span>}
                  </p>
                </div>

                <div>
                  <label className="text-xs text-slate-400 block font-medium">Account Status</label>
                  <p className="text-sm font-medium text-slate-800 mt-0.5">{customer.status}</p>
                </div>
              </div>

              <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs space-y-4">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Internal Company Notes
                </h4>

                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 min-h-[140px]">
                  {customer.notes ? (
                    <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">
                      {customer.notes}
                    </p>
                  ) : (
                    <p className="text-xs text-slate-400 italic">
                      No internal notes recorded for this customer.
                    </p>
                  )}
                </div>

                <div className="pt-2 border-t border-slate-100 text-xs text-slate-400 space-y-1">
                  <p>Customer ID: <code className="font-mono text-slate-600">{customer.id}</code></p>
                  {customer.createdAt && (
                    <p>Created: {new Date(customer.createdAt).toLocaleDateString('en-GB')}</p>
                  )}
                  {customer.updatedAt && (
                    <p>Last Modified: {new Date(customer.updatedAt).toLocaleDateString('en-GB')}</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-100 p-3 px-6 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>Yarotech Group Customer & Debt Management</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium rounded-lg shadow-xs transition-colors"
          >
            Close Profile
          </button>
        </div>
      </div>
    </div>
  );
};
