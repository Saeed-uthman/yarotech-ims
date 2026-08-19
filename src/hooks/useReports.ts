import { useState, useEffect, useCallback, useRef } from 'react';
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
} from '../types';
import { reportService } from '../services/reportService';
import { apiCache } from '../services/apiCache';

/**
 * 1. Hook for Financial Summary Report
 */
export function useFinancialSummaryReport(
  filters: ReportFilterParams,
  role: UserRole = 'admin'
) {
  const [data, setData] = useState<FinancialSummaryReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isStale, setIsStale] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef<number>(0);

  const fetchSummary = useCallback(
    async (forceFresh: boolean = false) => {
      const thisRequestId = ++requestIdRef.current;
      const cacheKey = apiCache.generateKey('reports:financial-summary', { ...filters, role });

      if (!forceFresh) {
        const cached = apiCache.get<any>(cacheKey);
        if (cached && cached.data) {
          setData(cached.data);
          setIsLoading(false);
          setIsStale(false);
          return;
        }
      }

      setIsLoading(true);
      setError(null);

      try {
        const res = await reportService.getFinancialSummaryReport(filters, role);
        if (thisRequestId === requestIdRef.current) {
          if (res.success && res.data) {
            setData(res.data);
          } else {
            setError(res.message || 'Failed to fetch financial summary.');
          }
        }
      } catch (err: any) {
        if (thisRequestId === requestIdRef.current) {
          setError(err.message || 'An unexpected error occurred while fetching financial summary.');
        }
      } finally {
        if (thisRequestId === requestIdRef.current) {
          setIsLoading(false);
          setIsStale(false);
        }
      }
    },
    [filters.dateRange, filters.startDate, filters.endDate, filters.productId, filters.companyId, filters.categoryId, filters.paymentMethod, role]
  );

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  return {
    data,
    isLoading,
    isStale,
    error,
    refetch: () => fetchSummary(true),
  };
}

/**
 * 2. Hook for Sales Report
 */
export function useSalesReport(
  filters: ReportFilterParams,
  role: UserRole = 'admin'
) {
  const [data, setData] = useState<SalesReportData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef<number>(0);

  const fetchReport = useCallback(
    async (forceFresh: boolean = false) => {
      const thisRequestId = ++requestIdRef.current;
      const cacheKey = apiCache.generateKey('reports:sales', { ...filters, role });

      if (!forceFresh) {
        const cached = apiCache.get<any>(cacheKey);
        if (cached && cached.data) {
          setData(cached.data);
          setIsLoading(false);
          return;
        }
      }

      setIsLoading(true);
      setError(null);

      try {
        const res = await reportService.getSalesReport(filters, role);
        if (thisRequestId === requestIdRef.current) {
          if (res.success && res.data) {
            setData(res.data);
          } else {
            setError(res.message || 'Failed to fetch sales report.');
          }
        }
      } catch (err: any) {
        if (thisRequestId === requestIdRef.current) {
          setError(err.message || 'Failed to generate sales report.');
        }
      } finally {
        if (thisRequestId === requestIdRef.current) {
          setIsLoading(false);
        }
      }
    },
    [filters.dateRange, filters.startDate, filters.endDate, filters.productId, filters.companyId, filters.categoryId, filters.paymentMethod, role]
  );

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  return {
    data,
    isLoading,
    error,
    refetch: () => fetchReport(true),
  };
}

/**
 * 3. Hook for Profit Report (Admin only)
 */
