import { useState, useEffect, useRef, useCallback } from 'react';
import { Product, ProductFilterParams, UserRole, ApiMeta } from '../types';
import { productService, apiCache } from '../services';

export interface UseProductsResult {
  products: Product[];
  total: number;
  currentPage: number;
  totalPages: number;
  isLoading: boolean;
  isSearching: boolean;
  isStale: boolean;
  error: string | null;
  refetch: (forceFresh?: boolean) => Promise<void>;
  updateOptimisticStatus: (productId: string, newStatus: 'Active' | 'Inactive') => void;
  rollbackOptimisticStatus: (productId: string, previousStatus: 'Active' | 'Inactive') => void;
}

export function useProducts(
  filters: ProductFilterParams,
  role: UserRole = 'admin',
  enabled = true
): UseProductsResult {
  const [products, setProducts] = useState<Product[]>([]);
  const [meta, setMeta] = useState<ApiMeta>({
    currentPage: filters.page,
    perPage: filters.limit,
    total: 0,
    lastPage: 1,
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [isStale, setIsStale] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Debounced search query holder
  const [debouncedSearch, setDebouncedSearch] = useState<string>(filters.search);

  // Request sequence tracker to prevent obsolete out-of-order responses from overwriting newer data
  const latestRequestSeq = useRef<number>(0);
  const retryCount = useRef<number>(0);

  // 1. Debounce Search Input (350ms)
  useEffect(() => {
    if (filters.search !== debouncedSearch) {
      setIsSearching(true);
      const timer = setTimeout(() => {
        setDebouncedSearch(filters.search);
        setIsSearching(false);
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [filters.search, debouncedSearch]);

  // 2. Fetch Products with Stale-While-Revalidate and Obsolete Response Protection
  const fetchProductsData = useCallback(
    async (forceFresh: boolean = false) => {
      if (!enabled) {
        setIsLoading(false);
        return;
      }
      const requestId = ++latestRequestSeq.current;
      const activeFilters: ProductFilterParams = {
        ...filters,
        search: debouncedSearch,
      };

      const cacheKey = apiCache.generateKey('products:list', {
        search: activeFilters.search,
        category: activeFilters.category,
        status: activeFilters.status,
        company: activeFilters.company,
        stockStatus: activeFilters.stockStatus,
        sortBy: activeFilters.sortBy,
        sortOrder: activeFilters.sortOrder,
        page: activeFilters.page,
        limit: activeFilters.limit,
        role,
      });

      // SWR: Check if cached data exists
      if (!forceFresh) {
        const cached = apiCache.get<any>(cacheKey);
        if (cached.data) {
          setProducts(cached.data.data);
          if (cached.data.meta) setMeta(cached.data.meta);
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
        const response = await productService.getProducts(activeFilters, role);

        // Obsolete response protection: only accept response if this is the newest request
        if (requestId === latestRequestSeq.current) {
          setProducts(response.data);
          if (response.meta) {
            setMeta(response.meta);
          }
          setIsStale(false);
          setError(null);
          retryCount.current = 0;
        }
      } catch (err: any) {
        if (requestId === latestRequestSeq.current) {
          // Controlled retry (max 1 retry attempt)
          if (retryCount.current < 1) {
            retryCount.current += 1;
            setTimeout(() => fetchProductsData(forceFresh), 500);
            return;
          }
          setError(err.message || 'Failed to fetch products');
        }
      } finally {
        if (requestId === latestRequestSeq.current) {
          setIsLoading(false);
        }
      }
    },
    [
      filters.category,
      filters.status,
      filters.company,
      filters.stockStatus,
      filters.sortBy,
      filters.sortOrder,
      filters.page,
      filters.limit,
      debouncedSearch,
      role,
      enabled,
    ]
  );

  useEffect(() => {
    fetchProductsData();
  }, [fetchProductsData]);

  // Optimistic UI state updater
  const updateOptimisticStatus = useCallback(
    (productId: string, newStatus: 'Active' | 'Inactive') => {
      setProducts((prev) =>
        prev.map((p) => (p.id === productId ? { ...p, status: newStatus } : p))
      );
    },
    []
  );

  // Optimistic Rollback helper
  const rollbackOptimisticStatus = useCallback(
    (productId: string, previousStatus: 'Active' | 'Inactive') => {
      setProducts((prev) =>
        prev.map((p) => (p.id === productId ? { ...p, status: previousStatus } : p))
      );
    },
    []
  );

  return {
    products,
    total: meta.total,
    currentPage: meta.currentPage,
    totalPages: meta.lastPage,
    isLoading,
    isSearching,
    isStale,
    error,
    refetch: fetchProductsData,
    updateOptimisticStatus,
    rollbackOptimisticStatus,
  };
}
