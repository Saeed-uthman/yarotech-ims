import React, { useState } from 'react';
import {
  ShieldCheck,
  KeyRound,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Lock,
  UserCheck,
} from 'lucide-react';
import { UserRole, ChangePasswordInput } from '../../types';

interface SecuritySettingsSectionProps {
  role: UserRole;
  onChangePassword: (input: ChangePasswordInput) => Promise<{ success: boolean; message?: string }>;
}

export const SecuritySettingsSection: React.FC<SecuritySettingsSectionProps> = ({
  role,
  onChangePassword,
}) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (!currentPassword) {
      setFeedback({ type: 'error', message: 'Please enter your current password.' });
      return;
    }
    if (newPassword.length < 8) {
      setFeedback({ type: 'error', message: 'New password must be at least 8 characters.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setFeedback({ type: 'error', message: 'New password and confirmation do not match.' });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await onChangePassword({
        currentPassword,
        newPassword,
        confirmPassword,
      });

      if (res.success) {
        setFeedback({
          type: 'success',
          message: 'Your password has been changed successfully.',
        });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setFeedback({
          type: 'error',
          message: res.message || 'Failed to update password.',
        });
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'An unexpected error occurred.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div>
          <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-blue-600" />
            <span>Security & Access Control</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage your account login credentials and review system permission levels.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Change Password Form */}
        <div className="lg:col-span-7">
          <form onSubmit={handleSubmit} className="bg-white rounded-xl p-5 border border-slate-200 shadow-2xs space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <KeyRound className="w-4 h-4 text-blue-600" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Change Account Password
              </h4>
            </div>

            {feedback && (
              <div
                className={`p-3 rounded-lg text-xs flex items-center gap-2 ${
                  feedback.type === 'success'
                    ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                    : 'bg-rose-50 border border-rose-200 text-rose-800'
                }`}
              >
                {feedback.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                )}
                <span>{feedback.message}</span>
              </div>
            )}

            {/* Current Password */}
            <div>
              <label
                htmlFor="security-current-password"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                Current Password
              </label>
              <div className="relative">
                <input
                  id="security-current-password"
                  type={showCurrent ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-3.5 pr-10 py-2 text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent(!showCurrent)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div>
              <label
                htmlFor="security-new-password"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                New Password (minimum 8 characters)
              </label>
              <div className="relative">
                <input
                  id="security-new-password"
                  type={showNew ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-3.5 pr-10 py-2 text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirm New Password */}
            <div>
              <label
                htmlFor="security-confirm-password"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                Confirm New Password
              </label>
              <div className="relative">
                <input
                  id="security-confirm-password"
                  type={showConfirm ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-3.5 pr-10 py-2 text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                id="update-password-submit-btn"
                disabled={isSubmitting || !currentPassword || !newPassword}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs disabled:opacity-50 transition-colors"
              >
                {isSubmitting ? 'Updating...' : 'Update Password'}
              </button>
            </div>
          </form>
        </div>

        {/* Right: Role & Permission Matrix */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-3">
            <div className="flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-slate-700" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                System Role Permissions
              </h4>
            </div>

            <div className="space-y-2 text-xs">
              <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                <div className="flex items-center justify-between font-bold text-slate-900 mb-1">
                  <span>Administrator (Admin)</span>
                  <span className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-200">
                    Full Access
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Can modify company details, configure business policies, review wholesale costs, and conduct inventory write-offs.
                </p>
              </div>

              <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                <div className="flex items-center justify-between font-bold text-slate-900 mb-1">
                  <span>Cashier / Dispenser</span>
                  <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded border border-emerald-200">
                    Operational Access
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Can process POS sales, record customer payments, and adjust personal UI theme. Business policies are read-only.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
