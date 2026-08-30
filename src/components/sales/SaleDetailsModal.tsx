import React from 'react';
import {
  X,
  Receipt,
  User,
  Calendar,
  DollarSign,
  AlertCircle,
  CheckCircle2,
  Package,
  TrendingUp,
  CreditCard,
  Building2,
  FileText,
} from 'lucide-react';
import { Sale, UserRole } from '../../types';
import { formatNaira } from '../../utils/formatters';

interface SaleDetailsModalProps {
  sale: Sale | null;
  isOpen: boolean;
  onClose: () => void;
  onPrintReceipt: (sale: Sale) => void;
  onNavigateToCustomer?: (customerId: string) => void;
  onReturnSale?: (sale: Sale) => void;
  role: UserRole;
}

export const SaleDetailsModal: React.FC<SaleDetailsModalProps> = ({
  sale,
  isOpen,
  onClose,
  onPrintReceipt,
  onNavigateToCustomer,
  role,
  onReturnSale,
}) => {
  if (!isOpen || !sale) return null;

  const isAdmin = role === 'admin';
  const isWalking = !sale.customerId;
  const hasOutstanding = sale.outstandingAmount > 0;
  const isPartial = sale.paymentStatus === 'PARTIAL';
  const isUnpaid = sale.paymentStatus === 'UNPAID';

  return (
    <div
      id="sale-details-modal"
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-3xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-blue-400">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold font-mono tracking-tight text-white">
                  {sale.invoiceNumber}
                </h2>
                {sale.paymentStatus === 'PAID' ? (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    PAID
                  </span>
                ) : isPartial ? (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    PARTIAL PAYMENT
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                    UNPAID / CREDIT
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Recorded on {sale.date} • Served by: {sale.servedBy}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
          {isAdmin && sale.status !== 'CANCELLED' && onReturnSale && (
            <button type="button" onClick={() => onReturnSale(sale)} className="px-4 py-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold hover:bg-rose-100">
              Return items
            </button>
          )}
          <button
            id="close-sale-details-btn"
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Customer & Transaction Meta Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Customer Box */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                <User className="w-3.5 h-3.5" />
                <span>Customer Information</span>
              </div>

              {isWalking ? (
                <div>
                  <div className="font-semibold text-slate-800 text-sm">Walking Customer</div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Anonymous counter customer (Paid in full at checkout)
                  </p>
                </div>
              ) : (
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 text-sm">{sale.customerName}</span>
                    {onNavigateToCustomer && (
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onNavigateToCustomer(sale.customerId!);
                        }}
                        className="text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline"
                      >
                        View Profile →
                      </button>
                    )}
                  </div>
                  {sale.customerPhone && (
                    <div className="text-xs text-slate-600 font-mono mt-1">
                      Phone: {sale.customerPhone}
                    </div>
                  )}
                  <span className="inline-block mt-2 px-2 py-0.5 rounded-sm bg-blue-50 text-blue-700 text-[10px] font-semibold">
                    Registered Customer
                  </span>
                </div>
              )}
            </div>

            {/* Payment & Attribution Box */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                <CreditCard className="w-3.5 h-3.5" />
                <span>Payment & Attribution</span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-slate-500 block">Payment Method:</span>
                  <span className="font-bold text-slate-800 uppercase">{sale.paymentMethod}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Dispensed By:</span>
                  <span className="font-semibold text-slate-800">{sale.servedBy}</span>
                </div>
                {sale.notes && (
                  <div className="col-span-2 mt-1 pt-1 border-t border-slate-200">
                    <span className="text-slate-500 block">Notes:</span>
                    <span className="text-slate-700 italic">{sale.notes}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Itemized Dispensed Products Table */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Package className="w-4 h-4 text-blue-600" />
                <span>Dispensed Items ({sale.items.length})</span>
              </h3>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase">
                  <tr>
                    <th className="py-2.5 px-3.5">Product & Formulation</th>
                    <th className="py-2.5 px-3.5">Company</th>
                    <th className="py-2.5 px-3.5 text-center">Qty</th>
                    <th className="py-2.5 px-3.5 text-right">Price</th>
                    <th className="py-2.5 px-3.5 text-right">Subtotal</th>
                    {isAdmin && <th className="py-2.5 px-3.5 text-right">Base</th>}
                    {isAdmin && <th className="py-2.5 px-3.5 text-right">Profit</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sale.items.map((item, index) => (
                    <tr key={item.id || index} className="hover:bg-slate-50/60">
                      <td className="py-2.5 px-3.5">
                        <div className="font-semibold text-slate-900">{item.productName}</div>
                        <div className="text-[11px] text-slate-500 italic">
                          {item.genericName} {item.dosage ? `• ${item.dosage}` : ''}{' '}
                          {item.form ? `• ${item.form}` : ''}
                        </div>
                      </td>
                      <td className="py-2.5 px-3.5 font-medium text-slate-700">
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm bg-slate-100 text-slate-700 font-semibold text-[10px]">
                          {item.companyName}
                        </span>
                      </td>
                      <td className="py-2.5 px-3.5 text-center font-bold text-slate-900">
                        {item.quantity}
                      </td>
                      <td className="py-2.5 px-3.5 text-right text-slate-700">
                        {formatNaira(item.sellingPrice)}
                      </td>
                      <td className="py-2.5 px-3.5 text-right font-bold text-slate-900">
                        {formatNaira(item.subtotal)}
                      </td>
                      {isAdmin && (
                        <td className="py-2.5 px-3.5 text-right text-slate-500">
                          {item.basePrice !== undefined ? formatNaira(item.basePrice) : '—'}
                        </td>
                      )}
                      {isAdmin && (
                        <td className="py-2.5 px-3.5 text-right font-bold text-emerald-700">
                          {item.profit !== undefined ? formatNaira(item.profit) : '—'}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Financial Calculation Breakdown Box */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="space-y-1 text-xs">
              {isAdmin && sale.profit !== undefined && (
                <div className="flex items-center gap-2 text-indigo-900 font-semibold bg-indigo-50 border border-indigo-200 px-3 py-1.5 rounded-lg">
                  <TrendingUp className="w-4 h-4 text-indigo-600" />
                  <span>Total Gross Profit on Sale: </span>
                  <span className="font-extrabold text-indigo-700 text-sm">
                    {formatNaira(sale.profit)}
                  </span>
                </div>
              )}
              {hasOutstanding && (
                <div className="text-amber-800 text-xs font-medium flex items-center gap-1.5 mt-2">
                  <AlertCircle className="w-4 h-4 text-amber-600" />
                  <span>
                    Outstanding balance of <strong>{formatNaira(sale.outstandingAmount)}</strong> is
                    recorded against {sale.customerName}'s account debt.
                  </span>
                </div>
              )}
            </div>

            {/* Price Calculations */}
            <div className="w-full md:w-64 space-y-1.5 text-xs text-slate-600">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span className="font-semibold text-slate-800">{formatNaira(sale.subtotal)}</span>
              </div>
              {sale.discount > 0 && (
                <div className="flex justify-between text-rose-600">
                  <span>Discount:</span>
                  <span className="font-semibold">- {formatNaira(sale.discount)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-extrabold text-slate-900 pt-1.5 border-t border-slate-200">
                <span>Grand Total:</span>
                <span className="text-base">{formatNaira(sale.total)}</span>
              </div>
              <div className="flex justify-between text-emerald-700 font-semibold">
                <span>Amount Paid:</span>
                <span>{formatNaira(sale.amountPaid)}</span>
              </div>
              {hasOutstanding && (
                <div className="flex justify-between text-amber-700 font-bold pt-1 border-t border-dashed border-slate-300">
                  <span>Outstanding Balance:</span>
                  <span>{formatNaira(sale.outstandingAmount)}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-lg text-xs font-semibold transition-colors"
          >
            Close
          </button>

          <button
            id="print-receipt-from-details-btn"
            type="button"
            onClick={() => onPrintReceipt(sale)}
            className="inline-flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs"
          >
            <Receipt className="w-4 h-4" />
            <span>Print Receipt</span>
          </button>
        </div>
      </div>
    </div>
  );
};
