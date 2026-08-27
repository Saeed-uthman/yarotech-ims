import {
  ReportFilterParams,
  FinancialSummaryReport,
  SalesReportData,
  ProfitReportData,
  StockPurchaseReportData,
  FinancialMovementReportData,
  ProductPerformanceReportData,
  InventoryMovementReportData,
  DebtMovementReportData,
  UserRole,
  ApiResponse,
} from '../types';
import { api, ApiError, toCamelCaseKeys } from './apiClient';
import { apiCache } from './apiCache';

export class ReportService {
  private query(params: ReportFilterParams): Record<string, any> {
    return {
      date_range: params.dateRange,
      start_date: params.dateRange === 'custom' ? params.startDate : undefined,
      end_date: params.dateRange === 'custom' ? params.endDate : undefined,
      product_id: params.productId || undefined,
      company_id: params.companyId || undefined,
      category_id: params.categoryId || undefined,
      payment_method: params.paymentMethod || undefined,
    };
  }

  private async fetchReport<T>(endpoint: string, params: ReportFilterParams, mapper: (data: any) => T): Promise<ApiResponse<T>> {
    try {
      const response = await api.get<any>(endpoint, this.query(params));
      return { success: true, data: mapper(toCamelCaseKeys(response.data)), message: response.message };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new Error('Failed to load report data.');
    }
  }
  /**
   * 1. Get Financial Summary Report
   */
  public async getFinancialSummaryReport(
    params: ReportFilterParams,
    role: UserRole = 'admin'
  ): Promise<ApiResponse<FinancialSummaryReport>> {
    const key = apiCache.generateKey('reports:financial-summary', { ...params, role });

    return apiCache.deduplicate(key, async () => {
      const response = await this.fetchReport('/reports/overview/', params, (d): FinancialSummaryReport => ({
        totalSales: Number(d.totalRevenue || 0),
        totalProfit: Number(d.totalProfit || 0),
        profitMarginPercentage: Number(d.profitMarginPercentage || 0),
        totalStockPurchases: Number(d.totalPurchaseSpend || 0),
        moneyIn: Number(d.moneyIn || 0),
        moneyOut: Number(d.moneyOut || 0),
        netMoneyMovement: Number(d.netMoneyMovement || 0),
        outstandingDebt: Number(d.totalOutstanding || 0),
        totalTransactions: Number(d.totalTransactions || 0),
        totalUnitsSold: Number(d.totalUnitsSold || 0),
        totalUnitsPurchased: Number(d.totalUnitsPurchased || 0),
        averageSaleValue: Number(d.averageSaleValue || 0),
        timeframe: d.dateRange || params.dateRange,
        startDate: d.startDate || params.startDate || '',
        endDate: d.endDate || params.endDate || '',
      }));
      apiCache.set(key, response, 30 * 1000); // 30s cache
      return response;
    });
  }

  /**
   * 2. Get Sales Report
   */
  public async getSalesReport(
    params: ReportFilterParams,
    role: UserRole = 'admin'
  ): Promise<ApiResponse<SalesReportData>> {
    const key = apiCache.generateKey('reports:sales', { ...params, role });

    return apiCache.deduplicate(key, async () => {
      const response = await this.fetchReport('/reports/sales/', params, (d): SalesReportData => ({
        summary: Object.fromEntries(Object.entries(d.summary || {}).map(([key, value]) => [key, Number(value || 0)])) as any,
        trends: (d.trends || []).map((row: any) => ({ ...row, sales: Number(row.sales || 0), profit: Number(row.profit || 0), purchases: Number(row.purchases || 0), moneyIn: Number(row.moneyIn || 0), moneyOut: Number(row.moneyOut || 0), unitsSold: Number(row.unitsSold || 0), transactionsCount: Number(row.transactionsCount || 0) })),
        salesByPaymentMethod: (d.salesByPaymentMethod || []).map((row: any) => ({ ...row, amount: Number(row.amount || 0), count: Number(row.count || 0), percentage: Number(row.percentage || 0) })),
        salesByCategory: (d.salesByCategory || []).map((row: any) => ({ ...row, categoryId: String(row.categoryId), unitsSold: Number(row.unitsSold || 0), revenue: Number(row.revenue || 0), profit: Number(row.profit || 0) })),
        salesByCompany: (d.salesByCompany || []).map((row: any) => ({ ...row, companyId: String(row.companyId), unitsSold: Number(row.unitsSold || 0), revenue: Number(row.revenue || 0), profit: Number(row.profit || 0) })),
      }));
      apiCache.set(key, response, 30 * 1000);
      return response;
    });
  }

