import React, { useState } from 'react';
import {
  UserPlus,
  Users,
  AlertCircle,
  CheckCircle2,
  HelpCircle,
  RotateCw,
  Info,
  CreditCard,
} from 'lucide-react';
import { Customer, CustomerFilterParams, UserRole } from '../../types';
import {
  useCustomers,
  useCustomerKPIs,
  useCustomerProfile,
  useCustomerMutations,
} from '../../hooks';
import { CustomerSummaryCards } from './CustomerSummaryCards';
import { CustomerFilters } from './CustomerFilters';
import { CustomerTable } from './CustomerTable';
import { CustomerCardList } from './CustomerCardList';
import { CustomerProfileModal } from './CustomerProfileModal';
import { CustomerFormModal } from './CustomerFormModal';
import { DebtPaymentModal } from './DebtPaymentModal';

interface CustomerModuleProps {
  currentRole: UserRole;
}

export const CustomerModule: React.FC<CustomerModuleProps> = ({ currentRole }) => {
  // Filter state
  const [filters, setFilters] = useState<CustomerFilterParams>({
    search: '',
    status: 'all',
    debtStatus: 'all',
    sortBy: 'name',
    sortOrder: 'asc',
    page: 1,
    limit: 10,
  });

  // Active selected customer for Profile Drawer / Modal
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  // Customer Form Modal (Create / Edit)
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  // Debt Payment Modal
  const [isDebtModalOpen, setIsDebtModalOpen] = useState(false);
  const [debtCustomer, setDebtCustomer] = useState<Customer | null>(null);

  // Status message / toast
  const [toastMessage, setToastMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Data fetching hooks
  const {
    customers,
    total,
    currentPage,
    totalPages,
    isLoading: isCustomersLoading,
    isSearching,
    isStale,
    error: customersError,
    refetch: refetchCustomers,
  } = useCustomers(filters, currentRole);

  const {
    kpis,
    isLoading: isKpisLoading,
    error: kpisError,
    refetch: refetchKpis,
  } = useCustomerKPIs();

  const {
    customer: activeProfileCustomer,
    error: profileError,
    sales: customerSales,
    debtPayments: customerDebtPayments,
    isCustomerLoading,
    isSalesLoading,
    isDebtLoading,
    refetch: refetchProfile,
  } = useCustomerProfile(selectedCustomerId, currentRole);

  const {
    isMutating,
    createCustomer,
    updateCustomer,
    deactivateCustomer,
    activateCustomer,
    recordDebtPayment,
  } = useCustomerMutations();

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ type, text });
    setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  };

  // Filter Handlers
  const handleFilterChange = (updates: Partial<CustomerFilterParams>) => {
    setFilters((prev) => ({ ...prev, ...updates }));
  };

  const handleResetFilters = () => {
    setFilters({
      search: '',
      status: 'all',
      debtStatus: 'all',
      sortBy: 'name',
      sortOrder: 'asc',
      page: 1,
      limit: 10,
    });
  };

  const handleRefreshAll = () => {
    refetchCustomers(true);
    refetchKpis(true);
    if (selectedCustomerId) {
      refetchProfile();
    }
  };

  // Profile View
  const handleViewProfile = (customer: Customer) => {
    setSelectedCustomerId(customer.id);
    setIsProfileModalOpen(true);
  };

  // Open Create Modal
  const handleOpenCreateModal = () => {
    setEditingCustomer(null);
    setIsFormModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (customer: Customer) => {
    setEditingCustomer(customer);
    setIsFormModalOpen(true);
  };

  // Open Record Debt Payment Modal
  const handleOpenDebtModal = (customer: Customer) => {
    setDebtCustomer(customer);
    setIsDebtModalOpen(true);
  };

  // Handle Form Submit (Create or Update)
  const handleFormSubmit = async (formData: any) => {
    try {
      if (editingCustomer) {
        await updateCustomer(editingCustomer.id, formData);
        showToast(`Customer "${formData.name}" updated successfully.`);
      } else {
        await createCustomer(formData);
        showToast(`Customer "${formData.name}" registered successfully.`);
      }
      refetchCustomers(true);
      refetchKpis(true);
      if (selectedCustomerId) {
        refetchProfile();
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to save customer.', 'error');
      throw err;
    }
  };

  // Handle Debt Payment Submit
  const handleDebtPaymentSubmit = async (paymentData: any) => {
    try {
      const result = await recordDebtPayment(paymentData, currentRole);
      showToast(
        `Payment of ₦${paymentData.amount.toLocaleString()} recorded for ${result.payment.customerName}.`
      );
      refetchCustomers(true);
      refetchKpis(true);
      if (selectedCustomerId) {
        refetchProfile();
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to record debt payment.', 'error');
      throw err;
    }
  };

  // Toggle Customer Status (Activate/Deactivate)
  const handleToggleStatus = async (customer: Customer) => {
    try {
      if (customer.status === 'Active') {
        if (
          confirm(
            `Are you sure you want to deactivate "${customer.name}"? All sales history and debt balances will remain intact.`
          )
        ) {
          await deactivateCustomer(customer.id);
          showToast(`Customer "${customer.name}" has been deactivated.`);
          refetchCustomers(true);
          refetchKpis(true);
          if (selectedCustomerId) {
            refetchProfile();
          }
        }
      } else {
        await activateCustomer(customer.id);
        showToast(`Customer "${customer.name}" is now active.`);
        refetchCustomers(true);
        refetchKpis(true);
        if (selectedCustomerId) {
          refetchProfile();
        }
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to update customer status.', 'error');
    }
  };

  return (
    <div id="customer-module-container" className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed bottom-5 right-5 z-50 p-4 rounded-xl shadow-lg border flex items-center gap-3 text-sm font-medium animate-in slide-in-from-bottom-3 duration-200 ${
            toastMessage.type === 'success'
              ? 'bg-emerald-900 text-emerald-50 border-emerald-700'
              : 'bg-rose-900 text-rose-50 border-rose-700'
          }`}
        >
          {toastMessage.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-300 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-300 shrink-0" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Customers & Debt Management
            </h1>
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
              Module
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Register customer profiles, track credit sales history, and record debt settlements.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            id="btn-register-customer"
            onClick={handleOpenCreateModal}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs sm:text-sm rounded-lg shadow-xs flex items-center gap-2 transition-colors cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Register Customer</span>
          </button>
        </div>
      </div>

      {/* Walking Customer Architecture Note */}
      <div className="bg-blue-50/70 border border-blue-200 rounded-lg p-3 sm:p-3.5 mb-6 flex items-start gap-3 text-xs text-blue-900">
        <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="font-semibold text-blue-950">
            Registered Customers vs. Walking Customers
          </p>
          <p className="text-blue-800 text-[11px] sm:text-xs mt-0.5 leading-relaxed">
            Registered customers have persistent accounts for tracking purchases and credit debt.
            Anonymous <strong>Walking Customers</strong> are processed directly at checkout without creating a database profile.
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <CustomerSummaryCards
        kpis={kpis}
        isLoading={isKpisLoading}
        activeDebtStatusFilter={filters.debtStatus}
        onSelectDebtFilter={(debtStatus) => setFilters((prev) => ({ ...prev, debtStatus, page: 1 }))}
      />

      {/* Filters Bar */}
      <CustomerFilters
        filters={filters}
        onFilterChange={handleFilterChange}
        onReset={handleResetFilters}
        onRefresh={handleRefreshAll}
        totalCount={total}
        isLoading={isCustomersLoading}
        isSearching={isSearching}
        isStale={isStale}
      />

      {/* Errors Banner */}
      {customersError && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-lg mb-4 flex items-center justify-between text-xs text-rose-800">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600" />
            <span>{customersError}</span>
          </div>
          <button
            onClick={() => refetchCustomers(true)}
            className="font-bold underline hover:text-rose-950"
          >
            Retry
          </button>
        </div>
      )}

      {/* Main List Display: Desktop Table / Mobile Cards */}
      <div className="hidden md:block">
        <CustomerTable
          customers={customers}
          isLoading={isCustomersLoading}
          currentRole={currentRole}
          currentPage={currentPage}
          totalPages={totalPages}
          totalCount={total}
          onPageChange={(page) => handleFilterChange({ page })}
          onViewProfile={handleViewProfile}
          onRecordPayment={handleOpenDebtModal}
          onEditCustomer={handleOpenEditModal}
          onToggleStatus={handleToggleStatus}
        />
      </div>

      <div className="block md:hidden">
        <CustomerCardList
          customers={customers}
          isLoading={isCustomersLoading}
          currentRole={currentRole}
          currentPage={currentPage}
          totalPages={totalPages}
          totalCount={total}
          onPageChange={(page) => handleFilterChange({ page })}
          onViewProfile={handleViewProfile}
          onRecordPayment={handleOpenDebtModal}
          onEditCustomer={handleOpenEditModal}
          onToggleStatus={handleToggleStatus}
        />
      </div>

      {/* Modals */}
      <CustomerProfileModal
        error={profileError}
        customer={activeProfileCustomer || customers.find(customer => customer.id === selectedCustomerId) || null}
        sales={customerSales}
        debtPayments={customerDebtPayments}
        isOpen={isProfileModalOpen}
        isLoading={isCustomerLoading}
        isSalesLoading={isSalesLoading}
        isDebtLoading={isDebtLoading}
        currentRole={currentRole}
        onClose={() => {
          setIsProfileModalOpen(false);
          setSelectedCustomerId(null);
        }}
        onRecordPayment={(cust) => {
          setIsProfileModalOpen(false);
          handleOpenDebtModal(cust);
        }}
        onEditCustomer={(cust) => {
          setIsProfileModalOpen(false);
          handleOpenEditModal(cust);
        }}
        onToggleStatus={handleToggleStatus}
        onRefresh={refetchProfile}
      />

      <CustomerFormModal
        customer={editingCustomer}
        isOpen={isFormModalOpen}
        isSubmitting={isMutating}
        onClose={() => {
          setIsFormModalOpen(false);
          setEditingCustomer(null);
        }}
        onSubmit={handleFormSubmit}
      />

      <DebtPaymentModal
        customer={debtCustomer}
        isOpen={isDebtModalOpen}
        isSubmitting={isMutating}
        onClose={() => {
          setIsDebtModalOpen(false);
          setDebtCustomer(null);
        }}
        onSubmit={handleDebtPaymentSubmit}
      />
    </div>
  );
};
