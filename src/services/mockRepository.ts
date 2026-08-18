import {
  CategoryEntity,
  CompanyEntity,
  ProductEntity,
  ProductVariantEntity,
  Product,
  CompanyVariant,
  UserRole,
  ProductFilterParams,
  ProductCreateInput,
  ProductUpdateInput,
  ProductVariantInput,
  ProductKPIStats,
  ApiResponse,
  InventoryItem,
  InventorySummaryKPIs,
  InventoryFilterParams,
  InventoryMovement,
  StockAdjustmentInput,
  InventoryInsightsData,
  InsightsTimeframe,
  TopValuedItemInsight,
  TopQuantityItemInsight,
  CategoryStockDistribution,
  StockMovementSummaryInsight,
  StockStatusType,
  CustomerEntity,
  Customer,
  CustomerSale,
  CustomerDebtPayment,
  CustomerFilterParams,
  CustomerSummaryKPIs,
  CreateCustomerInput,
  UpdateCustomerInput,
  DebtPaymentInput,
} from '../types';
import {
  MOCK_CATEGORIES,
  MOCK_COMPANIES,
  MOCK_PRODUCTS,
  MOCK_PRODUCT_VARIANTS,
  MOCK_INVENTORY_MOVEMENTS,
  MOCK_CUSTOMERS,
  MOCK_CUSTOMER_SALES,
  MOCK_CUSTOMER_DEBT_PAYMENTS,
} from '../data/mock';

const DB_KEYS = {
  CATEGORIES: 'stitch_pharmacy_db_categories',
  COMPANIES: 'stitch_pharmacy_db_companies',
  PRODUCTS: 'stitch_pharmacy_db_products',
  VARIANTS: 'stitch_pharmacy_db_variants',
  MOVEMENTS: 'stitch_pharmacy_db_movements',
  CUSTOMERS: 'stitch_pharmacy_db_customers',
  SALES: 'stitch_pharmacy_db_sales',
  DEBT_PAYMENTS: 'stitch_pharmacy_db_debt_payments',
  CONFIG: 'stitch_pharmacy_db_config',
};

export interface MockDbConfig {
  simulatedLatencyMin: number;
  simulatedLatencyMax: number;
  simulatedErrorRate: number; // 0 to 1 (0% to 100%)
  forceNextError: boolean;
}

const DEFAULT_CONFIG: MockDbConfig = {
  simulatedLatencyMin: 250,
  simulatedLatencyMax: 650,
  simulatedErrorRate: 0,
  forceNextError: false,
};

function getStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      localStorage.setItem(key, JSON.stringify(fallback));
      return fallback;
    }
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function setStorage<T>(key: string, val: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch (err) {
    console.error(`Mock database persistence error on key ${key}`, err);
  }
}

function formatCurrentTimestamp(): string {
  const now = new Date();
  return (
    now.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }) +
    ' ' +
    now.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    })
  );
}

/**
 * Normalized Mock Database Repository
 * Mirrors MySQL / relational database tables and relationship resolution
 */
export class MockDatabaseRepository {
  private categories: CategoryEntity[] = [];
  private companies: CompanyEntity[] = [];
  private products: ProductEntity[] = [];
  private variants: ProductVariantEntity[] = [];
  private movements: InventoryMovement[] = [];
  private customers: CustomerEntity[] = [];
  private sales: CustomerSale[] = [];
  private debtPayments: CustomerDebtPayment[] = [];
  private config: MockDbConfig = DEFAULT_CONFIG;

  constructor() {
    this.init();
  }

  private init(): void {
    this.categories = getStorage(DB_KEYS.CATEGORIES, MOCK_CATEGORIES);
    this.companies = getStorage(DB_KEYS.COMPANIES, MOCK_COMPANIES);
    this.products = getStorage(DB_KEYS.PRODUCTS, MOCK_PRODUCTS);
    this.variants = getStorage(DB_KEYS.VARIANTS, MOCK_PRODUCT_VARIANTS);
    this.movements = getStorage(DB_KEYS.MOVEMENTS, MOCK_INVENTORY_MOVEMENTS);
    this.customers = getStorage(DB_KEYS.CUSTOMERS, MOCK_CUSTOMERS);
    this.sales = getStorage(DB_KEYS.SALES, MOCK_CUSTOMER_SALES);
    this.debtPayments = getStorage(DB_KEYS.DEBT_PAYMENTS, MOCK_CUSTOMER_DEBT_PAYMENTS);
    this.config = getStorage(DB_KEYS.CONFIG, DEFAULT_CONFIG);
  }

  private save(): void {
    setStorage(DB_KEYS.CATEGORIES, this.categories);
    setStorage(DB_KEYS.COMPANIES, this.companies);
    setStorage(DB_KEYS.PRODUCTS, this.products);
    setStorage(DB_KEYS.VARIANTS, this.variants);
    setStorage(DB_KEYS.MOVEMENTS, this.movements);
    setStorage(DB_KEYS.CUSTOMERS, this.customers);
    setStorage(DB_KEYS.SALES, this.sales);
    setStorage(DB_KEYS.DEBT_PAYMENTS, this.debtPayments);
    setStorage(DB_KEYS.CONFIG, this.config);
  }

  /**
   * Simulates network latency (250–800ms) and configurable error simulation
   */
  private async simulateNetwork(): Promise<void> {
    const delay =
      Math.floor(
        Math.random() *
          (this.config.simulatedLatencyMax - this.config.simulatedLatencyMin + 1)
      ) + this.config.simulatedLatencyMin;

    await new Promise((res) => setTimeout(res, delay));

    if (this.config.forceNextError) {
      this.config.forceNextError = false;
      this.save();
      throw new Error('Simulated network failure (Controlled test error).');
    }

    if (this.config.simulatedErrorRate > 0 && Math.random() < this.config.simulatedErrorRate) {
      throw new Error('Simulated intermittent network timeout (504 Gateway Timeout).');
    }
  }

  // ==========================================
  // Relational Resolution & Hydration (Joins)
  // ==========================================

  private getCategoryMap(): Map<string, CategoryEntity> {
    return new Map(this.categories.map((c) => [c.id, c]));
  }

  private getCompanyMap(): Map<string, CompanyEntity> {
    return new Map(this.companies.map((c) => [c.id, c]));
  }

  /**
   * Resolves CompanyVariant relational data + applies Role-Based Redaction
   */
  public hydrateVariant(
    v: ProductVariantEntity,
    role: UserRole = 'admin',
    companyMap?: Map<string, CompanyEntity>
  ): CompanyVariant {
    const map = companyMap || this.getCompanyMap();
    const comp = map.get(v.companyId);
    const companyName = comp ? comp.name : 'Unknown Manufacturer';

    if (role === 'cashier') {
      // Safe redaction of wholesale base price and reorder levels for cashier
      return {
        ...v,
        companyName,
        basePrice: 0,
        reorderLevel: 0,
      };
    }

    return {
      ...v,
      companyName,
    };
  }

