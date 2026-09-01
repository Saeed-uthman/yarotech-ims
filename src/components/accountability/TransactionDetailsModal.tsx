import React from 'react';
import {
  X,
  ArrowDownLeft,
  ArrowUpRight,
  Receipt,
  ShoppingCart,
  Users,
  Briefcase,
  ExternalLink,
  Calendar,
  User,
  CreditCard,
  Building2,
  FileText,
  Printer,
  ShieldCheck,
  Tag,
} from 'lucide-react';
import { AccountabilityTransaction, UserRole } from '../../types';

interface TransactionDetailsModalProps {
  transaction: AccountabilityTransaction | null;
  onClose: () => void;
  onNavigateToSource?: (
    type: 'SALE' | 'DEBT_PAYMENT' | 'STOCK_PURCHASE' | 'OTHER_EXPENSE',
    referenceId: string
  ) => void;
  role?: UserRole;
}

export const TransactionDetailsModal: React.FC<
  TransactionDetailsModalProps
> = ({ transaction, onClose, onNavigateToSource, role = 'admin' }) => {
  if (!transaction) return null;

  const isIncome = transaction.direction === 'IN';

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div
        className="relative bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 sm:px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold shrink-0 ${
                isIncome
                  ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                  : 'bg-rose-100 text-rose-700 border border-rose-200'
              }`}
            >
              {isIncome ? (
                <ArrowDownLeft className="w-5 h-5" />
              ) : (
                <ArrowUpRight className="w-5 h-5" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-slate-500">
                  {transaction.transactionNumber}
                </span>
                <span
                  className={`text-[11px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                    isIncome
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-rose-100 text-rose-800'
                  }`}
                >
                  {isIncome ? 'Money In' : 'Money Out'}
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900">
                Transaction Audit Details
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5">
          {/* Main Amount & Category Banner */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                Transaction Amount
              </span>
              <div
                className={`text-2xl sm:text-3xl font-extrabold font-mono ${
                  isIncome ? 'text-emerald-700' : 'text-slate-900'
                }`}
              >
                {isIncome ? '+' : '−'}₦{transaction.amount.toLocaleString()}
              </div>
            </div>

            <div className="sm:text-right">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                Category
              </span>
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-800 bg-white border border-slate-300 px-2.5 py-1 rounded-md">
                <Tag className="w-3.5 h-3.5 text-slate-500" />
                {transaction.category}
              </span>
            </div>
          </div>

          {/* Core Metadata Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white p-3 border border-slate-100 rounded-xl text-xs">
            <div>
              <span className="text-slate-400 block mb-0.5">Source Reference</span>
              <span className="font-mono font-bold text-slate-800">
                {transaction.referenceNumber}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block mb-0.5">Date & Time</span>
              <span className="font-medium text-slate-800">{transaction.date}</span>
            </div>
            <div>
              <span className="text-slate-400 block mb-0.5">Payment Method</span>
              <span className="font-semibold text-slate-800 uppercase">
                {transaction.paymentMethod}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block mb-0.5">Recorded By</span>
              <span className="font-medium text-slate-800">
                {transaction.recordedBy}
              </span>
            </div>
          </div>

          {/* Description & Notes */}
          <div className="space-y-1.5">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Description & Purpose
            </h4>
            <p className="text-sm font-medium text-slate-800 bg-slate-50 p-3 rounded-lg border border-slate-200">
              {transaction.description}
            </p>
            {transaction.note && (
              <p className="text-xs text-slate-600 italic bg-amber-50/60 p-2.5 rounded border border-amber-200/60">
                <strong>Audit Note:</strong> {transaction.note}
              </p>
            )}
          </div>

          {/* Source Specific Details */}
          {transaction.type === 'STOCK_PURCHASE' && (
            <div className="space-y-2 pt-2 border-t border-slate-200">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <ShoppingCart className="w-3.5 h-3.5 text-amber-600" />
                  Itemized Stock Intake ({transaction.sourceDetails?.itemCount || 0} Products)
                </h4>
                {transaction.sourceDetails?.totalUnits && (
                  <span className="text-xs font-medium text-slate-500">
                    Total Units: {transaction.sourceDetails.totalUnits}
                  </span>
                )}
              </div>

              {transaction.sourceDetails?.items && transaction.sourceDetails.items.length > 0 ? (
                <div className="border border-slate-200 rounded-lg overflow-hidden text-xs">
                  <table className="w-full text-left">
                    <thead className="bg-slate-100 text-slate-600 uppercase font-semibold">
                      <tr>
                        <th className="p-2.5">Product & Brand</th>
                        <th className="p-2.5 text-center">Qty</th>
                        <th className="p-2.5 text-right">Cost Price</th>
                        <th className="p-2.5 text-right">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {transaction.sourceDetails.items.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="p-2.5">
                            <span className="font-semibold text-slate-800 block">
                              {item.name}
                            </span>
                            <span className="text-slate-500 text-[11px]">
                              {item.company} {item.dosage ? `• ${item.dosage}` : ''}
                            </span>
                          </td>
                          <td className="p-2.5 text-center font-mono font-medium">
                            {item.quantity}
                          </td>
                          <td className="p-2.5 text-right font-mono text-slate-600">
                            ₦{item.unitPrice.toLocaleString()}
                          </td>
                          <td className="p-2.5 text-right font-mono font-bold text-slate-900">
                            ₦{item.subtotal.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}
            </div>
          )}

          {transaction.type === 'SALE' && (
            <div className="space-y-2 pt-2 border-t border-slate-200">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Receipt className="w-3.5 h-3.5 text-emerald-600" />
                  Sold Products
                </h4>
                {transaction.customerName && (
                  <span className="text-xs font-medium text-slate-600">
                    Customer: <strong className="text-slate-800">{transaction.customerName}</strong>
                  </span>
                )}
              </div>

              {transaction.sourceDetails?.items && transaction.sourceDetails.items.length > 0 ? (
                <div className="border border-slate-200 rounded-lg overflow-hidden text-xs">
                  <table className="w-full text-left">
                    <thead className="bg-slate-100 text-slate-600 uppercase font-semibold">
                      <tr>
                        <th className="p-2.5">Product</th>
                        <th className="p-2.5 text-center">Qty</th>
                        <th className="p-2.5 text-right">Price</th>
                        <th className="p-2.5 text-right">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {transaction.sourceDetails.items.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="p-2.5">
                            <span className="font-semibold text-slate-800 block">
                              {item.name}
                            </span>
                            <span className="text-slate-500 text-[11px]">
                              {item.company}
                            </span>
                          </td>
                          <td className="p-2.5 text-center font-mono font-medium">
                            {item.quantity}
                          </td>
                          <td className="p-2.5 text-right font-mono text-slate-600">
                            ₦{item.unitPrice.toLocaleString()}
                          </td>
                          <td className="p-2.5 text-right font-mono font-bold text-slate-900">
                            ₦{item.subtotal.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}
            </div>
          )}

          {transaction.type === 'DEBT_PAYMENT' && (
            <div className="space-y-3 pt-2 border-t border-slate-200">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-blue-600" />
                Customer Debt Settlement
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-blue-50/50 p-3 rounded-lg border border-blue-100 text-xs">
                <div>
                  <span className="text-slate-500 block">Customer</span>
                  <span className="font-bold text-slate-800">
                    {transaction.customerName}
                  </span>
                  {transaction.sourceDetails?.customerPhone && (
                    <span className="text-[11px] text-slate-500 block">
                      {transaction.sourceDetails.customerPhone}
                    </span>
                  )}
                </div>
                {transaction.sourceDetails?.previousBalance !== undefined && (
                  <div>
                    <span className="text-slate-500 block">Previous Balance</span>
                    <span className="font-mono font-semibold text-slate-800">
                      ₦{transaction.sourceDetails.previousBalance.toLocaleString()}
                    </span>
                  </div>
                )}
                {transaction.sourceDetails?.newBalance !== undefined && (
                  <div>
                    <span className="text-slate-500 block">New Remaining Balance</span>
                    <span className="font-mono font-bold text-blue-700">
                      ₦{transaction.sourceDetails.newBalance.toLocaleString()}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-5 sm:px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1 text-xs text-slate-500">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Traceable Audit Record</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print</span>
            </button>

            {onNavigateToSource && transaction.type !== 'OTHER_EXPENSE' && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onNavigateToSource(transaction.type, transaction.referenceId);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors shadow-xs"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Go to Source Module</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
