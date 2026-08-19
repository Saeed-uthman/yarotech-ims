import React, { useState } from 'react';
import {
  AlertTriangle,
  RotateCw,
  X,
  Ban,
} from 'lucide-react';
import { StockPurchase } from '../../types';
import { purchaseService } from '../../services/purchaseService';
import { formatNaira } from '../../utils/formatters';

interface CancelPurchaseConfirmModalProps {
  purchase: StockPurchase | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (cancelledPurchase: StockPurchase) => void;
}

export const CancelPurchaseConfirmModal: React.FC<CancelPurchaseConfirmModalProps> = ({
  purchase,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !purchase) return null;

  const handleConfirmCancel = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      const res = await purchaseService.cancelPurchase(purchase.id, 'admin');
      if (res.success && res.data) {
        onSuccess(res.data);
      } else {
        setError(res.message || 'Failed to cancel purchase.');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred while cancelling the purchase.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      id="cancel-purchase-confirm-modal"
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150"
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-150 p-5 sm:p-6">
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Cancel Purchase {purchase.purchaseNumber}?
            </h3>
            <p className="text-xs text-slate-600 mt-1">
              Cancelling this stock purchase will immediately reverse the inventory additions and mark the transaction as cancelled.
            </p>
          </div>
        </div>

        {error && (
          <div className="mt-4 p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-semibold">
            {error}
          </div>
        )}

        <div className="mt-4 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1.5">
          <div className="flex justify-between">
            <span className="text-slate-500">Purchase Total:</span>
            <strong className="text-slate-900">{formatNaira(purchase.totalAmount)}</strong>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Items:</span>
            <strong className="text-slate-900">{purchase.items.length} line(s)</strong>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Recorded Date:</span>
            <strong className="text-slate-900">{purchase.purchaseDate}</strong>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl transition-colors disabled:opacity-50"
          >
            Go Back
          </button>
          <button
            id="confirm-cancel-purchase-btn"
            type="button"
            onClick={handleConfirmCancel}
            disabled={isSubmitting}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white text-xs font-bold rounded-xl shadow-xs transition-colors disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <RotateCw className="w-3.5 h-3.5 animate-spin" />
                <span>Reversing Stock...</span>
              </>
            ) : (
              <>
                <Ban className="w-3.5 h-3.5" />
                <span>Confirm Cancellation</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
