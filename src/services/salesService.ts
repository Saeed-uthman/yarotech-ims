import {
  Sale,
  SaleItem,
  SalesFilterParams,
  SalesSummaryKPIs,
  SalesChartDataPoint,
  CreateSaleInput,
  SalesDateRange,
  UserRole,
  ApiResponse,
} from '../types';
import { api, ApiError, createIdempotencyKey, mapPaginationMeta, toCamelCaseKeys } from './apiClient';
import { apiCache } from './apiCache';

// ==========================================
// Backend → Frontend Transform Helpers
// ==========================================

function mapBackendSaleItem(raw: any): SaleItem {
  const i = toCamelCaseKeys(raw);
  return {
    id: String(i.id),
    productId: '',
    productVariantId: String(i.variantId || ''),
    productName: i.productName || '',
    genericName: '',
    companyName: i.companyName || '',
    quantity: Number(i.quantity || 0),
    actualSellingPrice: Number(i.actualSellingPrice || 0),
    sellingPrice: Number(i.unitSellingPrice || i.actualSellingPrice || 0),
    historicalBasePrice: Number(i.historicalBasePrice || 0),
    basePrice: Number(i.unitBasePrice || 0),
    minSellingPrice: Number(i.minSellingPrice || 0),
    defaultSellingPrice: Number(i.defaultSellingPrice || 0),
    maxSellingPrice: Number(i.maxSellingPrice || 0),
    subtotal: Number(i.subtotal || 0),
    profit: Number(i.profit || 0),
  };
}

function mapBackendSale(raw: any): Sale {
  const s = toCamelCaseKeys(raw);
  const createdAt = s.createdAt || '';
  const dateObj = createdAt ? new Date(createdAt) : new Date();
  const dateStr = dateObj.toLocaleDateString('en-NG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return {
    id: String(s.id),
    invoiceNumber: s.invoiceNumber || `Sale #${s.id}`,
    date: dateStr,
    rawDate: createdAt,
    customerId: s.customer ? String(s.customer) : null,
    customerName: s.customerName || 'Walk-in',
    customerPhone: s.customerPhone || '',
    items: (s.items || []).map(mapBackendSaleItem),
    itemCount: s.items?.length || Number(s.itemsCount || 0),
    subtotal: Number(s.subtotal || 0),
    discount: Number(s.discount || 0),
    total: Number(s.totalAmount || 0),
    totalAmount: Number(s.totalAmount || 0),
    amountPaid: Number(s.amountPaid || 0),
    paidAmount: Number(s.amountPaid || 0),
    outstandingAmount: Number(s.outstandingAmount || 0),
    paymentStatus: s.paymentStatus || 'PAID',
    paymentMethod: s.paymentMethod || 'CASH',
    profit: 0,
    servedBy: s.servedByName || s.servedBy || '',
    notes: s.notes || '',
    status: s.status || 'COMPLETED',
  };
}

function mapDateRange(params?: Partial<SalesFilterParams>): string | undefined {
  if (!params?.dateRange || params.dateRange === 'overall') return undefined;
  if (params.dateRange === 'custom') return undefined; // handled separately
  if (params.dateRange === 'this_week') return 'week';
  if (params.dateRange === 'this_month') return 'month';
  return params.dateRange;
}

function moneyValue(value: number | undefined, field: string): string {
  const amount = Number(value ?? 0);
  if (!Number.isFinite(amount)) throw new Error(`${field} must be a valid amount.`);
  return amount.toFixed(2);
}

function numericId(value: string, field: string): number {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) throw new Error(`${field} is invalid. Refresh the page and select it again.`);
  return id;
}

// ==========================================
// Sales Service
// ==========================================

export class SalesService {
  public async returnSale(
    saleId: string,
    input: { items: Array<{ saleItemId: string; quantity: number }>; refundMethod: 'CASH' | 'TRANSFER' | 'POS'; reason: string }
  ): Promise<ApiResponse<any>> {
    const res = await api.post<any>(`/sales/${numericId(saleId, 'Sale')}/returns/`, {
      items: input.items.map((item) => ({
        sale_item_id: numericId(item.saleItemId, 'Sale item'),
        quantity: item.quantity,
      })),
      refund_method: input.refundMethod,
      reason: input.reason.trim(),
    });
    apiCache.invalidateByPrefix('sales:');
    apiCache.invalidateByPrefix('inventory:');
    apiCache.invalidateByPrefix('products:');
    apiCache.invalidateByPrefix('accountability:');
    apiCache.invalidateByPrefix('dashboard:');
    apiCache.invalidateByPrefix('reports:');
    return { success: true, data: toCamelCaseKeys(res.data), message: res.message };
  }

