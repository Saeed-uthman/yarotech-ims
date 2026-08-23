import { useMemo } from 'react';
import { UserRole } from '../types';
import { useAuth } from './useAuth';

export interface PermissionsState {
  role: UserRole;
  isAdmin: boolean;
  isCashier: boolean;
  
  // Navigation Permissions
  canAccessNav: (navId: string) => boolean;
  
  // Product & Pricing Permissions
  canViewProducts: boolean;
  canCreateProduct: boolean;
  canEditProduct: boolean;
  canDeactivateProduct: boolean;
  canConfigurePrices: boolean;
  canViewBasePrice: boolean;
  canViewProfit: boolean;
  
  // Inventory Permissions
  canViewInventory: boolean;
  canAdjustStock: boolean;
  canViewStockValuationCost: boolean;
  
  // Purchasing Permissions
  canViewPurchases: boolean;
  canCreatePurchase: boolean;
  
  // Customer Permissions
  canViewCustomers: boolean;
  canCreateCustomer: boolean;
  canEditCustomer: boolean;
  canDeactivateCustomer: boolean;
  canRecordDebtPayment: boolean;
  
  // Sales & POS Permissions
  canCreateSale: boolean;
  canSelectSellingPriceInRange: boolean;
  canCancelSale: boolean;
  
  // Reporting & Financial Ledger Permissions
  canViewReports: boolean;
  canViewAccountability: boolean;
  canRecordExpenses: boolean;
  
  // Administration Permissions
  canManageUsers: boolean;
  canManageSettings: boolean;
}

const ADMIN_ONLY_NAV_ITEMS = new Set([
  'stock-purchase',
  'accountability',
  'users',
  'reports',
  'settings',
]);

/**
 * Centralized Hook for Role-Based Access Control (RBAC).
 * Enforces strict boundaries between Administrator and Cashier roles.
 */
export function usePermissions(roleOverride?: UserRole): PermissionsState {
  const { role: authRole } = useAuth();
  const activeRole = roleOverride || authRole || 'cashier';
  const isAdmin = activeRole === 'admin';
  const isCashier = activeRole === 'cashier';

  return useMemo<PermissionsState>(() => {
    return {
      role: activeRole,
      isAdmin,
      isCashier,

      canAccessNav: (navId: string) => {
        if (isAdmin) return true;
        return !ADMIN_ONLY_NAV_ITEMS.has(navId);
      },

      // Product & Pricing
      canViewProducts: true,
      canCreateProduct: isAdmin,
      canEditProduct: isAdmin,
      canDeactivateProduct: isAdmin,
      canConfigurePrices: isAdmin,
      canViewBasePrice: isAdmin,
      canViewProfit: isAdmin,

      // Inventory
      canViewInventory: true,
      canAdjustStock: isAdmin,
      canViewStockValuationCost: isAdmin,

      // Purchases
      canViewPurchases: isAdmin,
      canCreatePurchase: isAdmin,

      // Customers
      canViewCustomers: true,
      canCreateCustomer: true, // Cashiers can register customers
      canEditCustomer: isAdmin, // Cashiers cannot edit customer profiles
      canDeactivateCustomer: isAdmin, // Cashiers cannot deactivate customer profiles
      canRecordDebtPayment: true,

      // Sales & POS
      canCreateSale: true,
      canSelectSellingPriceInRange: true, // Allowed within [minSellingPrice, maxSellingPrice]
      canCancelSale: isAdmin,

      // Reporting & Ledger
      canViewReports: isAdmin,
      canViewAccountability: isAdmin,
      canRecordExpenses: isAdmin,

      // Administration
      canManageUsers: isAdmin,
      canManageSettings: isAdmin,
    };
  }, [activeRole, isAdmin, isCashier]);
}
