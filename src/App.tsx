import React, { useState, useEffect, useCallback } from 'react';
import { 
  Product, 
  ProductCreateInput, 
  ProductFilterParams,
  CompanyVariant,
  ProductVariantInput
} from './types';
import { 
  useProducts, 
  useKPIStats, 
  useReferenceData, 
  useProductMutations, 
  useSmartPolling, 
  useNetworkStatus,
  useAuth,
  useKeyboardShortcuts,
  useInactivityLogout,
} from './hooks';
import { AuthProvider } from './contexts/AuthContext';
import { AuthContainer } from './components/auth/AuthContainer';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { BottomNav } from './components/layout/BottomNav';
import { MetricCards } from './components/products/MetricCards';
import { ProductFilters } from './components/products/ProductFilters';
import { ProductListTable } from './components/products/ProductListTable';
import { ProductListMobile } from './components/products/ProductListMobile';
import { ProductDetailsView } from './components/products/ProductDetailsView';
import { ProductWizard } from './components/products/ProductWizard';
import { ConfirmDeactivationModal } from './components/products/ConfirmDeactivationModal';
import { BarcodeScannerModal } from './components/common/BarcodeScannerModal';
import { NetworkConfigModal } from './components/common/NetworkConfigModal';
import { KeyboardShortcutsModal } from './components/common/KeyboardShortcutsModal';
import { LowStockAlertModal } from './components/common/LowStockAlertModal';
import { ProductStockAuditModal } from './components/products/ProductStockAuditModal';
import { ToastContainer, ToastMessage } from './components/common/Toast';
import { ModulePlaceholder } from './components/common/ModulePlaceholder';
import { AccessDeniedCard } from './components/common/RoleGuard';
import { InventoryModule } from './components/inventory/InventoryModule';
import { CustomerModule } from './components/customers';
import { SalesModule } from './components/sales';
import { PurchasesModule } from './components/purchases';
import { AccountabilityModule } from './components/accountability';
import { ReportsModule } from './components/reports';
import { SettingsModule } from './components/settings';
import { DashboardModule } from './components/dashboard';
import { UserManagementModule } from './components/users';
import { WifiOff, Activity, RefreshCw, Loader2, HeartPulse } from 'lucide-react';
import { downloadProductCsvTemplate } from './utils/productCsvTemplate';
import { useSettings } from './hooks/useSettings';
import { useInventoryKPIs } from './hooks/useInventory';
import { useDocumentTheme } from './hooks/useDocumentTheme';

