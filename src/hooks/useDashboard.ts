import { useState, useEffect, useCallback, useRef } from 'react';
import {
  DashboardFilterParams,
  DashboardData,
  UserRole,
} from '../types';
import { dashboardService } from '../services/dashboardService';

export interface UseDashboardOptions {
  autoPoll?: boolean;
  pollIntervalMs?: number;
}

export function useDashboard(
  params: DashboardFilterParams,
  role: UserRole = 'admin',
  options: UseDashboardOptions = {}
) {
  const { autoPoll = true, pollIntervalMs = 45000 } = options;

  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isStale, setIsStale] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const isMountedRef = useRef<boolean>(true);
  const paramsKey = JSON.stringify(params) + `_${role}`;

  const fetchData = useCallback(
    async (isBackground = false) => {
      if (!isBackground) {
        if (!data) {
          setIsLoading(true);
        } else {
          setIsRefreshing(true);
        }
      } else {
        setIsRefreshing(true);
      }

      setError(null);

      try {
        const response = await dashboardService.getDashboardData(params, role);
        if (!isMountedRef.current) return;

        if (response.success && response.data) {
          setData(response.data);
          setLastUpdated(new Date());
          setIsStale(false);
        } else {
          setError(response.message || 'Failed to load executive dashboard data.');
        }
      } catch (err: any) {
        if (!isMountedRef.current) return;
        const msg = err?.message || 'Unable to load dashboard metrics. Check connection.';
        setError(msg);
        setIsStale(true);
      } finally {
        if (isMountedRef.current) {
          setIsLoading(false);
          setIsRefreshing(false);
        }
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [paramsKey, role]
  );

  // Initial & Filter Change fetch
  useEffect(() => {
    isMountedRef.current = true;
    fetchData(false);

    return () => {
      isMountedRef.current = false;
    };
  }, [fetchData]);

  // Smart Polling (30-60s, pauses on hidden tab, resumes on focus)
  useEffect(() => {
    if (!autoPoll) return;

    let timer: NodeJS.Timeout | null = null;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Tab just became visible, revalidate immediately
        fetchData(true);
      }
    };

    const startPolling = () => {
      if (timer) clearInterval(timer);
      timer = setInterval(() => {
        if (document.visibilityState === 'visible') {
          fetchData(true);
        }
      }, pollIntervalMs);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    startPolling();

    return () => {
      if (timer) clearInterval(timer);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [autoPoll, pollIntervalMs, fetchData]);

  const refetch = useCallback(async () => {
    dashboardService.invalidateCache();
    await fetchData(false);
  }, [fetchData]);

  return {
    data,
    isLoading,
    isRefreshing,
    isStale,
    error,
    lastUpdated,
    refetch,
  };
}
