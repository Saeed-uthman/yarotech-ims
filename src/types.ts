export type UserRole = 'admin' | 'cashier';
export type AccountStatus = 'PENDING' | 'ACTIVE' | 'REJECTED' | 'SUSPENDED';

// ==========================================
// Authentication & User Management Types
// ==========================================

export interface UserAccount {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  role: UserRole;
  status: AccountStatus;
  password?: string;
  createdAt: string;
  updatedAt: string;
  approvedAt?: string;
  approvedBy?: string;
  rejectedAt?: string;
  rejectedBy?: string;
  rejectionReason?: string;
  suspendedAt?: string;
  suspendedBy?: string;
  lastLogin?: string;
}

export interface RegisterInput {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword?: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface ApproveUserInput {
  userId: string;
  approvedBy: string;
  assignedRole?: UserRole;
}

export interface RejectUserInput {
  userId: string;
  rejectedBy: string;
  reason?: string;
}

export interface SuspendUserInput {
  userId: string;
  suspendedBy: string;
}

export interface ReactivateUserInput {
  userId: string;
  reactivatedBy: string;
}

export interface UserFilterParams {
  search?: string;
  status?: 'all' | AccountStatus;
  role?: 'all' | UserRole;
}

export interface AuthResponse {
  success: boolean;
  user?: UserAccount;
  token?: string;
  message: string;
  errorCode?: 'PENDING' | 'REJECTED' | 'SUSPENDED' | 'INVALID_CREDENTIALS' | 'EMAIL_EXISTS' | 'VALIDATION_ERROR';
}

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
  minSellingPrice: number; // Minimum allowable selling price in NGN
  defaultSellingPrice: number; // Default recommended selling price in NGN
  maxSellingPrice: number; // Maximum allowable selling price in NGN
  sellingPrice: number; // Retail selling price in NGN (default/current selling price)
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
  variantId?: string;
  companyId?: string;
  companyName: string;
  basePrice: number;
  minSellingPrice: number;
  defaultSellingPrice: number;
  maxSellingPrice: number;
  sellingPrice?: number;
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
  data?: T;
  message?: string;
  meta?: ApiMeta;
  error?: string;
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
// 6b. Product Price History & Adjustments
// ==========================================

export type PriceAdjustmentType = 'INCREASE' | 'DECREASE' | 'INITIAL' | 'CORRECTION' | 'SUPPLIER_REVISION';

export interface ProductPriceAdjustment {
  id: string;
  productId: string;
  variantId: string;
  companyName: string;
  oldBasePrice: number;
  newBasePrice: number;
  oldMinSellingPrice?: number;
  newMinSellingPrice?: number;
  oldDefaultSellingPrice?: number;
  newDefaultSellingPrice?: number;
  oldMaxSellingPrice?: number;
  newMaxSellingPrice?: number;
  oldSellingPrice: number;
  newSellingPrice: number;
  changeType: PriceAdjustmentType;
  reason: string;
  adjustedBy: string;
  effectiveDate: string; // ISO format or date string
  createdAt: string;
}

export interface CreatePriceAdjustmentInput {
  productId: string;
  variantId: string;
  newBasePrice: number;
  newMinSellingPrice?: number;
  newDefaultSellingPrice?: number;
  newMaxSellingPrice?: number;
  newSellingPrice: number;
  reason: string;
  adjustedBy?: string;
  effectiveDate?: string;
}

export interface PriceHistoryTimelinePoint {
  date: string;
  displayDate: string;
  timestamp: number;
  avgSellingPrice: number;
  avgBasePrice: number;
  avgMargin: number;
  marginPct: number;
  [key: string]: string | number; // e.g. "DANA_selling", "EMZOR_selling", "DANA_base"
}

export interface ProductPriceHistorySummary {
  currentAvgSelling: number;
  currentAvgBase: number;
  initialAvgSelling: number;
  netChangeAmount: number;
  netChangePercent: number;
  highestSellingPrice: number;
  lowestSellingPrice: number;
  highestBasePrice: number;
  lowestBasePrice: number;
  currentGrossMargin: number;
  currentMarginPercent: number;
  totalAdjustmentsCount: number;
  lastAdjustmentDate?: string;
  lastAdjustmentReason?: string;
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
  actualSellingPrice?: number; // Actual negotiated/selected selling price at time of sale
  sellingPrice: number; // Snapshot of actual selling price (alias for backward compatibility)
  unitPrice?: number; // Alias for backward compatibility
  historicalBasePrice?: number; // Snapshot of wholesale base price at time of sale (Admin only)
  basePrice?: number; // Snapshot of wholesale base price at time of sale (Admin only, alias)
  minSellingPrice?: number; // Minimum allowable selling price at time of sale
  defaultSellingPrice?: number; // Default selling price at time of sale
  maxSellingPrice?: number; // Maximum allowable selling price at time of sale
  subtotal: number; // actualSellingPrice * quantity
  totalPrice?: number; // Alias for backward compatibility
  profit?: number; // (actualSellingPrice - historicalBasePrice) * quantity (Admin only)
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
  unitPrice?: number; // Actual negotiated/selected selling price within [minSellingPrice, maxSellingPrice]
  actualSellingPrice?: number; // Alias for unitPrice
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

// ==========================================
// 10. Stock Purchase Module Entities & DTOs (Part 7)
// ==========================================

export type StockPurchaseStatus = 'COMPLETED' | 'CANCELLED';
export type PurchasePaymentMethod = 'CASH' | 'TRANSFER' | 'POS';
export type PurchasePaymentStatus = 'PAID' | 'PARTIAL' | 'UNPAID';
export type PurchaseDateRange = 'today' | 'this_week' | 'this_month' | 'overall' | 'custom';

export interface PurchaseItemEntity {
  id: string;
  purchaseId?: string;
  productVariantId: string;
  productId: string;
  productName: string;
  genericName: string;
  companyName: string;
  dosage?: string;
  form?: string;
  quantity: number; // Whole number > 0
  unitPurchasePrice: number; // Purchase / Base cost per unit in NGN > 0
  subtotal: number; // quantity * unitPurchasePrice
  batchNumber?: string;
  expiryDate?: string | null;
}

export interface StockPurchase {
  id: string; // e.g. "PUR-0001"
  purchaseNumber: string; // e.g. "PUR-0001"
  purchaseDate: string; // e.g. "19 Aug 2026, 09:30 AM"
  rawDate: string; // ISO 8601 string for reliable date sorting & range filtering
  recordedBy: string; // e.g. "Pharm. Abdullahi (Admin)"
  supplierName?: string;
  totalAmount: number; // SUM of line item subtotals
  amountPaid: number;
  outstandingAmount: number;
  creditedAmount: number;
  paymentStatus: PurchasePaymentStatus;
  paymentMethod: PurchasePaymentMethod | null;
  status: StockPurchaseStatus; // COMPLETED | CANCELLED
  note?: string;
  items: PurchaseItemEntity[];
  itemCount: number; // Unique product variants purchased
  totalUnits: number; // Sum of all item quantities
  createdAt: string;
  updatedAt: string;
}

export interface PurchaseFilterParams {
  search: string;
  dateRange: PurchaseDateRange;
  startDate?: string;
  endDate?: string;
  paymentMethod: 'all' | PurchasePaymentMethod;
  status: 'all' | StockPurchaseStatus;
  sortBy: 'date' | 'total' | 'items' | 'purchaseNumber';
  sortOrder: 'asc' | 'desc';
  page: number;
  limit: number;
}

export interface PurchaseSummaryKPIs {
  totalSpent: number; // SUM(completed purchase totals)
  totalPurchasesCount: number; // Count of all purchases
  completedPurchasesCount: number; // Completed purchases
  cancelledPurchasesCount: number; // Cancelled purchases
  totalUnitsRestocked: number; // Sum of units added to inventory
  averagePurchaseValue: number; // totalSpent / completedPurchasesCount
  timeframe: PurchaseDateRange;
}

export interface PurchaseChartDataPoint {
  label: string;
  amountSpent: number;
  units: number;
  purchasesCount: number;
  rawDate: string;
}

export interface CreatePurchaseItemInput {
  productVariantId: string;
  quantity: number; // Must be integer > 0
  unitPurchasePrice: number; // Must be number > 0
  batchNumber?: string;
  expiryDate?: string | null;
}

export interface CreatePurchaseInput {
  purchaseDate?: string;
  paymentMethod: PurchasePaymentMethod | null;
  amountPaid: number;
  supplierName?: string;
  items: CreatePurchaseItemInput[];
  note?: string;
  recordedBy?: string;
}

// ==========================================
// 11. Accountability Module Entities & DTOs (Part 8)
// ==========================================

export type AccountabilityDirection = 'IN' | 'OUT';
export type AccountabilityType = 'SALE' | 'DEBT_PAYMENT' | 'STOCK_PURCHASE' | 'OTHER_EXPENSE' | 'DEBT_PAYMENT_REVERSAL' | 'SALE_REFUND' | 'PURCHASE_RETURN' | 'SUPPLIER_PAYMENT' | 'OPENING_BALANCE' | 'OWNER_CAPITAL' | 'OWNER_WITHDRAWAL';
export type ExpenseCategory = 'Transport' | 'Utilities' | 'Stationery' | 'Maintenance' | 'Other';
export type AccountabilityPaymentMethod = 'CASH' | 'TRANSFER' | 'POS';
export type AccountabilityDateRange = 'today' | 'this_week' | 'this_month' | 'overall' | 'custom';

export interface AccountabilityItemDetail {
  productId?: string;
  name: string;
  genericName?: string;
  company: string;
  dosage?: string;
  form?: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface AccountabilitySourceDetails {
  itemCount?: number;
  totalUnits?: number;
  customerPhone?: string;
  previousBalance?: number;
  newBalance?: number;
  items?: AccountabilityItemDetail[];
  note?: string;
}

export interface AccountabilityTransaction {
  id: string; // e.g. "ACC-00021"
  transactionNumber: string; // e.g. "ACC-00021"
  type: AccountabilityType; // SALE | DEBT_PAYMENT | STOCK_PURCHASE | OTHER_EXPENSE
  direction: AccountabilityDirection; // IN | OUT
  amount: number; // Monetary amount in NGN > 0
  description: string; // Human-friendly summary
  category: string; // "Sales Revenue" | "Debt Recovery" | "Stock Purchase" | ExpenseCategory
  paymentMethod: AccountabilityPaymentMethod; // CASH | TRANSFER | POS
  referenceType: AccountabilityType;
  referenceId: string; // Source ID (e.g. "sale-050", "PUR-0028", "pay-001", "exp-001")
  referenceNumber: string; // Source Reference # (e.g. "Sale #000150", "PUR-0028", "RCT-2026-0045", "EXP-2026-001")
  customerName?: string;
  customerId?: string | null;
  recordedBy: string; // Staff/Admin who recorded it
  note?: string;
  date: string; // Formatted date string (e.g. "19 Aug 2026, 11:45 AM")
  rawDate: string; // ISO 8601 string for reliable sorting/filtering
  status?: 'COMPLETED' | 'CANCELLED';
  createdAt: string;
  updatedAt?: string;
  sourceDetails?: AccountabilitySourceDetails;
}

export interface ManualExpense {
  id: string; // e.g. "exp-001"
  expenseNumber: string; // e.g. "EXP-2026-001"
  description: string;
  category: ExpenseCategory;
  amount: number;
  paymentMethod: AccountabilityPaymentMethod;
  date: string; // Formatted display date
  rawDate: string; // ISO string
  note?: string;
  recordedBy: string;
  createdAt: string;
  updatedAt?: string;
}

export interface CreateExpenseInput {
  description: string;
  category: ExpenseCategory;
  amount: number;
  paymentMethod: AccountabilityPaymentMethod;
  date?: string;
  note?: string;
  recordedBy?: string;
}

export interface AccountabilityFilterParams {
  search: string;
  dateRange: AccountabilityDateRange;
  startDate?: string;
  endDate?: string;
  direction: 'all' | AccountabilityDirection;
  type: 'all' | AccountabilityType;
  category?: string;
  sortBy: 'date' | 'amount' | 'type';
  sortOrder: 'asc' | 'desc';
  page: number;
  limit: number;
}

export interface AccountabilitySummary {
  moneyIn: number; // SUM(Amount where direction = IN)
  moneyOut: number; // SUM(Amount where direction = OUT)
  netMovement: number; // moneyIn - moneyOut (Strictly NOT called profit)
  netCashGenerated: number;
  totalTransactionsCount: number;
  salesIncome: number;
  debtPaymentsIncome: number;
  purchasesExpense: number;
  otherExpensesExpense: number;
  timeframe: AccountabilityDateRange;
  currentBusinessFunds: number;
  openingBalance: number;
  ownerCapital: number;
  ownerWithdrawals: number;
  openingBalanceRecorded: boolean;
}

export type BusinessFundMovementType = 'OPENING_BALANCE' | 'OWNER_CAPITAL' | 'OWNER_WITHDRAWAL';

export interface CreateBusinessFundMovementInput {
  movementType: BusinessFundMovementType;
  amount: number;
  note?: string;
}

export interface AccountabilityDateGroup {
  dateLabel: string; // e.g. "TODAY", "YESTERDAY", "Monday, 17 Aug 2026"
  rawDate: string;
  transactions: AccountabilityTransaction[];
  groupMoneyIn: number;
  groupMoneyOut: number;
  groupNet: number;
}

// ==========================================
// 12. Financial & Movement Reports Types (Module 9)
// ==========================================

export type ReportDateRange =
  | 'today'
  | 'this_week'
  | 'this_month'
  | 'last_month'
  | 'this_year'
  | 'custom';

export type ReportTab =
  | 'overview'
  | 'sales'
  | 'profit'
  | 'purchases'
  | 'financial-movement'
  | 'inventory-movement'
  | 'product-performance'
  | 'debt';

export interface ReportFilterParams {
  dateRange: ReportDateRange;
  startDate?: string;
  endDate?: string;
  productId?: string;
  companyId?: string;
  categoryId?: string;
  paymentMethod?: string;
}

export interface FinancialSummaryReport {
  totalSales: number;
  totalProfit: number;
  profitMarginPercentage: number;
  totalStockPurchases: number;
  moneyIn: number;
  moneyOut: number;
  netMoneyMovement: number; // Strictly NOT called profit
  outstandingDebt: number;
  totalTransactions: number;
  totalUnitsSold: number;
  totalUnitsPurchased: number;
  averageSaleValue: number;
  timeframe: ReportDateRange;
  startDate: string;
  endDate: string;
}

export interface DailyReportTrendPoint {
  date: string;
  label: string;
  sales: number;
  profit: number;
  purchases: number;
  moneyIn: number;
  moneyOut: number;
  unitsSold: number;
  transactionsCount: number;
}

export interface SalesReportData {
  summary: {
    totalSales: number;
    totalProfit: number;
    profitMarginPercentage: number;
    transactionsCount: number;
    averageSaleValue: number;
    totalItemsSold: number;
  };
  trends: DailyReportTrendPoint[];
  salesByPaymentMethod: {
    method: string;
    amount: number;
    count: number;
    percentage: number;
  }[];
  salesByCategory: {
    categoryId: string;
    categoryName: string;
    unitsSold: number;
    revenue: number;
    profit: number;
  }[];
  salesByCompany: {
    companyId: string;
    companyName: string;
    unitsSold: number;
    revenue: number;
    profit: number;
  }[];
}

export interface ProfitReportData {
  summary: {
    totalRevenue: number;
    totalCost: number;
    grossProfit: number;
    profitMarginPercentage: number;
    totalSoldUnits: number;
  };
  trends: DailyReportTrendPoint[];
  profitByCategory: {
    categoryId: string;
    categoryName: string;
    revenue: number;
    cost: number;
    profit: number;
    marginPct: number;
  }[];
  profitByCompany: {
    companyId: string;
    companyName: string;
    revenue: number;
    cost: number;
    profit: number;
    marginPct: number;
  }[];
  topProfitableProducts: {
    productId: string;
    productName: string;
    genericName: string;
    companyName: string;
    unitsSold: number;
    revenue: number;
    cost: number;
    profit: number;
    marginPct: number;
  }[];
}

export interface StockPurchaseReportData {
  summary: {
    totalSpent: number;
    totalPurchasesCount: number;
    totalUnitsPurchased: number;
    averagePurchaseValue: number;
  };
  trends: {
    date: string;
    label: string;
    amount: number;
    units: number;
    count: number;
  }[];
  purchasesByCompany: {
    companyId: string;
    companyName: string;
    purchasesCount: number;
    unitsPurchased: number;
    totalAmount: number;
    percentage: number;
  }[];
  topPurchasedProducts: {
    productId: string;
    productName: string;
    genericName: string;
    companyName: string;
    unitsPurchased: number;
    totalSpent: number;
    unitCost: number;
  }[];
}

export interface FinancialMovementReportData {
  summary: {
    moneyIn: number;
    moneyOut: number;
    netMovement: number; // Strictly NOT called profit
    salesIncome: number;
    debtPaymentsIncome: number;
    purchasesExpense: number;
    operatingExpenses: number;
    netCashGenerated: number;
    currentBusinessFunds: number;
    openingBalance: number;
    ownerCapital: number;
    ownerWithdrawals: number;
  };
  trends: {
    date: string;
    label: string;
    moneyIn: number;
    moneyOut: number;
    netMovement: number;
  }[];
  moneyInBreakdown: {
    source: string;
    amount: number;
    count: number;
    percentage: number;
  }[];
  moneyOutBreakdown: {
    category: string;
    amount: number;
    count: number;
    percentage: number;
  }[];
}

export interface ProductPerformanceItem {
  productId: string;
  variantId: string;
  productName: string;
  genericName: string;
  dosage?: string;
  form?: string;
  companyId: string;
  companyName: string;
  categoryName: string;
  unitsSold: number;
  revenue: number;
  cost: number; // Admin only
  profit: number; // Admin only
  marginPct: number; // Admin only
  currentStock: number;
  sellingPrice: number;
  basePrice: number;
  velocity: 'fast' | 'moderate' | 'slow' | 'zero';
}

export interface ProductPerformanceReportData {
  items: ProductPerformanceItem[];
  fastMovingCount: number;
  slowMovingCount: number;
  zeroMovementCount: number;
  totalUnitsSold: number;
  totalRevenue: number;
  totalProfit: number;
}

export interface InventoryMovementReportItem {
  productId: string;
  variantId: string;
  productName: string;
  genericName: string;
  companyName: string;
  categoryName: string;
  dosage?: string;
  form?: string;
  openingStock: number;
  stockIn: number; // purchases + positive adjustments
  stockOut: number; // sales + negative adjustments
  currentStock: number;
  reorderLevel: number;
  status: 'in_stock' | 'low_stock' | 'out_of_stock';
  lastMovementDate?: string;
}

export interface InventoryMovementReportData {
  items: InventoryMovementReportItem[];
  summary: {
    totalOpeningStock: number;
    totalStockIn: number;
    totalStockOut: number;
    totalCurrentStock: number;
    stockInPurchases: number;
    stockInAdjustments: number;
    stockOutSales: number;
    stockOutAdjustments: number;
  };
}

export interface SupplierPayment {
  id: string;
  paymentNumber: string;
  purchase: string;
  supplierName: string;
  amount: number;
  paymentMethod: PurchasePaymentMethod;
  paymentDate: string;
  balanceBefore: number;
  balanceAfter: number;
  note?: string;
  recordedByName: string;
  isReversed: boolean;
}

export interface DebtMovementReportData {
  summary: {
    totalOutstandingDebt: number;
    debtCreatedInPeriod: number;
    debtPaymentsInPeriod: number;
    netDebtChange: number;
    activeDebtorsCount: number;
  };
  debtors: {
    customerId: string;
    name: string;
    phone: string;
    currentDebt: number;
    totalPurchasesValue: number;
    debtCreatedInPeriod: number;
    debtPaidInPeriod: number;
    lastPaymentDate?: string;
  }[];
  trends: {
    date: string;
    label: string;
    debtCreated: number;
    debtRecovered: number;
  }[];
}

// ==========================================
// 10. System Preferences & Configuration Types
// ==========================================

export type AppTheme = 'light' | 'dark' | 'system';
export type AppLanguage = 'English';
export type SessionTimeout = '15m' | '30m' | '60m' | 'never';

export interface SystemSettings {
  id: string;
  // 1. Pharmacy Identity & Info
  pharmacyName: string;
  phone: string;
  email: string;
  address: string;
  logo: string;
  businessDescription: string;

