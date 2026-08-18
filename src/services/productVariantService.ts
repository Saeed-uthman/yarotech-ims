import {
  CompanyVariant,
  Product,
  ProductVariantInput,
  ProductVariantEntity,
  UserRole,
  ApiResponse,
} from '../types';
import { mockRepository } from './mockRepository';
import { apiCache } from './apiCache';

export class ProductVariantService {
  /**
   * Retrieve company variants for a product
   */
  public async getVariants(
    productId: string,
    role: UserRole = 'admin'
  ): Promise<ApiResponse<CompanyVariant[]>> {
    const key = apiCache.generateKey(`variants:${productId}`, { role });
    return apiCache.deduplicate(key, () =>
      mockRepository.getVariantsByProductId(productId, role)
    );
  }

  /**
   * Add a new manufacturer variant to an existing product
   * Authoritative financial operation: waits for database persistence
   */
  public async createVariant(
    productId: string,
    input: ProductVariantInput,
    role: UserRole = 'admin'
  ): Promise<ApiResponse<Product>> {
    const result = await mockRepository.addVariant(productId, input, role);
    apiCache.invalidateProducts(productId);
    return result;
  }

  /**
   * Update an existing manufacturer variant (stock, pricing, reorder levels)
   * Authoritative financial operation: waits for database persistence
   */
  public async updateVariant(
    productId: string,
    variantId: string,
    updates: Partial<ProductVariantEntity>,
    role: UserRole = 'admin'
  ): Promise<ApiResponse<Product>> {
    const result = await mockRepository.updateVariant(productId, variantId, updates, role);
    apiCache.invalidateProducts(productId);
    return result;
  }

  /**
   * Remove a manufacturer variant
   */
  public async deleteVariant(
    productId: string,
    variantId: string,
    role: UserRole = 'admin'
  ): Promise<ApiResponse<Product>> {
    const result = await mockRepository.deleteVariant(productId, variantId, role);
    apiCache.invalidateProducts(productId);
    return result;
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
