import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { NewSaleModal } from '../src/components/sales/NewSaleModal';
import { CreatePurchaseModal } from '../src/components/purchases/CreatePurchaseModal';
import { BarcodeScannerModal } from '../src/components/common/BarcodeScannerModal';
import { AuthProvider } from '../src/contexts/AuthContext';
import { SystemSettings } from '../src/types';
import { productService } from '../src/services/productService';
import { ProductWizard } from '../src/components/products/ProductWizard';

const variant = { id: 1, company: { id: 1, name: 'Brand A' }, base_price: 50,
  min_selling_price: 100, default_selling_price: 100, max_selling_price: 100,
  current_stock: 5, status: 'Available' };
const state = {
  product: { id: 1, name: 'Router', generic_name: 'Router', barcode: '0123456789012', image: '',
    status: 'Active', variants: [variant] },
  cameras: [] as any[], lookups: [] as string[], sales: [] as any[], purchases: [] as any[],
  failStatus: 0, holdLookup: false, releaseLookup: null as (() => void) | null,
  holdCamera: false, releaseCamera: null as (() => void) | null, cameraDenied: false,
  viewed: null as unknown,
  photoUploads: [] as any[], photoFailStatus: 0, photoEmpty: false, indexedProducts: 1,
  holdPhoto: false, releasePhoto: null as (() => void) | null,
  productWrites: [] as any[], photoStreams: [] as MediaStream[], holdPhotoCamera: false,
  releasePhotoCamera: null as (() => void) | null,
};
Object.assign(window, { fixture: state, productService });
Object.defineProperty(navigator.mediaDevices, 'getUserMedia', { configurable: true, value: async () => {
  const canvas = document.createElement('canvas');
  canvas.width = 320; canvas.height = 240;
  const context = canvas.getContext('2d')!;
  context.fillStyle = '#334455'; context.fillRect(0, 0, 320, 240);
  const stream = canvas.captureStream(5);
  state.photoStreams.push(stream);
  if (state.holdPhotoCamera) await new Promise<void>(resolve => { state.releasePhotoCamera = resolve; });
  return stream;
} });
window.fetch = async (url, init) => {
  const parsed = new URL(String(url));
  const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
  if (parsed.pathname.endsWith('/products/photo-search/')) {
    const form = init?.body as FormData;
    const image = form.get('image') as File;
    state.photoUploads.push({ size: image.size, type: image.type, fields: [...form.keys()] });
    if (state.holdPhoto) await new Promise<void>(resolve => { state.releasePhoto = resolve; });
    if (state.photoFailStatus) return json({ success: false, message: 'Local photo search is not ready.' }, state.photoFailStatus);
    return json({ success: true, data: { matches: state.photoEmpty ? [] : [{ product: state.product, similarity: 0.8 }], indexed_products: state.indexedProducts, requires_confirmation: true } });
  }
  if (parsed.pathname.endsWith('/products/') || parsed.pathname.endsWith('/products/1/')) {
    const body = init?.body;
    state.productWrites.push(body instanceof FormData
      ? { multipart: true, variants: JSON.parse(String(body.get('variants') || '[]')), image: { size: (body.get('image') as File).size, type: (body.get('image') as File).type } }
      : { multipart: false, ...JSON.parse(String(body || '{}')) });
    return json({ success: true, data: state.product });
  }
  if (parsed.pathname.endsWith('/products/barcode-lookup/')) {
    state.lookups.push(parsed.searchParams.get('barcode') || '');
    if (state.holdLookup) await new Promise<void>(resolve => { state.releaseLookup = resolve; });
    if (state.failStatus) return json({ success: false, message: 'Lookup failed' }, state.failStatus);
    return json({ success: true, data: state.product });
  }
  if (parsed.pathname.endsWith('/sales/') || parsed.pathname.endsWith('/purchases/')) {
    const payload = JSON.parse(String(init?.body));
    (parsed.pathname.endsWith('/sales/') ? state.sales : state.purchases).push(payload);
    return json({ success: true, data: { id: 1, ...payload } }, 201);
  }
  throw new Error('Unexpected request: ' + parsed.pathname);
};
function Fixture() {
  const [open, setOpen] = useState(true);
  if (location.search.includes('wizard')) return <ProductWizard categories={[]} companies={[]} onSave={() => {}} onCancel={() => {}} />;
  if (location.search.includes('lookup')) return <><button onClick={() => setOpen(true)}>Open scanner</button>
    <BarcodeScannerModal isOpen={open} mode="lookup" onClose={() => setOpen(false)} onSelectProduct={p => { state.viewed = p; }} /></>;
  if (location.search.includes('purchase')) return <AuthProvider><CreatePurchaseModal isOpen={open} onClose={() => setOpen(false)}
    onSuccess={() => setOpen(false)} role="admin" /></AuthProvider>;
  return <NewSaleModal isOpen={open} onClose={() => setOpen(false)} onSuccess={() => setOpen(false)} role="cashier"
    settings={{ allowWalkingSales: true, allowCreditSales: true, requireSaleConfirmation: false, vatEnabled: false } as SystemSettings} />;
}
createRoot(document.getElementById('root')!).render(<React.StrictMode><Fixture /></React.StrictMode>);