  /**
   * Fetch sales list from backend
   */
  public async getSales(
    params?: Partial<SalesFilterParams>,
    _role: UserRole = 'admin'
  ): Promise<ApiResponse<Sale[]>> {
    const key = apiCache.generateKey('sales:list', {
      search: params?.search || '',
      dateRange: params?.dateRange || 'today',
      paymentStatus: params?.paymentStatus || 'all',
      customerType: params?.customerType || 'all',
      page: params?.page || 1,
      limit: params?.limit || 10,
    });

    return apiCache.deduplicate(key, async () => {
      try {
        const queryParams: Record<string, any> = {};
        if (params?.search) queryParams.search = params.search;
        queryParams.page = params?.page || 1;
        queryParams.per_page = params?.limit || 10;
        queryParams.ordering = `${params?.sortOrder === 'desc' ? '-' : ''}${params?.sortBy || 'date'}`;
        const dateRange = mapDateRange(params);
        if (dateRange) queryParams.date_range = dateRange;
        if (params?.paymentStatus && params.paymentStatus !== 'all') {
          queryParams.payment_status = params.paymentStatus;
        }
        if (params?.customerType && params.customerType !== 'all') {
          queryParams.customer_type = params.customerType;
        }

        const res = await api.get<any>('/sales/', queryParams);
        let sales: Sale[] = (res.data || []).map(mapBackendSale);

        // Client-side sorting
        const sortBy = params?.sortBy || 'date';
        const sortOrder = params?.sortOrder || 'desc';
        sales.sort((a, b) => {
          let cmp = 0;
          switch (sortBy) {
            case 'date': cmp = new Date(a.rawDate).getTime() - new Date(b.rawDate).getTime(); break;
            case 'total': cmp = a.total - b.total; break;
            case 'customer': cmp = a.customerName.localeCompare(b.customerName); break;
            case 'invoiceNumber': cmp = a.invoiceNumber.localeCompare(b.invoiceNumber); break;
            default: cmp = new Date(a.rawDate).getTime() - new Date(b.rawDate).getTime();
          }
          return sortOrder === 'asc' ? cmp : -cmp;
        });

        const response: ApiResponse<Sale[]> = {
          success: true,
          data: sales,
          meta: mapPaginationMeta(res.meta),
        };
        apiCache.set(key, response, 30 * 1000);
        return response;
      } catch (err) {
        if (err instanceof ApiError) throw err;
        throw new Error('Failed to fetch sales.');
      }
    });
  }

  /**
   * Get single sale by ID from backend
   */
  public async getSaleById(
    id: string,
    _role: UserRole = 'admin'
  ): Promise<ApiResponse<Sale | null>> {
    const key = apiCache.generateKey(`sale:${id}`);
    return apiCache.deduplicate(key, async () => {
      try {
        const res = await api.get<any>(`/sales/${id}/`);
        const sale = mapBackendSale(res.data);
        return { success: true, data: sale };
      } catch (err) {
        if (err instanceof ApiError) throw err;
        return { success: false, data: null, message: 'Sale not found.' };
      }
    });
  }

  /**
   * Fetch the print-ready receipt payload, including every purchased item.
   */
  public async getSaleReceipt(
    id: string,
    role: UserRole = 'admin'
  ): Promise<ApiResponse<Sale>> {
    const key = apiCache.generateKey('sales:receipt', { id, role });

    return apiCache.deduplicate(key, async () => {
      try {
        const res = await api.get<any>(`/sales/${id}/receipt/`);
        const response: ApiResponse<Sale> = {
          success: true,
          data: mapBackendSale(res.data),
        };
        apiCache.set(key, response, 30 * 1000);
        return response;
      } catch (err) {
        if (err instanceof ApiError) throw err;
        throw new Error('Failed to load the complete sale receipt.');
      }
    });
  }

