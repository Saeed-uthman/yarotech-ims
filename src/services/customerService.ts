import {
  Customer,
  CustomerFilterParams,
  CustomerSummaryKPIs,
  CustomerSale,
  CustomerDebtPayment,
  CreateCustomerInput,
  UpdateCustomerInput,
  DebtPaymentInput,
  UserRole,
  ApiResponse,
} from '../types';
import { mockRepository } from './mockRepository';
import { apiCache } from './apiCache';

export class CustomerService {
  /**
   * Fetch paginated and filtered customer list
   * Implements in-flight request deduplication and deterministic cache keys
   */
  public async getCustomers(
    params?: Partial<CustomerFilterParams>,
    role: UserRole = 'admin'
  ): Promise<ApiResponse<Customer[]>> {
    const defaultParams: CustomerFilterParams = {
      search: params?.search || '',
      status: params?.status || 'all',
      debtStatus: params?.debtStatus || 'all',
      sortBy: params?.sortBy || 'name',
      sortOrder: params?.sortOrder || 'asc',
      page: params?.page || 1,
      limit: params?.limit || 10,
    };

    const key = apiCache.generateKey('customers:list', {
      ...defaultParams,
      role,
    });

    return apiCache.deduplicate(key, async () => {
      const response = await mockRepository.getCustomers(defaultParams, role);
      apiCache.set(key, response, 30 * 1000); // 30s cache
      return response;
    });
  }

  /**
   * Get single customer by ID
   */
  public async getCustomerById(
    id: string
  ): Promise<ApiResponse<Customer | null>> {
    const key = apiCache.generateKey(`customer:${id}`);
    return apiCache.deduplicate(key, async () => {
      const response = await mockRepository.getCustomerById(id);
      apiCache.set(key, response, 30 * 1000);
      return response;
    });
  }

  /**
   * Check if phone number is duplicate
   */
  public checkDuplicatePhone(phone: string, excludeId?: string): boolean {
    return mockRepository.checkDuplicatePhone(phone, excludeId);
  }

  /**
   * Create new registered customer
   */
  public async createCustomer(
    input: CreateCustomerInput
  ): Promise<ApiResponse<Customer>> {
    const response = await mockRepository.createCustomer(input);
    apiCache.invalidate('customers:');
    return response;
  }

  /**
   * Update registered customer
   */
  public async updateCustomer(
    id: string,
    input: UpdateCustomerInput
  ): Promise<ApiResponse<Customer>> {
    const response = await mockRepository.updateCustomer(id, input);
    apiCache.invalidate('customers:');
    apiCache.invalidate(`customer:${id}`);
    return response;
  }

  /**
   * Deactivate customer (preserves history)
   */
  public async deactivateCustomer(
    id: string
  ): Promise<ApiResponse<Customer>> {
    const response = await mockRepository.deactivateCustomer(id);
    apiCache.invalidate('customers:');
    apiCache.invalidate(`customer:${id}`);
    return response;
  }

  /**
   * Activate customer
   */
  public async activateCustomer(
    id: string
  ): Promise<ApiResponse<Customer>> {
    const response = await mockRepository.activateCustomer(id);
    apiCache.invalidate('customers:');
    apiCache.invalidate(`customer:${id}`);
    return response;
  }

  /**
   * Get customer sales history
   */
  public async getCustomerSales(
    customerId: string,
    page = 1,
    limit = 10
  ): Promise<ApiResponse<CustomerSale[]>> {
    const key = apiCache.generateKey(`customer:sales:${customerId}`, { page, limit });
    return apiCache.deduplicate(key, async () => {
      const response = await mockRepository.getCustomerSales(customerId, page, limit);
      apiCache.set(key, response, 30 * 1000);
      return response;
    });
  }

  /**
   * Get customer debt payments ledger
   */
  public async getCustomerDebtPayments(
    customerId: string
  ): Promise<ApiResponse<CustomerDebtPayment[]>> {
    const key = apiCache.generateKey(`customer:debt_payments:${customerId}`);
    return apiCache.deduplicate(key, async () => {
      const response = await mockRepository.getCustomerDebtPayments(customerId);
      apiCache.set(key, response, 30 * 1000);
      return response;
    });
  }

  /**
   * Record debt payment for customer
   */
  public async recordDebtPayment(
    input: DebtPaymentInput,
    role: UserRole = 'admin'
  ): Promise<ApiResponse<{ customer: Customer; payment: CustomerDebtPayment }>> {
    const response = await mockRepository.recordDebtPayment(input, role);
    apiCache.invalidate('customers:');
    apiCache.invalidate(`customer:${input.customerId}`);
    return response;
  }

  /**
   * Get high level Customer KPIs
   */
  public async getCustomerKPIs(): Promise<ApiResponse<CustomerSummaryKPIs>> {
    const key = apiCache.generateKey('customers:kpis');
    return apiCache.deduplicate(key, async () => {
      const response = await mockRepository.getCustomerKPIs();
      apiCache.set(key, response, 30 * 1000);
      return response;
    });
  }
}

export const customerService = new CustomerService();
