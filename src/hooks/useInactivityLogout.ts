import { useEffect } from 'react';
import { SessionTimeout } from '../types';

const LAST_ACTIVITY_STORAGE_KEY = 'stitch_pharmacy_last_activity_at';
const IDLE_LOGOUT_STORAGE_KEY = 'stitch_pharmacy_idle_logout_at';
const ACTIVITY_THROTTLE_MS = 1_000;

const TIMEOUT_MILLISECONDS: Record<Exclude<SessionTimeout, 'never'>, number> = {
  '15m': 15 * 60 * 1_000,
  '30m': 30 * 60 * 1_000,
  '60m': 60 * 60 * 1_000,
};

interface UseInactivityLogoutOptions {
  enabled: boolean;
  timeout: SessionTimeout;
  onTimeout: () => void;
}

function readStoredActivity(): number | null {
  const storedValue = Number(localStorage.getItem(LAST_ACTIVITY_STORAGE_KEY));
  return Number.isFinite(storedValue) && storedValue > 0 ? storedValue : null;
}

/**
 * Ends an authenticated browser session after the configured period without
 * human activity. Activity and idle logout are shared across same-origin tabs.
 */
export function useInactivityLogout({
  enabled,
  timeout,
  onTimeout,
}: UseInactivityLogoutOptions): void {
  useEffect(() => {
    if (!enabled || timeout === 'never') return;

    const timeoutMs = TIMEOUT_MILLISECONDS[timeout];
    let timerId: number | undefined;
    let lastActivityAt = Date.now();
    let lastHandledActivityAt = 0;
    let hasTimedOut = false;

    const clearTimer = () => {
      if (timerId !== undefined) {
        window.clearTimeout(timerId);
        timerId = undefined;
      }
    };

    const endSession = (broadcast: boolean) => {
      if (hasTimedOut) return;
      hasTimedOut = true;
      clearTimer();

      if (broadcast) {
        localStorage.setItem(IDLE_LOGOUT_STORAGE_KEY, String(Date.now()));
      }

      onTimeout();
    };

    const scheduleTimeout = () => {
      clearTimer();
      const remainingMs = timeoutMs - (Date.now() - lastActivityAt);

      if (remainingMs <= 0) {
        const sharedActivityAt = readStoredActivity();
        if (sharedActivityAt && sharedActivityAt > lastActivityAt) {
          lastActivityAt = sharedActivityAt;
          scheduleTimeout();
          return;
        }
        endSession(true);
        return;
      }

      timerId = window.setTimeout(scheduleTimeout, remainingMs + 50);
    };

    const recordActivity = () => {
      if (hasTimedOut) return;

      const now = Date.now();
      if (now - lastHandledActivityAt < ACTIVITY_THROTTLE_MS) return;

      lastHandledActivityAt = now;
      lastActivityAt = now;
      localStorage.setItem(LAST_ACTIVITY_STORAGE_KEY, String(now));
      scheduleTimeout();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') recordActivity();
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key === LAST_ACTIVITY_STORAGE_KEY && event.newValue) {
        const sharedActivityAt = Number(event.newValue);
        if (Number.isFinite(sharedActivityAt) && sharedActivityAt > lastActivityAt) {
          lastActivityAt = sharedActivityAt;
          scheduleTimeout();
        }
      }

      if (event.key === IDLE_LOGOUT_STORAGE_KEY && event.newValue) {
        endSession(false);
      }
    };

    const activityEvents: (keyof WindowEventMap)[] = [
      'pointerdown',
      'pointermove',
      'keydown',
      'wheel',
      'touchstart',
      'scroll',
      'focus',
    ];

    // Starting or restoring an authenticated screen is itself user activity.
    localStorage.setItem(LAST_ACTIVITY_STORAGE_KEY, String(lastActivityAt));
    scheduleTimeout();

    activityEvents.forEach((eventName) => {
      window.addEventListener(eventName, recordActivity, { passive: true });
    });
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('storage', handleStorage);

    return () => {
      clearTimer();
      activityEvents.forEach((eventName) => {
        window.removeEventListener(eventName, recordActivity);
      });
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('storage', handleStorage);
    };
  }, [enabled, onTimeout, timeout]);
}
