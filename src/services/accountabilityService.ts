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
import { api, ApiError, createIdempotencyKey, mapPaginationMeta, toCamelCaseKeys } from './apiClient';
import { apiCache } from './apiCache';

export class AccountabilityService {
  private mapDateRange(value: AccountabilityDateRange): string | undefined {
    if (value === 'this_week') return 'week';
    if (value === 'this_month') return 'month';
    if (value === 'overall' || value === 'custom') return undefined;
    return value;
  }

  private mapTransaction(raw: any): AccountabilityTransaction {
    const item = toCamelCaseKeys(raw);
    const rawDate = item.createdAt || '';
    const referenceTypeMap: Record<string, AccountabilityTransaction['referenceType']> = {
      Sale: 'SALE',
      CustomerDebtPayment: 'DEBT_PAYMENT',
      StockPurchase: 'STOCK_PURCHASE',
      ManualExpense: 'OTHER_EXPENSE',
    };
    return {
      id: String(item.id),
      transactionNumber: item.transactionNumber,
      type: item.type,
      direction: item.direction,
      amount: Number(item.amount || 0),
      description: item.description || '',
      category: item.category || '',
      paymentMethod: item.paymentMethod,
      referenceType: referenceTypeMap[item.referenceType] || item.type,
      referenceId: String(item.referenceId || ''),
      referenceNumber: item.referenceNumber || String(item.referenceId || ''),
      customerName: item.customerName || undefined,
      customerId: item.customerId ? String(item.customerId) : null,
      recordedBy: item.createdByName || '',
      note: item.note || undefined,
      date: rawDate ? new Date(rawDate).toLocaleString('en-NG') : '',
      rawDate,
      status: item.status,
      createdAt: rawDate,
      updatedAt: item.updatedAt,
      sourceDetails: item.sourceDetails
        ? {
            ...item.sourceDetails,
            itemCount: Number(item.sourceDetails.itemCount || 0),
            totalUnits: Number(item.sourceDetails.totalUnits || 0),
            previousBalance: item.sourceDetails.previousBalance === undefined
              ? undefined
              : Number(item.sourceDetails.previousBalance),
            newBalance: item.sourceDetails.newBalance === undefined
              ? undefined
              : Number(item.sourceDetails.newBalance),
            items: (item.sourceDetails.items || []).map((sourceItem: any) => ({
              ...sourceItem,
              productId: sourceItem.productId ? String(sourceItem.productId) : undefined,
              quantity: Number(sourceItem.quantity || 0),
              unitPrice: Number(sourceItem.unitPrice || 0),
              subtotal: Number(sourceItem.subtotal || 0),
            })),
          }
        : undefined,
    };
  }

