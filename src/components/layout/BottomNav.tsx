import React from 'react';
import { LayoutDashboard, Package, Boxes, ShoppingBag, MoreHorizontal } from 'lucide-react';

interface BottomNavProps {
  activeNav: string;
  onNavChange: (nav: string) => void;
  onOpenMoreMenu: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeNav,
  onNavChange,
  onOpenMoreMenu,
}) => {
  const items = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'products', label: 'Products', icon: Package },
    { id: 'inventory', label: 'Inventory', icon: Boxes },
    { id: 'sales', label: 'Sales', icon: ShoppingBag },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-200 px-2 py-1.5 z-40 flex items-center justify-around shadow-lg">
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = activeNav === item.id;
        return (
          <button
            key={item.id}
            id={`bottom-nav-${item.id}`}
            onClick={() => onNavChange(item.id)}
            className={`flex flex-col items-center justify-center py-1 px-3 rounded-md text-[11px] font-medium transition-colors ${
              isActive ? 'text-blue-600 font-bold' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Icon className={`w-5 h-5 mb-0.5 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
            <span>{item.label}</span>
          </button>
        );
      })}
      <button
        id="bottom-nav-more"
        onClick={onOpenMoreMenu}
        className="flex flex-col items-center justify-center py-1 px-3 rounded-md text-[11px] font-medium text-slate-500 hover:text-slate-800 transition-colors"
      >
        <MoreHorizontal className="w-5 h-5 mb-0.5 text-slate-400" />
        <span>More</span>
      </button>
    </div>
  );
};
