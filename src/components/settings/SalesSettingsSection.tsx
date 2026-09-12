import React from 'react';
import {
  ShoppingBag,
  UserCheck,
  CreditCard,
  CheckSquare,
  Lock,
  Coins,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react';
import { SystemSettings, UserRole } from '../../types';

interface SalesSettingsSectionProps {
  formData: SystemSettings;
  onChange: (field: keyof SystemSettings, value: any) => void;
  role: UserRole;
  vatRateError?: string;
}

export const SalesSettingsSection: React.FC<SalesSettingsSectionProps> = ({
  formData,
  onChange,
  role,
  vatRateError,
}) => {
  const isReadOnly = role === 'cashier';

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div>
          <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-blue-600" />
            <span>Sales & Point of Sale (POS) Rules</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Define checkout behavior, customer eligibility for credit, and monetary display rules for cashiers and sales desks.
          </p>
        </div>
        {isReadOnly && (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
            <Lock className="w-3 h-3" />
            <span>Admin Managed</span>
          </span>
        )}
      </div>

      {/* Currency & Money Settings */}
      <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-4">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700">
          <Coins className="w-4 h-4 text-emerald-600" />
          <span>Currency & Price Formatting</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-white p-3.5 rounded-lg border border-slate-200">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Active System Currency
            </label>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-slate-900 bg-slate-100 px-3 py-1 rounded-md border border-slate-200">
                ₦ NGN
              </span>
              <span className="text-xs text-slate-500">
                Nigerian Naira (Default national currency)
              </span>
            </div>
          </div>

          <div className="bg-white p-3.5 rounded-lg border border-slate-200 flex items-center justify-between">
            <div>
              <label htmlFor="settings-show-decimals" className="block text-xs font-semibold text-slate-900">
                Display Kobo / Decimals (.00)
              </label>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Show ₦1,250.00 instead of ₦1,250 across POS & receipts
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                id="settings-show-decimals"
                type="checkbox"
                disabled={isReadOnly}
                checked={formData.showDecimals}
                onChange={(e) => onChange('showDecimals', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </div>
      </div>

      <div className="p-4 border rounded-xl space-y-3">
        <label className="flex items-center gap-3 font-semibold text-sm">
          <input type="checkbox" checked={Boolean(formData.vatEnabled)} disabled={isReadOnly}
            onChange={event => onChange('vatEnabled', event.target.checked)} />
          Enable VAT on products marked for VAT
        </label>
        <label htmlFor="settings-vat-rate" className="block text-sm">VAT percentage (%)</label>
        <input id="settings-vat-rate" type="number" min="0" max="100" step="0.01" value={formData.vatRate ?? 0}
          aria-invalid={Boolean(vatRateError)} aria-describedby={vatRateError ? 'settings-vat-rate-error' : undefined}
          disabled={isReadOnly} onChange={event => onChange('vatRate', Number(event.target.value))}
          className="border rounded-lg p-2 w-32" />
        {vatRateError && <p id="settings-vat-rate-error" role="alert" className="text-sm text-red-600">{vatRateError}</p>}
        <p className="text-xs text-slate-500">VAT is added after discounts. Existing sales retain their saved VAT rate and amount. View billed and collected VAT in Reports / VAT.</p>
      </div>

      {/* POS Behavioral Toggles */}
      <div className="space-y-4">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
          Sales & Customer Validation Policies
        </h4>

        {/* 1. Allow Walking Sales */}
        <div className="flex items-start justify-between p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-colors">
          <div className="pr-4">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm text-slate-900">
                Allow Walking (Anonymous) Customer Sales
              </span>
              {formData.allowWalkingSales ? (
                <span className="px-2 py-0.5 text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded">
                  Enabled
                </span>
              ) : (
                <span className="px-2 py-0.5 text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200 rounded">
                  Disabled
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              When enabled, cashiers can quickly check out walk-in customers without registering or selecting a customer profile. When disabled, every sale strictly requires linking a registered customer profile.
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
            <input
              id="settings-allow-walking-sales"
              type="checkbox"
              disabled={isReadOnly}
              checked={formData.allowWalkingSales}
              onChange={(e) => onChange('allowWalkingSales', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>

        {/* 2. Allow Credit Sales */}
        <div className="flex items-start justify-between p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-colors">
          <div className="pr-4">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm text-slate-900">
                Allow Credit & Partial Payment Sales
              </span>
              {formData.allowCreditSales ? (
                <span className="px-2 py-0.5 text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 rounded">
                  Enabled
                </span>
              ) : (
                <span className="px-2 py-0.5 text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-300 rounded">
                  Cash Only
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              When enabled, customers can purchase products on credit or make partial payments, recording outstanding debt on their ledger. When disabled, all sales must be 100% paid at checkout.
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
            <input
              id="settings-allow-credit-sales"
              type="checkbox"
              disabled={isReadOnly}
              checked={formData.allowCreditSales}
              onChange={(e) => onChange('allowCreditSales', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>

        {/* 3. Require Customer Profile for Credit */}
        <div className="flex items-start justify-between p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-colors">
          <div className="pr-4">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm text-slate-900">
                Require Registered Customer for Credit Sales
              </span>
              <span className="px-2 py-0.5 text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 rounded">
                Risk Protection
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Enforced by the live debt ledger: credit must stay attached to a verified customer so it can be collected and audited.
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-not-allowed shrink-0 mt-1" title="Required by the debt ledger">
            <input
              id="settings-require-customer-for-credit"
              type="checkbox"
              disabled
              checked={formData.requireCustomerForCredit}
              onChange={(e) => onChange('requireCustomerForCredit', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>

        {/* 4. Require Sale Confirmation Modal */}
        <div className="flex items-start justify-between p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-colors">
          <div className="pr-4">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm text-slate-900">
                Require Checkout Confirmation Prompt
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Displays a final confirmation dialog before finalizing the sale, reducing cashier dispensing mistakes on high-speed tills.
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
            <input
              id="settings-require-sale-confirmation"
              type="checkbox"
              disabled={isReadOnly}
              checked={formData.requireSaleConfirmation}
              onChange={(e) => onChange('requireSaleConfirmation', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>
      </div>
    </div>
  );
};
