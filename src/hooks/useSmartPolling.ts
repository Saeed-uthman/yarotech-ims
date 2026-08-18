import { useEffect, useRef } from 'react';
import { useNetworkStatus } from './useNetworkStatus';

interface SmartPollingOptions {
  enabled: boolean;
  intervalMs?: number; // Conservative interval e.g. 45-60s
  onPoll: () => void | Promise<void>;
}

export function useSmartPolling({
  enabled,
  intervalMs = 45000,
  onPoll,
}: SmartPollingOptions) {
  const { isOnline } = useNetworkStatus();
  const savedCallback = useRef(onPoll);

  useEffect(() => {
    savedCallback.current = onPoll;
  }, [onPoll]);

  useEffect(() => {
    if (!enabled || !isOnline) return;

    let timerId: NodeJS.Timeout | null = null;

    const executePoll = () => {
      // Visibility awareness: only poll when active tab is visible
      if (typeof document !== 'undefined' && document.hidden) {
        return;
      }
      savedCallback.current();
    };

    timerId = setInterval(executePoll, intervalMs);

    // Visibility change listener: immediately revalidate when tab becomes visible
    const handleVisibilityChange = () => {
      if (!document.hidden && isOnline) {
        savedCallback.current();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (timerId) clearInterval(timerId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [enabled, intervalMs, isOnline]);
}
