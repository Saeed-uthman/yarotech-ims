import React, { useState, useEffect, useMemo } from 'react';
import {
  Settings,
  Building2,
  ShoppingBag,
  Boxes,
  Printer,
  Bell,
  Palette,
  ShieldCheck,
  RotateCcw,
  Save,
  CheckCircle2,
  AlertCircle,
  Search,
  Lock,
  Sparkles,
  Info,
  X,
} from 'lucide-react';
import { SystemSettings, UserRole, UpdateSettingsInput } from '../../types';
import { useSettings } from '../../hooks';
import { GeneralInfoSection } from './GeneralInfoSection';
import { SalesSettingsSection } from './SalesSettingsSection';
import { InventorySettingsSection } from './InventorySettingsSection';
import { ReceiptSettingsSection } from './ReceiptSettingsSection';
import { NotificationSettingsSection } from './NotificationSettingsSection';
import { AppearanceSettingsSection } from './AppearanceSettingsSection';
import { SecuritySettingsSection } from './SecuritySettingsSection';

interface SettingsModuleProps {
  role: UserRole;
  onSettingsUpdated?: (updated: SystemSettings) => void;
}

type SettingsTab =
  | 'general'
  | 'sales'
  | 'inventory'
  | 'receipts'
  | 'notifications'
  | 'appearance'
  | 'security';

