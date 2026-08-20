import React, { useState } from 'react';
import { 
  User, 
  Mail, 
  Phone, 
  Lock, 
  Eye, 
  EyeOff, 
  Check, 
  X, 
  AlertCircle, 
  ShieldCheck, 
  Loader2, 
  ArrowRight,
  Info
} from 'lucide-react';
import { RegisterInput, UserAccount } from '../../types';
import { useAuth } from '../../hooks';
import { RegistrationSuccessView } from './RegistrationSuccessView';

interface RegisterPageProps {
  onGoToLogin: () => void;
}

export const RegisterPage: React.FC<RegisterPageProps> = ({ onGoToLogin }) => {
  const { register, isLoading } = useAuth();

  const [formData, setFormData] = useState<RegisterInput>({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [registeredUser, setRegisteredUser] = useState<UserAccount | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const validate = () => {
    const errors: Record<string, string> = {};

    if (!formData.fullName.trim()) {
      errors.fullName = 'Full name is required.';
    } else if (formData.fullName.trim().length < 3) {
      errors.fullName = 'Please enter your complete full name.';
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email.trim()) {
      errors.email = 'Work email address is required.';
    } else if (!emailRegex.test(formData.email.trim())) {
      errors.email = 'Please provide a valid email address.';
    }

    if (!formData.phone.trim()) {
      errors.phone = 'Phone number is required.';
    } else if (formData.phone.trim().length < 8) {
      errors.phone = 'Please enter a valid phone number.';
    }

    if (!formData.password) {
      errors.password = 'Password is required.';
    } else if (formData.password.length < 8) {
      errors.password = 'Password must be at least 8 characters long.';
    }

    if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match.';
    }

    return errors;
  };

  const validationErrors = validate();
  const isValid = Object.keys(validationErrors).length === 0;

  // Password strength checks
  const hasMinLength = formData.password.length >= 8;
  const hasLetter = /[a-zA-Z]/.test(formData.password);
  const hasNumber = /[0-9]/.test(formData.password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({
      fullName: true,
      email: true,
      phone: true,
      password: true,
      confirmPassword: true,
    });

    if (!isValid || isLoading) return;

    setErrorMessage(null);

    try {
      const res = await register(formData);
      if (res.success && res.user) {
        setRegisteredUser(res.user);
      } else {
        setErrorMessage(res.message || 'Unable to complete registration. Please try again.');
      }
    } catch {
      setErrorMessage('An unexpected error occurred while contacting the server.');
    }
  };

  if (registeredUser) {
    return <RegistrationSuccessView user={registeredUser} onGoToLogin={onGoToLogin} />;
  }

  return (
    <div className="space-y-5 animate-in fade-in duration-150">
      {/* Title & Introduction */}
      <div className="space-y-1">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Create Staff Account</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Register your credentials. New accounts require administrator approval before access is granted.
        </p>
      </div>

      {/* Error Alert */}
      {errorMessage && (
        <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl flex items-start gap-2.5 text-xs text-rose-700 dark:text-rose-300 animate-in fade-in">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="font-semibold block">Registration Error</span>
            <span>{errorMessage}</span>
          </div>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-3.5">
        {/* Full Name */}
        <div className="space-y-1">
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
            Full Name <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={formData.fullName}
              onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              onBlur={() => setTouched({ ...touched, fullName: true })}
              placeholder="e.g. John Doe"
              className={`w-full pl-9 pr-3 py-2 text-xs bg-white dark:bg-slate-900 border rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 ${
                touched.fullName && validationErrors.fullName
                  ? 'border-rose-300 dark:border-rose-700 focus:ring-rose-500'
                  : 'border-slate-300 dark:border-slate-700 focus:ring-blue-500'
              }`}
            />
          </div>
          {touched.fullName && validationErrors.fullName && (
            <p className="text-[11px] text-rose-500 font-medium">{validationErrors.fullName}</p>
          )}
        </div>

        {/* Email & Phone grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Email */}
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Work Email <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                onBlur={() => setTouched({ ...touched, email: true })}
                placeholder="staff@brightcare.test"
                className={`w-full pl-9 pr-3 py-2 text-xs bg-white dark:bg-slate-900 border rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 ${
                  touched.email && validationErrors.email
                    ? 'border-rose-300 dark:border-rose-700 focus:ring-rose-500'
                    : 'border-slate-300 dark:border-slate-700 focus:ring-blue-500'
                }`}
              />
            </div>
            {touched.email && validationErrors.email && (
              <p className="text-[11px] text-rose-500 font-medium">{validationErrors.email}</p>
            )}
          </div>

          {/* Phone */}
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Phone Number <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                onBlur={() => setTouched({ ...touched, phone: true })}
                placeholder="+234 803 123 4567"
                className={`w-full pl-9 pr-3 py-2 text-xs bg-white dark:bg-slate-900 border rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 ${
                  touched.phone && validationErrors.phone
                    ? 'border-rose-300 dark:border-rose-700 focus:ring-rose-500'
                    : 'border-slate-300 dark:border-slate-700 focus:ring-blue-500'
                }`}
              />
            </div>
            {touched.phone && validationErrors.phone && (
              <p className="text-[11px] text-rose-500 font-medium">{validationErrors.phone}</p>
            )}
          </div>
        </div>

        {/* Password & Confirm Password grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Password */}
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Password <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                onBlur={() => setTouched({ ...touched, password: true })}
                placeholder="Min 8 characters"
                className={`w-full pl-9 pr-9 py-2 text-xs bg-white dark:bg-slate-900 border rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 ${
                  touched.password && validationErrors.password
                    ? 'border-rose-300 dark:border-rose-700 focus:ring-rose-500'
                    : 'border-slate-300 dark:border-slate-700 focus:ring-blue-500'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 absolute right-2.5 top-1/2 -translate-y-1/2"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
            {touched.password && validationErrors.password && (
              <p className="text-[11px] text-rose-500 font-medium">{validationErrors.password}</p>
            )}
          </div>

          {/* Confirm Password */}
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Confirm Password <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                onBlur={() => setTouched({ ...touched, confirmPassword: true })}
                placeholder="Re-enter password"
                className={`w-full pl-9 pr-9 py-2 text-xs bg-white dark:bg-slate-900 border rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 ${
                  touched.confirmPassword && validationErrors.confirmPassword
                    ? 'border-rose-300 dark:border-rose-700 focus:ring-rose-500'
                    : 'border-slate-300 dark:border-slate-700 focus:ring-blue-500'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 absolute right-2.5 top-1/2 -translate-y-1/2"
                aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
              >
                {showConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
            {touched.confirmPassword && validationErrors.confirmPassword && (
              <p className="text-[11px] text-rose-500 font-medium">{validationErrors.confirmPassword}</p>
            )}
          </div>
        </div>

        {/* Password Strength Checklist */}
        <div className="p-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-lg space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
            Password Requirements
          </span>
          <div className="grid grid-cols-3 gap-2 text-[11px]">
            <div className={`flex items-center gap-1 ${hasMinLength ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-slate-400'}`}>
              {hasMinLength ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
              <span>8+ chars</span>
            </div>
            <div className={`flex items-center gap-1 ${hasLetter ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-slate-400'}`}>
              {hasLetter ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
              <span>Letters</span>
            </div>
            <div className={`flex items-center gap-1 ${hasNumber ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-slate-400'}`}>
              {hasNumber ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
              <span>Numbers</span>
            </div>
          </div>
        </div>

        {/* Security / Admin Approval Policy Disclaimer */}
        <div className="p-3 bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 rounded-xl flex items-start gap-2.5 text-xs text-amber-900 dark:text-amber-200">
          <Info className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <p className="text-[11px] leading-relaxed text-amber-800 dark:text-amber-300">
            <span className="font-semibold">Notice:</span> After registering, your account status will be set to <span className="font-bold">PENDING</span>. You will not be able to log in until an administrator verifies and approves your account.
          </p>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-xs transition-colors"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Submitting Registration...</span>
            </>
          ) : (
            <>
              <span>Submit Registration Request</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      {/* Switch to Login Link */}
      <div className="pt-2 text-center text-xs text-slate-500 dark:text-slate-400">
        <span>Already registered an account? </span>
        <button
          type="button"
          onClick={onGoToLogin}
          className="font-bold text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
        >
          Sign In Here
        </button>
      </div>
    </div>
  );
};
