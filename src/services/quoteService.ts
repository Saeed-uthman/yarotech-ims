import { ApiResponse, QuoteEntity, CreateQuoteInput } from '../types';
import { api, ApiError, mapPaginationMeta, toCamelCaseKeys } from './apiClient';
import { apiCache } from './apiCache';

function mapBackendQuote(raw: any): QuoteEntity {
  const q = toCamelCaseKeys(raw);
  return {
    id: String(q.id),
    quoteNumber: q.quoteNumber || '',
    customerId: q.customer ? String(q.customer) : null,
    customerName: q.customerName || 'Walk-in',
    subtotal: Number(q.subtotal || 0),
    vatAmount: Number(q.vatAmount || 0),
    discount: Number(q.discount || 0),
    totalAmount: Number(q.totalAmount || 0),
    validUntil: q.validUntil || '',
    status: q.status || 'DRAFT',
    notes: q.notes || '',
    convertedSale: q.convertedSale ? Number(q.convertedSale) : null,
    createdBy: q.createdBy ? String(q.createdBy) : undefined,
    createdByName: q.createdByName || '',
    itemsCount: Number(q.itemsCount || (q.items ? q.items.length : 0)),
    items: (q.items || []).map((it: any) => ({
      id: String(it.id || ''),
      variantId: String(it.variantId || it.variant || ''),
      productId: it.productId ? String(it.productId) : undefined,
      quantity: Number(it.quantity || 0),
      unitPrice: Number(it.unitPrice || 0),
      discount: Number(it.discount || 0),
      vatRate: Number(it.vatRate || 0),
      vatAmount: Number(it.vatAmount || 0),
      totalPrice: Number(it.totalPrice || 0),
      itemNameSnapshot: it.itemNameSnapshot || '',
      companyNameSnapshot: it.companyNameSnapshot || '',
      technicalSpecsSnapshot: it.technicalSpecsSnapshot || '',
      unitOfMeasureSnapshot: it.unitOfMeasureSnapshot || 'PCS',
    })),
    createdAt: q.createdAt || '',
    updatedAt: q.updatedAt || '',
  };
}

export class QuoteService {
  public async getQuotes(params?: {
    status?: string;
    search?: string;
    page?: number;
  }): Promise<ApiResponse<QuoteEntity[]>> {
    try {
      const queryParams: Record<string, any> = {};
      if (params?.status && params.status !== 'all') queryParams.status = params.status;
      if (params?.search) queryParams.search = params.search;
      if (params?.page) queryParams.page = params.page;

      const res = await api.get<any>('/sales/quotes/', queryParams);
      const rawList = Array.isArray(res.data) ? res.data : (res.data?.results || []);
      const quotes = rawList.map(mapBackendQuote);

      return {
        success: true,
        data: quotes,
        meta: mapPaginationMeta(res.meta),
      };
    } catch (err) {
      if (err instanceof ApiError) throw err;
      throw new Error('Failed to fetch quotations.');
    }
  }

  public async getQuoteById(id: string): Promise<ApiResponse<QuoteEntity>> {
    try {
      const res = await api.get<any>(`/sales/quotes/${id}/`);
      return { success: true, data: mapBackendQuote(res.data) };
    } catch (err) {
      if (err instanceof ApiError) throw err;
      throw new Error('Failed to fetch quote details.');
    }
  }

  public async createQuote(input: CreateQuoteInput): Promise<ApiResponse<QuoteEntity>> {
    try {
      const payload = {
        customer_id: input.customer_id ? Number(input.customer_id) : null,
        items: input.items.map((it) => ({
          product_variant_id: Number(it.product_variant_id),
          quantity: it.quantity,
          unit_price: it.unit_price,
          discount: it.discount || 0,
        })),
        discount: input.discount || 0,
        valid_until: input.valid_until || null,
        notes: input.notes || '',
      };

      const res = await api.post<any>('/sales/quotes/', payload);
      apiCache.invalidateByPrefix('quotes:');
      return { success: true, data: mapBackendQuote(res.data), message: res.message };
    } catch (err) {
      if (err instanceof ApiError) throw err;
      throw new Error('Failed to create quotation.');
    }
  }

  public async convertQuoteToSale(
    quoteId: string,
    payload: {
      payment_method: string;
      amount_paid: number;
      serial_numbers_map?: Record<string, string>;
    }
  ): Promise<ApiResponse<any>> {
    try {
      const res = await api.post<any>(`/sales/quotes/${quoteId}/convert/`, payload);
      apiCache.invalidateByPrefix('sales:');
      apiCache.invalidateByPrefix('quotes:');
      apiCache.invalidateByPrefix('inventory:');
      apiCache.invalidateByPrefix('products:');
      return { success: true, data: res.data, message: res.message };
    } catch (err) {
      if (err instanceof ApiError) throw err;
      throw new Error('Failed to convert quotation to sale.');
    }
  }
}

export const quoteService = new QuoteService();

