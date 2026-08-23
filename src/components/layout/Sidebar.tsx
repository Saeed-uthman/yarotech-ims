import React, { useEffect } from 'react';
import { 
  LayoutDashboard, 
  Package, 
  Boxes, 
  ShoppingCart, 
  Users, 
  ShoppingBag, 
  FileText, 
  ShieldCheck, 
  Settings, 
  Pill, 
  LogOut, 
  UserCheck,
  User,
  X,
  UserCog
} from 'lucide-react';
import { UserRole } from '../../types';
import { useAuth, usePermissions } from '../../hooks';

export interface SidebarProps {
  currentRole: UserRole;
  onRoleChange: (role: UserRole) => void;
  activeNav: string;
  onNavChange: (nav: string) => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
  pharmacyName?: string;
  pharmacyLogo?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentRole,
  onRoleChange,
  activeNav,
  onNavChange,
  isMobileOpen = false,
  onCloseMobile,
  pharmacyName = 'Al-Amaan Medicine Store',
  pharmacyLogo,
}) => {
  const { user, logout, pendingCount } = useAuth();
  const permissions = usePermissions(currentRole);

  const mainNavItems = permissions.isAdmin
    ? [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'products', label: 'Products', icon: Package, badge: 'Core' },
        { id: 'inventory', label: 'Inventory', icon: Boxes, badge: 'Live' },
        { id: 'stock-purchase', label: 'Stock Purchase', icon: ShoppingCart, badge: 'Live' },
        { id: 'customers', label: 'Customers', icon: Users, badge: 'Live' },
        { id: 'sales', label: 'Sales & POS', icon: ShoppingBag, badge: 'Live' },
        { id: 'reports', label: 'Reports', icon: FileText, badge: 'Live' },
      ]
    : [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'sales', label: 'Sales & POS', icon: ShoppingBag, badge: 'Live' },
        { id: 'products', label: 'Products', icon: Package, badge: 'Catalog' },
        { id: 'inventory', label: 'Inventory', icon: Boxes, badge: 'Stock' },
        { id: 'customers', label: 'Customers', icon: Users, badge: 'Registry' },
      ];

  const operationsNavItems = permissions.isAdmin
    ? [
        {
          id: 'users',
          label: 'User Approvals',
          icon: UserCog,
          badge: pendingCount > 0 ? `${pendingCount} Req` : 'Admin',
          badgeColor: pendingCount > 0 ? 'bg-amber-500 text-white font-bold animate-pulse' : undefined,
        },
        { id: 'accountability', label: 'Accountability', icon: ShieldCheck, badge: 'Audit' },
        { id: 'settings', label: 'Settings', icon: Settings, badge: 'Config' },
      ]
    : [];

  // Prevent background scrolling when mobile drawer is open
  useEffect(() => {
    if (isMobileOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isMobileOpen]);

  // Handle keyboard Escape to close mobile drawer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isMobileOpen && onCloseMobile) {
        onCloseMobile();
      }
    };
    if (isMobileOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMobileOpen, onCloseMobile]);

  const handleNavClick = (id: string) => {
    onNavChange(id);
    if (onCloseMobile) onCloseMobile();
  };

  const displayName = user?.fullName || (currentRole === 'admin' ? 'Dr. Abdullahi Sanusi' : 'Dispensary Cashier');

  const sidebarContent = (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 w-64 select-none">
      {/* Brand Header */}
      <div className="p-4 sm:p-5 flex items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900">
        <div className="flex items-center gap-3 min-w-0">
          {pharmacyLogo ? (
            <img
              src={pharmacyLogo}
              alt={pharmacyName}
              className="w-8 h-8 rounded-lg object-contain bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs shrink-0"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-xs shrink-0 text-white">
              <div className="w-3.5 h-3.5 border-2 border-white rounded-xs"></div>
            </div>
          )}
          <div className="min-w-0">
            <h1 className="font-bold text-slate-900 dark:text-white text-sm leading-tight tracking-tight truncate" title={pharmacyName}>
              {pharmacyName}
            </h1>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium truncate">Pharmacy Management</p>
          </div>
        </div>

        {onCloseMobile && (
          <button 
            id="close-mobile-sidebar-btn"
            onClick={onCloseMobile} 
            className="md:hidden p-2 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 min-w-[44px] min-h-[44px] flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Close navigation menu"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Nav List */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6 overscroll-contain">
        <div>
          <div className="px-3 mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
            Main Navigation
          </div>
          <nav className="space-y-1" aria-label="Main system modules">
            {mainNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeNav === item.id;
              return (
                <button
                  key={item.id}
                  id={`nav-item-${item.id}`}
                  onClick={() => handleNavClick(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs sm:text-sm font-medium transition-colors min-h-[44px] ${
                    isActive
                      ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 font-bold shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 dark:text-slate-500'}`} />
                    <span className="truncate">{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-semibold shrink-0 ${
                      isActive 
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' 
                        : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                    }`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {operationsNavItems.length > 0 && (
          <div>
            <div className="px-3 mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
              Administration & Audit
            </div>
            <nav className="space-y-1" aria-label="System operations and audit">
              {operationsNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeNav === item.id;
                return (
                  <button
                    key={item.id}
                    id={`nav-item-${item.id}`}
                    onClick={() => handleNavClick(item.id)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs sm:text-sm font-medium transition-colors min-h-[44px] ${
                      isActive
                        ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 font-bold shadow-xs'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 dark:text-slate-500'}`} />
                      <span className="truncate">{item.label}</span>
                    </div>
                    {item.badge && (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-semibold shrink-0 ${
                        item.badgeColor
                          ? item.badgeColor
                          : isActive 
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' 
                          : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                      }`}>
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>
        )}
      </div>

      {/* User Role Card & Switcher in Sidebar Footer */}
      <div className="p-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80">
        <div className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className={`w-8 h-8 rounded-lg text-white flex items-center justify-center font-semibold text-xs overflow-hidden shrink-0 shadow-xs ${
                currentRole === 'admin' ? 'bg-blue-600' : 'bg-emerald-600'
              }`}>
                {currentRole === 'admin' ? (
                  <UserCheck className="w-4 h-4" />
                ) : (
                  <User className="w-4 h-4" />
                )}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                  {displayName}
                </p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 capitalize truncate">
                  {currentRole === 'admin' ? 'Full Administrator' : 'POS Sales Mode'}
                </p>
              </div>
            </div>

            <button
              id="sidebar-sign-out-btn"
              onClick={logout}
              title="Sign Out"
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors min-w-[32px] min-h-[32px] flex items-center justify-center"
              aria-label="Sign out of system"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Role Toggle Bar */}
          <div className="flex bg-slate-100 dark:bg-slate-900 p-0.5 rounded-lg text-xs font-semibold">
            <button
              id="role-select-admin-btn"
              onClick={() => onRoleChange('admin')}
              className={`flex-1 py-1.5 rounded-md text-center transition-all min-h-[32px] ${
                currentRole === 'admin' 
                  ? 'bg-white dark:bg-slate-800 text-blue-700 dark:text-blue-400 shadow-xs font-bold' 
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              Admin
            </button>
            <button
              id="role-select-cashier-btn"
              onClick={() => onRoleChange('cashier')}
              className={`flex-1 py-1.5 rounded-md text-center transition-all min-h-[32px] ${
                currentRole === 'cashier' 
                  ? 'bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-400 shadow-xs font-bold' 
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              Cashier
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden md:flex flex-shrink-0 h-screen sticky top-0 z-20">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Overlay */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 z-50 md:hidden flex"
          role="dialog"
          aria-modal="true"
          aria-label="Mobile Navigation Menu"
        >
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity duration-200 animate-in fade-in" 
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          {/* Drawer Panel */}
          <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white dark:bg-slate-900 z-10 shadow-2xl animate-in slide-in-from-left duration-200">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
