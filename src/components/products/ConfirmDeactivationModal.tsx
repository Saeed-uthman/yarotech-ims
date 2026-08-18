import React from 'react';
import { Power, AlertTriangle, X } from 'lucide-react';
import { Product } from '../../types';

interface ConfirmDeactivationModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isLoading?: boolean;
}

export const ConfirmDeactivationModal: React.FC<ConfirmDeactivationModalProps> = ({
  product,
  isOpen,
  onClose,
  onConfirm,
  isLoading = false,
}) => {
  if (!isOpen || !product) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="deactivate-dialog-title"
    >
      <div 
        id="deactivate-modal-card"
        className="bg-white w-full max-w-md rounded-xl border border-slate-200 shadow-xl overflow-hidden animate-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
              <Power className="w-5 h-5" />
            </div>
            <div>
              <h2 id="deactivate-dialog-title" className="text-base font-bold text-slate-900">
                Deactivate Product?
              </h2>
              <p className="text-xs text-slate-500 font-medium">Confirmation required</p>
            </div>
          </div>
          <button
            id="close-deactivate-modal-btn"
            onClick={onClose}
            disabled={isLoading}
            className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          <div className="bg-amber-50/70 border border-amber-200/80 rounded-lg p-3.5 flex items-start gap-3 text-amber-900">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-xs leading-relaxed space-y-1">
              <p className="font-semibold text-amber-950">
                <span className="font-bold">{product.name}</span> will no longer be available for new sales.
              </p>
              <p className="text-amber-800">
                Historical records, sales receipts, and previous accountability logs will remain intact.
              </p>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-1.5 text-xs text-slate-600">
            <div className="flex justify-between">
              <span className="text-slate-500">Generic Name:</span>
              <span className="font-semibold text-slate-800">{product.genericName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Category:</span>
              <span className="font-semibold text-slate-800">{product.category}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Variants:</span>
              <span className="font-semibold text-slate-800">{product.variants.length} Companies</span>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5">
          <button
            id="cancel-deactivate-btn"
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            id="confirm-deactivate-btn"
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className="px-4 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-md shadow-xs transition-colors flex items-center gap-1.5"
          >
            {isLoading ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                <span>Deactivating...</span>
              </>
            ) : (
              <>
                <Power className="w-3.5 h-3.5" />
                <span>Deactivate</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
