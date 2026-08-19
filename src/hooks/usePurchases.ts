import { useState, useEffect, useCallback, useRef } from 'react';
import {
  StockPurchase,
  PurchaseFilterParams,
  PurchaseSummaryKPIs,
  PurchaseChartDataPoint,
  CreatePurchaseInput,
  PurchaseDateRange,
  UserRole,
} from '../types';
import { purchaseService } from '../services/purchaseService';
import { apiCache } from '../services/apiCache';

/**
 * Main hook for fetching paginated & filtered stock purchases
 */
export function usePurchases(filters: PurchaseFilterParams, role: UserRole = 'admin') {
  const [purchases, setPurchases] = useState<StockPurchase[]>([]);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(filters.page || 1);
  const [totalPages, setTotalPages] = useState(1);
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
      }, 350);
    }
    return () => {
      if (searchTimerRef.current) {
        clearTimeout(searchTimerRef.current);
      }
    };
  }, [filters.search, debouncedSearch]);

  const fetchPurchasesData = useCallback(
    async (forceFresh: boolean = false) => {
      const thisRequestId = ++requestIdRef.current;
      const effectiveFilters: PurchaseFilterParams = {
        ...filters,
        search: debouncedSearch,
      };

      const cacheKey = apiCache.generateKey('purchases:list', {
        ...effectiveFilters,
        role,
      });

      // 1. SWR cache check
      if (!forceFresh) {
        const cached = apiCache.get<any>(cacheKey);
        if (cached.data && cached.data.data) {
          setPurchases(cached.data.data);
          if (cached.data.meta) {
            setTotal(cached.data.meta.total);
            setCurrentPage(cached.data.meta.currentPage);
            setTotalPages(cached.data.meta.lastPage);
          }
          setIsStale(cached.isStale);
          if (!cached.isStale) {
            setIsLoading(false);
            return;
          }
        }
      }

      setIsLoading(true);
      setError(null);

      try {
        const res = await purchaseService.getPurchases(effectiveFilters, role);

        if (thisRequestId === requestIdRef.current) {
          setPurchases(res.data);
          if (res.meta) {
            setTotal(res.meta.total);
            setCurrentPage(res.meta.currentPage);
            setTotalPages(res.meta.lastPage);
          }
          setIsStale(false);
          setError(null);
        }
      } catch (err: any) {
        if (thisRequestId === requestIdRef.current) {
          setError(err.message || 'Unable to load stock purchases.');
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
      filters.paymentMethod,
      filters.status,
      filters.sortBy,
      filters.sortOrder,
      filters.page,
      filters.limit,
      debouncedSearch,
      role,
    ]
  );

  useEffect(() => {
    fetchPurchasesData();
  }, [fetchPurchasesData]);

  const refetch = useCallback(() => {
    return fetchPurchasesData(true);
  }, [fetchPurchasesData]);

  return {
    purchases,
    total,
    currentPage,
    totalPages,
    isLoading,
    isSearching,
    isStale,
    error,
    refetch,
  };
}

/**
 * Hook for fetching Stock Purchases Summary KPIs
 */
export function usePurchaseSummary(
  filters: Partial<PurchaseFilterParams>,
  role: UserRole = 'admin'
) {
  const [summary, setSummary] = useState<PurchaseSummaryKPIs | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSummary = useCallback(
    async (forceFresh: boolean = false) => {
      const cacheKey = apiCache.generateKey('purchases:kpis', {
        ...filters,
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
        const res = await purchaseService.getPurchaseSummaryKPIs(filters, role);
        setSummary(res.data);
        setError(null);
      } catch (err: any) {
        setError(err.message || 'Unable to load purchase KPIs.');
      } finally {
        setIsLoading(false);
      }
    },
    [filters.dateRange, filters.startDate, filters.endDate, filters.paymentMethod, filters.search, role]
  );

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  const refetch = useCallback(() => {
    return fetchSummary(true);
  }, [fetchSummary]);

  return { summary, isLoading, error, refetch };
}

/**
 * Hook for fetching Stock Purchases timeline chart data
 */
export function usePurchaseChart(
  dateRange: PurchaseDateRange = 'today',
  role: UserRole = 'admin',
  customStart?: string,
  customEnd?: string
) {
  const [chartData, setChartData] = useState<PurchaseChartDataPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchChart = useCallback(
    async (forceFresh: boolean = false) => {
      const cacheKey = apiCache.generateKey('purchases:chart', {
        dateRange,
        role,
        customStart,
        customEnd,
      });

      if (!forceFresh) {
        const cached = apiCache.get<any>(cacheKey);
        if (cached.data && cached.data.data) {
          setChartData(cached.data.data);
          if (!cached.isStale) {
            setIsLoading(false);
            return;
          }
        }
      }

      setIsLoading(true);
      setError(null);

      try {
        const res = await purchaseService.getPurchaseChartData(
          dateRange,
          role,
          customStart,
          customEnd
        );
        setChartData(res.data);
        setError(null);
      } catch (err: any) {
        setError(err.message || 'Unable to load purchase chart data.');
      } finally {
        setIsLoading(false);
      }
    },
    [dateRange, role, customStart, customEnd]
  );

  useEffect(() => {
    fetchChart();
  }, [fetchChart]);

  const refetch = useCallback(() => {
    return fetchChart(true);
  }, [fetchChart]);

  return { chartData, isLoading, error, refetch };
}

/**
 * Hook for fetching single stock purchase details
 */
export function usePurchaseDetails(purchaseId: string | null, role: UserRole = 'admin') {
  const [purchase, setPurchase] = useState<StockPurchase | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPurchase = useCallback(async () => {
    if (!purchaseId) {
      setPurchase(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await purchaseService.getPurchaseById(purchaseId, role);
      setPurchase(res.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load stock purchase details.');
    } finally {
      setIsLoading(false);
    }
  }, [purchaseId, role]);

  useEffect(() => {
    fetchPurchase();
  }, [fetchPurchase]);

  return { purchase, isLoading, error, refetch: fetchPurchase };
}

/**
 * Hook for stock purchase mutations with submission lock (double-click protection)
 */
export function usePurchaseMutations(role: UserRole = 'admin') {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createPurchase = async (input: CreatePurchaseInput): Promise<StockPurchase> => {
    if (isSubmitting) {
      throw new Error('A purchase transaction is already being processed. Please wait.');
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await purchaseService.createPurchase(input, role);
      return res.data;
    } catch (err: any) {
      const msg = err.message || 'Failed to record stock purchase.';
      setError(msg);
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  const cancelPurchase = async (id: string): Promise<StockPurchase> => {
    if (isSubmitting) {
      throw new Error('An operation is already in progress. Please wait.');
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await purchaseService.cancelPurchase(id, role);
      return res.data;
    } catch (err: any) {
      const msg = err.message || 'Failed to cancel stock purchase.';
      setError(msg);
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  const clearError = () => setError(null);

  return {
    createPurchase,
    cancelPurchase,
    isSubmitting,
    error,
    clearError,
  };
}
