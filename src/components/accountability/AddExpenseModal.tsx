import React, { useState } from 'react';
import {
  X,
  Briefcase,
  AlertCircle,
  Loader2,
  CheckCircle2,
  DollarSign,
  FileText,
  Tag,
  CreditCard,
} from 'lucide-react';
import {
  CreateExpenseInput,
  ExpenseCategory,
  AccountabilityPaymentMethod,
  UserRole,
} from '../../types';

interface AddExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (input: CreateExpenseInput) => Promise<{ success: boolean; error?: string }>;
  role?: UserRole;
}

export const AddExpenseModal: React.FC<AddExpenseModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  role = 'admin',
}) => {
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('Transport');
  const [amount, setAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] =
    useState<AccountabilityPaymentMethod>('CASH');
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  if (!isOpen) return null;

  const categories: { id: ExpenseCategory; label: string }[] = [
    { id: 'Transport', label: 'Transport & Logistics' },
    { id: 'Utilities', label: 'Utilities (Power / Diesel / Internet)' },
    { id: 'Stationery', label: 'Stationery & Packaging Bags' },
    { id: 'Maintenance', label: 'Maintenance & Repairs' },
    { id: 'Other', label: 'Other Operating Expense' },
  ];

  const paymentMethods: { id: AccountabilityPaymentMethod; label: string }[] = [
    { id: 'CASH', label: 'Cash' },
    { id: 'TRANSFER', label: 'Bank Transfer' },
    { id: 'POS', label: 'POS Terminal' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    // Validation
    const trimmedDesc = description.trim();
    if (!trimmedDesc) {
      setValidationError('Please enter a description for this expense.');
      return;
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setValidationError('Please enter a valid expense amount greater than ₦0.');
      return;
    }

    setValidationError(null);
    setIsSubmitting(true);

    try {
      const res = await onSubmit({
        description: trimmedDesc,
        category,
        amount: Math.round(numAmount),
        paymentMethod,
        note: note.trim() || undefined,
        recordedBy: role === 'admin' ? 'Pharm. Abdullahi (Admin)' : 'Staff',
      });

      if (res.success) {
        // Reset form and close
        setDescription('');
        setCategory('Transport');
        setAmount('');
        setPaymentMethod('CASH');
        setNote('');
        onClose();
      } else {
        setValidationError(res.error || 'Failed to record expense.');
      }
    } catch (err: any) {
      setValidationError(err.message || 'An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div
        className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 sm:px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 border border-purple-200 flex items-center justify-center font-bold shrink-0">
              <Briefcase className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900">
                Record Operating Expense
              </h3>
              <p className="text-xs text-slate-500">
                Log authorized pharmacy expenditure for cash accountability
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200/60 transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4">
          {validationError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-2 text-xs text-rose-800">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{validationError}</span>
            </div>
          )}

          {/* Description */}
          <div className="space-y-1">
            <label
              htmlFor="expense-description"
              className="text-xs font-semibold text-slate-700 flex items-center gap-1"
            >
              <FileText className="w-3.5 h-3.5 text-slate-500" />
              Expense Purpose & Description *
            </label>
            <input
              id="expense-description"
              type="text"
              required
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                setValidationError(null);
              }}
              placeholder="e.g., Generator diesel fueling, Dispatch bike transport, Receipt rolls..."
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white transition-all"
            />
          </div>

          {/* Category & Amount Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Category */}
            <div className="space-y-1">
              <label
                htmlFor="expense-category"
                className="text-xs font-semibold text-slate-700 flex items-center gap-1"
              >
                <Tag className="w-3.5 h-3.5 text-slate-500" />
                Category *
              </label>
              <select
                id="expense-category"
                value={category}
                onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white transition-all"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Amount */}
            <div className="space-y-1">
              <label
                htmlFor="expense-amount"
                className="text-xs font-semibold text-slate-700 flex items-center gap-1"
              >
                <DollarSign className="w-3.5 h-3.5 text-slate-500" />
                Amount (₦) *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-mono font-semibold text-sm">
                  ₦
                </span>
                <input
                  id="expense-amount"
                  type="number"
                  required
                  min="1"
                  step="1"
                  value={amount}
                  onChange={(e) => {
                    setAmount(e.target.value);
                    setValidationError(null);
                  }}
                  placeholder="0.00"
                  className="w-full pl-8 pr-3 py-2 text-sm font-mono font-bold bg-slate-50 border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white transition-all"
                />
              </div>
            </div>
          </div>

          {/* Payment Method */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
              <CreditCard className="w-3.5 h-3.5 text-slate-500" />
              Paid Via *
            </label>
            <div className="grid grid-cols-3 gap-2">
              {paymentMethods.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  id={`btn-paymethod-${m.id}`}
                  onClick={() => setPaymentMethod(m.id)}
                  className={`py-2 px-3 text-xs font-semibold rounded-lg border text-center transition-all ${
                    paymentMethod === m.id
                      ? 'bg-purple-50 text-purple-800 border-purple-300 shadow-xs'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Optional Note */}
          <div className="space-y-1">
            <label
              htmlFor="expense-note"
              className="text-xs font-semibold text-slate-700"
            >
              Audit Note / Vendor Details (Optional)
            </label>
            <textarea
              id="expense-note"
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Receipt voucher #4491, technician phone number..."
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white transition-all resize-none"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              id="btn-submit-expense"
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-purple-700 hover:bg-purple-800 rounded-lg transition-colors shadow-xs disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Recording...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Save Expense (₦{amount ? parseFloat(amount).toLocaleString() : '0'})</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
