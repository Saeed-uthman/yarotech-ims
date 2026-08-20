import React, { useState } from 'react';
import { X, CheckCircle2, UserCheck, Shield, AlertTriangle, Loader2 } from 'lucide-react';
import { UserAccount, UserRole } from '../../types';

interface ApproveUserModalProps {
  isOpen: boolean;
  user: UserAccount | null;
  isLoading: boolean;
  onClose: () => void;
  onConfirm: (userId: string, assignedRole: UserRole) => Promise<void>;
}

export const ApproveUserModal: React.FC<ApproveUserModalProps> = ({
  isOpen,
  user,
  isLoading,
  onClose,
  onConfirm,
}) => {
  const [assignedRole, setAssignedRole] = useState<UserRole>('cashier');

  if (!isOpen || !user) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onConfirm(user.id, assignedRole);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="approve-modal-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <UserCheck className="w-4 h-4" />
            </div>
            <h3 id="approve-modal-title" className="text-base font-bold text-slate-900 dark:text-white">
              Approve User Account
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
            Approving this request will change the user's status to <span className="font-bold text-emerald-600 dark:text-emerald-400">ACTIVE</span> and grant access to the system with the assigned permissions.
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
            <div className="flex justify-between">
              <span className="text-slate-400 font-medium">Phone:</span>
              <span className="font-semibold text-slate-700 dark:text-slate-300">{user.phone}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400 font-medium">Applied:</span>
              <span className="text-slate-600 dark:text-slate-400">
                {new Date(user.createdAt).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </span>
            </div>
          </div>

          {/* Assign Role Option */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Assign System Access Role <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setAssignedRole('cashier')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  assignedRole === 'cashier'
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-900 dark:text-emerald-200 ring-2 ring-emerald-500/20'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
                }`}
              >
                <div className="font-bold text-xs">Cashier</div>
                <div className="text-[10px] text-slate-400 mt-0.5">Dispensary sales & POS terminal</div>
              </button>

              <button
                type="button"
                onClick={() => setAssignedRole('admin')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  assignedRole === 'admin'
                    ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-500 text-blue-900 dark:text-blue-200 ring-2 ring-blue-500/20'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
                }`}
              >
                <div className="font-bold text-xs">Administrator</div>
                <div className="text-[10px] text-slate-400 mt-0.5">Full control, costs & accounting</div>
              </button>
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
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Approving...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Approve & Activate</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
