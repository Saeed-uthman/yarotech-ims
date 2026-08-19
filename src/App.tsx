import React, { useState, useEffect, useCallback } from 'react';
import { 
  UserRole, 
  Product, 
  ProductCreateInput, 
  ProductFilterParams,
  CompanyVariant
} from './types';
import { 
  useProducts, 
  useKPIStats, 
  useReferenceData, 
  useProductMutations, 
  useSmartPolling, 
  useNetworkStatus 
} from './hooks';
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
import { ToastContainer, ToastMessage } from './components/common/Toast';
import { ModulePlaceholder } from './components/common/ModulePlaceholder';
import { InventoryModule } from './components/inventory/InventoryModule';
import { CustomerModule } from './components/customers';
import { SalesModule } from './components/sales';
import { PurchasesModule } from './components/purchases';
import { AccountabilityModule } from './components/accountability';
import { ReportsModule } from './components/reports';
import { WifiOff, Activity, RefreshCw } from 'lucide-react';
import { productService } from './services/productService';

export default function App() {
  // User Role (Administrator vs Cashier)
  const [currentRole, setCurrentRole] = useState<UserRole>('admin');

  // Navigation & View Mode
  const [activeNav, setActiveNav] = useState<string>('products');
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
  const { isOnline } = useNetworkStatus();

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
  const { categories, companies } = useReferenceData();
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
    },
  });

  // Deactivation Modal State
  const [productToDeactivate, setProductToDeactivate] = useState<Product | null>(null);
  const [isDeactivating, setIsDeactivating] = useState(false);

  // Modals & UI Controls
  const [isBarcodeScannerOpen, setIsBarcodeScannerOpen] = useState(false);
  const [isNetworkConfigOpen, setIsNetworkConfigOpen] = useState(false);
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
      const refreshed = products.find((p) => p.id === selectedProduct.id);
      if (refreshed) {
        setSelectedProduct(refreshed);
      }
    }
  }, [products]);

  // Handle product fetch error toast
  useEffect(() => {
    if (productsError) {
      addToast('error', 'Network Notice', productsError);
    }
  }, [productsError, addToast]);

  // Product Navigation & CRUD Handlers
  const handleViewProduct = (product: Product) => {
    setSelectedProduct(product);
    setViewMode('details');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenAddProduct = () => {
    if (currentRole !== 'admin') {
      addToast('error', 'Restricted Action', 'Cashiers cannot create products. Switch to Admin role.');
      return;
    }
    setProductToEdit(null);
    setViewMode('wizard');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenEditProduct = (product: Product) => {
    if (currentRole !== 'admin') {
      addToast('error', 'Restricted Action', 'Cashiers cannot edit products. Switch to Admin role.');
      return;
    }
    setProductToEdit(product);
    setViewMode('wizard');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSaveProductWizard = async (input: ProductCreateInput) => {
    try {
      if (productToEdit) {
        const updated = await updateProduct(productToEdit.id, input, currentRole);
        addToast('success', 'Product Updated', `${updated.name} has been successfully updated.`);
        setSelectedProduct(updated);
        setViewMode('details');
      } else {
        const created = await createProduct(input, currentRole);
        addToast('success', 'Product Created', `${created.name} added with ${created.variants.length} manufacturer variant(s).`);
        setSelectedProduct(created);
        setViewMode('details');
      }
      refetchProducts(true);
      refetchKPIs();
    } catch (err: any) {
      addToast('error', 'Error Saving Product', err.message || 'An unexpected error occurred.');
    }
  };

  const handleRequestDeactivation = (product: Product) => {
    if (currentRole !== 'admin') {
      addToast('error', 'Restricted Action', 'Cashiers cannot deactivate products.');
      return;
    }
    setProductToDeactivate(product);
  };

  const handleConfirmDeactivation = async () => {
    if (!productToDeactivate) return;
    setIsDeactivating(true);

    try {
      // Optimistic deactivation with automatic rollback
      await deactivateProduct(productToDeactivate, currentRole, {
        onOptimistic: () => {
          updateOptimisticStatus(productToDeactivate.id, 'Inactive');
          if (selectedProduct?.id === productToDeactivate.id) {
            setSelectedProduct((prev) => prev ? { ...prev, status: 'Inactive' } : null);
          }
        },
        onRollback: (previousStatus) => {
          rollbackOptimisticStatus(productToDeactivate.id, previousStatus);
          if (selectedProduct?.id === productToDeactivate.id) {
            setSelectedProduct((prev) => prev ? { ...prev, status: previousStatus } : null);
          }
        },
      });

      addToast(
        'info',
        'Product Deactivated',
        `${productToDeactivate.name} is now inactive. Historical data is preserved.`
      );
      setProductToDeactivate(null);
      refetchProducts(true);
      refetchKPIs();
    } catch (err: any) {
      addToast('error', 'Deactivation Failed', `${err.message} — Restored previous state.`);
    } finally {
      setIsDeactivating(false);
    }
  };

  const handleActivateProduct = async (product: Product) => {
    if (currentRole !== 'admin') {
      addToast('error', 'Restricted Action', 'Cashiers cannot activate products.');
      return;
    }

    try {
      // Optimistic activation with automatic rollback
      await activateProduct(product, currentRole, {
        onOptimistic: () => {
          updateOptimisticStatus(product.id, 'Active');
          if (selectedProduct?.id === product.id) {
            setSelectedProduct((prev) => prev ? { ...prev, status: 'Active' } : null);
          }
        },
        onRollback: (previousStatus) => {
          rollbackOptimisticStatus(product.id, previousStatus);
          if (selectedProduct?.id === product.id) {
            setSelectedProduct((prev) => prev ? { ...prev, status: previousStatus } : null);
          }
        },
      });

      addToast('success', 'Product Activated', `${product.name} is now available for sales.`);
      refetchProducts(true);
      refetchKPIs();
    } catch (err: any) {
      addToast('error', 'Activation Failed', `${err.message} — Restored previous state.`);
    }
  };

  // Authoritative financial variant handlers
  const handleAddVariant = async (productId: string, variantInput: any) => {
    try {
      const updated = await addVariant(productId, variantInput, currentRole);
      addToast('success', 'Variant Added', `Added ${variantInput.companyName} variant to ${updated.name}.`);
      setSelectedProduct(updated);
      refetchProducts(true);
      refetchKPIs();
    } catch (err: any) {
      addToast('error', 'Failed to Add Variant', err.message);
    }
  };

  const handleUpdateVariant = async (
    productId: string,
    variantId: string,
    updates: Partial<CompanyVariant>
  ) => {
    try {
      const updated = await updateVariant(productId, variantId, updates, currentRole);
      addToast('success', 'Variant Updated', 'Manufacturer pricing and stock have been updated.');
      setSelectedProduct(updated);
      refetchProducts(true);
      refetchKPIs();
    } catch (err: any) {
      addToast('error', 'Failed to Update Variant', err.message);
    }
  };

  const handleDeleteVariant = async (productId: string, variantId: string) => {
    try {
      const updated = await deleteVariant(productId, variantId, currentRole);
      addToast('info', 'Variant Removed', 'Manufacturer variant has been removed.');
      setSelectedProduct(updated);
      refetchProducts(true);
      refetchKPIs();
    } catch (err: any) {
      addToast('error', 'Failed to Delete Variant', err.message);
    }
  };

  const handleUpdateProductImage = async (productId: string, newImageUrl: string) => {
    try {
      const updated = await updateProduct(productId, { image: newImageUrl }, currentRole);
      addToast('success', 'Image Updated', 'Product image updated across all company variants.');
      setSelectedProduct(updated);
      refetchProducts(true);
    } catch (err: any) {
      addToast('error', 'Image Update Failed', err.message);
    }
  };

  const handleResetData = () => {
    if (window.confirm('Reset all products and company variants back to initial factory demo state?')) {
      productService.resetToDefaults();
      setViewMode('list');
      setSelectedProduct(null);
      setProductToEdit(null);
      refetchProducts(true);
      refetchKPIs();
      addToast('info', 'Data Reset', 'Products catalogue restored to initial demo specifications.');
    }
  };

  const handleSortChange = (field: 'name' | 'stock' | 'price' | 'date') => {
    setFilters((prev) => {
      if (prev.sortBy === field) {
        return { ...prev, sortOrder: prev.sortOrder === 'asc' ? 'desc' : 'asc', page: 1 };
      }
      return { ...prev, sortBy: field, sortOrder: 'asc', page: 1 };
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col antialiased">
      {/* Offline Alert Banner */}
      {!isOnline && (
        <div className="bg-amber-500 text-slate-950 font-semibold px-4 py-2 text-xs flex items-center justify-center gap-2 sticky top-0 z-50 shadow-sm">
          <WifiOff className="w-4 h-4" />
          <span>You are currently offline. Operating from local cache. Mutations will sync when reconnected.</span>
        </div>
      )}

      <div className="flex flex-1 min-h-screen">
        {/* Desktop Sidebar & Mobile Drawer */}
        <Sidebar
          currentRole={currentRole}
          onRoleChange={(role) => {
            setCurrentRole(role);
            addToast(
              'info',
              `Switched to ${role === 'admin' ? 'Administrator' : 'Cashier'} Mode`,
              role === 'cashier' 
                ? 'Base costs, inventory values, and admin controls are now hidden.' 
                : 'Full access to costs, margins, and product management enabled.'
            );
          }}
          activeNav={activeNav}
          onNavChange={(nav) => {
            setActiveNav(nav);
            if (nav === 'products') {
              setViewMode('list');
            }
          }}
          isMobileOpen={isMobileMenuOpen}
          onCloseMobile={() => setIsMobileMenuOpen(false)}
        />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <Header
            currentRole={currentRole}
            searchQuery={filters.search}
            onSearchChange={(q) => setFilters((prev) => ({ ...prev, search: q, page: 1 }))}
            onOpenAddProduct={handleOpenAddProduct}
            onOpenBarcodeScanner={() => setIsBarcodeScannerOpen(true)}
            onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
            onResetData={handleResetData}
          />

          {/* Subheader / Role banner if in cashier view */}
          {currentRole === 'cashier' && (
            <div className="bg-emerald-50 border-b border-emerald-200 px-4 sm:px-8 py-2 text-xs text-emerald-800 flex items-center justify-between">
              <span>
                💡 <strong>Cashier Sales View Active:</strong> Showing retail prices and available stock. Wholesale base prices, margin calculations, and inventory values are securely protected.
              </span>
              <button
                onClick={() => setCurrentRole('admin')}
                className="font-bold underline text-emerald-900 hover:text-emerald-700 ml-2"
              >
                Switch to Admin
              </button>
            </div>
          )}

          {/* Page Body */}
          <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto pb-20 md:pb-8">
            {activeNav === 'inventory' ? (
              <InventoryModule
                currentRole={currentRole}
                onNavigateToProduct={async (productId) => {
                  try {
                    const res = await productService.getProductById(productId, currentRole);
                    if (res.data) {
                      setSelectedProduct(res.data);
                      setActiveNav('products');
                      setViewMode('details');
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }
                  } catch {
                    setActiveNav('products');
                    setViewMode('list');
                  }
                }}
              />
            ) : activeNav === 'customers' ? (
              <CustomerModule currentRole={currentRole} />
            ) : activeNav === 'sales' ? (
              <SalesModule
                role={currentRole}
                onNavigateToCustomer={(customerId) => {
                  setActiveNav('customers');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              />
            ) : activeNav === 'stock-purchase' ? (
              <PurchasesModule
                role={currentRole}
                onNavigateToInventory={() => {
                  setActiveNav('inventory');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              />
            ) : activeNav === 'accountability' ? (
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
            ) : activeNav === 'reports' ? (
              <ReportsModule
                role={currentRole}
                categories={categories}
                companies={companies}
                products={products}
              />
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
                    <div className="flex items-center justify-between bg-white p-3 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700">
                      <button
                        onClick={() => setFilters((prev) => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                        disabled={currentPage <= 1}
                        className="px-3 py-1.5 rounded-md border border-slate-200 disabled:opacity-40"
                      >
                        Previous
                      </button>
                      <span>
                        Page {currentPage} of {totalPages}
                      </span>
                      <button
                        onClick={() => setFilters((prev) => ({ ...prev, page: Math.min(totalPages, prev.page + 1) }))}
                        disabled={currentPage >= totalPages}
                        className="px-3 py-1.5 rounded-md border border-slate-200 disabled:opacity-40"
                      >
                        Next
                      </button>
                    </div>
                  )}
                </div>

                {/* Network & Simulation Floating Trigger */}
                <div className="flex items-center justify-between pt-4 text-xs text-slate-400 border-t border-slate-200">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
                    <span>REST Service Mock Layer Active</span>
                    {isStale && <span className="text-blue-500 font-mono">(Syncing...)</span>}
                  </div>
                  <button
                    onClick={() => setIsNetworkConfigOpen(true)}
                    className="flex items-center gap-1.5 text-slate-500 hover:text-slate-900 font-medium px-2 py-1 rounded hover:bg-slate-100 transition-colors"
                  >
                    <Activity className="w-3.5 h-3.5 text-blue-600" />
                    <span>Network & Latency Settings</span>
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
        onClose={() => setIsBarcodeScannerOpen(false)}
        onSelectProduct={(product) => {
          setSelectedProduct(product);
          setViewMode('details');
        }}
      />

      {/* Network & Test Latency Config Modal */}
      <NetworkConfigModal
        isOpen={isNetworkConfigOpen}
        onClose={() => setIsNetworkConfigOpen(false)}
        onRefresh={() => {
          refetchProducts(true);
          refetchKPIs();
        }}
      />

      {/* Toast Feedback Messages */}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </div>
  );
}
