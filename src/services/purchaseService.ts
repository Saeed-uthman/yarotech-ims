import {
  StockPurchase,
  PurchaseItemEntity,
  PurchaseFilterParams,
  PurchaseSummaryKPIs,
  PurchaseChartDataPoint,
  PurchaseDateRange,
  CreatePurchaseInput,
  UserRole,
  ApiResponse,
  SupplierPayment,
  PurchasePaymentMethod,
} from '../types';
import { api, ApiError, createIdempotencyKey, mapPaginationMeta, toCamelCaseKeys } from './apiClient';
import { apiCache } from './apiCache';

function mapBackendPurchaseItem(raw: any): PurchaseItemEntity {
  const i = toCamelCaseKeys(raw);
  return {
    id: String(i.id),
    productVariantId: String(i.variantId || ''),
    productId: '',
    productName: i.productName || '',
    genericName: '',
    companyName: i.companyName || '',
    quantity: Number(i.quantity || 0),
    unitPurchasePrice: Number(i.unitPurchasePrice ?? i.unitBasePrice ?? 0),
    subtotal: Number(i.subtotal ?? (Number(i.quantity || 0) * Number(i.unitPurchasePrice ?? i.unitBasePrice ?? 0))),
    batchNumber: i.batchNumber || '',
    expiryDate: i.expiryDate || null,
  };
}

function mapBackendPurchase(raw: any): StockPurchase {
  const p = toCamelCaseKeys(raw);
  const purchaseDate = p.purchaseDate || '';
  const dateObj = purchaseDate ? new Date(p.purchaseDate) : new Date();
  const dateStr = dateObj.toLocaleDateString('en-NG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  const rawItems = p.items || p.itemsSummary || [];
  const items = rawItems.map(mapBackendPurchaseItem);
  const totalUnits = items.reduce((sum: number, it: PurchaseItemEntity) => sum + it.quantity, 0);
  return {
    id: String(p.id),
    purchaseNumber: p.purchaseNumber || `PUR-${p.id}`,
    purchaseDate: dateStr,
    rawDate: purchaseDate,
    recordedBy: p.recordedByName || '',
    supplierName: p.supplierName || '',
    totalAmount: Number(p.totalAmount || 0),
    amountPaid: Number(p.amountPaid || 0),
    outstandingAmount: Number(p.outstandingAmount || 0),
    creditedAmount: Number(p.creditedAmount || 0),
    paymentStatus: p.paymentStatus || 'PAID',
    paymentMethod: p.paymentMethod || null,
    status: p.status || 'COMPLETED',
    note: p.note || '',
    items,
    itemCount: items.length || Number(p.itemsCount || 0),
    totalUnits: Number(p.totalUnits) || totalUnits,
    createdAt: p.createdAt || '',
    updatedAt: p.updatedAt || '',
  };
}

function buildChartDateRange(
  dateRange: PurchaseDateRange,
  customStart?: string,
  customEnd?: string
): { startDate?: string; endDate?: string } {
  const now = new Date();
  let startDate: string | undefined;
  let endDate: string | undefined;

  if (dateRange === 'today') {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    startDate = start.toISOString();
    endDate = now.toISOString();
  } else if (dateRange === 'this_week') {
    const start = new Date(now);
    start.setDate(now.getDate() - now.getDay());
    start.setHours(0, 0, 0, 0);
    startDate = start.toISOString();
    endDate = now.toISOString();
  } else if (dateRange === 'this_month') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    startDate = start.toISOString();
    endDate = now.toISOString();
  } else if (dateRange === 'custom' && customStart && customEnd) {
    startDate = customStart;
    endDate = customEnd;
  }

  return { startDate, endDate };
}

function moneyValue(value: number, field: string): string {
  const amount = Number(value);
  if (!Number.isFinite(amount)) throw new Error(`${field} must be a valid amount.`);
  return amount.toFixed(2);
}

function numericId(value: string): number {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error('Product variant is invalid. Refresh the page and select it again.');
  }
  return id;
}

