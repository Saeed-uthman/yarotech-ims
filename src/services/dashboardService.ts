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
import { api, ApiError, toCamelCaseKeys } from './apiClient';
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
      try {
        const response = await api.get<any>('/dashboard/', {
          period: params.period,
          start_date: params.period === 'custom' ? params.startDate : undefined,
          end_date: params.period === 'custom' ? params.endDate : undefined,
        });
        const payload = toCamelCaseKeys(response.data || {});
        const summary = payload.summary || {};
        const result: ApiResponse<DashboardData> = {
          success: true,
          data: {
            summary: {
              totalSales: Number(summary.totalSales || 0),
              totalProfit: Number(summary.totalProfit || 0),
              transactionCount: Number(summary.transactionCount || 0),
              itemsSold: Number(summary.itemsSold || 0),
              moneyIn: Number(summary.moneyIn || 0),
              moneyOut: Number(summary.moneyOut || 0),
              netMoneyMovement: Number(summary.netMoneyMovement || 0),
              salesCollected: Number(summary.salesCollected || 0),
              debtRecovered: Number(summary.debtRecovered || 0),
              stockPurchaseSpend: Number(summary.stockPurchaseSpend || 0),
              operatingExpenses: Number(summary.operatingExpenses || 0),
              cashReversals: Number(summary.cashReversals || 0),
              purchaseReturns: Number(summary.purchaseReturns || 0),
              netCashGenerated: Number(summary.netCashGenerated || 0),
              currentBusinessFunds: Number(summary.currentBusinessFunds || 0),
              openingBalance: Number(summary.openingBalance || 0),
              ownerCapital: Number(summary.ownerCapital || 0),
              ownerWithdrawals: Number(summary.ownerWithdrawals || 0),
              outstandingDebt: Number(summary.outstandingDebt || 0),
              debtorCount: Number(summary.debtorCount || 0),
              inventoryValue: Number(summary.inventoryValue || 0),
              totalStockUnits: Number(summary.totalStockUnits || 0),
              lowStockCount: Number(summary.lowStockCount || 0),
              outOfStockCount: Number(summary.outOfStockCount || 0),
              registeredCustomersCount: Number(summary.registeredCustomersCount || 0),
              totalPurchasesAmount: Number(summary.totalPurchasesAmount || 0),
              purchasesCount: Number(summary.purchasesCount || 0),
            },
            salesTrends: (payload.salesTrends || []).map((row: any) => ({
              ...row,
              sales: Number(row.sales || 0),
              profit: Number(row.profit || 0),
              transactions: Number(row.transactions || 0),
            })),
            financialMovementTrends: (payload.financialMovementTrends || []).map((row: any) => ({
              ...row,
              moneyIn: Number(row.moneyIn || 0),
              moneyOut: Number(row.moneyOut || 0),
              netMovement: Number(row.netMovement || 0),
            })),
            topProducts: (payload.topProducts || []).map((row: any) => ({
              ...row,
              productId: String(row.productId),
              variantId: String(row.variantId),
              unitsSold: Number(row.unitsSold || 0),
              revenue: Number(row.revenue || 0),
              profit: Number(row.profit || 0),
              currentStock: Number(row.currentStock || 0),
            })),
            recentSales: (payload.recentSales || []).map((row: any) => ({
              ...row,
              id: String(row.id),
              totalAmount: Number(row.totalAmount || 0),
              itemCount: Number(row.itemCount || 0),
            })),
            recentPurchases: (payload.recentPurchases || []).map((row: any) => ({
              ...row,
              id: String(row.id),
              totalAmount: Number(row.totalAmount || 0),
              itemsCount: Number(row.itemsCount || 0),
            })),
            stockAlerts: (payload.stockAlerts || []).map((row: any) => ({
              ...row,
              productId: String(row.productId),
              variantId: String(row.variantId),
              currentStock: Number(row.currentStock || 0),
              reorderLevel: Number(row.reorderLevel || 0),
            })),
            lowStockThreshold: Number(payload.lowStockThreshold || 0),
          },
          message: response.message,
        };
        apiCache.set(key, result, 30 * 1000);
        return result;
      } catch (error) {
        if (error instanceof ApiError) throw error;
        throw new Error('Failed to load dashboard data.');
      }
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
