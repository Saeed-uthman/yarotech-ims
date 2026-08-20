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
  Sale,
  SaleItem,
  SalesFilterParams,
  SalesSummaryKPIs,
  SalesChartDataPoint,
  CreateSaleInput,
  SalesDateRange,
  SalePaymentStatus,
  SalePaymentMethod,
  StockPurchase,
  PurchaseItemEntity,
  PurchaseFilterParams,
  PurchaseSummaryKPIs,
  PurchaseChartDataPoint,
  CreatePurchaseInput,
  CreatePurchaseItemInput,
  PurchaseDateRange,
  StockPurchaseStatus,
  PurchasePaymentMethod,
  AccountabilityDirection,
  AccountabilityType,
  ExpenseCategory,
  AccountabilityPaymentMethod,
  AccountabilityDateRange,
  AccountabilityTransaction,
  ManualExpense,
  CreateExpenseInput,
  AccountabilityFilterParams,
  AccountabilitySummary,
  AccountabilityDateGroup,
  ReportDateRange,
  ReportTab,
  ReportFilterParams,
  FinancialSummaryReport,
  DailyReportTrendPoint,
  SalesReportData,
  ProfitReportData,
  StockPurchaseReportData,
  FinancialMovementReportData,
  ProductPerformanceItem,
  ProductPerformanceReportData,
  InventoryMovementReportItem,
  InventoryMovementReportData,
  DebtMovementReportData,
  SystemSettings,
  UpdateSettingsInput,
  ChangePasswordInput,
  DashboardFilterParams,
  DashboardData,
  DashboardSummaryKPIs,
  DashboardSalesTrendPoint,
  DashboardFinancialMovementPoint,
  DashboardTopProduct,
  DashboardRecentSale,
  DashboardRecentPurchase,
  DashboardStockAlert,
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
  MOCK_STOCK_PURCHASES,
  MOCK_MANUAL_EXPENSES,
  DEFAULT_MOCK_SETTINGS,
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
  PURCHASES: 'stitch_pharmacy_db_stock_purchases',
  EXPENSES: 'stitch_pharmacy_db_expenses',
  SETTINGS: 'stitch_pharmacy_db_settings',
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
  private purchases: StockPurchase[] = [];
  private expenses: ManualExpense[] = [];
  private settings: SystemSettings = { ...DEFAULT_MOCK_SETTINGS };
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
    this.purchases = getStorage(DB_KEYS.PURCHASES, MOCK_STOCK_PURCHASES);
    this.expenses = getStorage(DB_KEYS.EXPENSES, MOCK_MANUAL_EXPENSES);
    this.settings = getStorage(DB_KEYS.SETTINGS, { ...DEFAULT_MOCK_SETTINGS });
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
    setStorage(DB_KEYS.PURCHASES, this.purchases);
    setStorage(DB_KEYS.EXPENSES, this.expenses);
    setStorage(DB_KEYS.SETTINGS, this.settings);
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
  // Sales Module Methods (Part 3)
  // ==========================================

  /**
   * Hydrates sale record, calculating or redacting base price & profit based on user role
   */
  public hydrateSale(sale: Sale, role: UserRole): Sale {
    const isCashier = role === 'cashier';

    const items: SaleItem[] = sale.items.map((item) => {
      const sellingPrice = item.sellingPrice ?? item.unitPrice ?? 0;
      const quantity = item.quantity;
      const subtotal = item.subtotal ?? item.totalPrice ?? (sellingPrice * quantity);
      const basePrice = item.basePrice ?? 0;
      const itemProfit = item.profit ?? Math.max(0, (sellingPrice - basePrice) * quantity);

      return {
        ...item,
        sellingPrice,
        unitPrice: sellingPrice,
        subtotal,
        totalPrice: subtotal,
        basePrice: isCashier ? undefined : basePrice,
        profit: isCashier ? undefined : itemProfit,
      };
    });

    const subtotal = sale.subtotal ?? items.reduce((sum, it) => sum + it.subtotal, 0);
    const discount = sale.discount ?? 0;
    const total = sale.total ?? sale.totalAmount ?? Math.max(0, subtotal - discount);
    const amountPaid = sale.amountPaid ?? sale.paidAmount ?? 0;
    const outstandingAmount = Math.max(0, total - amountPaid);

    let paymentStatus: SalePaymentStatus = sale.paymentStatus;
    if (!paymentStatus) {
      if (amountPaid >= total && total > 0) {
        paymentStatus = 'PAID';
      } else if (amountPaid > 0 && amountPaid < total) {
        paymentStatus = 'PARTIAL';
      } else {
        paymentStatus = 'UNPAID';
      }
    }

    const calculatedProfit = items.reduce((sum, it) => sum + (it.profit ?? 0), 0);
    const overallProfit = sale.profit !== undefined ? sale.profit : calculatedProfit;

    return {
      ...sale,
      items,
      itemCount: items.length,
      subtotal,
      discount,
      total,
      totalAmount: total,
      amountPaid,
      paidAmount: amountPaid,
      outstandingAmount,
      paymentStatus,
      paymentType: paymentStatus,
      profit: isCashier ? undefined : overallProfit,
    };
  }

  /**
   * Filter sales by date range and search criteria
   */
  private filterSalesList(filters: SalesFilterParams): Sale[] {
    let list = [...this.sales];

    // Reference simulated date: 19 Aug 2026
    const refDateStr = '2026-08-19';

    // 1. Date Range Filtering
    if (filters.dateRange === 'today') {
      list = list.filter((s) => s.rawDate.startsWith(refDateStr));
    } else if (filters.dateRange === 'this_week') {
      const weekStart = '2026-08-17T00:00:00Z';
      const weekEnd = '2026-08-23T23:59:59Z';
      list = list.filter((s) => s.rawDate >= weekStart && s.rawDate <= weekEnd);
    } else if (filters.dateRange === 'this_month') {
      const monthStart = '2026-08-01T00:00:00Z';
      const monthEnd = '2026-08-31T23:59:59Z';
      list = list.filter((s) => s.rawDate >= monthStart && s.rawDate <= monthEnd);
    } else if (filters.dateRange === 'custom') {
      if (filters.startDate) {
        const startIso = `${filters.startDate}T00:00:00Z`;
        list = list.filter((s) => s.rawDate >= startIso);
      }
      if (filters.endDate) {
        const endIso = `${filters.endDate}T23:59:59Z`;
        list = list.filter((s) => s.rawDate <= endIso);
      }
    }
    // 'overall' includes everything

    // 2. Search query (Sale ID / Invoice, Customer name, Phone, Product name, Generic name, Company)
    if (filters.search && filters.search.trim()) {
      const q = filters.search.trim().toLowerCase();
      list = list.filter((s) => {
        const matchInvoice = s.invoiceNumber.toLowerCase().includes(q) || s.id.toLowerCase().includes(q);
        const matchCustomer = s.customerName.toLowerCase().includes(q) || (s.customerPhone && s.customerPhone.includes(q));
        const matchItems = s.items.some(
          (it) =>
            it.productName.toLowerCase().includes(q) ||
            it.genericName.toLowerCase().includes(q) ||
            it.companyName.toLowerCase().includes(q)
        );
        const matchServedBy = s.servedBy.toLowerCase().includes(q);
        return matchInvoice || matchCustomer || matchItems || matchServedBy;
      });
    }

    // 3. Payment Status filter
    if (filters.paymentStatus && filters.paymentStatus !== 'all') {
      list = list.filter((s) => {
        const status = s.paymentStatus || (s.amountPaid >= (s.total ?? s.totalAmount ?? 0) ? 'PAID' : s.amountPaid > 0 ? 'PARTIAL' : 'UNPAID');
        return status === filters.paymentStatus;
      });
    }

    // 4. Customer Type filter
    if (filters.customerType && filters.customerType !== 'all') {
      if (filters.customerType === 'registered') {
        list = list.filter((s) => s.customerId !== null);
      } else if (filters.customerType === 'walking') {
        list = list.filter((s) => s.customerId === null);
      }
    }

    return list;
  }

  /**
   * Get filtered, sorted, paginated sales history
   */
  public async getSales(
    filters: SalesFilterParams,
    role: UserRole
  ): Promise<ApiResponse<Sale[]>> {
    await this.simulateNetwork();

    const filtered = this.filterSalesList(filters);

    // Sorting
    const sortField = filters.sortBy || 'date';
    const sortOrder = filters.sortOrder || 'desc';
    const mult = sortOrder === 'asc' ? 1 : -1;

    filtered.sort((a, b) => {
      if (sortField === 'date') {
        return mult * (new Date(a.rawDate).getTime() - new Date(b.rawDate).getTime());
      }
      if (sortField === 'total') {
        const totA = a.total ?? a.totalAmount ?? 0;
        const totB = b.total ?? b.totalAmount ?? 0;
        return mult * (totA - totB);
      }
      if (sortField === 'profit') {
        const profA = a.profit ?? 0;
        const profB = b.profit ?? 0;
        return mult * (profA - profB);
      }
      if (sortField === 'customer') {
        return mult * a.customerName.localeCompare(b.customerName);
      }
      if (sortField === 'invoiceNumber') {
        return mult * a.invoiceNumber.localeCompare(b.invoiceNumber);
      }
      return 0;
    });

    const total = filtered.length;
    const page = Math.max(1, filters.page || 1);
    const limit = Math.max(1, filters.limit || 10);
    const startIndex = (page - 1) * limit;
    const paginated = filtered.slice(startIndex, startIndex + limit);
    const lastPage = Math.ceil(total / limit) || 1;

    const hydratedList = paginated.map((s) => this.hydrateSale(s, role));

    return {
      success: true,
      data: hydratedList,
      message: 'Sales records retrieved successfully.',
      meta: {
        currentPage: page,
        perPage: limit,
        total,
        lastPage,
      },
    };
  }

  /**
   * Get single sale by ID with full item details
   */
  public async getSaleById(id: string, role: UserRole): Promise<ApiResponse<Sale | null>> {
    await this.simulateNetwork();

    const sale = this.sales.find((s) => s.id === id || s.invoiceNumber === id);
    if (!sale) {
      return {
        success: false,
        data: null,
        message: `Sale record "${id}" was not found.`,
      };
    }

    return {
      success: true,
      data: this.hydrateSale(sale, role),
      message: 'Sale details retrieved successfully.',
    };
  }

  /**
   * Get KPI summaries for Sales Module (Revenue, Profit, Transactions, Outstanding)
   */
  public async getSalesSummaryKPIs(
    filters: SalesFilterParams,
    role: UserRole
  ): Promise<ApiResponse<SalesSummaryKPIs>> {
    await this.simulateNetwork();

    const filtered = this.filterSalesList(filters);

    let totalRevenue = 0;
    let totalProfit = 0;
    let totalOutstanding = 0;
    let paidCount = 0;
    let partialCount = 0;
    let unpaidCount = 0;

    for (const sale of filtered) {
      if (sale.status === 'CANCELLED') continue;

      const total = sale.total ?? sale.totalAmount ?? 0;
      const paid = sale.amountPaid ?? sale.paidAmount ?? 0;
      const outstanding = Math.max(0, total - paid);

      totalRevenue += total;
      totalOutstanding += outstanding;

      if (role === 'admin') {
        const p = sale.profit ?? sale.items.reduce((sum, it) => sum + (it.profit ?? 0), 0);
        totalProfit += p;
      }

      if (paid >= total && total > 0) {
        paidCount++;
      } else if (paid > 0 && paid < total) {
        partialCount++;
      } else {
        unpaidCount++;
      }
    }

    const totalTransactions = filtered.filter((s) => s.status !== 'CANCELLED').length;
    const averageSaleValue = totalTransactions > 0 ? Math.round(totalRevenue / totalTransactions) : 0;

    return {
      success: true,
      data: {
        totalRevenue,
        totalProfit: role === 'admin' ? totalProfit : 0,
        totalTransactions,
        totalOutstanding,
        averageSaleValue,
        paidCount,
        partialCount,
        unpaidCount,
        timeframe: filters.dateRange,
      },
      message: 'Sales KPI summaries calculated successfully.',
    };
  }

  /**
   * Get chart timeline data for revenue & profit
   */
  public async getSalesChartData(
    dateRange: SalesDateRange,
    role: UserRole,
    customStart?: string,
    customEnd?: string
  ): Promise<ApiResponse<SalesChartDataPoint[]>> {
    await this.simulateNetwork();

    const dummyFilters: SalesFilterParams = {
      search: '',
      dateRange,
      startDate: customStart,
      endDate: customEnd,
      paymentStatus: 'all',
      customerType: 'all',
      sortBy: 'date',
      sortOrder: 'asc',
      page: 1,
      limit: 1000,
    };

    const sales = this.filterSalesList(dummyFilters);
    const isCashier = role === 'cashier';

    const pointMap: { [key: string]: { revenue: number; profit: number; count: number; rawDate: string } } = {};

    if (dateRange === 'today') {
      const hours = ['08:00 AM', '10:00 AM', '12:00 PM', '02:00 PM', '04:00 PM', '06:00 PM'];
      hours.forEach((h) => {
        pointMap[h] = { revenue: 0, profit: 0, count: 0, rawDate: `2026-08-19 ${h}` };
      });

      sales.forEach((s) => {
        const total = s.total ?? s.totalAmount ?? 0;
        const prof = isCashier ? 0 : (s.profit ?? 0);
        // Distribute or bucket by hour
        const d = new Date(s.rawDate);
        const hour = d.getHours();
        let bucket = '12:00 PM';
        if (hour < 9) bucket = '08:00 AM';
        else if (hour < 11) bucket = '10:00 AM';
        else if (hour < 13) bucket = '12:00 PM';
        else if (hour < 15) bucket = '02:00 PM';
        else if (hour < 17) bucket = '04:00 PM';
        else bucket = '06:00 PM';

        if (!pointMap[bucket]) {
          pointMap[bucket] = { revenue: 0, profit: 0, count: 0, rawDate: s.rawDate };
        }
        pointMap[bucket].revenue += total;
        pointMap[bucket].profit += prof;
        pointMap[bucket].count += 1;
      });
    } else if (dateRange === 'this_week') {
      const days = ['Mon 17', 'Tue 18', 'Wed 19', 'Thu 20', 'Fri 21', 'Sat 22', 'Sun 23'];
      days.forEach((d) => {
        pointMap[d] = { revenue: 0, profit: 0, count: 0, rawDate: d };
      });

      sales.forEach((s) => {
        const total = s.total ?? s.totalAmount ?? 0;
        const prof = isCashier ? 0 : (s.profit ?? 0);
        const dateStr = s.rawDate.substring(0, 10);
        let dayKey = 'Wed 19';
        if (dateStr === '2026-08-17') dayKey = 'Mon 17';
        else if (dateStr === '2026-08-18') dayKey = 'Tue 18';
        else if (dateStr === '2026-08-19') dayKey = 'Wed 19';
        else if (dateStr === '2026-08-20') dayKey = 'Thu 20';
        else if (dateStr === '2026-08-21') dayKey = 'Fri 21';
        else if (dateStr === '2026-08-22') dayKey = 'Sat 22';
        else if (dateStr === '2026-08-23') dayKey = 'Sun 23';

        if (!pointMap[dayKey]) {
          pointMap[dayKey] = { revenue: 0, profit: 0, count: 0, rawDate: s.rawDate };
        }
        pointMap[dayKey].revenue += total;
        pointMap[dayKey].profit += prof;
        pointMap[dayKey].count += 1;
      });
    } else {
      // Month / Overall / Custom - bucket by date or week
      sales.forEach((s) => {
        const total = s.total ?? s.totalAmount ?? 0;
        const prof = isCashier ? 0 : (s.profit ?? 0);
        const key = s.date.split(',')[0] || s.rawDate.substring(0, 10);
        if (!pointMap[key]) {
          pointMap[key] = { revenue: 0, profit: 0, count: 0, rawDate: s.rawDate };
        }
        pointMap[key].revenue += total;
        pointMap[key].profit += prof;
        pointMap[key].count += 1;
      });
    }

    const data: SalesChartDataPoint[] = Object.keys(pointMap).map((label) => ({
      label,
      revenue: pointMap[label].revenue,
      profit: isCashier ? 0 : pointMap[label].profit,
      transactions: pointMap[label].count,
      rawDate: pointMap[label].rawDate,
    }));

    return {
      success: true,
      data,
      message: 'Sales chart data generated successfully.',
    };
  }

  /**
   * Create and record a new sale (POS Complete Sale) with stock deduction, debt sync, and movement tracking
   */
  public async createSale(
    input: CreateSaleInput,
    role: UserRole
  ): Promise<ApiResponse<Sale>> {
    await this.simulateNetwork();

    // 1. Validate Items
    if (!input.items || input.items.length === 0) {
      throw new Error('Sale must include at least one product item.');
    }

    // 2. Resolve Variants and Validate Stock
    const saleItems: SaleItem[] = [];
    let subtotal = 0;
    let totalCost = 0;

    for (const itemInput of input.items) {
      if (itemInput.quantity <= 0) {
        throw new Error('Item quantity must be greater than zero.');
      }

      const variant = this.variants.find((v) => v.id === itemInput.productVariantId);
      if (!variant) {
        throw new Error(`Product variant "${itemInput.productVariantId}" not found.`);
      }

      const product = this.products.find((p) => p.id === variant.productId);
      const company = this.companies.find((c) => c.id === variant.companyId);

      const productName = product ? product.name : 'Unknown Product';
      const companyName = company ? company.name : 'Unknown Manufacturer';

      // Strict Stock Check
      if (variant.currentStock < itemInput.quantity) {
        throw new Error(
          `Insufficient stock for "${productName} (${companyName})". Available: ${variant.currentStock}, Requested: ${itemInput.quantity}.`
        );
      }

      // Snapshot prices
      const sellingPrice = variant.sellingPrice;
      const basePrice = variant.basePrice;
      const itemSubtotal = sellingPrice * itemInput.quantity;
      const itemProfit = (sellingPrice - basePrice) * itemInput.quantity;

      subtotal += itemSubtotal;
      totalCost += basePrice * itemInput.quantity;

      saleItems.push({
        id: `si-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        productId: variant.productId,
        productVariantId: variant.id,
        productName,
        genericName: product ? product.genericName : '',
        companyId: variant.companyId,
        companyName,
        dosage: product ? product.dosage : undefined,
        form: product ? product.form : undefined,
        quantity: itemInput.quantity,
        sellingPrice,
        unitPrice: sellingPrice,
        basePrice,
        subtotal: itemSubtotal,
        totalPrice: itemSubtotal,
        profit: itemProfit,
      });
    }

    // 3. Discount & Total calculation
    const discount = Math.max(0, input.discount || 0);
    if (discount > subtotal) {
      throw new Error('Discount cannot exceed the subtotal amount.');
    }
    const grandTotal = subtotal - discount;

    // 4. Validate Amount Paid & Customer Type
    const amountPaid = Math.max(0, input.amountPaid ?? grandTotal);
    if (amountPaid > grandTotal) {
      throw new Error(`Amount paid (₦${amountPaid.toLocaleString()}) cannot exceed the total amount (₦${grandTotal.toLocaleString()}).`);
    }

    const outstandingAmount = grandTotal - amountPaid;

    // Walking customer restriction: Must be fully paid
    if (!input.customerId && outstandingAmount > 0) {
      throw new Error('Credit or partial payment is only allowed for Registered Customers. Walking Customers must pay in full.');
    }

    // Verify registered customer if provided
    let customerName = 'Walking Customer';
    let customerPhone: string | undefined = undefined;
    let customerEntity: CustomerEntity | undefined = undefined;

    if (input.customerId) {
      customerEntity = this.customers.find((c) => c.id === input.customerId);
      if (!customerEntity) {
        throw new Error('Selected customer record was not found.');
      }
      customerName = customerEntity.name;
      customerPhone = customerEntity.phone;
    }

    // Determine payment status
    let paymentStatus: SalePaymentStatus = 'PAID';
    if (amountPaid === 0) {
      paymentStatus = 'UNPAID';
    } else if (amountPaid < grandTotal) {
      paymentStatus = 'PARTIAL';
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

    const invoiceNumber = `Sale #${String(this.sales.length + 101).padStart(6, '0')}`;
    const saleId = `sale-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const overallProfit = Math.max(0, grandTotal - totalCost);

    const cashierName =
      input.servedBy ||
      (role === 'admin' ? 'Pharm. Abdullahi (Admin)' : 'Cashier Zainab');

    const newSale: Sale = {
      id: saleId,
      invoiceNumber,
      date: formattedDate,
      rawDate: now.toISOString(),
      customerId: input.customerId || null,
      customerName,
      customerPhone,
      itemCount: saleItems.length,
      items: saleItems,
      subtotal,
      discount,
      total: grandTotal,
      totalAmount: grandTotal,
      amountPaid,
      paidAmount: amountPaid,
      outstandingAmount,
      paymentStatus,
      paymentType: paymentStatus,
      paymentMethod: input.paymentMethod || 'CASH',
      profit: overallProfit,
      servedBy: cashierName,
      notes: input.notes?.trim() || undefined,
      status: 'COMPLETED',
    };

    // 5. Deduct Stock & Generate Inventory Movements
    for (const item of saleItems) {
      const vIndex = this.variants.findIndex((v) => v.id === item.productVariantId);
      if (vIndex !== -1) {
        const prevStock = this.variants[vIndex].currentStock;
        const newStock = Math.max(0, prevStock - item.quantity);
        this.variants[vIndex].currentStock = newStock;
        this.variants[vIndex].updatedAt = now.toISOString();

        // Create InventoryMovement log
        const movement: InventoryMovement = {
          id: `mov-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          productVariantId: item.productVariantId,
          productId: item.productId,
          productName: item.productName,
          genericName: item.genericName,
          companyName: item.companyName,
          type: 'STOCK_OUT',
          quantity: -item.quantity,
          previousStock: prevStock,
          newStock,
          reason: `Dispensed in ${invoiceNumber} to ${customerName}`,
          referenceType: 'SALE',
          referenceId: saleId,
          createdBy: cashierName,
          createdAt: now.toISOString(),
        };
        this.movements.unshift(movement);
      }
    }

    // 6. Update Customer activity timestamp
    if (customerEntity) {
      customerEntity.updatedAt = now.toISOString();
    }

    // 7. Persist Sale
    this.sales.unshift(newSale);
    this.save();

    const hydrated = this.hydrateSale(newSale, role);
    return {
      success: true,
      data: hydrated,
      message: `${invoiceNumber} completed successfully. Total: ₦${grandTotal.toLocaleString()}${outstandingAmount > 0 ? ` (₦${outstandingAmount.toLocaleString()} added to customer debt)` : ''}.`,
    };
  }


  // ==========================================
  // 10. Stock Purchase Module Methods (Part 7)
  // ==========================================

  /**
   * Hydrates purchase record ensuring all items, subtotals, and totals are mathematically consistent
   */
  private hydratePurchase(purchase: StockPurchase, role: UserRole): StockPurchase {
    const items = purchase.items.map((item) => {
      const quantity = Math.max(1, Math.round(item.quantity));
      const unitPurchasePrice = Math.max(0, item.unitPurchasePrice);
      const subtotal = item.subtotal ?? quantity * unitPurchasePrice;
      return {
        ...item,
        quantity,
        unitPurchasePrice,
        subtotal,
      };
    });

    const totalAmount = purchase.totalAmount ?? items.reduce((sum, it) => sum + it.subtotal, 0);
    const totalUnits = items.reduce((sum, it) => sum + it.quantity, 0);

    return {
      ...purchase,
      items,
      itemCount: items.length,
      totalUnits,
      totalAmount,
    };
  }

  /**
   * Filter stock purchases by date range and search criteria
   */
  private filterPurchasesList(filters: PurchaseFilterParams): StockPurchase[] {
    let list = [...this.purchases];

    // Reference simulated system date: 19 Aug 2026
    const refDateStr = '2026-08-19';

    // 1. Date Range Filtering
    if (filters.dateRange === 'today') {
      list = list.filter((p) => p.rawDate.startsWith(refDateStr));
    } else if (filters.dateRange === 'this_week') {
      const weekStart = '2026-08-17T00:00:00Z';
      const weekEnd = '2026-08-23T23:59:59Z';
      list = list.filter((p) => p.rawDate >= weekStart && p.rawDate <= weekEnd);
    } else if (filters.dateRange === 'this_month') {
      const monthStart = '2026-08-01T00:00:00Z';
      const monthEnd = '2026-08-31T23:59:59Z';
      list = list.filter((p) => p.rawDate >= monthStart && p.rawDate <= monthEnd);
    } else if (filters.dateRange === 'custom') {
      if (filters.startDate) {
        const startIso = `${filters.startDate}T00:00:00Z`;
        list = list.filter((p) => p.rawDate >= startIso);
      }
      if (filters.endDate) {
        const endIso = `${filters.endDate}T23:59:59Z`;
        list = list.filter((p) => p.rawDate <= endIso);
      }
    }
    // 'overall' retains all records

    // 2. Search query (Purchase ID / Number, Product, Generic name, Company, Recorded By, Note)
    if (filters.search && filters.search.trim()) {
      const q = filters.search.trim().toLowerCase();
      list = list.filter((p) => {
        const matchId = p.purchaseNumber.toLowerCase().includes(q) || p.id.toLowerCase().includes(q);
        const matchRecordedBy = p.recordedBy.toLowerCase().includes(q);
        const matchNote = p.note ? p.note.toLowerCase().includes(q) : false;
        const matchItems = p.items.some(
          (it) =>
            it.productName.toLowerCase().includes(q) ||
            it.genericName.toLowerCase().includes(q) ||
            it.companyName.toLowerCase().includes(q)
        );
        return matchId || matchRecordedBy || matchNote || matchItems;
      });
    }

    // 3. Payment Method filter
    if (filters.paymentMethod && filters.paymentMethod !== 'all') {
      list = list.filter((p) => p.paymentMethod === filters.paymentMethod);
    }

    // 4. Status filter
    if (filters.status && filters.status !== 'all') {
      list = list.filter((p) => p.status === filters.status);
    }

    return list;
  }

  /**
   * Get filtered, sorted, paginated stock purchases
   */
  public async getPurchases(
    filters: PurchaseFilterParams,
    role: UserRole = 'admin'
  ): Promise<ApiResponse<StockPurchase[]>> {
    await this.simulateNetwork();

    const filtered = this.filterPurchasesList(filters);

    // Sorting
    const sortBy = filters.sortBy || 'date';
    const sortOrder = filters.sortOrder || 'desc';

    filtered.sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'date') {
        comparison = new Date(a.rawDate).getTime() - new Date(b.rawDate).getTime();
      } else if (sortBy === 'total') {
        comparison = a.totalAmount - b.totalAmount;
      } else if (sortBy === 'items') {
        comparison = a.itemCount - b.itemCount;
      } else if (sortBy === 'purchaseNumber') {
        comparison = a.purchaseNumber.localeCompare(b.purchaseNumber);
      }

      return sortOrder === 'desc' ? -comparison : comparison;
    });

    const page = Math.max(1, filters.page || 1);
    const limit = Math.max(1, filters.limit || 10);
    const total = filtered.length;
    const lastPage = Math.ceil(total / limit) || 1;
    const startIndex = (page - 1) * limit;
    const paginated = filtered.slice(startIndex, startIndex + limit);

    const hydratedData = paginated.map((p) => this.hydratePurchase(p, role));

    return {
      success: true,
      data: hydratedData,
      message: `Retrieved ${paginated.length} stock purchases.`,
      meta: {
        currentPage: page,
        perPage: limit,
        total,
        lastPage,
      },
    };
  }

  /**
   * Get single stock purchase by ID with full itemized details
   */
  public async getPurchaseById(
    id: string,
    role: UserRole = 'admin'
  ): Promise<ApiResponse<StockPurchase>> {
    await this.simulateNetwork();

    const purchase = this.purchases.find((p) => p.id === id || p.purchaseNumber === id);
    if (!purchase) {
      return {
        success: false,
        data: null as any,
        message: `Stock purchase "${id}" not found.`,
      };
    }

    return {
      success: true,
      data: this.hydratePurchase(purchase, role),
      message: 'Stock purchase details loaded.',
    };
  }

  /**
   * Calculate summary KPIs for stock purchases
   */
  public async getPurchaseSummaryKPIs(
    filters: Partial<PurchaseFilterParams> = {},
    role: UserRole = 'admin'
  ): Promise<ApiResponse<PurchaseSummaryKPIs>> {
    await this.simulateNetwork();

    const timeframe = filters.dateRange || 'today';
    const matching = this.filterPurchasesList({
      search: filters.search || '',
      dateRange: timeframe,
      startDate: filters.startDate,
      endDate: filters.endDate,
      paymentMethod: filters.paymentMethod || 'all',
      status: 'all', // Analyze all matching purchases in this timeframe
      sortBy: 'date',
      sortOrder: 'desc',
      page: 1,
      limit: 1000,
    });

    const completed = matching.filter((p) => p.status === 'COMPLETED');
    const cancelled = matching.filter((p) => p.status === 'CANCELLED');

    const totalSpent = completed.reduce((sum, p) => sum + p.totalAmount, 0);
    const totalUnitsRestocked = completed.reduce((sum, p) => sum + (p.totalUnits || p.items.reduce((s, it) => s + it.quantity, 0)), 0);
    const averagePurchaseValue = completed.length > 0 ? Math.round(totalSpent / completed.length) : 0;

    return {
      success: true,
      data: {
        totalSpent,
        totalPurchasesCount: matching.length,
        completedPurchasesCount: completed.length,
        cancelledPurchasesCount: cancelled.length,
        totalUnitsRestocked,
        averagePurchaseValue,
        timeframe,
      },
      message: 'Purchase summary KPIs calculated.',
    };
  }

  /**
   * Generate timeline chart data points for stock purchases
   */
  public async getPurchaseChartData(
    dateRange: PurchaseDateRange = 'today',
    role: UserRole = 'admin',
    startDate?: string,
    endDate?: string
  ): Promise<ApiResponse<PurchaseChartDataPoint[]>> {
    await this.simulateNetwork();

    const matching = this.filterPurchasesList({
      search: '',
      dateRange,
      startDate,
      endDate,
      paymentMethod: 'all',
      status: 'COMPLETED',
      sortBy: 'date',
      sortOrder: 'asc',
      page: 1,
      limit: 2000,
    });

    const pointsMap = new Map<string, { label: string; amountSpent: number; units: number; purchasesCount: number; rawDate: string }>();

    if (dateRange === 'today') {
      // Group by hour blocks (08:00 - 18:00)
      const hours = ['08:00', '10:00', '12:00', '14:00', '16:00', '18:00'];
      hours.forEach((h) => {
        pointsMap.set(h, { label: h, amountSpent: 0, units: 0, purchasesCount: 0, rawDate: `2026-08-19T${h.replace(':', '')}:00Z` });
      });

      matching.forEach((p) => {
        const timePart = p.purchaseDate.split(', ')[1] || '10:00 AM';
        const hourNum = parseInt(timePart.split(':')[0], 10);
        const isPM = timePart.includes('PM') && hourNum !== 12;
        const normalizedHour = (isPM ? hourNum + 12 : hourNum);

        let bucket = '10:00';
        if (normalizedHour < 9) bucket = '08:00';
        else if (normalizedHour < 11) bucket = '10:00';
        else if (normalizedHour < 13) bucket = '12:00';
        else if (normalizedHour < 15) bucket = '14:00';
        else if (normalizedHour < 17) bucket = '16:00';
        else bucket = '18:00';

        const curr = pointsMap.get(bucket) || { label: bucket, amountSpent: 0, units: 0, purchasesCount: 0, rawDate: p.rawDate };
        curr.amountSpent += p.totalAmount;
        curr.units += p.totalUnits || p.items.reduce((s, it) => s + it.quantity, 0);
        curr.purchasesCount += 1;
        pointsMap.set(bucket, curr);
      });
    } else if (dateRange === 'this_week') {
      const days = ['Mon 17', 'Tue 18', 'Wed 19', 'Thu 20', 'Fri 21', 'Sat 22', 'Sun 23'];
      days.forEach((d) => {
        pointsMap.set(d, { label: d, amountSpent: 0, units: 0, purchasesCount: 0, rawDate: d });
      });

      matching.forEach((p) => {
        const dayStr = p.rawDate.substring(8, 10);
        let key = 'Wed 19';
        if (dayStr === '17') key = 'Mon 17';
        else if (dayStr === '18') key = 'Tue 18';
        else if (dayStr === '19') key = 'Wed 19';
        else if (dayStr === '20') key = 'Thu 20';
        else if (dayStr === '21') key = 'Fri 21';
        else if (dayStr === '22') key = 'Sat 22';
        else if (dayStr === '23') key = 'Sun 23';

        const curr = pointsMap.get(key) || { label: key, amountSpent: 0, units: 0, purchasesCount: 0, rawDate: p.rawDate };
        curr.amountSpent += p.totalAmount;
        curr.units += p.totalUnits || p.items.reduce((s, it) => s + it.quantity, 0);
        curr.purchasesCount += 1;
        pointsMap.set(key, curr);
      });
    } else if (dateRange === 'this_month') {
      const weeks = ['Week 1 (1-7)', 'Week 2 (8-14)', 'Week 3 (15-21)', 'Week 4 (22-31)'];
      weeks.forEach((w) => {
        pointsMap.set(w, { label: w, amountSpent: 0, units: 0, purchasesCount: 0, rawDate: w });
      });

      matching.forEach((p) => {
        const dayNum = parseInt(p.rawDate.substring(8, 10), 10);
        let key = 'Week 3 (15-21)';
        if (dayNum <= 7) key = 'Week 1 (1-7)';
        else if (dayNum <= 14) key = 'Week 2 (8-14)';
        else if (dayNum <= 21) key = 'Week 3 (15-21)';
        else key = 'Week 4 (22-31)';

        const curr = pointsMap.get(key) || { label: key, amountSpent: 0, units: 0, purchasesCount: 0, rawDate: p.rawDate };
        curr.amountSpent += p.totalAmount;
        curr.units += p.totalUnits || p.items.reduce((s, it) => s + it.quantity, 0);
        curr.purchasesCount += 1;
        pointsMap.set(key, curr);
      });
    } else {
      // Overall: monthly aggregation
      const months = ['May 2026', 'Jun 2026', 'Jul 2026', 'Aug 2026'];
      months.forEach((m) => {
        pointsMap.set(m, { label: m, amountSpent: 0, units: 0, purchasesCount: 0, rawDate: m });
      });

      matching.forEach((p) => {
        const monthNum = p.rawDate.substring(5, 7);
        let key = 'Aug 2026';
        if (monthNum === '05') key = 'May 2026';
        else if (monthNum === '06') key = 'Jun 2026';
        else if (monthNum === '07') key = 'Jul 2026';
        else if (monthNum === '08') key = 'Aug 2026';

        const curr = pointsMap.get(key) || { label: key, amountSpent: 0, units: 0, purchasesCount: 0, rawDate: p.rawDate };
        curr.amountSpent += p.totalAmount;
        curr.units += p.totalUnits || p.items.reduce((s, it) => s + it.quantity, 0);
        curr.purchasesCount += 1;
        pointsMap.set(key, curr);
      });
    }

    return {
      success: true,
      data: Array.from(pointsMap.values()),
      message: 'Purchase chart data generated.',
    };
  }

  /**
   * Create a new stock purchase:
   * 1. Validates all line items (quantity > 0 integer, unitPurchasePrice > 0)
   * 2. Calculates line subtotals and grand purchase total
   * 3. Increases stock in ProductVariantEntity for each item
   * 4. Updates ProductVariant basePrice to unitPurchasePrice
   * 5. Logs InventoryMovement STOCK_IN records
   * 6. Persists purchase and updates store
   */
  public async createStockPurchase(
    input: CreatePurchaseInput,
    role: UserRole = 'admin'
  ): Promise<ApiResponse<StockPurchase>> {
    await this.simulateNetwork();

    // 1. Validation
    if (!input.items || input.items.length === 0) {
      return {
        success: false,
        data: null as any,
        message: 'A stock purchase must contain at least one medicine item.',
      };
    }

    // Verify and prepare purchase items
    const purchaseItems: PurchaseItemEntity[] = [];
    let grandTotal = 0;
    let totalUnits = 0;

    for (let i = 0; i < input.items.length; i++) {
      const item = input.items[i];
      const quantity = Math.round(Number(item.quantity));
      const unitPurchasePrice = Number(item.unitPurchasePrice);

      if (isNaN(quantity) || quantity <= 0) {
        return {
          success: false,
          data: null as any,
          message: `Invalid quantity for item #${i + 1}. Quantity must be a whole number greater than 0.`,
        };
      }

      if (isNaN(unitPurchasePrice) || unitPurchasePrice <= 0) {
        return {
          success: false,
          data: null as any,
          message: `Invalid purchase price for item #${i + 1}. Purchase price must be greater than ₦0.`,
        };
      }

      // Find variant and parent product
      const variant = this.variants.find((v) => v.id === item.productVariantId);
      if (!variant) {
        return {
          success: false,
          data: null as any,
          message: `Selected product variant (ID: ${item.productVariantId}) does not exist.`,
        };
      }

      const product = this.products.find((p) => p.id === variant.productId);
      const company = this.companies.find((c) => c.id === variant.companyId);

      const productName = product ? product.name : 'Unknown Product';
      const genericName = product ? product.genericName : '';
      const companyName = company ? company.name : 'Unknown Company';
      const dosage = product ? product.dosage : '';
      const form = product ? product.form : '';
      const subtotal = quantity * unitPurchasePrice;

      grandTotal += subtotal;
      totalUnits += quantity;

      purchaseItems.push({
        id: `pi-${Date.now()}-${i + 1}`,
        productVariantId: variant.id,
        productId: variant.productId,
        productName,
        genericName,
        companyName,
        dosage,
        form,
        quantity,
        unitPurchasePrice,
        subtotal,
      });
    }

    // 2. Generate Purchase Number & Dates
    const purchaseCount = this.purchases.length + 1;
    const purchaseNumStr = `PUR-${String(purchaseCount).padStart(4, '0')}`;
    const purchaseId = purchaseNumStr;
    const now = new Date();
    const formattedDate = formatCurrentTimestamp();
    const rawDate = input.purchaseDate ? `${input.purchaseDate}T${now.toTimeString().substring(0, 8)}Z` : now.toISOString();
    const recordedBy = input.recordedBy || (role === 'admin' ? 'Pharm. Abdullahi (Admin)' : 'Pharmacy Staff');

    // 3. Create the purchase record
    const newPurchase: StockPurchase = {
      id: purchaseId,
      purchaseNumber: purchaseNumStr,
      purchaseDate: formattedDate,
      rawDate,
      recordedBy,
      totalAmount: grandTotal,
      paymentMethod: input.paymentMethod || 'TRANSFER',
      status: 'COMPLETED',
      note: input.note ? input.note.trim() : undefined,
      items: purchaseItems,
      itemCount: purchaseItems.length,
      totalUnits,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };

    // Link purchaseId to each purchase item
    purchaseItems.forEach((it) => {
      it.purchaseId = purchaseId;
    });

    // 4. Update Inventory Stock and Base Prices
    for (const item of purchaseItems) {
      const variant = this.variants.find((v) => v.id === item.productVariantId);
      if (variant) {
        const prevStock = variant.currentStock;
        const newStock = prevStock + item.quantity;

        // Update stock
        variant.currentStock = newStock;
        // Update base cost price to the new purchase price (as per specs)
        variant.basePrice = item.unitPurchasePrice;
        variant.updatedAt = now.toISOString();

        // Record Inventory Movement (STOCK_IN)
        const prod = this.products.find((p) => p.id === variant.productId);
        const movement: InventoryMovement = {
          id: `mov-pur-${Date.now()}-${item.productVariantId}`,
          productVariantId: variant.id,
          productId: variant.productId,
          productName: prod?.name || item.productName,
          genericName: prod?.genericName || item.genericName,
          companyName: item.companyName,
          type: 'STOCK_IN',
          quantity: item.quantity,
          previousStock: prevStock,
          newStock,
          reason: `Stock Purchase (${item.companyName})`,
          referenceType: 'STOCK_PURCHASE',
          referenceId: purchaseId,
          createdBy: recordedBy,
          createdAt: now.toISOString(),
        };
        this.movements.unshift(movement);
      }
    }

    // 5. Persist Purchase Record
    this.purchases.unshift(newPurchase);
    this.save();

    const hydrated = this.hydratePurchase(newPurchase, role);
    return {
      success: true,
      data: hydrated,
      message: `Stock purchase ${purchaseNumStr} recorded successfully. Total spent: ₦${grandTotal.toLocaleString()} (${totalUnits} units restocked).`,
    };
  }

  /**
   * Cancel an existing stock purchase
   */
  public async cancelStockPurchase(
    purchaseId: string,
    role: UserRole = 'admin'
  ): Promise<ApiResponse<StockPurchase>> {
    await this.simulateNetwork();

    const purchase = this.purchases.find((p) => p.id === purchaseId || p.purchaseNumber === purchaseId);
    if (!purchase) {
      return {
        success: false,
        data: null as any,
        message: `Stock purchase "${purchaseId}" not found.`,
      };
    }

    if (purchase.status === 'CANCELLED') {
      return {
        success: false,
        data: this.hydratePurchase(purchase, role),
        message: 'This stock purchase is already cancelled.',
      };
    }

    // Reverse the inventory stock if it was completed
    const now = new Date();
    for (const item of purchase.items) {
      const variant = this.variants.find((v) => v.id === item.productVariantId);
      if (variant) {
        const prevStock = variant.currentStock;
        const newStock = Math.max(0, prevStock - item.quantity);
        variant.currentStock = newStock;
        variant.updatedAt = now.toISOString();

        // Record stock adjustment / cancellation movement
        const prod = this.products.find((p) => p.id === variant.productId);
        const movement: InventoryMovement = {
          id: `mov-can-${Date.now()}-${item.productVariantId}`,
          productVariantId: variant.id,
          productId: variant.productId,
          productName: prod?.name || item.productName,
          genericName: prod?.genericName || item.genericName,
          companyName: item.companyName,
          type: 'STOCK_OUT',
          quantity: -item.quantity,
          previousStock: prevStock,
          newStock,
          reason: `Cancelled Stock Purchase ${purchase.purchaseNumber}`,
          referenceType: 'STOCK_PURCHASE',
          referenceId: purchase.id,
          createdBy: role === 'admin' ? 'Pharm. Abdullahi (Admin)' : 'Staff',
          createdAt: now.toISOString(),
        };
        this.movements.unshift(movement);
      }
    }

    purchase.status = 'CANCELLED';
    purchase.updatedAt = now.toISOString();
    this.save();

    return {
      success: true,
      data: this.hydratePurchase(purchase, role),
      message: `Stock purchase ${purchase.purchaseNumber} has been cancelled and inventory adjusted.`,
    };
  }

  // ==========================================
  // 11. Accountability Module Logic (Part 8)
  // ==========================================

  /**
   * Builds the single source of truth for all financial movements:
   * 1. Completed Sales (Money IN)
   * 2. Customer Debt Payments (Money IN)
   * 3. Stock Restock Purchases (Money OUT)
   * 4. Approved Operating Expenses (Money OUT)
   */
  private buildAllAccountabilityTransactions(): AccountabilityTransaction[] {
    const transactions: AccountabilityTransaction[] = [];

    // 1. Completed Sales -> Money IN
    for (const sale of this.sales) {
      // If sale had any money received (paid or partial)
      const paidAmount = sale.amountPaid ?? sale.paidAmount ?? sale.totalAmount ?? 0;
      if (paidAmount > 0) {
        const saleNum = sale.invoiceNumber || `Sale #${sale.id}`;
        const custName = sale.customerName || 'Walking Customer';
        const itemCount = sale.itemCount || (sale.items ? sale.items.length : 1);
        const desc =
          custName !== 'Walking Customer' && custName
            ? `Sale Dispense • ${custName} (${itemCount} items)`
            : `POS Dispense (${itemCount} item${itemCount > 1 ? 's' : ''})`;

        const itemsDetail = sale.items?.map((it) => ({
          name: it.productName,
          genericName: it.genericName,
          company: it.companyName,
          dosage: it.dosage,
          form: it.form,
          quantity: it.quantity,
          unitPrice: it.unitPrice || it.sellingPrice,
          subtotal: it.subtotal || it.quantity * (it.unitPrice || it.sellingPrice),
        })) || [];

        const acc: AccountabilityTransaction = {
          id: `ACC-SAL-${sale.id.replace('sale-', '')}`,
          transactionNumber: `ACC-SAL-${sale.id.replace('sale-', '').padStart(4, '0')}`,
          type: 'SALE',
          direction: 'IN',
          amount: paidAmount,
          description: desc,
          category: 'Sales Revenue',
          paymentMethod: (sale.paymentMethod as AccountabilityPaymentMethod) || 'CASH',
          referenceType: 'SALE',
          referenceId: sale.id,
          referenceNumber: saleNum,
          customerName: custName,
          customerId: sale.customerId,
          recordedBy: sale.servedBy || 'Cashier Zainab',
          date: sale.date || formatCurrentTimestamp(),
          rawDate: sale.rawDate || new Date().toISOString(),
          status: 'COMPLETED',
          createdAt: sale.rawDate || new Date().toISOString(),
          sourceDetails: {
            itemCount,
            totalUnits: sale.items?.reduce((sum, it) => sum + it.quantity, 0) || itemCount,
            items: itemsDetail,
            note:
              sale.paymentStatus === 'PARTIAL'
                ? `Partial payment of ₦${paidAmount.toLocaleString()} towards total bill ₦${(sale.totalAmount || sale.total || paidAmount).toLocaleString()}`
                : undefined,
          },
        };
        transactions.push(acc);
      }
    }

    // 2. Customer Debt Payments -> Money IN
    for (const payment of this.debtPayments) {
      const acc: AccountabilityTransaction = {
        id: `ACC-PAY-${payment.id.replace('pay-', '')}`,
        transactionNumber: `ACC-PAY-${payment.id.replace('pay-', '').padStart(4, '0')}`,
        type: 'DEBT_PAYMENT',
        direction: 'IN',
        amount: payment.amount,
        description: `Debt Recovery • ${payment.customerName}`,
        category: 'Debt Recovery',
        paymentMethod: (payment.paymentMethod as AccountabilityPaymentMethod) || 'TRANSFER',
        referenceType: 'DEBT_PAYMENT',
        referenceId: payment.id,
        referenceNumber: payment.receiptNumber || `RCT-${payment.id}`,
        customerName: payment.customerName,
        customerId: payment.customerId,
        recordedBy: payment.recordedBy || 'Pharm. Abdullahi (Admin)',
        date: payment.paymentDate || formatCurrentTimestamp(),
        rawDate: payment.rawDate || payment.createdAt || new Date().toISOString(),
        status: 'COMPLETED',
        note: payment.referenceNotes,
        createdAt: payment.createdAt || new Date().toISOString(),
        sourceDetails: {
          customerPhone: payment.customerPhone,
          previousBalance: payment.balanceBefore,
          newBalance: payment.balanceAfter,
          note: payment.referenceNotes,
        },
      };
      transactions.push(acc);
    }

    // 3. Stock Restock Purchases -> Money OUT (Only Completed)
    for (const purchase of this.purchases) {
      if (purchase.status === 'COMPLETED') {
        const itemsDetail = purchase.items?.map((it) => ({
          name: it.productName,
          genericName: it.genericName,
          company: it.companyName,
          dosage: it.dosage,
          form: it.form,
          quantity: it.quantity,
          unitPrice: it.unitPurchasePrice,
          subtotal: it.subtotal,
        })) || [];

        const acc: AccountabilityTransaction = {
          id: `ACC-PUR-${purchase.id.replace('PUR-', '')}`,
          transactionNumber: `ACC-PUR-${purchase.id.replace('PUR-', '').padStart(4, '0')}`,
          type: 'STOCK_PURCHASE',
          direction: 'OUT',
          amount: purchase.totalAmount,
          description: `Stock Purchase • ${purchase.itemCount} items (${purchase.totalUnits} units)`,
          category: 'Stock Purchase',
          paymentMethod: (purchase.paymentMethod as AccountabilityPaymentMethod) || 'TRANSFER',
          referenceType: 'STOCK_PURCHASE',
          referenceId: purchase.id,
          referenceNumber: purchase.purchaseNumber || purchase.id,
          recordedBy: purchase.recordedBy || 'Pharm. Abdullahi (Admin)',
          date: purchase.purchaseDate || formatCurrentTimestamp(),
          rawDate: purchase.rawDate || purchase.createdAt || new Date().toISOString(),
          status: 'COMPLETED',
          note: purchase.note,
          createdAt: purchase.createdAt || new Date().toISOString(),
          sourceDetails: {
            itemCount: purchase.itemCount,
            totalUnits: purchase.totalUnits,
            items: itemsDetail,
            note: purchase.note,
          },
        };
        transactions.push(acc);
      }
    }

    // 4. Approved Operating Expenses -> Money OUT
    for (const expense of this.expenses) {
      const acc: AccountabilityTransaction = {
        id: `ACC-EXP-${expense.id.replace('exp-', '')}`,
        transactionNumber: `ACC-EXP-${expense.id.replace('exp-', '').padStart(4, '0')}`,
        type: 'OTHER_EXPENSE',
        direction: 'OUT',
        amount: expense.amount,
        description: expense.description,
        category: expense.category,
        paymentMethod: (expense.paymentMethod as AccountabilityPaymentMethod) || 'CASH',
        referenceType: 'OTHER_EXPENSE',
        referenceId: expense.id,
        referenceNumber: expense.expenseNumber || expense.id,
        recordedBy: expense.recordedBy || 'Pharm. Abdullahi (Admin)',
        date: expense.date || formatCurrentTimestamp(),
        rawDate: expense.rawDate || expense.createdAt || new Date().toISOString(),
        status: 'COMPLETED',
        note: expense.note,
        createdAt: expense.createdAt || new Date().toISOString(),
        sourceDetails: {
          note: expense.note,
        },
      };
      transactions.push(acc);
    }

    // Sort descending by rawDate (newest first)
    transactions.sort(
      (a, b) => new Date(b.rawDate).getTime() - new Date(a.rawDate).getTime()
    );

    return transactions;
  }

  /**
   * Filters accountability transactions according to query criteria
   */
  private filterAccountabilityList(
    filters: AccountabilityFilterParams
  ): AccountabilityTransaction[] {
    let list = this.buildAllAccountabilityTransactions();

    // 1. Date Range filter
    const now = new Date();
    const todayStr = '2026-08-19'; // Fixed demo baseline date for consistency

    if (filters.dateRange === 'today') {
      list = list.filter((t) => t.rawDate.startsWith(todayStr));
    } else if (filters.dateRange === 'this_week') {
      const weekStart = new Date('2026-08-15T00:00:00Z').getTime();
      const weekEnd = new Date('2026-08-21T23:59:59Z').getTime();
      list = list.filter((t) => {
        const time = new Date(t.rawDate).getTime();
        return time >= weekStart && time <= weekEnd;
      });
    } else if (filters.dateRange === 'this_month') {
      list = list.filter((t) => t.rawDate.startsWith('2026-08'));
    } else if (filters.dateRange === 'custom' && filters.startDate) {
      const start = new Date(filters.startDate).getTime();
      const end = filters.endDate
        ? new Date(filters.endDate + 'T23:59:59Z').getTime()
        : new Date().getTime();
      list = list.filter((t) => {
        const time = new Date(t.rawDate).getTime();
        return time >= start && time <= end;
      });
    }

    // 2. Direction filter (IN vs OUT)
    if (filters.direction && filters.direction !== 'all') {
      list = list.filter((t) => t.direction === filters.direction);
    }

    // 3. Type filter
    if (filters.type && filters.type !== 'all') {
      list = list.filter((t) => t.type === filters.type);
    }

    // 4. Category filter
    if (filters.category && filters.category !== 'all') {
      list = list.filter((t) => t.category === filters.category);
    }

    // 5. Search query filter
    if (filters.search && filters.search.trim()) {
      const q = filters.search.toLowerCase().trim();
      list = list.filter((t) => {
        const matchId = t.id.toLowerCase().includes(q);
        const matchTxNum = t.transactionNumber.toLowerCase().includes(q);
        const matchRefNum = t.referenceNumber.toLowerCase().includes(q);
        const matchDesc = t.description.toLowerCase().includes(q);
        const matchCust = t.customerName?.toLowerCase().includes(q) || false;
        const matchRecBy = t.recordedBy.toLowerCase().includes(q);
        const matchCat = t.category.toLowerCase().includes(q);
        const matchNote = t.note?.toLowerCase().includes(q) || false;
        const matchItems =
          t.sourceDetails?.items?.some(
            (it) =>
              it.name.toLowerCase().includes(q) ||
              it.company.toLowerCase().includes(q) ||
              (it.genericName && it.genericName.toLowerCase().includes(q))
          ) || false;

        return (
          matchId ||
          matchTxNum ||
          matchRefNum ||
          matchDesc ||
          matchCust ||
          matchRecBy ||
          matchCat ||
          matchNote ||
          matchItems
        );
      });
    }

    // 6. Sorting
    if (filters.sortBy === 'amount') {
      list.sort((a, b) =>
        filters.sortOrder === 'asc' ? a.amount - b.amount : b.amount - a.amount
      );
    } else if (filters.sortBy === 'type') {
      list.sort((a, b) =>
        filters.sortOrder === 'asc'
          ? a.type.localeCompare(b.type)
          : b.type.localeCompare(a.type)
      );
    } else {
      // Default newest first
      list.sort((a, b) => {
        const diff = new Date(b.rawDate).getTime() - new Date(a.rawDate).getTime();
        return filters.sortOrder === 'asc' ? -diff : diff;
      });
    }

    return list;
  }

  /**
   * Helper to format friendly date grouping labels
   */
  private formatDateGroupLabel(rawDate: string): string {
    const d = new Date(rawDate);
    const dateStr = rawDate.split('T')[0];
    if (dateStr === '2026-08-19') {
      return 'TODAY';
    } else if (dateStr === '2026-08-18') {
      return 'YESTERDAY';
    } else {
      return d.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    }
  }

  /**
   * Get filtered, grouped accountability transactions feed
   */
  public async getAccountabilityFeed(
    filters: AccountabilityFilterParams,
    role: UserRole = 'admin'
  ): Promise<ApiResponse<AccountabilityDateGroup[]>> {
    await this.simulateNetwork();

    const filtered = this.filterAccountabilityList(filters);

    // Group transactions by date
    const groupsMap = new Map<string, AccountabilityTransaction[]>();
    for (const tx of filtered) {
      const dateKey = tx.rawDate.split('T')[0];
      if (!groupsMap.has(dateKey)) {
        groupsMap.set(dateKey, []);
      }
      groupsMap.get(dateKey)!.push(tx);
    }

    const groups: AccountabilityDateGroup[] = [];
    for (const [dateKey, txs] of groupsMap.entries()) {
      const moneyIn = txs
        .filter((t) => t.direction === 'IN')
        .reduce((sum, t) => sum + t.amount, 0);
      const moneyOut = txs
        .filter((t) => t.direction === 'OUT')
        .reduce((sum, t) => sum + t.amount, 0);

      groups.push({
        dateLabel: this.formatDateGroupLabel(txs[0].rawDate),
        rawDate: dateKey,
        transactions: txs,
        groupMoneyIn: moneyIn,
        groupMoneyOut: moneyOut,
        groupNet: moneyIn - moneyOut,
      });
    }

    // Ensure groups are sorted newest first
    groups.sort(
      (a, b) => new Date(b.rawDate).getTime() - new Date(a.rawDate).getTime()
    );

    return {
      success: true,
      data: groups,
      message: 'Accountability feed loaded successfully.',
      meta: {
        total: filtered.length,
        currentPage: filters.page,
        lastPage: Math.ceil(filtered.length / filters.limit) || 1,
        perPage: filters.limit,
      },
    };
  }

  /**
   * Get raw list of accountability transactions
   */
  public async getAccountabilityTransactions(
    filters: AccountabilityFilterParams,
    role: UserRole = 'admin'
  ): Promise<ApiResponse<AccountabilityTransaction[]>> {
    await this.simulateNetwork();

    const filtered = this.filterAccountabilityList(filters);
    const startIdx = (filters.page - 1) * filters.limit;
    const paginated = filtered.slice(startIdx, startIdx + filters.limit);

    return {
      success: true,
      data: paginated,
      message: 'Accountability transactions loaded.',
      meta: {
        total: filtered.length,
        currentPage: filters.page,
        lastPage: Math.ceil(filtered.length / filters.limit) || 1,
        perPage: filters.limit,
      },
    };
  }

  /**
   * Get single accountability transaction with full audit trace
   */
  public async getAccountabilityTransactionById(
    id: string,
    role: UserRole = 'admin'
  ): Promise<ApiResponse<AccountabilityTransaction>> {
    await this.simulateNetwork();

    const all = this.buildAllAccountabilityTransactions();
    const tx = all.find(
      (t) =>
        t.id === id ||
        t.transactionNumber === id ||
        t.referenceId === id ||
        t.referenceNumber === id
    );

    if (!tx) {
      return {
        success: false,
        data: null as any,
        message: `Accountability transaction '${id}' not found.`,
        errors: { transaction: [`Transaction '${id}' not found.`] },
      };
    }

    return {
      success: true,
      data: tx,
      message: 'Transaction found.',
    };
  }

  /**
   * Get financial summary KPI metrics (Money In, Money Out, Net Movement)
   * Net Movement is strictly NOT labelled as Profit.
   */
  public async getAccountabilitySummary(
    timeframe: AccountabilityDateRange = 'today',
    startDate?: string,
    endDate?: string,
    role: UserRole = 'admin'
  ): Promise<ApiResponse<AccountabilitySummary>> {
    await this.simulateNetwork();

    const filtered = this.filterAccountabilityList({
      search: '',
      dateRange: timeframe,
      startDate,
      endDate,
      direction: 'all',
      type: 'all',
      sortBy: 'date',
      sortOrder: 'desc',
      page: 1,
      limit: 10000,
    });

    let moneyIn = 0;
    let moneyOut = 0;
    let salesIncome = 0;
    let debtPaymentsIncome = 0;
    let purchasesExpense = 0;
    let otherExpensesExpense = 0;

    for (const t of filtered) {
      if (t.direction === 'IN') {
        moneyIn += t.amount;
        if (t.type === 'SALE') {
          salesIncome += t.amount;
        } else if (t.type === 'DEBT_PAYMENT') {
          debtPaymentsIncome += t.amount;
        }
      } else if (t.direction === 'OUT') {
        moneyOut += t.amount;
        if (t.type === 'STOCK_PURCHASE') {
          purchasesExpense += t.amount;
        } else if (t.type === 'OTHER_EXPENSE') {
          otherExpensesExpense += t.amount;
        }
      }
    }

    const summary: AccountabilitySummary = {
      moneyIn,
      moneyOut,
      netMovement: moneyIn - moneyOut,
      totalTransactionsCount: filtered.length,
      salesIncome,
      debtPaymentsIncome,
      purchasesExpense,
      otherExpensesExpense,
      timeframe,
    };

    return {
      success: true,
      data: summary,
      message: 'Accountability summary computed successfully.',
    };
  }

  /**
   * Create an approved manual operating expense
   * Automatically creates the associated Accountability OUT transaction
   */
  public async createManualExpense(
    input: CreateExpenseInput,
    role: UserRole = 'admin'
  ): Promise<
    ApiResponse<{
      expense: ManualExpense;
      transaction: AccountabilityTransaction;
    }>
  > {
    await this.simulateNetwork();

    // 1. Validation
    if (!input.description || !input.description.trim()) {
      return {
        success: false,
        data: null as any,
        message: 'Expense description is required.',
        errors: { description: ['Expense description is required.'] },
      };
    }

    if (!input.amount || input.amount <= 0) {
      return {
        success: false,
        data: null as any,
        message: 'Expense amount must be greater than ₦0.',
        errors: { amount: ['Expense amount must be greater than ₦0.'] },
      };
    }

    if (!input.category) {
      return {
        success: false,
        data: null as any,
        message: 'Please select a valid expense category.',
        errors: { category: ['Please select a valid expense category.'] },
      };
    }

    if (!input.paymentMethod) {
      return {
        success: false,
        data: null as any,
        message: 'Please select a payment method.',
        errors: { paymentMethod: ['Please select a payment method.'] },
      };
    }

    const now = new Date();
    const nextSeq = this.expenses.length + 1;
    const expenseNumber = `EXP-2026-${String(nextSeq).padStart(3, '0')}`;
    const expenseId = `exp-${String(nextSeq).padStart(3, '0')}`;
    const recordedBy =
      input.recordedBy || (role === 'admin' ? 'Pharm. Abdullahi (Admin)' : 'Staff');

    const newExpense: ManualExpense = {
      id: expenseId,
      expenseNumber,
      description: input.description.trim(),
      category: input.category,
      amount: Math.round(input.amount),
      paymentMethod: input.paymentMethod,
      date: formatCurrentTimestamp(),
      rawDate: now.toISOString(),
      note: input.note?.trim() || undefined,
      recordedBy,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };

    this.expenses.unshift(newExpense);
    this.save();

    const createdTx: AccountabilityTransaction = {
      id: `ACC-EXP-${expenseId.replace('exp-', '')}`,
      transactionNumber: `ACC-EXP-${expenseId.replace('exp-', '').padStart(4, '0')}`,
      type: 'OTHER_EXPENSE',
      direction: 'OUT',
      amount: newExpense.amount,
      description: newExpense.description,
      category: newExpense.category,
      paymentMethod: newExpense.paymentMethod,
      referenceType: 'OTHER_EXPENSE',
      referenceId: newExpense.id,
      referenceNumber: newExpense.expenseNumber,
      recordedBy: newExpense.recordedBy,
      date: newExpense.date,
      rawDate: newExpense.rawDate,
      status: 'COMPLETED',
      note: newExpense.note,
      createdAt: newExpense.createdAt,
      sourceDetails: {
        note: newExpense.note,
      },
    };

    return {
      success: true,
      data: {
        expense: newExpense,
        transaction: createdTx,
      },
      message: `Expense of ₦${newExpense.amount.toLocaleString()} (${newExpense.category}) recorded successfully.`,
    };
  }

  // ==========================================
  // 12. Financial & Movement Reports (Module 9)
  // ==========================================

  /**
   * Helper to determine exact date boundaries for reporting periods
   * Mock anchor date is 2026-08-19
   */
  public getReportDateBoundaries(
    dateRange: ReportDateRange,
    startDate?: string,
    endDate?: string
  ): { start: Date; end: Date; startStr: string; endStr: string } {
    let start = new Date('2026-08-19T00:00:00.000Z');
    let end = new Date('2026-08-19T23:59:59.999Z');

    if (dateRange === 'today') {
      start = new Date('2026-08-19T00:00:00.000Z');
      end = new Date('2026-08-19T23:59:59.999Z');
    } else if (dateRange === 'this_week') {
      // 7 days ending 19 Aug 2026
      start = new Date('2026-08-13T00:00:00.000Z');
      end = new Date('2026-08-19T23:59:59.999Z');
    } else if (dateRange === 'this_month') {
      // 1 Aug 2026 to 19 Aug 2026
      start = new Date('2026-08-01T00:00:00.000Z');
      end = new Date('2026-08-19T23:59:59.999Z');
    } else if (dateRange === 'last_month') {
      // 1 Jul 2026 to 31 Jul 2026
      start = new Date('2026-07-01T00:00:00.000Z');
      end = new Date('2026-07-31T23:59:59.999Z');
    } else if (dateRange === 'this_year') {
      // 1 Jan 2026 to 19 Aug 2026
      start = new Date('2026-01-01T00:00:00.000Z');
      end = new Date('2026-08-19T23:59:59.999Z');
    } else if (dateRange === 'custom') {
      if (startDate) {
        start = new Date(`${startDate}T00:00:00.000Z`);
      }
      if (endDate) {
        end = new Date(`${endDate}T23:59:59.999Z`);
      }
    }

    const startStr = start.toISOString().split('T')[0];
    const endStr = end.toISOString().split('T')[0];
    return { start, end, startStr, endStr };
  }

  /**
   * 1. Financial Summary Report
   */
  public async getFinancialSummaryReport(
    params: ReportFilterParams,
    role: UserRole = 'admin'
  ): Promise<ApiResponse<FinancialSummaryReport>> {
    await this.simulateNetwork();

    const { start, end, startStr, endStr } = this.getReportDateBoundaries(
      params.dateRange,
      params.startDate,
      params.endDate
    );

    const isAdmin = role === 'admin';

    // 1. Filter Sales within period
    const periodSales = this.sales.filter((sale) => {
      const saleDate = new Date(sale.rawDate || sale.date);
      if (saleDate < start || saleDate > end) return false;

      if (params.paymentMethod && params.paymentMethod !== 'all') {
        if (sale.paymentMethod !== params.paymentMethod) return false;
      }

      if (params.productId || params.companyId || params.categoryId) {
        const matchesProduct = sale.items.some((it) => {
          if (params.productId && it.productId !== params.productId) return false;
          if (params.companyId && it.companyId !== params.companyId) return false;
          if (params.categoryId) {
            const prod = this.products.find((p) => p.id === it.productId);
            if (!prod || prod.categoryId !== params.categoryId) return false;
          }
          return true;
        });
        if (!matchesProduct) return false;
      }

      return true;
    });

    // 2. Filter Stock Purchases within period (Completed only)
    const periodPurchases = this.purchases.filter((purchase) => {
      if (purchase.status !== 'COMPLETED') return false;
      const purDate = new Date(purchase.rawDate || purchase.purchaseDate);
      if (purDate < start || purDate > end) return false;

      if (params.companyId) {
        const matchesComp = purchase.items.some((it) => {
          const v = this.variants.find((variant) => variant.id === it.productVariantId);
          return (v && v.companyId === params.companyId) || it.companyName === this.companies.find((c) => c.id === params.companyId)?.name;
        });
        if (!matchesComp) return false;
      }
      if (params.productId) {
        const matchesProd = purchase.items.some((it) => it.productId === params.productId);
        if (!matchesProd) return false;
      }

      return true;
    });

    // 3. Filter Debt Payments within period
    const periodDebtPayments = this.debtPayments.filter((dp) => {
      const dpDate = new Date(dp.rawDate || dp.paymentDate);
      return dpDate >= start && dpDate <= end;
    });

    // 4. Filter Operating Expenses within period
    const periodExpenses = this.expenses.filter((exp) => {
      const expDate = new Date(exp.rawDate || exp.date);
      return expDate >= start && expDate <= end;
    });

    // Calculations
    const totalSales = periodSales.reduce((sum, s) => sum + (s.total || s.totalAmount || 0), 0);

    // Profit is calculated from snapshot prices at time of sale: SUM((selling - base) * qty) - discount
    let totalProfit = 0;
    if (isAdmin) {
      totalProfit = periodSales.reduce((sum, s) => {
        const saleGrossProfit = s.items.reduce(
          (itemSum, it) => itemSum + ((it.sellingPrice || 0) - (it.basePrice || 0)) * it.quantity,
          0
        );
        return sum + Math.max(0, saleGrossProfit - (s.discount || 0));
      }, 0);
    }

    const profitMarginPercentage = totalSales > 0 ? (totalProfit / totalSales) * 100 : 0;
    const totalStockPurchases = periodPurchases.reduce((sum, p) => sum + p.totalAmount, 0);

    // Money In: completed sale cash/transfer/pos payments + customer debt repayments
    const salesCashReceived = periodSales.reduce((sum, s) => sum + (s.amountPaid || s.paidAmount || 0), 0);
    const debtPaymentsReceived = periodDebtPayments.reduce((sum, dp) => sum + dp.amount, 0);
    const moneyIn = salesCashReceived + debtPaymentsReceived;

    // Money Out: stock purchase payments + approved operating expenses
    const operatingExpensesTotal = periodExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    const moneyOut = totalStockPurchases + operatingExpensesTotal;

    // Net Money Movement (Strictly NOT called profit)
    const netMoneyMovement = moneyIn - moneyOut;

    // Outstanding Debt across all active customers
    const hydratedCustomers = this.customers.map((c) => this.hydrateCustomer(c));
    const outstandingDebt = hydratedCustomers.reduce(
      (sum, c) => sum + (c.outstandingDebt || 0),
      0
    );

    const totalTransactions = periodSales.length;
    const totalUnitsSold = periodSales.reduce(
      (sum, s) => sum + s.items.reduce((iSum, it) => iSum + it.quantity, 0),
      0
    );
    const totalUnitsPurchased = periodPurchases.reduce(
      (sum, p) => sum + (p.totalUnits || p.items.reduce((iSum, it) => iSum + it.quantity, 0)),
      0
    );
    const averageSaleValue = totalTransactions > 0 ? totalSales / totalTransactions : 0;

    return {
      success: true,
      data: {
        totalSales,
        totalProfit: isAdmin ? totalProfit : 0,
        profitMarginPercentage: isAdmin ? Math.round(profitMarginPercentage * 10) / 10 : 0,
        totalStockPurchases,
        moneyIn,
        moneyOut,
        netMoneyMovement,
        outstandingDebt,
        totalTransactions,
        totalUnitsSold,
        totalUnitsPurchased,
        averageSaleValue: Math.round(averageSaleValue),
        timeframe: params.dateRange,
        startDate: startStr,
        endDate: endStr,
      },
      message: 'Financial summary report generated successfully.',
    };
  }

  /**
   * 2. Sales Report Data
   */
  public async getSalesReport(
    params: ReportFilterParams,
    role: UserRole = 'admin'
  ): Promise<ApiResponse<SalesReportData>> {
    await this.simulateNetwork();

    const { start, end } = this.getReportDateBoundaries(
      params.dateRange,
      params.startDate,
      params.endDate
    );
    const isAdmin = role === 'admin';

    // Filter Sales
    const filteredSales = this.sales.filter((sale) => {
      const saleDate = new Date(sale.rawDate || sale.date);
      if (saleDate < start || saleDate > end) return false;

      if (params.paymentMethod && params.paymentMethod !== 'all') {
        if (sale.paymentMethod !== params.paymentMethod) return false;
      }

      if (params.productId || params.companyId || params.categoryId) {
        const matches = sale.items.some((it) => {
          if (params.productId && it.productId !== params.productId) return false;
          if (params.companyId && it.companyId !== params.companyId) return false;
          if (params.categoryId) {
            const prod = this.products.find((p) => p.id === it.productId);
            if (!prod || prod.categoryId !== params.categoryId) return false;
          }
          return true;
        });
        if (!matches) return false;
      }
      return true;
    });

    const totalSales = filteredSales.reduce((sum, s) => sum + (s.total || s.totalAmount || 0), 0);
    let totalProfit = 0;
    if (isAdmin) {
      totalProfit = filteredSales.reduce((sum, s) => {
        const gp = s.items.reduce(
          (iSum, it) => iSum + ((it.sellingPrice || 0) - (it.basePrice || 0)) * it.quantity,
          0
        );
        return sum + Math.max(0, gp - (s.discount || 0));
      }, 0);
    }
    const transactionsCount = filteredSales.length;
    const totalItemsSold = filteredSales.reduce(
      (sum, s) => sum + s.items.reduce((iSum, it) => iSum + it.quantity, 0),
      0
    );
    const averageSaleValue = transactionsCount > 0 ? totalSales / transactionsCount : 0;
    const profitMarginPercentage = totalSales > 0 ? (totalProfit / totalSales) * 100 : 0;

    // Daily Trend grouping
    const trendMap = new Map<string, DailyReportTrendPoint>();
    // Pre-populate date range days (if <= 31 days)
    const cursor = new Date(start);
    while (cursor <= end && trendMap.size < 40) {
      const dStr = cursor.toISOString().split('T')[0];
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const label = `${cursor.getUTCDate()} ${monthNames[cursor.getUTCMonth()]}`;
      trendMap.set(dStr, {
        date: dStr,
        label,
        sales: 0,
        profit: 0,
        purchases: 0,
        moneyIn: 0,
        moneyOut: 0,
        unitsSold: 0,
        transactionsCount: 0,
      });
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }

    filteredSales.forEach((s) => {
      const sDateStr = (s.rawDate || s.date).split('T')[0];
      let point = trendMap.get(sDateStr);
      if (!point) {
        point = {
          date: sDateStr,
          label: sDateStr,
          sales: 0,
          profit: 0,
          purchases: 0,
          moneyIn: 0,
          moneyOut: 0,
          unitsSold: 0,
          transactionsCount: 0,
        };
        trendMap.set(sDateStr, point);
      }
      point.sales += s.total || s.totalAmount || 0;
      if (isAdmin) {
        const pProfit = s.items.reduce(
          (acc, it) => acc + ((it.sellingPrice || 0) - (it.basePrice || 0)) * it.quantity,
          0
        );
        point.profit += Math.max(0, pProfit - (s.discount || 0));
      }
      point.moneyIn += s.amountPaid || s.paidAmount || 0;
      point.unitsSold += s.items.reduce((acc, it) => acc + it.quantity, 0);
      point.transactionsCount += 1;
    });

    const trends = Array.from(trendMap.values()).sort((a, b) => a.date.localeCompare(b.date));

    // Sales by Payment Method
    const methodMap = new Map<string, { amount: number; count: number }>();
    filteredSales.forEach((s) => {
      const m = s.paymentMethod || 'CASH';
      const cur = methodMap.get(m) || { amount: 0, count: 0 };
      cur.amount += s.total || s.totalAmount || 0;
      cur.count += 1;
      methodMap.set(m, cur);
    });

    const salesByPaymentMethod = Array.from(methodMap.entries()).map(([method, val]) => ({
      method,
      amount: val.amount,
      count: val.count,
      percentage: totalSales > 0 ? Math.round((val.amount / totalSales) * 1000) / 10 : 0,
    }));

    // Sales by Category
    const categoryMap = new Map<string, { name: string; units: number; revenue: number; profit: number }>();
    this.categories.forEach((cat) => {
      categoryMap.set(cat.id, { name: cat.name, units: 0, revenue: 0, profit: 0 });
    });

    filteredSales.forEach((s) => {
      s.items.forEach((it) => {
        const prod = this.products.find((p) => p.id === it.productId);
        const catId = prod ? prod.categoryId : 'uncategorized';
        const foundCat = this.categories.find((c) => c.id === catId);
        const cat = categoryMap.get(catId) || {
          name: foundCat ? foundCat.name : 'Other',
          units: 0,
          revenue: 0,
          profit: 0,
        };
        cat.units += it.quantity;
        cat.revenue += it.subtotal || ((it.sellingPrice || 0) * it.quantity);
        if (isAdmin) {
          cat.profit += ((it.sellingPrice || 0) - (it.basePrice || 0)) * it.quantity;
        }
        categoryMap.set(catId, cat);
      });
    });

    const salesByCategory = Array.from(categoryMap.entries())
      .filter(([_, val]) => val.units > 0 || val.revenue > 0)
      .map(([catId, val]) => ({
        categoryId: catId,
        categoryName: val.name,
        unitsSold: val.units,
        revenue: val.revenue,
        profit: isAdmin ? val.profit : 0,
      }))
      .sort((a, b) => b.revenue - a.revenue);

    // Sales by Company
    const companyMap = new Map<string, { name: string; units: number; revenue: number; profit: number }>();
    this.companies.forEach((comp) => {
      companyMap.set(comp.id, { name: comp.name, units: 0, revenue: 0, profit: 0 });
    });

    filteredSales.forEach((s) => {
      s.items.forEach((it) => {
        const compId = it.companyId || 'unknown';
        const comp = companyMap.get(compId) || {
          name: it.companyName || 'Unknown Manufacturer',
          units: 0,
          revenue: 0,
          profit: 0,
        };
        comp.units += it.quantity;
        comp.revenue += it.subtotal || ((it.sellingPrice || 0) * it.quantity);
        if (isAdmin) {
          comp.profit += ((it.sellingPrice || 0) - (it.basePrice || 0)) * it.quantity;
        }
        companyMap.set(compId, comp);
      });
    });

    const salesByCompany = Array.from(companyMap.entries())
      .filter(([_, val]) => val.units > 0 || val.revenue > 0)
      .map(([compId, val]) => ({
        companyId: compId,
        companyName: val.name,
        unitsSold: val.units,
        revenue: val.revenue,
        profit: isAdmin ? val.profit : 0,
      }))
      .sort((a, b) => b.revenue - a.revenue);

    return {
      success: true,
      data: {
        summary: {
          totalSales,
          totalProfit: isAdmin ? totalProfit : 0,
          profitMarginPercentage: isAdmin ? Math.round(profitMarginPercentage * 10) / 10 : 0,
          transactionsCount,
          averageSaleValue: Math.round(averageSaleValue),
          totalItemsSold,
        },
        trends,
        salesByPaymentMethod,
        salesByCategory,
        salesByCompany,
      },
      message: 'Sales report loaded.',
    };
  }

  /**
   * 3. Profit Report Data (Admin-Only protected)
   */
  public async getProfitReport(
    params: ReportFilterParams,
    role: UserRole = 'admin'
  ): Promise<ApiResponse<ProfitReportData>> {
    await this.simulateNetwork();

    const { start, end } = this.getReportDateBoundaries(
      params.dateRange,
      params.startDate,
      params.endDate
    );
    const isAdmin = role === 'admin';

    const filteredSales = this.sales.filter((sale) => {
      const sDate = new Date(sale.rawDate || sale.date);
      if (sDate < start || sDate > end) return false;
      if (params.paymentMethod && params.paymentMethod !== 'all' && sale.paymentMethod !== params.paymentMethod) return false;
      return true;
    });

    let totalRevenue = 0;
    let totalCost = 0;
    let grossProfit = 0;
    let totalSoldUnits = 0;

    const prodProfitMap = new Map<string, {
      productId: string;
      productName: string;
      genericName: string;
      companyName: string;
      unitsSold: number;
      revenue: number;
      cost: number;
      profit: number;
    }>();

    const catProfitMap = new Map<string, {
      name: string;
      revenue: number;
      cost: number;
      profit: number;
    }>();

    const compProfitMap = new Map<string, {
      name: string;
      revenue: number;
      cost: number;
      profit: number;
    }>();

    filteredSales.forEach((s) => {
      totalRevenue += s.total || s.totalAmount || 0;
      s.items.forEach((it) => {
        const itemQty = it.quantity;
        const itemRev = it.subtotal || ((it.sellingPrice || 0) * itemQty);
        const itemCost = (it.basePrice || 0) * itemQty;
        const itemProf = isAdmin ? itemRev - itemCost : 0;

        totalSoldUnits += itemQty;
        totalCost += itemCost;
        grossProfit += itemProf;

        // Product key by variant to distinguish Paracetamol DANA vs EMZOR
        const pKey = it.productVariantId || `${it.productId}-${it.companyId || 'gen'}`;
        const pCur = prodProfitMap.get(pKey) || {
          productId: it.productId,
          productName: it.productName,
          genericName: it.genericName || '',
          companyName: it.companyName || '',
          unitsSold: 0,
          revenue: 0,
          cost: 0,
          profit: 0,
        };
        pCur.unitsSold += itemQty;
        pCur.revenue += itemRev;
        pCur.cost += itemCost;
        pCur.profit += itemProf;
        prodProfitMap.set(pKey, pCur);

        // Category
        const prod = this.products.find((p) => p.id === it.productId);
        const catId = prod ? prod.categoryId : 'other';
        const foundCat = this.categories.find((c) => c.id === catId);
        const catCur = catProfitMap.get(catId) || {
          name: foundCat ? foundCat.name : 'Other',
          revenue: 0,
          cost: 0,
          profit: 0,
        };
        catCur.revenue += itemRev;
        catCur.cost += itemCost;
        catCur.profit += itemProf;
        catProfitMap.set(catId, catCur);

        // Company
        const compId = it.companyId || 'other';
        const compCur = compProfitMap.get(compId) || {
          name: it.companyName || 'Other',
          revenue: 0,
          cost: 0,
          profit: 0,
        };
        compCur.revenue += itemRev;
        compCur.cost += itemCost;
        compCur.profit += itemProf;
        compProfitMap.set(compId, compCur);
      });
    });

    const profitMarginPercentage = totalRevenue > 0 && isAdmin ? (grossProfit / totalRevenue) * 100 : 0;

    const profitByCategory = Array.from(catProfitMap.entries()).map(([catId, val]) => ({
      categoryId: catId,
      categoryName: val.name,
      revenue: val.revenue,
      cost: isAdmin ? val.cost : 0,
      profit: isAdmin ? val.profit : 0,
      marginPct: val.revenue > 0 && isAdmin ? Math.round((val.profit / val.revenue) * 1000) / 10 : 0,
    })).sort((a, b) => b.profit - a.profit);

    const profitByCompany = Array.from(compProfitMap.entries()).map(([compId, val]) => ({
      companyId: compId,
      companyName: val.name,
      revenue: val.revenue,
      cost: isAdmin ? val.cost : 0,
      profit: isAdmin ? val.profit : 0,
      marginPct: val.revenue > 0 && isAdmin ? Math.round((val.profit / val.revenue) * 1000) / 10 : 0,
    })).sort((a, b) => b.profit - a.profit);

    const topProfitableProducts = Array.from(prodProfitMap.values()).map((val) => ({
      productId: val.productId,
      productName: val.productName,
      genericName: val.genericName,
      companyName: val.companyName,
      unitsSold: val.unitsSold,
      revenue: val.revenue,
      cost: isAdmin ? val.cost : 0,
      profit: isAdmin ? val.profit : 0,
      marginPct: val.revenue > 0 && isAdmin ? Math.round((val.profit / val.revenue) * 1000) / 10 : 0,
    })).sort((a, b) => b.profit - a.profit);

    // Build trend
    const salesRes = await this.getSalesReport(params, role);

    return {
      success: true,
      data: {
        summary: {
          totalRevenue,
          totalCost: isAdmin ? totalCost : 0,
          grossProfit: isAdmin ? grossProfit : 0,
          profitMarginPercentage: isAdmin ? Math.round(profitMarginPercentage * 10) / 10 : 0,
          totalSoldUnits,
        },
        trends: salesRes.data.trends,
        profitByCategory,
        profitByCompany,
        topProfitableProducts,
      },
      message: 'Profit report loaded successfully.',
    };
  }

  /**
   * 4. Stock Purchase Report Data
   */
  public async getStockPurchaseReport(
    params: ReportFilterParams,
    role: UserRole = 'admin'
  ): Promise<ApiResponse<StockPurchaseReportData>> {
    await this.simulateNetwork();

    const { start, end } = this.getReportDateBoundaries(
      params.dateRange,
      params.startDate,
      params.endDate
    );

    const periodPurchases = this.purchases.filter((p) => {
      if (p.status !== 'COMPLETED') return false;
      const pDate = new Date(p.rawDate || p.purchaseDate);
      if (pDate < start || pDate > end) return false;
      if (params.companyId) {
        const match = p.items.some((it) => {
          const v = this.variants.find((variant) => variant.id === it.productVariantId);
          return (v && v.companyId === params.companyId) || it.companyName === this.companies.find((c) => c.id === params.companyId)?.name;
        });
        if (!match) return false;
      }
      return true;
    });

    const totalSpent = periodPurchases.reduce((sum, p) => sum + p.totalAmount, 0);
    const totalPurchasesCount = periodPurchases.length;
    const totalUnitsPurchased = periodPurchases.reduce(
      (sum, p) => sum + (p.totalUnits || p.items.reduce((iSum, it) => iSum + it.quantity, 0)),
      0
    );
    const averagePurchaseValue = totalPurchasesCount > 0 ? totalSpent / totalPurchasesCount : 0;

    // Company breakdown
    const companyMap = new Map<string, { name: string; count: number; units: number; total: number }>();
    this.companies.forEach((comp) => {
      companyMap.set(comp.id, { name: comp.name, count: 0, units: 0, total: 0 });
    });

    const itemMap = new Map<string, {
      productId: string;
      productName: string;
      genericName: string;
      companyName: string;
      units: number;
      total: number;
    }>();

    const trendMap = new Map<string, { date: string; label: string; amount: number; units: number; count: number }>();

    periodPurchases.forEach((p) => {
      const pDateStr = (p.rawDate || p.purchaseDate).split('T')[0];
      const curTrend = trendMap.get(pDateStr) || {
        date: pDateStr,
        label: pDateStr,
        amount: 0,
        units: 0,
        count: 0,
      };
      curTrend.amount += p.totalAmount;
      curTrend.units += p.totalUnits || 0;
      curTrend.count += 1;
      trendMap.set(pDateStr, curTrend);

      p.items.forEach((it) => {
        const v = this.variants.find((variant) => variant.id === it.productVariantId);
        const comp = this.companies.find((c) => c.name === it.companyName || (v && c.id === v.companyId));
        const cId = comp ? comp.id : (v ? v.companyId : 'other');

        const cCur = companyMap.get(cId) || {
          name: it.companyName || 'Other',
          count: 0,
          units: 0,
          total: 0,
        };
        cCur.count += 1;
        cCur.units += it.quantity;
        cCur.total += it.subtotal;
        companyMap.set(cId, cCur);

        const itKey = `${it.productId}-${cId}`;
        const itCur = itemMap.get(itKey) || {
          productId: it.productId,
          productName: it.productName,
          genericName: it.genericName || '',
          companyName: it.companyName || '',
          units: 0,
          total: 0,
        };
        itCur.units += it.quantity;
        itCur.total += it.subtotal;
        itemMap.set(itKey, itCur);
      });
    });

    const purchasesByCompany = Array.from(companyMap.entries())
      .filter(([_, val]) => val.total > 0 || val.units > 0)
      .map(([cId, val]) => ({
        companyId: cId,
        companyName: val.name,
        purchasesCount: val.count,
        unitsPurchased: val.units,
        totalAmount: val.total,
        percentage: totalSpent > 0 ? Math.round((val.total / totalSpent) * 1000) / 10 : 0,
      }))
      .sort((a, b) => b.totalAmount - a.totalAmount);

    const topPurchasedProducts = Array.from(itemMap.values())
      .map((val) => ({
        productId: val.productId,
        productName: val.productName,
        genericName: val.genericName,
        companyName: val.companyName,
        unitsPurchased: val.units,
        totalSpent: val.total,
        unitCost: val.units > 0 ? Math.round(val.total / val.units) : 0,
      }))
      .sort((a, b) => b.totalSpent - a.totalSpent);

    const trends = Array.from(trendMap.values()).sort((a, b) => a.date.localeCompare(b.date));

    return {
      success: true,
      data: {
        summary: {
          totalSpent,
          totalPurchasesCount,
          totalUnitsPurchased,
          averagePurchaseValue: Math.round(averagePurchaseValue),
        },
        trends,
        purchasesByCompany,
        topPurchasedProducts,
      },
      message: 'Stock purchase report loaded.',
    };
  }

  /**
   * 5. Financial Movement Report Data (Money In vs Money Out)
   */
  public async getFinancialMovementReport(
    params: ReportFilterParams,
    role: UserRole = 'admin'
  ): Promise<ApiResponse<FinancialMovementReportData>> {
    await this.simulateNetwork();

    const { start, end } = this.getReportDateBoundaries(
      params.dateRange,
      params.startDate,
      params.endDate
    );

    // Money In
    const periodSales = this.sales.filter((s) => {
      const sDate = new Date(s.rawDate || s.date);
      return sDate >= start && sDate <= end;
    });
    const periodDebtPayments = this.debtPayments.filter((dp) => {
      const dpDate = new Date(dp.rawDate || dp.paymentDate);
      return dpDate >= start && dpDate <= end;
    });

    const salesIncome = periodSales.reduce((sum, s) => sum + (s.amountPaid || s.paidAmount || 0), 0);
    const debtPaymentsIncome = periodDebtPayments.reduce((sum, dp) => sum + dp.amount, 0);
    const moneyIn = salesIncome + debtPaymentsIncome;

    // Money Out
    const periodPurchases = this.purchases.filter((p) => {
      if (p.status !== 'COMPLETED') return false;
      const pDate = new Date(p.rawDate || p.purchaseDate);
      return pDate >= start && pDate <= end;
    });
    const periodExpenses = this.expenses.filter((exp) => {
      const expDate = new Date(exp.rawDate || exp.date);
      return expDate >= start && expDate <= end;
    });

    const purchasesExpense = periodPurchases.reduce((sum, p) => sum + p.totalAmount, 0);
    const operatingExpenses = periodExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    const moneyOut = purchasesExpense + operatingExpenses;

    const netMovement = moneyIn - moneyOut; // Strictly NOT called profit

    // Breakdown Money In
    const moneyInBreakdown = [
      {
        source: 'POS & Counter Sales Receipts',
        amount: salesIncome,
        count: periodSales.length,
        percentage: moneyIn > 0 ? Math.round((salesIncome / moneyIn) * 1000) / 10 : 0,
      },
      {
        source: 'Customer Debt Repayments',
        amount: debtPaymentsIncome,
        count: periodDebtPayments.length,
        percentage: moneyIn > 0 ? Math.round((debtPaymentsIncome / moneyIn) * 1000) / 10 : 0,
      },
    ];

    // Breakdown Money Out
    const expenseByCategoryMap = new Map<string, { amount: number; count: number }>();
    expenseByCategoryMap.set('Stock Purchases (Inventory Procurement)', {
      amount: purchasesExpense,
      count: periodPurchases.length,
    });

    periodExpenses.forEach((exp) => {
      const c = exp.category;
      const cur = expenseByCategoryMap.get(c) || { amount: 0, count: 0 };
      cur.amount += exp.amount;
      cur.count += 1;
      expenseByCategoryMap.set(c, cur);
    });

    const moneyOutBreakdown = Array.from(expenseByCategoryMap.entries()).map(([cat, val]) => ({
      category: cat,
      amount: val.amount,
      count: val.count,
      percentage: moneyOut > 0 ? Math.round((val.amount / moneyOut) * 1000) / 10 : 0,
    })).sort((a, b) => b.amount - a.amount);

    // Daily Trend
    const dailyMap = new Map<string, { date: string; label: string; moneyIn: number; moneyOut: number; netMovement: number }>();

    periodSales.forEach((s) => {
      const d = (s.rawDate || s.date).split('T')[0];
      const cur = dailyMap.get(d) || { date: d, label: d, moneyIn: 0, moneyOut: 0, netMovement: 0 };
      const paid = s.amountPaid || s.paidAmount || 0;
      cur.moneyIn += paid;
      cur.netMovement += paid;
      dailyMap.set(d, cur);
    });

    periodDebtPayments.forEach((dp) => {
      const d = (dp.rawDate || dp.paymentDate).split('T')[0];
      const cur = dailyMap.get(d) || { date: d, label: d, moneyIn: 0, moneyOut: 0, netMovement: 0 };
      cur.moneyIn += dp.amount;
      cur.netMovement += dp.amount;
      dailyMap.set(d, cur);
    });

    periodPurchases.forEach((p) => {
      const d = (p.rawDate || p.purchaseDate).split('T')[0];
      const cur = dailyMap.get(d) || { date: d, label: d, moneyIn: 0, moneyOut: 0, netMovement: 0 };
      cur.moneyOut += p.totalAmount;
      cur.netMovement -= p.totalAmount;
      dailyMap.set(d, cur);
    });

    periodExpenses.forEach((exp) => {
      const d = (exp.rawDate || exp.date).split('T')[0];
      const cur = dailyMap.get(d) || { date: d, label: d, moneyIn: 0, moneyOut: 0, netMovement: 0 };
      cur.moneyOut += exp.amount;
      cur.netMovement -= exp.amount;
      dailyMap.set(d, cur);
    });

    const trends = Array.from(dailyMap.values()).sort((a, b) => a.date.localeCompare(b.date));

    return {
      success: true,
      data: {
        summary: {
          moneyIn,
          moneyOut,
          netMovement,
          salesIncome,
          debtPaymentsIncome,
          purchasesExpense,
          operatingExpenses,
        },
        trends,
        moneyInBreakdown,
        moneyOutBreakdown,
      },
      message: 'Financial movement report loaded.',
    };
  }

  /**
   * 6. Product Performance Report Data
   */
  public async getProductPerformanceReport(
    params: ReportFilterParams,
    role: UserRole = 'admin'
  ): Promise<ApiResponse<ProductPerformanceReportData>> {
    await this.simulateNetwork();

    const { start, end } = this.getReportDateBoundaries(
      params.dateRange,
      params.startDate,
      params.endDate
    );
    const isAdmin = role === 'admin';

    // 1. Gather all active variants from products
    const variantMap = new Map<string, ProductPerformanceItem>();

    this.products.forEach((p) => {
      if (params.categoryId && p.categoryId !== params.categoryId) return;
      if (params.productId && p.id !== params.productId) return;

      const cat = this.categories.find((c) => c.id === p.categoryId);
      const categoryName = cat ? cat.name : 'General';

      const pVariants = this.variants.filter((v) => v.productId === p.id && v.status === 'Available');
      pVariants.forEach((v) => {
        if (params.companyId && v.companyId !== params.companyId) return;

        const comp = this.companies.find((c) => c.id === v.companyId);
        variantMap.set(v.id, {
          productId: p.id,
          variantId: v.id,
          productName: p.name,
          genericName: p.genericName,
          dosage: p.dosage,
          form: p.form,
          companyId: v.companyId,
          companyName: comp ? comp.name : 'Unknown',
          categoryName,
          unitsSold: 0,
          revenue: 0,
          cost: 0,
          profit: 0,
          marginPct: 0,
          currentStock: v.currentStock,
          sellingPrice: v.sellingPrice,
          basePrice: v.basePrice,
          velocity: 'zero',
        });
      });
    });

    // 2. Accumulate sales in period
    const filteredSales = this.sales.filter((s) => {
      const sDate = new Date(s.rawDate || s.date);
      return sDate >= start && sDate <= end;
    });

    filteredSales.forEach((s) => {
      s.items.forEach((it) => {
        let vItem = variantMap.get(it.productVariantId);
        if (!vItem) {
          // If variant wasn't initialized (e.g. filtered out or inactive), look up product
          const prod = this.products.find((p) => p.id === it.productId);
          if (params.categoryId && prod && prod.categoryId !== params.categoryId) return;
          if (params.productId && it.productId !== params.productId) return;
          if (params.companyId && it.companyId !== params.companyId) return;

          const cat = prod ? this.categories.find((c) => c.id === prod.categoryId) : null;
          const categoryName = cat ? cat.name : 'General';

          vItem = {
            productId: it.productId,
            variantId: it.productVariantId,
            productName: it.productName,
            genericName: it.genericName || '',
            dosage: it.dosage || '',
            form: it.form || '',
            companyId: it.companyId || '',
            companyName: it.companyName,
            categoryName,
            unitsSold: 0,
            revenue: 0,
            cost: 0,
            profit: 0,
            marginPct: 0,
            currentStock: 0,
            sellingPrice: it.sellingPrice,
            basePrice: it.basePrice || 0,
            velocity: 'zero',
          };
          variantMap.set(it.productVariantId, vItem);
        }

        vItem.unitsSold += it.quantity;
        vItem.revenue += it.subtotal || (it.sellingPrice * it.quantity);
        const itemCost = (it.basePrice || 0) * it.quantity;
        vItem.cost += itemCost;
        if (isAdmin) {
          vItem.profit += (it.subtotal || (it.sellingPrice * it.quantity)) - itemCost;
        }
      });
    });

    // 3. Compute velocity & margin
    let fastMovingCount = 0;
    let slowMovingCount = 0;
    let zeroMovementCount = 0;
    let totalUnitsSold = 0;
    let totalRevenue = 0;
    let totalProfit = 0;

    const items = Array.from(variantMap.values()).map((it) => {
      it.marginPct = it.revenue > 0 && isAdmin ? Math.round((it.profit / it.revenue) * 1000) / 10 : 0;
      if (!isAdmin) {
        it.cost = 0;
        it.profit = 0;
        it.basePrice = 0;
      }

      if (it.unitsSold >= 50) {
        it.velocity = 'fast';
        fastMovingCount++;
      } else if (it.unitsSold >= 10) {
        it.velocity = 'moderate';
      } else if (it.unitsSold > 0) {
        it.velocity = 'slow';
        slowMovingCount++;
      } else {
        it.velocity = 'zero';
        zeroMovementCount++;
      }

      totalUnitsSold += it.unitsSold;
      totalRevenue += it.revenue;
      totalProfit += it.profit;

      return it;
    }).sort((a, b) => b.unitsSold - a.unitsSold || b.revenue - a.revenue);

    return {
      success: true,
      data: {
        items,
        fastMovingCount,
        slowMovingCount,
        zeroMovementCount,
        totalUnitsSold,
        totalRevenue,
        totalProfit: isAdmin ? totalProfit : 0,
      },
      message: 'Product performance report loaded.',
    };
  }

  /**
   * 7. Inventory Movement Report Data (Opening Stock + In - Out = Current Stock)
   */
  public async getInventoryMovementReport(
    params: ReportFilterParams,
    role: UserRole = 'admin'
  ): Promise<ApiResponse<InventoryMovementReportData>> {
    await this.simulateNetwork();

    const { start, end } = this.getReportDateBoundaries(
      params.dateRange,
      params.startDate,
      params.endDate
    );

    // Filter sales and purchases in period
    const periodSales = this.sales.filter((s) => {
      const d = new Date(s.rawDate || s.date);
      return d >= start && d <= end;
    });

    const periodPurchases = this.purchases.filter((p) => {
      if (p.status !== 'COMPLETED') return false;
      const d = new Date(p.rawDate || p.purchaseDate);
      return d >= start && d <= end;
    });

    const periodAdjustments = this.movements.filter((m) => {
      const d = new Date(m.createdAt);
      return d >= start && d <= end && m.type === 'ADJUSTMENT';
    });

    let totalOpeningStock = 0;
    let totalStockIn = 0;
    let totalStockOut = 0;
    let totalCurrentStock = 0;
    let stockInPurchases = 0;
    let stockInAdjustments = 0;
    let stockOutSales = 0;
    let stockOutAdjustments = 0;

    const items: InventoryMovementReportItem[] = [];

    this.products.forEach((p) => {
      if (params.categoryId && p.categoryId !== params.categoryId) return;
      if (params.productId && p.id !== params.productId) return;

      const pVariants = this.variants.filter((v) => v.productId === p.id && v.status === 'Available');
      pVariants.forEach((v) => {
        if (params.companyId && v.companyId !== params.companyId) return;

        const comp = this.companies.find((c) => c.id === v.companyId);

        // Purchases in period for this variant
        const purchasedUnits = periodPurchases.reduce((sum, pur) => {
          const matchItem = pur.items.find((it) => it.productVariantId === v.id || (it.productId === p.id && it.companyName === (comp ? comp.name : '')));
          return sum + (matchItem ? matchItem.quantity : 0);
        }, 0);

        // Sales in period for this variant
        const soldUnits = periodSales.reduce((sum, sale) => {
          const matchItem = sale.items.find((it) => it.productVariantId === v.id || (it.productId === p.id && it.companyId === v.companyId));
          return sum + (matchItem ? matchItem.quantity : 0);
        }, 0);

        // Adjustments in period
        let adjIn = 0;
        let adjOut = 0;
        periodAdjustments.forEach((adj) => {
          if (adj.productVariantId === v.id) {
            const diff = adj.newStock - adj.previousStock;
            if (diff > 0) adjIn += diff;
            else adjOut += Math.abs(diff);
          }
        });

        const stockIn = purchasedUnits + adjIn;
        const stockOut = soldUnits + adjOut;
        const currentStock = v.currentStock;
        // Mathematical identity: Opening Stock = Current Stock - Stock In + Stock Out
        const openingStock = Math.max(0, currentStock - stockIn + stockOut);

        totalOpeningStock += openingStock;
        totalStockIn += stockIn;
        totalStockOut += stockOut;
        totalCurrentStock += currentStock;
        stockInPurchases += purchasedUnits;
        stockInAdjustments += adjIn;
        stockOutSales += soldUnits;
        stockOutAdjustments += adjOut;

        const reorderLevel = v.reorderLevel || 10;
        let status: 'In Stock' | 'Low Stock' | 'Out of Stock' = 'In Stock';
        if (currentStock === 0) status = 'Out of Stock';
        else if (currentStock <= reorderLevel) status = 'Low Stock';

        items.push({
          productId: p.id,
          variantId: v.id,
          productName: p.name,
          genericName: p.genericName,
          companyName: comp ? comp.name : 'Unknown',
          dosage: p.dosage,
          form: p.form,
          openingStock,
          stockIn,
          stockOut,
          currentStock,
          reorderLevel,
          status,
        });
      });
    });

    items.sort((a, b) => b.stockOut - a.stockOut || a.currentStock - b.currentStock);

    return {
      success: true,
      data: {
        items,
        totalOpeningStock,
        totalStockIn,
        totalStockOut,
        totalCurrentStock,
        stockInPurchases,
        stockInAdjustments,
        stockOutSales,
        stockOutAdjustments,
      },
      message: 'Inventory movement report loaded.',
    };
  }

  /**
   * 8. Customer Debt Movement Report Data
   */
  public async getCustomerDebtReport(
    params: ReportFilterParams,
    role: UserRole = 'admin'
  ): Promise<ApiResponse<DebtMovementReportData>> {
    await this.simulateNetwork();

    const { start, end } = this.getReportDateBoundaries(
      params.dateRange,
      params.startDate,
      params.endDate
    );

    // Sales creating debt in period
    const debtSales = this.sales.filter((s) => {
      if (s.outstandingAmount <= 0) return false;
      const d = new Date(s.rawDate || s.date);
      return d >= start && d <= end;
    });

    // Debt repayments in period
    const periodPayments = this.debtPayments.filter((dp) => {
      const d = new Date(dp.rawDate || dp.paymentDate);
      return d >= start && d <= end;
    });

    const debtCreatedInPeriod = debtSales.reduce((sum, s) => sum + s.outstandingAmount, 0);
    const debtPaymentsInPeriod = periodPayments.reduce((sum, dp) => sum + dp.amount, 0);

    const hydratedCustomers = this.customers.map((c) => this.hydrateCustomer(c));
    const totalOutstandingDebt = hydratedCustomers.reduce((sum, c) => sum + (c.outstandingDebt || 0), 0);
    const netDebtChange = debtCreatedInPeriod - debtPaymentsInPeriod;

    // Debtors breakdown
    const debtors = hydratedCustomers
      .filter((c) => (c.outstandingDebt || 0) > 0 || (c.totalPurchases || 0) > 0)
      .map((c) => {
        // Debt created in period for this customer
        const custDebtCreated = debtSales
          .filter((s) => s.customerId === c.id)
          .reduce((sum, s) => sum + s.outstandingAmount, 0);

        // Debt paid in period for this customer
        const custDebtPaid = periodPayments
          .filter((dp) => dp.customerId === c.id)
          .reduce((sum, dp) => sum + dp.amount, 0);

        // Find last payment date
        const cPayments = this.debtPayments
          .filter((dp) => dp.customerId === c.id)
          .sort((a, b) => (b.rawDate || b.paymentDate).localeCompare(a.rawDate || a.paymentDate));

        return {
          customerId: c.id,
          name: c.name,
          phone: c.phone,
          currentDebt: c.outstandingDebt || 0,
          totalPurchasesValue: c.totalPurchases || 0,
          debtCreatedInPeriod: custDebtCreated,
          debtPaidInPeriod: custDebtPaid,
          lastPaymentDate: cPayments.length > 0 ? cPayments[0].paymentDate : undefined,
        };
      })
      .sort((a, b) => b.currentDebt - a.currentDebt);

    const activeDebtorsCount = debtors.filter((d) => d.currentDebt > 0).length;

    // Debt timeline
    const timelineMap = new Map<string, { date: string; label: string; debtCreated: number; debtRecovered: number }>();

    debtSales.forEach((s) => {
      const d = (s.rawDate || s.date).split('T')[0];
      const cur = timelineMap.get(d) || { date: d, label: d, debtCreated: 0, debtRecovered: 0 };
      cur.debtCreated += s.outstandingAmount;
      timelineMap.set(d, cur);
    });

    periodPayments.forEach((dp) => {
      const d = (dp.rawDate || dp.paymentDate).split('T')[0];
      const cur = timelineMap.get(d) || { date: d, label: d, debtCreated: 0, debtRecovered: 0 };
      cur.debtRecovered += dp.amount;
      timelineMap.set(d, cur);
    });

    const trends = Array.from(timelineMap.values()).sort((a, b) => a.date.localeCompare(b.date));

    return {
      success: true,
      data: {
        summary: {
          totalOutstandingDebt,
          debtCreatedInPeriod,
          debtPaymentsInPeriod,
          netDebtChange,
          activeDebtorsCount,
        },
        debtors,
        trends,
      },
      message: 'Debt movement report loaded.',
    };
  }

  // ==========================================
  // 12. System Preferences & Configurations Methods
  // ==========================================

  public async getSettings(): Promise<ApiResponse<SystemSettings>> {
    await this.simulateNetwork();
    return {
      success: true,
      data: { ...this.settings },
      message: 'System settings loaded successfully.',
    };
  }

  public async updateSettings(
    input: UpdateSettingsInput,
    role: UserRole
  ): Promise<ApiResponse<SystemSettings>> {
    await this.simulateNetwork();

    // Enforce role permissions: Cashier can only edit theme
    if (role === 'cashier') {
      const allowedKeys = ['theme'];
      const modifiedKeys = Object.keys(input);
      const unauthorizedKeys = modifiedKeys.filter((k) => !allowedKeys.includes(k));
      if (unauthorizedKeys.length > 0) {
        throw new Error(
          'Unauthorized: Cashier role can only adjust local appearance preferences. Business settings require Administrator privileges.'
        );
      }
    }

    // Validation
    if (input.pharmacyName !== undefined && !input.pharmacyName.trim()) {
      throw new Error('Pharmacy name is required and cannot be empty.');
    }

    if (input.lowStockThreshold !== undefined && input.lowStockThreshold < 0) {
      throw new Error('Low stock threshold must be zero or a positive number.');
    }

    if (input.receiptFooter !== undefined && input.receiptFooter.length > 150) {
      throw new Error('Receipt footer message cannot exceed 150 characters.');
    }

    const now = new Date();
    this.settings = {
      ...this.settings,
      ...input,
      updatedAt: now.toISOString(),
      updatedBy: role === 'admin' ? 'Pharm. Abdullahi (Admin)' : 'Cashier Zainab',
    };

    this.save();

    return {
      success: true,
      data: { ...this.settings },
      message: 'System preferences saved successfully.',
    };
  }

  public async resetSettings(role: UserRole): Promise<ApiResponse<SystemSettings>> {
    await this.simulateNetwork();

    if (role !== 'admin') {
      throw new Error('Unauthorized: Only administrators can reset system settings to defaults.');
    }

    const now = new Date();
    this.settings = {
      ...DEFAULT_MOCK_SETTINGS,
      updatedAt: now.toISOString(),
      updatedBy: 'Pharm. Abdullahi (Admin)',
    };

    this.save();

    return {
      success: true,
      data: { ...this.settings },
      message: 'System preferences reset to default values.',
    };
  }

  public async changePassword(
    input: ChangePasswordInput,
    role: UserRole
  ): Promise<ApiResponse<boolean>> {
    await this.simulateNetwork();

    if (!input.currentPassword) {
      throw new Error('Please enter your current password.');
    }
    if (!input.newPassword || input.newPassword.length < 6) {
      throw new Error('New password must be at least 6 characters long.');
    }
    if (input.newPassword !== input.confirmPassword) {
      throw new Error('New password and confirmation do not match.');
    }

    return {
      success: true,
      data: true,
      message: 'Password updated successfully.',
    };
  }

  // ==========================================
  // 13. Executive Dashboard Aggregations (Module 1)
  // ==========================================

  public async getDashboardData(
    params: DashboardFilterParams,
    role: UserRole = 'admin'
  ): Promise<ApiResponse<DashboardData>> {
    await this.simulateNetwork();

    const isAdmin = role === 'admin';
    const lowStockThreshold = this.settings?.lowStockThreshold ?? 10;

    // 1. Date boundaries
    const { start, end } = this.getReportDateBoundaries(
      params.period as ReportDateRange,
      params.startDate,
      params.endDate
    );

    // 2. Sales in period
    const periodSales = this.sales.filter((sale) => {
      const sDate = new Date(sale.rawDate || sale.date);
      return sDate >= start && sDate <= end;
    });

    const totalSales = periodSales.reduce(
      (sum, s) => sum + (s.total || s.totalAmount || 0),
      0
    );
    const transactionCount = periodSales.length;
    const itemsSold = periodSales.reduce(
      (sum, s) => sum + s.items.reduce((iSum, it) => iSum + it.quantity, 0),
      0
    );

    // Historical profit: Selling Price at Sale - Base Price at Sale * Qty - Discount (Admin only)
    let totalProfit = 0;
    if (isAdmin) {
      totalProfit = periodSales.reduce((sum, s) => {
        const grossProfit = s.items.reduce(
          (iSum, it) =>
            iSum + ((it.sellingPrice || 0) - (it.basePrice || 0)) * it.quantity,
          0
        );
        return sum + Math.max(0, grossProfit - (s.discount || 0));
      }, 0);
    }

    // 3. Money In (Sales receipts + Debt payments in period)
    const periodDebtPayments = this.debtPayments.filter((dp) => {
      const dpDate = new Date(dp.rawDate || dp.paymentDate);
      return dpDate >= start && dpDate <= end;
    });
    const salesCashReceived = periodSales.reduce(
      (sum, s) => sum + (s.amountPaid || s.paidAmount || 0),
      0
    );
    const debtPaymentsReceived = periodDebtPayments.reduce(
      (sum, dp) => sum + dp.amount,
      0
    );
    const moneyIn = salesCashReceived + debtPaymentsReceived;

    // 4. Money Out (Completed Stock Purchases + Expenses in period)
    const periodPurchases = this.purchases.filter((p) => {
      if (p.status !== 'COMPLETED') return false;
      const pDate = new Date(p.rawDate || p.purchaseDate);
      return pDate >= start && pDate <= end;
    });
    const periodExpenses = this.expenses.filter((exp) => {
      const expDate = new Date(exp.rawDate || exp.date);
      return expDate >= start && expDate <= end;
    });
    const purchasesExpense = periodPurchases.reduce(
      (sum, p) => sum + p.totalAmount,
      0
    );
    const operatingExpenses = periodExpenses.reduce(
      (sum, exp) => sum + exp.amount,
      0
    );
    const moneyOut = purchasesExpense + operatingExpenses;

    // Net Money Movement (Strictly NOT labeled net profit)
    const netMoneyMovement = moneyIn - moneyOut;

    // 5. Customer Debt (Current State)
    const hydratedCustomers = this.customers.map((c) => this.hydrateCustomer(c));
    const outstandingDebt = hydratedCustomers.reduce(
      (sum, c) => sum + (c.outstandingDebt || 0),
      0
    );
    const debtorCount = hydratedCustomers.filter(
      (c) => (c.outstandingDebt || 0) > 0
    ).length;
    const registeredCustomersCount = this.customers.length;

    // 6. Inventory & Stock (Current State)
    const activeVariants = this.variants.filter((v) => v.status === 'Available');
    const totalStockUnits = activeVariants.reduce(
      (sum, v) => sum + v.currentStock,
      0
    );
    // Inventory value is strictly Base Price * Current Stock (Admin only)
    const inventoryValue = isAdmin
      ? activeVariants.reduce((sum, v) => sum + v.currentStock * v.basePrice, 0)
      : 0;

    const lowStockVariants = activeVariants.filter(
      (v) => v.currentStock <= lowStockThreshold && v.currentStock > 0
    );
    const outOfStockVariants = activeVariants.filter((v) => v.currentStock === 0);

    const lowStockCount = lowStockVariants.length;
    const outOfStockCount = outOfStockVariants.length;

    // 7. Stock Alerts (Combined out of stock + low stock, sorted by stock ascending)
    const productMap = new Map(this.products.map((p) => [p.id, p]));
    const companyMap = this.getCompanyMap();

    const stockAlerts: DashboardStockAlert[] = [...outOfStockVariants, ...lowStockVariants]
      .map((v) => {
        const prod = productMap.get(v.productId);
        const comp = companyMap.get(v.companyId);
        return {
          productId: v.productId,
          variantId: v.id,
          productName: prod ? prod.name : 'Unknown Product',
          genericName: prod ? prod.genericName : '',
          companyName: comp ? comp.name : 'Unknown Manufacturer',
          currentStock: v.currentStock,
          reorderLevel: v.reorderLevel || lowStockThreshold,
          status: (v.currentStock === 0 ? 'out_of_stock' : 'low_stock') as 'out_of_stock' | 'low_stock',
        };
      })
      .sort((a, b) => a.currentStock - b.currentStock)
      .slice(0, 8);

    // 8. Trends: Sales & Profit + Financial Movement
    const trendMap = new Map<
      string,
      {
        date: string;
        label: string;
        sales: number;
        profit: number;
        transactions: number;
        moneyIn: number;
        moneyOut: number;
      }
    >();

    // Pre-populate daily timeline
    const cursor = new Date(start);
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    while (cursor <= end && trendMap.size < 35) {
      const dStr = cursor.toISOString().split('T')[0];
      const label = `${cursor.getUTCDate()} ${monthNames[cursor.getUTCMonth()]}`;
      trendMap.set(dStr, {
        date: dStr,
        label,
        sales: 0,
        profit: 0,
        transactions: 0,
        moneyIn: 0,
        moneyOut: 0,
      });
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }

    periodSales.forEach((s) => {
      const sDateStr = (s.rawDate || s.date).split('T')[0];
      let point = trendMap.get(sDateStr);
      if (!point) {
        point = {
          date: sDateStr,
          label: sDateStr,
          sales: 0,
          profit: 0,
          transactions: 0,
          moneyIn: 0,
          moneyOut: 0,
        };
        trendMap.set(sDateStr, point);
      }
      point.sales += s.total || s.totalAmount || 0;
      point.transactions += 1;
      const sPaid = s.amountPaid || s.paidAmount || 0;
      point.moneyIn += sPaid;

      if (isAdmin) {
        const pProfit = s.items.reduce(
          (acc, it) => acc + ((it.sellingPrice || 0) - (it.basePrice || 0)) * it.quantity,
          0
        );
        point.profit += Math.max(0, pProfit - (s.discount || 0));
      }
    });

    periodDebtPayments.forEach((dp) => {
      const dpDateStr = (dp.rawDate || dp.paymentDate).split('T')[0];
      let point = trendMap.get(dpDateStr);
      if (point) {
        point.moneyIn += dp.amount;
      }
    });

    periodPurchases.forEach((p) => {
      const pDateStr = (p.rawDate || p.purchaseDate).split('T')[0];
      let point = trendMap.get(pDateStr);
      if (point) {
        point.moneyOut += p.totalAmount;
      }
    });

    periodExpenses.forEach((exp) => {
      const expDateStr = (exp.rawDate || exp.date).split('T')[0];
      let point = trendMap.get(expDateStr);
      if (point) {
        point.moneyOut += exp.amount;
      }
    });

    const sortedTrendList = Array.from(trendMap.values()).sort((a, b) =>
      a.date.localeCompare(b.date)
    );

    const salesTrends: DashboardSalesTrendPoint[] = sortedTrendList.map((t) => ({
      date: t.date,
      label: t.label,
      sales: t.sales,
      profit: isAdmin ? t.profit : 0,
      transactions: t.transactions,
    }));

    const financialMovementTrends: DashboardFinancialMovementPoint[] = sortedTrendList.map((t) => ({
      date: t.date,
      label: t.label,
      moneyIn: t.moneyIn,
      moneyOut: t.moneyOut,
      netMovement: t.moneyIn - t.moneyOut,
    }));

    // 9. Top-Selling Products in Period (Variant-Aware)
    const productItemMap = new Map<
      string,
      {
        productId: string;
        variantId: string;
        productName: string;
        genericName: string;
        companyName: string;
        categoryName: string;
        unitsSold: number;
        revenue: number;
        profit: number;
      }
    >();

    const categoryMap = this.getCategoryMap();

    periodSales.forEach((s) => {
      s.items.forEach((it) => {
        const vKey = `${it.productId}_${it.productVariantId || it.companyId || 'default'}`;
        const prod = productMap.get(it.productId);
        const cat = prod ? categoryMap.get(prod.categoryId) : undefined;
        const comp = it.companyId ? companyMap.get(it.companyId) : undefined;

        let item = productItemMap.get(vKey);
        if (!item) {
          item = {
            productId: it.productId,
            variantId: it.productVariantId || it.companyId || '',
            productName: it.productName || prod?.name || 'Product',
            genericName: it.genericName || prod?.genericName || '',
            companyName: it.companyName || comp?.name || 'Manufacturer',
            categoryName: cat ? cat.name : 'General',
            unitsSold: 0,
            revenue: 0,
            profit: 0,
          };
          productItemMap.set(vKey, item);
        }

        item.unitsSold += it.quantity;
        item.revenue += it.subtotal || (it.sellingPrice || 0) * it.quantity;
        if (isAdmin) {
          item.profit += ((it.sellingPrice || 0) - (it.basePrice || 0)) * it.quantity;
        }
      });
    });

    const topProducts: DashboardTopProduct[] = Array.from(productItemMap.values())
      .map((item) => {
        const v = this.variants.find(
          (variant) =>
            variant.productId === item.productId &&
            (variant.id === item.variantId ||
              variant.companyId === item.variantId ||
              item.variantId === '')
        );
        return {
          ...item,
          currentStock: v ? v.currentStock : 0,
          profit: isAdmin ? item.profit : 0,
        };
      })
      .sort((a, b) => b.unitsSold - a.unitsSold)
      .slice(0, 5);

    // 10. Recent Sales (Last 5)
    const sortedSalesDesc = [...this.sales].sort((a, b) => {
      const dateA = new Date(a.rawDate || a.date).getTime();
      const dateB = new Date(b.rawDate || b.date).getTime();
      return dateB - dateA;
    });

    const recentSales: DashboardRecentSale[] = sortedSalesDesc.slice(0, 6).map((s) => ({
      id: s.id,
      receiptNumber: s.invoiceNumber || s.id,
      date: s.date,
      rawDate: s.rawDate || s.date,
      customerName: s.customerName || (s.customerId ? 'Registered Customer' : 'Walking Customer'),
      isWalkIn: !s.customerId || s.customerName === 'Walking Customer',
      totalAmount: s.total || s.totalAmount || 0,
      paymentMethod: s.paymentMethod,
      paymentStatus: s.paymentStatus,
      itemCount: s.items.reduce((sum, it) => sum + it.quantity, 0),
    }));

    // 11. Recent Purchases (Last 4)
    const sortedPurchasesDesc = [...this.purchases].sort((a, b) => {
      const dateA = new Date(a.rawDate || a.purchaseDate).getTime();
      const dateB = new Date(b.rawDate || b.purchaseDate).getTime();
      return dateB - dateA;
    });

    const recentPurchases: DashboardRecentPurchase[] = sortedPurchasesDesc
      .slice(0, 4)
      .map((p) => {
        const firstItem = p.items[0];
        return {
          id: p.id,
          invoiceNumber: p.purchaseNumber || p.id,
          purchaseDate: p.purchaseDate,
          rawDate: p.rawDate || p.purchaseDate,
          companyName: firstItem?.companyName || 'Pharmaceutical Manufacturer',
          totalAmount: p.totalAmount,
          paymentStatus: p.status === 'COMPLETED' ? 'PAID' : 'PENDING',
          itemsCount: p.items.length,
        };
      });

    return {
      success: true,
      data: {
        summary: {
          totalSales,
          totalProfit: isAdmin ? totalProfit : 0,
          transactionCount,
          itemsSold,
          moneyIn,
          moneyOut,
          netMoneyMovement,
          outstandingDebt,
          debtorCount,
          inventoryValue,
          totalStockUnits,
          lowStockCount,
          outOfStockCount,
          registeredCustomersCount,
          totalPurchasesAmount: purchasesExpense,
          purchasesCount: periodPurchases.length,
        },
        salesTrends,
        financialMovementTrends,
        topProducts,
        recentSales,
        recentPurchases,
        stockAlerts,
        lowStockThreshold,
      },
      message: 'Dashboard data loaded successfully.',
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
    this.purchases = [...MOCK_STOCK_PURCHASES];
    this.expenses = [...MOCK_MANUAL_EXPENSES];
    this.settings = { ...DEFAULT_MOCK_SETTINGS };
    this.config = { ...DEFAULT_CONFIG };
    this.save();
  }
}

export const mockRepository = new MockDatabaseRepository();

