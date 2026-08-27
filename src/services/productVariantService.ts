import {
  CompanyVariant,
  Product,
  ProductVariantInput,
  ProductVariantEntity,
  UserRole,
  ApiResponse,
} from '../types';
import { api, ApiError, toCamelCaseKeys } from './apiClient';
import { apiCache } from './apiCache';

function mapBackendVariant(raw: any): CompanyVariant {
  const v = toCamelCaseKeys(raw);
  return {
    id: String(v.id),
    productId: '',
    companyId: String(v.company?.id || ''),
    companyName: v.company?.name || '',
    basePrice: Number(v.basePrice || 0),
    minSellingPrice: Number(v.minSellingPrice || 0),
    defaultSellingPrice: Number(v.defaultSellingPrice || 0),
    maxSellingPrice: Number(v.maxSellingPrice || 0),
    sellingPrice: Number(v.defaultSellingPrice || 0),
    currentStock: Number(v.currentStock || 0),
    reorderLevel: Number(v.reorderLevel || 0),
    status: v.status === 'Available' ? 'Available' : 'Inactive',
    createdAt: v.createdAt || '',
    updatedAt: v.updatedAt || '',
  };
}

function mapBackendProduct(raw: any): Product {
  const p = toCamelCaseKeys(raw);
  return {
    id: String(p.id),
    name: p.name,
    genericName: p.genericName,
    categoryId: String(p.category?.id || ''),
    category: p.category?.name || '',
    dosage: p.dosage || '',
    form: p.dosageForm || '',
    barcode: p.barcode || '',
    description: p.description || '',
    subtitle: p.subtitle || '',
    image: p.image || undefined,
    status: p.status === 'Active' ? 'Active' : 'Inactive',
    variants: (p.variants || []).map((v: any) => {
      const cv = mapBackendVariant(v);
      return { ...cv, productId: String(p.id) };
    }),
    createdAt: p.createdAt || '',
    updatedAt: p.updatedAt || '',
  };
}

async function refetchProduct(productId: string): Promise<ApiResponse<Product>> {
  const res = await api.get<any>(`/products/${productId}/`);
  return { success: true, data: mapBackendProduct(res.data) };
}

export class ProductVariantService {
  /**
   * Retrieve company variants for a product from backend
   */
  public async getVariants(
    productId: string,
    _role: UserRole = 'admin'
  ): Promise<ApiResponse<CompanyVariant[]>> {
    const key = apiCache.generateKey(`variants:${productId}`);
    return apiCache.deduplicate(key, async () => {
      try {
        const res = await api.get<any>(`/products/${productId}/`);
        const variants = (res.data?.variants || []).map(mapBackendVariant);
        return { success: true, data: variants };
      } catch (err) {
        if (err instanceof ApiError) throw err;
        throw new Error('Failed to fetch variants.');
      }
    });
  }

  /**
   * Add a new manufacturer variant to an existing product
   */
  public async createVariant(
    productId: string,
    input: ProductVariantInput,
    _role: UserRole = 'admin'
  ): Promise<ApiResponse<Product>> {
    try {
      const payload = {
        company_id: input.companyId ? Number(input.companyId) : undefined,
        base_price: input.basePrice,
        min_selling_price: input.minSellingPrice,
        default_selling_price: input.defaultSellingPrice,
        max_selling_price: input.maxSellingPrice,
        current_stock: input.currentStock,
        reorder_level: input.reorderLevel,
      };

      await api.post<any>(`/products/${productId}/variants/`, payload);
      apiCache.invalidateByPrefix('products:');
      apiCache.invalidateByPrefix('kpi:');
      return refetchProduct(productId);
    } catch (err) {
      if (err instanceof ApiError) throw err;
      throw new Error('Failed to add variant.');
    }
  }

  /**
   * Update an existing manufacturer variant
   */
  public async updateVariant(
    productId: string,
    variantId: string,
    updates: Partial<ProductVariantEntity>,
    _role: UserRole = 'admin'
  ): Promise<ApiResponse<Product>> {
    try {
      const payload: any = {};
      if (updates.basePrice !== undefined) payload.base_price = updates.basePrice;
      if (updates.minSellingPrice !== undefined) payload.min_selling_price = updates.minSellingPrice;
      if (updates.defaultSellingPrice !== undefined) payload.default_selling_price = updates.defaultSellingPrice;
      if (updates.maxSellingPrice !== undefined) payload.max_selling_price = updates.maxSellingPrice;
      if (updates.currentStock !== undefined) payload.current_stock = updates.currentStock;
      if (updates.reorderLevel !== undefined) payload.reorder_level = updates.reorderLevel;
      if (updates.status !== undefined) {
        payload.status = updates.status === 'Available' ? 'Available' : 'Inactive';
      }

      await api.patch<any>(`/products/variants/${variantId}/`, payload);
      apiCache.invalidateByPrefix('products:');
      apiCache.invalidateByPrefix('kpi:');
      return refetchProduct(productId);
    } catch (err) {
      if (err instanceof ApiError) throw err;
      throw new Error('Failed to update variant.');
    }
  }

  /**
   * Remove a manufacturer variant (deactivate via status)
   */
  public async deleteVariant(
    productId: string,
    variantId: string,
    _role: UserRole = 'admin'
  ): Promise<ApiResponse<Product>> {
    try {
      await api.patch<any>(`/products/variants/${variantId}/`, { status: 'Inactive' });
      apiCache.invalidateByPrefix('products:');
      apiCache.invalidateByPrefix('kpi:');
      return refetchProduct(productId);
    } catch (err) {
      if (err instanceof ApiError) throw err;
      throw new Error('Failed to remove variant.');
    }
  }

  /**
   * Toggle variant availability status
   */
  public async toggleVariantStatus(
    productId: string,
    variantId: string,
    currentStatus: 'Available' | 'Inactive',
    role: UserRole = 'admin'
  ): Promise<ApiResponse<Product>> {
    const newStatus = currentStatus === 'Available' ? 'Inactive' : 'Available';
    return this.updateVariant(productId, variantId, { status: newStatus }, role);
  }
}

export const productVariantService = new ProductVariantService();
