import React from 'react';
import { getVariantStockStatus, StockStatusType } from '../../utils/formatters';

interface StockStatusBadgeProps {
  stock?: number;
  reorderLevel?: number;
  statusOverride?: StockStatusType;
  showCount?: boolean;
  className?: string;
}

export const StockStatusBadge: React.FC<StockStatusBadgeProps> = ({
  stock = 0,
  reorderLevel = 0,
  statusOverride,
  showCount = false,
  className = '',
}) => {
  const derivedStatus: StockStatusType = statusOverride || getVariantStockStatus(stock, reorderLevel);

  const getStatusStyles = () => {
    switch (derivedStatus) {
      case 'In Stock':
        return {
          container: 'bg-emerald-50 text-emerald-800 border-emerald-200',
          dot: 'bg-emerald-500',
        };
      case 'Low Stock':
        return {
          container: 'bg-amber-50 text-amber-800 border-amber-200',
          dot: 'bg-amber-500',
        };
      case 'Out of Stock':
        return {
          container: 'bg-rose-50 text-rose-800 border-rose-200',
          dot: 'bg-rose-500',
        };
      default:
        return {
          container: 'bg-slate-100 text-slate-700 border-slate-200',
          dot: 'bg-slate-400',
        };
    }
  };

  const styles = getStatusStyles();

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border select-none ${styles.container} ${className}`}
      role="status"
      aria-label={`Stock level: ${derivedStatus}${showCount ? ` (${stock} units)` : ''}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${styles.dot}`} aria-hidden="true" />
      <span>{derivedStatus}</span>
      {showCount && <span className="font-mono text-[11px] opacity-80">({stock})</span>}
    </span>
  );
};