function purchaseDateTime(value?: string): string | null {
  if (!value) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return `${value}T12:00:00`;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) throw new Error('Purchase date is invalid.');
  return parsed.toISOString();
}

function mapPurchaseDateRange(value?: PurchaseDateRange): string | undefined {
  if (!value || value === 'overall' || value === 'custom') return undefined;
  if (value === 'this_week') return 'week';
  if (value === 'this_month') return 'month';
  return value;
}

function groupPurchasesForChart(
  purchases: StockPurchase[],
  dateRange: PurchaseDateRange
): PurchaseChartDataPoint[] {
  const groups: Record<string, { amountSpent: number; units: number; count: number; rawDate: string }> = {};

  for (const p of purchases) {
    const d = new Date(p.rawDate);
    let label: string;

    if (dateRange === 'today') {
      label = `${String(d.getHours()).padStart(2, '0')}:00`;
    } else if (dateRange === 'this_week') {
      label = d.toLocaleDateString('en-NG', { weekday: 'short' });
    } else {
      label = d.toLocaleDateString('en-NG', { day: 'numeric', month: 'short' });
    }

    if (!groups[label]) {
      groups[label] = { amountSpent: 0, units: 0, count: 0, rawDate: p.rawDate };
    }
    groups[label].amountSpent += p.totalAmount;
    groups[label].units += p.totalUnits;
    groups[label].count += 1;
  }

  return Object.entries(groups).map(([label, g]) => ({
    label,
    amountSpent: g.amountSpent,
    units: g.units,
    purchasesCount: g.count,
    rawDate: g.rawDate,
  }));
}

export class PurchaseService {
  public async getSupplierPayments(purchaseId: string): Promise<ApiResponse<SupplierPayment[]>> {
    const res = await api.get<any>(`/purchases/${numericId(purchaseId)}/payments/`, { per_page: 100 });
    return { success: true, data: (res.data || []).map((item: any) => toCamelCaseKeys(item) as SupplierPayment) };
  }

  public async recordSupplierPayment(
    purchaseId: string,
    input: { amount: number; paymentMethod: PurchasePaymentMethod; note?: string }
  ): Promise<ApiResponse<SupplierPayment>> {
    const res = await api.post<any>(`/purchases/${numericId(purchaseId)}/payments/`, {
      amount: moneyValue(input.amount, 'Payment amount'),
      payment_method: input.paymentMethod,
      note: input.note?.trim() || '',
    }, createIdempotencyKey('supplier-payment'));
    apiCache.invalidateByPrefix('purchases:');
    apiCache.invalidateByPrefix('dashboard:');
    apiCache.invalidateByPrefix('accountability:');
    apiCache.invalidateByPrefix('reports:');
    return { success: true, data: toCamelCaseKeys(res.data) as SupplierPayment, message: res.message };
  }

  public async returnPurchase(
    purchaseId: string,
    input: { items: Array<{ purchaseItemId: string; quantity: number }>; refundMethod?: 'CASH' | 'TRANSFER' | 'POS' | null; reason: string }
  ): Promise<ApiResponse<any>> {
    const res = await api.post<any>(`/purchases/${numericId(purchaseId)}/returns/`, {
      items: input.items.map((item) => ({
        purchase_item_id: numericId(item.purchaseItemId),
        quantity: item.quantity,
      })),
      refund_method: input.refundMethod || null,
      reason: input.reason.trim(),
    });
    apiCache.invalidateByPrefix('purchases:');
    apiCache.invalidateByPrefix('inventory:');
    apiCache.invalidateByPrefix('products:');
    apiCache.invalidateByPrefix('dashboard:');
    apiCache.invalidateByPrefix('accountability:');
    apiCache.invalidateByPrefix('reports:');
    return { success: true, data: toCamelCaseKeys(res.data), message: res.message };
  }

