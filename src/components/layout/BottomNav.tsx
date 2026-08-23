import React from 'react';
import { LayoutDashboard, Package, Boxes, ShoppingBag, Users, MoreHorizontal } from 'lucide-react';
import { UserRole } from '../../types';
import { usePermissions } from '../../hooks';

interface BottomNavProps {
  activeNav: string;
  onNavChange: (nav: string) => void;
  onOpenMoreMenu: () => void;
  role?: UserRole;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeNav,
  onNavChange,
  onOpenMoreMenu,
  role,
}) => {
  const permissions = usePermissions(role);

  const items = permissions.isAdmin
    ? [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'sales', label: 'Sales/POS', icon: ShoppingBag },
        { id: 'products', label: 'Products', icon: Package },
        { id: 'inventory', label: 'Inventory', icon: Boxes },
        { id: 'customers', label: 'Customers', icon: Users },
      ]
    : [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'sales', label: 'Sales/POS', icon: ShoppingBag },
        { id: 'products', label: 'Products', icon: Package },
        { id: 'inventory', label: 'Inventory', icon: Boxes },
        { id: 'customers', label: 'Customers', icon: Users },
      ];

  return (
    <nav 
      aria-label="Mobile Bottom Navigation"
      className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 px-2 py-1 z-40 flex items-center justify-around shadow-lg"
    >
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = activeNav === item.id;
        return (
          <button
            key={item.id}
            id={`bottom-nav-${item.id}`}
            onClick={() => onNavChange(item.id)}
            aria-current={isActive ? 'page' : undefined}
            className={`flex flex-col items-center justify-center py-1.5 px-2.5 rounded-lg text-[11px] font-medium transition-colors min-h-[44px] min-w-[56px] focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              isActive 
                ? 'text-blue-600 dark:text-blue-400 font-bold' 
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Icon className={`w-5 h-5 mb-0.5 ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 dark:text-slate-500'}`} />
            <span className="truncate max-w-[64px]">{item.label}</span>
          </button>
        );
      })}
      <button
        id="bottom-nav-more"
        onClick={onOpenMoreMenu}
        aria-label="Open complete menu and modules drawer"
        className="flex flex-col items-center justify-center py-1.5 px-2.5 rounded-lg text-[11px] font-medium text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors min-h-[44px] min-w-[56px] focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <MoreHorizontal className="w-5 h-5 mb-0.5 text-slate-400 dark:text-slate-500" />
        <span>More</span>
      </button>
    </nav>
  );
};