export function useProfitReport(
  filters: ReportFilterParams,
  role: UserRole = 'admin'
) {
  const [data, setData] = useState<ProfitReportData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef<number>(0);

  const fetchReport = useCallback(
    async (forceFresh: boolean = false) => {
      const thisRequestId = ++requestIdRef.current;
      const cacheKey = apiCache.generateKey('reports:profit', { ...filters, role });

      if (!forceFresh) {
        const cached = apiCache.get<any>(cacheKey);
        if (cached && cached.data) {
          setData(cached.data);
          setIsLoading(false);
          return;
        }
      }

      setIsLoading(true);
      setError(null);

      try {
        const res = await reportService.getProfitReport(filters, role);
        if (thisRequestId === requestIdRef.current) {
          if (res.success && res.data) {
            setData(res.data);
          } else {
            setError(res.message || 'Failed to fetch profit report.');
          }
        }
      } catch (err: any) {
        if (thisRequestId === requestIdRef.current) {
          setError(err.message || 'Failed to generate profit report.');
        }
      } finally {
        if (thisRequestId === requestIdRef.current) {
          setIsLoading(false);
        }
      }
    },
    [filters.dateRange, filters.startDate, filters.endDate, filters.productId, filters.companyId, filters.categoryId, filters.paymentMethod, role]
  );

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  return {
    data,
    isLoading,
    error,
    refetch: () => fetchReport(true),
  };
}

/**
 * 4. Hook for Stock Purchase Report
 */
export function useStockPurchaseReport(
  filters: ReportFilterParams,
  role: UserRole = 'admin'
) {
  const [data, setData] = useState<StockPurchaseReportData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef<number>(0);

  const fetchReport = useCallback(
    async (forceFresh: boolean = false) => {
      const thisRequestId = ++requestIdRef.current;
      const cacheKey = apiCache.generateKey('reports:purchases', { ...filters, role });

      if (!forceFresh) {
        const cached = apiCache.get<any>(cacheKey);
        if (cached && cached.data) {
          setData(cached.data);
          setIsLoading(false);
          return;
        }
      }

      setIsLoading(true);
      setError(null);

      try {
        const res = await reportService.getStockPurchaseReport(filters, role);
        if (thisRequestId === requestIdRef.current) {
          if (res.success && res.data) {
            setData(res.data);
          } else {
            setError(res.message || 'Failed to fetch stock purchase report.');
          }
        }
      } catch (err: any) {
        if (thisRequestId === requestIdRef.current) {
          setError(err.message || 'Failed to generate stock purchase report.');
        }
      } finally {
        if (thisRequestId === requestIdRef.current) {
          setIsLoading(false);
        }
      }
    },
    [filters.dateRange, filters.startDate, filters.endDate, filters.companyId, filters.productId, role]
  );

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  return {
    data,
    isLoading,
    error,
    refetch: () => fetchReport(true),
  };
}

/**
 * 5. Hook for Financial Movement Report
 */
export function useFinancialMovementReport(
  filters: ReportFilterParams,
  role: UserRole = 'admin'
) {
  const [data, setData] = useState<FinancialMovementReportData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef<number>(0);

  const fetchReport = useCallback(
    async (forceFresh: boolean = false) => {
      const thisRequestId = ++requestIdRef.current;
      const cacheKey = apiCache.generateKey('reports:financial-movement', { ...filters, role });

      if (!forceFresh) {
        const cached = apiCache.get<any>(cacheKey);
        if (cached && cached.data) {
          setData(cached.data);
          setIsLoading(false);
          return;
        }
      }

      setIsLoading(true);
      setError(null);

      try {
        const res = await reportService.getFinancialMovementReport(filters, role);
        if (thisRequestId === requestIdRef.current) {
          if (res.success && res.data) {
            setData(res.data);
          } else {
            setError(res.message || 'Failed to fetch financial movement report.');
          }
        }
      } catch (err: any) {
        if (thisRequestId === requestIdRef.current) {
          setError(err.message || 'Failed to generate financial movement report.');
        }
      } finally {
        if (thisRequestId === requestIdRef.current) {
          setIsLoading(false);
        }
      }
    },
    [filters.dateRange, filters.startDate, filters.endDate, role]
  );

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  return {
    data,
    isLoading,
    error,
    refetch: () => fetchReport(true),
  };
}

/**
 * 6. Hook for Product Performance Report
 */