  // 2. Currency & Number Formatting
  currency: string;
  currencySymbol: string;
  showDecimals: boolean;

  // 3. Sales & POS Rules
  allowWalkingSales: boolean;
  allowCreditSales: boolean;
  requireCustomerForCredit: boolean;
  requireSaleConfirmation: boolean;

  // 4. Inventory Rules
  lowStockThreshold: number;
  allowNegativeStock: boolean;
  requireAdminStockAdjustment: boolean;

  // 5. Receipt Preferences
  receiptLogo: boolean;
  receiptPhone: boolean;
  receiptAddress: boolean;
  receiptCashier: boolean;
  receiptCustomer: boolean;
  receiptDatetime: boolean;
  receiptNumber: boolean;
  receiptFooter: string;

  // 6. Notification Settings
  lowStockNotifications: boolean;
  outOfStockNotifications: boolean;
  newDebtNotifications: boolean;
  largeTransactionAlert: boolean;
  largeTransactionThreshold: number;

  // 7. User & Appearance Preferences
  theme: AppTheme;
  language: AppLanguage;
  sessionTimeout: SessionTimeout;

  // Audit
  updatedAt: string;
  updatedBy: string;
}

export type UpdateSettingsInput = Partial<Omit<SystemSettings, 'id' | 'updatedAt' | 'updatedBy'>>;

export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

// ==========================================
// 11. Executive Dashboard Types
// ==========================================

export type DashboardPeriod = 'today' | 'this_week' | 'this_month' | 'last_month' | 'custom';

export interface DashboardFilterParams {
  period: DashboardPeriod;
  startDate?: string;
  endDate?: string;
}

export interface DashboardSummaryKPIs {
  totalSales: number;
  totalProfit: number; // Admin only
  transactionCount: number;
  itemsSold: number;
  moneyIn: number;
  moneyOut: number;
  netMoneyMovement: number; // Strictly NOT called net profit
  salesCollected: number; // Cash received at sale creation
  debtRecovered: number; // Subsequent customer debt payments
  stockPurchaseSpend: number; // Completed stock-purchase cash outflow
  operatingExpenses: number; // Completed manual operating-expense outflow
  cashReversals: number; // Completed sale refunds and debt-payment reversals
  purchaseReturns: number; // Cash recovered from stock purchase returns
  netCashGenerated: number; // inflows - purchases - expenses - reversals
  currentBusinessFunds: number; // all-time combined funds currently held by the business
  openingBalance: number;
  ownerCapital: number;
  ownerWithdrawals: number;
  outstandingDebt: number;
  debtorCount: number;
  inventoryValue: number; // Admin only: current stock * base price
  totalStockUnits: number;
  lowStockCount: number;
  outOfStockCount: number;
  registeredCustomersCount: number;
  totalPurchasesAmount: number;
  purchasesCount: number;
}

export interface DashboardSalesTrendPoint {
  date: string;
  label: string;
  sales: number;
  profit: number; // Admin only
  transactions: number;
}

export interface DashboardFinancialMovementPoint {
  date: string;
  label: string;
  moneyIn: number;
  moneyOut: number;
  netMovement: number;
}

export interface DashboardTopProduct {
  productId: string;
  variantId: string;
  productName: string;
  genericName: string;
  companyName: string;
  categoryName: string;
  unitsSold: number;
  revenue: number;
  profit: number; // Admin only
  currentStock: number;
}

export interface DashboardRecentSale {
  id: string;
  receiptNumber: string;
  date: string;
  rawDate: string;
  customerName: string;
  isWalkIn: boolean;
  totalAmount: number;
  paymentMethod: string;
  paymentStatus: string;
  itemCount: number;
}

export interface DashboardRecentPurchase {
  id: string;
  invoiceNumber: string;
  purchaseDate: string;
  rawDate?: string;
  companyName: string;
  totalAmount: number;
  paymentStatus: string;
  itemsCount: number;
}

export interface DashboardStockAlert {
  productId: string;
  variantId: string;
  productName: string;
  genericName: string;
  companyName: string;
  currentStock: number;
  reorderLevel: number;
  status: 'low_stock' | 'out_of_stock';
}

export interface DashboardData {
  summary: DashboardSummaryKPIs;
  salesTrends: DashboardSalesTrendPoint[];
  financialMovementTrends: DashboardFinancialMovementPoint[];
  topProducts: DashboardTopProduct[];
  recentSales: DashboardRecentSale[];
  recentPurchases: DashboardRecentPurchase[];
  stockAlerts: DashboardStockAlert[];
  lowStockThreshold: number;
}


