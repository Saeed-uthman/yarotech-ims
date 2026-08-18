import React, { useState } from 'react';
import { ScanBarcode, Search, X, Check, Pill, AlertTriangle } from 'lucide-react';
import { Product } from '../../types';
import { productService } from '../../services/productService';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectProduct: (product: Product) => void;
}

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  isOpen,
  onClose,
  onSelectProduct,
}) => {
  const [barcodeInput, setBarcodeInput] = useState('');
  const [scannedProduct, setScannedProduct] = useState<Product | null>(null);
  const [notFound, setNotFound] = useState(false);

  if (!isOpen) return null;

  const handleScan = (codeToSearch: string) => {
    const trimmed = codeToSearch.trim();
    if (!trimmed) return;

    const found = productService.getProductByBarcode(trimmed);
    if (found) {
      setScannedProduct(found);
      setNotFound(false);
    } else {
      setScannedProduct(null);
      setNotFound(true);
    }
  };

  const sampleBarcodes = [
    { name: 'Paracetamol 500mg', code: '8901234567890' },
    { name: 'Amoxicillin 500mg', code: '8901234567891' },
    { name: 'Ciprofloxacin 500mg', code: '8901234567892' },
    { name: 'Vitamin C 500mg', code: '8901234567893' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-md rounded-lg shadow-xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded bg-blue-50 text-blue-600 flex items-center justify-center">
              <ScanBarcode className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm sm:text-base">Scan Medicine Barcode</h3>
              <p className="text-[11px] text-slate-500">Optical scanner simulation & lookup</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Laser Scanner Visualizer */}
        <div className="p-5 space-y-4">
          <div className="relative w-full h-36 bg-slate-950 rounded-lg overflow-hidden flex flex-col items-center justify-center border border-slate-800">
            {/* Visual scan lines */}
            <div className="absolute inset-x-8 top-1/2 -translate-y-1/2 h-0.5 bg-rose-500 shadow-[0_0_12px_#f43f5e] animate-pulse"></div>
            
            <div className="border border-dashed border-blue-500/50 w-48 h-20 rounded-md flex items-center justify-center text-center p-2">
              <span className="text-[11px] text-blue-300 font-mono">
                [ ALIGN BARCODE HERE ]
              </span>
            </div>
            
            <p className="text-[10px] text-slate-400 mt-2 font-mono">
              Ready for hardware or manual input
            </p>
          </div>

          {/* Barcode Input Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleScan(barcodeInput);
            }}
            className="flex gap-2"
          >
            <input
              type="text"
              placeholder="Enter or scan barcode..."
              value={barcodeInput}
              onChange={(e) => {
                setBarcodeInput(e.target.value);
                setNotFound(false);
              }}
              className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-xs sm:text-sm font-mono focus:ring-1 focus:ring-blue-500 focus:outline-none"
              autoFocus
            />
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs font-semibold shadow-xs"
            >
              Lookup
            </button>
          </form>

          {/* Scanned Result Display */}
          {scannedProduct && (
            <div className="p-3.5 bg-emerald-50 rounded-lg border border-emerald-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded bg-white border border-emerald-200 overflow-hidden flex-shrink-0">
                  {scannedProduct.image ? (
                    <img src={scannedProduct.image} alt={scannedProduct.name} className="w-full h-full object-cover" />
                  ) : (
                    <Pill className="w-5 h-5 m-auto text-emerald-600" />
                  )}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-emerald-950">{scannedProduct.name}</h4>
                  <p className="text-[11px] text-emerald-700">{scannedProduct.genericName} • {scannedProduct.variants.length} Brands</p>
                </div>
              </div>

              <button
                onClick={() => {
                  onSelectProduct(scannedProduct);
                  onClose();
                }}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-xs font-bold shadow-xs"
              >
                View
              </button>
            </div>
          )}

          {notFound && (
            <div className="p-3 bg-rose-50 rounded-lg border border-rose-200 flex items-center gap-2 text-xs text-rose-700 font-medium">
              <AlertTriangle className="w-4 h-4 text-rose-500" />
              <span>No product registered with barcode: {barcodeInput}</span>
            </div>
          )}

          {/* Quick Barcode Testing Shortcuts */}
          <div className="pt-2 border-t border-slate-100">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
              Quick Test Barcodes:
            </span>
            <div className="grid grid-cols-2 gap-1.5">
              {sampleBarcodes.map((item) => (
                <button
                  key={item.code}
                  type="button"
                  onClick={() => {
                    setBarcodeInput(item.code);
                    handleScan(item.code);
                  }}
                  className="p-1.5 text-left bg-slate-50 hover:bg-blue-50 border border-slate-200 rounded-md text-[11px] transition-colors"
                >
                  <span className="font-semibold text-slate-800 block truncate">{item.name}</span>
                  <span className="font-mono text-slate-400 text-[10px]">{item.code}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
