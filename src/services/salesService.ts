import {
  Sale,
  SalesFilterParams,
  SalesSummaryKPIs,
  SalesChartDataPoint,
  CreateSaleInput,
  SalesDateRange,
  UserRole,
  ApiResponse,
} from '../types';
import { mockRepository } from './mockRepository';
import { apiCache } from './apiCache';

export class SalesService {
  /**
   * Fetch paginated and filtered sales list with in-flight deduplication and caching
   */
  public async getSales(
    params?: Partial<SalesFilterParams>,
    role: UserRole = 'admin'
  ): Promise<ApiResponse<Sale[]>> {
    const defaultParams: SalesFilterParams = {
      search: params?.search || '',
      dateRange: params?.dateRange || 'today',
      startDate: params?.startDate,
      endDate: params?.endDate,
      paymentStatus: params?.paymentStatus || 'all',
      customerType: params?.customerType || 'all',
      sortBy: params?.sortBy || 'date',
      sortOrder: params?.sortOrder || 'desc',
      page: params?.page || 1,
      limit: params?.limit || 10,
    };

    const key = apiCache.generateKey('sales:list', {
      ...defaultParams,
      role,
    });

    return apiCache.deduplicate(key, async () => {
      const response = await mockRepository.getSales(defaultParams, role);
      apiCache.set(key, response, 30 * 1000); // 30s cache
      return response;
    });
  }

  /**
   * Get single sale by ID with full item and payment details
   */
  public async getSaleById(
    id: string,
    role: UserRole = 'admin'
  ): Promise<ApiResponse<Sale | null>> {
    const key = apiCache.generateKey(`sale:${id}`, { role });
    return apiCache.deduplicate(key, async () => {
      const response = await mockRepository.getSaleById(id, role);
      apiCache.set(key, response, 30 * 1000);
      return response;
    });
  }

  /**
   * Get summary KPIs for sales (Revenue, Profit, Transactions, Outstanding, Average Sale Value)
   */
  public async getSalesSummaryKPIs(
    params?: Partial<SalesFilterParams>,
    role: UserRole = 'admin'
  ): Promise<ApiResponse<SalesSummaryKPIs>> {
    const defaultParams: SalesFilterParams = {
      search: params?.search || '',
      dateRange: params?.dateRange || 'today',
      startDate: params?.startDate,
      endDate: params?.endDate,
      paymentStatus: params?.paymentStatus || 'all',
      customerType: params?.customerType || 'all',
      sortBy: 'date',
      sortOrder: 'desc',
      page: 1,
      limit: 1000,
    };

    const key = apiCache.generateKey('sales:kpis', {
      ...defaultParams,
      role,
    });

    return apiCache.deduplicate(key, async () => {
      const response = await mockRepository.getSalesSummaryKPIs(defaultParams, role);
      apiCache.set(key, response, 30 * 1000);
      return response;
    });
  }

  /**
   * Get timeline chart data for sales and profits
   */
  public async getSalesChartData(
    dateRange: SalesDateRange = 'today',
    role: UserRole = 'admin',
    customStart?: string,
    customEnd?: string
  ): Promise<ApiResponse<SalesChartDataPoint[]>> {
    const key = apiCache.generateKey('sales:chart', {
      dateRange,
      role,
      customStart,
      customEnd,
    });

    return apiCache.deduplicate(key, async () => {
      const response = await mockRepository.getSalesChartData(
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
   * Create and record a completed sale with stock deduction and debt synchronization
   */
  public async createSale(
    input: CreateSaleInput,
    role: UserRole = 'admin'
  ): Promise<ApiResponse<Sale>> {
    const response = await mockRepository.createSale(input, role);

    // Invalidate all related caches: sales, customers, inventory, products
    apiCache.invalidate('sales:');
    apiCache.invalidate('customers:');
    apiCache.invalidate('inventory:');
    apiCache.invalidate('products:');

    return response;
  }
}

export const salesService = new SalesService();
