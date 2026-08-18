import {
  Product,
  ProductCategory,
  Company,
  ProductCreateInput,
  ProductUpdateInput,
  ProductFilterParams,
  ProductKPIStats,
  UserRole,
  ApiResponse,
  ProductVariantInput,
} from '../types';
import { mockRepository } from './mockRepository';
import { apiCache } from './apiCache';
import { categoryService } from './categoryService';
import { companyService } from './companyService';
import { productVariantService } from './productVariantService';

export class ProductService {
  /**
   * Fetch paginated and filtered products list
   * Implements in-flight request deduplication and deterministic cache keys
   */
  public async getProducts(
    params?: Partial<ProductFilterParams>,
    role: UserRole = 'admin'
  ): Promise<ApiResponse<Product[]>> {
    const key = apiCache.generateKey('products:list', {
      search: params?.search || '',
      category: params?.category || '',
      status: params?.status || '',
      company: params?.company || '',
      stockStatus: params?.stockStatus || 'all',
      sortBy: params?.sortBy || 'name',
      sortOrder: params?.sortOrder || 'asc',
      page: params?.page || 1,
      limit: params?.limit || 10,
      role,
    });

    return apiCache.deduplicate(key, async () => {
      const response = await mockRepository.queryProducts(params, role);
      apiCache.set(key, response, 30 * 1000); // 30s cache
      return response;
    });
  }

  /**
   * Search products with automatic deduplication
   */
  public async searchProducts(
    query: string,
    params?: Partial<ProductFilterParams>,
    role: UserRole = 'admin'
  ): Promise<ApiResponse<Product[]>> {
    return this.getProducts({ ...params, search: query }, role);
  }

  /**
   * Get single product by unique ID
   */
  public async getProductById(
    id: string,
    role: UserRole = 'admin'
  ): Promise<ApiResponse<Product>> {
    const key = apiCache.generateKey(`product:${id}`, { role });
    return apiCache.deduplicate(key, async () => {
      const response = await mockRepository.getProductById(id, role);
      apiCache.set(key, response, 60 * 1000);
      return response;
    });
  }

  /**
   * Find product by Barcode
   */
  public async getProductByBarcode(
    barcode: string,
    role: UserRole = 'admin'
  ): Promise<ApiResponse<Product>> {
    const key = apiCache.generateKey(`product:barcode:${barcode}`, { role });
    return apiCache.deduplicate(key, () =>
      mockRepository.getProductByBarcode(barcode, role)
    );
  }

  /**
   * Create a new product with manufacturer variants
   * Invalidates product list cache upon success
   */
  public async createProduct(
    input: ProductCreateInput,
    role: UserRole = 'admin'
  ): Promise<ApiResponse<Product>> {
    const response = await mockRepository.createProduct(input, role);
    apiCache.invalidateProducts(response.data.id);
    return response;
  }

  /**
   * Update an existing product
   * Invalidates product list and item cache
   */
  public async updateProduct(
    id: string,
    updates: ProductUpdateInput,
    role: UserRole = 'admin'
  ): Promise<ApiResponse<Product>> {
    const response = await mockRepository.updateProduct(id, updates, role);
    apiCache.invalidateProducts(id);
    return response;
  }

  /**
   * Deactivate a product (soft deactivation preserving historical data)
   */
  public async deactivateProduct(
    id: string,
    role: UserRole = 'admin'
  ): Promise<ApiResponse<Product>> {
    const response = await mockRepository.setProductStatus(id, 'Inactive', role);
    apiCache.invalidateProducts(id);
    return response;
  }

  /**
   * Reactivate an inactive product
   */
  public async activateProduct(
    id: string,
    role: UserRole = 'admin'
  ): Promise<ApiResponse<Product>> {
    const response = await mockRepository.setProductStatus(id, 'Active', role);
    apiCache.invalidateProducts(id);
    return response;
  }

  /**
   * Fetch aggregate KPI statistics
   */
  public async getKPIStats(role: UserRole = 'admin'): Promise<ApiResponse<ProductKPIStats>> {
    const key = apiCache.generateKey('kpi:stats', { role });
    return apiCache.deduplicate(key, async () => {
      const response = await mockRepository.getKPIStats(role);
      apiCache.set(key, response, 30 * 1000);
      return response;
    });
  }

  // ==========================================
  // Delegation helpers for Categories & Companies
  // ==========================================

  public async getCategories(): Promise<ApiResponse<ProductCategory[]>> {
    return categoryService.getCategories();
  }

  public async getCompanies(): Promise<ApiResponse<Company[]>> {
    return companyService.getCompanies();
  }

  public async addVariant(
    productId: string,
    input: ProductVariantInput,
    role: UserRole = 'admin'
  ): Promise<ApiResponse<Product>> {
    return productVariantService.createVariant(productId, input, role);
  }

  public async updateVariant(
    productId: string,
    variantId: string,
    updates: any,
    role: UserRole = 'admin'
  ): Promise<ApiResponse<Product>> {
    return productVariantService.updateVariant(productId, variantId, updates, role);
  }

  public async deleteVariant(
    productId: string,
    variantId: string,
    role: UserRole = 'admin'
  ): Promise<ApiResponse<Product>> {
    return productVariantService.deleteVariant(productId, variantId, role);
  }

  // ==========================================
  // Dev & Reset utilities
  // ==========================================

  public resetToDefaults(): void {
    mockRepository.resetDatabase();
    apiCache.clear();
  }
}

export const productService = new ProductService();
