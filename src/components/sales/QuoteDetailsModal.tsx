import React, { useState } from 'react';
import {
  X,
  FileText,
  Calendar,
  User,
  CheckCircle2,
  AlertTriangle,
  RotateCw,
  Printer,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { QuoteEntity, QuoteStatus } from '../../types';
import { quoteService } from '../../services/quoteService';
import { formatNaira as formatCurrency } from '../../utils/formatters';

const formatNaira = (amount: number) => formatCurrency(amount, true);

interface QuoteDetailsModalProps {
  quote: QuoteEntity | null;
  isOpen: boolean;
  onClose: () => void;
  onConverted: (convertedSale: any) => void;
}

export const QuoteDetailsModal: React.FC<QuoteDetailsModalProps> = ({
  quote,
  isOpen,
  onClose,
  onConverted,
}) => {
  const [isConverting, setIsConverting] = useState(false);
  const [showConvertForm, setShowConvertForm] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'TRANSFER' | 'POS'>('CASH');
  const [amountPaid, setAmountPaid] = useState<string>('');
  const [serialNumbersMap, setSerialNumbersMap] = useState<Record<string, string>>({});
  const [convertError, setConvertError] = useState<string | null>(null);

  if (!isOpen || !quote) return null;

  const isExpired = quote.validUntil && new Date(quote.validUntil) < new Date() && quote.status !== 'CONVERTED';
  const canConvert = quote.status !== 'CONVERTED' && !isExpired;

  const handleStartConvert = () => {
    setAmountPaid(String(quote.totalAmount));
    setShowConvertForm(true);
    setConvertError(null);
  };

  const handleConfirmConvert = async (e: React.FormEvent) => {
    e.preventDefault();
    setConvertError(null);

    const paidNum = parseFloat(amountPaid);
    if (isNaN(paidNum) || paidNum < 0) {
      setConvertError('Please enter a valid amount paid.');
      return;
    }

    setIsConverting(true);
    try {
      const response = await quoteService.convertQuoteToSale(quote.id, {
        payment_method: paymentMethod,
        amount_paid: paidNum,
        serial_numbers_map: serialNumbersMap,
      });

      if (response.success) {
        onConverted(response.data);
        setShowConvertForm(false);
        onClose();
      } else {
        setConvertError(response.message || 'Failed to convert quote to sale.');
      }
    } catch (err: any) {
      setConvertError(err.message || 'An error occurred during conversion.');
    } finally {
      setIsConverting(false);
    }
  };

  const getStatusBadge = (status: QuoteStatus) => {
    switch (status) {
      case 'CONVERTED':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> Converted to Sale
          </span>
        );
      case 'ACCEPTED':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-300">
            Accepted
          </span>
        );
      case 'SENT':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-800 border border-purple-300">
            Sent
          </span>
        );
      case 'EXPIRED':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300 flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5" /> Expired
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-800 border border-slate-300">
            Draft
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-3xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold font-mono">{quote.quoteNumber}</h2>
                {getStatusBadge(quote.status)}
              </div>
              <p className="text-xs text-slate-400">Proforma Quotation Details</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/10 text-white/70 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Metadata Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
            <div>
              <span className="text-slate-500 font-medium block">Customer</span>
              <span className="font-bold text-slate-900">{quote.customerName || 'Walk-in'}</span>
            </div>
            <div>
              <span className="text-slate-500 font-medium block">Created Date</span>
              <span className="font-semibold text-slate-800">
                {quote.createdAt ? new Date(quote.createdAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
              </span>
            </div>
            <div>
              <span className="text-slate-500 font-medium block">Valid Until</span>
              <span className={`font-bold ${isExpired ? 'text-rose-600' : 'text-slate-900'}`}>
                {quote.validUntil ? new Date(quote.validUntil).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                {isExpired && ' (Expired)'}
              </span>
            </div>
            <div>
              <span className="text-slate-500 font-medium block">Created By</span>
              <span className="font-semibold text-slate-800">{quote.createdByName || 'Staff'}</span>
            </div>
          </div>

          {/* Items Table */}
          <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase">
                <tr>
                  <th className="py-2.5 px-3">Item / Description</th>
                  <th className="py-2.5 px-3">Brand</th>
                  <th className="py-2.5 px-3 text-center">Qty</th>
                  <th className="py-2.5 px-3 text-right">Unit Price</th>
                  <th className="py-2.5 px-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(quote.items || []).map((item, index) => (
                  <tr key={item.id || index} className="hover:bg-slate-50/50">
                    <td className="py-2.5 px-3">
                      <div className="font-bold text-slate-900">{item.itemNameSnapshot}</div>
                      {item.technicalSpecsSnapshot && (
                        <div className="text-[10px] text-slate-400">{item.technicalSpecsSnapshot}</div>
                      )}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="px-1.5 py-0.5 rounded-sm bg-slate-100 text-[10px] font-semibold text-slate-700">
                        {item.companyNameSnapshot || '—'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center font-bold text-slate-800">
                      {item.quantity} {item.unitOfMeasureSnapshot || 'PCS'}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-700">
                      {formatNaira(item.unitPrice)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                      {formatNaira(item.totalPrice)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals Summary */}
          <div className="flex justify-end">
            <div className="w-64 bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal:</span>
                <span className="font-semibold font-mono">{formatNaira(quote.subtotal)}</span>
              </div>
              {quote.discount > 0 && (
                <div className="flex justify-between text-rose-600">
                  <span>Discount:</span>
                  <span className="font-semibold font-mono">- {formatNaira(quote.discount)}</span>
                </div>
              )}
              {quote.vatAmount > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>VAT:</span>
                  <span className="font-semibold font-mono">{formatNaira(quote.vatAmount)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-extrabold text-slate-900 pt-2 border-t border-slate-300">
                <span>Total Amount:</span>
                <span className="text-blue-700 font-mono">{formatNaira(quote.totalAmount)}</span>
              </div>
            </div>
          </div>

          {/* Notes if any */}
          {quote.notes && (
            <div className="bg-amber-50/70 border border-amber-200 p-3 rounded-xl text-xs text-amber-900">
              <span className="font-bold block mb-0.5">Notes:</span>
              <p>{quote.notes}</p>
            </div>
          )}

          {/* Convert to Sale Form */}
          {showConvertForm && canConvert && (
            <form onSubmit={handleConfirmConvert} className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-xl space-y-4 animate-in fade-in">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                <h3 className="text-sm font-bold text-emerald-900">Convert Quotation to Official Sale</h3>
              </div>

              {convertError && (
                <div className="p-2 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 font-medium">
                  {convertError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Payment Method</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as any)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-semibold text-slate-800"
                  >
                    <option value="CASH">Cash</option>
                    <option value="TRANSFER">Bank Transfer</option>
                    <option value="POS">POS / Card</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Amount Paid (₦)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max={quote.totalAmount}
                    value={amountPaid}
                    onChange={(e) => setAmountPaid(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-bold font-mono text-emerald-800"
                  />
                </div>
              </div>

              {/* Optional Serial Numbers per item */}
              <div className="space-y-2 pt-2">
                <span className="text-[11px] font-bold text-slate-700 block">
                  Serial / MAC Numbers (Optional per item):
                </span>
                {(quote.items || []).map((item) => (
                  <div key={item.id} className="flex items-center gap-2 text-xs">
                    <span className="w-1/3 truncate text-slate-600 font-medium">{item.itemNameSnapshot}:</span>
                    <input
                      type="text"
                      placeholder="e.g. SN12345, MAC:00:1A:..."
                      value={serialNumbersMap[item.variantId] || ''}
                      onChange={(e) =>
                        setSerialNumbersMap((prev) => ({
                          ...prev,
                          [item.variantId]: e.target.value,
                        }))
                      }
                      className="flex-1 px-2.5 py-1.5 bg-white border border-slate-300 rounded-md text-xs font-mono"
                    />
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowConvertForm(false)}
                  className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isConverting}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all disabled:opacity-50"
                >
                  {isConverting ? (
                    <>
                      <RotateCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Converting...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Confirm & Record Sale</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 flex items-center justify-between shrink-0 bg-slate-50">
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-semibold transition-colors"
          >
            <Printer className="w-4 h-4" />
            <span>Print Proforma</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-semibold transition-colors"
            >
              Close
            </button>

            {canConvert && !showConvertForm && (
              <button
                type="button"
                onClick={handleStartConvert}
                className="inline-flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all"
              >
                <span>Convert to Sale</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

