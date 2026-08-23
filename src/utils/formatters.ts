import { CompanyVariant } from '../types';

export type StockStatusType = 'In Stock' | 'Low Stock' | 'Out of Stock';

/**
 * Format any numeric value strictly into Nigerian Naira (₦) representation.
 * Examples: ₦500, ₦1,250, ₦15,000.00
 */
export function formatNaira(amount: number, includeDecimals = false): string {
  if (isNaN(amount) || amount === null || amount === undefined) {
    return includeDecimals ? '₦0.00' : '₦0';
  }
  
  const formatted = new Intl.NumberFormat('en-NG', {
    minimumFractionDigits: includeDecimals ? 2 : 0,
    maximumFractionDigits: includeDecimals ? 2 : 0,
  }).format(amount);

  return `₦${formatted}`;
}

export const formatCurrencyNaira = formatNaira;

export function formatCompactNaira(amount: number): string {
  if (isNaN(amount) || amount === null || amount === undefined) return '₦0';
  return `₦${new Intl.NumberFormat('en-US').format(Math.round(amount))}`;
}

export function formatNumber(value: number): string {
  if (isNaN(value) || value === null || value === undefined) return '0';
  return new Intl.NumberFormat('en-US').format(value);
}

/**
 * Derives the strict stock status for a single variant.
 * - Current Stock > Reorder Level => 'In Stock'
 * - Current Stock > 0 AND Current Stock <= Reorder Level => 'Low Stock'
 * - Current Stock = 0 => 'Out of Stock'
 */
export function getVariantStockStatus(currentStock: number, reorderLevel: number): StockStatusType {
  const stock = Number(currentStock) || 0;
  const reorder = Number(reorderLevel) || 0;

  if (stock === 0) {
    return 'Out of Stock';
  }
  if (stock <= reorder) {
    return 'Low Stock';
  }
  return 'In Stock';
}

/**
 * Derives aggregate stock status for a product based on all active/available variants.
 */
export function getProductStockStatus(variants: CompanyVariant[]): StockStatusType {
  if (!variants || variants.length === 0) {
    return 'Out of Stock';
  }

  const activeVariants = variants.filter(v => v.status === 'Available');
  const targetVariants = activeVariants.length > 0 ? activeVariants : variants;

  const totalStock = targetVariants.reduce((sum, v) => sum + (Number(v.currentStock) || 0), 0);
  if (totalStock === 0) {
    return 'Out of Stock';
  }

  const hasLowStock = targetVariants.some(
    v => (Number(v.currentStock) || 0) > 0 && (Number(v.currentStock) || 0) <= (Number(v.reorderLevel) || 0)
  );

  if (hasLowStock) {
    return 'Low Stock';
  }

  return 'In Stock';
}

export function getPriceRange(variants: CompanyVariant[], useSellingPrice = true): string {
  if (!variants || variants.length === 0) return '₦0';
  
  const activeVariants = variants.filter(v => v.status === 'Available');
  const targetVariants = activeVariants.length > 0 ? activeVariants : variants;

  if (useSellingPrice) {
    const minPrices = targetVariants.map(v => {
      if (v.minSellingPrice !== undefined && v.minSellingPrice > 0) return Number(v.minSellingPrice);
      if (v.defaultSellingPrice !== undefined && v.defaultSellingPrice > 0) return Number(v.defaultSellingPrice);
      return Number(v.sellingPrice) || 0;
    });
    const maxPrices = targetVariants.map(v => {
      if (v.maxSellingPrice !== undefined && v.maxSellingPrice > 0) return Number(v.maxSellingPrice);
      if (v.defaultSellingPrice !== undefined && v.defaultSellingPrice > 0) return Number(v.defaultSellingPrice);
      return Number(v.sellingPrice) || 0;
    });

    const min = Math.min(...minPrices);
    const max = Math.max(...maxPrices);

    if (min === max) {
      return formatNaira(min, false);
    }

    return `${formatNaira(min, false)} - ${formatNaira(max, false)}`;
  }

  const prices = targetVariants.map(v => Number(v.basePrice) || 0);

  if (prices.length === 0) return '₦0';

  const min = Math.min(...prices);
  const max = Math.max(...prices);

  if (min === max) {
    return formatNaira(min, false);
  }

  return `${formatNaira(min, false)} - ${formatNaira(max, false)}`;
}

export function getTotalStock(variants: CompanyVariant[]): number {
  if (!variants) return 0;
  return variants.reduce((sum, v) => sum + (Number(v.currentStock) || 0), 0);
}

export function getCompanyCount(variants: CompanyVariant[]): number {
  if (!variants) return 0;
  const companies = new Set(variants.map(v => v.companyName.trim()));
  return companies.size;
}

export function isLowStock(variants: CompanyVariant[]): boolean {
  return getProductStockStatus(variants) === 'Low Stock';
}

/**
 * Calculates Inventory Value strictly at Base Price (Admin only):
 * Inventory Value = Current Stock × Base Price
 */
export function calculateInventoryValue(variants: CompanyVariant[]): number {
  if (!variants) return 0;
  return variants.reduce((total, v) => {
    return total + ((Number(v.currentStock) || 0) * (Number(v.basePrice) || 0));
  }, 0);
}

/**
 * Calculates current unit price margin (Selling Price - Base Price).
 * Note: Clearly labeled as current margin/difference, not historical realized profit.
 */
export function calculateUnitMargin(sellingPrice: number, basePrice: number): {
  marginAmount: number;
  marginPercent: number;
} {
  const selling = Number(sellingPrice) || 0;
  const base = Number(basePrice) || 0;
  const marginAmount = selling - base;
  const marginPercent = selling > 0 ? (marginAmount / selling) * 100 : 0;

  return {
    marginAmount,
    marginPercent: Math.round(marginPercent * 10) / 10,
  };
}
