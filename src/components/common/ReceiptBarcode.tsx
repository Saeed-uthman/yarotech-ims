import React, { useEffect, useMemo, useState } from 'react';
import QRCode from 'qrcode';

interface ReceiptBarcodeProps {
  invoiceNumber: string;
  saleId?: string;
  total: number;
  date?: string;
  compact?: boolean;
  onReadyChange?: (isReady: boolean) => void;
}

export const ReceiptBarcode: React.FC<ReceiptBarcodeProps> = ({
  invoiceNumber,
  saleId,
  total,
  date,
  compact = false,
  onReadyChange,
}) => {
  const [barcodeDataUrl, setBarcodeDataUrl] = useState('');
  const [generationFailed, setGenerationFailed] = useState(false);

  const payload = useMemo(
    () =>
      [
        'ALAMAAN-RECEIPT',
        `INVOICE=${invoiceNumber}`,
        `SALE=${saleId || 'N/A'}`,
        `TOTAL=${Number(total || 0).toFixed(2)}`,
        `DATE=${date || 'N/A'}`,
      ].join('|'),
    [date, invoiceNumber, saleId, total]
  );

  useEffect(() => {
    let isCurrent = true;
    setBarcodeDataUrl('');
    setGenerationFailed(false);
    onReadyChange?.(false);

    QRCode.toDataURL(payload, {
      width: compact ? 180 : 240,
      margin: 1,
      errorCorrectionLevel: 'M',
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    })
      .then((dataUrl) => {
        if (isCurrent) {
          setBarcodeDataUrl(dataUrl);
          onReadyChange?.(true);
        }
      })
      .catch((error) => {
        console.error('Failed to generate receipt barcode:', error);
        if (isCurrent) {
          setGenerationFailed(true);
          // The printed receipt can still use the human-readable reference.
          onReadyChange?.(true);
        }
      });

    return () => {
      isCurrent = false;
    };
  }, [compact, onReadyChange, payload]);

  return (
    <div
      className="flex flex-col items-center gap-1.5"
      aria-label={`Receipt barcode for ${invoiceNumber}`}
    >
      {barcodeDataUrl ? (
        <img
          src={barcodeDataUrl}
          alt={`Scannable receipt barcode for ${invoiceNumber}`}
          className={`${compact ? 'w-20 h-20' : 'w-24 h-24'} block bg-white p-1 border border-slate-200 rounded-sm`}
        />
      ) : generationFailed ? (
        <div className="w-24 py-2 px-3 bg-white border border-slate-300 text-[9px] text-slate-600 rounded-sm">
          Barcode unavailable
        </div>
      ) : (
        <div
          className={`${compact ? 'w-20 h-20' : 'w-24 h-24'} bg-slate-100 border border-slate-200 rounded-sm animate-pulse`}
          aria-label="Generating receipt barcode"
        />
      )}

      <div className="text-[8px] font-bold uppercase tracking-[0.16em] text-slate-500">
        Scan receipt
      </div>
      <div className="max-w-[220px] break-all text-center font-mono text-[8px] tracking-wider text-slate-700">
        {invoiceNumber}
      </div>
    </div>
  );
};
