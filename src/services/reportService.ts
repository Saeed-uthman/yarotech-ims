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
import { mockRepository } from './mockRepository';
import { apiCache } from './apiCache';

export class ReportService {
  /**
   * 1. Get Financial Summary Report
   */
  public async getFinancialSummaryReport(
    params: ReportFilterParams,
    role: UserRole = 'admin'
  ): Promise<ApiResponse<FinancialSummaryReport>> {
    const key = apiCache.generateKey('reports:financial-summary', { ...params, role });

    return apiCache.deduplicate(key, async () => {
      const response = await mockRepository.getFinancialSummaryReport(params, role);
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
      const response = await mockRepository.getSalesReport(params, role);
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
      const response = await mockRepository.getProfitReport(params, role);
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
      const response = await mockRepository.getStockPurchaseReport(params, role);
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
      const response = await mockRepository.getFinancialMovementReport(params, role);
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
      const response = await mockRepository.getProductPerformanceReport(params, role);
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
      const response = await mockRepository.getInventoryMovementReport(params, role);
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
      const response = await mockRepository.getCustomerDebtReport(params, role);
      apiCache.set(key, response, 30 * 1000);
      return response;
    });
  }

  /**
   * Invalidate reports cache
   */
  public invalidateReportsCache(): void {
    apiCache.invalidate('reports:');
  }
}

export const reportService = new ReportService();
