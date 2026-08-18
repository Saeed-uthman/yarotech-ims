import React from 'react';
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
  X
} from 'lucide-react';
import { UserRole } from '../../types';

interface SidebarProps {
  currentRole: UserRole;
  onRoleChange: (role: UserRole) => void;
  activeNav: string;
  onNavChange: (nav: string) => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentRole,
  onRoleChange,
  activeNav,
  onNavChange,
  isMobileOpen = false,
  onCloseMobile,
}) => {
  const mainNavItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'products', label: 'Products', icon: Package, badge: 'Active' },
    { id: 'inventory', label: 'Inventory', icon: Boxes, badge: 'Live' },
    { id: 'stock-purchase', label: 'Stock Purchase', icon: ShoppingCart },
    { id: 'customers', label: 'Customers', icon: Users },
    { id: 'sales', label: 'Sales', icon: ShoppingBag },
    { id: 'reports', label: 'Reports', icon: FileText },
  ];

  const otherNavItems = [
    { id: 'accountability', label: 'Accountability', icon: ShieldCheck },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const handleNavClick = (id: string) => {
    onNavChange(id);
    if (onCloseMobile) onCloseMobile();
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-white border-r border-slate-200 text-slate-700 w-64 select-none">
      {/* Brand Header */}
      <div className="p-5 flex items-center justify-between border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center shadow-sm">
            <div className="w-3.5 h-3.5 border-2 border-white rounded-xs"></div>
          </div>
          <div>
            <h1 className="font-bold text-slate-900 text-base leading-tight tracking-tight">
              Stitch <span className="text-blue-600 font-medium text-xs ml-0.5 uppercase tracking-wider">Pharma</span>
            </h1>
            <p className="text-[11px] text-slate-400 font-medium">Products Core</p>
          </div>
        </div>

        {onCloseMobile && (
          <button 
            id="close-mobile-sidebar-btn"
            onClick={onCloseMobile} 
            className="md:hidden p-1.5 rounded-md text-slate-400 hover:bg-slate-100"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Nav List */}
      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-6">
        <div>
          <div className="px-3 mb-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">
            Main Menu
          </div>
          <nav className="space-y-1">
            {mainNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeNav === item.id;
              return (
                <button
                  key={item.id}
                  id={`nav-item-${item.id}`}
                  onClick={() => handleNavClick(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-50 text-blue-700 font-semibold'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.id === 'products' && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-semibold ${
                      isActive ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-600'
                    }`}>
                      Core
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        <div>
          <div className="px-3 mb-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">
            Operations
          </div>
          <nav className="space-y-1">
            {otherNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeNav === item.id;
              return (
                <button
                  key={item.id}
                  id={`nav-item-${item.id}`}
                  onClick={() => handleNavClick(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-50 text-blue-700 font-semibold'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* User Role Card & Switcher */}
      <div className="p-4 border-t border-slate-200 bg-slate-50/80">
        <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-md bg-slate-900 text-white flex items-center justify-center font-semibold text-xs overflow-hidden border border-slate-200">
                {currentRole === 'admin' ? (
                  <UserCheck className="w-4 h-4 text-blue-300" />
                ) : (
                  <User className="w-4 h-4 text-emerald-300" />
                )}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-900 truncate">
                  {currentRole === 'admin' ? 'Admin User' : 'Cashier User'}
                </p>
                <p className="text-[11px] text-slate-500 capitalize">
                  {currentRole === 'admin' ? 'Pharmacy Manager' : 'Sales Staff'}
                </p>
              </div>
            </div>

            <button
              id="toggle-role-quick-btn"
              onClick={() => onRoleChange(currentRole === 'admin' ? 'cashier' : 'admin')}
              title={`Switch to ${currentRole === 'admin' ? 'Cashier' : 'Admin'} mode`}
              className="p-1.5 rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Quick Role Toggle Bar */}
          <div className="flex bg-slate-100 p-0.5 rounded-md text-xs font-semibold">
            <button
              id="role-select-admin-btn"
              onClick={() => onRoleChange('admin')}
              className={`flex-1 py-1 rounded text-center transition-all ${
                currentRole === 'admin' 
                  ? 'bg-white text-blue-700 shadow-xs font-bold' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Admin
            </button>
            <button
              id="role-select-cashier-btn"
              onClick={() => onRoleChange('cashier')}
              className={`flex-1 py-1 rounded text-center transition-all ${
                currentRole === 'cashier' 
                  ? 'bg-white text-emerald-700 shadow-xs font-bold' 
                  : 'text-slate-500 hover:text-slate-800'
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
      <aside className="hidden md:flex flex-shrink-0 h-screen sticky top-0">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Overlay */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div 
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity" 
            onClick={onCloseMobile}
          />
          <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white z-10 animate-in slide-in-from-left duration-200">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
