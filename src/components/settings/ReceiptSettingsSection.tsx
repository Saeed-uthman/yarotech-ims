import React from 'react';
import {
  Printer,
  FileCheck,
  Lock,
  MessageSquare,
  Eye,
  AlertCircle,
} from 'lucide-react';
import { SystemSettings, UserRole } from '../../types';
import { SettingsReceiptPreview } from './SettingsReceiptPreview';

interface ReceiptSettingsSectionProps {
  formData: SystemSettings;
  onChange: (field: keyof SystemSettings, value: any) => void;
  role: UserRole;
  errors: Record<string, string>;
}

export const ReceiptSettingsSection: React.FC<ReceiptSettingsSectionProps> = ({
  formData,
  onChange,
  role,
  errors,
}) => {
  const isReadOnly = role === 'cashier';
  const footerCharsLeft = 150 - (formData.receiptFooter?.length || 0);

  const toggles: {
    id: string;
    field: keyof SystemSettings;
    label: string;
    desc: string;
  }[] = [
    {
      id: 'toggle-receipt-logo',
      field: 'receiptLogo',
      label: 'Include Company Logo',
      desc: 'Prints branding logo at the top of thermal slips.',
    },
    {
      id: 'toggle-receipt-phone',
      field: 'receiptPhone',
      label: 'Include Phone / Hotline',
      desc: 'Prints company contact telephone numbers.',
    },
    {
      id: 'toggle-receipt-address',
      field: 'receiptAddress',
      label: 'Include Physical Address',
      desc: 'Prints full store address for customer records.',
    },
    {
      id: 'toggle-receipt-cashier',
      field: 'receiptCashier',
      label: 'Include Cashier / Dispenser Name',
      desc: 'Identifies the serving staff member on the receipt.',
    },
    {
      id: 'toggle-receipt-customer',
      field: 'receiptCustomer',
      label: 'Include Customer Name',
      desc: 'Prints registered customer name or "Walking Customer".',
    },
    {
      id: 'toggle-receipt-datetime',
      field: 'receiptDatetime',
      label: 'Include Date & Timestamp',
      desc: 'Prints the exact transaction timestamp.',
    },
    {
      id: 'toggle-receipt-number',
      field: 'receiptNumber',
      label: 'Include Invoice / Receipt Number',
      desc: 'Prints reference barcode and unique receipt number.',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div>
          <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
            <Printer className="w-5 h-5 text-blue-600" />
            <span>Receipts & Thermal Printing Layout</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Customize the fields, branding, and policy notices printed on customer sales slips.
          </p>
        </div>
        {isReadOnly && (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
            <Lock className="w-3 h-3" />
            <span>Admin Managed</span>
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Toggles & Footer Input */}
        <div className="lg:col-span-7 space-y-5">
          {/* Field Toggles List */}
          <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100 overflow-hidden">
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                Printed Receipt Fields
              </span>
            </div>

            {toggles.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-3.5 hover:bg-slate-50/70 transition-colors"
              >
                <div className="pr-3">
                  <span className="block text-xs font-semibold text-slate-900">
                    {item.label}
                  </span>
                  <span className="text-[11px] text-slate-500">{item.desc}</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    id={item.id}
                    type="checkbox"
                    disabled={isReadOnly}
                    checked={Boolean(formData[item.field])}
                    onChange={(e) => onChange(item.field, e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            ))}
          </div>

          {/* Receipt Custom Footer Text */}
          <div className="bg-white rounded-xl p-4 border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <label
                htmlFor="settings-receipt-footer"
                className="text-xs font-semibold text-slate-900 flex items-center gap-1.5"
              >
                <MessageSquare className="w-3.5 h-3.5 text-slate-500" />
                <span>Custom Receipt Footer & Return Policy</span>
              </label>
              <span
                className={`text-[11px] font-mono ${
                  footerCharsLeft < 15 ? 'text-amber-600 font-bold' : 'text-slate-400'
                }`}
              >
                {footerCharsLeft} chars left
              </span>
            </div>

            <textarea
              id="settings-receipt-footer"
              rows={3}
              maxLength={150}
              disabled={isReadOnly}
              value={formData.receiptFooter}
              onChange={(e) => onChange('receiptFooter', e.target.value)}
              placeholder="e.g. Thank you for your patronage. Goods sold in good condition are not returnable."
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-colors disabled:bg-slate-50 resize-none font-sans"
            />
            {errors.receiptFooter && (
              <p className="text-xs text-rose-600 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> {errors.receiptFooter}
              </p>
            )}
            <p className="text-[11px] text-slate-400">
              This message appears at the bottom of every sales receipt printed for customers.
            </p>
          </div>
        </div>

        {/* Right Column: Real-time Thermal Receipt Preview */}
        <div className="lg:col-span-5">
          <SettingsReceiptPreview settings={formData} />
        </div>
      </div>
    </div>
  );
};
