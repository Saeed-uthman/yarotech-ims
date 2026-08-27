import {
  InventoryItem,
  InventorySummaryKPIs,
  InventoryFilterParams,
  InventoryMovement,
  StockAdjustmentInput,
  InventoryInsightsData,
  InsightsTimeframe,
  UserRole,
  ApiResponse,
  StockStatusType,
  ProductStatus,
} from '../types';
import { api, ApiError, toCamelCaseKeys } from './apiClient';
import { apiCache } from './apiCache';
import { categoryService } from './categoryService';
import { companyService } from './companyService';

// ==========================================
// Backend → Frontend Transform Helpers
// ==========================================

function mapBackendInventoryItem(raw: any): InventoryItem {
  const v = toCamelCaseKeys(raw);
  const stockStatusMap: Record<string, string> = {
    out: 'Out of Stock',
    low: 'Low Stock',
    available: 'In Stock',
  };
  return {
    id: String(v.id),
    productId: String(v.productId || ''),
    productName: v.productName || '',
    genericName: v.genericName || '',
    categoryId: String(v.categoryId || ''),
    category: v.categoryName || '',
    companyId: String(v.companyId || ''),
    companyName: v.companyName || '',
    dosage: '',
    form: '',
    barcode: '',
    image: undefined,
    basePrice: Number(v.basePrice || 0),
    sellingPrice: Number(v.defaultSellingPrice || 0),
    currentStock: Number(v.currentStock || 0),
    reorderLevel: Number(v.reorderLevel || 0),
    inventoryValue: Number(v.inventoryCostValue || 0),
    potentialSalesValue: Number(v.currentStock || 0) * Number(v.defaultSellingPrice || 0),
    stockStatus: (stockStatusMap[v.stockStatus] || 'In Stock') as StockStatusType,
    productStatus: 'Active' as ProductStatus,
    variantStatus: v.status === 'Available' ? 'Available' : 'Inactive',
    updatedAt: v.updatedAt || '',
  };
}

function mapBackendMovement(raw: any): InventoryMovement {
  const m = toCamelCaseKeys(raw);
  return {
    id: String(m.id),
    productVariantId: String(m.variantId || ''),
    productId: '',
    productName: m.productName || '',
    genericName: '',
    companyName: m.companyName || '',
    type: m.movementType || '',
    quantity: Number(m.quantity || 0),
    previousStock: Number(m.previousStock || 0),
    newStock: Number(m.newStock || 0),
    reason: m.reason || '',
    referenceType: m.referenceType || undefined,
    referenceId: m.referenceId ? String(m.referenceId) : undefined,
    createdBy: m.createdByName || '',
    createdAt: m.createdAt || '',
  };
}

function mapStockStatusFilter(backendValue: InventoryFilterParams['stockStatus']): string | undefined {
  switch (backendValue) {
    case 'in_stock': return 'available';
    case 'low_stock': return 'low';
    case 'out_of_stock': return 'out';
    default: return undefined;
  }
}

// ==========================================
// Client-Side Pagination
// ==========================================

function paginate<T>(items: T[], page: number, limit: number): { data: T[]; meta: { currentPage: number; perPage: number; total: number; lastPage: number } } {
  const total = items.length;
  const lastPage = Math.max(1, Math.ceil(total / limit));
  const safePage = Math.min(Math.max(1, page), lastPage);
  const start = (safePage - 1) * limit;
  return { data: items.slice(start, start + limit), meta: { currentPage: safePage, perPage: limit, total, lastPage } };
}

// ==========================================
// Inventory Service
// ==========================================

