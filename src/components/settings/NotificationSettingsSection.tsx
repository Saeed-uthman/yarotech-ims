import React from 'react';
import {
  Bell,
  AlertTriangle,
  XCircle,
  Users,
  BadgePercent,
  Lock,
  DollarSign,
} from 'lucide-react';
import { SystemSettings, UserRole } from '../../types';

interface NotificationSettingsSectionProps {
  formData: SystemSettings;
  onChange: (field: keyof SystemSettings, value: any) => void;
  role: UserRole;
}

export const NotificationSettingsSection: React.FC<NotificationSettingsSectionProps> = ({
  formData,
  onChange,
  role,
}) => {
  const isReadOnly = role === 'cashier';

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div>
          <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
            <Bell className="w-5 h-5 text-blue-600" />
            <span>Alerts & Notifications</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure automated system warnings, stock threshold alerts, and high-value transaction indicators.
          </p>
        </div>
        {isReadOnly && (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
            <Lock className="w-3 h-3" />
            <span>Admin Managed</span>
          </span>
        )}
      </div>

      <div className="space-y-4">
        {/* 1. Low Stock Notifications */}
        <div className="flex items-start justify-between p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-colors">
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center shrink-0 mt-0.5">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
            </div>
            <div>
              <span className="font-semibold text-sm text-slate-900">
                Low Stock Threshold Alerts
              </span>
              <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                Highlights items that dip below the configured low stock threshold on the header and inventory screens.
              </p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
            <input
              id="settings-low-stock-notif"
              type="checkbox"
              disabled={isReadOnly}
              checked={formData.lowStockNotifications}
              onChange={(e) => onChange('lowStockNotifications', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>

        {/* 2. Out of Stock Notifications */}
        <div className="flex items-start justify-between p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-colors">
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-lg bg-rose-50 border border-rose-200 flex items-center justify-center shrink-0 mt-0.5">
              <XCircle className="w-4 h-4 text-rose-600" />
            </div>
            <div>
              <span className="font-semibold text-sm text-slate-900">
                Zero Stock & Depletion Warnings
              </span>
              <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                Flags products that have reached 0 available units to prompt immediate supplier stock reordering.
              </p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
            <input
              id="settings-out-of-stock-notif"
              type="checkbox"
              disabled={isReadOnly}
              checked={formData.outOfStockNotifications}
              onChange={(e) => onChange('outOfStockNotifications', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>

        {/* 3. New Debt Created Notifications */}
        <div className="flex items-start justify-between p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-colors">
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-200 flex items-center justify-center shrink-0 mt-0.5">
              <Users className="w-4 h-4 text-indigo-600" />
            </div>
            <div>
              <span className="font-semibold text-sm text-slate-900">
                Customer Debt Creation Warnings
              </span>
              <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                Notifies when a cashier completes a partial payment sale that increases an active customer's outstanding balance.
              </p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
            <input
              id="settings-new-debt-notif"
              type="checkbox"
              disabled={isReadOnly}
              checked={formData.newDebtNotifications}
              onChange={(e) => onChange('newDebtNotifications', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>

        {/* 4. Large Transaction Alerts */}
        <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-3">
          <div className="flex items-start justify-between">
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center shrink-0 mt-0.5">
                <DollarSign className="w-4 h-4 text-emerald-600" />
              </div>
              <div>
                <span className="font-semibold text-sm text-slate-900">
                  Large Transaction Flagging
                </span>
                <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                  Visually tags high-value sales or procurement orders on logs for audit oversight.
                </p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
              <input
                id="settings-large-tx-notif"
                type="checkbox"
                disabled={isReadOnly}
                checked={formData.largeTransactionAlert}
                onChange={(e) => onChange('largeTransactionAlert', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          {formData.largeTransactionAlert && (
            <div className="pt-2 pl-11 flex items-center gap-3">
              <label htmlFor="settings-large-tx-threshold" className="text-xs font-semibold text-slate-700 whitespace-nowrap">
                Flag transactions exceeding:
              </label>
              <div className="relative w-48">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                  ₦
                </span>
                <input
                  id="settings-large-tx-threshold"
                  type="number"
                  disabled={isReadOnly}
                  value={formData.largeTransactionThreshold}
                  onChange={(e) =>
                    onChange('largeTransactionThreshold', Math.max(0, parseInt(e.target.value, 10) || 0))
                  }
                  className="w-full pl-7 pr-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