  /**
   * Resolves Product entity relational data + variants + applies Role-Based Redaction
   */
  public hydrateProduct(
    p: ProductEntity,
    role: UserRole = 'admin',
    categoryMap?: Map<string, CategoryEntity>,
    companyMap?: Map<string, CompanyEntity>
  ): Product {
    const catMap = categoryMap || this.getCategoryMap();
    const compMap = companyMap || this.getCompanyMap();

    const categoryEntity = catMap.get(p.categoryId);
    const categoryName = categoryEntity ? categoryEntity.name : 'General';

    const productVariants = this.variants
      .filter((v) => v.productId === p.id)
      .map((v) => this.hydrateVariant(v, role, compMap));

    return {
      ...p,
      category: categoryName,
      variants: productVariants,
    };
  }

  // ==========================================
  // Product Operations
  // ==========================================

  public async queryProducts(
    params?: Partial<ProductFilterParams>,
    role: UserRole = 'admin'
  ): Promise<ApiResponse<Product[]>> {
    await this.simulateNetwork();

    const catMap = this.getCategoryMap();
    const compMap = this.getCompanyMap();

    // Hydrate all products for relational filtering
    let hydrated = this.products.map((p) => this.hydrateProduct(p, role, catMap, compMap));

    // 1. Search Query Filter
    if (params?.search && params.search.trim()) {
      const q = params.search.toLowerCase().trim();
      hydrated = hydrated.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.genericName.toLowerCase().includes(q) ||
          p.barcode.toLowerCase().includes(q) ||
          (p.subtitle && p.subtitle.toLowerCase().includes(q)) ||
          p.variants.some((v) => v.companyName.toLowerCase().includes(q))
      );
    }

    // 2. Category Filter
    if (
      params?.category &&
      params.category !== 'All' &&
      params.category !== 'All Categories'
    ) {
      hydrated = hydrated.filter(
        (p) => p.category.toLowerCase() === params.category!.toLowerCase()
      );
    }

    // 3. Status Filter
    if (params?.status && params.status !== 'All' && params.status !== 'All Status') {
      hydrated = hydrated.filter(
        (p) => p.status.toLowerCase() === params.status!.toLowerCase()
      );
    }

    // 4. Company (Manufacturer) Filter
    if (params?.company && params.company !== 'All') {
      hydrated = hydrated.filter((p) =>
        p.variants.some(
          (v) => v.companyName.toLowerCase() === params.company!.toLowerCase()
        )
      );
    }

    // 5. Stock Status Filter
    if (params?.stockStatus && params.stockStatus !== 'all') {
      hydrated = hydrated.filter((p) => {
        const totalStock = p.variants.reduce((acc, v) => acc + v.currentStock, 0);
        const anyLowStock = p.variants.some(
          (v) => v.currentStock <= v.reorderLevel && v.currentStock > 0
        );
        if (params.stockStatus === 'out_of_stock') return totalStock === 0;
        if (params.stockStatus === 'low_stock')
          return anyLowStock || (totalStock > 0 && totalStock < 100);
        if (params.stockStatus === 'in_stock') return totalStock > 0 && !anyLowStock;
        return true;
      });
    }

    // 6. Sorting
    if (params?.sortBy) {
      let sortBy = params.sortBy;
      if (role === 'cashier' && sortBy === 'basePrice') {
        sortBy = 'price'; // Guard cashier from sorting by base wholesale cost
      }

      hydrated.sort((a, b) => {
        let valA: any = a.name;
        let valB: any = b.name;

        if (sortBy === 'genericName') {
          valA = a.genericName;
          valB = b.genericName;
        } else if (sortBy === 'stock') {
          valA = a.variants.reduce((sum, v) => sum + v.currentStock, 0);
          valB = b.variants.reduce((sum, v) => sum + v.currentStock, 0);
        } else if (sortBy === 'price') {
          valA = a.variants.length > 0 ? Math.min(...a.variants.map((v) => v.sellingPrice)) : 0;
          valB = b.variants.length > 0 ? Math.min(...b.variants.map((v) => v.sellingPrice)) : 0;
        } else if (sortBy === 'basePrice') {
          valA = a.variants.length > 0 ? Math.min(...a.variants.map((v) => v.basePrice)) : 0;
          valB = b.variants.length > 0 ? Math.min(...b.variants.map((v) => v.basePrice)) : 0;
        } else if (sortBy === 'date') {
          valA = new Date(a.updatedAt).getTime();
          valB = new Date(b.updatedAt).getTime();
        }

        if (typeof valA === 'string') {
          return params.sortOrder === 'desc'
            ? valB.localeCompare(valA)
            : valA.localeCompare(valB);
        }
        return params.sortOrder === 'desc' ? valB - valA : valA - valB;
      });
    }

    // 7. Pagination
    const total = hydrated.length;
    const page = Number(params?.page) || 1;
    const limit = Number(params?.limit) || 10;
    const startIndex = (page - 1) * limit;
    const paginated = hydrated.slice(startIndex, startIndex + limit);
    const lastPage = Math.ceil(total / limit) || 1;

