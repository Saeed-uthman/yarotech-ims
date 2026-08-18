import {
  InventoryItem,
  InventorySummaryKPIs,
  InventoryFilterParams,
  InventoryMovement,
  StockAdjustmentInput,
  InventoryInsightsData,
  InsightsTimeframe,
  UserRole,
  ApiResponse,
} from '../types';
import { mockRepository } from './mockRepository';
import { apiCache } from './apiCache';

export class InventoryService {
  /**
   * Fetch paginated and filtered inventory variant list
   * Implements in-flight request deduplication and deterministic cache keys
   */
  public async getInventory(
    params?: Partial<InventoryFilterParams>,
    role: UserRole = 'admin'
  ): Promise<ApiResponse<InventoryItem[]>> {
    const key = apiCache.generateKey('inventory:list', {
      search: params?.search || '',
      category: params?.category || '',
      company: params?.company || '',
      stockStatus: params?.stockStatus || 'all',
      sortBy: params?.sortBy || 'name',
      sortOrder: params?.sortOrder || 'asc',
      page: params?.page || 1,
      limit: params?.limit || 15,
      role,
    });

    return apiCache.deduplicate(key, async () => {
      const response = await mockRepository.queryInventory(params, role);
      apiCache.set(key, response, 30 * 1000); // 30s cache
      return response;
    });
  }

  /**
   * Quick search inventory
   */
  public async searchInventory(
    query: string,
    params?: Partial<InventoryFilterParams>,
    role: UserRole = 'admin'
  ): Promise<ApiResponse<InventoryItem[]>> {
    return this.getInventory({ ...params, search: query }, role);
  }

  /**
   * Get Inventory Summary KPIs
   */
  public async getInventoryKPIs(
    role: UserRole = 'admin'
  ): Promise<ApiResponse<InventorySummaryKPIs>> {
    const key = apiCache.generateKey('inventory:kpis', { role });
    return apiCache.deduplicate(key, async () => {
      const response = await mockRepository.getInventoryKPIs(role);
      apiCache.set(key, response, 30 * 1000);
      return response;
    });
  }

  /**
   * Get Inventory Insights & Analytics Data
   */
  public async getInventoryInsights(
    timeframe: InsightsTimeframe = 'this_month',
    role: UserRole = 'admin'
  ): Promise<ApiResponse<InventoryInsightsData>> {
    const key = apiCache.generateKey('inventory:insights', { timeframe, role });
    return apiCache.deduplicate(key, async () => {
      const response = await mockRepository.getInventoryInsights(timeframe, role);
      apiCache.set(key, response, 30 * 1000);
      return response;
    });
  }

  /**
   * Get Inventory Movement Audit Logs
   */
  public async getInventoryMovements(params?: {
    productVariantId?: string;
    productId?: string;
    type?: string;
    search?: string;
    limit?: number;
  }): Promise<ApiResponse<InventoryMovement[]>> {
    const key = apiCache.generateKey('inventory:movements', params || {});
    return apiCache.deduplicate(key, async () => {
      const response = await mockRepository.queryInventoryMovements(params);
      apiCache.set(key, response, 30 * 1000);
      return response;
    });
  }

  /**
   * Record an administrative stock adjustment
   * Transactional logic that records audit movement and updates stock count
   */
  public async adjustStock(
    input: StockAdjustmentInput,
    role: UserRole = 'admin'
  ): Promise<ApiResponse<InventoryItem>> {
    const response = await mockRepository.recordStockAdjustment(input, role);

    // Invalidate inventory & products caches to prevent state drift
    this.invalidateInventoryCache();
    return response;
  }

  /**
   * Invalidate all inventory and product caches
   */
  public invalidateInventoryCache(): void {
    apiCache.invalidatePattern('inventory:');
    apiCache.invalidatePattern('products:');
    apiCache.invalidatePattern('product:');
    apiCache.invalidatePattern('kpis:');
  }
}

export const inventoryService = new InventoryService();
