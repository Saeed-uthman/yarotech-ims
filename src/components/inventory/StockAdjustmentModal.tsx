import React, { useState, useEffect } from 'react';
import { 
  X, 
  Sliders, 
  ShieldCheck, 
  AlertTriangle, 
  Plus, 
  Minus, 
  Hash, 
  ArrowLeft,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { InventoryItem, StockAdjustmentInput, UserRole } from '../../types';
import { formatCurrencyNaira, formatNumber } from '../../utils/formatters';

interface StockAdjustmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: InventoryItem | null;
  onConfirm: (input: StockAdjustmentInput) => Promise<void>;
  currentRole: UserRole;
}

const REASON_OPTIONS = [
  'Damaged Stock',
  'Lost Stock',
  'Physical Count Correction',
  'Data Correction',
  'Other',
];

export const StockAdjustmentModal: React.FC<StockAdjustmentModalProps> = ({
  isOpen,
  onClose,
  item,
  onConfirm,
  currentRole,
}) => {
  const [step, setStep] = useState<'input' | 'confirm'>('input');
  const [adjustmentType, setAdjustmentType] = useState<'SET_EXACT' | 'INCREMENT' | 'DECREMENT'>('SET_EXACT');
  const [quantityInput, setQuantityInput] = useState<string>('');
  const [reason, setReason] = useState<string>(REASON_OPTIONS[0]);
  const [otherDescription, setOtherDescription] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (item && isOpen) {
      setStep('input');
      setAdjustmentType('SET_EXACT');
      setQuantityInput(item.currentStock.toString());
      setReason(REASON_OPTIONS[0]);
      setOtherDescription('');
      setFormError(null);
      setIsSubmitting(false);
    }
  }, [item, isOpen]);

  if (!isOpen || !item) return null;

  const isAdmin = currentRole === 'admin';
  const prevStock = item.currentStock;
  const parsedQty = parseInt(quantityInput, 10);
  const validQty = isNaN(parsedQty) ? 0 : Math.max(0, parsedQty);

  let calculatedNewStock = prevStock;
  let adjustmentDelta = 0;

  if (adjustmentType === 'SET_EXACT') {
    calculatedNewStock = validQty;
    adjustmentDelta = validQty - prevStock;
  } else if (adjustmentType === 'INCREMENT') {
    calculatedNewStock = prevStock + validQty;
    adjustmentDelta = validQty;
  } else if (adjustmentType === 'DECREMENT') {
    calculatedNewStock = prevStock - validQty;
    adjustmentDelta = -validQty;
  }

  // Handle Proceed to Confirmation step
  const handleProceedToConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!isAdmin) {
      setFormError('Security Restriction: Only administrators can adjust physical inventory levels.');
      return;
    }

    if (isNaN(parsedQty) || parsedQty < 0) {
      setFormError('Please enter a valid non-negative integer quantity.');
      return;
    }

    if (calculatedNewStock < 0) {
      setFormError(`Invalid adjustment: Resulting stock cannot be negative (calculated: ${calculatedNewStock}). Current stock is ${prevStock}.`);
      return;
    }

    if (adjustmentDelta === 0) {
      setFormError('The adjusted quantity is identical to current stock. No change to apply.');
      return;
    }

    if (reason === 'Other' && !otherDescription.trim()) {
      setFormError('When selecting "Other", please specify a descriptive reason.');
      return;
    }

    setStep('confirm');
  };

  // Final confirmation execution
  const handleFinalSubmit = async () => {
    setFormError(null);
    setIsSubmitting(true);

    try {
      const finalReason = reason === 'Other' 
        ? `Other: ${otherDescription.trim()}`
        : reason;

      await onConfirm({
        productVariantId: item.id,
        adjustmentType,
        adjustmentQuantity: validQty,
        reason: finalReason,
        customNotes: otherDescription.trim() ? otherDescription.trim() : undefined,
        adminName: 'Pharm. Abdullahi (Admin)',
      });
      onClose();
    } catch (err: any) {
      setFormError(err.message || 'Failed to apply stock adjustment. Original stock maintained.');
      setIsSubmitting(false);
      setStep('input');
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 leading-none">
                {step === 'input' ? 'Adjust Physical Stock' : 'Confirm Stock Adjustment'}
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                {step === 'input' 
                  ? 'Accountable inventory count modification' 
                  : 'Review changes before applying to inventory ledger'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* STEP 1: INPUT FORM */}
        {step === 'input' ? (
          <form onSubmit={handleProceedToConfirm} className="p-5 space-y-4">
            {/* Target Variant Identity Card */}
            <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-1.5">
              <div className="flex items-start justify-between">
                <div>
                  <span className="font-bold text-slate-900 text-sm block">
                    {item.productName}
                  </span>
                  <span className="text-slate-500">
                    {item.genericName} • {item.dosage} ({item.form})
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-bold border border-blue-200/80">
                  {item.companyName}
                </span>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-200/80 font-mono">
                <span className="text-slate-600">Current Stock On Hand:</span>
                <span className="font-bold text-slate-900 text-sm">
                  {formatNumber(item.currentStock)} units
                </span>
              </div>

              {isAdmin && (
                <div className="flex items-center justify-between text-slate-500 font-mono text-[11px]">
                  <span>Base Unit Cost:</span>
                  <span>{formatCurrencyNaira(item.basePrice)}</span>
                </div>
              )}
            </div>

            {/* Adjustment Mode Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Adjustment Method
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setAdjustmentType('SET_EXACT');
                    setQuantityInput(prevStock.toString());
                  }}
                  className={`py-2 px-2.5 rounded-lg border text-xs font-bold flex flex-col items-center gap-1 transition-all ${
                    adjustmentType === 'SET_EXACT'
                      ? 'bg-blue-50 border-blue-500 text-blue-700 ring-2 ring-blue-500/20'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Hash className="w-3.5 h-3.5" />
                  <span>Exact Count</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setAdjustmentType('INCREMENT');
                    setQuantityInput('10');
                  }}
                  className={`py-2 px-2.5 rounded-lg border text-xs font-bold flex flex-col items-center gap-1 transition-all ${
                    adjustmentType === 'INCREMENT'
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-700 ring-2 ring-emerald-500/20'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add (+)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setAdjustmentType('DECREMENT');
                    setQuantityInput('5');
                  }}
                  className={`py-2 px-2.5 rounded-lg border text-xs font-bold flex flex-col items-center gap-1 transition-all ${
                    adjustmentType === 'DECREMENT'
                      ? 'bg-rose-50 border-rose-500 text-rose-700 ring-2 ring-rose-500/20'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Minus className="w-3.5 h-3.5" />
                  <span>Deduct (-)</span>
                </button>
              </div>
            </div>

            {/* Quantity Input */}
            <div>
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1.5">
                {adjustmentType === 'SET_EXACT'
                  ? 'New Exact Physical Count (Units)'
                  : adjustmentType === 'INCREMENT'
                  ? 'Quantity to Add (Units)'
                  : 'Quantity to Deduct (Units)'}
              </label>
              <input
                type="number"
                min="0"
                required
                value={quantityInput}
                onChange={(e) => setQuantityInput(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-mono font-bold text-base focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                placeholder="e.g. 95"
              />
            </div>

            {/* Real-time Calculation Summary (Current -> Adjustment -> New) */}
            <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-lg flex items-center justify-between text-xs font-mono">
              <div>
                <span className="text-slate-500 block text-[11px]">Current Stock:</span>
                <span className="font-bold text-slate-700">{formatNumber(prevStock)}</span>
              </div>
              <div className="text-center font-sans">
                <span className="text-slate-400 text-xs">➔</span>
                <span className={`block font-bold text-xs ${adjustmentDelta > 0 ? 'text-emerald-700' : adjustmentDelta < 0 ? 'text-rose-700' : 'text-slate-600'}`}>
                  {adjustmentDelta > 0 ? `+${adjustmentDelta}` : adjustmentDelta < 0 ? adjustmentDelta : '0'}
                </span>
              </div>
              <div className="text-right">
                <span className="text-slate-500 block text-[11px]">Resulting Stock:</span>
                <span className={`font-bold text-sm ${calculatedNewStock < 0 ? 'text-rose-700' : 'text-blue-900'}`}>
                  {formatNumber(calculatedNewStock)}
                </span>
              </div>
            </div>

            {/* Adjustment Reasons */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Reason for Adjustment <span className="text-rose-600">*</span>
              </label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                required
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium text-slate-800 focus:bg-white focus:ring-1 focus:ring-blue-500 focus:outline-none cursor-pointer"
              >
                {REASON_OPTIONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            {/* Description when 'Other' is selected */}
            {reason === 'Other' && (
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Specify Reason Description <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Broken packaging quarantine or physical count re-audit"
                  value={otherDescription}
                  onChange={(e) => setOtherDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 focus:bg-white focus:ring-1 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            )}

            {/* Error Message */}
            {formError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors"
              >
                Review Adjustment
              </button>
            </div>
          </form>
        ) : (
          /* STEP 2: CONCISE CONFIRMATION DIALOG */
          <div className="p-5 space-y-4">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3 text-xs">
              <p className="text-xs font-medium text-slate-600">
                You are about to adjust:
              </p>
              <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                <span className="font-bold text-slate-900 text-sm block">
                  {item.productName} — <span className="text-blue-700">{item.companyName}</span>
                </span>
                <span className="text-slate-500 text-[11px]">
                  {item.genericName} • {item.dosage} ({item.form})
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 font-mono text-center pt-2">
                <div className="p-2 bg-white rounded border border-slate-200">
                  <span className="text-slate-500 text-[10px] uppercase block font-sans">Current Stock</span>
                  <span className="font-bold text-slate-800 text-sm">{formatNumber(prevStock)}</span>
                </div>
                <div className="p-2 bg-white rounded border border-slate-200">
                  <span className="text-slate-500 text-[10px] uppercase block font-sans">Adjustment</span>
                  <span className={`font-bold text-sm ${adjustmentDelta > 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                    {adjustmentDelta > 0 ? `+${adjustmentDelta}` : adjustmentDelta}
                  </span>
                </div>
                <div className="p-2 bg-blue-50 rounded border border-blue-200">
                  <span className="text-blue-700 text-[10px] uppercase block font-sans">New Stock</span>
                  <span className="font-bold text-blue-900 text-sm">{formatNumber(calculatedNewStock)}</span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200">
                <span className="text-slate-500 text-[11px] block">Reason:</span>
                <span className="font-bold text-slate-800 text-xs">
                  {reason === 'Other' ? `Other (${otherDescription.trim()})` : reason}
                </span>
              </div>
            </div>

            {/* Error in confirmation */}
            {formError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {/* Confirmation Buttons */}
            <div className="flex items-center justify-between gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => setStep('input')}
                className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors flex items-center gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back / Edit</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={onClose}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  id="confirm-stock-adjustment-btn"
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleFinalSubmit}
                  className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg shadow-xs flex items-center gap-1.5 transition-colors"
                >
                  {isSubmitting ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      <span>Applying...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Confirm Adjustment</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
