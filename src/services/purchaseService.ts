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
} from '../types';
import { api, ApiError, toCamelCaseKeys } from './apiClient';
import { apiCache } from './apiCache';

function paginate<T>(items: T[], page: number, limit: number): { data: T[]; meta: { currentPage: number; perPage: number; total: number; lastPage: number } } {
  const total = items.length;
  const lastPage = Math.ceil(total / limit) || 1;
  const start = (page - 1) * limit;
  const data = items.slice(start, start + limit);
  return { data, meta: { currentPage: page, perPage: limit, total, lastPage } };
}

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
    unitPurchasePrice: Number(i.unitPurchasePrice || 0),
    subtotal: Number(i.subtotal || 0),
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
    totalAmount: Number(p.totalAmount || 0),
    paymentMethod: p.paymentMethod || 'CASH',
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
        if (defaultParams.dateRange && defaultParams.dateRange !== 'overall') {
          queryParams.date_range = defaultParams.dateRange;
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

        const { data, meta } = paginate(purchases, defaultParams.page, defaultParams.limit);
        const response: ApiResponse<StockPurchase[]> = { success: true, data, meta };
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
        if (params?.dateRange && params.dateRange !== 'overall') {
          queryParams.date_range = params.dateRange;
        }

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
        if (dateRange !== 'overall') {
          queryParams.date_range = dateRange;
        }

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
          product_variant_id: Number(it.productVariantId),
          quantity: it.quantity,
          unit_purchase_price: it.unitPurchasePrice,
        })),
        payment_method: input.paymentMethod,
        purchase_date: input.purchaseDate || null,
        note: input.note || '',
      };

      const res = await api.post<any>('/purchases/', payload);
      const purchase = mapBackendPurchase(res.data);

      apiCache.invalidateByPrefix('purchases:');
      apiCache.invalidateByPrefix('inventory:');
      apiCache.invalidateByPrefix('products:');
      apiCache.invalidateByPrefix('dashboard:');

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

      return { success: true, data: purchase, message: res.message };
    } catch (err) {
      if (err instanceof ApiError) throw err;
      throw new Error('Failed to cancel purchase.');
    }
  }
}

export const purchaseService = new PurchaseService();
