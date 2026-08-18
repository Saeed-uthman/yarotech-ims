import { MOCK_CATEGORIES, MOCK_COMPANIES, MOCK_PRODUCTS, MOCK_PRODUCT_VARIANTS } from './mock';
import { Product, ProductCategory, Company, CompanyVariant } from '../types';

export const INITIAL_CATEGORIES: ProductCategory[] = MOCK_CATEGORIES;
export const INITIAL_COMPANIES: Company[] = MOCK_COMPANIES;

// Helper to hydrate products with category name and company variants for initial compatibility
export function hydrateMockProducts(): Product[] {
  const companyMap = new Map<string, string>(MOCK_COMPANIES.map(c => [c.id, c.name]));
  const categoryMap = new Map<string, string>(MOCK_CATEGORIES.map(c => [c.id, c.name]));

  return MOCK_PRODUCTS.map(p => {
    const variants: CompanyVariant[] = MOCK_PRODUCT_VARIANTS
      .filter(v => v.productId === p.id)
      .map(v => ({
        ...v,
        companyName: companyMap.get(v.companyId) || 'Unknown Manufacturer',
      }));

    return {
      ...p,
      category: categoryMap.get(p.categoryId) || 'General',
      variants,
    };
  });
}

export const INITIAL_PRODUCTS: Product[] = hydrateMockProducts();
export * from './mock';