export const SettingsModule: React.FC<SettingsModuleProps> = ({ role, onSettingsUpdated }) => {
  const {
    settings,
    isLoading,
    isSaving,
    isResetting,
    error: apiError,
    updateSettings,
    resetSettings,
    changePassword,
  } = useSettings(role);

  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
  const [formData, setFormData] = useState<SystemSettings>(settings);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);

  // Sync formData with loaded settings
  useEffect(() => {
    if (settings) {
      setFormData(settings);
    }
  }, [settings]);

  // Check if form has unsaved modifications
  const isDirty = useMemo(() => {
    if (!settings || !formData) return false;
    return JSON.stringify(settings) !== JSON.stringify(formData);
  }, [settings, formData]);

  const handleFieldChange = (field: keyof SystemSettings, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
    // Clear validation error if fixed
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
    setSaveSuccessMsg(null);
  };

  const handleDiscard = () => {
    setFormData(settings);
    setErrors({});
    setSaveSuccessMsg(null);
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.pharmacyName || !formData.pharmacyName.trim()) {
      newErrors.pharmacyName = 'Pharmacy name is required.';
    }

    if (formData.lowStockThreshold < 0 || isNaN(formData.lowStockThreshold)) {
      newErrors.lowStockThreshold = 'Low stock threshold must be at least 0.';
    }

    if (formData.receiptFooter && formData.receiptFooter.length > 150) {
      newErrors.receiptFooter = 'Receipt footer cannot exceed 150 characters.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    const payload: UpdateSettingsInput = {
      pharmacyName: formData.pharmacyName,
      phone: formData.phone,
      email: formData.email,
      address: formData.address,
      logo: formData.logo,
      businessDescription: formData.businessDescription,
      currency: formData.currency,
      currencySymbol: formData.currencySymbol,
      showDecimals: formData.showDecimals,
      allowWalkingSales: formData.allowWalkingSales,
      allowCreditSales: formData.allowCreditSales,
      requireCustomerForCredit: formData.requireCustomerForCredit,
      requireSaleConfirmation: formData.requireSaleConfirmation,
      lowStockThreshold: formData.lowStockThreshold,
      allowNegativeStock: formData.allowNegativeStock,
      requireAdminStockAdjustment: formData.requireAdminStockAdjustment,
      receiptLogo: formData.receiptLogo,
      receiptPhone: formData.receiptPhone,
      receiptAddress: formData.receiptAddress,
      receiptCashier: formData.receiptCashier,
      receiptCustomer: formData.receiptCustomer,
      receiptDatetime: formData.receiptDatetime,
      receiptNumber: formData.receiptNumber,
      receiptFooter: formData.receiptFooter,
      lowStockNotifications: formData.lowStockNotifications,
      outOfStockNotifications: formData.outOfStockNotifications,
      newDebtNotifications: formData.newDebtNotifications,
      largeTransactionAlert: formData.largeTransactionAlert,
      largeTransactionThreshold: formData.largeTransactionThreshold,
      theme: formData.theme,
      language: formData.language,
      sessionTimeout: formData.sessionTimeout,
    };

    const res = await updateSettings(payload);
    if (res.success) {
      setSaveSuccessMsg(res.message || 'System preferences saved successfully.');
      if (onSettingsUpdated && settings) {
        onSettingsUpdated(formData);
      }
      setTimeout(() => setSaveSuccessMsg(null), 4000);
    }
  };

  const handleConfirmReset = async () => {
    setIsResetConfirmOpen(false);
    const res = await resetSettings();
    if (res.success) {
      setSaveSuccessMsg('System preferences have been reset to default values.');
      setTimeout(() => setSaveSuccessMsg(null), 4000);
    }
  };

  const tabs: {
    id: SettingsTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    keywords: string[];
  }[] = [
    {
      id: 'general',
      label: 'Pharmacy Info',
      icon: Building2,
      keywords: ['name', 'phone', 'email', 'address', 'logo', 'description', 'contact'],
    },
    {
      id: 'sales',
      label: 'Sales & POS',
      icon: ShoppingBag,
      keywords: ['sales', 'credit', 'walking', 'cashier', 'confirmation', 'pos', 'currency', 'decimals'],
    },
    {
      id: 'inventory',
      label: 'Inventory Rules',
      icon: Boxes,
      keywords: ['stock', 'threshold', 'low stock', 'negative', 'reorder', 'adjustment'],
    },
    {
      id: 'receipts',
      label: 'Receipts & Print',
      icon: Printer,
      keywords: ['receipt', 'thermal', 'print', 'footer', 'layout', 'paper', 'invoice'],
    },
    {
      id: 'notifications',
      label: 'Alerts & Notices',
      icon: Bell,
      keywords: ['alerts', 'notifications', 'warnings', 'large transaction', 'debt'],
    },
    {
      id: 'appearance',
      label: 'Appearance',
      icon: Palette,
      keywords: ['theme', 'dark', 'light', 'language', 'session', 'timeout'],
    },
    {
      id: 'security',
      label: 'Security & Access',
      icon: ShieldCheck,
      keywords: ['password', 'roles', 'permissions', 'admin', 'cashier', 'login'],
    },
  ];

  // Tab filtering based on search
  const filteredTabs = useMemo(() => {
    if (!searchQuery.trim()) return tabs;
    const q = searchQuery.toLowerCase().trim();
    return tabs.filter(
      (t) =>
        t.label.toLowerCase().includes(q) ||
        t.keywords.some((k) => k.toLowerCase().includes(q))
    );
  }, [searchQuery, tabs]);

  if (isLoading && !formData) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-12 text-center max-w-xl mx-auto my-8">
        <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <h3 className="text-sm font-semibold text-slate-800">Loading System Preferences...</h3>
        <p className="text-xs text-slate-400 mt-1">Retrieving pharmacy configuration and security rules.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              System Preferences & Configurations
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
              Module 10
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Configure store identity, POS checkout rules, inventory thresholds, thermal receipt layouts, and local appearance.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {role === 'admin' && (
            <button
              type="button"
              id="reset-settings-trigger-btn"
              disabled={isResetting || isSaving}
              onClick={() => setIsResetConfirmOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs disabled:opacity-50"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
              <span>Reset Defaults</span>
            </button>
          )}

          <button
            type="button"
            id="save-settings-primary-btn"
            disabled={!isDirty || isSaving || isResetting}
            onClick={handleSave}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
          </button>
        </div>
      </div>

      {/* Role Notice Banner for Cashier */}
      {role === 'cashier' && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 flex items-start gap-3 text-xs text-amber-900">
          <Lock className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <strong>Cashier Operational View:</strong> Business configurations (Pharmacy Name, POS rules, Inventory triggers, and Receipt formats) are managed by Administrators. You can customize your local interface Theme and update your account password.
          </div>
        </div>
      )}

      {/* API / Validation Success or Error Feedback */}
      {saveSuccessMsg && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 flex items-center justify-between text-xs text-emerald-900 animate-in fade-in slide-in-from-top-1">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-medium">{saveSuccessMsg}</span>
          </div>
          <button
            onClick={() => setSaveSuccessMsg(null)}
            className="text-emerald-700 hover:text-emerald-900 p-1"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {apiError && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-3.5 flex items-center gap-2 text-xs text-rose-900">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{apiError}</span>
        </div>
      )}

      {/* Main Settings Card Layout (Sidebar Tabs + Section Content) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden flex flex-col md:flex-row min-h-[580px]">
        {/* Settings Navigation Sidebar */}
        <div className="w-full md:w-64 bg-slate-50/60 border-b md:border-b-0 md:border-r border-slate-200 p-3 sm:p-4 space-y-3 shrink-0 select-none">
          {/* Quick Settings Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              id="settings-search-input"
              type="text"
              placeholder="Search settings..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 hover:text-slate-600"
              >
                Clear
              </button>
            )}
          </div>

          {/* Navigation Tab List */}
          <nav className="space-y-1">
            {filteredTabs.map((t) => {
              const Icon = t.icon;
              const isActive = activeTab === t.id;
              return (
                <button
                  key={t.id}
                  id={`settings-tab-${t.id}`}
                  onClick={() => setActiveTab(t.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'text-slate-600 hover:bg-slate-200/60 hover:text-slate-900'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                  <span>{t.label}</span>
                </button>
              );
            })}

            {filteredTabs.length === 0 && (
              <div className="py-4 text-center text-xs text-slate-400">
                No matching setting categories found.
              </div>
            )}
          </nav>

          {/* Audit Timestamp Footnote */}
          <div className="pt-4 border-t border-slate-200 text-[11px] text-slate-400 space-y-1">
            <div>
              <strong>Last modified:</strong>{' '}
              {formData.updatedAt
                ? new Date(formData.updatedAt).toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })
                : 'Default configuration'}
            </div>
            {formData.updatedBy && <div>By {formData.updatedBy}</div>}
          </div>
        </div>

        {/* Active Section Body */}
        <div className="flex-1 p-5 sm:p-6 lg:p-8 overflow-y-auto">
          {activeTab === 'general' && (
            <GeneralInfoSection
              formData={formData}
              onChange={handleFieldChange}
              role={role}
              errors={errors}
            />
          )}

          {activeTab === 'sales' && (
            <SalesSettingsSection
              formData={formData}
              onChange={handleFieldChange}
              role={role}
            />
          )}

          {activeTab === 'inventory' && (
            <InventorySettingsSection
              formData={formData}
              onChange={handleFieldChange}
              role={role}
              errors={errors}
            />
          )}

          {activeTab === 'receipts' && (
            <ReceiptSettingsSection
              formData={formData}
              onChange={handleFieldChange}
              role={role}
              errors={errors}
            />
          )}

          {activeTab === 'notifications' && (
            <NotificationSettingsSection
              formData={formData}
              onChange={handleFieldChange}
              role={role}
            />
          )}

          {activeTab === 'appearance' && (
            <AppearanceSettingsSection
              formData={formData}
              onChange={handleFieldChange}
              role={role}
            />
          )}

          {activeTab === 'security' && (
            <SecuritySettingsSection
              role={role}
              onChangePassword={changePassword}
            />
          )}
        </div>
      </div>

      {/* Floating Unsaved Changes Bar */}
      {isDirty && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 max-w-xl w-full px-4 animate-in slide-in-from-bottom-3 duration-200">
          <div className="bg-slate-900 text-white rounded-xl px-4 py-3 shadow-2xl border border-slate-700 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              <span>You have unsaved changes in your system configurations.</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                id="discard-changes-floating-btn"
                onClick={handleDiscard}
                disabled={isSaving}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
              >
                Discard
              </button>
              <button
                type="button"
                id="save-changes-floating-btn"
                onClick={handleSave}
                disabled={isSaving}
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white shadow-xs transition-colors"
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Confirmation Modal */}
      {isResetConfirmOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 mx-auto">
              <RotateCcw className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-slate-900">
                Reset System Preferences to Defaults?
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                This will reset store contact info, receipt templates, POS checkout behaviors, and threshold warnings back to factory system defaults.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsResetConfirmOpen(false)}
                className="px-3.5 py-2 rounded-lg text-xs font-semibold border border-slate-300 text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                id="confirm-reset-settings-btn"
                onClick={handleConfirmReset}
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white shadow-xs"
              >
                Yes, Reset to Defaults
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
