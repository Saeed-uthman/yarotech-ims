import React from 'react';
import { AlertTriangle, XCircle, ShoppingCart, Sliders, ArrowRight } from 'lucide-react';
import { Product, UserRole } from '../../types';
import { formatNumber } from '../../utils/formatters';

interface ProductLowStockBannerProps {
  product: Product;
  currentRole: UserRole;
  onOpenStockAdjustment?: () => void;
  onReorderStock?: () => void;
}

export const ProductLowStockBanner: React.FC<ProductLowStockBannerProps> = ({
  product,
  currentRole,
  onOpenStockAdjustment,
  onReorderStock,
}) => {
  const isAdmin = currentRole === 'admin';

  // Find all variants that are out of stock or low stock
  const lowVariants = product.variants.filter((v) => v.currentStock <= v.reorderLevel);
  const outVariants = product.variants.filter((v) => v.currentStock === 0);

  if (lowVariants.length === 0) {
    return null;
  }

  const isCritical = outVariants.length > 0;

  return (
    <div
      id="product-low-stock-alert-banner"
      className={`p-4 rounded-xl border mb-6 transition-all ${
        isCritical
          ? 'bg-rose-50/90 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/60 text-rose-950 dark:text-rose-200'
          : 'bg-amber-50/90 dark:bg-amber-950/30 border-amber-300 dark:border-amber-700/60 text-amber-950 dark:text-amber-200'
      }`}
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-xs text-white ${
              isCritical ? 'bg-rose-600' : 'bg-amber-500'
            }`}
          >
            {isCritical ? <XCircle className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-sm font-bold flex items-center gap-1.5">
                <span>{isCritical ? 'Critical Stockout Alert' : 'Low Stock Warning'}</span>
                <span
                  className={`px-2 py-0.5 text-xs font-bold rounded-full ${
                    isCritical
                      ? 'bg-rose-200 dark:bg-rose-800 text-rose-900 dark:text-rose-100'
                      : 'bg-amber-200 dark:bg-amber-800 text-amber-900 dark:text-amber-100'
                  }`}
                >
                  {lowVariants.length} of {product.variants.length} Brands Affected
                </span>
              </h4>
            </div>

            <p className="text-xs mt-1 leading-relaxed opacity-90">
              {lowVariants.map((v) => (
                <span key={v.id} className="inline-block mr-2">
                  • <strong>{v.companyName}</strong>: {v.currentStock} units left (Min threshold: {v.reorderLevel})
                </span>
              ))}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 self-stretch sm:self-auto shrink-0">
          {onOpenStockAdjustment && (
            <button
              type="button"
              onClick={onOpenStockAdjustment}
              className="flex-1 sm:flex-initial px-3 py-1.5 bg-white/80 dark:bg-slate-800 hover:bg-white dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-lg text-xs font-semibold border border-slate-200 dark:border-slate-700 transition-colors flex items-center justify-center gap-1.5"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Adjust Count</span>
            </button>
          )}

          {onReorderStock && (
            <button
              type="button"
              onClick={onReorderStock}
              className={`flex-1 sm:flex-initial px-3.5 py-1.5 text-white rounded-lg text-xs font-bold shadow-xs transition-colors flex items-center justify-center gap-1.5 ${
                isCritical ? 'bg-rose-600 hover:bg-rose-700' : 'bg-amber-600 hover:bg-amber-700'
              }`}
            >
              <ShoppingCart className="w-3.5 h-3.5" />
              <span>Order Stock</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
