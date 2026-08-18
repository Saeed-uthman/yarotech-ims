export type UserRole = 'admin' | 'cashier';

export type ProductStatus = 'Active' | 'Inactive';
export type CompanyVariantStatus = 'Available' | 'Inactive';
export type GeneralStatus = 'Active' | 'Inactive';

export type ProductDosageForm = 
  | 'Tablet'
  | 'Capsule'
  | 'Syrup'
  | 'Suspension'
  | 'Injection'
  | 'Cream'
  | 'Ointment'
  | 'Drops'
  | 'Inhaler'
  | 'Gel'
  | 'Infusion'
  | 'Powder';

// ==========================================
// 1. Normalized Core Entities (Database Model)
// ==========================================

export interface CategoryEntity {
  id: string;
  name: string;
  description?: string;
  status: GeneralStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CompanyEntity {
  id: string;
  name: string; // Manufacturer name (e.g. DANA, EMZOR, FIDSON)
  code?: string;
  country?: string;
  status: GeneralStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ProductEntity {
  id: string;
  name: string;
  genericName: string;
  categoryId: string; // Foreign key to CategoryEntity
  dosage: string;
  form: ProductDosageForm | string;
  barcode: string;
  description: string;
  subtitle?: string;
  image?: string;
  status: ProductStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ProductVariantEntity {
  id: string;
  productId: string; // Foreign key to ProductEntity
  companyId: string; // Foreign key to CompanyEntity (Manufacturer)
  basePrice: number; // Wholesale / Base purchase cost in NGN (Admin only)
  sellingPrice: number; // Retail selling price in NGN
  currentStock: number; // Inventory units in stock
  reorderLevel: number; // Low stock threshold (Admin only)
  status: CompanyVariantStatus;
  createdAt: string;
  updatedAt: string;
}

// Backward compatibility & convenient interfaces
export type ProductCategory = CategoryEntity;
export type Company = CompanyEntity;

// ==========================================
// 2. Hydrated / View Models (for UI Consumption)
// ==========================================

export interface CompanyVariant extends ProductVariantEntity {
  companyName: string; // Joined from CompanyEntity for seamless UI display
}

export interface Product extends Omit<ProductEntity, 'categoryId'> {
  categoryId: string;
  category: string; // Joined name from CategoryEntity
  variants: CompanyVariant[]; // Resolved relationship from ProductVariantEntity
}

// ==========================================
// 3. Input DTOs
// ==========================================

export interface ProductVariantInput {
  companyId?: string;
  companyName: string;
  basePrice: number;
  sellingPrice: number;
  currentStock: number;
  reorderLevel: number;
  status?: CompanyVariantStatus;
}

export interface ProductCreateInput {
  name: string;
  genericName: string;
  categoryId?: string;
  category: string;
  dosage: string;
  form: string;
  barcode?: string;
  description: string;
  subtitle?: string;
  image?: string;
  status?: ProductStatus;
  variants: ProductVariantInput[];
}

export interface ProductUpdateInput extends Partial<ProductCreateInput> {}

// ==========================================
// 4. Query / Filter Parameters
// ==========================================

export interface ProductFilterParams {
  search: string;
  category: string;
  status: string;
  company: string;
  stockStatus: 'all' | 'in_stock' | 'low_stock' | 'out_of_stock';
  sortBy: 'name' | 'genericName' | 'stock' | 'price' | 'basePrice' | 'date';
  sortOrder: 'asc' | 'desc';
  page: number;
  limit: number;
}

// ==========================================
// 5. Standard API Response Structure (Laravel compatible)
// ==========================================

export interface ApiMeta {
  currentPage: number;
  perPage: number;
  total: number;
  lastPage: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
  meta?: ApiMeta;
  errors?: Record<string, string[]>;
}

// ==========================================
// 6. Aggregates & Statistics (Derived, not hardcoded)
// ==========================================

export interface ProductKPIStats {
  totalProducts: number;
  activeProductsCount: number;
  totalCompanies: number;
  totalVariants: number;
  totalStockUnits: number;
  totalInventoryValueSelling: number; // ₦ at retail selling price
  totalInventoryValueCost: number; // ₦ at base wholesale cost (admin only)
}

// ==========================================
// 7. Inventory Module Types & Models
// ==========================================

export type StockStatusType = 'In Stock' | 'Low Stock' | 'Out of Stock';

export type InventoryMovementType = 'STOCK_IN' | 'STOCK_OUT' | 'ADJUSTMENT';

export interface InventoryItem {
  id: string; // ProductVariantEntity id
  productId: string;
  productName: string;
  genericName: string;
  categoryId: string;
  category: string;
  companyId: string;
  companyName: string;
  dosage: string;
  form: string;
  barcode: string;
  image?: string;
  basePrice: number; // Admin only (redacted for Cashier)
  sellingPrice: number;
  currentStock: number;
  reorderLevel: number;
  inventoryValue: number; // Derived: currentStock * basePrice (Admin only)
  potentialSalesValue: number; // Derived: currentStock * sellingPrice
  stockStatus: StockStatusType; // Derived centrally
  productStatus: ProductStatus;
  variantStatus: CompanyVariantStatus;
  updatedAt: string;
}

export interface InventorySummaryKPIs {
  totalInventoryItems: number; // Total active variants count
  totalUnitsInStock: number; // SUM(currentStock)
  totalInventoryValue: number; // SUM(currentStock * basePrice) - Admin only
  totalPotentialSalesValue: number; // SUM(currentStock * sellingPrice)
  lowStockCount: number; // count where currentStock > 0 && currentStock <= reorderLevel
  outOfStockCount: number; // count where currentStock === 0
  inStockCount: number; // count where currentStock > reorderLevel
}

export interface InventoryFilterParams {
  search: string;
  category: string;
  company: string;
  stockStatus: 'all' | 'in_stock' | 'low_stock' | 'out_of_stock';
  sortBy: 'name' | 'stock' | 'inventoryValue' | 'basePrice' | 'reorderLevel' | 'company';
  sortOrder: 'asc' | 'desc';
  page: number;
  limit: number;
}

export interface InventoryMovement {
  id: string;
  productVariantId: string;
  productId: string;
  productName: string;
  genericName: string;
  companyName: string;
  type: InventoryMovementType;
  quantity: number; // Amount changed (e.g. +50, -5, +12)
  previousStock: number;
  newStock: number;
  reason: string;
  referenceType?: 'STOCK_PURCHASE' | 'SALE' | 'ADJUSTMENT' | 'INITIAL_SETUP' | string;
  referenceId?: string;
  createdBy: string;
  createdAt: string;
}

export interface StockAdjustmentInput {
  productVariantId: string;
  adjustmentType: 'SET_EXACT' | 'INCREMENT' | 'DECREMENT';
  adjustmentQuantity: number; // Either target quantity or delta
  reason: string;
  customNotes?: string;
  adminName?: string;
}

export type InsightsTimeframe = 'today' | 'this_week' | 'this_month' | 'overall';

export interface TopValuedItemInsight {
  variantId: string;
  productId: string;
  productName: string;
  genericName: string;
  companyName: string;
  currentStock: number;
  basePrice: number;
  inventoryValue: number; // currentStock * basePrice
  stockStatus: StockStatusType;
}

export interface TopQuantityItemInsight {
  variantId: string;
  productId: string;
  productName: string;
  genericName: string;
  companyName: string;
  currentStock: number;
  reorderLevel: number;
  stockStatus: StockStatusType;
}

export interface CategoryStockDistribution {
  categoryId: string;
  categoryName: string;
  totalVariants: number;
  totalUnits: number;
  totalInventoryValue: number;
  percentageOfTotalUnits: number;
}

export interface StockMovementSummaryInsight {
  timeframe: InsightsTimeframe;
  totalStockIn: number;
  totalStockOut: number;
  netMovement: number;
  totalAdjustmentsCount: number;
  recentMovements: InventoryMovement[];
}

export interface InventoryInsightsData {
  timeframe: InsightsTimeframe;
  summary: InventorySummaryKPIs;
  movementSummary: StockMovementSummaryInsight;
  topValuedItems: TopValuedItemInsight[];
  topQuantityItems: TopQuantityItemInsight[];
  categoryDistribution: CategoryStockDistribution[];
}

// ==========================================
// 8. Customer & Debt Management Types
// ==========================================

export type CustomerStatus = 'Active' | 'Inactive';
export type PaymentStatus = 'PAID' | 'PARTIAL' | 'CREDIT';
export type PaymentMethod = 'CASH' | 'TRANSFER' | 'POS' | 'CREDIT';

export interface CustomerEntity {
  id: string;
  name: string; // Full Name
  phone: string; // Phone Number
  address?: string;
  email?: string;
  notes?: string;
  status: CustomerStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Customer extends CustomerEntity {
  totalPurchases: number; // Derived SUM of completed sales
  totalDebt: number; // Derived SUM of initial credit sale debt
  amountPaid: number; // Derived SUM of debt payments made
  outstandingDebt: number; // Derived: totalDebt - amountPaid
  salesCount: number; // Number of sales
  lastPurchaseDate?: string; // e.g. "18 Aug 2026"
}

export interface CustomerSaleItem {
  id: string;
  productVariantId: string;
  productName: string;
  genericName: string;
  dosage: string;
  form: string;
  companyName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface CustomerSale {
  id: string;
  invoiceNumber: string; // e.g. "Sale #000123"
  customerId: string | null; // null for Walking Customer
  customerName: string; // "Walking Customer" or Registered Customer Name
  customerPhone?: string;
  date: string; // e.g. "18 Aug 2026, 02:45 PM"
  rawDate: string; // ISO date for sorting
  itemCount: number;
  items: CustomerSaleItem[];
  subtotal: number;
  discount: number;
  totalAmount: number;
  paidAmount: number;
  outstandingAmount: number; // totalAmount - paidAmount
  paymentType: PaymentStatus;
  paymentMethod: PaymentMethod;
  servedBy: string;
  notes?: string;
  status: 'COMPLETED' | 'CANCELLED';
}

export interface CustomerDebtPayment {
  id: string;
  receiptNumber: string; // e.g. "RCT-0045"
  customerId: string;
  customerName: string;
  customerPhone: string;
  amount: number;
  paymentDate: string; // e.g. "18 Aug 2026, 03:10 PM"
  rawDate: string;
  paymentMethod: 'CASH' | 'TRANSFER' | 'POS';
  balanceBefore: number;
  balanceAfter: number;
  referenceNotes?: string;
  recordedBy: string; // e.g. "Pharm. Abdullahi (Admin)" or "Cashier Zainab"
  createdAt: string;
}

export interface CustomerFilterParams {
  search: string;
  status: 'all' | 'active' | 'inactive';
  debtStatus: 'all' | 'has_debt' | 'no_debt';
  sortBy: 'name' | 'debt' | 'purchases' | 'date';
  sortOrder: 'asc' | 'desc';
  page: number;
  limit: number;
}

export interface CustomerSummaryKPIs {
  totalCustomers: number;
  activeCustomers: number;
  inactiveCustomers: number;
  customersWithDebt: number;
  totalOutstandingDebt: number;
  totalCustomerPurchases: number;
}

export interface CreateCustomerInput {
  name: string;
  phone: string;
  address?: string;
  email?: string;
  notes?: string;
  status?: CustomerStatus;
}

export interface UpdateCustomerInput {
  name?: string;
  phone?: string;
  address?: string;
  email?: string;
  notes?: string;
  status?: CustomerStatus;
}

export interface DebtPaymentInput {
  customerId: string;
  amount: number;
  paymentMethod: 'CASH' | 'TRANSFER' | 'POS';
  paymentDate?: string;
  referenceNotes?: string;
  recordedBy?: string;
}


