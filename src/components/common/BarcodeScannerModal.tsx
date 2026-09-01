import React, { useState } from 'react';
import { AlertTriangle, Loader2, Pill, ScanBarcode, X } from 'lucide-react';
import { Product, UserRole } from '../../types';
import { productService } from '../../services/productService';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  currentRole: UserRole;
  onClose: () => void;
  onSelectProduct: (product: Product) => void;
}

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  isOpen,
  currentRole,
  onClose,
  onSelectProduct,
}) => {
  const [barcodeInput, setBarcodeInput] = useState('');
  const [scannedProduct, setScannedProduct] = useState<Product | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const resetLookup = () => {
    setBarcodeInput('');
    setScannedProduct(null);
    setNotFound(false);
    setIsLoading(false);
  };

  const handleClose = () => {
    resetLookup();
    onClose();
  };

  const handleScan = async (codeToSearch: string) => {
    const trimmed = codeToSearch.trim();
    if (!trimmed || isLoading) return;

    setIsLoading(true);
    setNotFound(false);
    setScannedProduct(null);
    try {
      const response = await productService.getProductByBarcode(trimmed, currentRole);
      if (response.success && response.data) {
        setScannedProduct(response.data);
      } else {
        setNotFound(true);
      }
    } catch {
      setNotFound(true);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-lg shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <ScanBarcode className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-sm sm:text-base">Scan Product Barcode</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">USB scanner or manual API lookup</p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClose}
            className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="Close barcode lookup"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="w-full rounded-lg border border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-950/30 p-4 flex items-center gap-3">
            <ScanBarcode className="w-8 h-8 text-blue-600 dark:text-blue-400 shrink-0" />
            <div>
              <p className="text-xs font-bold text-blue-900 dark:text-blue-200">Scanner input ready</p>
              <p className="text-[11px] text-blue-700 dark:text-blue-300 mt-0.5">
                Focus the field, scan with a USB barcode device, or type the registered code and press Enter.
              </p>
            </div>
          </div>

          <form
            onSubmit={(event) => {
              event.preventDefault();
              void handleScan(barcodeInput);
            }}
            className="flex gap-2"
          >
            <input
              type="text"
              placeholder="Enter or scan barcode..."
              value={barcodeInput}
              onChange={(event) => {
                setBarcodeInput(event.target.value);
                setScannedProduct(null);
                setNotFound(false);
              }}
              className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-md text-xs sm:text-sm font-mono text-slate-900 dark:text-white focus:ring-1 focus:ring-blue-500 focus:outline-none"
              autoFocus
              autoComplete="off"
            />
            <button
              type="submit"
              disabled={isLoading || !barcodeInput.trim()}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-md text-xs font-semibold shadow-xs inline-flex items-center gap-1.5"
            >
              {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {isLoading ? 'Looking up' : 'Lookup'}
            </button>
          </form>

          {scannedProduct && (
            <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg border border-emerald-200 dark:border-emerald-800 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800 overflow-hidden shrink-0 flex items-center justify-center">
                  {scannedProduct.image ? (
                    <img src={scannedProduct.image} alt={scannedProduct.name} className="w-full h-full object-cover" />
                  ) : (
                    <Pill className="w-5 h-5 text-emerald-600" />
                  )}
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs font-bold text-emerald-950 dark:text-emerald-100 truncate">{scannedProduct.name}</h4>
                  <p className="text-[11px] text-emerald-700 dark:text-emerald-300 truncate">
                    {scannedProduct.genericName} &bull; {scannedProduct.variants?.length ?? 0} brands
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  onSelectProduct(scannedProduct);
                  handleClose();
                }}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-xs font-bold shadow-xs shrink-0"
              >
                View
              </button>
            </div>
          )}

          {notFound && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/30 rounded-lg border border-rose-200 dark:border-rose-800 flex items-center gap-2 text-xs text-rose-700 dark:text-rose-300 font-medium">
              <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
              <span>No product is registered with barcode: {barcodeInput.trim()}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
