import { useState, useEffect, useCallback, useRef } from 'react';
import {
  AccountabilityTransaction,
  AccountabilityFilterParams,
  AccountabilitySummary,
  AccountabilityDateGroup,
  AccountabilityDateRange,
  CreateExpenseInput,
  ManualExpense,
  UserRole,
} from '../types';
import { accountabilityService } from '../services/accountabilityService';
import { apiCache } from '../services/apiCache';

/**
 * Main hook for fetching chronological, grouped accountability feed
 */
export function useAccountabilityFeed(
  filters: AccountabilityFilterParams,
  role: UserRole = 'admin'
) {
  const [dateGroups, setDateGroups] = useState<AccountabilityDateGroup[]>([]);
  const [totalTransactions, setTotalTransactions] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [isStale, setIsStale] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Debounced search term ref & timer
  const [debouncedSearch, setDebouncedSearch] = useState(filters.search);
  const searchTimerRef = useRef<NodeJS.Timeout | null>(null);
  const requestIdRef = useRef<number>(0);

  useEffect(() => {
    if (filters.search !== debouncedSearch) {
      setIsSearching(true);
      if (searchTimerRef.current) {
        clearTimeout(searchTimerRef.current);
      }
      searchTimerRef.current = setTimeout(() => {
        setDebouncedSearch(filters.search);
        setIsSearching(false);
      }, 300);
    }
    return () => {
      if (searchTimerRef.current) {
        clearTimeout(searchTimerRef.current);
      }
    };
  }, [filters.search, debouncedSearch]);

  const fetchFeedData = useCallback(
    async (forceFresh: boolean = false) => {
      const thisRequestId = ++requestIdRef.current;
      const effectiveFilters: AccountabilityFilterParams = {
        ...filters,
        search: debouncedSearch,
      };

      const cacheKey = apiCache.generateKey('accountability:feed', {
        ...effectiveFilters,
        role,
      });

      // 1. SWR cache check
      if (!forceFresh) {
        const cached = apiCache.get<any>(cacheKey);
        if (cached.data && cached.data.data) {
          setDateGroups(cached.data.data);
          setTotalTransactions(
            cached.data.meta?.total ||
              cached.data.data.reduce(
                (acc: number, g: any) => acc + (g.transactions?.length || 0),
                0
              )
          );
          setIsStale(cached.isStale);
          if (!cached.isStale) {
            setIsLoading(false);
            return;
          }
        }
      }

      if (!dateGroups.length) {
        setIsLoading(true);
      }
      setError(null);

      try {
        const response = await accountabilityService.getAccountabilityFeed(
          effectiveFilters,
          role
        );

        if (thisRequestId !== requestIdRef.current) {
          return;
        }

        if (response.success && response.data) {
          setDateGroups(response.data);
          setTotalTransactions(response.meta?.total || response.data.reduce((acc, g) => acc + g.transactions.length, 0));
          setIsStale(false);
        } else {
          setError(response.message || 'Failed to load accountability records.');
        }
      } catch (err: any) {
        if (thisRequestId === requestIdRef.current) {
          setError(
            err.message || 'Unable to load accountability feed. Please retry.'
          );
        }
      } finally {
        if (thisRequestId === requestIdRef.current) {
          setIsLoading(false);
        }
      }
    },
    [
      filters.dateRange,
      filters.startDate,
      filters.endDate,
      filters.direction,
      filters.type,
      filters.category,
      filters.sortBy,
      filters.sortOrder,
      debouncedSearch,
      role,
    ]
  );

  useEffect(() => {
    fetchFeedData();
  }, [fetchFeedData]);

  // Smart Polling: Poll every 40s only when document is visible
  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchFeedData(true);
      }
    }, 40000);

    return () => clearInterval(interval);
  }, [fetchFeedData]);

  const refetch = useCallback(() => {
    apiCache.invalidateByPrefix('accountability:');
    return fetchFeedData(true);
  }, [fetchFeedData]);

  return {
    dateGroups,
    totalTransactions,
    isLoading,
    isSearching,
    isStale,
    error,
    refetch,
  };
}