  private groupTransactions(transactions: AccountabilityTransaction[]): AccountabilityDateGroup[] {
    const groups = new Map<string, AccountabilityTransaction[]>();
    for (const transaction of transactions) {
      const key = transaction.rawDate.slice(0, 10);
      groups.set(key, [...(groups.get(key) || []), transaction]);
    }
    const today = new Date().toISOString().slice(0, 10);
    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterday = yesterdayDate.toISOString().slice(0, 10);
    return Array.from(groups.entries())
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([rawDate, items]) => {
        const moneyIn = items.filter((item) => item.direction === 'IN').reduce((sum, item) => sum + item.amount, 0);
        const moneyOut = items.filter((item) => item.direction === 'OUT').reduce((sum, item) => sum + item.amount, 0);
        const dateLabel = rawDate === today
          ? 'TODAY'
          : rawDate === yesterday
            ? 'YESTERDAY'
            : new Date(`${rawDate}T00:00:00`).toLocaleDateString('en-NG', {
                weekday: 'long', day: 'numeric', month: 'short', year: 'numeric',
              }).toUpperCase();
        return {
          dateLabel,
          rawDate,
          transactions: items,
          groupMoneyIn: moneyIn,
          groupMoneyOut: moneyOut,
          groupNet: moneyIn - moneyOut,
        };
      });
  }

  private buildQuery(params: AccountabilityFilterParams): Record<string, any> {
    return {
      search: params.search || undefined,
      date_range: this.mapDateRange(params.dateRange),
      start_date: params.dateRange === 'custom' ? params.startDate : undefined,
      end_date: params.dateRange === 'custom' ? params.endDate : undefined,
      direction: params.direction === 'all' ? undefined : params.direction,
      type: params.type === 'all' ? undefined : params.type,
      category: !params.category || params.category === 'all' ? undefined : params.category,
      ordering: `${params.sortOrder === 'desc' ? '-' : ''}${params.sortBy}`,
      page: params.page,
      per_page: params.limit,
    };
  }
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
      const response = await api.get<any>('/accountability/', this.buildQuery(defaultParams));
      const transactions = (response.data || []).map((raw: any) => this.mapTransaction(raw));
      const result: ApiResponse<AccountabilityDateGroup[]> = {
        success: true,
        data: this.groupTransactions(transactions),
        meta: mapPaginationMeta(response.meta),
        message: response.message,
      };
      apiCache.set(key, result, 30 * 1000);
      return result;
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
      const response = await api.get<any>('/accountability/', this.buildQuery(defaultParams));
      const result: ApiResponse<AccountabilityTransaction[]> = {
        success: true,
        data: (response.data || []).map((raw: any) => this.mapTransaction(raw)),
        meta: mapPaginationMeta(response.meta),
        message: response.message,
      };
      apiCache.set(key, result, 30 * 1000);
      return result;
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
      const response = await api.get<any>(`/accountability/${id}/`);
      const result = { success: true, data: this.mapTransaction(response.data), message: response.message };
      apiCache.set(key, result, 30 * 1000);
      return result;
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
      const response = await api.get<any>('/accountability/summary/', {
        date_range: this.mapDateRange(timeframe),
        start_date: timeframe === 'custom' ? startDate : undefined,
        end_date: timeframe === 'custom' ? endDate : undefined,
      });
      const data = toCamelCaseKeys(response.data);
      const result: ApiResponse<AccountabilitySummary> = {
        success: true,
        data: {
          moneyIn: Number(data.totalInflow || 0),
          moneyOut: Number(data.totalOutflow || 0),
          netMovement: Number(data.netMovement || 0),
          totalTransactionsCount: Number(data.totalTransactionsCount || 0),
          salesIncome: Number(data.salesIncome || 0),
          debtPaymentsIncome: Number(data.debtPaymentsIncome || 0),
          purchasesExpense: Number(data.purchasesExpense || 0),
          otherExpensesExpense: Number(data.otherExpensesExpense || 0),
          timeframe,
        },
        message: response.message,
      };
      apiCache.set(key, result, 30 * 1000);
      return result;
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
    try {
      const response = await api.post<any>(
        '/accountability/expenses/',
        {
          description: input.description,
          category: input.category,
          amount: input.amount,
          paymentMethod: input.paymentMethod,
          note: input.note || '',
        },
        createIdempotencyKey('expense'),
      );
      const rawExpense = toCamelCaseKeys(response.data.expense);
      const rawDate = rawExpense.createdAt || '';
      const expense: ManualExpense = {
        id: String(rawExpense.id),
        expenseNumber: rawExpense.expenseNumber,
        description: rawExpense.description,
        category: rawExpense.category,
        amount: Number(rawExpense.amount || 0),
        paymentMethod: rawExpense.paymentMethod,
        date: rawDate ? new Date(rawDate).toLocaleString('en-NG') : '',
        rawDate,
        note: rawExpense.note || undefined,
        recordedBy: rawExpense.createdByName || '',
        createdAt: rawDate,
      };
      const transaction = this.mapTransaction(response.data.transaction);
      transaction.referenceNumber = expense.expenseNumber;
      const result = {
        success: true,
        data: { expense, transaction },
        message: response.message,
      };

      // Invalidate caches
      apiCache.invalidateByPrefix('accountability:');
      apiCache.invalidateByPrefix('dashboard:');
      apiCache.invalidateByPrefix('kpi:');
      apiCache.invalidateByPrefix('reports:');
      return result;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new Error('Failed to record expense.');
    }
  }
}

export const accountabilityService = new AccountabilityService();