function MainPharmacyApp() {
  const {
    isAuthenticated,
    isLoading: isAuthLoading,
    user,
    role: currentRole,
    logoutForInactivity,
  } = useAuth();

  // Navigation & View Mode
  const [activeNav, setActiveNav] = useState<string>('dashboard');
  const [viewMode, setViewMode] = useState<'list' | 'details' | 'wizard'>('list');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [productToEdit, setProductToEdit] = useState<Product | null>(null);

  // Filters & Search State
  const [filters, setFilters] = useState<ProductFilterParams>({
    search: '',
    category: 'All Categories',
    status: 'All Status',
    company: 'All',
    stockStatus: 'all',
    sortBy: 'name',
    sortOrder: 'asc',
    page: 1,
    limit: 10,
  });

  // Network status hook
  const { isOnline, browserOnline } = useNetworkStatus();

  // Custom Hooks Layer
  const {
    products,
    total,
    currentPage,
    totalPages,
    isLoading: isProductsLoading,
    isSearching,
    isStale,
    error: productsError,
    refetch: refetchProducts,
    updateOptimisticStatus,
    rollbackOptimisticStatus,
  } = useProducts(filters, currentRole);

  const { stats, isLoading: isKPIsLoading, refetch: refetchKPIs } = useKPIStats(currentRole);
  const { kpis: inventoryKPIs, refetch: refetchInventoryKPIs } = useInventoryKPIs(currentRole);
  const { categories, companies, refetch: refetchReferenceData } = useReferenceData();
  const { settings, refetch: refetchSettings } = useSettings(currentRole);

  const sessionTimeout = settings?.sessionTimeout || '30m';
  const handleInactivityTimeout = useCallback(() => {
    logoutForInactivity(sessionTimeout);
  }, [logoutForInactivity, sessionTimeout]);

  useInactivityLogout({
    enabled: isAuthenticated && user?.status === 'ACTIVE',
    timeout: sessionTimeout,
    onTimeout: handleInactivityTimeout,
  });

  // A first login may happen after the unauthenticated settings request, so
  // always reload the server policy as soon as a session becomes active.
  useEffect(() => {
    if (isAuthenticated && user?.status === 'ACTIVE') {
      void refetchSettings(true);
    }
  }, [isAuthenticated, refetchSettings, user?.status]);

  const totalLowStockAlerts = (inventoryKPIs?.lowStockCount || 0) + (inventoryKPIs?.outOfStockCount || 0);

  // Keep the server preference synchronized with the document and OS changes.
  useDocumentTheme(settings?.theme);

  const {
    isMutating,
    createProduct,
    updateProduct,
    deactivateProduct,
    activateProduct,
    addVariant,
    updateVariant,
    deleteVariant,
  } = useProductMutations();

  // Background smart polling: revalidates every 45s if tab is visible & online
  useSmartPolling({
    enabled: true,
    intervalMs: 45000,
    onPoll: () => {
      refetchProducts();
      refetchKPIs();
      refetchInventoryKPIs();
    },
  });

  // Deactivation Modal State
  const [productToDeactivate, setProductToDeactivate] = useState<Product | null>(null);
  const [isDeactivating, setIsDeactivating] = useState(false);

  // Modals & UI Controls
  const [isBarcodeScannerOpen, setIsBarcodeScannerOpen] = useState(false);
  const [isNetworkConfigOpen, setIsNetworkConfigOpen] = useState(false);
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState(false);
  const [isLowStockModalOpen, setIsLowStockModalOpen] = useState(false);
  const [isStockAuditModalOpen, setIsStockAuditModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Toast notification helper
  const addToast = useCallback((type: 'success' | 'error' | 'info', title: string, message?: string) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    setToasts((prev) => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Sync selected product if updated in products list
  useEffect(() => {
    if (selectedProduct) {
      const updated = products.find((p) => p.id === selectedProduct.id);
      if (updated) setSelectedProduct(updated);
    }
  }, [products, selectedProduct]);

  // Handlers for Views & Wizard
  const handleOpenAddProduct = useCallback(() => {
    if (currentRole !== 'admin') {
      addToast('info', 'Admin Access Required', 'Creating new products in the catalog requires Administrator role.');
      return;
    }
    setProductToEdit(null);
    setViewMode('wizard');
    setActiveNav('products');
  }, [currentRole, addToast]);

  const handleOpenEditProduct = (product: Product) => {
    setProductToEdit(product);
    setViewMode('wizard');
    setActiveNav('products');
  };

  const handleViewProduct = (product: Product) => {
    setSelectedProduct(product);
    setViewMode('details');
    setActiveNav('products');
  };

  // Keyboard shortcut Search Focus handler (supports Ctrl+F, Cmd+F, Ctrl+K, /)
  const handleFocusSearch = useCallback(() => {
    if (window.innerWidth < 768) {
      const mobileToggle = document.getElementById('header-mobile-search-toggle');
      if (mobileToggle) {
        mobileToggle.click();
        setTimeout(() => {
          const mInput = document.getElementById('header-mobile-search-input') as HTMLInputElement | null;
          mInput?.focus();
          mInput?.select();
        }, 60);
      }
      return;
    }

    const filterSearchInput = document.getElementById('filter-search-input') as HTMLInputElement | null;
    const headerSearchInput = document.getElementById('header-global-search-input') as HTMLInputElement | null;

    if (activeNav === 'products' && viewMode === 'list' && filterSearchInput) {
      filterSearchInput.focus();
      filterSearchInput.select();
    } else if (headerSearchInput) {
      headerSearchInput.focus();
      headerSearchInput.select();
    }
  }, [activeNav, viewMode]);

  // Handler to safely close topmost active modal on Escape key
  const handleCloseCurrentModal = useCallback(() => {
    if (isStockAuditModalOpen) {
      setIsStockAuditModalOpen(false);
      return;
    }
    if (isLowStockModalOpen) {
      setIsLowStockModalOpen(false);
      return;
    }
    if (isShortcutsModalOpen) {
      setIsShortcutsModalOpen(false);
      return;
    }
    if (isBarcodeScannerOpen) {
      setIsBarcodeScannerOpen(false);
      return;
    }
    if (isNetworkConfigOpen) {
      setIsNetworkConfigOpen(false);
      return;
    }
    if (productToDeactivate) {
      setProductToDeactivate(null);
      return;
    }
    if (isMobileMenuOpen) {
      setIsMobileMenuOpen(false);
      return;
    }
    if (viewMode === 'wizard') {
      if (selectedProduct && productToEdit) {
        setViewMode('details');
      } else {
        setViewMode('list');
      }
      return;
    }
    if (viewMode === 'details') {
      setViewMode('list');
      return;
    }
  }, [
    isStockAuditModalOpen,
    isLowStockModalOpen,
    isShortcutsModalOpen,
    isBarcodeScannerOpen,
    isNetworkConfigOpen,
    productToDeactivate,
    isMobileMenuOpen,
    viewMode,
    selectedProduct,
    productToEdit,
  ]);

  // Global Keyboard Shortcuts Listener
  useKeyboardShortcuts({
    onOpenAddProduct: handleOpenAddProduct,
    onFocusSearch: handleFocusSearch,
    onOpenBarcodeScanner: () => setIsBarcodeScannerOpen(true),
    onOpenShortcutsModal: () => setIsShortcutsModalOpen(true),
    onOpenExportAudit: () => setIsStockAuditModalOpen(true),
    onCloseCurrentModal: handleCloseCurrentModal,
    onNavigate: (nav) => {
      setActiveNav(nav);
      if (nav === 'products') setViewMode('list');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    isEnabled: isAuthenticated && user?.status === 'ACTIVE',
  });

  const handleSaveProductWizard = async (data: ProductCreateInput) => {
    if (productToEdit) {
      try {
        const updated = await updateProduct(productToEdit.id, data, currentRole);
        refetchProducts(true);
        refetchKPIs();
        addToast('success', 'Product Updated', `${data.name} was updated successfully.`);
        if (selectedProduct && selectedProduct.id === productToEdit.id) {
          setSelectedProduct(updated);
          setViewMode('details');
        } else {
          setViewMode('list');
        }
      } catch (err: any) {
        addToast('error', 'Update Failed', err?.message || 'Unable to update product.');
      }
    } else {
      try {
        await createProduct(data, currentRole);
        refetchProducts(true);
        refetchKPIs();
        addToast('success', 'Product Created', `${data.name} was added to inventory.`);
        setViewMode('list');
      } catch (err: any) {
        addToast('error', 'Creation Failed', err?.message || 'Unable to create product.');
      }
    }
  };

  const handleRequestDeactivation = (product: Product) => {
    setProductToDeactivate(product);
  };

  const handleConfirmDeactivation = async (reason: string) => {
    if (!productToDeactivate) return;
    setIsDeactivating(true);
    updateOptimisticStatus(productToDeactivate.id, 'Inactive');

    try {
      const updated = await deactivateProduct(productToDeactivate, currentRole);
      refetchProducts(true);
      refetchKPIs();
      addToast('info', 'Product Deactivated', `${productToDeactivate.name} has been archived.`);
      if (selectedProduct && selectedProduct.id === productToDeactivate.id) {
        setSelectedProduct(updated);
      }
    } catch (err: any) {
      rollbackOptimisticStatus(productToDeactivate.id, 'Active');
      addToast('error', 'Deactivation Failed', err?.message || 'Server rejected deactivation.');
    } finally {
      setIsDeactivating(false);
      setProductToDeactivate(null);
    }
  };

  const handleActivateProduct = async (product: Product) => {
    updateOptimisticStatus(product.id, 'Active');
    try {
      const updated = await activateProduct(product, currentRole);
      refetchProducts(true);
      refetchKPIs();
      addToast('success', 'Product Activated', `${product.name} is now active.`);
      if (selectedProduct && selectedProduct.id === product.id) {
        setSelectedProduct(updated);
      }
    } catch (err: any) {
      rollbackOptimisticStatus(product.id, 'Inactive');
      addToast('error', 'Activation Failed', err?.message || 'Server error activating product.');
    }
  };

  const handleAddVariant = async (productId: string, variant: ProductVariantInput): Promise<boolean> => {
    try {
      const updated = await addVariant(productId, variant, currentRole);
      addToast('success', 'Variant Added', `Added ${variant.companyName} variant.`);
      setSelectedProduct(updated);
      refetchProducts(true);
      refetchKPIs();
      refetchReferenceData();
      return true;
    } catch (err: any) {
      addToast('error', 'Failed to Add Variant', err?.message || 'Could not add variant.');
      return false;
    }
  };

  const handleUpdateVariant = async (
    productId: string,
    variantId: string,
    updates: Partial<CompanyVariant>
  ): Promise<boolean> => {
    try {
      const updated = await updateVariant(productId, variantId, updates, currentRole);
      addToast('success', 'Variant Updated', 'Company pricing updated successfully.');
      setSelectedProduct(updated);
      refetchProducts(true);
      refetchKPIs();
      refetchReferenceData();
      return true;
    } catch (err: any) {
      addToast('error', 'Failed to Update Variant', err?.message || 'Could not update variant.');
      return false;
    }
  };

  const handleDeleteVariant = async (productId: string, variantId: string) => {
    try {
      const updated = await deleteVariant(productId, variantId, currentRole);
      addToast('info', 'Variant Removed', 'Variant removed from product.');
      setSelectedProduct(updated);
    } catch (err: any) {
      addToast('error', 'Failed to Remove Variant', err?.message || 'Could not remove variant.');
    }
  };

  const handleUpdateProductImage = async (productId: string, imageUrl: string) => {
    try {
      const updated = await updateProduct(productId, { imageUrl } as any, currentRole);
      setSelectedProduct(updated);
      addToast('success', 'Image Updated', 'Product photo updated successfully.');
    } catch (err: any) {
      addToast('error', 'Failed to Update Image', err?.message || 'Could not update image.');
    }
  };

  const handleSortChange = (sortBy: ProductFilterParams['sortBy']) => {
    setFilters((prev) => ({
      ...prev,
      sortBy,
      sortOrder: prev.sortBy === sortBy && prev.sortOrder === 'asc' ? 'desc' : 'asc',
      page: 1,
    }));
  };

  // Auth Loading State
  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-slate-100 dark:bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="text-center space-y-4 animate-in fade-in">
          <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center text-white mx-auto shadow-lg animate-pulse">
            <HeartPulse className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              {settings?.pharmacyName || 'Al-Amaan Medicine Store'}
            </h2>
            <p className="text-xs text-slate-400">Loading authorized session...</p>
          </div>
          <Loader2 className="w-5 h-5 text-blue-600 animate-spin mx-auto" />
        </div>
      </div>
    );
  }

  // Not Authenticated: Render Authentication & Registration Portal
  if (!isAuthenticated || !user || user.status !== 'ACTIVE') {
    return (
      <AuthContainer
        pharmacyName={settings?.pharmacyName || 'Al-Amaan Medicine Store'}
        pharmacyLogo={settings?.logo}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 flex flex-col md:flex-row text-slate-900 dark:text-slate-100 antialiased font-sans transition-colors">
      {/* Network Alert Banner */}
      {!isOnline && (
        <div 
          role="alert" 
          aria-live="assertive"
          className="bg-amber-600 dark:bg-amber-700 text-white text-xs py-1.5 px-4 text-center font-medium flex items-center justify-center gap-2 fixed top-0 left-0 right-0 z-50 shadow-md"
        >
          <WifiOff className="w-3.5 h-3.5" />
          <span>You are offline. Live API actions are unavailable until the connection returns.</span>
        </div>
      )}

      {/* Main Persistent Sidebar */}
      <Sidebar
        currentRole={currentRole}
        activeNav={activeNav}
        onNavChange={(nav) => {
          setActiveNav(nav);
          if (nav === 'products') setViewMode('list');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        isMobileOpen={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
        pharmacyName={settings?.pharmacyName}
        pharmacyLogo={settings?.logo}
      />

      {/* Content Area Wrapper */}
      <div className={`flex-1 flex flex-col min-w-0 pb-16 md:pb-0 ${!isOnline ? 'pt-7' : ''}`}>
        {/* Header Bar */}
        <Header
          activeNav={activeNav}
          onNavChange={(nav) => {
            setActiveNav(nav);
            if (nav === 'products') setViewMode('list');
          }}
          pharmacyName={settings?.pharmacyName}
          pharmacyLogo={settings?.logo}
          currentRole={currentRole}
          searchQuery={filters.search || ''}
          onSearchChange={(search) => setFilters((prev) => ({ ...prev, search, page: 1 }))}
          onOpenAddProduct={handleOpenAddProduct}
          onOpenBarcodeScanner={() => setIsBarcodeScannerOpen(true)}
          onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
          onOpenShortcuts={() => setIsShortcutsModalOpen(true)}
          isOnline={isOnline}
          onOpenLowStockAlerts={() => setIsLowStockModalOpen(true)}
          lowStockCount={totalLowStockAlerts}
        />

        {/* Main Content Area */}
        <div className="flex-1 p-3 sm:p-5 lg:p-6 max-w-7xl w-full mx-auto">
          <main id="main-content" role="main" tabIndex={-1} className="focus:outline-none">
            {activeNav === 'dashboard' ? (
              <DashboardModule
                role={currentRole}
                onNavigate={(nav) => {
                  setActiveNav(nav);
                  if (nav === 'products') setViewMode('list');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              />
            ) : activeNav === 'inventory' ? (
              <InventoryModule
                currentRole={currentRole}
                onOpenLowStockAlerts={() => setIsLowStockModalOpen(true)}
                onNavigateToProduct={(productId) => {
                  const p = products.find((prod) => prod.id === productId);
                  if (p) {
                    setSelectedProduct(p);
                    setViewMode('details');
                    setActiveNav('products');
                  }
                }}
              />
            ) : activeNav === 'customers' ? (
              <CustomerModule currentRole={currentRole} />
            ) : activeNav === 'sales' ? (
              <SalesModule
                role={currentRole}
                settings={settings}
                onNavigateToCustomer={(customerId) => {
                  setActiveNav('customers');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              />
            ) : activeNav === 'stock-purchase' ? (
              currentRole === 'admin' ? (
                <PurchasesModule
                  role={currentRole}
                  onNavigateToInventory={() => {
                    setActiveNav('inventory');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                />
              ) : (
                <AccessDeniedCard
                  title="Stock Procurement Restricted"
                  message="Cashiers are not permitted to manage wholesale purchase orders or supplier costs. Please return to Point of Sale or Product Catalog."
                  onReturn={() => setActiveNav('sales')}
                />
              )
            ) : activeNav === 'accountability' ? (
              currentRole === 'admin' ? (
                <AccountabilityModule
                  role={currentRole}
                  onNavigateToSource={(type, referenceId) => {
                    if (type === 'SALE') {
                      setActiveNav('sales');
                    } else if (type === 'DEBT_PAYMENT') {
                      setActiveNav('customers');
                    } else if (type === 'STOCK_PURCHASE') {
                      setActiveNav('stock-purchase');
                    }
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                />
              ) : (
                <AccessDeniedCard
                  title="Accountability & Shift Logs Restricted"
                  message="Cashiers do not have access to full ledger audits or reconciliation logs. Please return to Point of Sale."
                  onReturn={() => setActiveNav('sales')}
                />
              )
            ) : activeNav === 'users' ? (
              currentRole === 'admin' ? (
                <UserManagementModule
                  role={currentRole}
                  onNavigateToProducts={() => {
                    setActiveNav('products');
                    setViewMode('list');
                  }}
                />
              ) : (
                <AccessDeniedCard
                  title="Staff Management Restricted"
                  message="Cashiers are not permitted to manage user accounts, permissions, or approvals."
                  onReturn={() => setActiveNav('sales')}
                />
              )
            ) : activeNav === 'reports' ? (
              currentRole === 'admin' ? (
                <ReportsModule
                  role={currentRole}
                  categories={categories}
                  companies={companies}
                  products={products}
                />
              ) : (
                <AccessDeniedCard
                  title="Reports & Analytics Restricted"
                  message="Financial and valuation reports are restricted to Administrators."
                  onReturn={() => setActiveNav('sales')}
                />
              )
            ) : activeNav === 'settings' ? (
              currentRole === 'admin' ? (
                <SettingsModule
                  role={currentRole}
                  onSettingsUpdated={() => {
                    void refetchSettings(true);
                  }}
                />
              ) : (
                <AccessDeniedCard
                  title="System Settings Restricted"
                  message="System configurations and pharmacy profile settings are restricted to Administrators."
                  onReturn={() => setActiveNav('sales')}
                />
              )
            ) : activeNav !== 'products' ? (
              <ModulePlaceholder
                moduleName={activeNav}
                onGoToProducts={() => {
                  setActiveNav('products');
                  setViewMode('list');
                }}
              />
            ) : viewMode === 'wizard' ? (
              <ProductWizard
                initialProduct={productToEdit}
                categories={categories}
                companies={companies}
                onSave={handleSaveProductWizard}
                onCancel={() => {
                  if (selectedProduct && productToEdit) {
                    setViewMode('details');
                  } else {
                    setViewMode('list');
                  }
                }}
              />
            ) : viewMode === 'details' && selectedProduct ? (
              <ProductDetailsView
                product={selectedProduct}
                currentRole={currentRole}
                onBack={() => setViewMode('list')}
                onEdit={() => handleOpenEditProduct(selectedProduct)}
                onToggleStatus={(id) => {
                  if (selectedProduct.status === 'Active') {
                    handleRequestDeactivation(selectedProduct);
                  } else {
                    handleActivateProduct(selectedProduct);
                  }
                }}
                onAddVariant={handleAddVariant}
                onUpdateVariant={handleUpdateVariant}
                onDeleteVariant={handleDeleteVariant}
                onUpdateImage={handleUpdateProductImage}
                onNavigateToPurchases={() => {
                  setActiveNav('stock-purchase');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              />
            ) : (
              /* Primary Products Module List View */
              <div className="space-y-4 animate-in fade-in duration-150">
                {/* Metric Summary Cards */}
                <MetricCards stats={stats} currentRole={currentRole} />

                {/* Filter and Search Bar */}
                <ProductFilters
                  filters={filters}
                  onFilterChange={(updates) => setFilters((prev) => ({ ...prev, ...updates }))}
                  categories={categories}
                  companies={companies}
                  currentRole={currentRole}
                  isSearching={isSearching}
                  onOpenExportAudit={() => setIsStockAuditModalOpen(true)}
                  onDownloadCsvTemplate={() => {
                    downloadProductCsvTemplate('alamaan_product_bulk_import_template');
                    addToast({
                      type: 'success',
                      title: 'CSV Template Downloaded',
                      message: 'Bulk import template downloaded with all required fields (Name, Generic, Category, Dosage, Form, Company, Pricing & Stock).',
                    });
                  }}
                />

                {/* Desktop Data Table */}
                <div className="hidden md:block">
                  <ProductListTable
                    products={products}
                    currentRole={currentRole}
                    totalProductsCount={total}
                    currentPage={currentPage}
                    totalPages={totalPages}
                    limit={filters.limit}
                    sortBy={filters.sortBy}
                    sortOrder={filters.sortOrder}
                    isLoading={isProductsLoading}
                    onSortChange={handleSortChange}
                    onPageChange={(page) => setFilters((prev) => ({ ...prev, page }))}
                    onLimitChange={(limit) => setFilters((prev) => ({ ...prev, limit, page: 1 }))}
                    onViewProduct={handleViewProduct}
                    onEditProduct={handleOpenEditProduct}
                    onDeactivateRequest={handleRequestDeactivation}
                    onActivateProduct={handleActivateProduct}
                    onAddVariantQuick={(prod) => {
                      setSelectedProduct(prod);
                      setViewMode('details');
                    }}
                    onOpenExportAudit={() => setIsStockAuditModalOpen(true)}
                    onDownloadCsvTemplate={() => {
                      downloadProductCsvTemplate('alamaan_product_bulk_import_template');
                      addToast({
                        type: 'success',
                        title: 'CSV Template Downloaded',
                        message: 'Ready for bulk product import with all required fields (Name, Generic, Category, Dosage, Form, Company, Pricing & Stock).',
                      });
                    }}
                  />
                </div>

                {/* Mobile Cards View */}
                <div className="md:hidden">
                  <ProductListMobile
                    products={products}
                    currentRole={currentRole}
                    isLoading={isProductsLoading}
                    onViewProduct={handleViewProduct}
                    onEditProduct={handleOpenEditProduct}
                    onDeactivateRequest={handleRequestDeactivation}
                    onActivateProduct={handleActivateProduct}
                    onAddVariantQuick={(prod) => {
                      setSelectedProduct(prod);
                      setViewMode('details');
                    }}
                  />

                  {/* Mobile Simple Pagination */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300">
                      <button
                        onClick={() => setFilters((prev) => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                        disabled={currentPage <= 1}
                        className="px-3 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 disabled:opacity-40"
                      >
                        Previous
                      </button>
                      <span>
                        Page {currentPage} of {totalPages}
                      </span>
                      <button
                        onClick={() => setFilters((prev) => ({ ...prev, page: Math.min(totalPages, prev.page + 1) }))}
                        disabled={currentPage >= totalPages}
                        className="px-3 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 disabled:opacity-40"
                      >
                        Next
                      </button>
                    </div>
                  )}
                </div>

                {/* Live API connection and client-cache controls */}
                <div className="flex items-center justify-between pt-4 text-xs text-slate-400 dark:text-slate-500 border-t border-slate-200 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full inline-block ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}></span>
                    <span>{isOnline ? 'Browser online — Django API configured' : 'Browser offline'}</span>
                    {isStale && <span className="text-blue-500 font-mono">(Syncing...)</span>}
                  </div>
                  <button
                    onClick={() => setIsNetworkConfigOpen(true)}
                    className="flex items-center gap-1.5 text-slate-500 hover:text-slate-900 dark:hover:text-white font-medium px-2 py-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    <Activity className="w-3.5 h-3.5 text-blue-600" />
                    <span>Connection & Cache</span>
                  </button>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>

      {/* Deactivation Confirmation Modal */}
      <ConfirmDeactivationModal
        isOpen={!!productToDeactivate}
        product={productToDeactivate}
        isLoading={isDeactivating}
        onClose={() => setProductToDeactivate(null)}
        onConfirm={handleConfirmDeactivation}
      />

      {/* Mobile Bottom Navigation */}
      <BottomNav
        activeNav={activeNav}
        onNavChange={(nav) => {
          setActiveNav(nav);
          if (nav === 'products') setViewMode('list');
        }}
        onOpenMoreMenu={() => setIsMobileMenuOpen(true)}
      />

      {/* Barcode Scanner Modal */}
      <BarcodeScannerModal
        isOpen={isBarcodeScannerOpen}
        currentRole={currentRole}
        onClose={() => setIsBarcodeScannerOpen(false)}
        onSelectProduct={(product) => {
          setSelectedProduct(product);
          setViewMode('details');
        }}
      />

      {/* Live API and client-cache information */}
      <NetworkConfigModal
        isOpen={isNetworkConfigOpen}
        isOnline={isOnline}
        browserOnline={browserOnline}
        onClose={() => setIsNetworkConfigOpen(false)}
        onRefresh={() => {
          refetchProducts(true);
          refetchKPIs();
        }}
      />

      {/* Keyboard Shortcuts Cheatsheet Modal */}
      <KeyboardShortcutsModal
        isOpen={isShortcutsModalOpen}
        onClose={() => setIsShortcutsModalOpen(false)}
      />

      {/* Low Stock & Reorder Alert Center Modal */}
      <LowStockAlertModal
        isOpen={isLowStockModalOpen}
        onClose={() => {
          setIsLowStockModalOpen(false);
          refetchInventoryKPIs();
          refetchProducts(true);
          refetchKPIs();
        }}
        currentRole={currentRole}
        onNavigateToProduct={(productId) => {
          const p = products.find((prod) => prod.id === productId);
          if (p) {
            setSelectedProduct(p);
            setViewMode('details');
            setActiveNav('products');
          }
        }}
        onNavigateToInventory={(filter) => {
          setActiveNav('inventory');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onNavigateToPurchases={(productId) => {
          setActiveNav('stock-purchase');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      />

      {/* Product Stock Audit & Worksheet Export Modal */}
      <ProductStockAuditModal
        isOpen={isStockAuditModalOpen}
        onClose={() => setIsStockAuditModalOpen(false)}
        currentPageProducts={products}
        currentFilters={filters}
        totalFilteredCount={total}
        currentRole={currentRole}
      />

      {/* Toast Feedback Messages */}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainPharmacyApp />
    </AuthProvider>
  );
}
