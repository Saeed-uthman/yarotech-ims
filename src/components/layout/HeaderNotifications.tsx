import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Bell, ExternalLink, Package, Users, WifiOff, X } from 'lucide-react';
import { UserRole } from '../../types';
import { useAuth } from '../../hooks/useAuth';

interface OperationalAlert {
  id: string;
  type: 'stock' | 'users' | 'connection';
  title: string;
  message: string;
  targetNav?: string;
}

interface HeaderNotificationsProps {
  currentRole: UserRole;
  onNavigate?: (nav: string) => void;
  onOpenLowStockAlerts?: () => void;
  lowStockCount?: number;
  isOnline?: boolean;
}

export const HeaderNotifications: React.FC<HeaderNotificationsProps> = ({
  currentRole,
  onNavigate,
  onOpenLowStockAlerts,
  lowStockCount = 0,
  isOnline = true,
}) => {
  const { pendingCount } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const alerts = useMemo<OperationalAlert[]>(() => {
    const items: OperationalAlert[] = [];

    if (!isOnline) {
      items.push({
        id: 'api-unreachable',
        type: 'connection',
        title: 'Django API unavailable',
        message: 'The health check is not responding. Live data may be unavailable until the connection is restored.',
      });
    }

    if (lowStockCount > 0) {
      items.push({
        id: 'low-stock',
        type: 'stock',
        title: 'Low stock attention required',
        message: `${lowStockCount} ${lowStockCount === 1 ? 'item is' : 'items are'} at or below the reorder threshold.`,
        targetNav: 'inventory',
      });
    }

    if (currentRole === 'admin' && pendingCount > 0) {
      items.push({
        id: 'pending-users',
        type: 'users',
        title: 'Staff approvals waiting',
        message: `${pendingCount} ${pendingCount === 1 ? 'registration requires' : 'registrations require'} administrator review.`,
        targetNav: 'users',
      });
    }

    return items;
  }, [currentRole, isOnline, lowStockCount, pendingCount]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent | TouchEvent) {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(event.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleAlertClick = (alert: OperationalAlert) => {
    if (alert.type === 'stock' && onOpenLowStockAlerts) {
      onOpenLowStockAlerts();
    } else if (alert.targetNav && onNavigate) {
      onNavigate(alert.targetNav);
    }
    setIsOpen(false);
  };

  const renderAlertIcon = (type: OperationalAlert['type']) => {
    if (type === 'connection') {
      return (
        <div className="w-8 h-8 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
          <WifiOff className="w-4 h-4" />
        </div>
      );
    }
    if (type === 'users') {
      return (
        <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
          <Users className="w-4 h-4" />
        </div>
      );
    }
    return (
      <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
        <Package className="w-4 h-4" />
      </div>
    );
  };

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        id="header-notification-btn"
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        aria-label={`Operational alerts, ${alerts.length} active`}
        className={`relative min-w-[40px] min-h-[40px] sm:min-w-[44px] sm:min-h-[44px] flex items-center justify-center rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${
          isOpen
            ? 'bg-blue-50 text-blue-700 dark:bg-slate-800 dark:text-blue-400'
            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-800'
        }`}
        title="Operational alerts"
      >
        <Bell className="w-5 h-5" />
        {alerts.length > 0 && (
          <span
            className="absolute top-2 right-2 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-red-600 rounded-full ring-2 ring-white dark:ring-slate-900"
            aria-hidden="true"
          >
            {alerts.length > 9 ? '9+' : alerts.length}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          ref={popoverRef}
          role="dialog"
          aria-label="Operational alerts panel"
          className="absolute right-0 mt-2 w-80 sm:w-96 max-w-[calc(100vw-1rem)] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        >
          <div className="p-3.5 sm:p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-900/80">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Operational Alerts</h3>
              {alerts.length > 0 && (
                <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300">
                  {alerts.length} active
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              aria-label="Close operational alerts"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="max-h-[340px] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60 overscroll-contain">
            {alerts.length === 0 ? (
              <div className="p-8 text-center text-slate-400 dark:text-slate-500">
                <Bell className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm font-medium">No active alerts</p>
                <p className="text-xs mt-0.5">The API is reachable and no operational thresholds need attention.</p>
              </div>
            ) : (
              alerts.map((alert) => (
                <button
                  key={alert.id}
                  type="button"
                  onClick={() => handleAlertClick(alert)}
                  className="w-full p-3.5 sm:p-4 flex gap-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                >
                  {renderAlertIcon(alert.type)}
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">{alert.title}</h4>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mt-1">{alert.message}</p>
                    {alert.targetNav && (
                      <span className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 dark:text-blue-400">
                        Take action <ExternalLink className="w-3 h-3" />
                      </span>
                    )}
                  </div>
                  {alert.type !== 'users' && alert.type !== 'stock' && (
                    <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 self-center" />
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
