import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import {
  QrCode,
  Download,
  Printer,
  Copy,
  Check,
  X,
  Building2,
  Barcode,
  Layers,
  Sparkles,
  RefreshCw,
  FileDown,
  Tag
} from 'lucide-react';
import { Product, CompanyVariant } from '../../types';
import { formatNaira } from '../../utils/formatters';

interface ProductQRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product;
  selectedVariant?: CompanyVariant | null;
}

export const ProductQRCodeModal: React.FC<ProductQRCodeModalProps> = ({
  isOpen,
  onClose,
  product,
  selectedVariant: initialVariant = null,
}) => {
  const [selectedVariantId, setSelectedVariantId] = useState<string>(
    initialVariant?.id || (product.variants.length > 0 ? product.variants[0].id : '')
  );
  const [dataMode, setDataMode] = useState<'barcode' | 'json' | 'url'>('barcode');
  const [includeLabelHeader, setIncludeLabelHeader] = useState(true);
  const [qrSize, setQrSize] = useState<number>(300);
  const [errorCorrectionLevel, setErrorCorrectionLevel] = useState<'L' | 'M' | 'Q' | 'H'>('M');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [isCopied, setIsCopied] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  // Find active variant
  const currentVariant = product.variants.find((v) => v.id === selectedVariantId) || product.variants[0];
  const activeBarcode = product.barcode || 'MED-00000000';

  // Compute payload string
  const getPayloadString = () => {
    if (dataMode === 'barcode') {
      return activeBarcode;
    }
    if (dataMode === 'json') {
      return JSON.stringify(
        {
          id: product.id,
          barcode: activeBarcode,
          name: product.name,
          generic: product.genericName,
          category: product.category,
          dosage: product.dosage,
          form: product.form,
          company: currentVariant ? currentVariant.companyName : undefined,
          price: currentVariant ? currentVariant.sellingPrice : undefined,
        },
        null,
        2
      );
    }
    // URL mode
    return `https://medstock.pharma/p/${encodeURIComponent(activeBarcode)}`;
  };

  // Generate QR Code on change
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setIsGenerating(true);

    const payload = getPayloadString();

    QRCode.toDataURL(payload, {
      width: qrSize,
      margin: 2,
      errorCorrectionLevel: errorCorrectionLevel,
      color: {
        dark: '#0f172a', // slate-900
        light: '#ffffff',
      },
    })
      .then((url) => {
        if (isMounted) {
          setQrDataUrl(url);
          setIsGenerating(false);
        }
      })
      .catch((err) => {
        console.error('Failed to generate QR Code:', err);
        if (isMounted) {
          setIsGenerating(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, activeBarcode, dataMode, selectedVariantId, qrSize, errorCorrectionLevel]);

  if (!isOpen) return null;

  // Handle Download Standalone QR Code
  const handleDownloadQR = () => {
    if (!qrDataUrl) return;
    const link = document.createElement('a');
    const safeName = product.name.replace(/[^a-zA-Z0-9_-]/g, '_');
    link.download = `QR_${activeBarcode}_${safeName}.png`;
    link.href = qrDataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Handle Download Complete Shelf Tag Image
  const handleDownloadShelfTag = async () => {
    if (!qrDataUrl) return;

    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const width = 600;
      const height = 400;
      canvas.width = width;
      canvas.height = height;

      // Background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);

      // Border with rounded corners
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 4;
      ctx.strokeRect(10, 10, width - 20, height - 20);

      // Top banner
      ctx.fillStyle = '#2563eb';
      ctx.fillRect(10, 10, width - 20, 36);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 14px sans-serif';
      ctx.fillText('YAROTECH INVENTORY SHELF TAG', 24, 34);

      // Product Title
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 24px sans-serif';
      ctx.fillText(product.name.substring(0, 28), 24, 85);

      // Generic & Category
      ctx.fillStyle = '#64748b';
      ctx.font = '14px sans-serif';
      ctx.fillText(`${product.genericName} • ${product.category}`, 24, 110);

      // Dosage & Form Badge
      ctx.fillStyle = '#f1f5f9';
      ctx.fillRect(24, 125, 200, 32);
      ctx.fillStyle = '#334155';
      ctx.font = 'bold 13px sans-serif';
      ctx.fillText(`${product.dosage} | ${product.form}`, 34, 146);

      // Company Variant & Price
      if (currentVariant) {
        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 15px sans-serif';
        ctx.fillText(`MFR: ${currentVariant.companyName}`, 24, 195);

        ctx.fillStyle = '#16a34a';
        ctx.font = 'bold 28px monospace';
        ctx.fillText(formatNaira(currentVariant.sellingPrice), 24, 235);
      }

      // Barcode string
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 16px monospace';
      ctx.fillText(activeBarcode, 24, 280);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '11px sans-serif';
      ctx.fillText('Scan with camera or 2D POS reader', 24, 310);

      // Draw QR Code Image on Right
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        ctx.drawImage(img, 360, 75, 210, 210);

        // Date generated footer
        ctx.fillStyle = '#cbd5e1';
        ctx.fillRect(10, 355, width - 20, 1);
        ctx.fillStyle = '#94a3b8';
        ctx.font = '11px sans-serif';
        ctx.fillText(`Generated: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`, 24, 380);

        const safeName = product.name.replace(/[^a-zA-Z0-9_-]/g, '_');
        const link = document.createElement('a');
        link.download = `ShelfTag_${activeBarcode}_${safeName}.png`;
        link.href = canvas.toDataURL('image/png');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      };
      img.src = qrDataUrl;
    } catch (err) {
      console.error('Failed to create shelf tag canvas:', err);
    }
  };

  // Handle Copy to Clipboard
  const handleCopyBarcode = async () => {
    try {
      await navigator.clipboard.writeText(getPayloadString());
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error('Could not copy to clipboard:', err);
    }
  };

  // Handle Print
  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const payload = getPayloadString();

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>QR Code Shelf Label - ${product.name}</title>
          <style>
            @page {
              size: auto;
              margin: 10mm;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
              color: #0f172a;
              margin: 0;
              padding: 10px;
              background: #fff;
            }
            .label-card {
              border: 2px solid #0f172a;
              border-radius: 8px;
              padding: 16px;
              max-width: 420px;
              box-sizing: border-box;
              page-break-inside: avoid;
            }
            .header-banner {
              background: #0f172a;
              color: #fff;
              padding: 4px 8px;
              font-size: 11px;
              font-weight: 700;
              letter-spacing: 0.05em;
              text-transform: uppercase;
              margin-bottom: 12px;
              border-radius: 4px;
            }
            .prod-title {
              font-size: 18px;
              font-weight: 800;
              margin: 0 0 4px 0;
              line-height: 1.2;
            }
            .prod-sub {
              font-size: 12px;
              color: #475569;
              margin: 0 0 10px 0;
            }
            .grid {
              display: flex;
              justify-content: space-between;
              align-items: center;
              gap: 16px;
            }
            .info-col {
              flex: 1;
            }
            .badge {
              display: inline-block;
              background: #f1f5f9;
              padding: 3px 6px;
              border-radius: 4px;
              font-size: 11px;
              font-weight: 700;
              margin-bottom: 6px;
            }
            .price {
              font-size: 20px;
              font-weight: 800;
              color: #16a34a;
              font-family: monospace;
              margin: 6px 0;
            }
            .barcode-num {
              font-family: monospace;
              font-size: 13px;
              font-weight: 700;
              letter-spacing: 0.1em;
              color: #0f172a;
            }
            .qr-col {
              text-align: center;
            }
            .qr-col img {
              width: 140px;
              height: 140px;
              display: block;
            }
            .footer {
              margin-top: 10px;
              padding-top: 8px;
              border-top: 1px dashed #cbd5e1;
              font-size: 10px;
              color: #64748b;
              display: flex;
              justify-content: space-between;
            }
          </style>
        </head>
        <body>
          <div class="label-card">
            <div class="header-banner">Yarotech Stock Item</div>
            <div class="prod-title">${product.name}</div>
            <div class="prod-sub">${product.genericName} • ${product.category}</div>
            
            <div class="grid">
              <div class="info-col">
                <div class="badge">${product.dosage} • ${product.form}</div>
                ${currentVariant ? `<div style="font-size:12px; font-weight:600; margin-top:4px;">Mfr: ${currentVariant.companyName}</div>` : ''}
                ${currentVariant ? `<div class="price">${formatNaira(currentVariant.sellingPrice)}</div>` : ''}
                <div class="barcode-num">${activeBarcode}</div>
              </div>
              <div class="qr-col">
                <img src="${qrDataUrl}" alt="QR Code" />
              </div>
            </div>

            <div class="footer">
              <span>MedStock Inventory</span>
              <span>${new Date().toLocaleDateString()}</span>
            </div>
          </div>
          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div
      id="product-qr-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-auto max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-blue-100/80 border border-blue-200 flex items-center justify-center text-blue-600 shadow-xs">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-slate-900 leading-tight">
                Product QR Code Generator
              </h2>
              <p className="text-xs text-slate-500">
                Generate, download, and print scannable 2D barcodes for stock labeling
              </p>
            </div>
          </div>
          <button
            id="close-qr-modal-btn"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            {/* Left Column: QR Code Visual & Shelf Label Preview */}
            <div className="md:col-span-6 flex flex-col items-center justify-center bg-slate-50 rounded-xl p-5 border border-slate-200/90 shadow-inner">
              <div
                ref={printRef}
                className="w-full bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center text-center space-y-3"
              >
                {/* Product Micro Header */}
                <div className="w-full border-b border-slate-100 pb-2">
                  <div className="flex items-center justify-center gap-1 text-[10px] font-bold text-blue-700 uppercase tracking-wider bg-blue-50 py-0.5 rounded">
                    <Tag className="w-3 h-3" />
                    <span>Yarotech Inventory Label</span>
                  </div>
                  <h3 className="font-extrabold text-slate-900 text-sm mt-1.5 truncate">
                    {product.name}
                  </h3>
                  <div className="text-[11px] text-slate-500 font-medium truncate">
                    {product.genericName} • {product.dosage}
                  </div>
                </div>

                {/* QR Code Canvas / Image */}
                <div className="relative p-2 bg-white rounded-lg border border-slate-100 shadow-xs flex items-center justify-center min-h-[160px] min-w-[160px]">
                  {isGenerating ? (
                    <div className="flex flex-col items-center justify-center gap-2 text-slate-400">
                      <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
                      <span className="text-xs font-semibold">Generating QR...</span>
                    </div>
                  ) : qrDataUrl ? (
                    <img
                      src={qrDataUrl}
                      alt={`QR Code for ${product.name}`}
                      className="w-40 h-40 object-contain rounded transition-transform hover:scale-105"
                    />
                  ) : (
                    <div className="text-xs text-rose-500 font-medium">Failed to generate QR</div>
                  )}
                </div>

                {/* Human Readable Barcode & Variant Info */}
                <div className="w-full space-y-1">
                  <div className="flex items-center justify-center gap-1.5 text-xs font-mono font-bold text-slate-900 bg-slate-100/90 py-1 px-2 rounded tracking-widest">
                    <Barcode className="w-4 h-4 text-slate-600" />
                    <span>{activeBarcode}</span>
                  </div>
                  {currentVariant && (
                    <div className="flex items-center justify-between text-xs pt-1 px-1">
                      <span className="text-slate-500 font-semibold truncate max-w-[110px]">
                        {currentVariant.companyName}
                      </span>
                      <span className="font-mono font-bold text-emerald-600">
                        {formatNaira(currentVariant.sellingPrice)}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Quick payload summary */}
              <div className="w-full mt-3 flex items-center justify-between px-2 text-[11px] text-slate-500">
                <span>Payload: <strong className="text-slate-800 font-mono">{dataMode}</strong></span>
                <span>Correction: <strong className="text-slate-800">ECC {errorCorrectionLevel}</strong></span>
              </div>
            </div>

            {/* Right Column: Settings, Formats & Customization */}
            <div className="md:col-span-6 space-y-4">
              {/* Variant Selector (if multi-variant) */}
              {product.variants.length > 1 && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-blue-600" />
                    <span>Select Brand Variant</span>
                  </label>
                  <select
                    id="qr-variant-select"
                    value={selectedVariantId}
                    onChange={(e) => setSelectedVariantId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    {product.variants.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.companyName} — {formatNaira(v.sellingPrice)} (Stock: {v.currentStock})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Data Encoding Mode */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-blue-600" />
                  <span>Encoded Data Payload</span>
                </label>
                <div className="grid grid-cols-3 gap-1.5 bg-slate-100 p-1 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setDataMode('barcode')}
                    className={`py-1.5 px-2 text-[11px] font-bold rounded-md transition-all ${
                      dataMode === 'barcode'
                        ? 'bg-white text-blue-700 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Barcode Only
                  </button>
                  <button
                    type="button"
                    onClick={() => setDataMode('json')}
                    className={`py-1.5 px-2 text-[11px] font-bold rounded-md transition-all ${
                      dataMode === 'json'
                        ? 'bg-white text-blue-700 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    JSON Item
                  </button>
                  <button
                    type="button"
                    onClick={() => setDataMode('url')}
                    className={`py-1.5 px-2 text-[11px] font-bold rounded-md transition-all ${
                      dataMode === 'url'
                        ? 'bg-white text-blue-700 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Scan URL
                  </button>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  {dataMode === 'barcode'
                    ? 'Encodes raw barcode string for direct compatibility with standard 2D POS scanners.'
                    : dataMode === 'json'
                    ? 'Encodes full JSON with medication name, category, dosage, form & price.'
                    : 'Encodes an inventory deep-link URL for smartphone audit scanning.'}
                </p>
              </div>

              {/* Resolution & Error Correction Options */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Image Size
                  </label>
                  <select
                    value={qrSize}
                    onChange={(e) => setQrSize(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-xs font-medium text-slate-900"
                  >
                    <option value={200}>Standard (200px)</option>
                    <option value={300}>High-Res (300px)</option>
                    <option value={500}>Ultra Print (500px)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Error Correction
                  </label>
                  <select
                    value={errorCorrectionLevel}
                    onChange={(e) => setErrorCorrectionLevel(e.target.value as any)}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-xs font-medium text-slate-900"
                  >
                    <option value="L">Level L (7% recovery)</option>
                    <option value="M">Level M (15% standard)</option>
                    <option value="Q">Level Q (25% high)</option>
                    <option value="H">Level H (30% best)</option>
                  </select>
                </div>
              </div>

              {/* Barcode Quick Copy */}
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200/80 flex items-center justify-between gap-2">
                <div className="truncate">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Encoded Content</span>
                  <span className="text-xs font-mono font-bold text-slate-800 truncate block">
                    {getPayloadString()}
                  </span>
                </div>
                <button
                  id="qr-copy-content-btn"
                  onClick={handleCopyBarcode}
                  className="px-2.5 py-1.5 rounded-md border border-slate-200 bg-white hover:bg-slate-100 text-xs font-semibold text-slate-700 flex items-center gap-1 shrink-0 transition-colors shadow-2xs"
                  title="Copy encoded payload text"
                >
                  {isCopied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-700">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-slate-500" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer: Action Buttons */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-slate-600 hover:bg-slate-200/70 rounded-lg text-xs font-bold transition-colors"
          >
            Close
          </button>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Print Label Button */}
            <button
              id="qr-print-label-btn"
              onClick={handlePrint}
              disabled={!qrDataUrl}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-bold transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
              title="Print standard shelf sticker with barcode & price"
            >
              <Printer className="w-3.5 h-3.5 text-slate-600" />
              <span>Print Shelf Tag</span>
            </button>

            {/* Download Complete Shelf Tag PNG */}
            <button
              id="qr-download-shelftag-btn"
              onClick={handleDownloadShelfTag}
              disabled={!qrDataUrl}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-bold transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
              title="Download formatted sticker PNG with product details"
            >
              <Tag className="w-3.5 h-3.5 text-emerald-600" />
              <span>Download Shelf Tag</span>
            </button>

            {/* Download Standalone QR Code PNG */}
            <button
              id="qr-download-png-btn"
              onClick={handleDownloadQR}
              disabled={!qrDataUrl}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-lg text-xs font-bold transition-colors shadow-xs cursor-pointer disabled:opacity-50"
              title="Download crisp QR Code image PNG"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download QR Code</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
