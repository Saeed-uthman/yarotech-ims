import React, { useState } from 'react';
import { 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  AlertCircle, 
  Clock, 
  Ban, 
  ShieldAlert, 
  Loader2, 
  ArrowRight
} from 'lucide-react';
import { useAuth } from '../../hooks';
import { ForgotPasswordModal } from './ForgotPasswordModal';

interface LoginPageProps {
  onGoToRegister: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onGoToRegister }) => {
  const { login, isLoading, sessionNotice } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);
  const [loginError, setLoginError] = useState<{
    code?: 'PENDING' | 'REJECTED' | 'SUSPENDED' | 'INVALID_CREDENTIALS' | 'VALIDATION_ERROR' | string;
    message: string;
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);

    if (!email.trim() || !password.trim()) {
      setLoginError({
        code: 'VALIDATION_ERROR',
        message: 'Please enter both your work email and password.',
      });
      return;
    }

    try {
      const res = await login({ email, password });
      if (!res.success) {
        setLoginError({
          code: res.errorCode || 'INVALID_CREDENTIALS',
          message: res.message,
        });
      }
    } catch {
      setLoginError({
        code: 'NETWORK_ERROR',
        message: 'Unable to connect to the authentication service. Please check your network connection.',
      });
    }
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-150">
      {/* Title & Subtitle */}
      <div className="space-y-1">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Sign In to Yarotech Group</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Enter your authorized credentials to access sales and inventory operations.
        </p>
      </div>

      {/* Structured Status Alert Banners */}
      {sessionNotice && (
        <div
          role="status"
          className="p-3.5 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-xl flex items-start gap-2.5 text-xs text-blue-800 dark:text-blue-200"
        >
          <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
          <span>{sessionNotice}</span>
        </div>
      )}

      {loginError && (
        <div className="animate-in fade-in duration-150">
          {loginError.code === 'PENDING' ? (
            <div className="p-3.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl space-y-1.5 text-amber-900 dark:text-amber-200">
              <div className="flex items-center gap-2 font-bold text-xs">
                <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 animate-pulse" />
                <span>Account Awaiting Administrator Approval</span>
              </div>
              <p className="text-[11px] text-amber-800 dark:text-amber-300 leading-relaxed pl-6">
                {loginError.message}
              </p>
            </div>
          ) : loginError.code === 'REJECTED' ? (
            <div className="p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl space-y-1.5 text-rose-900 dark:text-rose-200">
              <div className="flex items-center gap-2 font-bold text-xs">
                <Ban className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                <span>Registration Request Declined</span>
              </div>
              <p className="text-[11px] text-rose-800 dark:text-rose-300 leading-relaxed pl-6">
                {loginError.message}
              </p>
            </div>
          ) : loginError.code === 'SUSPENDED' ? (
            <div className="p-3.5 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl space-y-1.5 text-slate-900 dark:text-slate-200">
              <div className="flex items-center gap-2 font-bold text-xs">
                <ShieldAlert className="w-4 h-4 text-slate-600 dark:text-slate-400 shrink-0" />
                <span>Account Access Suspended</span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed pl-6">
                {loginError.message}
              </p>
            </div>
          ) : (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl flex items-start gap-2.5 text-xs text-rose-700 dark:text-rose-300">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{loginError.message}</span>
            </div>
          )}
        </div>
      )}

      {/* Main Login Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Email Field */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
            Work Email Address
          </label>
          <div className="relative">
            <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. staff@example.com"
              required
              className="w-full pl-9 pr-3 py-2.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
            />
          </div>
        </div>

        {/* Password Field */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Password
            </label>
            <button
              type="button"
              onClick={() => setIsForgotPasswordOpen(true)}
              className="text-[11px] font-medium text-blue-600 dark:text-blue-400 hover:underline"
            >
              Forgot password?
            </button>
          </div>
          <div className="relative">
            <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your account password"
              required
              className="w-full pl-9 pr-9 py-2.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 absolute right-2.5 top-1/2 -translate-y-1/2"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-xs transition-colors"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Verifying Credentials...</span>
            </>
          ) : (
            <>
              <span>Sign In</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      {/* Switch to Registration Link */}
      <div className="p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl text-center text-xs text-slate-600 dark:text-slate-300">
        <span>Need a new staff account? </span>
        <button
          type="button"
          onClick={onGoToRegister}
          className="font-bold text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
        >
          Register for Approval
        </button>
      </div>

      {/* Forgot Password Modal */}
      <ForgotPasswordModal
        isOpen={isForgotPasswordOpen}
        onClose={() => setIsForgotPasswordOpen(false)}
      />
    </div>
  );
};
