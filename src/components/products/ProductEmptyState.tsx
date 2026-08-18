import React from 'react';
import { Pill, RefreshCw, FilterX } from 'lucide-react';

interface ProductEmptyStateProps {
  title?: string;
  description?: string;
  isFiltered?: boolean;
  onResetFilters?: () => void;
  onRetry?: () => void;
}

export const ProductEmptyState: React.FC<ProductEmptyStateProps> = ({
  title = 'No products found',
  description = 'Try adjusting your search terms, changing filters, or clear all filters to see more results.',
  isFiltered = false,
  onResetFilters,
  onRetry,
}) => {
  return (
    <div
      className="p-12 text-center bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col items-center justify-center animate-in fade-in duration-200"
      role="region"
      aria-live="polite"
    >
      <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-3 text-slate-400">
        {isFiltered ? (
          <FilterX className="w-6 h-6 text-slate-400 stroke-[1.5]" />
        ) : (
          <Pill className="w-6 h-6 text-slate-400 stroke-[1.5]" />
        )}
      </div>
      <h3 className="text-base font-bold text-slate-800 mb-1">{title}</h3>
      <p className="text-xs text-slate-500 max-w-sm mb-6 leading-relaxed">
        {description}
      </p>

      <div className="flex items-center gap-3">
        {isFiltered && onResetFilters && (
          <button
            onClick={onResetFilters}
            type="button"
            className="px-4 py-2 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors inline-flex items-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 min-h-[44px]"
          >
            <FilterX className="w-3.5 h-3.5" />
            <span>Reset All Filters</span>
          </button>
        )}
        {onRetry && (
          <button
            onClick={onRetry}
            type="button"
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors inline-flex items-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-1 min-h-[44px]"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh Catalogue</span>
          </button>
        )}
      </div>
    </div>
  );
};
