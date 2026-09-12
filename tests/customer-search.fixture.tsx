import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { CustomerSearchField } from '../src/components/sales/CustomerSearchField';
import { NewSaleModal } from '../src/components/sales/NewSaleModal';
import { Customer, SystemSettings } from '../src/types';
import { CustomerProfileModal } from '../src/components/customers/CustomerProfileModal';
import { SaleReceiptModal } from '../src/components/sales/SaleReceiptModal';
import { SettingsModule } from '../src/components/settings/SettingsModule';
import { VatReportView } from '../src/components/reports/VatReportView';
import { useCustomerProfile } from '../src/hooks/useCustomers';
import { mapBackendSale } from '../src/services/salesService';
import { apiCache } from '../src/services/apiCache';

function HistoryFixture() {
  const profile = useCustomerProfile('1', 'admin');
  return <CustomerProfileModal customer={profile.customer} sales={profile.sales} debtPayments={profile.debtPayments}
    isOpen isLoading={profile.isCustomerLoading} isSalesLoading={profile.isSalesLoading} isDebtLoading={profile.isDebtLoading}
    currentRole="admin" onClose={() => {}} onRecordPayment={() => {}} onEditCustomer={() => {}} onToggleStatus={() => {}}
    error={profile.error} onRefresh={profile.refetch} />;
}

function Fixture() {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [visible, setVisible] = useState(true);
  if (location.search.includes('history')) return <HistoryFixture />;
  if (location.search.includes('receipt')) return <SaleReceiptModal sale={mapBackendSale(historySale)} isOpen onClose={() => {}} />;
  if (location.search.includes('vat-report')) return <VatReportView filters={{ dateRange: 'today' }} revision={0} />;
  if (location.search.includes('settings')) return <SettingsModule role="admin" />;
  if (location.search.includes('sale')) return <NewSaleModal isOpen={visible} onClose={() => setVisible(false)}
    onSuccess={() => setVisible(false)} role="cashier"
    settings={{ allowWalkingSales: true, allowCreditSales: true, requireSaleConfirmation: false, vatEnabled: location.search.includes('vat'), vatRate: 7.5 } as SystemSettings} />;
  return <>
    {visible && <CustomerSearchField onSelect={setCustomer} />}
    <output id="selection">{customer?.id || 'none'}</output>
    <button onClick={() => setVisible(false)}>Cancel sale</button>
  </>;
}

// Transport fixture: real components and API adapters, isolated from business data.
const state = {
  rows: [] as any[], posts: [] as any[], gets: [] as string[], sales: [] as any[],
  historyPages: [] as number[], settingsWrites: [] as any[],
  fail: false, failPage: 0, slowQuery: '', held: [] as (() => void)[],
  holdPost: false, pendingPost: null as (() => void) | null, cacheCleared: false,
};
Object.assign(window, { fixture: state });
window.fetch = async (url, init) => {
  const parsed = new URL(String(url));
  const json = (data: any, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
  if (parsed.pathname.endsWith('/settings/')) {
    if (init?.method === 'PATCH') state.settingsWrites.push(JSON.parse(String(init.body)));
    return json({ success: true, data: { id: 1, pharmacy_name: 'Test Business', phone: '08012345678', email: 'test@example.com',
      address: 'Test address', vat_enabled: true, vat_rate: '7.50', ...state.settingsWrites.at(-1) } });
  }
  if (parsed.pathname.endsWith('/reports/vat/')) return json({ success: true, data: {
    vat_billed: '75.00', vat_collected: '37.50', vat_awaiting_payment: '37.50',
    daily: [{ date: '2026-09-12', vat_billed: '75.00', vat_collected: '37.50' }],
  } });
  if (parsed.pathname.endsWith('/customers/1/')) return json({ success: true, data: { id: 1, name: 'History Customer', phone: null, status: 'Active' } });
  if (parsed.pathname.endsWith('/customers/1/payments/')) return json({ success: true, data: [] });
  if (parsed.pathname.endsWith('/customers/1/sales/')) {
    const page = Number(parsed.searchParams.get('page') || 1);
    state.historyPages.push(page);
    return json({ success: true, data: page === 1 ? [historySale] : [{ ...historySale, id: 2, invoice_number: 'HIST-2' }],
      meta: { current_page: page, total_pages: 2 } });
  }
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
    status: 'Active', vat_enabled: location.search.includes('vat'), variants: [{ id: 1, company: { id: 1, name: 'Test' }, base_price: 50,
      min_selling_price: 100, default_selling_price: 100, max_selling_price: 100, current_stock: 5, status: 'Available' }] }] });
  if (parsed.pathname.endsWith('/sales/')) {
    const payload = JSON.parse(String(init?.body)); state.sales.push(payload);
    return json({ success: true, data: { id: 1, ...payload } }, 201);
  }
  throw new Error(`Unexpected API request: ${parsed.pathname}`);
};
apiCache.set('customers:test', { old: true });
Object.assign(window, { cacheIsCleared: () => apiCache.get('customers:test').data === null });
const historySale = { id: 1, invoice_number: 'HIST-1', customer: 1, customer_name: 'History Customer',
  subtotal: '1000.00', discount: '0', vat_amount: '75.00', total_amount: '1075.00', amount_paid: '500.00',
  outstanding_amount: '575.00', payment_status: 'PARTIAL', payment_method: 'CASH', status: 'COMPLETED',
  created_at: '2026-09-12T10:00:00Z', items: [{ id: 1, variant_id: 1, product_name: 'History Router',
    company_name: 'Test', quantity: 2, unit_selling_price: '500', subtotal: '1000', vat_rate: '7.50', vat_amount: '75.00' }] };
createRoot(document.getElementById('root')!).render(<Fixture />);