  public async getPurchases(
    params?: Partial<PurchaseFilterParams>,
    role: UserRole = 'admin'
  ): Promise<ApiResponse<StockPurchase[]>> {
    const defaultParams: PurchaseFilterParams = {
      search: params?.search || '',
      dateRange: params?.dateRange || 'today',
      startDate: params?.startDate,
      endDate: params?.endDate,
      paymentMethod: params?.paymentMethod || 'all',
      status: params?.status || 'all',
      sortBy: params?.sortBy || 'date',
      sortOrder: params?.sortOrder || 'desc',
      page: params?.page || 1,
      limit: params?.limit || 10,
    };

    const key = apiCache.generateKey('purchases:list', { ...defaultParams, role });

    return apiCache.deduplicate(key, async () => {
      try {
        const queryParams: Record<string, any> = {};
        if (defaultParams.search) queryParams.search = defaultParams.search;
        queryParams.page = defaultParams.page;
        queryParams.per_page = defaultParams.limit;
        queryParams.ordering = `${defaultParams.sortOrder === 'desc' ? '-' : ''}${defaultParams.sortBy}`;
        if (defaultParams.dateRange && defaultParams.dateRange !== 'overall') {
          queryParams.date_range = defaultParams.dateRange === 'this_week'
            ? 'week'
            : defaultParams.dateRange === 'this_month'
              ? 'month'
              : defaultParams.dateRange;
        }
        if (defaultParams.paymentMethod && defaultParams.paymentMethod !== 'all') {
          queryParams.payment_method = defaultParams.paymentMethod;
        }
        if (defaultParams.status && defaultParams.status !== 'all') {
          queryParams.status = defaultParams.status;
        }

        const res = await api.get<any>('/purchases/', queryParams);
        let purchases: StockPurchase[] = (res.data || []).map(mapBackendPurchase);

        purchases.sort((a, b) => {
          const dateA = new Date(a.rawDate).getTime();
          const dateB = new Date(b.rawDate).getTime();
          return defaultParams.sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
        });

        const response: ApiResponse<StockPurchase[]> = {
          success: true,
          data: purchases,
          meta: mapPaginationMeta(res.meta),
        };
        apiCache.set(key, response, 30 * 1000);
        return response;
      } catch (err) {
        if (err instanceof ApiError) throw err;
        throw new Error('Failed to fetch purchases.');
      }
    });
  }

  public async getPurchaseById(
    id: string,
    role: UserRole = 'admin'
  ): Promise<ApiResponse<StockPurchase | null>> {
    const key = apiCache.generateKey(`purchase:${id}`, { role });

    return apiCache.deduplicate(key, async () => {
      try {
        const res = await api.get<any>(`/purchases/${id}/`);
        const purchase = mapBackendPurchase(res.data);
        return { success: true, data: purchase };
      } catch (err) {
        if (err instanceof ApiError) throw err;
        return { success: false, data: null, message: 'Purchase not found.' };
      }
    });
  }

  public async getPurchaseSummaryKPIs(
    params?: Partial<PurchaseFilterParams>,
    role: UserRole = 'admin'
  ): Promise<ApiResponse<PurchaseSummaryKPIs>> {
    const key = apiCache.generateKey('purchases:kpis', {
      dateRange: params?.dateRange || 'today',
      role,
    });

    return apiCache.deduplicate(key, async () => {
      try {
        const queryParams: Record<string, any> = {};
        const dateRange = mapPurchaseDateRange(params?.dateRange);
        if (dateRange) queryParams.date_range = dateRange;

        const res = await api.get<any>('/purchases/summary-kpis/', queryParams);
        const d = res.data;
        const summary: PurchaseSummaryKPIs = {
          totalSpent: Number(d.total_spend || 0),
          totalPurchasesCount: Number(d.total_purchases || 0),
          completedPurchasesCount: Number(d.completed_purchases || 0),
          cancelledPurchasesCount: Number(d.cancelled_purchases || 0),
          totalUnitsRestocked: Number(d.total_units_restocked || 0),
          averagePurchaseValue: Number(d.average_purchase_value || 0),
          timeframe: (params?.dateRange as PurchaseDateRange) || 'today',
        };
        const response: ApiResponse<PurchaseSummaryKPIs> = { success: true, data: summary };
        apiCache.set(key, response, 30 * 1000);
        return response;
      } catch (err) {
        if (err instanceof ApiError) throw err;
        throw new Error('Failed to fetch purchase KPIs.');
      }
    });
  }

