import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { NewSaleModal } from '../src/components/sales/NewSaleModal';
import { CreatePurchaseModal } from '../src/components/purchases/CreatePurchaseModal';
import { BarcodeScannerModal } from '../src/components/common/BarcodeScannerModal';
import { AuthProvider } from '../src/contexts/AuthContext';
import { SystemSettings } from '../src/types';

const variant = { id: 1, company: { id: 1, name: 'Brand A' }, base_price: 50,
  min_selling_price: 100, default_selling_price: 100, max_selling_price: 100,
  current_stock: 5, status: 'Available' };
const state = {
  product: { id: 1, name: 'Router', generic_name: 'Router', barcode: '0123456789012',
    status: 'Active', variants: [variant] },
  cameras: [] as any[], lookups: [] as string[], sales: [] as any[], purchases: [] as any[],
  failStatus: 0, holdLookup: false, releaseLookup: null as (() => void) | null,
  holdCamera: false, releaseCamera: null as (() => void) | null, cameraDenied: false,
  viewed: null as unknown,
};
Object.assign(window, { fixture: state });
window.fetch = async (url, init) => {
  const parsed = new URL(String(url));
  const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
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
  if (location.search.includes('lookup')) return <><button onClick={() => setOpen(true)}>Open scanner</button>
    <BarcodeScannerModal isOpen={open} mode="lookup" onClose={() => setOpen(false)} onSelectProduct={p => { state.viewed = p; }} /></>;
  if (location.search.includes('purchase')) return <AuthProvider><CreatePurchaseModal isOpen={open} onClose={() => setOpen(false)}
    onSuccess={() => setOpen(false)} role="admin" /></AuthProvider>;
  return <NewSaleModal isOpen={open} onClose={() => setOpen(false)} onSuccess={() => setOpen(false)} role="cashier"
    settings={{ allowWalkingSales: true, allowCreditSales: true, requireSaleConfirmation: false, vatEnabled: false } as SystemSettings} />;
}
createRoot(document.getElementById('root')!).render(<React.StrictMode><Fixture /></React.StrictMode>);
