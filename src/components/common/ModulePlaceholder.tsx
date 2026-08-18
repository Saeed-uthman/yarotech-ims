import React from 'react';
import { Package, ArrowRight, Layers, ShieldCheck, ShoppingCart, ShoppingBag, Users, FileText } from 'lucide-react';

interface ModulePlaceholderProps {
  moduleName: string;
  onGoToProducts: () => void;
}

export const ModulePlaceholder: React.FC<ModulePlaceholderProps> = ({
  moduleName,
  onGoToProducts,
}) => {
  const getIcon = () => {
    switch (moduleName) {
      case 'inventory': return <Layers className="w-10 h-10 text-indigo-500" />;
      case 'stock-purchase': return <ShoppingCart className="w-10 h-10 text-emerald-500" />;
      case 'customers': return <Users className="w-10 h-10 text-amber-500" />;
      case 'sales': return <ShoppingBag className="w-10 h-10 text-rose-500" />;
      case 'reports': return <FileText className="w-10 h-10 text-blue-500" />;
      case 'accountability': return <ShieldCheck className="w-10 h-10 text-purple-500" />;
      default: return <Package className="w-10 h-10 text-indigo-500" />;
    }
  };

  const getTitle = () => {
    const map: Record<string, string> = {
      dashboard: 'Pharmacy Executive Dashboard',
      inventory: 'Inventory & Stock Level Management',
      'stock-purchase': 'Stock Purchases & Procurement',
      customers: 'Pharmacy Customers & Account History',
      sales: 'Point of Sale (POS) & Checkout',
      reports: 'Financial & Movement Reports',
      accountability: 'Audit & Accountability Ledger',
      settings: 'System Preferences & Configurations',
    };
    return map[moduleName] || 'Module Overview';
  };

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-8 sm:p-12 text-center max-w-xl mx-auto my-8 shadow-xs animate-in fade-in duration-200">
      <div className="w-16 h-16 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center mx-auto mb-4">
        {getIcon()}
      </div>
      <h2 className="text-xl font-bold text-slate-900 mb-2">{getTitle()}</h2>
      <p className="text-sm text-slate-500 mb-6 leading-relaxed">
        This module directly relies on the central <strong className="text-blue-600">Products Module</strong> catalogue, manufacturer variants, and pricing structures currently being managed.
      </p>
      <button
        onClick={onGoToProducts}
        className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-semibold shadow-xs transition-all"
      >
        <span>Manage Pharmacy Products</span>
        <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
};
