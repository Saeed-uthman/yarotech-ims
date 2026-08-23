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
  CheckCircle2, 
  Loader2, 
  ArrowRight,
  Sparkles,
  KeyRound,
  UserCheck,
  User,
  Shield,
  HelpCircle
} from 'lucide-react';
import { useAuth } from '../../hooks';
import { ForgotPasswordModal } from './ForgotPasswordModal';

interface LoginPageProps {
  onGoToRegister: () => void;
}

interface DemoAccount {
  label: string;
  roleDescription: string;
  email: string;
  password: string;
  status: 'ACTIVE' | 'PENDING' | 'REJECTED' | 'SUSPENDED';
  badgeColor: string;
}

const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    label: 'Admin (System Administrator)',
    roleDescription: 'Full access to costs, accounting, and user approval',
    email: 'admin@alamaan.test',
    password: 'Password123',
    status: 'ACTIVE',
    badgeColor: 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800',
  },
  {
    label: 'Cashier (Dispensary Staff)',
    roleDescription: 'Streamlined POS sales with wholesale costs masked',
    email: 'cashier@alamaan.test',
    password: 'Password123',
    status: 'ACTIVE',
    badgeColor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
  },
  {
    label: 'Pending User (Awaiting Approval)',
    roleDescription: 'Simulates newly registered user state awaiting admin review',
    email: 'john@example.test',
    password: 'Password123',
    status: 'PENDING',
    badgeColor: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800',
  },
  {
    label: 'Rejected User (Declined Registration)',
    roleDescription: 'Simulates denied application with audit reason',
    email: 'rejected@example.test',
    password: 'Password123',
    status: 'REJECTED',
    badgeColor: 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-800',
  },
  {
    label: 'Suspended User (Locked Account)',
    roleDescription: 'Simulates deactivated staff account',
    email: 'suspended@example.test',
    password: 'Password123',
    status: 'SUSPENDED',
    badgeColor: 'bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border-slate-300 dark:border-slate-700',
  },
];

export const LoginPage: React.FC<LoginPageProps> = ({ onGoToRegister }) => {
  const { login, isLoading } = useAuth();

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

  const handleSelectDemoAccount = (demo: DemoAccount) => {
    setEmail(demo.email);
    setPassword(demo.password);
    setLoginError(null);
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-150">
      {/* Title & Subtitle */}
      <div className="space-y-1">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Sign In to Pharmacy</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Enter your authorized credentials to access dispensary and inventory operations.
        </p>
      </div>

      {/* Structured Status Alert Banners */}
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
              placeholder="e.g. admin@alamaan.test"
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

      {/* Quick Test Accounts Switcher */}
      <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Interactive Demo Accounts</span>
          </span>
          <span className="text-[10px] text-slate-400">Click to fill</span>
        </div>

        <div className="grid grid-cols-1 gap-1.5">
          {DEMO_ACCOUNTS.map((demo) => {
            const isSelected = email === demo.email;
            return (
              <button
                key={demo.email}
                type="button"
                onClick={() => handleSelectDemoAccount(demo)}
                className={`w-full flex items-center justify-between p-2 rounded-lg text-left text-xs border transition-colors ${
                  isSelected
                    ? 'bg-blue-50/80 dark:bg-blue-950/40 border-blue-300 dark:border-blue-700'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                }`}
              >
                <div className="min-w-0 flex-1 pr-2">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-900 dark:text-white truncate">
                      {demo.label}
                    </span>
                    <span className={`text-[9px] font-mono uppercase px-1.5 py-0.2 rounded border font-bold shrink-0 ${demo.badgeColor}`}>
                      {demo.status}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate mt-0.5">
                    {demo.email} &bull; {demo.roleDescription}
                  </p>
                </div>
                <div className="shrink-0 text-slate-400 font-mono text-[10px]">
                  Fill
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Forgot Password Modal */}
      <ForgotPasswordModal
        isOpen={isForgotPasswordOpen}
        onClose={() => setIsForgotPasswordOpen(false)}
      />
    </div>
  );
};
