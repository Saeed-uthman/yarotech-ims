import React, { useEffect, useRef, useState } from 'react';
import { X, Camera, Loader2 } from 'lucide-react';
import { useBarcodeScanner } from '../../hooks/useBarcodeScanner';
import { productService } from '../../services/productService';
import { ApiError } from '../../services/apiClient';
import { CompanyVariant, Product } from '../../types';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode?: 'sale' | 'purchase' | 'lookup';
  quantities?: Record<string, number>;
  onAdd?: (product: Product, variant: CompanyVariant, quantity: number) => void;
  onSelectProduct?: (product: Product) => void;
}

// Each opening owns a fresh scan and lookup session.
export function BarcodeScannerModal({ isOpen, ...props }: BarcodeScannerModalProps) {
  return isOpen ? <BarcodeScannerSession {...props} /> : null;
}

function BarcodeScannerSession({ onClose, mode = 'lookup', quantities = {}, onAdd, onSelectProduct }: Omit<BarcodeScannerModalProps, 'isOpen'>) {
  const [phase, setPhase] = useState<'scan' | 'loading' | 'result' | 'error'>('scan');
  const [product, setProduct] = useState<Product | null>(null);
  const [variantId, setVariantId] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [lookupError, setLookupError] = useState('');
  const active = useRef(true);
  const accepted = useRef(false);
  const committed = useRef(false);
  const dialogRef = useRef<HTMLDivElement>(null);

  const detected = async (barcode: string) => {
    if (!active.current || accepted.current) return;
    accepted.current = true;
    setPhase('loading');
    try {
      const response = await productService.getProductByBarcodeExact(barcode);
      if (!active.current) return;
      if (!response.success || !response.data) throw new Error('Lookup failed');
      const found = response.data;
      if (mode !== 'lookup' && found.status !== 'Active') {
        setLookupError(found.name + ' is inactive. Choose an active product.');
        setPhase('error');
        return;
      }
      const variants = found.variants.filter(v => v.status === 'Available');
      setProduct(found);
      setVariantId(variants.length === 1 ? variants[0].id : '');
      setPhase('result');
    } catch (error) {
      if (!active.current) return;
      setLookupError(error instanceof ApiError && error.status === 404
        ? 'No product matches barcode ' + barcode + '. Save this product barcode in the catalogue first, or use product search.'
        : 'Product lookup failed. Check your connection and retry.');
      setPhase('error');
    }
  };
  const { videoRef, isScanning, error, startScanning, stopScanning } = useBarcodeScanner(detected);

  useEffect(() => {
    active.current = true;
    const previous = document.activeElement as HTMLElement | null;
    return () => { active.current = false; previous?.focus(); };
  }, []);

  useEffect(() => {
    if (phase === 'scan') void startScanning();
    return stopScanning;
  }, [phase, startScanning, stopScanning]);

  useEffect(() => {
    const dialog = dialogRef.current;
    (dialog?.querySelector<HTMLElement>('[data-scan-focus]') || dialog)?.focus();
  }, [phase]);

  const variants = product?.variants.filter(v => v.status === 'Available') || [];
  const variant = variants.find(v => v.id === variantId);
  const remaining = variant ? Math.max(0, variant.currentStock - (quantities[variant.id] || 0)) : 0;
  const number = Number(quantity);
  const valid = !!variant && Number.isSafeInteger(number) && number > 0 && (mode !== 'sale' || number <= remaining);

  const retry = () => {
    accepted.current = false;
    setProduct(null);
    setVariantId('');
    setQuantity('1');
    setLookupError('');
    setPhase('scan');
  };
  const confirm = () => {
    if (!product || committed.current || (mode !== 'lookup' && !valid)) return;
    committed.current = true;
    if (mode === 'lookup') onSelectProduct?.(product);
    else onAdd?.(product, variant!, number);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4"
      onKeyDown={event => {
        event.stopPropagation();
        if (event.key === 'Escape') { event.preventDefault(); onClose(); }
        if (event.key === 'Tab') {
          const nodes = [...(dialogRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select:not(:disabled)') || [])];
          const first = nodes[0]; const last = nodes[nodes.length - 1];
          if (event.shiftKey && (document.activeElement === first || document.activeElement === dialogRef.current)) { event.preventDefault(); last?.focus(); }
          else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
        }
      }}>
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="barcode-title" tabIndex={-1}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90dvh] overflow-y-auto">
        <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between">
          <h3 id="barcode-title" className="font-bold flex items-center gap-2"><Camera className="w-5 h-5" />
            {mode === 'sale' ? 'Scan product for sale' : mode === 'purchase' ? 'Scan product to restock' : 'Find product by barcode'}
          </h3>
          <button type="button" onClick={onClose} aria-label="Close barcode scanner" className="p-2 rounded-lg hover:bg-white/10"><X className="w-5 h-5" /></button>
        </div>
        {phase === 'scan' && <>
          <div className="relative bg-black aspect-video">
            <video ref={videoRef} className="w-full h-full object-cover" muted playsInline aria-label="Barcode camera preview" />
            {!isScanning && !error && <p role="status" className="absolute inset-0 flex items-center justify-center text-white">Starting camera...</p>}
          </div>
          {error && <div className="p-4"><p role="alert" className="text-rose-700 text-sm">{error}</p>
            <button type="button" onClick={() => void startScanning()} className="mt-3 text-blue-700 font-semibold">Retry camera</button></div>}
          <p className="p-5 text-sm text-slate-600">Scan the product barcode saved in your catalogue. {mode !== 'lookup' && 'Then choose the quantity to add.'}</p>
        </>}
        {phase === 'loading' && <p role="status" className="p-8 flex items-center gap-3"><Loader2 className="animate-spin w-5 h-5" /> Finding product...</p>}
        {phase === 'error' && <div className="p-5"><p role="alert" className="text-rose-700 text-sm">{lookupError}</p>
          <button type="button" data-scan-focus onClick={retry} className="mt-4 font-semibold text-blue-700">Scan again</button></div>}
        {phase === 'result' && product && <div className="p-5 space-y-4">
          <div><p className="font-bold text-slate-900">{product.name}</p><p className="text-xs text-slate-500 break-all">Barcode: {product.barcode}</p></div>
          {mode !== 'lookup' && <>
            {variants.length === 0 ? <p role="alert" className="text-rose-700">This product has no active variants.</p> : <>
              <label className="block text-sm font-medium" htmlFor="barcode-variant">Product variant / manufacturer</label>
              <select id="barcode-variant" data-scan-focus={variants.length > 1 ? true : undefined} value={variantId} onChange={event => setVariantId(event.target.value)} className="w-full border border-slate-300 rounded-lg p-3">
                <option value="" disabled>Choose a variant</option>
                {variants.map(v => <option key={v.id} value={v.id}>{v.companyName} — {v.currentStock} in stock</option>)}
              </select>
              {variant && <>
                <label className="block text-sm font-medium" htmlFor="barcode-quantity">Quantity to {mode === 'sale' ? 'sell' : 'restock'}</label>
                <input id="barcode-quantity" data-scan-focus={variants.length === 1 ? true : undefined} type="number" min="1" step="1" max={mode === 'sale' ? remaining : undefined}
                  value={quantity} onFocus={event => event.target.select()} onChange={event => setQuantity(event.target.value)} aria-describedby="barcode-quantity-help" aria-invalid={!valid}
                  className="w-full border border-slate-300 rounded-lg p-3" />
                <p id="barcode-quantity-help" className="text-sm text-slate-600">{mode === 'sale' ? remaining + ' available to add after quantities already in the cart.' : 'Enter the number of units received. Review the purchase price in the order.'}</p>
                {!valid && <p role="alert" className="text-sm text-rose-700">{mode === 'sale' && remaining === 0 ? 'No stock remains available to add.' : 'Enter a positive whole quantity within the available limit.'}</p>}
              </>}
            </>}
          </>}
          <div className="flex gap-3">
            <button type="button" onClick={retry} className="border border-slate-300 rounded-lg px-4 py-2">Scan another</button>
            <button type="button" data-scan-focus={mode === 'lookup' ? true : undefined} disabled={mode !== 'lookup' && !valid} onClick={confirm}
              className="bg-blue-600 text-white rounded-lg px-4 py-2 disabled:opacity-40">{mode === 'lookup' ? 'View product' : mode === 'sale' ? 'Add to sale' : 'Add to restock'}</button>
          </div>
        </div>}
      </div>
    </div>
  );
}
