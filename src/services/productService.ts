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
  CompanyVariant,
} from '../types';
import { api, ApiError, mapPaginationMeta, toCamelCaseKeys, toSnakeCaseKeys } from './apiClient';
import { apiCache } from './apiCache';
import { categoryService } from './categoryService';
import { companyService } from './companyService';

// ==========================================
// Backend → Frontend Transform Helpers
// ==========================================

export function mapBackendProduct(raw: any): Product {
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
    variants: (p.variants || []).map((variant: any) => ({
      ...mapBackendVariant(variant),
      productId: String(p.id),
    })),
    createdAt: p.createdAt || '',
    updatedAt: p.updatedAt || '',
  };
}

export function mapBackendVariant(raw: any): CompanyVariant {
  const v = toCamelCaseKeys(raw);
  return {
    id: String(v.id),
    productId: '', // populated by parent
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

function mapStockStatusFilter(backendValue: ProductFilterParams['stockStatus']): string | undefined {
  switch (backendValue) {
    case 'in_stock': return 'available';
    case 'low_stock': return 'low';
    case 'out_of_stock': return 'out';
    default: return undefined;
  }
}

function mapCategoryFilterId(categories: ProductCategory[], categoryName: string): string | undefined {
  if (!categoryName || categoryName === 'All Categories') return undefined;
  const cat = categories.find((c) => c.name === categoryName);
  return cat?.id;
}

function mapCompanyFilterId(companies: Company[], companyName: string): string | undefined {
  if (!companyName || companyName === 'All') return undefined;
  const comp = companies.find((c) => c.name === companyName);
  return comp?.id;
}

// ==========================================
// Product Service
// ==========================================

export class ProductService {
  /**
   * Fetch paginated and filtered products list from backend.
   * Filtering and pagination are performed by Django.
   */
  public async getProducts(
    params?: Partial<ProductFilterParams>,
    _role: UserRole = 'admin'
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
    });

    return apiCache.deduplicate(key, async () => {
      try {
        const queryParams: Record<string, any> = {};
        if (params?.search) queryParams.search = params.search;
        queryParams.page = params?.page || 1;
        queryParams.per_page = params?.limit || 10;
        if (params?.stockStatus && params.stockStatus !== 'all') {
          const mapped = mapStockStatusFilter(params.stockStatus);
          if (mapped) queryParams.stock_status = mapped;
        }

        if (params?.category && params.category !== 'All Categories') {
          const refRes = await categoryService.getCategories();
          const catId = mapCategoryFilterId(refRes.data || [], params.category);
          if (catId) queryParams.category = catId;
        }

        if (params?.company && params.company !== 'All') {
          const refRes = await companyService.getCompanies();
          const compId = mapCompanyFilterId(refRes.data || [], params.company);
          if (compId) queryParams.company = compId;
        }

        if (params?.status && params.status !== 'All Status') {
          queryParams.status = params.status;
        }

        queryParams.ordering = `${params?.sortOrder === 'desc' ? '-' : ''}${params?.sortBy || 'name'}`;

        const res = await api.get<any>('/products/', queryParams);
        const products: Product[] = (res.data || []).map(mapBackendProduct);

        // Client-side sorting
        const sortBy = params?.sortBy || 'name';
        const sortOrder = params?.sortOrder || 'asc';
        products.sort((a: Product, b: Product) => {
          let cmp = 0;
          switch (sortBy) {
            case 'name': cmp = a.name.localeCompare(b.name); break;
            case 'genericName': cmp = a.genericName.localeCompare(b.genericName); break;
            case 'stock': cmp = a.variants.reduce((s, v) => s + v.currentStock, 0) - b.variants.reduce((s, v) => s + v.currentStock, 0); break;
            case 'price': cmp = (a.variants[0]?.defaultSellingPrice || 0) - (b.variants[0]?.defaultSellingPrice || 0); break;
            case 'basePrice': cmp = (a.variants[0]?.basePrice || 0) - (b.variants[0]?.basePrice || 0); break;
            case 'date': cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(); break;
            default: cmp = a.name.localeCompare(b.name);
          }
          return sortOrder === 'asc' ? cmp : -cmp;
        });

        const response: ApiResponse<Product[]> = {
          success: true,
          data: products,
          meta: mapPaginationMeta(res.meta),
        };
        apiCache.set(key, response, 30 * 1000);
        return response;
      } catch (err) {
        if (err instanceof ApiError) {
          throw err;
        }
        throw new Error('Failed to fetch products.');
      }
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
   * Get single product by ID from backend
   */
  public async getProductById(
    id: string,
    _role: UserRole = 'admin'
  ): Promise<ApiResponse<Product>> {
    const key = apiCache.generateKey(`product:${id}`);
    return apiCache.deduplicate(key, async () => {
      try {
        const res = await api.get<any>(`/products/${id}/`);
        const product = mapBackendProduct(res.data);
        return { success: true, data: product };
      } catch (err) {
        if (err instanceof ApiError) throw err;
        throw new Error('Failed to fetch product.');
      }
    });
  }

  /**
   * Find product by Barcode (client-side search since backend doesn't have barcode endpoint)
   */
  public async getProductByBarcode(
    barcode: string,
    role: UserRole = 'admin'
  ): Promise<ApiResponse<Product>> {
    try {
      const res = await this.getProducts({ search: barcode, limit: 100 }, role);
      const match = res.data?.find((p) => p.barcode === barcode);
      if (match) return { success: true, data: match };
      throw new Error('Product not found for this barcode.');
    } catch (err) {
      if (err instanceof ApiError) throw err;
      throw new Error('Product not found for this barcode.');
    }
  }

  /**
   * Create a new product via backend.
   * Resolves category name → ID and company name → ID if IDs are not provided.
   */
  public async createProduct(
    input: ProductCreateInput,
    _role: UserRole = 'admin'
  ): Promise<ApiResponse<Product>> {
    try {
      // Resolve category ID from name if not provided
      let categoryId = input.categoryId ? Number(input.categoryId) : undefined;
      if (!categoryId && input.category) {
        const catsRes = await categoryService.getCategories();
        const match = catsRes.data?.find((c) => c.name === input.category);
        if (match) categoryId = Number(match.id);
      }

      // Resolve existing manufacturers or create explicitly entered new ones.
      const variants = await Promise.all((input.variants || []).map(async (variant) => {
        const company = variant.companyId
          ? null
          : await companyService.getOrCreateCompany(variant.companyName);
        const companyId = Number(variant.companyId || company?.id);
        if (!Number.isInteger(companyId) || companyId <= 0) {
          throw new Error(`A valid company is required for ${variant.companyName || 'the product variant'}.`);
        }
        return {
          company_id: companyId,
          base_price: variant.basePrice,
          min_selling_price: variant.minSellingPrice,
          default_selling_price: variant.defaultSellingPrice,
          max_selling_price: variant.maxSellingPrice,
          current_stock: variant.currentStock,
          reorder_level: variant.reorderLevel,
        };
      }));

      const payload: any = {
        name: input.name,
        generic_name: input.genericName,
        category_id: categoryId,
        dosage: input.dosage,
        dosage_form: input.form,
        barcode: input.barcode || '',
        description: input.description || '',
        subtitle: input.subtitle || '',
        status: input.status === 'Active' ? 'Active' : 'Inactive',
        variants,
      };

      const res = await api.post<any>('/products/', payload);
      const product = mapBackendProduct(res.data);
      apiCache.invalidateByPrefix('products:');
      apiCache.invalidateByPrefix('kpi:');
      return { success: true, data: product, message: res.message };
    } catch (err) {
      if (err instanceof ApiError) throw err;
      if (err instanceof Error) throw err;
      throw new Error('Failed to create product.');
    }
  }

  /**
   * Update an existing product via backend
   */
  public async updateProduct(
    id: string,
    updates: ProductUpdateInput,
    _role: UserRole = 'admin'
  ): Promise<ApiResponse<Product>> {
    try {
      const payload: any = {};
      if (updates.name !== undefined) payload.name = updates.name;
      if (updates.genericName !== undefined) payload.generic_name = updates.genericName;
      if (updates.categoryId !== undefined) {
        payload.category_id = Number(updates.categoryId);
      } else if (updates.category !== undefined) {
        const categoriesResponse = await categoryService.getCategories();
        const category = (categoriesResponse.data || []).find(
          (item) => item.name.toLocaleLowerCase() === updates.category?.trim().toLocaleLowerCase()
        );
        if (!category) throw new Error(`Category "${updates.category}" was not found.`);
        payload.category_id = Number(category.id);
      }
      if (updates.dosage !== undefined) payload.dosage = updates.dosage;
      if (updates.form !== undefined) payload.dosage_form = updates.form;
      if (updates.barcode !== undefined) payload.barcode = updates.barcode;
      if (updates.description !== undefined) payload.description = updates.description;
      if (updates.subtitle !== undefined) payload.subtitle = updates.subtitle;
      if (updates.status !== undefined) payload.status = updates.status === 'Active' ? 'Active' : 'Inactive';

      const res = await api.patch<any>(`/products/${id}/`, payload);
      let product = mapBackendProduct(res.data);

      // Product metadata and company variants have separate Django endpoints.
      // Explicitly synchronize submitted variants instead of silently dropping
      // them from the product PATCH request.
      if (updates.variants !== undefined) {
        for (const variant of updates.variants) {
          const company = variant.companyId
            ? null
            : await companyService.getOrCreateCompany(variant.companyName);
          const companyId = Number(variant.companyId || company?.id);
          if (!Number.isInteger(companyId) || companyId <= 0) {
            throw new Error(`A valid company is required for ${variant.companyName || 'the product variant'}.`);
          }

          const existingVariant = variant.variantId
            ? product.variants.find((item) => item.id === variant.variantId)
            : product.variants.find(
                (item) =>
                  item.companyId === String(companyId)
                  || item.companyName.toLocaleLowerCase() === variant.companyName.trim().toLocaleLowerCase()
              );
          const variantPayload: any = {
            company_id: companyId,
            base_price: variant.basePrice,
            min_selling_price: variant.minSellingPrice,
            default_selling_price: variant.defaultSellingPrice,
            max_selling_price: variant.maxSellingPrice,
            current_stock: variant.currentStock,
            reorder_level: variant.reorderLevel,
          };
          if (variant.status !== undefined) {
            variantPayload.status = variant.status === 'Available' ? 'Available' : 'Inactive';
          }

          if (existingVariant) {
            const hasChanges = (
              existingVariant.companyId !== String(companyId)
              || Number(existingVariant.basePrice) !== Number(variant.basePrice)
              || Number(existingVariant.minSellingPrice) !== Number(variant.minSellingPrice)
              || Number(existingVariant.defaultSellingPrice) !== Number(variant.defaultSellingPrice)
              || Number(existingVariant.maxSellingPrice) !== Number(variant.maxSellingPrice)
              || Number(existingVariant.currentStock) !== Number(variant.currentStock)
              || Number(existingVariant.reorderLevel) !== Number(variant.reorderLevel)
              || (variant.status !== undefined && existingVariant.status !== variant.status)
            );
            if (hasChanges) {
              await api.patch<any>(`/products/variants/${existingVariant.id}/`, variantPayload);
            }
          } else {
            delete variantPayload.status;
            await api.post<any>(`/products/${id}/variants/`, variantPayload);
          }
        }

        const refreshed = await api.get<any>(`/products/${id}/`);
        product = mapBackendProduct(refreshed.data);
      }

      apiCache.invalidateByPrefix('products:');
      apiCache.invalidateByPrefix('kpi:');
      apiCache.invalidateByPrefix(`product:${id}`);
      return { success: true, data: product, message: res.message };
    } catch (err) {
      if (err instanceof ApiError) throw err;
      if (err instanceof Error) throw err;
      throw new Error('Failed to update product.');
    }
  }

  /**
   * Deactivate a product via backend
   */
  public async deactivateProduct(
    id: string,
    role: UserRole = 'admin'
  ): Promise<ApiResponse<Product>> {
    return this.updateProduct(id, { status: 'Inactive' }, role);
  }

  /**
   * Reactivate an inactive product via backend
   */
  public async activateProduct(
    id: string,
    role: UserRole = 'admin'
  ): Promise<ApiResponse<Product>> {
    return this.updateProduct(id, { status: 'Active' }, role);
  }

  /**
   * Fetch aggregate KPI statistics from backend
   */
  public async getKPIStats(_role: UserRole = 'admin'): Promise<ApiResponse<ProductKPIStats>> {
    const key = apiCache.generateKey('kpi:stats');
    return apiCache.deduplicate(key, async () => {
      try {
        const res = await api.get<any>('/products/kpi-stats/');
        const d = toCamelCaseKeys(res.data || res);
        const stats: ProductKPIStats = {
          totalProducts: d.activeProducts || 0,
          activeProductsCount: d.activeProducts || 0,
          totalCompanies: d.activeCompanies || 0,
          totalVariants: d.availableVariants || 0,
          totalStockUnits: d.totalStockUnits || 0,
          totalInventoryValueSelling: 0, // Backend doesn't compute this
          totalInventoryValueCost: d.inventoryCostValue || 0,
        };
        apiCache.set(key, { success: true, data: stats }, 30 * 1000);
        return { success: true, data: stats };
      } catch (err) {
        if (err instanceof ApiError) throw err;
        throw new Error('Failed to fetch KPI stats.');
      }
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
    _role: UserRole = 'admin'
  ): Promise<ApiResponse<Product>> {
    try {
      const company = input.companyId
        ? null
        : await companyService.getOrCreateCompany(input.companyName);
      const companyId = Number(input.companyId || company?.id);
      if (!Number.isInteger(companyId) || companyId <= 0) {
        throw new Error('A valid company/manufacturer is required.');
      }

      const payload = {
        company_id: companyId,
        base_price: input.basePrice,
        min_selling_price: input.minSellingPrice,
        default_selling_price: input.defaultSellingPrice,
        max_selling_price: input.maxSellingPrice,
        current_stock: input.currentStock,
        reorder_level: input.reorderLevel,
      };

      const res = await api.post<any>(`/products/${productId}/variants/`, payload);
      apiCache.invalidateByPrefix('products:');
      apiCache.invalidateByPrefix('kpi:');

      // Re-fetch the full product to get updated variants
      return this.getProductById(productId);
    } catch (err) {
      if (err instanceof ApiError) throw err;
      if (err instanceof Error) throw err;
      throw new Error('Failed to add variant.');
    }
  }

  public async updateVariant(
    productId: string,
    variantId: string,
    updates: any,
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

      return this.getProductById(productId);
    } catch (err) {
      if (err instanceof ApiError) throw err;
      throw new Error('Failed to update variant.');
    }
  }

  public async deleteVariant(
    productId: string,
    variantId: string,
    _role: UserRole = 'admin'
  ): Promise<ApiResponse<Product>> {
    try {
      // Backend doesn't have a delete endpoint; deactivate via status update
      await api.patch<any>(`/products/variants/${variantId}/`, { status: 'Inactive' });
      apiCache.invalidateByPrefix('products:');
      apiCache.invalidateByPrefix('kpi:');

      return this.getProductById(productId);
    } catch (err) {
      if (err instanceof ApiError) throw err;
      throw new Error('Failed to remove variant.');
    }
  }

}

export const productService = new ProductService();
