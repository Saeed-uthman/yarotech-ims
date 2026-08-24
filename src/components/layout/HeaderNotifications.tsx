import React, { useState, useEffect, useRef } from 'react';
import { 
  Bell, 
  AlertTriangle, 
  Package, 
  Users, 
  ShieldCheck, 
  CheckCheck, 
  X, 
  ExternalLink,
  Info
} from 'lucide-react';
import { UserRole } from '../../types';

export interface NotificationItem {
  id: string;
  type: 'stock_alert' | 'debt_alert' | 'audit_notice' | 'system';
  title: string;
  message: string;
  time: string;
  read: boolean;
  targetNav?: string;
  severity: 'critical' | 'warning' | 'info';
}

const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'notif-1',
    type: 'stock_alert',
    title: 'Low Stock Alert',
    message: 'Paracetamol 500mg (Emzor) is below reorder level (12 packs remaining).',
    time: '10m ago',
    read: false,
    targetNav: 'inventory',
    severity: 'warning',
  },
  {
    id: 'notif-2',
    type: 'stock_alert',
    title: 'Critical Out of Stock',
    message: 'Amoxicillin 250mg Suspension is out of stock in main dispensary.',
    time: '45m ago',
    read: false,
    targetNav: 'inventory',
    severity: 'critical',
  },
  {
    id: 'notif-3',
    type: 'debt_alert',
    title: 'Customer Debt Follow-up',
    message: 'Grace Okafor has an outstanding balance of ₦14,200 past due.',
    time: '2h ago',
    read: false,
    targetNav: 'customers',
    severity: 'warning',
  },
  {
    id: 'notif-4',
    type: 'audit_notice',
    title: 'Inventory Movement Recorded',
    message: 'Stock purchase #PO-2025-004 verified and merged into warehouse batch.',
    time: '4h ago',
    read: true,
    targetNav: 'stock-purchase',
    severity: 'info',
  },
  {
    id: 'notif-5',
    type: 'system',
    title: 'Daily Shift Ready',
    message: 'System audit feed active. Cash drawer opening balance initialized.',
    time: '6h ago',
    read: true,
    targetNav: 'accountability',
    severity: 'info',
  },
];

interface HeaderNotificationsProps {
  currentRole: UserRole;
  onNavigate?: (nav: string) => void;
  onOpenLowStockAlerts?: () => void;
}

