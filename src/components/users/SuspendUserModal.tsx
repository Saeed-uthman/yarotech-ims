import React from 'react';
import { X, ShieldAlert, AlertTriangle, Loader2 } from 'lucide-react';
import { UserAccount } from '../../types';

interface SuspendUserModalProps {
  isOpen: boolean;
  user: UserAccount | null;
  isLoading: boolean;
  onClose: () => void;
  onConfirm: (userId: string) => Promise<void>;
}

export const SuspendUserModal: React.FC<SuspendUserModalProps> = ({
  isOpen,
  user,
  isLoading,
  onClose,
  onConfirm,
}) => {
  if (!isOpen || !user) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onConfirm(user.id);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="suspend-modal-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-amber-50/50 dark:bg-amber-950/20">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <h3 id="suspend-modal-title" className="text-base font-bold text-slate-900 dark:text-white">
              Suspend Staff Account
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
          <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl flex items-start gap-2.5 text-xs text-amber-800 dark:text-amber-300">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-semibold block">Important Access Notice</span>
              <p className="leading-relaxed">
                Suspending this account will immediately revoke all sign-in and POS operations for this staff member until an administrator reactivates the account.
              </p>
            </div>
          </div>

          {/* User Details Summary */}
          <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700/60 space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-400 font-medium">Staff Member:</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">{user.fullName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400 font-medium">Email:</span>
              <span className="font-semibold text-slate-700 dark:text-slate-300 font-mono text-[11px]">{user.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400 font-medium">Current Role:</span>
              <span className="font-semibold uppercase text-slate-700 dark:text-slate-300">{user.role}</span>
            </div>
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
              className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Suspending...</span>
                </>
              ) : (
                <>
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span>Suspend Account</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
