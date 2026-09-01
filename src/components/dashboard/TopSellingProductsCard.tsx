import React from 'react';
import { 
  DashboardTopProduct, 
  UserRole 
} from '../../types';
import { 
  Award, 
  ArrowRight, 
  Package, 
  Building2, 
  Layers 
} from 'lucide-react';

interface TopSellingProductsCardProps {
  topProducts: DashboardTopProduct[];
  role: UserRole;
  onNavigate: (module: string) => void;
}

export const TopSellingProductsCard: React.FC<TopSellingProductsCardProps> = ({
  topProducts,
  role,
  onNavigate,
}) => {
  const isAdmin = role === 'admin';

  return (
    <div className="bg-white rounded-xl border border-slate-200/90 p-4 sm:p-6 shadow-xs flex flex-col justify-between" id="top-selling-products-card">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-500" />
              <span>Top-Selling Products</span>
            </h3>
            <p className="text-xs text-slate-500">
              Highest sales volume in selected period (variant-specific)
            </p>
          </div>

          <button
            type="button"
            onClick={() => onNavigate('sales')}
            className="text-xs font-semibold text-blue-600 hover:text-blue-700 inline-flex items-center gap-1 group"
          >
            <span>Sales Report</span>
            <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>

        {topProducts.length === 0 ? (
          <div className="py-10 text-center text-slate-400 text-xs">
            <Package className="w-8 h-8 mx-auto text-slate-300 mb-2" />
            <p>No sales activity recorded for this period.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {topProducts.map((p, idx) => (
              <div
                key={`${p.productId}_${p.variantId}_${idx}`}
                className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-3 group"
              >
                {/* Rank & Product Info */}
                <div className="flex items-start gap-2.5 min-w-0">
                  <div className="w-6 h-6 rounded-md bg-slate-100 text-slate-700 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-blue-50 group-hover:text-blue-700 transition-colors">
                    #{idx + 1}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-900 truncate">
                      {p.productName}
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-500 truncate">
                      <span className="font-medium text-slate-700">{p.companyName}</span>
                      {p.genericName && (
                        <>
                          <span>•</span>
                          <span className="text-slate-400 truncate">{p.genericName}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Performance Stats */}
                <div className="text-right shrink-0">
                  <div className="text-xs font-bold text-slate-900">
                    {p.unitsSold} units
                  </div>
                  <div className="text-[11px] text-slate-500 font-medium">
                    ₦{p.revenue.toLocaleString()}
                  </div>
                  {isAdmin && (
                    <div className="text-[10px] text-emerald-600 font-semibold">
                      +₦{p.profit.toLocaleString()} profit
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="pt-3 mt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
        <span>Distinct by manufacturer brand</span>
        <button
          type="button"
          onClick={() => onNavigate('products')}
          className="text-slate-600 hover:text-slate-900 font-medium underline"
        >
          View Product Catalog
        </button>
      </div>
    </div>
  );
};
