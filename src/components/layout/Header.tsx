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
  pharmacyName = 'Al-Amaan Medicine Store',
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
  const [isMobileSearchActive, setIsMobileSearchActive] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const mobileSearchInputRef = useRef<HTMLInputElement>(null);
  const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.userAgent);
  const metaLabel = isMac ? '⌘' : 'Ctrl';

  const activeMeta = MODULE_META[activeNav] || {
    title: 'Pharmacy System',
    subtitle: 'Pharmacy management and inventory control.',
    icon: Package,
  };

  // Focus mobile input when mobile search is activated
  useEffect(() => {
    if (isMobileSearchActive) {
      setTimeout(() => {
        mobileSearchInputRef.current?.focus();
      }, 80);
    }
  }, [isMobileSearchActive]);

  // Keyboard shortcut Ctrl+K or Cmd+K or Ctrl+F to focus search input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'f')) {
        e.preventDefault();
        if (window.innerWidth < 768) {
          setIsMobileSearchActive(true);
        } else {
          searchInputRef.current?.focus();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-30 transition-colors">
      {/* Primary Header Container */}
      <div className="px-2.5 xs:px-3 sm:px-6 lg:px-8 py-2 sm:py-2.5">
        {/* ======================================================== */}
        {/* MOBILE FULL-WIDTH SEARCH OVERLAY (Active Mode)           */}
        {/* When active, replaces standard header icons with an      */}
        {/* edge-to-edge dedicated search field for touch keyboards */}
        {/* ======================================================== */}
        {isMobileSearchActive ? (
          <div className="md:hidden flex items-center gap-2 py-0.5 animate-in fade-in zoom-in-95 duration-150">
            <div className="relative flex-1 flex items-center min-w-0">
              <Search className="w-4 h-4 text-blue-600 dark:text-blue-400 absolute left-3 top-1/2 -translate-y-1/2 shrink-0 pointer-events-none" />
              <input
                ref={mobileSearchInputRef}
                id="header-mobile-active-search-input"
                type="text"
                placeholder="Search medicines, barcodes, stock..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="w-full pl-9 pr-8 py-2 border border-blue-500 dark:border-blue-500 rounded-lg text-xs xs:text-sm bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 shadow-xs"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    onSearchChange('');
                    mobileSearchInputRef.current?.focus();
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 focus:outline-none"
                  aria-label="Clear search input"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Barcode Quick Trigger from Search Mode */}
            <button
              type="button"
              onClick={() => {
                setIsMobileSearchActive(false);
                onOpenBarcodeScanner();
              }}
              title="Scan Barcode"
              className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 hover:bg-slate-50 dark:hover:bg-slate-700/80 flex items-center justify-center min-w-[38px] min-h-[38px] shrink-0 shadow-xs"
              aria-label="Scan barcode"
            >
              <ScanBarcode className="w-4 h-4" />
            </button>

            {/* Cancel / Close Search Mode */}
            <button
              type="button"
              onClick={() => setIsMobileSearchActive(false)}
              className="px-2.5 py-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors shrink-0 min-h-[38px] flex items-center"
            >
              Cancel
            </button>
          </div>
        ) : (
          /* ======================================================== */
          /* STANDARD HEADER LAYOUT (Mobile & Desktop)                */
          /* ======================================================== */
          <div className="flex items-center justify-between gap-1.5 sm:gap-4">
            
            {/* ======================================================== */}
            {/* LEFT: Hamburger Menu + Brand / Active Module Context     */}
            {/* ======================================================== */}
            <div className="flex items-center gap-1.5 sm:gap-3 min-w-0 shrink">
              {/* Mobile Hamburger Button with ≥44px touch target */}
              <button
                id="mobile-menu-trigger-btn"
                onClick={onOpenMobileMenu}
                className="p-2 -ml-1 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 md:hidden flex items-center justify-center min-w-[40px] min-h-[40px] focus:outline-none focus:ring-2 focus:ring-blue-500 shrink-0"
                aria-label="Open navigation drawer"
              >
                <Menu className="w-5 h-5" />
              </button>

              {/* Mobile Brand Logo & Name */}
              <div className="flex items-center gap-1.5 sm:gap-2 md:hidden min-w-0">
                {pharmacyLogo ? (
                  <img
                    src={pharmacyLogo}
                    alt={pharmacyName}
                    className="w-6 h-6 sm:w-7 sm:h-7 rounded object-contain bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shrink-0"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-6 h-6 sm:w-7 sm:h-7 bg-blue-600 rounded flex items-center justify-center shadow-xs shrink-0">
                    <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 border-2 border-white rounded-xs" />
                  </div>
                )}
                <span className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm tracking-tight truncate max-w-[90px] xs:max-w-[130px] sm:max-w-[200px]">
                  {pharmacyName}
                </span>
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
                <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
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
                      type="button"
                      onClick={() => onSearchChange('')}
                      className="text-xs font-semibold text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 px-1 py-0.5"
                      aria-label="Clear search query"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <kbd className="hidden lg:inline-block px-1.5 py-0.5 text-[10px] font-mono text-slate-400 bg-slate-200/60 dark:bg-slate-700/60 rounded border border-slate-300 dark:border-slate-600">
                      {metaLabel}+K
                    </kbd>
                  )}
                </div>
              </div>
            </div>

            {/* ======================================================== */}
            {/* RIGHT: Optimized Priority Actions & Controls            */}
            {/* Hierarchy: Search (Mobile) > Scan > Add > Stock > Notif > User */}
            {/* ======================================================== */}
            <div className="flex items-center gap-1 xs:gap-1.5 sm:gap-2 shrink-0">
              
              {/* 1. Mobile Search Trigger Button (with active filter indicator) */}
              <button
                id="header-mobile-search-toggle"
                type="button"
                onClick={() => setIsMobileSearchActive(true)}
                className={`relative p-2 rounded-lg md:hidden flex items-center justify-center min-w-[38px] min-h-[38px] transition-colors ${
                  searchQuery
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300 border border-blue-300 dark:border-blue-700'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-transparent'
                }`}
                title={searchQuery ? `Searching: "${searchQuery}"` : 'Search medicines'}
                aria-label="Open search input"
              >
                <Search className="w-4 h-4 xs:w-4.5 xs:h-4.5" />
                {searchQuery && (
                  <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-blue-600 ring-2 ring-white dark:ring-slate-900" />
                )}
              </button>

              {/* 2. Barcode Scanner Quick Trigger Button (Mobile & Desktop) */}
              <button
                id="open-barcode-scanner-btn"
                type="button"
                onClick={onOpenBarcodeScanner}
                title={`Scan Medicine Barcode (${metaLabel}+B)`}
                className="p-2 sm:px-3 sm:py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 shadow-2xs hover:bg-slate-50 dark:hover:bg-slate-700/80 active:bg-slate-100 flex items-center gap-1.5 transition-colors min-h-[38px] sm:min-h-[42px] min-w-[38px] justify-center focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                aria-label="Scan medicine barcode"
              >
                <ScanBarcode className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                <span className="hidden sm:inline">Scan</span>
                <span className="hidden xl:inline">Barcode</span>
              </button>

              {/* 3. Add Product Button (Admin Quick Add: compact on mobile, expanded on desktop) */}
              {onOpenAddProduct && currentRole === 'admin' && (
                <button
                  id="open-add-product-modal-btn"
                  type="button"
                  onClick={onOpenAddProduct}
                  title={`Create Medicine Product (${metaLabel}+P)`}
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

              {/* 4. Low Stock Alert Direct Trigger Button (Adaptive compact badge on mobile) */}
              {lowStockCount > 0 && onOpenLowStockAlerts && (
                <button
                  id="header-low-stock-alert-trigger-btn"
                  type="button"
                  onClick={onOpenLowStockAlerts}
                  title={`${lowStockCount} items at or below reorder threshold. Click to view low stock list.`}
                  className="px-2 py-1.5 sm:px-2.5 sm:py-2 bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 dark:hover:bg-amber-900/70 border border-amber-300 dark:border-amber-700/80 text-amber-900 dark:text-amber-200 rounded-lg text-xs sm:text-sm font-bold shadow-2xs flex items-center gap-1 transition-colors min-h-[38px] sm:min-h-[42px] focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer animate-in fade-in"
                  aria-label={`${lowStockCount} items with low stock`}
                >
                  <AlertTriangle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                  <span className="font-mono text-xs font-bold text-amber-700 dark:text-amber-300">
                    {lowStockCount}
                  </span>
                  <span className="hidden lg:inline font-normal text-amber-800 dark:text-amber-300">Low Stock</span>
                </button>
              )}

              {/* Keyboard Shortcuts Trigger Button (Desktop only) */}
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

              {/* Reset Demo Data Button (Desktop XL only) */}
              {onResetData && (
                <button
                  id="reset-demo-data-btn"
                  type="button"
                  onClick={onResetData}
                  title="Reset to initial mock data"
                  className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-400 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/80 transition-colors hidden xl:flex shadow-2xs min-h-[42px] min-w-[42px] items-center justify-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                  aria-label="Reset demo data"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              )}

              {/* 5. Notifications Menu Popover (compact & responsive) */}
              <HeaderNotifications
                currentRole={currentRole}
                onNavigate={onNavChange}
                onOpenLowStockAlerts={onOpenLowStockAlerts}
              />

              {/* 6. User Profile & Role Switcher Menu */}
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
        )}
      </div>

      {/* Breadcrumb / Context Sub-bar for Mobile (displays current module and active filters) */}
      <div className="md:hidden px-3 py-1.5 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs gap-2">
        <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300 min-w-0 truncate">
          <activeMeta.icon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span className="font-semibold text-slate-900 dark:text-white truncate text-[11px] xs:text-xs">
            {activeMeta.title}
          </span>
          {searchQuery && (
            <span className="text-[10px] text-blue-600 dark:text-blue-400 font-medium truncate">
              &bull; &ldquo;{searchQuery}&rdquo;
            </span>
          )}
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
