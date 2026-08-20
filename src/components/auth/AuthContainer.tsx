import React, { useState } from 'react';
import { Pill, ShieldCheck, HeartPulse, Sparkles, Sun, Moon } from 'lucide-react';
import { LoginPage } from './LoginPage';
import { RegisterPage } from './RegisterPage';

interface AuthContainerProps {
  pharmacyName?: string;
  pharmacyLogo?: string;
}

export const AuthContainer: React.FC<AuthContainerProps> = ({
  pharmacyName = 'BrightCare Pharmacy',
  pharmacyLogo,
}) => {
  const [authView, setAuthView] = useState<'login' | 'register'>('login');

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 flex flex-col justify-center py-8 sm:py-12 px-4 sm:px-6 lg:px-8 selection:bg-blue-600 selection:text-white transition-colors">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Pharmacy Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center">
            {pharmacyLogo ? (
              <img
                src={pharmacyLogo}
                alt={pharmacyName}
                className="w-12 h-12 rounded-xl object-contain bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-12 h-12 bg-blue-600 dark:bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-md">
                <HeartPulse className="w-7 h-7" />
              </div>
            )}
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              {pharmacyName}
            </h1>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Dispensary & Management Portal
            </p>
          </div>
        </div>

        {/* View Switcher Tabs */}
        <div className="mt-6 flex bg-slate-200/80 dark:bg-slate-900 p-1 rounded-xl border border-slate-300 dark:border-slate-800">
          <button
            type="button"
            onClick={() => setAuthView('login')}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
              authView === 'login'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => setAuthView('register')}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
              authView === 'register'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Register Account
          </button>
        </div>

        {/* Main Card Container */}
        <div className="mt-4 bg-white dark:bg-slate-900 py-6 px-4 sm:px-8 shadow-xl sm:rounded-2xl border border-slate-200 dark:border-slate-800">
          {authView === 'login' ? (
            <LoginPage onGoToRegister={() => setAuthView('register')} />
          ) : (
            <RegisterPage onGoToLogin={() => setAuthView('login')} />
          )}
        </div>

        {/* Footer Security Notice */}
        <div className="mt-6 text-center space-y-1">
          <div className="flex items-center justify-center gap-1.5 text-xs text-slate-400 dark:text-slate-500">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>Role-Based Access Control Active</span>
          </div>
          <p className="text-[10px] text-slate-400 dark:text-slate-600">
            BrightCare Pharmacy Management System &bull; Offline & Cloud Ready
          </p>
        </div>
      </div>
    </div>
  );
};
