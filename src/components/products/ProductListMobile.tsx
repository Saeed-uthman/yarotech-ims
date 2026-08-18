import React from 'react';
import { Product, UserRole } from '../../types';
import { ProductCard } from './ProductCard';
import { ProductEmptyState } from './ProductEmptyState';

interface ProductListMobileProps {
  products: Product[];
  currentRole: UserRole;
  isLoading?: boolean;
  onViewProduct: (product: Product) => void;
  onEditProduct: (product: Product) => void;
  onDeactivateRequest: (product: Product) => void;
  onActivateProduct: (product: Product) => void;
  onAddVariantQuick: (product: Product) => void;
  onResetFilters?: () => void;
}

export const ProductListMobile: React.FC<ProductListMobileProps> = ({
  products,
  currentRole,
  isLoading = false,
  onViewProduct,
  onEditProduct,
  onDeactivateRequest,
  onActivateProduct,
  onAddVariantQuick,
  onResetFilters,
}) => {
  if (isLoading) {
    return (
      <div className="space-y-3 pb-6" role="status" aria-label="Loading products">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={`mob-skeleton-${i}`}
            className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs animate-pulse space-y-3"
          >
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-lg bg-slate-200 flex-shrink-0" />
              <div className="space-y-2 flex-1">
                <div className="h-4 w-32 bg-slate-200 rounded" />
                <div className="h-3 w-44 bg-slate-100 rounded" />
              </div>
            </div>
            <div className="h-8 bg-slate-100 rounded-md" />
            <div className="h-10 bg-slate-100 rounded-lg" />
          </div>
        ))}
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <ProductEmptyState
        title="No products found"
        description="Try adjusting your search terms or filter selection"
        isFiltered={true}
        onResetFilters={onResetFilters}
      />
    );
  }

  return (
    <div className="space-y-3 pb-6" role="region" aria-label="Product list mobile cards">
      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          currentRole={currentRole}
          onViewProduct={onViewProduct}
          onEditProduct={onEditProduct}
          onDeactivateRequest={onDeactivateRequest}
          onActivateProduct={onActivateProduct}
          onAddVariantQuick={onAddVariantQuick}
        />
      ))}
    </div>
  );
};
