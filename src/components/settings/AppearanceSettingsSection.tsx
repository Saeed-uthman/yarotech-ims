import React from 'react';
import {
  Palette,
  Sun,
  Moon,
  Laptop,
  Languages,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import { SystemSettings, UserRole, AppTheme, SessionTimeout } from '../../types';

interface AppearanceSettingsSectionProps {
  formData: SystemSettings;
  onChange: (field: keyof SystemSettings, value: any) => void;
  role: UserRole;
}

export const AppearanceSettingsSection: React.FC<AppearanceSettingsSectionProps> = ({
  formData,
  onChange,
}) => {
  const themeOptions: {
    id: AppTheme;
    label: string;
    desc: string;
    icon: React.ComponentType<{ className?: string }>;
  }[] = [
    {
      id: 'light',
      label: 'Light Mode',
      desc: 'Crisp, high-contrast light workspace designed for day dispensaries.',
      icon: Sun,
    },
    {
      id: 'dark',
      label: 'Dark Mode',
      desc: 'Deep slate workspace reducing glare for night shifts.',
      icon: Moon,
    },
    {
      id: 'system',
      label: 'System Sync',
      desc: 'Automatically matches your device operating system theme.',
      icon: Laptop,
    },
  ];

  const timeoutOptions: { id: SessionTimeout; label: string }[] = [
    { id: '15m', label: '15 Minutes' },
    { id: '30m', label: '30 Minutes (Recommended)' },
    { id: '60m', label: '1 Hour' },
    { id: 'never', label: 'Never (Stay Signed In)' },
  ];

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div>
          <h3 className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <Palette className="w-5 h-5 text-blue-600" />
            <span>Appearance & User Preferences</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Personalize your local visual theme, language locale, and security session duration.
          </p>
        </div>
      </div>

      {/* 1. Theme Picker */}
      <div className="space-y-3">
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
          Interface Color Theme
        </label>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {themeOptions.map((opt) => {
            const Icon = opt.icon;
            const isSelected = formData.theme === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                id={`theme-option-${opt.id}`}
                onClick={() => onChange('theme', opt.id)}
                className={`p-4 rounded-xl border text-left flex flex-col justify-between transition-all ${
                  isSelected
                    ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/30 ring-2 ring-blue-600/10 dark:ring-blue-400/20 shadow-xs'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 hover:border-slate-300 dark:hover:border-slate-600'
                }`}
              >
                <div className="flex items-center justify-between w-full mb-2">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      isSelected ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  {isSelected && <CheckCircle2 className="w-4 h-4 text-blue-600" />}
                </div>
                <div>
                  <span className="font-semibold text-sm text-slate-900 dark:text-white block">{opt.label}</span>
                  <span className="text-[11px] text-slate-500 leading-snug block mt-0.5">
                    {opt.desc}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Language and Session Duration */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-4 border-t border-slate-200">
        {/* Language */}
        <div className="bg-white dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
          <label htmlFor="settings-language-select" className="text-xs font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
            <Languages className="w-4 h-4 text-slate-500" />
            <span>Application Language</span>
          </label>
          <select
            id="settings-language-select"
            value={formData.language}
            onChange={(e) => onChange('language', e.target.value as any)}
            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-slate-900 dark:text-white"
          >
            <option value="English">English (Nigeria / International)</option>
          </select>
          <p className="text-[11px] text-slate-500">
            Standard medical terminology and dispensing nomenclature are in English.
          </p>
        </div>

        {/* Inactivity Session Timeout */}
        <div className="bg-white dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
          <label htmlFor="settings-session-timeout" className="text-xs font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-slate-500" />
            <span>Inactivity Auto-Logout Timeout</span>
          </label>
          <select
            id="settings-session-timeout"
            value={formData.sessionTimeout}
            onChange={(e) => onChange('sessionTimeout', e.target.value as any)}
            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-slate-900 dark:text-white"
          >
            {timeoutOptions.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
          <p className="text-[11px] text-slate-500">
            Signs out idle till terminals and requires staff authentication to continue.
          </p>
        </div>
      </div>
    </div>
  );
};
