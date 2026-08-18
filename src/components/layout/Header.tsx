import React from 'react';
import { 
  Search, 
  Plus, 
  Bell, 
  ScanBarcode, 
  Menu, 
  ShieldAlert, 
  Sparkles,
  RefreshCw
} from 'lucide-react';
import { UserRole } from '../../types';

interface HeaderProps {
  currentRole: UserRole;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onOpenAddProduct: () => void;
  onOpenBarcodeScanner: () => void;
  onOpenMobileMenu: () => void;
  onResetData?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentRole,
  searchQuery,
  onSearchChange,
  onOpenAddProduct,
  onOpenBarcodeScanner,
  onOpenMobileMenu,
  onResetData,
}) => {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 px-4 sm:px-6 lg:px-8 py-3.5">
      <div className="flex items-center justify-between gap-4">
        {/* Left: Mobile hamburger & Title */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            id="mobile-menu-trigger-btn"
            onClick={onOpenMobileMenu}
            className="p-2 -ml-2 rounded-md text-slate-600 hover:bg-slate-100 md:hidden"
            aria-label="Open Navigation Menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight leading-tight">
                Product Management
              </h1>
              {currentRole === 'cashier' && (
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono">
                  Cashier Mode
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-slate-500 hidden sm:block">
              Manage medicines and company-specific pricing variants.
            </p>
          </div>
        </div>

        {/* Center: Search Bar (Desktop) */}
        <div className="hidden lg:flex items-center flex-1 max-w-md mx-6">
          <div className="relative w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              id="header-global-search-input"
              type="text"
              placeholder="Search medicines, barcodes, or categories..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="block w-full pl-10 pr-10 py-2 border border-slate-200 rounded-md leading-5 bg-slate-50 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-1 focus:ring-blue-500 sm:text-sm transition-colors text-slate-900"
            />
            {searchQuery && (
              <button
                onClick={() => onSearchChange('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-400 hover:text-slate-600"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Right: Quick Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Barcode Quick Scan */}
          <button
            id="open-barcode-scanner-btn"
            onClick={onOpenBarcodeScanner}
            title="Scan Medicine Barcode"
            className="px-3 py-2 border border-slate-200 rounded-md bg-white text-xs sm:text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 flex items-center gap-1.5 transition-colors"
          >
            <ScanBarcode className="w-4 h-4 text-blue-600" />
            <span className="hidden sm:inline">Scan Barcode</span>
          </button>

          {/* Reset Demo Data Button */}
          {onResetData && (
            <button
              id="reset-demo-data-btn"
              onClick={onResetData}
              title="Reset to initial mock data"
              className="p-2 rounded-md border border-slate-200 bg-white text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-colors hidden sm:flex shadow-sm"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}

          {/* Notification Bell */}
          <button 
            id="header-notification-btn"
            className="p-2 rounded-md text-slate-500 hover:text-slate-700 hover:bg-slate-100 relative transition-colors"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-blue-600 rounded-full ring-2 ring-white"></span>
          </button>

          {/* Add Product Button (Admin only) */}
          {currentRole === 'admin' ? (
            <button
              id="open-add-product-modal-btn"
              onClick={onOpenAddProduct}
              className="px-3.5 sm:px-4 py-2 bg-blue-600 text-white rounded-md text-xs sm:text-sm font-semibold shadow-sm hover:bg-blue-700 active:bg-blue-800 transition-colors flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Product</span>
            </button>
          ) : (
            <div className="hidden sm:flex items-center gap-1 px-3 py-2 bg-slate-100 text-slate-400 rounded-md text-xs font-medium cursor-not-allowed">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Admin Action</span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
