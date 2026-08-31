import React, { useCallback, useEffect, useState } from 'react';
import { AlertCircle, Loader2, Printer, RefreshCw, X } from 'lucide-react';
import { Sale } from '../../types';
import { formatNaira } from '../../utils/formatters';
import { useSettings } from '../../hooks';
import { ReceiptBarcode } from '../common/ReceiptBarcode';

interface SaleReceiptModalProps {
  sale: Sale | null;
  isOpen: boolean;
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  onClose: () => void;
}

export const SaleReceiptModal: React.FC<SaleReceiptModalProps> = ({
  sale,
  isOpen,
  isLoading = false,
  error = null,
  onRetry,
  onClose,
}) => {
  const { settings } = useSettings();
  const [isBarcodeReady, setIsBarcodeReady] = useState(false);

  useEffect(() => {
    setIsBarcodeReady(false);
  }, [isOpen, sale?.id]);

  const handleBarcodeReadyChange = useCallback((isReady: boolean) => {
    setIsBarcodeReady(isReady);
  }, []);

  if (!isOpen) return null;

  if (isLoading || !sale) {
    return (
      <div
        id="sale-receipt-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="sale-receipt-preview-title"
        className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4"
      >
        <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-sm w-full overflow-hidden">
          <div className="bg-slate-100 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
            <span id="sale-receipt-preview-title" className="text-xs font-bold text-slate-700">
              Sales Receipt
            </span>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close receipt preview"
              className="p-1 text-slate-400 hover:text-slate-600 rounded-md"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="p-8 text-center">
            {error ? (
              <>
                <AlertCircle className="w-8 h-8 text-rose-500 mx-auto mb-3" />
                <p className="text-sm font-bold text-slate-900">Receipt could not be loaded</p>
                <p className="text-xs text-slate-600 mt-1">{error}</p>
                {onRetry && (
                  <button
                    type="button"
                    onClick={onRetry}
                    className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Retry
                  </button>
                )}
              </>
            ) : (
              <>
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-3" />
                <p className="text-sm font-bold text-slate-900">Loading purchased products...</p>
                <p className="text-xs text-slate-500 mt-1">Preparing the complete receipt.</p>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  const handlePrint = () => {
    if (!isBarcodeReady || sale.items.length === 0) return;

    const originalTitle = document.title;
    const safeInvoiceNumber = (sale.invoiceNumber || `sale-${sale.id}`)
      .replace(/[^a-zA-Z0-9_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
    const restoreDocument = () => {
      document.body.classList.remove('printing-sale-receipt');
      document.title = originalTitle;
      window.removeEventListener('afterprint', restoreDocument);
    };

    document.body.classList.add('printing-sale-receipt');
    document.title = `${safeInvoiceNumber || 'sale'}-receipt`;
    window.addEventListener('afterprint', restoreDocument, { once: true });

    try {
      window.print();
    } catch (error) {
      restoreDocument();
      throw error;
    }
  };

  const isWalking = !sale.customerId;
  const hasOutstanding = sale.outstandingAmount > 0;
  const showDecimals = settings.showDecimals;
  const isCancelled = sale.status === 'CANCELLED';
  const isReceiptReady = isBarcodeReady && sale.items.length > 0;

  return (
    <div
      id="sale-receipt-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="sale-receipt-preview-title"
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4"
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="bg-slate-100 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between print:hidden">
          <span
            id="sale-receipt-preview-title"
            className="text-xs font-bold text-slate-700 flex items-center gap-1.5"
          >
            <Printer className="w-3.5 h-3.5 text-blue-600" />
            <span>80 mm Sales Receipt Preview</span>
          </span>

          <div className="flex items-center gap-2">
            <button
              id="receipt-print-btn"
              type="button"
              onClick={handlePrint}
              disabled={!isReceiptReady}
              className="inline-flex items-center gap-1 px-3 py-1 bg-blue-600 text-white rounded-md text-xs font-semibold hover:bg-blue-700 transition-colors shadow-2xs disabled:opacity-50 disabled:cursor-wait"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>{isReceiptReady ? 'Print' : 'Preparing...'}</span>
            </button>
            <button
              id="receipt-close-btn"
              type="button"
              onClick={onClose}
              aria-label="Close receipt preview"
              className="p-1 text-slate-400 hover:text-slate-600 rounded-md"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <article
          id="printable-receipt"
          className="theme-light-preview receipt-print-sheet p-5 sm:p-6 font-mono text-slate-800 text-xs bg-white space-y-3"
          style={{ backgroundColor: '#ffffff', color: '#0f172a', colorScheme: 'light' }}
        >
          <header className="receipt-print-section text-center space-y-1.5 border-b border-dashed border-slate-300 pb-3">
            {settings.receiptLogo && settings.logo && (
              <div className="flex justify-center mb-1">
                <img
                  src={settings.logo}
                  alt="Pharmacy Logo"
                  className="h-11 w-auto object-contain max-w-[132px]"
                  referrerPolicy="no-referrer"
                />
              </div>
            )}
            <h1 className="text-sm font-extrabold tracking-tight uppercase text-slate-900 leading-tight">
              {settings.pharmacyName || 'AL-AMAAN MEDICINE STORE'}
            </h1>
            {settings.businessDescription && (
              <p className="text-[9px] text-slate-600 font-sans leading-tight">
                {settings.businessDescription}
              </p>
            )}
            {settings.receiptAddress && settings.address && (
              <p className="text-[9px] text-slate-600 leading-tight">{settings.address}</p>
            )}
            {settings.receiptPhone && settings.phone && (
              <p className="text-[9px] text-slate-600">Tel: {settings.phone}</p>
            )}
            <div className="inline-flex items-center border-y border-slate-400 px-3 py-0.5 text-[9px] font-extrabold tracking-[0.16em] uppercase text-slate-900">
              Official Sales Receipt
            </div>
          </header>

          <section className="receipt-print-section text-[10px] space-y-1 border-b border-dashed border-slate-300 pb-3">
            {settings.receiptNumber && (
              <div className="flex justify-between gap-3 font-extrabold text-[11px]">
                <span>INVOICE</span>
                <span className="text-right text-slate-900 break-all">{sale.invoiceNumber}</span>
              </div>
            )}
            {settings.receiptDatetime && (
              <div className="flex justify-between gap-3">
                <span className="text-slate-500">DATE</span>
                <span className="text-right">{sale.date}</span>
              </div>
            )}
            {settings.receiptCashier && (
              <div className="flex justify-between gap-3">
                <span className="text-slate-500">CASHIER</span>
                <span className="text-right">{sale.servedBy}</span>
              </div>
            )}
            {settings.receiptCustomer && (
              <div className="flex justify-between gap-3">
                <span className="text-slate-500">CUSTOMER</span>
                <span className="text-right font-semibold">
                  {isWalking ? 'Walking Customer' : sale.customerName}
                </span>
              </div>
            )}
            {settings.receiptCustomer && sale.customerPhone && (
              <div className="flex justify-between gap-3 text-[9px]">
                <span className="text-slate-500">PHONE</span>
                <span className="text-right">{sale.customerPhone}</span>
              </div>
            )}
            <div className="flex justify-between gap-3 pt-1 border-t border-slate-200">
              <span className="text-slate-500">SALE STATUS</span>
              <span
                className={`font-extrabold tracking-wide ${
                  isCancelled ? 'text-rose-700' : 'text-emerald-700'
                }`}
              >
                {sale.status}
              </span>
            </div>
          </section>

          <section className="receipt-print-section border-b border-dashed border-slate-300 pb-3 space-y-2">
            <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 font-extrabold text-[9px] uppercase tracking-wide text-slate-600 pb-1 border-b border-slate-200">
              <span>Qty · Item / Unit Price</span>
              <span className="text-right">Amount</span>
            </div>

            {sale.items.length === 0 && (
              <div className="rounded-md border border-rose-200 bg-rose-50 p-2 text-[9px] font-bold text-rose-700">
                Purchased product details are unavailable. Close this preview and try again.
              </div>
            )}

            {sale.items.map((item, index) => (
              <div
                key={`${item.productId || item.productName}-${index}`}
                className="receipt-item-row grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-0.5"
              >
                <div className="min-w-0 text-[10px] leading-tight">
                  <span className="font-extrabold text-slate-900">
                    {index + 1}. {item.productName}
                  </span>
                  {item.companyName && (
                    <span className="text-slate-600"> · {item.companyName}</span>
                  )}
                </div>
                <span className="font-extrabold text-[10px] text-right text-slate-900 whitespace-nowrap">
                  {formatNaira(item.subtotal, showDecimals)}
                </span>
                <div className="text-[9px] text-slate-500 leading-tight">
                  {item.quantity} × {formatNaira(item.sellingPrice || item.actualSellingPrice, showDecimals)}
                  {item.dosage ? ` · ${item.dosage}` : ''}
                </div>
              </div>
            ))}

            <div className="flex justify-between pt-1 border-t border-slate-200 text-[9px] font-bold text-slate-600">
              <span>ITEM LINES</span>
              <span>{sale.items.length}</span>
            </div>
          </section>

          <section className="receipt-print-section space-y-1 text-[10px] border-b border-dashed border-slate-300 pb-3">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal</span>
              <span>{formatNaira(sale.subtotal, showDecimals)}</span>
            </div>
            {sale.discount > 0 && (
              <div className="flex justify-between text-slate-700">
                <span>Discount</span>
                <span>- {formatNaira(sale.discount, showDecimals)}</span>
              </div>
            )}
            <div className="flex justify-between font-extrabold text-sm text-slate-900 py-1 border-y border-slate-400">
              <span>TOTAL ({settings.currency})</span>
              <span>{formatNaira(sale.total, showDecimals)}</span>
            </div>
            <div className="flex justify-between font-semibold pt-1">
              <span>Paid via {sale.paymentMethod}</span>
              <span>{formatNaira(sale.amountPaid, showDecimals)}</span>
            </div>
            {hasOutstanding && (
              <div className="flex justify-between font-extrabold text-slate-900">
                <span>OUTSTANDING</span>
                <span>{formatNaira(sale.outstandingAmount, showDecimals)}</span>
              </div>
            )}
            <div className="flex justify-between text-[9px] text-slate-500 pt-1">
              <span>PAYMENT STATUS</span>
              <span className="font-extrabold text-slate-900">{sale.paymentStatus}</span>
            </div>
          </section>

          <footer className="receipt-print-section text-center space-y-2 pt-1 font-sans">
            <ReceiptBarcode
              invoiceNumber={sale.invoiceNumber}
              saleId={sale.id}
              total={sale.total}
              date={sale.rawDate || sale.date}
              onReadyChange={handleBarcodeReadyChange}
            />
            {settings.receiptFooter ? (
              <p className="text-[9px] text-slate-700 italic px-2 leading-tight">
                “{settings.receiptFooter}”
              </p>
            ) : (
              <p className="text-[9px] text-slate-700 font-medium">
                Thank you for your patronage!
              </p>
            )}
            <div className="border-t border-dashed border-slate-300 pt-2 text-[8px] text-slate-500 leading-tight">
              <p>Keep this receipt for payment and transaction verification.</p>
              <p className="mt-0.5">System-generated by Al-Amaan Pharmacy IMS.</p>
            </div>
          </footer>
        </article>

        <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 flex items-center justify-between gap-2 print:hidden">
          <span className="text-[10px] text-slate-500">
            {sale.items.length === 0
              ? 'Purchased product details are unavailable'
              : isBarcodeReady
                ? 'Receipt ready to print'
                : 'Generating receipt barcode...'}
          </span>
          <div className="flex items-center gap-2">
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
              disabled={!isReceiptReady}
              className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs disabled:opacity-50 disabled:cursor-wait"
            >
              {isReceiptReady ? 'Print Receipt' : 'Preparing...'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