    return {
      success: true,
      data: paginated,
      message: 'Products retrieved successfully.',
      meta: {
        currentPage: page,
        perPage: limit,
        total,
        lastPage,
      },
    };
  }

  public async getProductById(id: string, role: UserRole = 'admin'): Promise<ApiResponse<Product>> {
    await this.simulateNetwork();

    const product = this.products.find((p) => p.id === id);
    if (!product) {
      throw new Error(`Product with ID ${id} not found.`);
    }

    return {
      success: true,
      data: this.hydrateProduct(product, role),
      message: 'Product retrieved successfully.',
    };
  }

  public async getProductByBarcode(
    barcode: string,
    role: UserRole = 'admin'
  ): Promise<ApiResponse<Product>> {
    await this.simulateNetwork();

    const product = this.products.find((p) => p.barcode === barcode);
    if (!product) {
      throw new Error(`Product with barcode ${barcode} not found.`);
    }

    return {
      success: true,
      data: this.hydrateProduct(product, role),
      message: 'Product retrieved by barcode.',
    };
  }

  public async createProduct(
    input: ProductCreateInput,
    role: UserRole = 'admin'
  ): Promise<ApiResponse<Product>> {
    await this.simulateNetwork();

    // Find or resolve Category ID
    let categoryId = input.categoryId;
    if (!categoryId) {
      const foundCat = this.categories.find(
        (c) => c.name.toLowerCase() === input.category.toLowerCase()
      );
      if (foundCat) {
        categoryId = foundCat.id;
      } else {
        const newCatId = `cat-${Date.now()}`;
        const newCat: CategoryEntity = {
          id: newCatId,
          name: input.category,
          status: 'Active',
          createdAt: formatCurrentTimestamp(),
          updatedAt: formatCurrentTimestamp(),
        };
        this.categories.push(newCat);
        categoryId = newCatId;
      }
    }

    const productId = `prod-${Date.now()}`;
    const timestamp = formatCurrentTimestamp();

    const newProductEntity: ProductEntity = {
      id: productId,
      name: input.name.trim(),
      genericName: input.genericName.trim(),
      categoryId: categoryId,
      dosage: input.dosage.trim(),
      form: input.form,
      barcode:
        input.barcode?.trim() ||
        `${Math.floor(1000000000000 + Math.random() * 9000000000000)}`,
      description: input.description.trim(),
      subtitle: input.subtitle?.trim() || `${input.category} formulation`,
      image:
        input.image ||
        'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=600&auto=format&fit=crop&q=80',
      status: input.status || 'Active',
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    // Process & create company variants
    const newVariantEntities: ProductVariantEntity[] = input.variants.map((v, i) => {
      let companyId = v.companyId;
      if (!companyId) {
        const foundComp = this.companies.find(
          (c) => c.name.toLowerCase() === v.companyName.toLowerCase()
        );
        if (foundComp) {
          companyId = foundComp.id;
        } else {
          const newCompId = `comp-${Date.now()}-${i}`;
          const newCompany: CompanyEntity = {
            id: newCompId,
            name: v.companyName.trim(),
            status: 'Active',
            createdAt: timestamp,
            updatedAt: timestamp,
          };
          this.companies.push(newCompany);
          companyId = newCompId;
        }
      }

      return {
        id: `var-${productId}-${i + 1}`,
        productId,
        companyId,
        basePrice: Number(v.basePrice) || 0,
        sellingPrice: Number(v.sellingPrice) || 0,
        currentStock: Number(v.currentStock) || 0,
        reorderLevel: Number(v.reorderLevel) || 50,
        status: v.status || 'Available',
        createdAt: timestamp,
        updatedAt: timestamp,
      };
    });

    this.products.unshift(newProductEntity);
    this.variants.push(...newVariantEntities);
    this.save();

    return {
      success: true,
      data: this.hydrateProduct(newProductEntity, role),
      message: 'Product created successfully.',
    };
  }

  public async updateProduct(
    id: string,
    updates: ProductUpdateInput,
    role: UserRole = 'admin'
  ): Promise<ApiResponse<Product>> {
    await this.simulateNetwork();

    const pIndex = this.products.findIndex((p) => p.id === id);
    if (pIndex === -1) {
      throw new Error(`Product with ID ${id} not found.`);
    }

    const existing = this.products[pIndex];
    const timestamp = formatCurrentTimestamp();

    let categoryId = existing.categoryId;
    if (updates.category) {
      const foundCat = this.categories.find(
        (c) => c.name.toLowerCase() === updates.category!.toLowerCase()
      );
      if (foundCat) {
        categoryId = foundCat.id;
      }
    }

    const updatedProductEntity: ProductEntity = {
      ...existing,
      name: updates.name ?? existing.name,
      genericName: updates.genericName ?? existing.genericName,
      categoryId,
      dosage: updates.dosage ?? existing.dosage,
      form: updates.form ?? existing.form,
      barcode: updates.barcode ?? existing.barcode,
      description: updates.description ?? existing.description,
      subtitle: updates.subtitle ?? existing.subtitle,
      image: updates.image ?? existing.image,
      status: updates.status ?? existing.status,
      updatedAt: timestamp,
    };

    this.products[pIndex] = updatedProductEntity;

    // Handle full variant updates if provided in input
    if (updates.variants) {
      // Remove old variants for this product and replace
      this.variants = this.variants.filter((v) => v.productId !== id);

      const newVariants: ProductVariantEntity[] = updates.variants.map((v, i) => {
        let companyId = v.companyId;
        if (!companyId) {
          const found = this.companies.find(
            (c) => c.name.toLowerCase() === v.companyName.toLowerCase()
          );
          if (found) {
            companyId = found.id;
          } else {
            const newCompId = `comp-${Date.now()}-${i}`;
            this.companies.push({
              id: newCompId,
              name: v.companyName.trim(),
              status: 'Active',
              createdAt: timestamp,
              updatedAt: timestamp,
            });
            companyId = newCompId;
          }
        }

        return {
          id: `var-${id}-${i + 1}`,
          productId: id,
          companyId,
          basePrice: Number(v.basePrice) || 0,
          sellingPrice: Number(v.sellingPrice) || 0,
          currentStock: Number(v.currentStock) || 0,
          reorderLevel: Number(v.reorderLevel) || 50,
          status: v.status || 'Available',
          createdAt: timestamp,
          updatedAt: timestamp,
        };
      });

      this.variants.push(...newVariants);
    }

    this.save();

    return {
      success: true,
      data: this.hydrateProduct(updatedProductEntity, role),
      message: 'Product updated successfully.',
    };
  }

  public async setProductStatus(
    id: string,
    status: 'Active' | 'Inactive',
    role: UserRole = 'admin'
  ): Promise<ApiResponse<Product>> {
    return this.updateProduct(id, { status }, role);
  }

  // ==========================================
  // Product Variant Operations
  // ==========================================

  public async getVariantsByProductId(
    productId: string,
    role: UserRole = 'admin'
  ): Promise<ApiResponse<CompanyVariant[]>> {
    await this.simulateNetwork();

    const compMap = this.getCompanyMap();
    const productVariants = this.variants
      .filter((v) => v.productId === productId)
      .map((v) => this.hydrateVariant(v, role, compMap));

    return {
      success: true,
      data: productVariants,
      message: 'Variants retrieved successfully.',
    };
  }

  public async addVariant(
    productId: string,
    input: ProductVariantInput,
    role: UserRole = 'admin'
  ): Promise<ApiResponse<Product>> {
    await this.simulateNetwork();

    const product = this.products.find((p) => p.id === productId);
    if (!product) throw new Error(`Product ${productId} not found.`);

    const timestamp = formatCurrentTimestamp();
    let companyId = input.companyId;

    if (!companyId) {
      const found = this.companies.find(
        (c) => c.name.toLowerCase() === input.companyName.toLowerCase()
      );
      if (found) {
        companyId = found.id;
      } else {
        const newCompId = `comp-${Date.now()}`;
        this.companies.push({
          id: newCompId,
          name: input.companyName.trim(),
          status: 'Active',
          createdAt: timestamp,
          updatedAt: timestamp,
        });
        companyId = newCompId;
      }
    }

    const newVariant: ProductVariantEntity = {
      id: `var-${productId}-${Date.now()}`,
      productId,
      companyId,
      basePrice: Number(input.basePrice) || 0,
      sellingPrice: Number(input.sellingPrice) || 0,
      currentStock: Number(input.currentStock) || 0,
      reorderLevel: Number(input.reorderLevel) || 50,
      status: input.status || 'Available',
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    this.variants.push(newVariant);
    product.updatedAt = timestamp;
    this.save();

    return {
      success: true,
      data: this.hydrateProduct(product, role),
      message: 'Manufacturer variant added successfully.',
    };
  }

  public async updateVariant(
    productId: string,
    variantId: string,
    updates: Partial<ProductVariantEntity>,
    role: UserRole = 'admin'
  ): Promise<ApiResponse<Product>> {
    await this.simulateNetwork();

    const product = this.products.find((p) => p.id === productId);
    if (!product) throw new Error(`Product ${productId} not found.`);

    const vIndex = this.variants.findIndex((v) => v.id === variantId);
    if (vIndex === -1) throw new Error(`Variant ${variantId} not found.`);

    const timestamp = formatCurrentTimestamp();
    this.variants[vIndex] = {
      ...this.variants[vIndex],
      ...updates,
      updatedAt: timestamp,
    };

    product.updatedAt = timestamp;
    this.save();

    return {
      success: true,
      data: this.hydrateProduct(product, role),
      message: 'Manufacturer variant updated successfully.',
    };
  }

  public async deleteVariant(
    productId: string,
    variantId: string,
    role: UserRole = 'admin'
  ): Promise<ApiResponse<Product>> {
    await this.simulateNetwork();

    const product = this.products.find((p) => p.id === productId);
    if (!product) throw new Error(`Product ${productId} not found.`);

    this.variants = this.variants.filter((v) => v.id !== variantId);
    product.updatedAt = formatCurrentTimestamp();
    this.save();

    return {
      success: true,
      data: this.hydrateProduct(product, role),
      message: 'Manufacturer variant removed.',
    };
  }

  // ==========================================
  // Reference Data (Categories & Companies)
  // ==========================================

  public async getCategories(): Promise<ApiResponse<CategoryEntity[]>> {
    await this.simulateNetwork();
    return {
      success: true,
      data: [...this.categories],
      message: 'Categories retrieved successfully.',
    };
  }

  public async getCompanies(): Promise<ApiResponse<CompanyEntity[]>> {
    await this.simulateNetwork();
    return {
      success: true,
      data: [...this.companies],
      message: 'Companies retrieved successfully.',
    };
  }

  // ==========================================
  // Derived Statistics & Aggregations
  // ==========================================

  public async getKPIStats(role: UserRole = 'admin'): Promise<ApiResponse<ProductKPIStats>> {
    await this.simulateNetwork();

    const activeProducts = this.products.filter((p) => p.status === 'Active');
    const uniqueCompanyIds = new Set(this.variants.map((v) => v.companyId));

    let totalVariants = 0;
    let totalStockUnits = 0;
    let totalInventoryValueSelling = 0;
    let totalInventoryValueCost = 0;

    this.variants.forEach((v) => {
      totalVariants++;
      totalStockUnits += v.currentStock;
      totalInventoryValueSelling += v.currentStock * v.sellingPrice;
      if (role === 'admin') {
        totalInventoryValueCost += v.currentStock * v.basePrice;
      }
    });

    return {
      success: true,
      data: {
        totalProducts: this.products.length,
        activeProductsCount: activeProducts.length,
        totalCompanies: uniqueCompanyIds.size,
        totalVariants,
        totalStockUnits,
        totalInventoryValueSelling,
        totalInventoryValueCost: role === 'admin' ? totalInventoryValueCost : 0,
      },
      message: 'KPI statistics calculated successfully.',
    };
  }

  // ==========================================
  // INVENTORY MODULE OPERATIONS
  // ==========================================

  private deriveStockStatus(currentStock: number, reorderLevel: number): StockStatusType {
    if (currentStock <= 0) return 'Out of Stock';
    if (currentStock <= reorderLevel) return 'Low Stock';
    return 'In Stock';
  }

  public hydrateInventoryItem(
    v: ProductVariantEntity,
    role: UserRole = 'admin',
    productMap?: Map<string, ProductEntity>,
    categoryMap?: Map<string, CategoryEntity>,
    companyMap?: Map<string, CompanyEntity>
  ): InventoryItem | null {
    const prodMap = productMap || new Map(this.products.map((p) => [p.id, p]));
    const catMap = categoryMap || this.getCategoryMap();
    const compMap = companyMap || this.getCompanyMap();

    const product = prodMap.get(v.productId);
    if (!product) return null;

    const company = compMap.get(v.companyId);
    const companyName = company ? company.name : 'Unknown Company';

    const category = catMap.get(product.categoryId);
    const categoryName = category ? category.name : 'General';

    const stockStatus = this.deriveStockStatus(v.currentStock, v.reorderLevel);

    const isAdmin = role === 'admin';
    const basePrice = isAdmin ? v.basePrice : 0;
    const inventoryValue = isAdmin ? v.currentStock * v.basePrice : 0;
    const reorderLevel = isAdmin ? v.reorderLevel : 0;

    return {
      id: v.id,
      productId: product.id,
      productName: product.name,
      genericName: product.genericName,
      categoryId: product.categoryId,
      category: categoryName,
      companyId: v.companyId,
      companyName,
      dosage: product.dosage,
      form: product.form,
      barcode: product.barcode,
      image: product.image,
      basePrice,
      sellingPrice: v.sellingPrice,
      currentStock: v.currentStock,
      reorderLevel,
      inventoryValue,
      potentialSalesValue: v.currentStock * v.sellingPrice,
      stockStatus,
      productStatus: product.status,
      variantStatus: v.status,
      updatedAt: v.updatedAt,
    };
  }

  public async queryInventory(
    params?: Partial<InventoryFilterParams>,
    role: UserRole = 'admin'
  ): Promise<ApiResponse<InventoryItem[]>> {
    await this.simulateNetwork();

    const prodMap = new Map(this.products.map((p) => [p.id, p]));
    const catMap = this.getCategoryMap();
    const compMap = this.getCompanyMap();

    // Hydrate all active variants into inventory items
    let items: InventoryItem[] = [];
    for (const v of this.variants) {
      const hydrated = this.hydrateInventoryItem(v, role, prodMap, catMap, compMap);
      if (hydrated) {
        items.push(hydrated);
      }
    }

    // 1. Search Query Filter (Product name, generic name, company, barcode)
    if (params?.search && params.search.trim()) {
      const q = params.search.toLowerCase().trim();
      items = items.filter(
        (i) =>
          i.productName.toLowerCase().includes(q) ||
          i.genericName.toLowerCase().includes(q) ||
          i.companyName.toLowerCase().includes(q) ||
          i.barcode.toLowerCase().includes(q) ||
          i.category.toLowerCase().includes(q)
      );
    }

    // 2. Category Filter
    if (
      params?.category &&
      params.category !== 'All' &&
      params.category !== 'All Categories'
    ) {
      items = items.filter(
        (i) => i.category.toLowerCase() === params.category!.toLowerCase()
      );
    }

    // 3. Company Filter
    if (params?.company && params.company !== 'All') {
      items = items.filter(
        (i) => i.companyName.toLowerCase() === params.company!.toLowerCase()
      );
    }

    // 4. Stock Status Filter
    if (params?.stockStatus && params.stockStatus !== 'all') {
      if (params.stockStatus === 'in_stock') {
        items = items.filter((i) => i.stockStatus === 'In Stock');
      } else if (params.stockStatus === 'low_stock') {
        items = items.filter((i) => i.stockStatus === 'Low Stock');
      } else if (params.stockStatus === 'out_of_stock') {
        items = items.filter((i) => i.stockStatus === 'Out of Stock');
      }
    }

    // 5. Sorting
    const sortField = params?.sortBy || 'name';
    const sortOrder = params?.sortOrder || 'asc';
    const modifier = sortOrder === 'asc' ? 1 : -1;

    items.sort((a, b) => {
      if (sortField === 'name') {
        return a.productName.localeCompare(b.productName) * modifier;
      }
      if (sortField === 'company') {
        return a.companyName.localeCompare(b.companyName) * modifier;
      }
      if (sortField === 'stock') {
        return (a.currentStock - b.currentStock) * modifier;
      }
      if (sortField === 'inventoryValue') {
        return (a.inventoryValue - b.inventoryValue) * modifier;
      }
      if (sortField === 'basePrice') {
        return (a.basePrice - b.basePrice) * modifier;
      }
      if (sortField === 'reorderLevel') {
        return (a.reorderLevel - b.reorderLevel) * modifier;
      }
      return 0;
    });

    // 6. Pagination
    const page = params?.page || 1;
    const limit = params?.limit || 15;
    const total = items.length;
    const lastPage = Math.max(1, Math.ceil(total / limit));
    const offset = (page - 1) * limit;
    const paginatedItems = items.slice(offset, offset + limit);

    return {
      success: true,
      data: paginatedItems,
      message: 'Inventory items retrieved successfully.',
      meta: {
        currentPage: page,
        perPage: limit,
        total,
        lastPage,
      },
    };
  }

  public async getInventoryKPIs(role: UserRole = 'admin'): Promise<ApiResponse<InventorySummaryKPIs>> {
    await this.simulateNetwork();

    let totalInventoryItems = 0;
    let totalUnitsInStock = 0;
    let totalInventoryValue = 0;
    let totalPotentialSalesValue = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;
    let inStockCount = 0;

    this.variants.forEach((v) => {
      totalInventoryItems++;
      totalUnitsInStock += v.currentStock;
      totalPotentialSalesValue += v.currentStock * v.sellingPrice;

      if (role === 'admin') {
        totalInventoryValue += v.currentStock * v.basePrice;
      }

      if (v.currentStock === 0) {
        outOfStockCount++;
      } else if (v.currentStock <= v.reorderLevel) {
        lowStockCount++;
      } else {
        inStockCount++;
      }
    });

    return {
      success: true,
      data: {
        totalInventoryItems,
        totalUnitsInStock,
        totalInventoryValue: role === 'admin' ? totalInventoryValue : 0,
        totalPotentialSalesValue,
        lowStockCount,
        outOfStockCount,
        inStockCount,
      },
      message: 'Inventory KPI summaries calculated successfully.',
    };
  }

  public async getInventoryInsights(
    timeframe: InsightsTimeframe = 'this_month',
    role: UserRole = 'admin'
  ): Promise<ApiResponse<InventoryInsightsData>> {
    await this.simulateNetwork();

    const prodMap = new Map(this.products.map((p) => [p.id, p]));
    const catMap = this.getCategoryMap();
    const compMap = this.getCompanyMap();

    // 1. Calculate overall summary
    const kpiResponse = await this.getInventoryKPIs(role);
    const summary = kpiResponse.data;

    // 2. Hydrate all items
    const allItems: InventoryItem[] = [];
    for (const v of this.variants) {
      const hydrated = this.hydrateInventoryItem(v, role, prodMap, catMap, compMap);
      if (hydrated) allItems.push(hydrated);
    }

    // 3. Top Valued Items (Admin only, by currentStock * basePrice)
    const topValuedItems: TopValuedItemInsight[] = [...allItems]
      .filter((i) => i.currentStock > 0)
      .sort((a, b) => b.inventoryValue - a.inventoryValue)
      .slice(0, 6)
      .map((i) => ({
        variantId: i.id,
        productId: i.productId,
        productName: i.productName,
        genericName: i.genericName,
        companyName: i.companyName,
        currentStock: i.currentStock,
        basePrice: i.basePrice,
        inventoryValue: i.inventoryValue,
        stockStatus: i.stockStatus,
      }));

    // 4. Top Quantity Items
    const topQuantityItems: TopQuantityItemInsight[] = [...allItems]
      .sort((a, b) => b.currentStock - a.currentStock)
      .slice(0, 6)
      .map((i) => ({
        variantId: i.id,
        productId: i.productId,
        productName: i.productName,
        genericName: i.genericName,
        companyName: i.companyName,
        currentStock: i.currentStock,
        reorderLevel: i.reorderLevel,
        stockStatus: i.stockStatus,
      }));

    // 5. Category Distribution
    const catBuckets = new Map<string, { name: string; variants: number; units: number; val: number }>();
    this.categories.forEach((c) => {
      catBuckets.set(c.id, { name: c.name, variants: 0, units: 0, val: 0 });
    });

    allItems.forEach((item) => {
      const bucket = catBuckets.get(item.categoryId) || {
        name: item.category,
        variants: 0,
        units: 0,
        val: 0,
      };
      bucket.variants += 1;
      bucket.units += item.currentStock;
      bucket.val += item.inventoryValue;
      catBuckets.set(item.categoryId, bucket);
    });

    const categoryDistribution: CategoryStockDistribution[] = [];
    catBuckets.forEach((data, catId) => {
      if (data.variants > 0 || data.units > 0) {
        const pct = summary.totalUnitsInStock > 0 
          ? Number(((data.units / summary.totalUnitsInStock) * 100).toFixed(1)) 
          : 0;
        categoryDistribution.push({
          categoryId: catId,
          categoryName: data.name,
          totalVariants: data.variants,
          totalUnits: data.units,
          totalInventoryValue: data.val,
          percentageOfTotalUnits: pct,
        });
      }
    });
    categoryDistribution.sort((a, b) => b.totalUnits - a.totalUnits);

    // 6. Movement Summary for Timeframe
    let filteredMovements = [...this.movements];
    if (timeframe === 'today') {
      filteredMovements = filteredMovements.filter(
        (m) => m.createdAt.toLowerCase().includes('today')
      );
    } else if (timeframe === 'this_week') {
      filteredMovements = filteredMovements.filter(
        (m) =>
          m.createdAt.toLowerCase().includes('today') ||
          m.createdAt.toLowerCase().includes('days ago') ||
          m.createdAt.toLowerCase().includes('yesterday')
      );
    } else if (timeframe === 'this_month') {
      filteredMovements = filteredMovements.filter(
        (m) => !m.createdAt.toLowerCase().includes('apr') && !m.createdAt.toLowerCase().includes('may')
      );
    }

    let totalStockIn = 0;
    let totalStockOut = 0;
    let totalAdjustmentsCount = 0;

    filteredMovements.forEach((m) => {
      if (m.type === 'STOCK_IN') {
        totalStockIn += Math.abs(m.quantity);
      } else if (m.type === 'STOCK_OUT') {
        totalStockOut += Math.abs(m.quantity);
      } else if (m.type === 'ADJUSTMENT') {
        totalAdjustmentsCount++;
        if (m.quantity > 0) {
          totalStockIn += m.quantity;
        } else {
          totalStockOut += Math.abs(m.quantity);
        }
      }
    });

    const movementSummary: StockMovementSummaryInsight = {
      timeframe,
      totalStockIn,
      totalStockOut,
      netMovement: totalStockIn - totalStockOut,
      totalAdjustmentsCount,
      recentMovements: filteredMovements.slice(0, 10),
    };

    return {
      success: true,
      data: {
        timeframe,
        summary,
        movementSummary,
        topValuedItems,
        topQuantityItems,
        categoryDistribution,
      },
      message: 'Inventory insights compiled successfully.',
    };
  }

  public async queryInventoryMovements(
    params?: {
      productVariantId?: string;
      productId?: string;
      type?: string;
      search?: string;
      limit?: number;
    }
  ): Promise<ApiResponse<InventoryMovement[]>> {
    await this.simulateNetwork();

    let list = [...this.movements];

    if (params?.productVariantId) {
      list = list.filter((m) => m.productVariantId === params.productVariantId);
    }
    if (params?.productId) {
      list = list.filter((m) => m.productId === params.productId);
    }
    if (params?.type && params.type !== 'ALL') {
      list = list.filter((m) => m.type === params.type);
    }
    if (params?.search && params.search.trim()) {
      const q = params.search.toLowerCase().trim();
      list = list.filter(
        (m) =>
          m.productName.toLowerCase().includes(q) ||
          m.genericName.toLowerCase().includes(q) ||
          m.companyName.toLowerCase().includes(q) ||
          m.reason.toLowerCase().includes(q) ||
          m.createdBy.toLowerCase().includes(q)
      );
    }

    const limit = params?.limit || 50;
    return {
      success: true,
      data: list.slice(0, limit),
      message: 'Inventory movements retrieved successfully.',
    };
  }

  public async recordStockAdjustment(
    input: StockAdjustmentInput,
    role: UserRole = 'admin'
  ): Promise<ApiResponse<InventoryItem>> {
    await this.simulateNetwork();

    if (role !== 'admin') {
      throw new Error('Unauthorized: Only Pharmacy Administrators can adjust inventory stock.');
    }

    if (!input.reason || !input.reason.trim()) {
      throw new Error('Mandatory Reason Required: Every inventory adjustment must have an audit reason.');
    }

    const vIndex = this.variants.findIndex((v) => v.id === input.productVariantId);
    if (vIndex === -1) {
      throw new Error(`Variant ${input.productVariantId} not found.`);
    }

    const variant = this.variants[vIndex];
    const product = this.products.find((p) => p.id === variant.productId);
    if (!product) {
      throw new Error(`Product ${variant.productId} not found.`);
    }

    const company = this.companies.find((c) => c.id === variant.companyId);
    const companyName = company ? company.name : 'Unknown Company';

    const previousStock = variant.currentStock;
    let newStock = previousStock;

    if (input.adjustmentType === 'SET_EXACT') {
      newStock = Math.max(0, input.adjustmentQuantity);
    } else if (input.adjustmentType === 'INCREMENT') {
      newStock = previousStock + Math.max(0, input.adjustmentQuantity);
    } else if (input.adjustmentType === 'DECREMENT') {
      newStock = Math.max(0, previousStock - Math.max(0, input.adjustmentQuantity));
    }

    const deltaQuantity = newStock - previousStock;
    const timestamp = formatCurrentTimestamp();

    // 1. Update Variant in state
    this.variants[vIndex] = {
      ...variant,
      currentStock: newStock,
      updatedAt: timestamp,
    };
    product.updatedAt = timestamp;

    // 2. Create Audit Record in movements
    const combinedReason = input.customNotes && input.customNotes.trim()
      ? `${input.reason.trim()} — ${input.customNotes.trim()}`
      : input.reason.trim();

    const movement: InventoryMovement = {
      id: `mov-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      productVariantId: variant.id,
      productId: product.id,
      productName: product.name,
      genericName: product.genericName,
      companyName,
      type: 'ADJUSTMENT',
      quantity: deltaQuantity,
      previousStock,
      newStock,
      reason: combinedReason,
      referenceType: 'ADJUSTMENT',
      createdBy: input.adminName || 'Pharm. Abdullahi (Admin)',
      createdAt: `Today, ${new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`,
    };

    // Prepend to movements
    this.movements.unshift(movement);
    this.save();

    const hydrated = this.hydrateInventoryItem(this.variants[vIndex], role);
    if (!hydrated) {
      throw new Error('Failed to hydrate updated inventory item.');
    }

    return {
      success: true,
      data: hydrated,
      message: `Stock for ${product.name} (${companyName}) adjusted from ${previousStock} to ${newStock} units.`,
    };
  }

  // ==========================================
  // CUSTOMER & DEBT MANAGEMENT METHODS
  // ==========================================

  /**
   * Derives real-time customer financial metrics from underlying relational sales & debt payments
   */
  public hydrateCustomer(entity: CustomerEntity): Customer {
    const customerSales = this.sales.filter(
      (s) => s.customerId === entity.id && s.status === 'COMPLETED'
    );

    const totalPurchases = customerSales.reduce((sum, s) => sum + s.totalAmount, 0);

    // Initial debt generated from credit sales
    const totalDebt = customerSales.reduce((sum, s) => sum + s.outstandingAmount, 0);

    // Total payments made by customer towards debt
    const customerPayments = this.debtPayments.filter((p) => p.customerId === entity.id);
    const amountPaid = customerPayments.reduce((sum, p) => sum + p.amount, 0);

    const outstandingDebt = Math.max(0, totalDebt - amountPaid);
    const salesCount = customerSales.length;

    // Find latest purchase date
    let lastPurchaseDate: string | undefined = undefined;
    if (customerSales.length > 0) {
      const sortedSales = [...customerSales].sort(
        (a, b) => new Date(b.rawDate).getTime() - new Date(a.rawDate).getTime()
      );
      lastPurchaseDate = sortedSales[0].date;
    }

    return {
      ...entity,
      totalPurchases,
      totalDebt,
      amountPaid,
      outstandingDebt,
      salesCount,
      lastPurchaseDate,
    };
  }

  /**
   * Get filtered, sorted, paginated customer list
   */
  public async getCustomers(
    filters: CustomerFilterParams,
    role: UserRole
  ): Promise<ApiResponse<Customer[]>> {
    await this.simulateNetwork();

    let list = this.customers.map((c) => this.hydrateCustomer(c));

    // Filter by search (name, phone, email)
    if (filters.search && filters.search.trim()) {
      const query = filters.search.trim().toLowerCase();
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(query) ||
          c.phone.toLowerCase().includes(query) ||
          (c.email && c.email.toLowerCase().includes(query)) ||
          (c.address && c.address.toLowerCase().includes(query))
      );
    }

    // Filter by customer status
    if (filters.status && filters.status !== 'all') {
      const targetStatus = filters.status === 'active' ? 'Active' : 'Inactive';
      list = list.filter((c) => c.status === targetStatus);
    }

    // Filter by debt status
    if (filters.debtStatus && filters.debtStatus !== 'all') {
      if (filters.debtStatus === 'has_debt') {
        list = list.filter((c) => c.outstandingDebt > 0);
      } else if (filters.debtStatus === 'no_debt') {
        list = list.filter((c) => c.outstandingDebt === 0);
      }
    }

    // Sorting
    const sortField = filters.sortBy || 'name';
    const sortOrder = filters.sortOrder || 'asc';
    const multiplier = sortOrder === 'asc' ? 1 : -1;

    list.sort((a, b) => {
      if (sortField === 'name') {
        return multiplier * a.name.localeCompare(b.name);
      }
      if (sortField === 'debt') {
        return multiplier * (a.outstandingDebt - b.outstandingDebt);
      }
      if (sortField === 'purchases') {
        return multiplier * (a.totalPurchases - b.totalPurchases);
      }
      if (sortField === 'date') {
        const dateA = new Date(a.updatedAt || a.createdAt).getTime();
        const dateB = new Date(b.updatedAt || b.createdAt).getTime();
        return multiplier * (dateA - dateB);
      }
      return 0;
    });

    const total = list.length;
    const page = Math.max(1, filters.page || 1);
    const limit = Math.max(1, filters.limit || 10);
    const startIndex = (page - 1) * limit;
    const paginated = list.slice(startIndex, startIndex + limit);
    const lastPage = Math.ceil(total / limit) || 1;

    return {
      success: true,
      data: paginated,
      message: 'Customers retrieved successfully.',
      meta: {
        currentPage: page,
        perPage: limit,
        total,
        lastPage,
      },
    };
  }

  /**
   * Get single customer by ID with full details
   */
  public async getCustomerById(id: string): Promise<ApiResponse<Customer | null>> {
    await this.simulateNetwork();

    const entity = this.customers.find((c) => c.id === id);
    if (!entity) {
      return {
        success: false,
        data: null,
        message: `Customer with ID "${id}" was not found.`,
      };
    }

    const hydrated = this.hydrateCustomer(entity);
    return {
      success: true,
      data: hydrated,
      message: 'Customer retrieved successfully.',
    };
  }

  /**
   * Check if a phone number already exists in registered customers
   */
  public checkDuplicatePhone(phone: string, excludeCustomerId?: string): boolean {
    const cleanPhone = phone.replace(/\s+/g, '').trim();
    if (!cleanPhone) return false;
    return this.customers.some(
      (c) => c.phone.replace(/\s+/g, '').trim() === cleanPhone && c.id !== excludeCustomerId
    );
  }

  /**
   * Create a new registered customer with strict validation
   */
  public async createCustomer(input: CreateCustomerInput): Promise<ApiResponse<Customer>> {
    await this.simulateNetwork();

    const trimmedName = input.name?.trim();
    if (!trimmedName) {
      throw new Error('Customer name is required.');
    }

    const trimmedPhone = input.phone?.trim();
    if (!trimmedPhone) {
      throw new Error('Phone number is required.');
    }

    if (input.email && input.email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(input.email.trim())) {
        throw new Error('Enter a valid email address.');
      }
    }

    if (this.checkDuplicatePhone(trimmedPhone)) {
      throw new Error('A customer with this phone number already exists.');
    }

    const now = new Date().toISOString();
    const newCustomer: CustomerEntity = {
      id: `cust-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: trimmedName,
      phone: trimmedPhone,
      address: input.address?.trim() || undefined,
      email: input.email?.trim() || undefined,
      notes: input.notes?.trim() || undefined,
      status: input.status || 'Active',
      createdAt: now,
      updatedAt: now,
    };

    this.customers.unshift(newCustomer);
    this.save();

    const hydrated = this.hydrateCustomer(newCustomer);
    return {
      success: true,
      data: hydrated,
      message: `Customer "${newCustomer.name}" registered successfully.`,
    };
  }

  /**
   * Update existing customer
   */
  public async updateCustomer(
    id: string,
    input: UpdateCustomerInput
  ): Promise<ApiResponse<Customer>> {
    await this.simulateNetwork();

    const index = this.customers.findIndex((c) => c.id === id);
    if (index === -1) {
      throw new Error(`Customer with ID "${id}" was not found.`);
    }

    const current = this.customers[index];

    if (input.name !== undefined && !input.name.trim()) {
      throw new Error('Customer name is required.');
    }

    if (input.phone !== undefined && !input.phone.trim()) {
      throw new Error('Phone number is required.');
    }

    const newPhone = input.phone !== undefined ? input.phone.trim() : current.phone;
    if (this.checkDuplicatePhone(newPhone, id)) {
      throw new Error('A customer with this phone number already exists.');
    }

    if (input.email && input.email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(input.email.trim())) {
        throw new Error('Enter a valid email address.');
      }
    }

    const updated: CustomerEntity = {
      ...current,
      name: input.name !== undefined ? input.name.trim() : current.name,
      phone: newPhone,
      address: input.address !== undefined ? input.address.trim() : current.address,
      email: input.email !== undefined ? input.email.trim() : current.email,
      notes: input.notes !== undefined ? input.notes.trim() : current.notes,
      status: input.status !== undefined ? input.status : current.status,
      updatedAt: new Date().toISOString(),
    };

    this.customers[index] = updated;
    this.save();

    const hydrated = this.hydrateCustomer(updated);
    return {
      success: true,
      data: hydrated,
      message: `Customer "${updated.name}" updated successfully.`,
    };
  }

  /**
   * Deactivate customer (Preserves all historical sales and debt)
   */
  public async deactivateCustomer(id: string): Promise<ApiResponse<Customer>> {
    await this.simulateNetwork();

    const index = this.customers.findIndex((c) => c.id === id);
    if (index === -1) {
      throw new Error(`Customer with ID "${id}" was not found.`);
    }

    this.customers[index].status = 'Inactive';
    this.customers[index].updatedAt = new Date().toISOString();
    this.save();

    const hydrated = this.hydrateCustomer(this.customers[index]);
    return {
      success: true,
      data: hydrated,
      message: `Customer "${hydrated.name}" has been deactivated. Historical records remain intact.`,
    };
  }

  /**
   * Activate customer
   */
  public async activateCustomer(id: string): Promise<ApiResponse<Customer>> {
    await this.simulateNetwork();

    const index = this.customers.findIndex((c) => c.id === id);
    if (index === -1) {
      throw new Error(`Customer with ID "${id}" was not found.`);
    }

    this.customers[index].status = 'Active';
    this.customers[index].updatedAt = new Date().toISOString();
    this.save();

    const hydrated = this.hydrateCustomer(this.customers[index]);
    return {
      success: true,
      data: hydrated,
      message: `Customer "${hydrated.name}" is now Active.`,
    };
  }

  /**
   * Get sales history for a specific customer
   */
  public async getCustomerSales(
    customerId: string,
    page = 1,
    limit = 10
  ): Promise<ApiResponse<CustomerSale[]>> {
    await this.simulateNetwork();

    const customerSales = this.sales.filter(
      (s) => s.customerId === customerId && s.status === 'COMPLETED'
    );

    customerSales.sort(
      (a, b) => new Date(b.rawDate).getTime() - new Date(a.rawDate).getTime()
    );

    const total = customerSales.length;
    const startIndex = (page - 1) * limit;
    const paginated = customerSales.slice(startIndex, startIndex + limit);
    const lastPage = Math.ceil(total / limit) || 1;

    return {
      success: true,
      data: paginated,
      message: 'Customer sales retrieved successfully.',
      meta: {
        currentPage: page,
        perPage: limit,
        total,
        lastPage,
      },
    };
  }

  /**
   * Get debt payment history for a customer
   */
  public async getCustomerDebtPayments(
    customerId: string
  ): Promise<ApiResponse<CustomerDebtPayment[]>> {
    await this.simulateNetwork();

    const payments = this.debtPayments.filter((p) => p.customerId === customerId);
    payments.sort(
      (a, b) => new Date(b.rawDate).getTime() - new Date(a.rawDate).getTime()
    );

    return {
      success: true,
      data: payments,
      message: 'Customer debt payments retrieved successfully.',
    };
  }

  /**
   * Record debt payment with financial validation
   */
  public async recordDebtPayment(
    input: DebtPaymentInput,
    role: UserRole
  ): Promise<ApiResponse<{ customer: Customer; payment: CustomerDebtPayment }>> {
    await this.simulateNetwork();

    const customerEntity = this.customers.find((c) => c.id === input.customerId);
    if (!customerEntity) {
      throw new Error('Customer record not found.');
    }

    const hydratedCustomer = this.hydrateCustomer(customerEntity);
    const currentOutstanding = hydratedCustomer.outstandingDebt;

    if (currentOutstanding <= 0) {
      throw new Error('This customer has no outstanding debt.');
    }

    if (!input.amount || input.amount <= 0) {
      throw new Error('Payment amount must be greater than zero.');
    }

    if (input.amount > currentOutstanding) {
      throw new Error(
        `Payment cannot exceed the outstanding balance of ₦${currentOutstanding.toLocaleString()}.`
      );
    }

    const now = new Date();
    const formattedDate =
      now.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }) +
      ', ' +
      now.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      });

    const paymentNumber = String(this.debtPayments.length + 1).padStart(4, '0');
    const paymentRecord: CustomerDebtPayment = {
      id: `pay-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      receiptNumber: `RCT-${now.getFullYear()}-${paymentNumber}`,
      customerId: customerEntity.id,
      customerName: customerEntity.name,
      customerPhone: customerEntity.phone,
      amount: input.amount,
      paymentDate: input.paymentDate || formattedDate,
      rawDate: now.toISOString(),
      paymentMethod: input.paymentMethod || 'CASH',
      balanceBefore: currentOutstanding,
      balanceAfter: currentOutstanding - input.amount,
      referenceNotes: input.referenceNotes?.trim() || undefined,
      recordedBy:
        input.recordedBy ||
        (role === 'admin' ? 'Pharm. Abdullahi (Admin)' : 'Cashier Zainab'),
      createdAt: now.toISOString(),
    };

    this.debtPayments.unshift(paymentRecord);
    customerEntity.updatedAt = now.toISOString();
    this.save();

    const updatedCustomer = this.hydrateCustomer(customerEntity);

    return {
      success: true,
      data: {
        customer: updatedCustomer,
        payment: paymentRecord,
      },
      message: `Payment of ₦${input.amount.toLocaleString()} recorded successfully for ${customerEntity.name}. Remaining balance: ₦${updatedCustomer.outstandingDebt.toLocaleString()}.`,
    };
  }

  /**
   * Get high-level KPI summaries for Customers Module
   */
  public async getCustomerKPIs(): Promise<ApiResponse<CustomerSummaryKPIs>> {
    await this.simulateNetwork();

    const hydratedList = this.customers.map((c) => this.hydrateCustomer(c));

    const totalCustomers = hydratedList.length;
    const activeCustomers = hydratedList.filter((c) => c.status === 'Active').length;
    const inactiveCustomers = hydratedList.filter((c) => c.status === 'Inactive').length;
    const customersWithDebt = hydratedList.filter((c) => c.outstandingDebt > 0).length;
    const totalOutstandingDebt = hydratedList.reduce((sum, c) => sum + c.outstandingDebt, 0);
    const totalCustomerPurchases = hydratedList.reduce((sum, c) => sum + c.totalPurchases, 0);

    return {
      success: true,
      data: {
        totalCustomers,
        activeCustomers,
        inactiveCustomers,
        customersWithDebt,
        totalOutstandingDebt,
        totalCustomerPurchases,
      },
      message: 'Customer KPIs calculated successfully.',
    };
  }

  // ==========================================
  // Dev Debugging & Configuration Helpers
  // ==========================================

  public setConfig(updates: Partial<MockDbConfig>): void {
    this.config = { ...this.config, ...updates };
    this.save();
  }

  public getConfig(): MockDbConfig {
    return { ...this.config };
  }

  public resetDatabase(): void {
    this.categories = [...MOCK_CATEGORIES];
    this.companies = [...MOCK_COMPANIES];
    this.products = [...MOCK_PRODUCTS];
    this.variants = [...MOCK_PRODUCT_VARIANTS];
    this.movements = [...MOCK_INVENTORY_MOVEMENTS];
    this.customers = [...MOCK_CUSTOMERS];
    this.sales = [...MOCK_CUSTOMER_SALES];
    this.debtPayments = [...MOCK_CUSTOMER_DEBT_PAYMENTS];
    this.config = { ...DEFAULT_CONFIG };
    this.save();
  }
}

export const mockRepository = new MockDatabaseRepository();

