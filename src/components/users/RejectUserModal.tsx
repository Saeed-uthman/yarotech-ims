import React, { useState } from 'react';
import { X, Ban, AlertCircle, Loader2 } from 'lucide-react';
import { UserAccount } from '../../types';

interface RejectUserModalProps {
  isOpen: boolean;
  user: UserAccount | null;
  isLoading: boolean;
  onClose: () => void;
  onConfirm: (userId: string, reason: string) => Promise<void>;
}

const REASON_PRESETS = [
  'Registration credentials could not be verified by company management.',
  'Duplicate staff application submitted.',
  'Applicant is not authorized for sales and inventory access.',
  'Incomplete contact or identification information.',
  'Other / Custom reason',
];

export const RejectUserModal: React.FC<RejectUserModalProps> = ({
  isOpen,
  user,
  isLoading,
  onClose,
  onConfirm,
}) => {
  const [selectedPreset, setSelectedPreset] = useState(REASON_PRESETS[0]);
  const [customReason, setCustomReason] = useState('');

  if (!isOpen || !user) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalReason = selectedPreset === 'Other / Custom reason' 
      ? customReason.trim() || 'Registration credentials could not be verified.'
      : selectedPreset;

    await onConfirm(user.id, finalReason);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="reject-modal-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <Ban className="w-4 h-4" />
            </div>
            <h3 id="reject-modal-title" className="text-base font-bold text-slate-900 dark:text-white">
              Decline Registration Request
            </h3>
          </div>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Rejecting this request will mark the account as <span className="font-bold text-rose-600 dark:text-rose-400">REJECTED</span>. The user will be prohibited from signing into the system.
          </p>

          {/* User Details Summary */}
          <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700/60 space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-400 font-medium">Applicant:</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">{user.fullName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400 font-medium">Email:</span>
              <span className="font-semibold text-slate-700 dark:text-slate-300 font-mono text-[11px]">{user.email}</span>
            </div>
          </div>

          {/* Reason Selection */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Audit Rejection Reason
            </label>
            <div className="space-y-1.5">
              {REASON_PRESETS.map((preset) => (
                <label 
                  key={preset}
                  className={`flex items-start gap-2.5 p-2 rounded-lg border text-xs cursor-pointer transition-colors ${
                    selectedPreset === preset
                      ? 'bg-rose-50/60 dark:bg-rose-950/30 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="rejectionPreset"
                    checked={selectedPreset === preset}
                    onChange={() => setSelectedPreset(preset)}
                    className="mt-0.5 text-rose-600 focus:ring-rose-500"
                  />
                  <span>{preset}</span>
                </label>
              ))}
            </div>

            {selectedPreset === 'Other / Custom reason' && (
              <textarea
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                placeholder="Specify the reason for rejecting this registration..."
                rows={2}
                className="w-full mt-2 p-2.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Rejecting...</span>
                </>
              ) : (
                <>
                  <Ban className="w-3.5 h-3.5" />
                  <span>Decline Registration</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
