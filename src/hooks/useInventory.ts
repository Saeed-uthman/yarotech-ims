import { useState, useEffect, useRef, useCallback } from 'react';
import {
  InventoryItem,
  InventorySummaryKPIs,
  InventoryFilterParams,
  InventoryInsightsData,
  InsightsTimeframe,
  InventoryMovement,
  StockAdjustmentInput,
  UserRole,
  ApiMeta,
} from '../types';
import { inventoryService, apiCache } from '../services';

export interface UseInventoryResult {
  inventoryItems: InventoryItem[];
  total: number;
  currentPage: number;
  totalPages: number;
  isLoading: boolean;
  isSearching: boolean;
  isStale: boolean;
  error: string | null;
  refetch: (forceFresh?: boolean) => Promise<void>;
}

export function useInventory(
  filters: InventoryFilterParams,
  role: UserRole = 'admin'
): UseInventoryResult {
  const [items, setItems] = useState<InventoryItem[]>([]);
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
  const latestRequestSeq = useRef<number>(0);

  // Debounce search query (350ms)
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

  const fetchInventoryData = useCallback(
    async (forceFresh: boolean = false) => {
      const requestId = ++latestRequestSeq.current;
      const activeFilters: InventoryFilterParams = {
        ...filters,
        search: debouncedSearch,
      };

      const cacheKey = apiCache.generateKey('inventory:list', {
        search: activeFilters.search,
        category: activeFilters.category,
        company: activeFilters.company,
        stockStatus: activeFilters.stockStatus,
        sortBy: activeFilters.sortBy,
        sortOrder: activeFilters.sortOrder,
        page: activeFilters.page,
        limit: activeFilters.limit,
        role,
      });

      if (forceFresh) {
        apiCache.invalidate(cacheKey);
      } else {
        const cached = apiCache.get<any>(cacheKey);
        if (cached && cached.data) {
          setItems(cached.data.data);
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
        const response = await inventoryService.getInventory(activeFilters, role);

        if (requestId === latestRequestSeq.current) {
          setItems(response.data);
          if (response.meta) {
            setMeta(response.meta);
          }
          setIsLoading(false);
          setIsStale(false);
        }
      } catch (err: any) {
        if (requestId === latestRequestSeq.current) {
          setError(err.message || 'Unable to load inventory data.');
          setIsLoading(false);
        }
      }
    },
    [
      filters.page,
      filters.limit,
      filters.category,
      filters.company,
      filters.stockStatus,
      filters.sortBy,
      filters.sortOrder,
      debouncedSearch,
      role,
    ]
  );

  useEffect(() => {
    fetchInventoryData();
  }, [fetchInventoryData]);

  // Smart Polling (45s interval, pauses when tab is hidden, revalidates when visible)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchInventoryData(false);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    const intervalId = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchInventoryData(false);
      }
    }, 45000);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(intervalId);
    };
  }, [fetchInventoryData]);

  const refetch = useCallback(
    async (forceFresh: boolean = true) => {
      await fetchInventoryData(forceFresh);
    },
    [fetchInventoryData]
  );

  return {
    inventoryItems: items,
    total: meta.total,
    currentPage: meta.currentPage,
    totalPages: meta.lastPage,
    isLoading,
    isSearching,
    isStale,
    error,
    refetch,
  };
}

export function useInventoryKPIs(role: UserRole = 'admin') {
  const [kpis, setKpis] = useState<InventorySummaryKPIs | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchKPIs = useCallback(
    async (forceFresh: boolean = false) => {
      const cacheKey = apiCache.generateKey('inventory:kpis', { role });
      if (forceFresh) {
        apiCache.invalidate(cacheKey);
      } else {
        const cached = apiCache.get<any>(cacheKey);
        if (cached && cached.data) {
          setKpis(cached.data.data);
          if (!cached.isStale) {
            setIsLoading(false);
            return;
          }
        }
      }

      setIsLoading(true);
      try {
        const res = await inventoryService.getInventoryKPIs(role);
        setKpis(res.data);
        setIsLoading(false);
        setError(null);
      } catch (err: any) {
        setError(err.message || 'Failed to calculate inventory metrics.');
        setIsLoading(false);
      }
    },
    [role]
  );

  useEffect(() => {
    fetchKPIs();
  }, [fetchKPIs]);

  // Smart Polling for KPIs
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
    refetch: () => fetchKPIs(true),
  };
}

export function useInventoryInsights(
  timeframe: InsightsTimeframe = 'this_month',
  role: UserRole = 'admin'
) {
  const [insights, setInsights] = useState<InventoryInsightsData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInsights = useCallback(
    async (forceFresh: boolean = false) => {
      const cacheKey = apiCache.generateKey('inventory:insights', { timeframe, role });
      if (forceFresh) {
        apiCache.invalidate(cacheKey);
      } else {
        const cached = apiCache.get<any>(cacheKey);
        if (cached && cached.data) {
          setInsights(cached.data.data);
          if (!cached.isStale) {
            setIsLoading(false);
            return;
          }
        }
      }

      setIsLoading(true);
      try {
        const res = await inventoryService.getInventoryInsights(timeframe, role);
        setInsights(res.data);
        setIsLoading(false);
        setError(null);
      } catch (err: any) {
        setError(err.message || 'Failed to compile inventory insights.');
        setIsLoading(false);
      }
    },
    [timeframe, role]
  );

  useEffect(() => {
    fetchInsights();
  }, [fetchInsights]);

  return {
    insights,
    isLoading,
    error,
    refetch: () => fetchInsights(true),
  };
}

export function useInventoryMovements(params?: {
  productVariantId?: string;
  productId?: string;
  type?: string;
  search?: string;
  limit?: number;
}) {
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMovements = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await inventoryService.getInventoryMovements(params);
      setMovements(res.data);
      setIsLoading(false);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch inventory movements.');
      setIsLoading(false);
    }
  }, [params?.productVariantId, params?.productId, params?.type, params?.search, params?.limit]);

  useEffect(() => {
    fetchMovements();
  }, [fetchMovements]);

  return {
    movements,
    isLoading,
    error,
    refetch: fetchMovements,
  };
}

export function useStockAdjustment() {
  const [isAdjusting, setIsAdjusting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const adjustStock = async (
    input: StockAdjustmentInput,
    role: UserRole = 'admin'
  ): Promise<InventoryItem> => {
    setIsAdjusting(true);
    setError(null);
    try {
      const response = await inventoryService.adjustStock(input, role);
      setIsAdjusting(false);
      return response.data;
    } catch (err: any) {
      setIsAdjusting(false);
      setError(err.message || 'Failed to record stock adjustment.');
      throw err;
    }
  };

  return {
    isAdjusting,
    error,
    adjustStock,
  };
}