  /**
   * 3. Get Profit Report (Admin only)
   */
  public async getProfitReport(
    params: ReportFilterParams,
    role: UserRole = 'admin'
  ): Promise<ApiResponse<ProfitReportData>> {
    const key = apiCache.generateKey('reports:profit', { ...params, role });

    return apiCache.deduplicate(key, async () => {
      const response = await this.fetchReport('/reports/profit/', params, (d): ProfitReportData => ({
        summary: Object.fromEntries(Object.entries(d.summary || {}).map(([key, value]) => [key, Number(value || 0)])) as any,
        trends: (d.trends || []).map((row: any) => ({ ...row, sales: Number(row.sales || 0), profit: Number(row.profit || 0), purchases: 0, moneyIn: 0, moneyOut: 0, unitsSold: Number(row.unitsSold || 0), transactionsCount: Number(row.transactionsCount || 0) })),
        profitByCategory: (d.profitByCategory || []).map((row: any) => ({ ...row, categoryId: String(row.categoryId), revenue: Number(row.revenue || 0), cost: Number(row.cost || 0), profit: Number(row.profit || 0), marginPct: Number(row.marginPct || 0) })),
        profitByCompany: (d.profitByCompany || []).map((row: any) => ({ ...row, companyId: String(row.companyId), revenue: Number(row.revenue || 0), cost: Number(row.cost || 0), profit: Number(row.profit || 0), marginPct: Number(row.marginPct || 0) })),
        topProfitableProducts: (d.topProfitableProducts || []).map((row: any) => ({ ...row, productId: String(row.productId), unitsSold: Number(row.unitsSold || 0), revenue: Number(row.revenue || 0), cost: Number(row.cost || 0), profit: Number(row.profit || 0), marginPct: Number(row.marginPct || 0) })),
      }));
      apiCache.set(key, response, 30 * 1000);
      return response;
    });
  }

  /**
   * 4. Get Stock Purchase Report
   */
  public async getStockPurchaseReport(
    params: ReportFilterParams,
    role: UserRole = 'admin'
  ): Promise<ApiResponse<StockPurchaseReportData>> {
    const key = apiCache.generateKey('reports:purchases', { ...params, role });

    return apiCache.deduplicate(key, async () => {
      const response = await this.fetchReport('/reports/purchases/', params, (d): StockPurchaseReportData => ({
        summary: Object.fromEntries(Object.entries(d.summary || {}).map(([key, value]) => [key, Number(value || 0)])) as any,
        trends: (d.trends || []).map((row: any) => ({ ...row, amount: Number(row.amount || 0), units: Number(row.units || 0), count: Number(row.count || 0) })),
        purchasesByCompany: (d.purchasesByCompany || []).map((row: any) => ({ ...row, companyId: String(row.companyId), purchasesCount: Number(row.purchasesCount || 0), unitsPurchased: Number(row.unitsPurchased || 0), totalAmount: Number(row.totalAmount || 0), percentage: Number(row.percentage || 0) })),
        topPurchasedProducts: (d.topPurchasedProducts || []).map((row: any) => ({ ...row, productId: String(row.productId), unitsPurchased: Number(row.unitsPurchased || 0), totalSpent: Number(row.totalSpent || 0), unitCost: Number(row.unitCost || 0) })),
      }));
      apiCache.set(key, response, 30 * 1000);
      return response;
    });
  }

  /**
   * 5. Get Financial Movement Report
   */
  public async getFinancialMovementReport(
    params: ReportFilterParams,
    role: UserRole = 'admin'
  ): Promise<ApiResponse<FinancialMovementReportData>> {
    const key = apiCache.generateKey('reports:financial-movement', { ...params, role });

    return apiCache.deduplicate(key, async () => {
      const response = await this.fetchReport('/reports/financial-movement/', params, (d): FinancialMovementReportData => ({
        summary: Object.fromEntries(Object.entries(d.summary || {}).map(([key, value]) => [key, Number(value || 0)])) as any,
        trends: (d.trends || []).map((row: any) => ({ ...row, moneyIn: Number(row.moneyIn || 0), moneyOut: Number(row.moneyOut || 0), netMovement: Number(row.netMovement || 0) })),
        moneyInBreakdown: (d.moneyInBreakdown || []).map((row: any) => ({ ...row, amount: Number(row.amount || 0), count: Number(row.count || 0), percentage: Number(row.percentage || 0) })),
        moneyOutBreakdown: (d.moneyOutBreakdown || []).map((row: any) => ({ ...row, amount: Number(row.amount || 0), count: Number(row.count || 0), percentage: Number(row.percentage || 0) })),
      }));
      apiCache.set(key, response, 30 * 1000);
      return response;
    });
  }

