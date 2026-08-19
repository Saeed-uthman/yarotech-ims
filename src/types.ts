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

// ==========================================
// 9. Sales Module Types & Models (Part 3)
// ==========================================

export type SalePaymentStatus = 'PAID' | 'PARTIAL' | 'UNPAID';
export type SalePaymentMethod = 'CASH' | 'TRANSFER' | 'POS' | 'CREDIT';
export type SalesDateRange = 'today' | 'this_week' | 'this_month' | 'overall' | 'custom';

export interface SaleItem {
  id: string;
  productId: string;
  productVariantId: string;
  productName: string;
  genericName: string;
  companyId?: string;
  companyName: string;
  dosage?: string;
  form?: string;
  quantity: number;
  sellingPrice: number; // Snapshot of selling price at time of sale
  unitPrice?: number; // Alias for backward compatibility
  basePrice?: number; // Snapshot of wholesale base price at time of sale (Admin only)
  subtotal: number; // sellingPrice * quantity
  totalPrice?: number; // Alias for backward compatibility
  profit?: number; // (sellingPrice - basePrice) * quantity (Admin only)
}

export interface Sale {
  id: string;
  invoiceNumber: string; // e.g. "Sale #000145"
  date: string; // e.g. "19 Aug 2026, 10:30 AM"
  rawDate: string; // ISO string for date filtering and sorting
  customerId: string | null; // null for Walking Customer
  customerName: string; // "Walking Customer" or Registered Customer full name
  customerPhone?: string;
  items: SaleItem[];
  itemCount: number;
  subtotal: number;
  discount: number;
  total: number; // subtotal - discount
  totalAmount?: number; // Alias for backward compatibility
  amountPaid: number;
  paidAmount?: number; // Alias for backward compatibility
  outstandingAmount: number; // total - amountPaid
  paymentStatus: SalePaymentStatus;
  paymentType?: SalePaymentStatus | PaymentStatus; // Alias for backward compatibility
  paymentMethod: SalePaymentMethod;
  profit?: number; // SUM(item profits) - Admin only, redacted for Cashier
  servedBy: string; // Cashier / Pharmacist name
  notes?: string;
  status: 'COMPLETED' | 'CANCELLED';
}

// Alias CustomerSaleItem and CustomerSale to maintain 100% interoperability
export type CustomerSaleItem = SaleItem;
export type CustomerSale = Sale;

export interface SalesFilterParams {
  search: string; // Sale ID, customer name, customer phone, product name
  dateRange: SalesDateRange;
  startDate?: string; // YYYY-MM-DD for custom range
  endDate?: string; // YYYY-MM-DD for custom range
  paymentStatus: 'all' | SalePaymentStatus;
  customerType: 'all' | 'registered' | 'walking';
  sortBy: 'date' | 'total' | 'profit' | 'customer' | 'invoiceNumber';
  sortOrder: 'asc' | 'desc';
  page: number;
  limit: number;
}

export interface SalesSummaryKPIs {
  totalRevenue: number; // SUM(completed sale totals)
  totalProfit: number; // SUM(sale profits) - Admin only (redacted/0 for cashier)
  totalTransactions: number; // Count of completed sales
  totalOutstanding: number; // SUM(unpaid / partial balances)
  averageSaleValue: number; // totalRevenue / totalTransactions
  paidCount: number;
  partialCount: number;
  unpaidCount: number;
  timeframe: SalesDateRange;
}

export interface SalesChartDataPoint {
  label: string; // e.g. "09:00", "Mon 17", "18 Aug", etc.
  revenue: number;
  profit: number; // Admin only
  transactions: number;
  rawDate: string;
}

export interface CreateSaleItemInput {
  productVariantId: string;
  quantity: number;
}

export interface CreateSaleInput {
  customerId: string | null; // null for Walking Customer
  customerName?: string;
  customerPhone?: string;
  items: CreateSaleItemInput[];
  discount?: number;
  amountPaid: number;
  paymentMethod: SalePaymentMethod;
  notes?: string;
  servedBy?: string;
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


