import React from 'react';
import {
  Boxes,
  AlertTriangle,
  ShieldAlert,
  Sliders,
  Lock,
  Minus,
  Plus,
  Info,
} from 'lucide-react';
import { SystemSettings, UserRole } from '../../types';

interface InventorySettingsSectionProps {
  formData: SystemSettings;
  onChange: (field: keyof SystemSettings, value: any) => void;
  role: UserRole;
  errors: Record<string, string>;
}

export const InventorySettingsSection: React.FC<InventorySettingsSectionProps> = ({
  formData,
  onChange,
  role,
  errors,
}) => {
  const isReadOnly = role === 'cashier';

  const handleThresholdStep = (delta: number) => {
    if (isReadOnly) return;
    const current = Number(formData.lowStockThreshold) || 0;
    const nextVal = Math.max(0, current + delta);
    onChange('lowStockThreshold', nextVal);
  };

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div>
          <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
            <Boxes className="w-5 h-5 text-blue-600" />
            <span>Inventory & Stock Control Rules</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure reorder trigger levels, stock depletion policies, and administrative permission boundaries.
          </p>
        </div>
        {isReadOnly && (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
            <Lock className="w-3 h-3" />
            <span>Admin Managed</span>
          </span>
        )}
      </div>

      {/* 1. Low Stock Alert Threshold */}
      <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="max-w-md">
            <label htmlFor="settings-low-stock-threshold" className="block text-sm font-semibold text-slate-900">
              Default Low Stock Warning Threshold
            </label>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              When a product variant's total available units fall below or equal this number, the system marks it as <strong>Low Stock</strong> on dashboard badges and inventory filters.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              id="threshold-decrement-btn"
              disabled={isReadOnly || formData.lowStockThreshold <= 0}
              onClick={() => handleThresholdStep(-1)}
              className="w-9 h-9 flex items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-40 transition-colors"
            >
              <Minus className="w-4 h-4" />
            </button>
            <input
              id="settings-low-stock-threshold"
              type="number"
              min={0}
              disabled={isReadOnly}
              value={formData.lowStockThreshold}
              onChange={(e) => {
                const val = Math.max(0, parseInt(e.target.value, 10) || 0);
                onChange('lowStockThreshold', val);
              }}
              className="w-20 text-center font-bold text-base py-1.5 rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 disabled:bg-slate-50 text-slate-900"
            />
            <button
              type="button"
              id="threshold-increment-btn"
              disabled={isReadOnly}
              onClick={() => handleThresholdStep(1)}
              className="w-9 h-9 flex items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-40 transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>
            <span className="text-xs font-semibold text-slate-500 ml-1">Units</span>
          </div>
        </div>

        {errors.lowStockThreshold && (
          <p className="text-xs text-rose-600 flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5" /> {errors.lowStockThreshold}
          </p>
        )}
      </div>

      {/* 2. Allow Negative Stock */}
      <div className={`p-5 rounded-xl border transition-all ${
        formData.allowNegativeStock
          ? 'border-amber-300 bg-amber-50/50'
          : 'border-slate-200 bg-white'
      }`}>
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm text-slate-900">
                Allow Negative Stock Dispensing
              </span>
              {formData.allowNegativeStock ? (
                <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 rounded flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3 text-amber-600" /> Caution Active
                </span>
              ) : (
                <span className="px-2 py-0.5 text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded">
                  Strict Protection (Recommended)
                </span>
              )}
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              The live inventory database enforces non-negative stock, so out-of-stock checkout is always blocked to prevent physical inventory variance.
            </p>

            {formData.allowNegativeStock && (
              <div className="mt-3 p-3 rounded-lg bg-amber-100/80 border border-amber-300 text-xs text-amber-900 flex items-start gap-2">
                <Info className="w-4 h-4 shrink-0 text-amber-700 mt-0.5" />
                <span>
                  <strong>Warning:</strong> Enabling negative inventory may cause discrepancies between physical shelves and database stock levels. Reconcile with physical stock audits frequently.
                </span>
              </div>
            )}
          </div>

          <label className="relative inline-flex items-center cursor-not-allowed shrink-0 mt-1" title="Enforced by the inventory database">
            <input
              id="settings-allow-negative-stock"
              type="checkbox"
              disabled
              checked={formData.allowNegativeStock}
              onChange={(e) => onChange('allowNegativeStock', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600"></div>
          </label>
        </div>
      </div>

      {/* 3. Require Admin for Stock Adjustments */}
      <div className="p-5 rounded-xl border border-slate-200 bg-white">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm text-slate-900">
                Require Admin Authorization for Stock Adjustments
              </span>
              <span className="px-2 py-0.5 text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 rounded">
                Audit Control
              </span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Manual stock corrections are always restricted to Administrators so every adjustment remains authorized and auditable.
            </p>
          </div>

          <label className="relative inline-flex items-center cursor-not-allowed shrink-0 mt-1" title="Enforced by role-based access control">
            <input
              id="settings-require-admin-stock-adj"
              type="checkbox"
              disabled
              checked={formData.requireAdminStockAdjustment}
              onChange={(e) => onChange('requireAdminStockAdjustment', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>
      </div>
    </div>
  );
};
