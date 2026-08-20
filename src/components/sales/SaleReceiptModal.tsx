import React from 'react';
import { X, Printer, CheckCircle, ShieldCheck, Store, MapPin, Phone } from 'lucide-react';
import { Sale } from '../../types';
import { formatNaira } from '../../utils/formatters';
import { useSettings } from '../../hooks';

interface SaleReceiptModalProps {
  sale: Sale | null;
  isOpen: boolean;
  onClose: () => void;
}

export const SaleReceiptModal: React.FC<SaleReceiptModalProps> = ({
  sale,
  isOpen,
  onClose,
}) => {
  const { settings } = useSettings();

  if (!isOpen || !sale) return null;

  const handlePrint = () => {
    window.print();
  };

  const isWalking = !sale.customerId;
  const hasOutstanding = sale.outstandingAmount > 0;
  const showDecimals = settings.showDecimals;

  return (
    <div
      id="sale-receipt-modal"
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4"
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Actions Bar on Top */}
        <div className="bg-slate-100 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between print:hidden">
          <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
            <Printer className="w-3.5 h-3.5 text-blue-600" />
            <span>Sales Receipt Preview</span>
          </span>

          <div className="flex items-center gap-2">
            <button
              id="receipt-print-btn"
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1 px-3 py-1 bg-blue-600 text-white rounded-md text-xs font-semibold hover:bg-blue-700 transition-colors shadow-2xs"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print</span>
            </button>
            <button
              id="receipt-close-btn"
              type="button"
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-slate-600 rounded-md"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Thermal Receipt Body */}
        <div
          id="printable-receipt"
          className="p-6 font-mono text-slate-800 text-xs bg-white space-y-4 print:p-0 print:m-0"
        >
          {/* Pharmacy Header */}
          <div className="text-center space-y-1 border-b border-dashed border-slate-300 pb-3">
            {settings.receiptLogo && settings.logo && (
              <div className="flex justify-center mb-1">
                <img
                  src={settings.logo}
                  alt="Pharmacy Logo"
                  className="h-10 w-auto object-contain max-w-[120px]"
                  referrerPolicy="no-referrer"
                />
              </div>
            )}
            <h1 className="text-sm font-extrabold tracking-tight uppercase text-slate-900">
              {settings.pharmacyName || 'BRIGHTCARE PHARMACY'}
            </h1>
            {settings.businessDescription && (
              <p className="text-[9px] text-slate-500 font-sans">
                {settings.businessDescription}
              </p>
            )}
            {settings.receiptAddress && settings.address && (
              <p className="text-[9px] text-slate-500">
                {settings.address}
              </p>
            )}
            {settings.receiptPhone && settings.phone && (
              <p className="text-[9px] text-slate-500">
                Tel: {settings.phone}
              </p>
            )}
          </div>

          {/* Transaction Metadata */}
          <div className="text-[11px] space-y-1 border-b border-dashed border-slate-300 pb-3">
            {settings.receiptNumber && (
              <div className="flex justify-between font-bold">
                <span>INVOICE:</span>
                <span className="text-slate-900">{sale.invoiceNumber}</span>
              </div>
            )}
            {settings.receiptDatetime && (
              <div className="flex justify-between">
                <span className="text-slate-500">DATE:</span>
                <span>{sale.date}</span>
              </div>
            )}
            {settings.receiptCashier && (
              <div className="flex justify-between">
                <span className="text-slate-500">CASHIER:</span>
                <span>{sale.servedBy}</span>
              </div>
            )}
            {settings.receiptCustomer && (
              <div className="flex justify-between">
                <span className="text-slate-500">CUSTOMER:</span>
                <span className="font-semibold">{isWalking ? 'Walking Customer' : sale.customerName}</span>
              </div>
            )}
            {settings.receiptCustomer && sale.customerPhone && (
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>PHONE:</span>
                <span>{sale.customerPhone}</span>
              </div>
            )}
          </div>

          {/* Items Table */}
          <div className="border-b border-dashed border-slate-300 pb-3 space-y-2">
            <div className="flex justify-between font-bold text-[10px] uppercase text-slate-500 pb-1">
              <span>Item & Formulation</span>
              <span className="text-right">Total</span>
            </div>

            {sale.items.map((item, idx) => (
              <div key={idx} className="space-y-0.5">
                <div className="flex justify-between font-semibold text-[11px] text-slate-900">
                  <span className="truncate pr-2">
                    {item.productName} ({item.companyName})
                  </span>
                  <span>{formatNaira(item.subtotal, showDecimals)}</span>
                </div>
                <div className="text-[10px] text-slate-500 flex justify-between">
                  <span>
                    {item.quantity} x {formatNaira(item.sellingPrice, showDecimals)}
                  </span>
                  {item.dosage && <span>{item.dosage}</span>}
                </div>
              </div>
            ))}
          </div>

          {/* Totals & Payments */}
          <div className="space-y-1 text-[11px] border-b border-dashed border-slate-300 pb-3">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal:</span>
              <span>{formatNaira(sale.subtotal, showDecimals)}</span>
            </div>
            {sale.discount > 0 && (
              <div className="flex justify-between text-rose-600">
                <span>Discount Applied:</span>
                <span>- {formatNaira(sale.discount, showDecimals)}</span>
              </div>
            )}
            <div className="flex justify-between font-extrabold text-sm text-slate-900 pt-1 border-t border-slate-200">
              <span>TOTAL ({settings.currency}):</span>
              <span>{formatNaira(sale.total, showDecimals)}</span>
            </div>
            <div className="flex justify-between text-slate-800 font-semibold pt-1">
              <span>AMOUNT PAID ({sale.paymentMethod}):</span>
              <span>{formatNaira(sale.amountPaid, showDecimals)}</span>
            </div>
            {hasOutstanding && (
              <div className="flex justify-between font-bold text-amber-700 pt-1">
                <span>OUTSTANDING BALANCE:</span>
                <span>{formatNaira(sale.outstandingAmount, showDecimals)}</span>
              </div>
            )}
            <div className="flex justify-between text-[10px] text-slate-500 pt-1">
              <span>PAYMENT STATUS:</span>
              <span className="font-bold text-slate-900">{sale.paymentStatus}</span>
            </div>
          </div>

          {/* Barcode & Footer Notice */}
          <div className="text-center space-y-2 pt-1 font-sans">
            <div className="font-mono text-xs tracking-widest text-slate-400 bg-slate-50 py-1.5 rounded-sm border border-slate-200">
              ||| | ||||| || |||| ||| ||||| ||
            </div>
            {settings.receiptFooter ? (
              <p className="text-[10px] text-slate-600 italic px-2">
                "{settings.receiptFooter}"
              </p>
            ) : (
              <p className="text-[10px] text-slate-500 font-medium">
                Thank you for your patronage!
              </p>
            )}
          </div>
        </div>

        {/* Footer actions */}
        <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 flex justify-end gap-2 print:hidden">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-lg text-xs font-semibold"
          >
            Close
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs"
          >
            Print Receipt
          </button>
        </div>
      </div>
    </div>
  );
};

