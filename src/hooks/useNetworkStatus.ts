import { useEffect, useState } from 'react';
import { API_BASE_URL } from '../services/apiClient';

const HEALTH_CHECK_INTERVAL_MS = 30_000;
const HEALTH_CHECK_TIMEOUT_MS = 5_000;

export function useNetworkStatus() {
  const initialBrowserStatus = typeof navigator === 'undefined' ? true : navigator.onLine;
  const [browserOnline, setBrowserOnline] = useState(initialBrowserStatus);
  const [apiReachable, setApiReachable] = useState(false);

  useEffect(() => {
    let disposed = false;
    let inFlight: AbortController | null = null;
    const apiUrl = new URL(API_BASE_URL, window.location.origin);
    const healthUrl = new URL('/health/', apiUrl.origin).toString();

    const checkApiHealth = async () => {
      const hasBrowserNetwork = navigator.onLine;
      if (!disposed) setBrowserOnline(hasBrowserNetwork);

      if (!hasBrowserNetwork) {
        inFlight?.abort();
        if (!disposed) setApiReachable(false);
        return;
      }

      inFlight?.abort();
      const controller = new AbortController();
      inFlight = controller;
      const timeoutId = window.setTimeout(() => controller.abort(), HEALTH_CHECK_TIMEOUT_MS);

      try {
        const response = await fetch(healthUrl, {
          method: 'GET',
          cache: 'no-store',
          signal: controller.signal,
        });
        if (!disposed && inFlight === controller) setApiReachable(response.ok);
      } catch {
        if (!disposed && inFlight === controller) setApiReachable(false);
      } finally {
        window.clearTimeout(timeoutId);
        if (inFlight === controller) inFlight = null;
      }
    };

    const handleOnline = () => void checkApiHealth();
    const handleOffline = () => {
      inFlight?.abort();
      setBrowserOnline(false);
      setApiReachable(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    void checkApiHealth();
    const intervalId = window.setInterval(() => void checkApiHealth(), HEALTH_CHECK_INTERVAL_MS);

    return () => {
      disposed = true;
      inFlight?.abort();
      window.clearInterval(intervalId);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return {
    isOnline: browserOnline && apiReachable,
    browserOnline,
    apiReachable,
  };
}