  /**
   * 6. Get Product Performance Report
   */
  public async getProductPerformanceReport(
    params: ReportFilterParams,
    role: UserRole = 'admin'
  ): Promise<ApiResponse<ProductPerformanceReportData>> {
    const key = apiCache.generateKey('reports:product-performance', { ...params, role });

    return apiCache.deduplicate(key, async () => {
      const response = await this.fetchReport('/reports/product-performance/', params, (d): ProductPerformanceReportData => ({
        items: (d.items || []).map((row: any) => ({ ...row, productId: String(row.productId), variantId: String(row.variantId), companyId: String(row.companyId), unitsSold: Number(row.unitsSold || 0), revenue: Number(row.revenue || 0), cost: Number(row.cost || 0), profit: Number(row.profit || 0), marginPct: Number(row.marginPct || 0), currentStock: Number(row.currentStock || 0), sellingPrice: Number(row.sellingPrice || 0), basePrice: Number(row.basePrice || 0) })),
        fastMovingCount: Number(d.fastMovingCount || 0), slowMovingCount: Number(d.slowMovingCount || 0), zeroMovementCount: Number(d.zeroMovementCount || 0), totalUnitsSold: Number(d.totalUnitsSold || 0), totalRevenue: Number(d.totalRevenue || 0), totalProfit: Number(d.totalProfit || 0),
      }));
      apiCache.set(key, response, 30 * 1000);
      return response;
    });
  }

  /**
   * 7. Get Inventory Movement Report
   */
  public async getInventoryMovementReport(
    params: ReportFilterParams,
    role: UserRole = 'admin'
  ): Promise<ApiResponse<InventoryMovementReportData>> {
    const key = apiCache.generateKey('reports:inventory-movement', { ...params, role });

    return apiCache.deduplicate(key, async () => {
      const response = await this.fetchReport('/reports/inventory-movement/', params, (d): InventoryMovementReportData => ({
        items: (d.items || []).map((row: any) => ({ ...row, productId: String(row.productId), variantId: String(row.variantId), openingStock: Number(row.openingStock || 0), stockIn: Number(row.stockIn || 0), stockOut: Number(row.stockOut || 0), currentStock: Number(row.currentStock || 0), reorderLevel: Number(row.reorderLevel || 0) })),
        summary: {
          totalOpeningStock: Number(d.totalOpeningStock || 0),
          totalStockIn: Number(d.totalStockIn || 0),
          totalStockOut: Number(d.totalStockOut || 0),
          totalCurrentStock: Number(d.totalCurrentStock || 0),
          stockInPurchases: Number(d.stockInPurchases || 0),
          stockInAdjustments: Number(d.stockInAdjustments || 0),
          stockOutSales: Number(d.stockOutSales || 0),
          stockOutAdjustments: Number(d.stockOutAdjustments || 0),
        },
      }));
      apiCache.set(key, response, 30 * 1000);
      return response;
    });
  }

  /**
   * 8. Get Customer Debt Report
   */
  public async getCustomerDebtReport(
    params: ReportFilterParams,
    role: UserRole = 'admin'
  ): Promise<ApiResponse<DebtMovementReportData>> {
    const key = apiCache.generateKey('reports:debt', { ...params, role });

    return apiCache.deduplicate(key, async () => {
      const response = await this.fetchReport('/reports/debt/', params, (d): DebtMovementReportData => ({
        summary: Object.fromEntries(Object.entries(d.summary || {}).map(([key, value]) => [key, Number(value || 0)])) as any,
        debtors: (d.debtors || []).map((row: any) => ({ ...row, customerId: String(row.customerId), currentDebt: Number(row.currentDebt || 0), totalPurchasesValue: Number(row.totalPurchasesValue || 0), debtCreatedInPeriod: Number(row.debtCreatedInPeriod || 0), debtPaidInPeriod: Number(row.debtPaidInPeriod || 0) })),
        trends: (d.trends || []).map((row: any) => ({ ...row, debtCreated: Number(row.debtCreated || 0), debtRecovered: Number(row.debtRecovered || 0) })),
      }));
      apiCache.set(key, response, 30 * 1000);
      return response;
    });
  }

  /**
   * Invalidate reports cache
   */
  public invalidateReportsCache(): void {
    apiCache.invalidateByPrefix('reports:');
  }
}

export const reportService = new ReportService();
