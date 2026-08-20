import React from 'react';
import { 
  X, 
  User, 
  Mail, 
  Phone, 
  ShieldCheck, 
  Clock, 
  Calendar, 
  AlertTriangle, 
  CheckCircle2, 
  Ban, 
  ShieldAlert,
  History
} from 'lucide-react';
import { UserAccount } from '../../types';

interface UserDetailsModalProps {
  isOpen: boolean;
  user: UserAccount | null;
  onClose: () => void;
}

export const UserDetailsModal: React.FC<UserDetailsModalProps> = ({
  isOpen,
  user,
  onClose,
}) => {
  if (!isOpen || !user) return null;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Active Staff
          </span>
        );
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            Pending Approval
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
            <Ban className="w-3 h-3" />
            Registration Declined
          </span>
        );
      case 'SUSPENDED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
            <ShieldAlert className="w-3 h-3" />
            Account Suspended
          </span>
        );
      default:
        return null;
    }
  };

  const formatDate = (isoStr?: string) => {
    if (!isoStr) return 'N/A';
    return new Date(isoStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="user-details-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-white shadow-xs ${
              user.role === 'admin' ? 'bg-blue-600' : 'bg-emerald-600'
            }`}>
              <User className="w-4 h-4" />
            </div>
            <div>
              <h3 id="user-details-title" className="text-base font-bold text-slate-900 dark:text-white leading-tight">
                {user.fullName}
              </h3>
              <p className="text-[11px] text-slate-400 font-mono">User ID: {user.id}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Status & Role Row */}
          <div className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/60">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Account Status</span>
              {getStatusBadge(user.status)}
            </div>
            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Access Role</span>
              <span className={`text-xs font-bold uppercase font-mono px-2.5 py-0.5 rounded-full ${
                user.role === 'admin' 
                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300'
                  : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300'
              }`}>
                {user.role}
              </span>
            </div>
          </div>

          {/* Contact Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-1.5 text-slate-400 mb-1">
                <Mail className="w-3.5 h-3.5" />
                <span className="text-[11px] font-medium">Work Email</span>
              </div>
              <span className="font-semibold text-slate-800 dark:text-slate-200 font-mono text-[11px] truncate block">
                {user.email}
              </span>
            </div>

            <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-1.5 text-slate-400 mb-1">
                <Phone className="w-3.5 h-3.5" />
                <span className="text-[11px] font-medium">Phone Contact</span>
              </div>
              <span className="font-semibold text-slate-800 dark:text-slate-200 block">
                {user.phone}
              </span>
            </div>
          </div>

          {/* Audit History Timeline */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
              <History className="w-3.5 h-3.5" />
              <span>Audit & Lifecycle Record</span>
            </h4>
            
            <div className="bg-slate-50 dark:bg-slate-800/40 rounded-xl p-3.5 border border-slate-200 dark:border-slate-700/60 space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-400 font-medium">Registration Date:</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300">{formatDate(user.createdAt)}</span>
              </div>

              {user.approvedAt && (
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-400 font-medium">Approved At / By:</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                    {formatDate(user.approvedAt)} ({user.approvedBy || 'Admin'})
                  </span>
                </div>
              )}

              {user.rejectedAt && (
                <div className="space-y-1 py-1 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-medium">Rejected At / By:</span>
                    <span className="font-semibold text-rose-600 dark:text-rose-400">
                      {formatDate(user.rejectedAt)} ({user.rejectedBy || 'Admin'})
                    </span>
                  </div>
                  {user.rejectionReason && (
                    <p className="text-[11px] text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 p-2 rounded-lg border border-rose-200 dark:border-rose-800/60">
                      <span className="font-bold">Reason:</span> {user.rejectionReason}
                    </p>
                  )}
                </div>
              )}

              {user.suspendedAt && (
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-400 font-medium">Suspended At / By:</span>
                  <span className="font-semibold text-amber-600 dark:text-amber-400">
                    {formatDate(user.suspendedAt)} ({user.suspendedBy || 'Admin'})
                  </span>
                </div>
              )}

              <div className="flex justify-between py-1">
                <span className="text-slate-400 font-medium">Last Login:</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  {user.lastLogin ? formatDate(user.lastLogin) : 'Never logged in'}
                </span>
              </div>
            </div>
          </div>

          {/* Close Action */}
          <div className="pt-2">
            <button
              onClick={onClose}
              className="w-full py-2.5 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold rounded-xl transition-colors"
            >
              Close Details
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
