import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  Plus, 
  ScanBarcode, 
  Menu, 
  ShieldAlert, 
  RefreshCw,
  X,
  LayoutDashboard,
  Package,
  Boxes,
  ShoppingCart,
  Users,
  ShoppingBag,
  FileText,
  ShieldCheck,
  Settings as SettingsIcon,
  ChevronRight,
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
  onRoleChange?: (role: UserRole) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onOpenAddProduct?: () => void;
  onOpenBarcodeScanner: () => void;
  onOpenMobileMenu: () => void;
  onOpenShortcuts?: () => void;
  onResetData?: () => void;
  isOnline?: boolean;
  onOpenLowStockAlerts?: () => void;
  lowStockCount?: number;
}

const MODULE_META: Record<string, { title: string; subtitle: string; icon: React.ElementType }> = {
  dashboard: {
    title: 'Executive Dashboard',
    subtitle: 'Real-time revenue, gross profit margins, and pharmacy stock health.',
    icon: LayoutDashboard,
  },
  products: {
    title: 'Product Management',
    subtitle: 'Manage medicines and company-specific pricing variants.',
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
    subtitle: 'Patient accounts, credit limits, and debt recovery records.',
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
    subtitle: 'Cryptographically sealed audit trail and shift handovers.',
    icon: ShieldCheck,
  },
  users: {
    title: 'User Accounts & Admin Approvals',
    subtitle: 'Manage staff registration requests, credentials, and access roles.',
    icon: Users,
  },
  settings: {
    title: 'System Preferences',
    subtitle: 'Pharmacy profiles, role permissions, and database backup.',
    icon: SettingsIcon,
  },
};

