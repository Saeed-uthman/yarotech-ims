import React from 'react';
import { Printer, Store, Phone, MapPin, User, Calendar, Hash } from 'lucide-react';
import { SystemSettings } from '../../types';
import { formatNaira } from '../../utils/formatters';
import { ReceiptBarcode } from '../common/ReceiptBarcode';

interface SettingsReceiptPreviewProps {
  settings: SystemSettings;
}

export const SettingsReceiptPreview: React.FC<SettingsReceiptPreviewProps> = ({ settings }) => {
  return (
    <div className="bg-slate-900/5 rounded-xl p-4 border border-slate-200">
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-200">
        <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
          <Printer className="w-3.5 h-3.5 text-blue-600" />
          <span>Live Thermal Receipt Preview (80mm)</span>
        </span>
        <span className="text-[10px] font-mono bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-200">
          Real-time
        </span>
      </div>

      {/* Simulated Thermal Paper */}
      <div className="theme-light-preview bg-white dark:bg-white rounded-lg shadow-sm border border-slate-200 dark:border-slate-200 p-5 font-mono text-[11px] text-slate-800 dark:text-slate-800 space-y-3 max-w-sm mx-auto select-none">
        {/* Pharmacy Logo & Header */}
        <div className="text-center space-y-1 border-b border-dashed border-slate-300 pb-3">
          {settings.receiptLogo && settings.logo && (
            <div className="flex justify-center mb-1">
              <img
                src={settings.logo}
                alt="Logo"
                className="h-10 w-auto object-contain max-w-[120px]"
                referrerPolicy="no-referrer"
              />
            </div>
          )}
          {settings.receiptLogo && !settings.logo && (
            <div className="flex items-center justify-center gap-1.5 text-blue-600 font-sans font-bold text-xs">
              <Store className="w-4 h-4" />
              <span>[PHARMACY LOGO]</span>
            </div>
          )}
          <h2 className="text-xs font-extrabold uppercase text-slate-900 tracking-tight">
            {settings.pharmacyName || 'PHARMACY NAME'}
          </h2>
          {settings.businessDescription && (
            <p className="text-[9px] text-slate-500 font-sans leading-tight">
              {settings.businessDescription}
            </p>
          )}
          {settings.receiptAddress && settings.address && (
            <p className="text-[9px] text-slate-500 flex items-center justify-center gap-1">
              <MapPin className="w-2.5 h-2.5 shrink-0" />
              <span>{settings.address}</span>
            </p>
          )}
          {settings.receiptPhone && settings.phone && (
            <p className="text-[9px] text-slate-500 flex items-center justify-center gap-1">
              <Phone className="w-2.5 h-2.5 shrink-0" />
              <span>Tel: {settings.phone}</span>
            </p>
          )}
        </div>

        {/* Transaction Metadata */}
        <div className="space-y-1 border-b border-dashed border-slate-300 pb-2 text-[10px]">
          {settings.receiptNumber && (
            <div className="flex justify-between">
              <span className="text-slate-500 flex items-center gap-1">
                <Hash className="w-2.5 h-2.5" /> INV:
              </span>
              <span className="font-bold text-slate-900">Sale #000428</span>
            </div>
          )}
          {settings.receiptDatetime && (
            <div className="flex justify-between">
              <span className="text-slate-500 flex items-center gap-1">
                <Calendar className="w-2.5 h-2.5" /> DATE:
              </span>
              <span>19 Aug 2026, 02:45 PM</span>
            </div>
          )}
          {settings.receiptCashier && (
            <div className="flex justify-between">
              <span className="text-slate-500 flex items-center gap-1">
                <User className="w-2.5 h-2.5" /> CASHIER:
              </span>
              <span>Cashier Zainab</span>
            </div>
          )}
          {settings.receiptCustomer && (
            <div className="flex justify-between">
              <span className="text-slate-500">CUSTOMER:</span>
              <span className="font-medium text-slate-900">Walking Customer</span>
            </div>
          )}
        </div>

        {/* Sample Items */}
        <div className="space-y-1.5 border-b border-dashed border-slate-300 pb-2 text-[10px]">
          <div className="flex justify-between font-bold uppercase text-slate-400 text-[9px]">
            <span>Item & Strength</span>
            <span>Subtotal</span>
          </div>
          <div className="space-y-0.5">
            <div className="flex justify-between font-medium text-slate-900">
              <span>Amoxicillin 500mg (Emzor)</span>
              <span>{formatNaira(2400, settings.showDecimals)}</span>
            </div>
            <div className="text-[9px] text-slate-400">2 x {formatNaira(1200, settings.showDecimals)}</div>
          </div>
          <div className="space-y-0.5">
            <div className="flex justify-between font-medium text-slate-900">
              <span>Paracetamol 500mg (GSK)</span>
              <span>{formatNaira(800, settings.showDecimals)}</span>
            </div>
            <div className="text-[9px] text-slate-400">1 x {formatNaira(800, settings.showDecimals)}</div>
          </div>
        </div>

        {/* Totals */}
        <div className="space-y-1 text-[10px] border-b border-dashed border-slate-300 pb-2">
          <div className="flex justify-between text-slate-600">
            <span>Subtotal:</span>
            <span>{formatNaira(3200, settings.showDecimals)}</span>
          </div>
          <div className="flex justify-between font-bold text-xs text-slate-900 pt-0.5 border-t border-slate-100">
            <span>TOTAL ({settings.currency}):</span>
            <span>{formatNaira(3200, settings.showDecimals)}</span>
          </div>
          <div className="flex justify-between text-slate-700 pt-0.5">
            <span>PAID (CASH):</span>
            <span>{formatNaira(3200, settings.showDecimals)}</span>
          </div>
        </div>

        {/* Custom Footer */}
        <div className="text-center pt-1 space-y-1">
          <ReceiptBarcode
            invoiceNumber="Sale #000428"
            saleId="428"
            total={3200}
            date="2026-08-19T14:45:00+01:00"
            compact
          />
          {settings.receiptFooter ? (
            <p className="text-[9px] text-slate-600 font-sans italic leading-tight px-1">
              "{settings.receiptFooter}"
            </p>
          ) : (
            <p className="text-[9px] text-slate-400 italic">No custom footer message configured.</p>
          )}
        </div>
      </div>
    </div>
  );
};