  public async getPurchaseChartData(
    dateRange: PurchaseDateRange = 'today',
    role: UserRole = 'admin',
    customStart?: string,
    customEnd?: string
  ): Promise<ApiResponse<PurchaseChartDataPoint[]>> {
    const key = apiCache.generateKey('purchases:chart', { dateRange, role, customStart, customEnd });

    return apiCache.deduplicate(key, async () => {
      try {
        const queryParams: Record<string, any> = {};
        const apiDateRange = mapPurchaseDateRange(dateRange);
        if (apiDateRange) queryParams.date_range = apiDateRange;

        const res = await api.get<any>('/purchases/', queryParams);
        const purchases: StockPurchase[] = (res.data || []).map(mapBackendPurchase);
        const chartData = groupPurchasesForChart(purchases, dateRange);
        const response: ApiResponse<PurchaseChartDataPoint[]> = { success: true, data: chartData };
        apiCache.set(key, response, 30 * 1000);
        return response;
      } catch (err) {
        if (err instanceof ApiError) throw err;
        throw new Error('Failed to fetch chart data.');
      }
    });
  }

  public async createPurchase(
    input: CreatePurchaseInput,
    role: UserRole = 'admin'
  ): Promise<ApiResponse<StockPurchase>> {
    try {
      const payload = {
        items: input.items.map((it) => ({
          product_variant_id: numericId(it.productVariantId),
          quantity: it.quantity,
          unit_purchase_price: moneyValue(it.unitPurchasePrice, 'Unit purchase price'),
          batch_number: it.batchNumber?.trim() || '',
          expiry_date: it.expiryDate || null,
        })),
        supplier_name: input.supplierName?.trim() || '',
        amount_paid: moneyValue(input.amountPaid, 'Amount paid'),
        payment_method: input.amountPaid > 0 ? input.paymentMethod : null,
        purchase_date: purchaseDateTime(input.purchaseDate),
        note: input.note || '',
      };

      const res = await api.post<any>('/purchases/', payload, createIdempotencyKey('purchase'));
      const purchase = mapBackendPurchase(res.data);

      apiCache.invalidateByPrefix('purchases:');
      apiCache.invalidateByPrefix('inventory:');
      apiCache.invalidateByPrefix('products:');
      apiCache.invalidateByPrefix('dashboard:');
      apiCache.invalidateByPrefix('accountability:');
      apiCache.invalidateByPrefix('reports:');

      return { success: true, data: purchase, message: res.message };
    } catch (err) {
      if (err instanceof ApiError) throw err;
      throw new Error('Failed to record stock purchase.');
    }
  }

  public async cancelPurchase(
    id: string,
    reason: string = 'Cancelled by admin',
    role: UserRole = 'admin'
  ): Promise<ApiResponse<StockPurchase>> {
    try {
      const res = await api.post<any>(`/purchases/${id}/cancel/`, { reason });
      const purchase = mapBackendPurchase(res.data);

      apiCache.invalidateByPrefix('purchases:');
      apiCache.invalidateByPrefix('inventory:');
      apiCache.invalidateByPrefix('products:');
      apiCache.invalidateByPrefix('dashboard:');
      apiCache.invalidateByPrefix('accountability:');
      apiCache.invalidateByPrefix('reports:');

      return { success: true, data: purchase, message: res.message };
    } catch (err) {
      if (err instanceof ApiError) throw err;
      throw new Error('Failed to cancel purchase.');
    }
  }
}

export const purchaseService = new PurchaseService();
