import React, { useEffect, useState } from 'react';
import {
  X,
  Printer,
  Calendar,
  Building2,
  Layers,
  DollarSign,
  CheckCircle2,
  XCircle,
  FileText,
  Ban,
  PackageCheck,
  RotateCw,
  AlertTriangle,
} from 'lucide-react';
import { StockPurchase, SupplierPayment, UserRole } from '../../types';
import { formatNaira, formatNumber } from '../../utils/formatters';
import { purchaseService } from '../../services/purchaseService';

interface PurchaseDetailsModalProps {
  purchase: StockPurchase | null;
  isOpen: boolean;
  onClose: () => void;
  onCancelPurchase?: (purchase: StockPurchase) => void;
  onReturnPurchase?: (purchase: StockPurchase) => void;
  onSupplierPayment?: () => void;
  role: UserRole;
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
}

export const PurchaseDetailsModal: React.FC<PurchaseDetailsModalProps> = ({
  purchase,
  isOpen,
  onClose,
  onCancelPurchase,
  onReturnPurchase,
  onSupplierPayment,
  role,
  isLoading = false,
  error = null,
  onRetry,
}) => {
  const [isPrinting, setIsPrinting] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'TRANSFER' | 'POS'>('TRANSFER');
  const [paymentNote, setPaymentNote] = useState('');
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [isPaying, setIsPaying] = useState(false);
  const [supplierPayments, setSupplierPayments] = useState<SupplierPayment[]>([]);

  useEffect(() => {
    if (!isOpen || !purchase) return;
    purchaseService.getSupplierPayments(purchase.id)
      .then((response) => setSupplierPayments(response.data || []))
      .catch(() => setSupplierPayments([]));
  }, [isOpen, purchase?.id]);

  if (!isOpen) return null;
  if (isLoading || !purchase) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-900/70 flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-2xl">
          {error ? (
            <>
              <AlertTriangle className="w-8 h-8 mx-auto text-rose-600" />
              <p className="mt-3 font-bold text-slate-900">Purchase details could not be loaded</p>
              <p className="mt-1 text-xs text-slate-600">{error}</p>
              <div className="mt-4 flex justify-center gap-2">
                {onRetry && <button type="button" onClick={onRetry} className="rounded-lg bg-indigo-700 px-4 py-2 text-xs font-bold text-white">Retry</button>}
                <button type="button" onClick={onClose} className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-bold text-slate-700">Close</button>
              </div>
            </>
          ) : (
            <><RotateCw className="w-8 h-8 mx-auto animate-spin text-indigo-600" /><p className="mt-3 text-sm font-bold text-slate-900">Loading complete purchase prices…</p></>
          )}
        </div>
      </div>
    );
  }

  const isCancelled = purchase.status === 'CANCELLED';
  const totalUnits = purchase.totalUnits || purchase.items.reduce((sum, it) => sum + it.quantity, 0);

  const handlePrint = () => {
    setIsPrinting(true);
    setTimeout(() => {
      window.print();
      setIsPrinting(false);
    }, 200);
  };

  const handleSupplierPayment = async () => {
    const amount = Number(paymentAmount);
    if (!Number.isFinite(amount) || amount <= 0 || amount > purchase.outstandingAmount) {
      setPaymentError('Enter an amount greater than zero and not above the outstanding balance.');
      return;
    }
    setIsPaying(true);
    setPaymentError(null);
    try {
      await purchaseService.recordSupplierPayment(purchase.id, { amount, paymentMethod, note: paymentNote });
      setShowPaymentForm(false);
      onSupplierPayment?.();
      onClose();
    } catch (error: any) {
      setPaymentError(error.message || 'Unable to record supplier payment.');
    } finally {
      setIsPaying(false);
    }
  };

  return (
    <div
      id="purchase-details-modal"
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150"
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-xs">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold tracking-tight font-mono">
                  {purchase.purchaseNumber}
                </h2>
                {isCancelled ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1">
                    <XCircle className="w-3 h-3" />
                    Cancelled
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Completed
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-300">
                Official Stock Purchase & Inventory Restock Voucher
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              id="print-purchase-voucher-btn"
              type="button"
              onClick={handlePrint}
              className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
              title="Print Voucher"
            >
              <Printer className="w-5 h-5" />
            </button>
            <button
              id="close-purchase-details-btn"
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1 text-slate-900">
          {/* Cancelled Warning Notice */}
          {isCancelled && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center gap-2.5">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <div>
                <strong>Notice: This purchase was cancelled.</strong> All received inventory quantities were reversed from live stock.
              </div>
            </div>
          )}

          {/* Info Summary Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Purchase Date
              </div>
              <div className="font-semibold text-slate-800 mt-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>{purchase.purchaseDate}</span>
              </div>
            </div>

            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Payment Method
              </div>
              <div className="font-semibold text-slate-800 mt-1 uppercase">
                {purchase.paymentMethod || 'Not paid'}
              </div>
            </div>

            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Recorded By
              </div>
              <div className="font-semibold text-slate-800 mt-1 truncate">
                {purchase.recordedBy}
              </div>
            </div>

            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Total Restocked
              </div>
              <div className="font-bold text-indigo-700 mt-1">
                {formatNumber(totalUnits)} units
              </div>
            </div>
          </div>

          {/* Accountability Notes if available */}
          {purchase.note && (
            <div className="p-3.5 bg-indigo-50/50 rounded-xl border border-indigo-100 text-xs">
              <div className="font-bold text-indigo-900 mb-0.5 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-indigo-600" />
                <span>Accountability Note</span>
              </div>
              <p className="text-slate-700">{purchase.note}</p>
            </div>
          )}

          {/* Itemized Table */}
          <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
            <div className="bg-slate-100 px-4 py-2.5 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center justify-between">
              <span>Itemized Consignment Medicines</span>
              <span>{purchase.items.length} line(s)</span>
            </div>

            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-2.5 px-4">#</th>
                  <th className="py-2.5 px-4">Medicine & Manufacturer</th>
                  <th className="py-2.5 px-4 text-center">Quantity</th>
                  <th className="py-2.5 px-4 text-right">Unit Base Price</th>
                  <th className="py-2.5 px-4 text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {purchase.items.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50">
                    <td className="py-3 px-4 text-slate-400 font-mono">{idx + 1}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">{item.productName}</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                          {item.companyName}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center font-bold text-slate-800">
                      {formatNumber(item.quantity)} units
                    </td>
                    <td className="py-3 px-4 text-right text-slate-600 font-medium">
                      {formatNaira(item.unitPurchasePrice)}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-indigo-950">
                      {formatNaira(item.subtotal || item.quantity * item.unitPurchasePrice)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Grand Total Breakdown */}
          {supplierPayments.length > 0 && (
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <div className="px-4 py-2 bg-slate-100 text-xs font-bold text-slate-700">Supplier Payment History</div>
              <div className="divide-y divide-slate-100">
                {supplierPayments.map((payment) => (
                  <div key={payment.id} className="px-4 py-2 flex justify-between text-xs">
                    <span>{payment.paymentNumber} · {new Date(payment.paymentDate).toLocaleDateString('en-NG')} · {payment.paymentMethod}</span>
                    <strong>{formatNaira(payment.amount)}</strong>
                  </div>
                ))}
              </div>
            </div>
          )}

          {showPaymentForm && purchase.outstandingAmount > 0 && (
            <div className="p-4 rounded-xl border border-indigo-200 bg-indigo-50 space-y-3">
              <div className="font-bold text-sm text-indigo-950">Pay Supplier</div>
              {paymentError && <div className="text-xs text-rose-700">{paymentError}</div>}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input type="number" min="0.01" max={purchase.outstandingAmount} step="0.01"
                  value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder={`Maximum ${purchase.outstandingAmount.toFixed(2)}`}
                  className="px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900" />
                <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as typeof paymentMethod)}
                  className="px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900">
                  <option value="TRANSFER">Bank Transfer</option><option value="CASH">Cash</option><option value="POS">POS / Card</option>
                </select>
              </div>
              <input value={paymentNote} onChange={(e) => setPaymentNote(e.target.value)} placeholder="Payment note (optional)"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900" />
              <div className="flex gap-2 justify-end">
                <button onClick={() => setShowPaymentForm(false)} className="px-3 py-2 text-xs font-semibold">Cancel</button>
                <button onClick={handleSupplierPayment} disabled={isPaying}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold disabled:opacity-50">
                  {isPaying ? 'Recording...' : 'Record Payment'}
                </button>
              </div>
            </div>
          )}

          <div className="bg-slate-900 text-white rounded-xl p-4 sm:p-5 flex items-center justify-between">
            <div>
              <div className="text-xs text-slate-400 uppercase tracking-wider font-semibold">
                Purchase Payment · {purchase.paymentStatus}
              </div>
              <div className="text-[11px] text-slate-300 mt-0.5">
                Paid {formatNaira(purchase.amountPaid)} · Outstanding {formatNaira(purchase.outstandingAmount)}
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              {formatNaira(purchase.amountPaid)}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 border-t border-slate-200 px-5 py-4 flex items-center justify-between shrink-0">
          <div>
            <div className="flex items-center gap-2">
            {!isCancelled && purchase.outstandingAmount > 0 && (
              <button type="button" onClick={() => setShowPaymentForm(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-50 border border-indigo-200 rounded-lg">
                <DollarSign className="w-3.5 h-3.5" /> Pay Supplier
              </button>
            )}
            {!isCancelled && onReturnPurchase && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onReturnPurchase(purchase);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-50 border border-amber-200 rounded-lg transition-colors"
              >
                <RotateCw className="w-3.5 h-3.5" />
                <span>Return Stock</span>
              </button>
            )}
            {!isCancelled && onCancelPurchase && (
              <button
                id="details-cancel-purchase-btn"
                type="button"
                onClick={() => {
                  onClose();
                  onCancelPurchase(purchase);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-lg transition-colors"
              >
                <Ban className="w-3.5 h-3.5" />
                <span>Cancel Order</span>
              </button>
            )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-semibold rounded-xl transition-colors"
            >
              <Printer className="w-4 h-4" />
              <span>Print Slip</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-xl transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