export const HeaderNotifications: React.FC<HeaderNotificationsProps> = ({
  currentRole,
  onNavigate,
  onOpenLowStockAlerts,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>(INITIAL_NOTIFICATIONS);
  const [activeFilter, setActiveFilter] = useState<'all' | 'unread'>('all');
  
  const popoverRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const visibleNotifications = notifications.filter((n) => {
    if (currentRole === 'cashier') {
      if (
        n.targetNav === 'accountability' ||
        n.targetNav === 'stock-purchase' ||
        n.targetNav === 'users' ||
        n.targetNav === 'reports' ||
        n.targetNav === 'settings'
      ) {
        return false;
      }
    }
    return true;
  });

  const unreadCount = visibleNotifications.filter((n) => !n.read).length;
  const stockAlertsCount = visibleNotifications.filter((n) => n.type === 'stock_alert').length;
  const filteredNotifications = visibleNotifications.filter((n) => {
    if (activeFilter === 'unread') return !n.read;
    return true;
  });

  // Handle outside click to close popover
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

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const markItemAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const handleNotificationClick = (item: NotificationItem) => {
    markItemAsRead(item.id);
    if (item.type === 'stock_alert' && onOpenLowStockAlerts) {
      onOpenLowStockAlerts();
      setIsOpen(false);
      return;
    }
    if (item.targetNav && onNavigate) {
      onNavigate(item.targetNav);
      setIsOpen(false);
    }
  };

  const getNotificationIcon = (type: NotificationItem['type'], severity: NotificationItem['severity']) => {
    switch (type) {
      case 'stock_alert':
        return severity === 'critical' ? (
          <div className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-4 h-4" />
          </div>
        ) : (
          <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <Package className="w-4 h-4" />
          </div>
        );
      case 'debt_alert':
        return (
          <div className="w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 flex items-center justify-center shrink-0">
            <Users className="w-4 h-4" />
          </div>
        );
      case 'audit_notice':
        return (
          <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-4 h-4" />
          </div>
        );
      default:
        return (
          <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center shrink-0">
            <Info className="w-4 h-4" />
          </div>
        );
    }
  };

  return (
    <div className="relative">
      {/* Trigger Button with accessible aria attributes & touch target */}
      <button
        ref={triggerRef}
        id="header-notification-btn"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        aria-label={`Notifications, ${unreadCount} unread`}
        className={`relative min-w-[40px] min-h-[40px] sm:min-w-[44px] sm:min-h-[44px] flex items-center justify-center rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${
          isOpen
            ? 'bg-blue-50 text-blue-700 dark:bg-slate-800 dark:text-blue-400'
            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-800'
        }`}
        title="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span 
            className="absolute top-2 right-2 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-red-600 rounded-full ring-2 ring-white dark:ring-slate-900 animate-pulse"
            aria-hidden="true"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notifications Popover Menu */}
      {isOpen && (
        <div
          ref={popoverRef}
          role="dialog"
          aria-label="Notifications panel"
          className="absolute right-0 mt-2 w-80 sm:w-96 max-w-[calc(100vw-1rem)] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        >
          {/* Header */}
          <div className="p-3.5 sm:p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-900/80">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Notifications
              </h3>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300">
                  {unreadCount} new
                </span>
              )}
            </div>

            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-xs font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 px-2 py-1 rounded hover:bg-blue-50 dark:hover:bg-slate-800 flex items-center gap-1 transition-colors"
                  title="Mark all as read"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Mark all read</span>
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                aria-label="Close notifications"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="flex border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 pt-2">
            <button
              onClick={() => setActiveFilter('all')}
              className={`pb-2 px-3 text-xs font-semibold border-b-2 transition-colors ${
                activeFilter === 'all'
                  ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              All ({notifications.length})
            </button>
            <button
              onClick={() => setActiveFilter('unread')}
              className={`pb-2 px-3 text-xs font-semibold border-b-2 transition-colors ${
                activeFilter === 'unread'
                  ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              Unread ({unreadCount})
            </button>
          </div>

          {/* Stock Alert Quick Shortcut Banner */}
          {stockAlertsCount > 0 && onOpenLowStockAlerts && (
            <div 
              onClick={() => {
                onOpenLowStockAlerts();
                setIsOpen(false);
              }}
              className="p-2.5 px-3.5 bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-900/60 flex items-center justify-between text-xs font-semibold text-amber-900 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-900/60 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0 animate-pulse" />
                <span>{stockAlertsCount} Low Stock Alerts active</span>
              </div>
              <span className="text-[11px] text-amber-700 dark:text-amber-300 font-bold underline flex items-center gap-1">
                <span>Alert Center</span>
                <ExternalLink className="w-3 h-3" />
              </span>
            </div>
          )}

          {/* Notifications List */}
          <div className="max-h-[340px] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60 overscroll-contain">
            {filteredNotifications.length === 0 ? (
              <div className="p-8 text-center text-slate-400 dark:text-slate-500">
                <Bell className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm font-medium">No notifications in this view</p>
                <p className="text-xs text-slate-400 mt-0.5">Everything is up to date.</p>
              </div>
            ) : (
              filteredNotifications.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleNotificationClick(item)}
                  className={`p-3.5 sm:p-4 flex gap-3 transition-colors cursor-pointer text-left ${
                    !item.read
                      ? 'bg-blue-50/40 dark:bg-slate-800/40 hover:bg-blue-50/70 dark:hover:bg-slate-800/70'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/30'
                  }`}
                >
                  {getNotificationIcon(item.type, item.severity)}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-1.5 mb-1">
                      <h4 className={`text-xs font-bold truncate ${
                        !item.read 
                          ? 'text-slate-900 dark:text-white' 
                          : 'text-slate-700 dark:text-slate-300'
                      }`}>
                        {item.title}
                      </h4>
                      <span className="text-[10px] text-slate-400 shrink-0">
                        {item.time}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                      {item.message}
                    </p>

                    {item.targetNav && (
                      <div className="mt-2 flex items-center gap-1 text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline">
                        <span>Take Action</span>
                        <ExternalLink className="w-3 h-3" />
                      </div>
                    )}
                  </div>

                  {!item.read && (
                    <div className="w-2 h-2 rounded-full bg-blue-600 shrink-0 self-center" />
                  )}
                </div>
              ))
            )}
          </div>

          {/* Footer with Quick Navigation shortcuts */}
          <div className="p-2.5 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 text-center">
            <button
              onClick={() => {
                if (onNavigate) onNavigate('accountability');
                setIsOpen(false);
              }}
              className="text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              View Full System Audit Feed →
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