export function useProductPerformanceReport(
  filters: ReportFilterParams,
  role: UserRole = 'admin'
) {
  const [data, setData] = useState<ProductPerformanceReportData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef<number>(0);

  const fetchReport = useCallback(
    async (forceFresh: boolean = false) => {
      const thisRequestId = ++requestIdRef.current;
      const cacheKey = apiCache.generateKey('reports:product-performance', { ...filters, role });

      if (!forceFresh) {
        const cached = apiCache.get<any>(cacheKey);
        if (cached && cached.data) {
          setData(cached.data);
          setIsLoading(false);
          return;
        }
      }

      setIsLoading(true);
      setError(null);

      try {
        const res = await reportService.getProductPerformanceReport(filters, role);
        if (thisRequestId === requestIdRef.current) {
          if (res.success && res.data) {
            setData(res.data);
          } else {
            setError(res.message || 'Failed to fetch product performance report.');
          }
        }
      } catch (err: any) {
        if (thisRequestId === requestIdRef.current) {
          setError(err.message || 'Failed to generate product performance report.');
        }
      } finally {
        if (thisRequestId === requestIdRef.current) {
          setIsLoading(false);
        }
      }
    },
    [filters.dateRange, filters.startDate, filters.endDate, filters.categoryId, filters.companyId, filters.productId, role]
  );

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  return {
    data,
    isLoading,
    error,
    refetch: () => fetchReport(true),
  };
}

/**
 * 7. Hook for Inventory Movement Report
 */
export function useInventoryMovementReport(
  filters: ReportFilterParams,
  role: UserRole = 'admin'
) {
  const [data, setData] = useState<InventoryMovementReportData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef<number>(0);

  const fetchReport = useCallback(
    async (forceFresh: boolean = false) => {
      const thisRequestId = ++requestIdRef.current;
      const cacheKey = apiCache.generateKey('reports:inventory-movement', { ...filters, role });

      if (!forceFresh) {
        const cached = apiCache.get<any>(cacheKey);
        if (cached && cached.data) {
          setData(cached.data);
          setIsLoading(false);
          return;
        }
      }

      setIsLoading(true);
      setError(null);

      try {
        const res = await reportService.getInventoryMovementReport(filters, role);
        if (thisRequestId === requestIdRef.current) {
          if (res.success && res.data) {
            setData(res.data);
          } else {
            setError(res.message || 'Failed to fetch inventory movement report.');
          }
        }
      } catch (err: any) {
        if (thisRequestId === requestIdRef.current) {
          setError(err.message || 'Failed to generate inventory movement report.');
        }
      } finally {
        if (thisRequestId === requestIdRef.current) {
          setIsLoading(false);
        }
      }
    },
    [filters.dateRange, filters.startDate, filters.endDate, filters.categoryId, filters.companyId, filters.productId, role]
  );

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  return {
    data,
    isLoading,
    error,
    refetch: () => fetchReport(true),
  };
}

/**
 * 8. Hook for Customer Debt Movement Report
 */
export function useCustomerDebtReport(
  filters: ReportFilterParams,
  role: UserRole = 'admin'
) {
  const [data, setData] = useState<DebtMovementReportData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef<number>(0);

  const fetchReport = useCallback(
    async (forceFresh: boolean = false) => {
      const thisRequestId = ++requestIdRef.current;
      const cacheKey = apiCache.generateKey('reports:debt', { ...filters, role });

      if (!forceFresh) {
        const cached = apiCache.get<any>(cacheKey);
        if (cached && cached.data) {
          setData(cached.data);
          setIsLoading(false);
          return;
        }
      }

      setIsLoading(true);
      setError(null);

      try {
        const res = await reportService.getCustomerDebtReport(filters, role);
        if (thisRequestId === requestIdRef.current) {
          if (res.success && res.data) {
            setData(res.data);
          } else {
            setError(res.message || 'Failed to fetch customer debt report.');
          }
        }
      } catch (err: any) {
        if (thisRequestId === requestIdRef.current) {
          setError(err.message || 'Failed to generate customer debt report.');
        }
      } finally {
        if (thisRequestId === requestIdRef.current) {
          setIsLoading(false);
        }
      }
    },
    [filters.dateRange, filters.startDate, filters.endDate, role]
  );

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  return {
    data,
    isLoading,
    error,
    refetch: () => fetchReport(true),
  };
}
