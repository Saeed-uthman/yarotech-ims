import React from 'react';
import { Clock, ShieldCheck, ArrowRight, UserCheck, Mail, Phone, Calendar, AlertCircle } from 'lucide-react';
import { UserAccount } from '../../types';

interface RegistrationSuccessViewProps {
  user: UserAccount;
  onGoToLogin: () => void;
}

export const RegistrationSuccessView: React.FC<RegistrationSuccessViewProps> = ({
  user,
  onGoToLogin,
}) => {
  return (
    <div className="space-y-6 animate-in fade-in zoom-in-95 duration-200">
      {/* Icon Status Banner */}
      <div className="text-center space-y-3">
        <div className="w-16 h-16 bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
          <Clock className="w-8 h-8 animate-pulse" />
        </div>
        <div className="space-y-1">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 rounded-full text-xs font-bold text-amber-800 dark:text-amber-300">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
            Status: Awaiting Administrator Approval
          </span>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white pt-2">
            Registration Submitted Successfully
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
            Thank you, <span className="font-semibold text-slate-800 dark:text-slate-200">{user.fullName}</span>. Your account request has been logged and is pending review by the company administrator.
          </p>
        </div>
      </div>

      {/* Account Request Summary Card */}
      <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
          <UserCheck className="w-3.5 h-3.5 text-blue-600" />
          <span>Application Summary</span>
        </h4>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
          <div className="bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800">
            <span className="text-[11px] text-slate-400 block font-medium">Registered Name</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200 truncate block">{user.fullName}</span>
          </div>

          <div className="bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800">
            <span className="text-[11px] text-slate-400 block font-medium">Email Address</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200 truncate block">{user.email}</span>
          </div>

          <div className="bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800">
            <span className="text-[11px] text-slate-400 block font-medium">Phone Number</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200 truncate block">{user.phone}</span>
          </div>

          <div className="bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800">
            <span className="text-[11px] text-slate-400 block font-medium">Submitted At</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200 truncate block">
              {new Date(user.createdAt).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          </div>
        </div>
      </div>

      {/* Informational Guidance Notice */}
      <div className="p-3.5 bg-blue-50/80 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/60 rounded-xl flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
        <div className="text-xs text-blue-900 dark:text-blue-200 space-y-1">
          <p className="font-semibold">Security & Access Policy:</p>
          <p className="text-blue-700 dark:text-blue-300 leading-relaxed text-[11px]">
            In accordance with company security policies, user registration does not equal immediate system access. An administrator will verify your staff credentials and activate your login privileges.
          </p>
        </div>
      </div>

      {/* Return to Login Action */}
      <div className="pt-2">
        <button
          onClick={onGoToLogin}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-xs transition-colors"
        >
          <span>Return to Sign In</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