export class InventoryService {
  /**
   * Fetch paginated and filtered inventory variant list from backend
   */
  public async getInventory(
    params?: Partial<InventoryFilterParams>,
    _role: UserRole = 'admin'
  ): Promise<ApiResponse<InventoryItem[]>> {
    const key = apiCache.generateKey('inventory:list', {
      search: params?.search || '',
      category: params?.category || '',
      company: params?.company || '',
      stockStatus: params?.stockStatus || 'all',
      sortBy: params?.sortBy || 'name',
      sortOrder: params?.sortOrder || 'asc',
      page: params?.page || 1,
      limit: params?.limit || 15,
    });

    return apiCache.deduplicate(key, async () => {
      try {
        const queryParams: Record<string, any> = {};
        if (params?.search) queryParams.search = params.search;
        if (params?.stockStatus && params.stockStatus !== 'all') {
          const mapped = mapStockStatusFilter(params.stockStatus);
          if (mapped) queryParams.stock_status = mapped;
        }

        const res = await api.get<any>('/inventory/', queryParams);
        let items: InventoryItem[] = (res.data || []).map(mapBackendInventoryItem);

        // Client-side category filter
        if (params?.category && params.category !== 'All Categories') {
          const refRes = await categoryService.getCategories();
          const cat = refRes.data?.find((c) => c.name === params.category);
          if (cat) items = items.filter((i) => i.categoryId === cat.id);
        }

        // Client-side company filter
        if (params?.company && params.company !== 'All') {
          const refRes = await companyService.getCompanies();
          const comp = refRes.data?.find((c) => c.name === params.company);
          if (comp) items = items.filter((i) => i.companyId === comp.id);
        }

        // Client-side sorting
        const sortBy = params?.sortBy || 'name';
        const sortOrder = params?.sortOrder || 'asc';
        items.sort((a, b) => {
          let cmp = 0;
          switch (sortBy) {
            case 'name': cmp = a.productName.localeCompare(b.productName); break;
            case 'stock': cmp = a.currentStock - b.currentStock; break;
            case 'inventoryValue': cmp = a.inventoryValue - b.inventoryValue; break;
            case 'basePrice': cmp = a.basePrice - b.basePrice; break;
            case 'reorderLevel': cmp = a.reorderLevel - b.reorderLevel; break;
            case 'company': cmp = a.companyName.localeCompare(b.companyName); break;
            default: cmp = a.productName.localeCompare(b.productName);
          }
          return sortOrder === 'asc' ? cmp : -cmp;
        });

        // Client-side pagination
        const { data, meta } = paginate(items, params?.page || 1, params?.limit || 15);

        const response: ApiResponse<InventoryItem[]> = { success: true, data, meta };
        apiCache.set(key, response, 30 * 1000);
        return response;
      } catch (err) {
        if (err instanceof ApiError) throw err;
        throw new Error('Failed to fetch inventory.');
      }
    });
  }

  /**
   * Quick search inventory
   */
  public async searchInventory(
    query: string,
    params?: Partial<InventoryFilterParams>,
    role: UserRole = 'admin'
  ): Promise<ApiResponse<InventoryItem[]>> {
    return this.getInventory({ ...params, search: query }, role);
  }

  /**
   * Get Inventory Summary KPIs from backend
   */
  public async getInventoryKPIs(
    _role: UserRole = 'admin'
  ): Promise<ApiResponse<InventorySummaryKPIs>> {
    const key = apiCache.generateKey('inventory:kpis');
    return apiCache.deduplicate(key, async () => {
      try {
        const res = await api.get<any>('/inventory/summary-kpis/');
        const d = toCamelCaseKeys(res.data || res);
        const totalVariants = Number(d.totalVariants || 0);
        const lowStock = Number(d.lowStockVariants || 0);
        const outOfStock = Number(d.outOfStockVariants || 0);
        const kpis: InventorySummaryKPIs = {
          totalInventoryItems: totalVariants,
          totalUnitsInStock: Number(d.totalStockUnits || 0),
          totalInventoryValue: Number(d.inventoryCostValue || 0),
          totalPotentialSalesValue: 0,
          lowStockCount: lowStock,
          outOfStockCount: outOfStock,
          inStockCount: totalVariants - lowStock - outOfStock,
        };
        apiCache.set(key, { success: true, data: kpis }, 30 * 1000);
        return { success: true, data: kpis };
      } catch (err) {
        if (err instanceof ApiError) throw err;
        throw new Error('Failed to fetch inventory KPIs.');
      }
    });
  }

