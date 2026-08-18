import { useState, useEffect, useCallback, useRef } from 'react';
import { Customer, CustomerFilterParams, UserRole } from '../types';
import { customerService } from '../services/customerService';
import { apiCache } from '../services/apiCache';

export function useCustomers(
  filters: CustomerFilterParams,
  role: UserRole = 'admin'
) {
  const [customers, setCustomers] = useState<Customer[]>([]);
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

  const fetchCustomerData = useCallback(
    async (forceFresh: boolean = false) => {
      const thisRequestId = ++requestIdRef.current;
      const effectiveFilters: CustomerFilterParams = {
        ...filters,
        search: debouncedSearch,
      };

      const cacheKey = apiCache.generateKey('customers:list', {
        ...effectiveFilters,
        role,
      });

      // 1. Stale-While-Revalidate check
      if (!forceFresh) {
        const cached = apiCache.get<any>(cacheKey);
        if (cached.data && cached.data.data) {
          setCustomers(cached.data.data);
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
        const res = await customerService.getCustomers(effectiveFilters, role);

        // Guard against race conditions
        if (thisRequestId === requestIdRef.current) {
          setCustomers(res.data);
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
          setError(err.message || 'Unable to load customers.');
        }
      } finally {
        if (thisRequestId === requestIdRef.current) {
          setIsLoading(false);
        }
      }
    },
    [
      filters.page,
      filters.limit,
      filters.status,
      filters.debtStatus,
      filters.sortBy,
      filters.sortOrder,
      debouncedSearch,
      role,
    ]
  );

  useEffect(() => {
    fetchCustomerData();
  }, [fetchCustomerData]);

  // Smart Polling (45s interval, pauses when tab is hidden, revalidates when visible)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchCustomerData(false);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    const intervalId = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchCustomerData(false);
      }
    }, 45000);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(intervalId);
    };
  }, [fetchCustomerData]);

  const refetch = useCallback(
    async (forceFresh: boolean = true) => {
      await fetchCustomerData(forceFresh);
    },
    [fetchCustomerData]
  );

  return {
    customers,
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

export function useCustomerProfile(customerId: string | null, role: UserRole = 'admin') {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [sales, setSales] = useState<any[]>([]);
  const [debtPayments, setDebtPayments] = useState<any[]>([]);
  const [isCustomerLoading, setIsCustomerLoading] = useState(true);
  const [isSalesLoading, setIsSalesLoading] = useState(true);
  const [isDebtLoading, setIsDebtLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    if (!customerId) {
      setCustomer(null);
      setSales([]);
      setDebtPayments([]);
      setIsCustomerLoading(false);
      setIsSalesLoading(false);
      setIsDebtLoading(false);
      return;
    }

    setIsCustomerLoading(true);
    setIsSalesLoading(true);
    setIsDebtLoading(true);
    setError(null);

    // 1. Fetch header customer info first
    try {
      const res = await customerService.getCustomerById(customerId);
      setCustomer(res.data);
      setIsCustomerLoading(false);
    } catch (err: any) {
      setError(err.message || 'Unable to load customer information.');
      setIsCustomerLoading(false);
    }

    // 2. Fetch sales history progressively
    try {
      const salesRes = await customerService.getCustomerSales(customerId, 1, 20);
      setSales(salesRes.data);
    } catch {
      // Keep empty if fails
    } finally {
      setIsSalesLoading(false);
    }

    // 3. Fetch debt payments progressively
    try {
      const debtRes = await customerService.getCustomerDebtPayments(customerId);
      setDebtPayments(debtRes.data);
    } catch {
      // Keep empty if fails
    } finally {
      setIsDebtLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  return {
    customer,
    sales,
    debtPayments,
    isCustomerLoading,
    isSalesLoading,
    isDebtLoading,
    error,
    refetch: fetchProfile,
  };
}

export function useCustomerKPIs() {
  const [kpis, setKpis] = useState({
    totalCustomers: 0,
    activeCustomers: 0,
    inactiveCustomers: 0,
    customersWithDebt: 0,
    totalOutstandingDebt: 0,
    totalCustomerPurchases: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchKPIs = useCallback(async (forceFresh: boolean = false) => {
    const key = apiCache.generateKey('customers:kpis');

    if (!forceFresh) {
      const cached = apiCache.get<any>(key);
      if (cached.data && cached.data.data) {
        setKpis(cached.data.data);
        if (!cached.isStale) {
          setIsLoading(false);
          return;
        }
      }
    }

    setIsLoading(true);
    try {
      const res = await customerService.getCustomerKPIs();
      setKpis(res.data);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Unable to calculate customer metrics.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchKPIs();
  }, [fetchKPIs]);

  // Smart Polling
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchKPIs(false);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    const intervalId = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchKPIs(false);
      }
    }, 45000);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(intervalId);
    };
  }, [fetchKPIs]);

  return {
    kpis,
    isLoading,
    error,
    refetch: fetchKPIs,
  };
}

export function useCustomerMutations() {
  const [isMutating, setIsMutating] = useState(false);
  const [mutationError, setMutationError] = useState<string | null>(null);

  const createCustomer = async (input: any) => {
    setIsMutating(true);
    setMutationError(null);
    try {
      const res = await customerService.createCustomer(input);
      return res.data;
    } catch (err: any) {
      setMutationError(err.message);
      throw err;
    } finally {
      setIsMutating(false);
    }
  };

  const updateCustomer = async (id: string, input: any) => {
    setIsMutating(true);
    setMutationError(null);
    try {
      const res = await customerService.updateCustomer(id, input);
      return res.data;
    } catch (err: any) {
      setMutationError(err.message);
      throw err;
    } finally {
      setIsMutating(false);
    }
  };

  const deactivateCustomer = async (id: string) => {
    setIsMutating(true);
    setMutationError(null);
    try {
      const res = await customerService.deactivateCustomer(id);
      return res.data;
    } catch (err: any) {
      setMutationError(err.message);
      throw err;
    } finally {
      setIsMutating(false);
    }
  };

  const activateCustomer = async (id: string) => {
    setIsMutating(true);
    setMutationError(null);
    try {
      const res = await customerService.activateCustomer(id);
      return res.data;
    } catch (err: any) {
      setMutationError(err.message);
      throw err;
    } finally {
      setIsMutating(false);
    }
  };

  const recordDebtPayment = async (input: any, role: UserRole = 'admin') => {
    setIsMutating(true);
    setMutationError(null);
    try {
      const res = await customerService.recordDebtPayment(input, role);
      return res.data;
    } catch (err: any) {
      setMutationError(err.message);
      throw err;
    } finally {
      setIsMutating(false);
    }
  };

  return {
    isMutating,
    mutationError,
    createCustomer,
    updateCustomer,
    deactivateCustomer,
    activateCustomer,
    recordDebtPayment,
  };
}
