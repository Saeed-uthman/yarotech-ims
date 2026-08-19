import {
  StockPurchase,
  PurchaseFilterParams,
  PurchaseSummaryKPIs,
  PurchaseChartDataPoint,
  CreatePurchaseInput,
  PurchaseDateRange,
  UserRole,
  ApiResponse,
} from '../types';
import { mockRepository } from './mockRepository';
import { apiCache } from './apiCache';

export class PurchaseService {
  /**
   * Fetch paginated and filtered stock purchases with in-flight deduplication and caching
   */
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

    const key = apiCache.generateKey('purchases:list', {
      ...defaultParams,
      role,
    });

    return apiCache.deduplicate(key, async () => {
      const response = await mockRepository.getPurchases(defaultParams, role);
      apiCache.set(key, response, 30 * 1000); // 30s cache
      return response;
    });
  }

  /**
   * Get single stock purchase by ID with full itemized details
   */
  public async getPurchaseById(
    id: string,
    role: UserRole = 'admin'
  ): Promise<ApiResponse<StockPurchase | null>> {
    const key = apiCache.generateKey(`purchase:${id}`, { role });
    return apiCache.deduplicate(key, async () => {
      const response = await mockRepository.getPurchaseById(id, role);
      apiCache.set(key, response, 30 * 1000);
      return response;
    });
  }

  /**
   * Get summary KPIs for stock purchases (Total Spent, Purchases Count, Units Restocked, Average Value)
   */
  public async getPurchaseSummaryKPIs(
    params?: Partial<PurchaseFilterParams>,
    role: UserRole = 'admin'
  ): Promise<ApiResponse<PurchaseSummaryKPIs>> {
    const defaultParams: PurchaseFilterParams = {
      search: params?.search || '',
      dateRange: params?.dateRange || 'today',
      startDate: params?.startDate,
      endDate: params?.endDate,
      paymentMethod: params?.paymentMethod || 'all',
      status: params?.status || 'all',
      sortBy: 'date',
      sortOrder: 'desc',
      page: 1,
      limit: 1000,
    };

    const key = apiCache.generateKey('purchases:kpis', {
      ...defaultParams,
      role,
    });

    return apiCache.deduplicate(key, async () => {
      const response = await mockRepository.getPurchaseSummaryKPIs(defaultParams, role);
      apiCache.set(key, response, 30 * 1000);
      return response;
    });
  }

  /**
   * Get timeline chart data for stock purchases
   */
  public async getPurchaseChartData(
    dateRange: PurchaseDateRange = 'today',
    role: UserRole = 'admin',
    customStart?: string,
    customEnd?: string
  ): Promise<ApiResponse<PurchaseChartDataPoint[]>> {
    const key = apiCache.generateKey('purchases:chart', {
      dateRange,
      role,
      customStart,
      customEnd,
    });

    return apiCache.deduplicate(key, async () => {
      const response = await mockRepository.getPurchaseChartData(
        dateRange,
        role,
        customStart,
        customEnd
      );
      apiCache.set(key, response, 30 * 1000);
      return response;
    });
  }

  /**
   * Create and record a completed stock purchase:
   * - Increments inventory quantity for each medicine variant
   * - Updates variant base cost price
   * - Records STOCK_IN inventory movements
   */
  public async createPurchase(
    input: CreatePurchaseInput,
    role: UserRole = 'admin'
  ): Promise<ApiResponse<StockPurchase>> {
    const response = await mockRepository.createStockPurchase(input, role);

    // Invalidate all related caches: purchases, inventory, products, analytics
    apiCache.invalidate('purchases:');
    apiCache.invalidate('inventory:');
    apiCache.invalidate('products:');
    apiCache.invalidate('dashboard:');

    return response;
  }

  /**
   * Cancel an existing stock purchase and reverse inventory stock
   */
  public async cancelPurchase(
    id: string,
    role: UserRole = 'admin'
  ): Promise<ApiResponse<StockPurchase>> {
    const response = await mockRepository.cancelStockPurchase(id, role);

    // Invalidate caches
    apiCache.invalidate('purchases:');
    apiCache.invalidate('inventory:');
    apiCache.invalidate('products:');
    apiCache.invalidate('dashboard:');

    return response;
  }
}

export const purchaseService = new PurchaseService();
