import React from 'react';
import { 
  Plus, 
  Menu, 
  LayoutDashboard,
  Package,
  Boxes,
  ShoppingCart,
  Users,
  ShoppingBag,
  FileText,
  ShieldCheck,
  Settings as SettingsIcon,
  Keyboard,
  AlertTriangle
} from 'lucide-react';
import { UserRole } from '../../types';
import { HeaderNotifications } from './HeaderNotifications';
import { HeaderUserMenu } from './HeaderUserMenu';

export interface HeaderProps {
  activeNav?: string;
  onNavChange?: (nav: string) => void;
  pharmacyName?: string;
  pharmacyLogo?: string;
  currentRole: UserRole;
  searchQuery?: string;
  onSearchChange?: (q: string) => void;
  onOpenAddProduct?: () => void;
  onOpenBarcodeScanner?: () => void;
  onOpenMobileMenu: () => void;
  onOpenShortcuts?: () => void;
  isOnline?: boolean;
  onOpenLowStockAlerts?: () => void;
  lowStockCount?: number;
}

const MODULE_META: Record<string, { title: string; subtitle: string; icon: React.ElementType }> = {
  dashboard: {
    title: 'Executive Dashboard',
    subtitle: 'Real-time revenue, gross profit margins, and inventory health.',
    icon: LayoutDashboard,
  },
  products: {
    title: 'Product Management',
    subtitle: 'Manage networking, solar and IT products with supplier-specific pricing.',
    icon: Package,
  },
  inventory: {
    title: 'Inventory Tracking',
    subtitle: 'Stock level monitoring, reorder alerts, and warehouse distribution.',
    icon: Boxes,
  },
  'stock-purchase': {
    title: 'Stock Purchases',
    subtitle: 'Procurement orders, manufacturer invoices, and cost verification.',
    icon: ShoppingCart,
  },
  customers: {
    title: 'Customer Ledgers',
    subtitle: 'Customer accounts, credit limits, and debt recovery records.',
    icon: Users,
  },
  sales: {
    title: 'Point of Sale & History',
    subtitle: 'Cashier checkout terminal, invoices, and sales receipts.',
    icon: ShoppingBag,
  },
  reports: {
    title: 'Financial & Movement Reports',
    subtitle: 'Profit and loss analytics, product velocity, and tax summaries.',
    icon: FileText,
  },
  accountability: {
    title: 'Accountability Audit Feed',
    subtitle: 'Financial postings, manual expenses, and operational audit records.',
    icon: ShieldCheck,
  },
  users: {
    title: 'User Accounts & Admin Approvals',
    subtitle: 'Manage staff registration requests, credentials, and access roles.',
    icon: Users,
  },
  settings: {
    title: 'System Preferences',
    subtitle: 'Company profile, receipt, tax, currency, and inventory preferences.',
    icon: SettingsIcon,
  },
};

