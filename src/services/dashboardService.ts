import {
  DashboardFilterParams,
  DashboardData,
  DashboardSummaryKPIs,
  DashboardSalesTrendPoint,
  DashboardFinancialMovementPoint,
  DashboardTopProduct,
  DashboardStockAlert,
  DashboardRecentSale,
  UserRole,
  ApiResponse,
} from '../types';
import { mockRepository } from './mockRepository';
import { apiCache } from './apiCache';

export class DashboardService {
  /**
   * 1. Get Combined Executive Dashboard Data
   * Encapsulates all KPIs, trends, alerts, top products, recent sales, and purchases.
   */
  public async getDashboardData(
    params: DashboardFilterParams,
    role: UserRole = 'admin'
  ): Promise<ApiResponse<DashboardData>> {
    const key = apiCache.generateKey('dashboard:overview', { ...params, role });

    return apiCache.deduplicate(key, async () => {
      const response = await mockRepository.getDashboardData(params, role);
      // Cache for 30s
      apiCache.set(key, response, 30 * 1000);
      return response;
    });
  }

  /**
   * 2. Granular Get Summary (reuses dashboard query or cached data)
   */
  public async getSummary(
    params: DashboardFilterParams,
    role: UserRole = 'admin'
  ): Promise<ApiResponse<DashboardSummaryKPIs>> {
    const res = await this.getDashboardData(params, role);
    return {
      success: res.success,
      data: res.data.summary,
      message: res.message,
    };
  }

  /**
   * 3. Granular Get Sales & Profit Trend
   */
  public async getSalesTrend(
    params: DashboardFilterParams,
    role: UserRole = 'admin'
  ): Promise<ApiResponse<DashboardSalesTrendPoint[]>> {
    const res = await this.getDashboardData(params, role);
    return {
      success: res.success,
      data: res.data.salesTrends,
      message: res.message,
    };
  }

  /**
   * 4. Granular Get Top Products
   */
  public async getTopProducts(
    params: DashboardFilterParams,
    role: UserRole = 'admin'
  ): Promise<ApiResponse<DashboardTopProduct[]>> {
    const res = await this.getDashboardData(params, role);
    return {
      success: res.success,
      data: res.data.topProducts,
      message: res.message,
    };
  }

  /**
   * 5. Granular Get Stock & Inventory Alerts
   */
  public async getInventoryAlerts(
    role: UserRole = 'admin'
  ): Promise<ApiResponse<DashboardStockAlert[]>> {
    const res = await this.getDashboardData({ period: 'today' }, role);
    return {
      success: res.success,
      data: res.data.stockAlerts,
      message: res.message,
    };
  }

  /**
   * 6. Granular Get Recent Sales
   */
  public async getRecentSales(
    role: UserRole = 'admin'
  ): Promise<ApiResponse<DashboardRecentSale[]>> {
    const res = await this.getDashboardData({ period: 'today' }, role);
    return {
      success: res.success,
      data: res.data.recentSales,
      message: res.message,
    };
  }

  /**
   * 7. Granular Get Financial Movement (Money In vs Money Out)
   */
  public async getFinancialMovement(
    params: DashboardFilterParams,
    role: UserRole = 'admin'
  ): Promise<ApiResponse<DashboardFinancialMovementPoint[]>> {
    const res = await this.getDashboardData(params, role);
    return {
      success: res.success,
      data: res.data.financialMovementTrends,
      message: res.message,
    };
  }

  /**
   * Invalidate Dashboard Cache
   */
  public invalidateCache(): void {
    apiCache.invalidatePattern(/^dashboard:/);
  }
}

export const dashboardService = new DashboardService();
