import { SystemSettings } from '../../types';

export const DEFAULT_MOCK_SETTINGS: SystemSettings = {
  id: 'sys-settings-001',
  // 1. Pharmacy Identity & Info
  pharmacyName: 'BrightCare Pharmacy',
  phone: '0803 456 7890',
  email: 'info@brightcarepharmacy.ng',
  address: 'Plot 14 Commercial Avenue, Sabon Gari, Kano, Nigeria',
  logo: '',
  businessDescription: 'Licensed Community & Retail Pharmacy Dispensing Services (PCN Reg: KN-2041)',

  // 2. Currency & Number Formatting
  currency: 'NGN',
  currencySymbol: '₦',
  showDecimals: false,

  // 3. Sales & POS Rules
  allowWalkingSales: true,
  allowCreditSales: true,
  requireCustomerForCredit: true,
  requireSaleConfirmation: false,

  // 4. Inventory Rules
  lowStockThreshold: 10,
  allowNegativeStock: false,
  requireAdminStockAdjustment: true,

  // 5. Receipt Preferences
  receiptLogo: true,
  receiptPhone: true,
  receiptAddress: true,
  receiptCashier: true,
  receiptCustomer: true,
  receiptDatetime: true,
  receiptNumber: true,
  receiptFooter: 'Thank you for your patronage. Goods sold in good condition are not returnable.',

  // 6. Notification Settings
  lowStockNotifications: true,
  outOfStockNotifications: true,
  newDebtNotifications: true,
  largeTransactionAlert: false,
  largeTransactionThreshold: 100000,

  // 7. User & Appearance Preferences
  theme: 'system',
  language: 'English',
  sessionTimeout: '30m',

  // Audit
  updatedAt: new Date().toISOString(),
  updatedBy: 'Pharm. Abdullahi (Admin)',
};