  /**
   * Get Inventory Insights from backend
   * Backend provides stock_by_category, stock_by_company, movements_by_type.
   * Frontend expects a richer shape; we map what's available and return empty for the rest.
   */
  public async getInventoryInsights(
    _timeframe: InsightsTimeframe = 'this_month',
    _role: UserRole = 'admin'
  ): Promise<ApiResponse<InventoryInsightsData>> {
    const key = apiCache.generateKey('inventory:insights');
    return apiCache.deduplicate(key, async () => {
      try {
        const res = await api.get<any>('/inventory/insights/');
        const d = toCamelCaseKeys(res.data || res);

        const kpiRes = await this.getInventoryKPIs();
        const summary = kpiRes.data || {
          totalInventoryItems: 0,
          totalUnitsInStock: 0,
          totalInventoryValue: 0,
          totalPotentialSalesValue: 0,
          lowStockCount: 0,
          outOfStockCount: 0,
          inStockCount: 0,
        };

        const categoryDistribution = (d.stockByCategory || []).map((c: any) => ({
          categoryId: '',
          categoryName: c.productCategoryName || '',
          totalVariants: Number(c.variantCount || 0),
          totalUnits: Number(c.totalUnits || 0),
          totalInventoryValue: 0,
          percentageOfTotalUnits: 0,
        }));

        const insights: InventoryInsightsData = {
          timeframe: _timeframe,
          summary,
          movementSummary: {
            timeframe: _timeframe,
            totalStockIn: 0,
            totalStockOut: 0,
            netMovement: 0,
            totalAdjustmentsCount: 0,
            recentMovements: [],
          },
          topValuedItems: [],
          topQuantityItems: [],
          categoryDistribution,
        };

        apiCache.set(key, { success: true, data: insights }, 60 * 1000);
        return { success: true, data: insights };
      } catch (err) {
        if (err instanceof ApiError) throw err;
        throw new Error('Failed to fetch inventory insights.');
      }
    });
  }

  /**
   * Get Inventory Movement Audit Logs from backend
   */
  public async getInventoryMovements(params?: {
    productVariantId?: string;
    productId?: string;
    type?: string;
    search?: string;
    limit?: number;
  }): Promise<ApiResponse<InventoryMovement[]>> {
    const key = apiCache.generateKey('inventory:movements', params || {});
    return apiCache.deduplicate(key, async () => {
      try {
        const queryParams: Record<string, any> = {};
        if (params?.productVariantId) queryParams.variant_id = params.productVariantId;
        if (params?.type) queryParams.movement_type = params.type;

        const res = await api.get<any>('/inventory/movements/', queryParams);
        let movements: InventoryMovement[] = (res.data || []).map(mapBackendMovement);

        // Client-side search filter
        if (params?.search) {
          const q = params.search.toLowerCase();
          movements = movements.filter(
            (m) =>
              m.productName.toLowerCase().includes(q) ||
              m.companyName.toLowerCase().includes(q) ||
              m.reason.toLowerCase().includes(q)
          );
        }

        // Client-side limit
        if (params?.limit && params.limit > 0) {
          movements = movements.slice(0, params.limit);
        }

        const response: ApiResponse<InventoryMovement[]> = { success: true, data: movements };
        apiCache.set(key, response, 30 * 1000);
        return response;
      } catch (err) {
        if (err instanceof ApiError) throw err;
        throw new Error('Failed to fetch inventory movements.');
      }
    });
  }

  /**
   * Record an administrative stock adjustment via backend
   */
  public async adjustStock(
    input: StockAdjustmentInput,
    _role: UserRole = 'admin'
  ): Promise<ApiResponse<InventoryItem>> {
    try {
      const payload = {
        variant_id: Number(input.productVariantId),
        adjustment_type: input.adjustmentType,
        quantity: input.adjustmentQuantity,
        reason: input.reason,
        notes: input.customNotes || '',
      };

      await api.post<any>('/inventory/adjust/', payload);

      // Invalidate caches
      this.invalidateInventoryCache();

      // Return a minimal InventoryItem — the caller should refetch the list
      return {
        success: true,
        data: {
          id: input.productVariantId,
          productId: '',
          productName: '',
          genericName: '',
          categoryId: '',
          category: '',
          companyId: '',
          companyName: '',
          dosage: '',
          form: '',
          barcode: '',
          basePrice: 0,
          sellingPrice: 0,
          currentStock: 0,
          reorderLevel: 0,
          inventoryValue: 0,
          potentialSalesValue: 0,
        stockStatus: 'In Stock' as StockStatusType,
        productStatus: 'Active' as ProductStatus,
          variantStatus: 'Available',
          updatedAt: '',
        },
        message: 'Stock adjusted successfully.',
      };
    } catch (err) {
      if (err instanceof ApiError) throw err;
      throw new Error('Failed to adjust stock.');
    }
  }

  /**
   * Invalidate all inventory and product caches
   */
  public invalidateInventoryCache(): void {
    apiCache.invalidateByPrefix('inventory:');
    apiCache.invalidateByPrefix('products:');
    apiCache.invalidateByPrefix('product:');
    apiCache.invalidateByPrefix('kpi:');
  }
}

export const inventoryService = new InventoryService();