export const Header: React.FC<HeaderProps> = ({
  activeNav = 'products',
  onNavChange,
  pharmacyName = 'Yarotech Group',
  pharmacyLogo,
  currentRole,
  onOpenAddProduct,
  onOpenBarcodeScanner,
  onOpenMobileMenu,
  onOpenShortcuts,
  isOnline = true,
  onOpenLowStockAlerts,
  lowStockCount = 0,
}) => {
  const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.userAgent);
  const metaLabel = isMac ? '⌘' : 'Ctrl';

  const activeMeta = MODULE_META[activeNav] || {
    title: 'Business System',
    subtitle: 'Technology products, sales and inventory control.',
    icon: Package,
  };

  return (
    <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-30 transition-colors">
      {/* Primary Header Container */}
      <div className="px-2.5 xs:px-3 sm:px-6 lg:px-8 py-2.5 sm:py-3">
        <div className="flex items-center justify-between gap-2 sm:gap-4">
          
          {/* ======================================================== */}
          {/* LEFT: Hamburger Menu + Brand / Active Module Context     */}
          {/* ======================================================== */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            {/* Mobile Hamburger Button with ≥40px touch target */}
            <button
              id="mobile-menu-trigger-btn"
              onClick={onOpenMobileMenu}
              className="p-2 -ml-1 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 md:hidden flex items-center justify-center min-w-[40px] min-h-[40px] focus:outline-none focus:ring-2 focus:ring-blue-500 shrink-0 cursor-pointer"
              aria-label="Open navigation drawer"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Mobile Brand Logo & Name */}
            <div className="flex items-center gap-2 md:hidden min-w-0">
              {pharmacyLogo ? (
                <img
                  src={pharmacyLogo}
                  alt={pharmacyName}
                  className="w-7 h-7 rounded object-contain bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shrink-0"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-7 h-7 bg-blue-600 rounded flex items-center justify-center shadow-xs shrink-0">
                  <div className="w-3 h-3 border-2 border-white rounded-xs" />
                </div>
              )}
              <span className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm tracking-tight truncate max-w-[130px] xs:max-w-[180px]">
                {pharmacyName}
              </span>
            </div>

            {/* Desktop Active Module Title & Breadcrumbs */}
            <div className="hidden md:block min-w-0">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 border border-blue-100 dark:border-blue-900/60 text-blue-600 dark:text-blue-400 shrink-0">
                  <activeMeta.icon className="w-4 h-4" />
                </div>
                <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-slate-900 dark:text-white tracking-tight leading-tight truncate">
                  {activeMeta.title}
                </h1>

                {currentRole === 'cashier' && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-mono">
                    Cashier Mode
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-lg mt-0.5 hidden lg:block">
                {activeMeta.subtitle}
              </p>
            </div>
          </div>

          {/* ======================================================== */}
          {/* RIGHT: Optimized Priority Actions & Controls            */}
          {/* Hierarchy: Add Product > Stock Alert > Notif > User     */}
          {/* ======================================================== */}
          <div className="flex items-center gap-1.5 xs:gap-2 sm:gap-2.5 shrink-0">
            
            {/* 1. Add Product Button (Admin Quick Add: compact on mobile, expanded on desktop) */}
            {onOpenAddProduct && currentRole === 'admin' && (
              <button
                id="open-add-product-modal-btn"
                type="button"
                onClick={onOpenAddProduct}
                title={`Create Product (${metaLabel}+P)`}
                className="p-2 sm:px-3 sm:py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-lg text-xs sm:text-sm font-semibold shadow-2xs transition-colors flex items-center gap-1.5 min-h-[38px] sm:min-h-[42px] min-w-[38px] justify-center focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                aria-label="Add new product"
              >
                <Plus className="w-4 h-4 shrink-0 stroke-[2.5]" />
                <span className="hidden sm:inline">Add</span>
                <span className="hidden lg:inline">Product</span>
                <kbd className="hidden xl:inline-block px-1.5 py-0.2 text-[10px] font-mono bg-blue-700 text-blue-100 rounded border border-blue-500/50">
                  {metaLabel}+P
                </kbd>
              </button>
            )}

            {/* 2. Low Stock Alert Direct Trigger Button (Adaptive badge) */}
            {lowStockCount > 0 && onOpenLowStockAlerts && (
              <button
                id="header-low-stock-alert-trigger-btn"
                type="button"
                onClick={onOpenLowStockAlerts}
                title={`${lowStockCount} items at or below reorder threshold. Click to view low stock list.`}
                className="px-2 py-1.5 sm:px-2.5 sm:py-2 bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 dark:hover:bg-amber-900/70 border border-amber-300 dark:border-amber-700/80 text-amber-900 dark:text-amber-200 rounded-lg text-xs sm:text-sm font-bold shadow-2xs flex items-center gap-1.5 transition-colors min-h-[38px] sm:min-h-[42px] focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer animate-in fade-in"
                aria-label={`${lowStockCount} items with low stock`}
              >
                <AlertTriangle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                <span className="font-mono text-xs font-bold text-amber-700 dark:text-amber-300">
                  {lowStockCount}
                </span>
                <span className="hidden lg:inline font-semibold text-amber-800 dark:text-amber-300">Low Stock</span>
              </button>
            )}

            {/* 4. Keyboard Shortcuts Trigger Button (Desktop only) */}
            {onOpenShortcuts && (
              <button
                id="open-shortcuts-btn"
                type="button"
                onClick={onOpenShortcuts}
                title="Keyboard Shortcuts (?)"
                className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-400 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/80 transition-colors hidden lg:flex shadow-2xs min-h-[42px] min-w-[42px] items-center justify-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-label="Open keyboard shortcuts"
              >
                <Keyboard className="w-4 h-4" />
              </button>
            )}

            {/* 5. Notifications Menu Popover */}
            <HeaderNotifications
              currentRole={currentRole}
              onNavigate={onNavChange}
              onOpenLowStockAlerts={onOpenLowStockAlerts}
              lowStockCount={lowStockCount}
              isOnline={isOnline}
            />

            {/* 6. Authenticated user menu */}
            <HeaderUserMenu
              currentRole={currentRole}
              onNavigate={onNavChange}
              onOpenShortcuts={onOpenShortcuts}
              isOnline={isOnline}
            />
          </div>
        </div>
      </div>

      {/* Breadcrumb / Context Sub-bar for Mobile (displays current module and active role) */}
      <div className="md:hidden px-3 py-1.5 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs gap-2">
        <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300 min-w-0 truncate">
          <activeMeta.icon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span className="font-semibold text-slate-900 dark:text-white truncate text-[11px] xs:text-xs">
            {activeMeta.title}
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {currentRole === 'cashier' ? (
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-semibold shrink-0">
              Cashier Mode
            </span>
          ) : (
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 font-semibold shrink-0">
              Admin
            </span>
          )}
        </div>
      </div>
    </header>
  );
};