/**
 * Hook for fetching financial summary metrics (Money In, Money Out, Net Movement)
 */
export function useAccountabilitySummary(
  timeframe: AccountabilityDateRange = 'today',
  startDate?: string,
  endDate?: string,
  role: UserRole = 'admin'
) {
  const [summary, setSummary] = useState<AccountabilitySummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSummary = useCallback(
    async (forceFresh: boolean = false) => {
      const cacheKey = apiCache.generateKey('accountability:summary', {
        timeframe,
        startDate,
        endDate,
        role,
      });

      if (!forceFresh) {
        const cached = apiCache.get<any>(cacheKey);
        if (cached.data && cached.data.data) {
          setSummary(cached.data.data);
          if (!cached.isStale) {
            setIsLoading(false);
            return;
          }
        }
      }

      setIsLoading(true);
      setError(null);

      try {
        const response = await accountabilityService.getSummary(
          timeframe,
          startDate,
          endDate,
          role
        );
        if (response.success && response.data) {
          setSummary(response.data);
        } else {
          setError(response.message || 'Failed to load financial summary.');
        }
      } catch (err: any) {
        setError(err.message || 'Unable to compute accountability summary.');
      } finally {
        setIsLoading(false);
      }
    },
    [timeframe, startDate, endDate, role]
  );

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  return {
    summary,
    isLoading,
    error,
    refetch: () => fetchSummary(true),
  };
}

/**
 * Hook for fetching single transaction details with full audit traceability
 */
export function useAccountabilityDetails(
  transactionId: string | null,
  role: UserRole = 'admin'
) {
  const [transaction, setTransaction] = useState<AccountabilityTransaction | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDetails = useCallback(
    async (id: string) => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await accountabilityService.getTransactionById(id, role);
        if (response.success && response.data) {
          setTransaction(response.data);
        } else {
          setError(response.message || 'Transaction details not found.');
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load transaction audit details.');
      } finally {
        setIsLoading(false);
      }
    },
    [role]
  );

  useEffect(() => {
    if (transactionId) {
      fetchDetails(transactionId);
    } else {
      setTransaction(null);
      setError(null);
    }
  }, [transactionId, fetchDetails]);

  return {
    transaction,
    isLoading,
    error,
    refetch: () => transactionId && fetchDetails(transactionId),
  };
}

/**
 * Hook for recording operating expenses with double-click submission guard
 */
export function useExpenseMutations(role: UserRole = 'admin') {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const isSubmittingRef = useRef(false);

  const createExpense = useCallback(
    async (
      input: CreateExpenseInput
    ): Promise<{
      success: boolean;
      data?: { expense: ManualExpense; transaction: AccountabilityTransaction };
      error?: string;
    }> => {
      if (isSubmittingRef.current) {
        return { success: false, error: 'Transaction in progress. Please wait.' };
      }

      isSubmittingRef.current = true;
      setIsSubmitting(true);
      setError(null);
      setSuccessMessage(null);

      try {
        const response = await accountabilityService.createExpense(input, role);
        if (response.success && response.data) {
          setSuccessMessage(response.message || 'Expense recorded successfully.');
          return { success: true, data: response.data };
        } else {
          const errMsg = response.message || 'Failed to record expense.';
          setError(errMsg);
          return { success: false, error: errMsg };
        }
      } catch (err: any) {
        const msg = err.message || 'An error occurred while recording expense.';
        setError(msg);
        return { success: false, error: msg };
      } finally {
        isSubmittingRef.current = false;
        setIsSubmitting(false);
      }
    },
    [role]
  );

  const clearState = useCallback(() => {
    setError(null);
    setSuccessMessage(null);
  }, []);

  return {
    createExpense,
    isSubmitting,
    error,
    successMessage,
    clearState,
  };
}
