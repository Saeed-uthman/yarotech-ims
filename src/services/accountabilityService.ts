import {
  AccountabilityTransaction,
  AccountabilityFilterParams,
  AccountabilitySummary,
  AccountabilityDateGroup,
  AccountabilityDateRange,
  ManualExpense,
  CreateExpenseInput,
  UserRole,
  ApiResponse,
} from '../types';
import { mockRepository } from './mockRepository';
import { apiCache } from './apiCache';

export class AccountabilityService {
  /**
   * Fetch grouped chronological accountability feed (TODAY, YESTERDAY, THIS WEEK, etc.)
   * Includes SWR caching and in-flight request deduplication.
   */
  public async getAccountabilityFeed(
    params?: Partial<AccountabilityFilterParams>,
    role: UserRole = 'admin'
  ): Promise<ApiResponse<AccountabilityDateGroup[]>> {
    const defaultParams: AccountabilityFilterParams = {
      search: params?.search || '',
      dateRange: params?.dateRange || 'today',
      startDate: params?.startDate,
      endDate: params?.endDate,
      direction: params?.direction || 'all',
      type: params?.type || 'all',
      category: params?.category || 'all',
      sortBy: params?.sortBy || 'date',
      sortOrder: params?.sortOrder || 'desc',
      page: params?.page || 1,
      limit: params?.limit || 100,
    };

    const key = apiCache.generateKey('accountability:feed', {
      ...defaultParams,
      role,
    });

    return apiCache.deduplicate(key, async () => {
      const response = await mockRepository.getAccountabilityFeed(defaultParams, role);
      apiCache.set(key, response, 30 * 1000); // 30s cache
      return response;
    });
  }

  /**
   * Fetch raw list of accountability transactions
   */
  public async getAccountabilityTransactions(
    params?: Partial<AccountabilityFilterParams>,
    role: UserRole = 'admin'
  ): Promise<ApiResponse<AccountabilityTransaction[]>> {
    const defaultParams: AccountabilityFilterParams = {
      search: params?.search || '',
      dateRange: params?.dateRange || 'today',
      startDate: params?.startDate,
      endDate: params?.endDate,
      direction: params?.direction || 'all',
      type: params?.type || 'all',
      category: params?.category || 'all',
      sortBy: params?.sortBy || 'date',
      sortOrder: params?.sortOrder || 'desc',
      page: params?.page || 1,
      limit: params?.limit || 50,
    };

    const key = apiCache.generateKey('accountability:list', {
      ...defaultParams,
      role,
    });

    return apiCache.deduplicate(key, async () => {
      const response = await mockRepository.getAccountabilityTransactions(
        defaultParams,
        role
      );
      apiCache.set(key, response, 30 * 1000);
      return response;
    });
  }

  /**
   * Get single accountability transaction with full audit trace
   */
  public async getTransactionById(
    id: string,
    role: UserRole = 'admin'
  ): Promise<ApiResponse<AccountabilityTransaction>> {
    const key = apiCache.generateKey(`accountability:item:${id}`, { role });
    return apiCache.deduplicate(key, async () => {
      const response = await mockRepository.getAccountabilityTransactionById(id, role);
      apiCache.set(key, response, 30 * 1000);
      return response;
    });
  }

  /**
   * Get financial summary KPI metrics (Money In, Money Out, Net Movement)
   * Note: Net Movement is strictly a cash flow metric, NOT accounting profit.
   */
  public async getSummary(
    timeframe: AccountabilityDateRange = 'today',
    startDate?: string,
    endDate?: string,
    role: UserRole = 'admin'
  ): Promise<ApiResponse<AccountabilitySummary>> {
    const key = apiCache.generateKey('accountability:summary', {
      timeframe,
      startDate,
      endDate,
      role,
    });

    return apiCache.deduplicate(key, async () => {
      const response = await mockRepository.getAccountabilitySummary(
        timeframe,
        startDate,
        endDate,
        role
      );
      apiCache.set(key, response, 30 * 1000);
      return response;
    });
  }

  /**
   * Create an approved manual operating expense
   * Automatically creates the associated Accountability OUT transaction
   * and invalidates relevant caches.
   */
  public async createExpense(
    input: CreateExpenseInput,
    role: UserRole = 'admin'
  ): Promise<
    ApiResponse<{
      expense: ManualExpense;
      transaction: AccountabilityTransaction;
    }>
  > {
    const response = await mockRepository.createManualExpense(input, role);

    if (response.success) {
      // Invalidate caches
      apiCache.invalidateByPrefix('accountability:');
      apiCache.invalidateByPrefix('dashboard:');
      apiCache.invalidateByPrefix('kpi:');
    }

    return response;
  }
}

export const accountabilityService = new AccountabilityService();
