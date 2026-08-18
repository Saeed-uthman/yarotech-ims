import React from 'react';
import { ProductStatus } from '../../types';

interface ProductStatusBadgeProps {
  status: ProductStatus | 'Available' | 'Inactive';
  className?: string;
  showDot?: boolean;
}

export const ProductStatusBadge: React.FC<ProductStatusBadgeProps> = ({
  status,
  className = '',
  showDot = true,
}) => {
  const isActive = status === 'Active' || status === 'Available';

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold select-none transition-colors ${
        isActive
          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
          : 'bg-slate-100 text-slate-600 border border-slate-200'
      } ${className}`}
      role="status"
      aria-label={`Product status: ${isActive ? 'Active' : 'Inactive'}`}
    >
      {showDot && (
        <span
          className={`w-1.5 h-1.5 rounded-full ${
            isActive ? 'bg-emerald-500' : 'bg-slate-400'
          }`}
          aria-hidden="true"
        />
      )}
      <span>{isActive ? 'Active' : 'Inactive'}</span>
    </span>
  );
};
