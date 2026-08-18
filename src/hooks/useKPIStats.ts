import { useState, useEffect, useCallback } from 'react';
import { ProductKPIStats, UserRole } from '../types';
import { productService } from '../services';

const INITIAL_STATS: ProductKPIStats = {
  totalProducts: 0,
  activeProductsCount: 0,
  totalCompanies: 0,
  totalVariants: 0,
  totalStockUnits: 0,
  totalInventoryValueSelling: 0,
  totalInventoryValueCost: 0,
};

export function useKPIStats(role: UserRole = 'admin') {
  const [stats, setStats] = useState<ProductKPIStats>(INITIAL_STATS);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchStats = useCallback(async () => {
    try {
      const res = await productService.getKPIStats(role);
      setStats(res.data);
    } catch (err) {
      console.error('Failed to fetch KPI stats', err);
    } finally {
      setIsLoading(false);
    }
  }, [role]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return { stats, isLoading, refetch: fetchStats };
}
