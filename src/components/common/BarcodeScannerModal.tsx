import React, { useEffect } from 'react';
import { X, Camera, ScanLine, AlertCircle, Loader2 } from 'lucide-react';
import { useBarcodeScanner } from '../../hooks/useBarcodeScanner';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onDetected: (barcode: string) => void;
  onClose: () => void;
  title?: string;
  hint?: string;
  lastScannedLabel?: string | null;
}

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  isOpen,
  onDetected,
  onClose,
  title = 'Scan Product Barcode',
  hint = 'Point the camera at a product barcode. It will be detected automatically.',
  lastScannedLabel = null,
}) => {
  const { videoRef, isScanning, error, startScanning, stopScanning } = useBarcodeScanner(onDetected);

  useEffect(() => {
    if (isOpen) {
      startScanning();
    } else {
      stopScanning();
    }
    return () => stopScanning();
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600/20 text-blue-400 flex items-center justify-center">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold">{title}</h3>
              <p className="text-[11px] text-slate-400">Camera stays open — scan multiple products</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Camera viewport */}
        <div className="relative bg-black aspect-video overflow-hidden">
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            muted
            playsInline
          />

          {/* Scan zone overlay */}
          {isScanning && !error && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              {/* Dimmed corners */}
              <div className="absolute inset-0 bg-black/40" />
              {/* Clear scan window */}
              <div className="relative w-56 h-32 z-10">
                <div className="absolute inset-0 border-2 border-blue-400 rounded-lg" />
                {/* Corner accents */}
                <div className="absolute top-0 left-0 w-5 h-5 border-t-4 border-l-4 border-blue-400 rounded-tl-lg" />
                <div className="absolute top-0 right-0 w-5 h-5 border-t-4 border-r-4 border-blue-400 rounded-tr-lg" />
                <div className="absolute bottom-0 left-0 w-5 h-5 border-b-4 border-l-4 border-blue-400 rounded-bl-lg" />
                <div className="absolute bottom-0 right-0 w-5 h-5 border-b-4 border-r-4 border-blue-400 rounded-br-lg" />
                {/* Animated scan line */}
                <div className="absolute inset-x-2 top-1/2 -translate-y-1/2 h-0.5 bg-blue-400/80 animate-pulse" />
              </div>
            </div>
          )}

          {/* Loading state */}
          {!isScanning && !error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white">
              <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
              <span className="text-xs text-slate-300">Starting camera...</span>
            </div>
          )}

          {/* Error state */}
          {error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center">
              <AlertCircle className="w-10 h-10 text-rose-400" />
              <p className="text-xs text-rose-300 font-medium">{error}</p>
              <button
                type="button"
                onClick={startScanning}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors"
              >
                Retry
              </button>
            </div>
          )}
        </div>

        {/* Last scanned toast inside modal */}
        {lastScannedLabel && (
          <div className="px-5 py-2.5 bg-emerald-900/90 border-t border-emerald-700 flex items-center gap-2">
            <ScanLine className="w-4 h-4 text-emerald-400 shrink-0" />
            <p className="text-[11px] text-emerald-300 font-semibold truncate">Added: {lastScannedLabel}</p>
          </div>
        )}

        {/* Footer hint */}
        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex items-start gap-2">
          <ScanLine className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
          <p className="text-[11px] text-slate-500">{hint}</p>
        </div>
      </div>
    </div>
  );
};
