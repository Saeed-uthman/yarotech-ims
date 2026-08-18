import React, { useState, useEffect } from 'react';
import {
  X,
  CreditCard,
  User,
  Phone,
  AlertCircle,
  CheckCircle2,
  Receipt,
  ArrowRight,
} from 'lucide-react';
import { Customer, DebtPaymentInput, PaymentMethod } from '../../types';
import { formatNaira } from '../../utils/formatters';

interface DebtPaymentModalProps {
  customer: Customer | null;
  isOpen: boolean;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (input: DebtPaymentInput) => Promise<void>;
}

export const DebtPaymentModal: React.FC<DebtPaymentModalProps> = ({
  customer,
  isOpen,
  isSubmitting,
  onClose,
  onSubmit,
}) => {
  const [amount, setAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [referenceNotes, setReferenceNotes] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (customer && isOpen) {
      setAmount('');
      setPaymentMethod('CASH');
      setReferenceNotes('');
      setError(null);
    }
  }, [customer, isOpen]);

  if (!isOpen || !customer) return null;

  const currentOutstanding = customer.outstandingDebt;
  const numAmount = parseFloat(amount) || 0;
  const newBalance = Math.max(0, currentOutstanding - numAmount);
  const isOverpaying = numAmount > currentOutstanding;

  const handleQuickPreset = (presetAmount: number) => {
    const capped = Math.min(presetAmount, currentOutstanding);
    setAmount(String(capped));
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (numAmount <= 0) {
      setError('Payment amount must be greater than ₦0.');
      return;
    }

    if (numAmount > currentOutstanding) {
      setError(
        `Payment amount (₦${numAmount.toLocaleString()}) cannot exceed the customer's outstanding balance of ₦${currentOutstanding.toLocaleString()}.`
      );
      return;
    }

    try {
      await onSubmit({
        customerId: customer.id,
        amount: numAmount,
        paymentMethod,
        referenceNotes: referenceNotes.trim() || undefined,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to record debt payment.');
    }
  };

  return (
    <div
      id="debt-payment-modal-overlay"
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) onClose();
      }}
    >
      <div
        id="debt-payment-modal-dialog"
        className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="bg-amber-600 text-white p-4 sm:p-5 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-amber-700/80 flex items-center justify-center text-white">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Record Customer Debt Payment</h2>
              <p className="text-xs text-amber-100">
                Settle outstanding credit balance with instant ledger update
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1.5 text-amber-100 hover:text-white hover:bg-amber-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Customer & Current Balance Banner */}
        <div className="bg-amber-50/70 border-b border-amber-200 p-4 sm:px-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-full bg-amber-200 text-amber-900 font-bold text-xs flex items-center justify-center">
                {customer.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">{customer.name}</h3>
                <p className="text-xs text-slate-500 font-mono flex items-center gap-1">
                  <Phone className="w-3 h-3 text-slate-400" />
                  {customer.phone}
                </p>
              </div>
            </div>

            <div className="text-right">
              <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider block">
                Current Debt
              </span>
              <span className="text-lg sm:text-xl font-extrabold text-amber-950">
                {formatNaira(currentOutstanding)}
              </span>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-2 text-xs text-rose-700">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Payment Amount */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-slate-700">
                Amount to Pay (₦) <span className="text-rose-500">*</span>
              </label>
              <button
                type="button"
                onClick={() => handleQuickPreset(currentOutstanding)}
                className="text-xs text-blue-600 hover:text-blue-700 font-semibold"
              >
                Pay Full Balance ({formatNaira(currentOutstanding)})
              </button>
            </div>
            <div className="relative">
              <span className="text-sm font-bold text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2">
                ₦
              </span>
              <input
                id="input-debt-payment-amount"
                type="number"
                min="1"
                step="any"
                placeholder="0.00"
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value);
                  if (error) setError(null);
                }}
                className={`w-full pl-8 pr-4 py-2.5 bg-slate-50 border rounded-lg text-base font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 ${
                  isOverpaying ? 'border-rose-400 bg-rose-50/20' : 'border-slate-200'
                }`}
                autoFocus
              />
            </div>

            {/* Quick preset buttons */}
            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
              <span className="text-[11px] text-slate-400">Quick:</span>
              {[1000, 2000, 5000, 10000].map((preset) => {
                if (preset >= currentOutstanding) return null;
                return (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => handleQuickPreset(preset)}
                    className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-medium transition-colors"
                  >
                    +₦{preset.toLocaleString()}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Payment Method */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Payment Method <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'CASH', label: 'Cash' },
                { id: 'TRANSFER', label: 'Bank Transfer' },
                { id: 'POS', label: 'POS / Card' },
              ].map((method) => (
                <button
                  key={method.id}
                  type="button"
                  onClick={() => setPaymentMethod(method.id as PaymentMethod)}
                  className={`py-2 px-3 border rounded-lg text-xs font-semibold transition-all text-center ${
                    paymentMethod === method.id
                      ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {method.label}
                </button>
              ))}
            </div>
          </div>

          {/* Reference Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Payment Reference / Notes <span className="text-slate-400 font-normal">(Optional)</span>
            </label>
            <input
              id="input-debt-payment-ref"
              type="text"
              placeholder="e.g. Bank Transfer Ref, Cashier note..."
              value={referenceNotes}
              onChange={(e) => setReferenceNotes(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
            />
          </div>

          {/* Calculation Breakdown */}
          {numAmount > 0 && !isOverpaying && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-500">
                <span>Current Balance:</span>
                <span>{formatNaira(currentOutstanding)}</span>
              </div>
              <div className="flex justify-between text-emerald-700 font-medium">
                <span>Payment Amount:</span>
                <span>-{formatNaira(numAmount)}</span>
              </div>
              <div className="pt-1.5 border-t border-slate-200 flex justify-between font-bold text-slate-800">
                <span>New Remaining Debt:</span>
                <span className={newBalance === 0 ? 'text-emerald-700' : 'text-amber-900'}>
                  {newBalance === 0 ? '₦0 (Fully Settled ✓)' : formatNaira(newBalance)}
                </span>
              </div>
            </div>
          )}

          {/* Modal Buttons */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium text-xs rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              id="btn-submit-debt-payment"
              type="submit"
              disabled={isSubmitting || numAmount <= 0 || isOverpaying}
              className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-lg shadow-xs flex items-center gap-2 disabled:opacity-50 transition-colors"
            >
              <CreditCard className="w-3.5 h-3.5" />
              {isSubmitting ? 'Recording Payment...' : `Record Payment (${formatNaira(numAmount)})`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
