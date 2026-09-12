import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { CustomerSearchField } from '../src/components/sales/CustomerSearchField';
import { NewSaleModal } from '../src/components/sales/NewSaleModal';
import { Customer, SystemSettings } from '../src/types';
import { apiCache } from '../src/services/apiCache';

function Fixture() {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [visible, setVisible] = useState(true);
  if (location.search.includes('sale')) return <NewSaleModal isOpen={visible} onClose={() => setVisible(false)}
    onSuccess={() => setVisible(false)} role="cashier"
    settings={{ allowWalkingSales: true, allowCreditSales: true, requireSaleConfirmation: false } as SystemSettings} />;
  return <>
    {visible && <CustomerSearchField onSelect={setCustomer} />}
    <output id="selection">{customer?.id || 'none'}</output>
    <button onClick={() => setVisible(false)}>Cancel sale</button>
  </>;
}

// Transport fixture: real components and API adapters, isolated from business data.
const state = {
  rows: [] as any[], posts: [] as any[], gets: [] as string[], sales: [] as any[],
  fail: false, failPage: 0, slowQuery: '', held: [] as (() => void)[],
  holdPost: false, pendingPost: null as (() => void) | null, cacheCleared: false,
};
Object.assign(window, { fixture: state });
window.fetch = async (url, init) => {
  const parsed = new URL(String(url));
  const json = (data: any, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
  if (parsed.pathname.endsWith('/customers/')) {
    if (init?.method === 'POST') {
      const payload = JSON.parse(String(init.body)); state.posts.push(payload);
      if (state.holdPost) await new Promise<void>(resolve => { state.pendingPost = resolve; });
      const row = { id: 999, status: 'Active', phone: null, outstanding_debt: 0, ...payload };
      state.rows.push(row);
      return json({ success: true, data: row }, 201);
    }
    const query = parsed.searchParams.get('search') || '';
    const page = Number(parsed.searchParams.get('page') || 1);
    state.gets.push(`${query}:${page}`);
    const rows = state.rows.filter(row => row.name.toLowerCase().includes(query.toLowerCase()) || row.phone?.includes(query));
    if (query === state.slowQuery) await new Promise<void>(resolve => { state.held.push(resolve); });
    if (state.fail || page === state.failPage) return json({ success: false, message: 'Search failed' }, 503);
    return json({ success: true, data: rows.slice((page - 1) * 100, page * 100),
      meta: { current_page: page, per_page: 100, total: rows.length, total_pages: Math.max(1, Math.ceil(rows.length / 100)) } });
  }
  if (parsed.pathname.endsWith('/products/')) return json({ success: true, data: [{ id: 1, name: 'Router', generic_name: '', barcode: '',
    status: 'Active', variants: [{ id: 1, company: { id: 1, name: 'Test' }, base_price: 50,
      min_selling_price: 100, default_selling_price: 100, max_selling_price: 100, current_stock: 5, status: 'Available' }] }] });
  if (parsed.pathname.endsWith('/sales/')) {
    const payload = JSON.parse(String(init?.body)); state.sales.push(payload);
    return json({ success: true, data: { id: 1, ...payload } }, 201);
  }
  throw new Error(`Unexpected API request: ${parsed.pathname}`);
};
apiCache.set('customers:test', { old: true });
Object.assign(window, { cacheIsCleared: () => apiCache.get('customers:test').data === null });
createRoot(document.getElementById('root')!).render(<Fixture />);
