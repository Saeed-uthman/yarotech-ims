import React from 'react';
import { 
  ShoppingBag, 
  PackagePlus, 
  ShoppingCart, 
  UserPlus,
  Package,
  Boxes
} from 'lucide-react';
import { UserRole } from '../../types';
import { usePermissions } from '../../hooks';

interface DashboardQuickActionsProps {
  role: UserRole;
  onNavigate: (module: string) => void;
  onOpenProductWizard: () => void;
}

export const DashboardQuickActions: React.FC<DashboardQuickActionsProps> = ({
  role,
  onNavigate,
  onOpenProductWizard,
}) => {
  const permissions = usePermissions(role);

  if (!permissions.isAdmin) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3" id="dashboard-quick-actions">
        {/* 1. New Sale */}
        <button
          type="button"
          id="quick-action-new-sale"
          onClick={() => onNavigate('sales')}
          className="flex items-center gap-3 p-3 bg-white hover:bg-blue-50/50 border border-slate-200/90 hover:border-blue-300 rounded-xl text-left shadow-2xs transition-all group"
        >
          <div className="w-9 h-9 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
            <ShoppingBag className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-bold text-slate-900 group-hover:text-blue-700 truncate">
              New Sale (POS)
            </div>
            <div className="text-[11px] text-slate-500 truncate">Checkout customer</div>
          </div>
        </button>

        {/* 2. Customer Lookup / Registration */}
        <button
          type="button"
          id="quick-action-customers"
          onClick={() => onNavigate('customers')}
          className="flex items-center gap-3 p-3 bg-white hover:bg-amber-50/50 border border-slate-200/90 hover:border-amber-300 rounded-xl text-left shadow-2xs transition-all group"
        >
          <div className="w-9 h-9 rounded-lg bg-amber-600 text-white flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
            <UserPlus className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-bold text-slate-900 group-hover:text-amber-700 truncate">
              Customers
            </div>
            <div className="text-[11px] text-slate-500 truncate">Search & register</div>
          </div>
        </button>

        {/* 3. Product Catalog / Price Range Check */}
        <button
          type="button"
          id="quick-action-catalog"
          onClick={() => onNavigate('products')}
          className="flex items-center gap-3 p-3 bg-white hover:bg-emerald-50/50 border border-slate-200/90 hover:border-emerald-300 rounded-xl text-left shadow-2xs transition-all group"
        >
          <div className="w-9 h-9 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
            <Package className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-bold text-slate-900 group-hover:text-emerald-700 truncate">
              Product Catalog
            </div>
            <div className="text-[11px] text-slate-500 truncate">Check retail prices</div>
          </div>
        </button>

        {/* 4. Stock Levels Check */}
        <button
          type="button"
          id="quick-action-inventory"
          onClick={() => onNavigate('inventory')}
          className="flex items-center gap-3 p-3 bg-white hover:bg-violet-50/50 border border-slate-200/90 hover:border-violet-300 rounded-xl text-left shadow-2xs transition-all group"
        >
          <div className="w-9 h-9 rounded-lg bg-violet-600 text-white flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
            <Boxes className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-bold text-slate-900 group-hover:text-violet-700 truncate">
              Stock Levels
            </div>
            <div className="text-[11px] text-slate-500 truncate">Check product stock</div>
          </div>
        </button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3" id="dashboard-quick-actions">
      {/* 1. New Sale */}
      <button
        type="button"
        id="quick-action-new-sale"
        onClick={() => onNavigate('sales')}
        className="flex items-center gap-3 p-3 bg-white hover:bg-blue-50/50 border border-slate-200/90 hover:border-blue-300 rounded-xl text-left shadow-2xs transition-all group"
      >
        <div className="w-9 h-9 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
          <ShoppingBag className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <div className="text-xs font-bold text-slate-900 group-hover:text-blue-700 truncate">
            New Sale (POS)
          </div>
          <div className="text-[11px] text-slate-500 truncate">Checkout customer</div>
        </div>
      </button>

      {/* 2. Add Product */}
      <button
        type="button"
        id="quick-action-add-product"
        onClick={onOpenProductWizard}
        className="flex items-center gap-3 p-3 bg-white hover:bg-emerald-50/50 border border-slate-200/90 hover:border-emerald-300 rounded-xl text-left shadow-2xs transition-all group"
      >
        <div className="w-9 h-9 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
          <PackagePlus className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <div className="text-xs font-bold text-slate-900 group-hover:text-emerald-700 truncate">
            Add Product
          </div>
          <div className="text-[11px] text-slate-500 truncate">Create new product</div>
        </div>
      </button>

      {/* 3. Record Stock Purchase */}
      <button
        type="button"
        id="quick-action-stock-purchase"
        onClick={() => onNavigate('stock-purchase')}
        className="flex items-center gap-3 p-3 bg-white hover:bg-purple-50/50 border border-slate-200/90 hover:border-purple-300 rounded-xl text-left shadow-2xs transition-all group"
      >
        <div className="w-9 h-9 rounded-lg bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
          <ShoppingCart className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <div className="text-xs font-bold text-slate-900 group-hover:text-purple-700 truncate">
            Stock Purchase
          </div>
          <div className="text-[11px] text-slate-500 truncate">Procure inventory</div>
        </div>
      </button>

      {/* 4. Add Customer / Manage Debts */}
      <button
        type="button"
        id="quick-action-customers"
        onClick={() => onNavigate('customers')}
        className="flex items-center gap-3 p-3 bg-white hover:bg-amber-50/50 border border-slate-200/90 hover:border-amber-300 rounded-xl text-left shadow-2xs transition-all group"
      >
        <div className="w-9 h-9 rounded-lg bg-amber-600 text-white flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
          <UserPlus className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <div className="text-xs font-bold text-slate-900 group-hover:text-amber-700 truncate">
            Customers & Debts
          </div>
          <div className="text-[11px] text-slate-500 truncate">Manage ledger</div>
        </div>
      </button>
    </div>
  );
};
