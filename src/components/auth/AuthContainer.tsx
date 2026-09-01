import React, { useState } from 'react';
import { BatteryCharging, Network, Router, ShieldCheck, Sun } from 'lucide-react';
import authHeroImage from '../../../assets/yarotech-auth-hero.png';
import { LoginPage } from './LoginPage';
import { RegisterPage } from './RegisterPage';

interface AuthContainerProps {
  pharmacyName?: string;
  pharmacyLogo?: string;
}

const solutionHighlights = [
  { icon: Network, label: 'Enterprise networking' },
  { icon: Sun, label: 'Reliable solar systems' },
  { icon: BatteryCharging, label: 'Power storage solutions' },
];

export const AuthContainer: React.FC<AuthContainerProps> = ({
  pharmacyName = 'Yarotech Group',
  pharmacyLogo,
}) => {
  const [authView, setAuthView] = useState<'login' | 'register'>('login');

  return (
    <main className="min-h-screen bg-slate-100 dark:bg-slate-950 lg:p-5 selection:bg-blue-600 selection:text-white transition-colors">
      <div className="min-h-screen lg:min-h-[calc(100vh-2.5rem)] max-w-[1500px] mx-auto bg-white dark:bg-slate-900 lg:rounded-[2rem] lg:border border-slate-200 dark:border-slate-800 lg:shadow-2xl overflow-hidden grid lg:grid-cols-[minmax(420px,0.88fr)_minmax(520px,1.12fr)]">
        <section className="relative z-10 flex flex-col px-5 py-6 sm:px-10 lg:px-12 xl:px-16">
          <header className="flex items-center gap-3">
            {pharmacyLogo ? (
              <img
                src={pharmacyLogo}
                alt={pharmacyName}
                className="w-11 h-11 rounded-xl object-contain bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 shadow-sm"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-11 h-11 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-600/20">
                <Router className="w-6 h-6" />
              </div>
            )}
            <div>
              <h1 className="text-lg font-black text-slate-950 dark:text-white tracking-tight">{pharmacyName}</h1>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-blue-600 dark:text-blue-400">
                Technology &amp; Energy Solutions
              </p>
            </div>
          </header>

          <div className="flex-1 flex items-center justify-center py-8 lg:py-10">
            <div className="w-full max-w-md">
              <div className="mb-5">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600 dark:text-blue-400 mb-2">
                  Secure staff portal
                </p>
                <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-950 dark:text-white">
                  {authView === 'login' ? 'Welcome back' : 'Join the Yarotech team'}
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
                  {authView === 'login'
                    ? 'Sign in to manage sales, inventory, customers, purchasing, and business performance.'
                    : 'Create your staff profile. An administrator will review and approve your access.'}
                </p>
              </div>

              <div className="flex bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-800 mb-4">
                <button
                  type="button"
                  onClick={() => setAuthView('login')}
                  className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all ${
                    authView === 'login'
                      ? 'bg-white dark:bg-slate-800 text-slate-950 dark:text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => setAuthView('register')}
                  className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all ${
                    authView === 'register'
                      ? 'bg-white dark:bg-slate-800 text-slate-950 dark:text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Register Account
                </button>
              </div>

              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-[0_18px_55px_-30px_rgba(15,23,42,0.35)]">
                {authView === 'login' ? (
                  <LoginPage onGoToRegister={() => setAuthView('register')} />
                ) : (
                  <RegisterPage onGoToLogin={() => setAuthView('login')} />
                )}
              </div>
            </div>
          </div>

          <footer className="flex items-center justify-center sm:justify-between gap-3 text-[10px] text-slate-400 dark:text-slate-500">
            <span>© {new Date().getFullYear()} Yarotech Group</span>
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              Role-based access protected
            </span>
          </footer>
        </section>

        <aside className="relative hidden lg:flex min-h-[760px] overflow-hidden bg-slate-950">
          <img
            src={authHeroImage}
            alt="Networking and solar equipment supplied by Yarotech Group"
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/35 to-slate-950/5" />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950/25 via-transparent to-transparent" />

          <div className="relative z-10 mt-auto w-full p-10 xl:p-14 text-white">
            <div className="max-w-xl">
              <span className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.17em] backdrop-blur-md">
                Connected. Powered. Ready.
              </span>
              <h2 className="mt-5 text-4xl xl:text-5xl font-black tracking-tight leading-[1.04]">
                Infrastructure that keeps your business moving.
              </h2>
              <p className="mt-4 max-w-lg text-sm xl:text-base leading-relaxed text-slate-200">
                Yarotech Group delivers dependable networking devices, solar power systems, and IT equipment—managed through one secure business platform.
              </p>

              <div className="mt-7 grid grid-cols-3 gap-3">
                {solutionHighlights.map(({ icon: Icon, label }) => (
                  <div key={label} className="rounded-2xl border border-white/15 bg-slate-950/35 p-3.5 backdrop-blur-md">
                    <Icon className="w-5 h-5 text-cyan-300" />
                    <p className="mt-2 text-xs font-semibold leading-snug text-white">{label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
};
