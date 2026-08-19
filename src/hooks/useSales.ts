import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Sale,
  SalesFilterParams,
  SalesSummaryKPIs,
  SalesChartDataPoint,
  CreateSaleInput,
  SalesDateRange,
  UserRole,
} from '../types';
import { salesService } from '../services/salesService';
import { apiCache } from '../services/apiCache';

/**
 * Main hook for fetching paginated & filtered sales history
 */
export function useSales(filters: SalesFilterParams, role: UserRole = 'admin') {
  const [sales, setSales] = useState<Sale[]>([]);
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

  const fetchSalesData = useCallback(
    async (forceFresh: boolean = false) => {
      const thisRequestId = ++requestIdRef.current;
      const effectiveFilters: SalesFilterParams = {
        ...filters,
        search: debouncedSearch,
      };

      const cacheKey = apiCache.generateKey('sales:list', {
        ...effectiveFilters,
        role,
      });

      // 1. SWR check
      if (!forceFresh) {
        const cached = apiCache.get<any>(cacheKey);
        if (cached.data && cached.data.data) {
          setSales(cached.data.data);
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
        const res = await salesService.getSales(effectiveFilters, role);

        if (thisRequestId === requestIdRef.current) {
          setSales(res.data);
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
          setError(err.message || 'Unable to load sales history.');
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
      filters.paymentStatus,
      filters.customerType,
      filters.sortBy,
      filters.sortOrder,
      filters.page,
      filters.limit,
      debouncedSearch,
      role,
    ]
  );

  useEffect(() => {
    fetchSalesData();
  }, [fetchSalesData]);

  const refetch = useCallback(() => {
    return fetchSalesData(true);
  }, [fetchSalesData]);

  return {
    sales,
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
 * Hook for fetching Sales Summary KPIs
 */
export function useSalesSummary(
  filters: Partial<SalesFilterParams>,
  role: UserRole = 'admin'
) {
  const [summary, setSummary] = useState<SalesSummaryKPIs | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSummary = useCallback(
    async (forceFresh: boolean = false) => {
      const cacheKey = apiCache.generateKey('sales:kpis', {
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
        const res = await salesService.getSalesSummaryKPIs(filters, role);
        setSummary(res.data);
        setError(null);
      } catch (err: any) {
        setError(err.message || 'Unable to load sales KPIs.');
      } finally {
        setIsLoading(false);
      }
    },
    [filters.dateRange, filters.startDate, filters.endDate, filters.paymentStatus, filters.customerType, filters.search, role]
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
 * Hook for fetching Sales Chart timeline data
 */
export function useSalesChart(
  dateRange: SalesDateRange = 'today',
  role: UserRole = 'admin',
  customStart?: string,
  customEnd?: string
) {
  const [chartData, setChartData] = useState<SalesChartDataPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchChart = useCallback(
    async (forceFresh: boolean = false) => {
      const cacheKey = apiCache.generateKey('sales:chart', {
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
        const res = await salesService.getSalesChartData(
          dateRange,
          role,
          customStart,
          customEnd
        );
        setChartData(res.data);
        setError(null);
      } catch (err: any) {
        setError(err.message || 'Unable to load sales chart.');
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
 * Hook for fetching single sale details
 */
export function useSaleDetails(saleId: string | null, role: UserRole = 'admin') {
  const [sale, setSale] = useState<Sale | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSale = useCallback(async () => {
    if (!saleId) {
      setSale(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await salesService.getSaleById(saleId, role);
      setSale(res.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load sale details.');
    } finally {
      setIsLoading(false);
    }
  }, [saleId, role]);

  useEffect(() => {
    fetchSale();
  }, [fetchSale]);

  return { sale, isLoading, error, refetch: fetchSale };
}

/**
 * Hook for sales mutations with submission locking (double-click protection)
 */
export function useSalesMutations(role: UserRole = 'admin') {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createSale = async (input: CreateSaleInput): Promise<Sale> => {
    if (isSubmitting) {
      throw new Error('A transaction is already being processed. Please wait.');
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await salesService.createSale(input, role);
      return res.data;
    } catch (err: any) {
      const msg = err.message || 'Failed to complete sale transaction.';
      setError(msg);
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  const clearError = () => setError(null);

  return {
    createSale,
    isSubmitting,
    error,
    clearError,
  };
}