  /**
   * Get summary KPIs from backend
   */
  public async getSalesSummaryKPIs(
    params?: Partial<SalesFilterParams>,
    _role: UserRole = 'admin'
  ): Promise<ApiResponse<SalesSummaryKPIs>> {
    const key = apiCache.generateKey('sales:kpis', {
      dateRange: params?.dateRange || 'today',
    });

    return apiCache.deduplicate(key, async () => {
      try {
        const queryParams: Record<string, any> = {};
        const dateRange = mapDateRange(params);
        if (dateRange) queryParams.date_range = dateRange;

        const res = await api.get<any>('/sales/summary-kpis/', queryParams);
        const d = toCamelCaseKeys(res.data || res);
        const kpis: SalesSummaryKPIs = {
          totalRevenue: Number(d.totalRevenue || 0),
          totalProfit: Number(d.totalProfit || 0),
          totalTransactions: Number(d.totalTransactions ?? d.totalSales ?? 0),
          totalOutstanding: Number(d.totalOutstanding || 0),
          averageSaleValue: Number(d.averageSaleValue || 0),
          paidCount: Number(d.paidCount || 0),
          partialCount: Number(d.partialCount || 0),
          unpaidCount: Number(d.unpaidCount || 0),
          timeframe: params?.dateRange || 'today',
        };
        apiCache.set(key, { success: true, data: kpis }, 30 * 1000);
        return { success: true, data: kpis };
      } catch (err) {
        if (err instanceof ApiError) throw err;
        throw new Error('Failed to fetch sales KPIs.');
      }
    });
  }

  /**
   * Get chart data — backend doesn't have a chart endpoint; derive from sales list
   */
  public async getSalesChartData(
    dateRange: SalesDateRange = 'today',
    _role: UserRole = 'admin',
    _customStart?: string,
    _customEnd?: string
  ): Promise<ApiResponse<SalesChartDataPoint[]>> {
    const key = apiCache.generateKey('sales:chart', { dateRange });

    return apiCache.deduplicate(key, async () => {
      try {
        const salesRes = await this.getSales({ dateRange, limit: 1000, page: 1 });
        const sales = salesRes.data || [];

        // Group by date
        const grouped: Record<string, SalesChartDataPoint> = {};
        for (const sale of sales) {
          const d = new Date(sale.rawDate);
          const label = d.toLocaleDateString('en-NG', { day: 'numeric', month: 'short' });
          if (!grouped[label]) {
            grouped[label] = { label, revenue: 0, profit: 0, transactions: 0, rawDate: sale.rawDate };
          }
          grouped[label].revenue += sale.total;
          grouped[label].profit += sale.profit || 0;
          grouped[label].transactions += 1;
        }

        const chartData = Object.values(grouped).sort(
          (a, b) => new Date(a.rawDate).getTime() - new Date(b.rawDate).getTime()
        );

        apiCache.set(key, { success: true, data: chartData }, 30 * 1000);
        return { success: true, data: chartData };
      } catch (err) {
        if (err instanceof ApiError) throw err;
        throw new Error('Failed to fetch chart data.');
      }
    });
  }

  /**
   * Create a POS sale via backend
   */
  public async createSale(
    input: CreateSaleInput,
    _role: UserRole = 'admin'
  ): Promise<ApiResponse<Sale>> {
    try {
      const payload = {
        customer_id: input.customerId ? numericId(input.customerId, 'Customer') : null,
        items: input.items.map((item) => ({
          product_variant_id: numericId(item.productVariantId, 'Product variant'),
          quantity: item.quantity,
          actual_selling_price: moneyValue(item.unitPrice ?? item.actualSellingPrice, 'Selling price'),
        })),
        discount: moneyValue(input.discount, 'Discount'),
        amount_paid: moneyValue(input.amountPaid, 'Amount paid'),
        payment_method: input.paymentMethod,
        notes: input.notes || '',
      };

      const res = await api.post<any>('/sales/', payload, createIdempotencyKey('sale'));
      const sale = mapBackendSale(res.data);

      // Invalidate related caches
      apiCache.invalidateByPrefix('sales:');
      apiCache.invalidateByPrefix('customers:');
      apiCache.invalidateByPrefix('inventory:');
      apiCache.invalidateByPrefix('products:');
      apiCache.invalidateByPrefix('kpi:');
      apiCache.invalidateByPrefix('accountability:');
      apiCache.invalidateByPrefix('dashboard:');
      apiCache.invalidateByPrefix('reports:');

      return { success: true, data: sale, message: res.message };
    } catch (err) {
      if (err instanceof ApiError) throw err;
      throw new Error('Failed to create sale.');
    }
  }
}

export const salesService = new SalesService();
