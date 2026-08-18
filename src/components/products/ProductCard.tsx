import React from 'react';
import { Product, UserRole } from '../../types';
import { ProductImage } from './ProductImage';
import { ProductStatusBadge } from './ProductStatusBadge';
import { StockStatusBadge } from './StockStatusBadge';
import { 
  getTotalStock, 
  getCompanyCount, 
  getPriceRange, 
  getProductStockStatus 
} from '../../utils/formatters';
import { Eye, Edit3, Power, PlusCircle, Building2 } from 'lucide-react';

interface ProductCardProps {
  product: Product;
  currentRole: UserRole;
  onViewProduct: (product: Product) => void;
  onEditProduct?: (product: Product) => void;
  onDeactivateRequest?: (product: Product) => void;
  onActivateProduct?: (product: Product) => void;
  onAddVariantQuick?: (product: Product) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  currentRole,
  onViewProduct,
  onEditProduct,
  onDeactivateRequest,
  onActivateProduct,
  onAddVariantQuick,
}) => {
  const isAdmin = currentRole === 'admin';
  const totalStock = getTotalStock(product.variants);
  const companyCount = getCompanyCount(product.variants);
  const priceRange = getPriceRange(product.variants, true);
  const stockStatus = getProductStockStatus(product.variants);
  const isInactive = product.status === 'Inactive';

  return (
    <div
      className={`bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden transition-all duration-150 flex flex-col ${
        isInactive ? 'opacity-75 bg-slate-50/50' : 'hover:border-blue-200 hover:shadow-sm'
      }`}
    >
      <div className="p-4 flex gap-3.5 items-start">
        {/* Product Image */}
        <ProductImage
          src={product.image}
          alt={`${product.name} product image`}
          size="md"
          className="flex-shrink-0"
        />

        {/* Product Basic Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <button
              type="button"
              onClick={() => onViewProduct(product)}
              className="text-left font-bold text-sm text-slate-900 hover:text-blue-600 truncate block transition-colors min-h-[24px]"
            >
              {product.name}
            </button>
            <ProductStatusBadge status={product.status} />
          </div>

          <p className="text-xs text-slate-500 truncate mb-2">
            {product.subtitle || `${product.genericName} (${product.dosage})`}
          </p>

          <div className="flex items-center gap-2 flex-wrap text-xs">
            <span className="inline-flex items-center px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium">
              {product.category}
            </span>
            <span className="inline-flex items-center gap-1 text-slate-500 font-mono text-[11px]">
              <Building2 className="w-3 h-3" />
              {companyCount} {companyCount === 1 ? 'brand' : 'brands'}
            </span>
          </div>
        </div>
      </div>

      {/* Stock & Selling Price Bar */}
      <div className="px-4 py-2.5 bg-slate-50/80 border-t border-b border-slate-100 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <span className="text-slate-500 font-medium">Stock:</span>
          <StockStatusBadge
            stock={totalStock}
            statusOverride={stockStatus}
            showCount={true}
          />
        </div>

        <div className="text-right">
          <span className="text-[11px] text-slate-400 block">Retail Price</span>
          <span className="font-mono font-bold text-slate-900">{priceRange}</span>
        </div>
      </div>

      {/* Action Buttons - Ensuring >= 44px touch targets on mobile */}
      <div className="p-3 bg-white flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => onViewProduct(product)}
          className="flex-1 py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-xs transition-colors flex items-center justify-center gap-1.5 min-h-[44px] focus:outline-none focus:ring-2 focus:ring-slate-400"
          aria-label={`View details for ${product.name}`}
        >
          <Eye className="w-4 h-4 text-slate-500" />
          <span>View Details</span>
        </button>

        {isAdmin && onEditProduct && (
          <button
            type="button"
            onClick={() => onEditProduct(product)}
            className="p-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-blue-400"
            aria-label={`Edit ${product.name}`}
            title="Edit Product"
          >
            <Edit3 className="w-4 h-4" />
          </button>
        )}

        {isAdmin && onAddVariantQuick && (
          <button
            type="button"
            onClick={() => onAddVariantQuick(product)}
            className="p-2 text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-emerald-400"
            aria-label={`Add brand variant to ${product.name}`}
            title="Add Manufacturer Variant"
          >
            <PlusCircle className="w-4 h-4" />
          </button>
        )}

        {isAdmin && (
          <button
            type="button"
            onClick={() => {
              if (product.status === 'Active' && onDeactivateRequest) {
                onDeactivateRequest(product);
              } else if (product.status === 'Inactive' && onActivateProduct) {
                onActivateProduct(product);
              }
            }}
            className={`p-2 rounded-lg transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center focus:outline-none focus:ring-2 ${
              product.status === 'Active'
                ? 'text-slate-500 hover:text-rose-600 hover:bg-rose-50 focus:ring-rose-400'
                : 'text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 focus:ring-emerald-400'
            }`}
            aria-label={`${product.status === 'Active' ? 'Deactivate' : 'Activate'} ${product.name}`}
            title={product.status === 'Active' ? 'Deactivate Product' : 'Activate Product'}
          >
            <Power className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};