export const Header: React.FC<HeaderProps> = ({
  activeNav = 'products',
  onNavChange,
  pharmacyName = 'BrightCare Pharmacy',
  pharmacyLogo,
  currentRole,
  onRoleChange,
  searchQuery,
  onSearchChange,
  onOpenAddProduct,
  onOpenBarcodeScanner,
  onOpenMobileMenu,
  onOpenShortcuts,
  onResetData,
  isOnline = true,
  onOpenLowStockAlerts,
  lowStockCount = 0,
}) => {
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.userAgent);
  const metaLabel = isMac ? '⌘' : 'Ctrl';

  const activeMeta = MODULE_META[activeNav] || {
    title: 'Pharmacy System',
    subtitle: 'Pharmacy management and inventory control.',
    icon: Package,
  };

  // Keyboard shortcut Ctrl+K or Cmd+K to focus search input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        if (window.innerWidth < 768) {
          setIsMobileSearchOpen(true);
        }
        setTimeout(() => {
          searchInputRef.current?.focus();
        }, 50);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-30 transition-colors">
      {/* Primary Header Row */}
      <div className="px-3 sm:px-6 lg:px-8 py-2.5 sm:py-3">
        <div className="flex items-center justify-between gap-2 sm:gap-4">
          
          {/* ======================================================== */}
          {/* LEFT: Mobile Menu Button + Brand / Active Module Context */}
          {/* ======================================================== */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            {/* Mobile Hamburger Button with ≥44px touch target */}
            <button
              id="mobile-menu-trigger-btn"
              onClick={onOpenMobileMenu}
              className="p-2 -ml-1 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 md:hidden flex items-center justify-center min-w-[44px] min-h-[44px] focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="Open navigation menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Mobile Brand Logo & Name (visible only on small mobile / tablet where sidebar is hidden) */}
            <div className="flex items-center gap-2 md:hidden">
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
              <div className="min-w-0">
                <span className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm tracking-tight truncate block max-w-[110px] xs:max-w-[150px] sm:max-w-[200px]">
                  {pharmacyName}
                </span>
              </div>
            </div>

            {/* Desktop Active Module Title & Breadcrumbs */}
            <div className="hidden md:block min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-slate-900 dark:text-white tracking-tight leading-tight truncate">
                  {activeMeta.title}
                </h1>

                {currentRole === 'cashier' && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-mono">
                    Cashier Mode
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-md hidden lg:block">
                {activeMeta.subtitle}
              </p>
            </div>
          </div>

          {/* ======================================================== */}
          {/* CENTER: Search Bar (Desktop / Tablet)                    */}
          {/* ======================================================== */}
          <div className="hidden md:flex items-center flex-1 max-w-xs lg:max-w-md mx-2 lg:mx-4">
            <div className="relative w-full">
              <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                ref={searchInputRef}
                id="header-global-search-input"
                type="text"
                placeholder="Search medicines, barcodes, or categories..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="block w-full pl-9 pr-14 py-1.5 lg:py-2 border border-slate-200 dark:border-slate-700 rounded-lg leading-5 bg-slate-50 dark:bg-slate-800/90 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-blue-500 text-xs sm:text-sm transition-colors text-slate-900 dark:text-slate-100"
              />
              <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
                {searchQuery ? (
                  <button
                    onClick={() => onSearchChange('')}
                    className="text-xs font-semibold text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 px-1 py-0.5"
                    aria-label="Clear search query"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <kbd className="hidden lg:inline-block px-1.5 py-0.5 text-[10px] font-mono text-slate-400 bg-slate-200/60 dark:bg-slate-700/60 rounded border border-slate-300 dark:border-slate-600">
                    {metaLabel}+F
                  </kbd>
                )}
              </div>
            </div>
          </div>

          {/* ======================================================== */}
          {/* RIGHT: Quick Actions, Notifications, User Profile Menu   */}
          {/* ======================================================== */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            {/* Mobile Search Toggle Button */}
            <button
              id="header-mobile-search-toggle"
              onClick={() => setIsMobileSearchOpen(!isMobileSearchOpen)}
              className={`p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 md:hidden flex items-center justify-center min-w-[40px] min-h-[40px] transition-colors ${
                isMobileSearchOpen ? 'bg-blue-50 text-blue-600 dark:bg-slate-800 dark:text-blue-400' : ''
              }`}
              aria-label={isMobileSearchOpen ? 'Close search' : 'Open search'}
            >
              <Search className="w-5 h-5" />
            </button>

            {/* Barcode Scanner Quick Trigger Button */}
            <button
              id="open-barcode-scanner-btn"
              onClick={onOpenBarcodeScanner}
              title={`Scan Medicine Barcode (${metaLabel}+B)`}
              className="px-2.5 py-1.5 sm:px-3 sm:py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 shadow-xs hover:bg-slate-50 dark:hover:bg-slate-700/80 flex items-center gap-1.5 transition-colors min-h-[40px] sm:min-h-[44px] focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <ScanBarcode className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
              <span className="hidden sm:inline">Scan Barcode</span>
            </button>

            {/* Keyboard Shortcuts Trigger Button */}
            {onOpenShortcuts && (
              <button
                id="open-shortcuts-btn"
                onClick={onOpenShortcuts}
                title="Keyboard Shortcuts (?)"
                className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-400 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/80 transition-colors hidden lg:flex shadow-xs min-h-[44px] min-w-[44px] items-center justify-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-label="Open keyboard shortcuts cheatsheet"
              >
                <Keyboard className="w-4 h-4" />
              </button>
            )}

            {/* Reset Demo Data Button (if provided) */}
            {onResetData && (
              <button
                id="reset-demo-data-btn"
                onClick={onResetData}
                title="Reset to initial mock data"
                className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-400 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/80 transition-colors hidden xl:flex shadow-xs min-h-[44px] min-w-[44px] items-center justify-center focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            )}

            {/* Add Product Button (Admin only on Products/Inventory or Desktop) */}
            {onOpenAddProduct && (
              currentRole === 'admin' ? (
                <button
                  id="open-add-product-modal-btn"
                  onClick={onOpenAddProduct}
                  title={`Create Medicine Product (${metaLabel}+P)`}
                  className="hidden md:flex px-3 sm:px-3.5 py-2 bg-blue-600 text-white rounded-lg text-xs sm:text-sm font-semibold shadow-xs hover:bg-blue-700 active:bg-blue-800 transition-colors items-center gap-1.5 min-h-[44px] focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <Plus className="w-4 h-4" />
                  <span className="hidden lg:inline">Add Product</span>
                  <span className="lg:hidden">Add</span>
                  <kbd className="hidden xl:inline-block px-1.5 py-0.2 text-[10px] font-mono bg-blue-700 text-blue-100 rounded border border-blue-500/50">
                    {metaLabel}+P
                  </kbd>
                </button>
              ) : (
                <div className="hidden lg:flex items-center gap-1 px-2.5 py-2 bg-slate-100 dark:bg-slate-800 text-slate-400 rounded-lg text-xs font-medium cursor-not-allowed border border-slate-200/60 dark:border-slate-700 min-h-[44px]">
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span>Admin Mode Only</span>
                </div>
              )
            )}

            {/* Low Stock Alert Direct Trigger Button */}
            {lowStockCount > 0 && onOpenLowStockAlerts && (
              <button
                id="header-low-stock-alert-trigger-btn"
                onClick={onOpenLowStockAlerts}
                title={`${lowStockCount} items at or below low stock threshold. Click to view alert center.`}
                className="px-2.5 py-1.5 sm:px-3 sm:py-2 bg-amber-50 dark:bg-amber-950/50 hover:bg-amber-100 dark:hover:bg-amber-900/60 border border-amber-300 dark:border-amber-700/80 text-amber-900 dark:text-amber-200 rounded-lg text-xs sm:text-sm font-bold shadow-2xs flex items-center gap-1.5 transition-colors min-h-[40px] sm:min-h-[44px] focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer animate-in fade-in"
              >
                <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                <span className="hidden lg:inline">{lowStockCount} Low Stock</span>
                <span className="lg:hidden font-mono font-bold">{lowStockCount}</span>
              </button>
            )}

            {/* Notifications Menu Popover */}
            <HeaderNotifications
              currentRole={currentRole}
              onNavigate={onNavChange}
              onOpenLowStockAlerts={onOpenLowStockAlerts}
            />

            {/* User Profile & Role Switcher Menu */}
            <HeaderUserMenu
              currentRole={currentRole}
              onRoleChange={(newRole) => {
                if (onRoleChange) onRoleChange(newRole);
              }}
              onNavigate={onNavChange}
              onOpenShortcuts={onOpenShortcuts}
              isOnline={isOnline}
            />
          </div>
        </div>

        {/* ======================================================== */}
        {/* COLLAPSIBLE MOBILE SEARCH BAR (Smooth Expand)            */}
        {/* ======================================================== */}
        {isMobileSearchOpen && (
          <div className="md:hidden mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800 animate-in slide-in-from-top-2 duration-150">
            <div className="relative flex items-center">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                ref={searchInputRef}
                id="header-mobile-search-input"
                type="text"
                autoFocus
                placeholder="Search medicines, barcodes, stock..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="w-full pl-9 pr-16 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="absolute right-2 flex items-center gap-1">
                {searchQuery && (
                  <button
                    onClick={() => onSearchChange('')}
                    className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    aria-label="Clear mobile search"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={() => setIsMobileSearchOpen(false)}
                  className="text-xs font-semibold text-blue-600 dark:text-blue-400 px-1.5 py-1"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Breadcrumb / Context Bar for Mobile (compact display) */}
      <div className="md:hidden px-3 py-1.5 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300 truncate">
          <span className="font-semibold text-slate-900 dark:text-white truncate">
            {activeMeta.title}
          </span>
        </div>
        {currentRole === 'cashier' && (
          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-semibold shrink-0">
            Cashier Mode
          </span>
        )}
      </div>
    </header>
  );
};
