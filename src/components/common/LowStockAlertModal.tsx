import React, { useState, useMemo, useEffect } from 'react';
import { 
  AlertTriangle, 
  XCircle, 
  X, 
  Search, 
  Filter, 
  Download, 
  Boxes, 
  ArrowRight, 
  ExternalLink, 
  Sliders, 
  Building2, 
  RefreshCw, 
  ShoppingCart,
  CheckCircle2,
  TrendingDown,
  Info
} from 'lucide-react';
import { InventoryItem, UserRole } from '../../types';
import { inventoryService } from '../../services';
import { formatCompactNaira, formatNaira, formatNumber } from '../../utils/formatters';
import { exportTableToPDF } from '../../utils/pdfExport';

interface LowStockAlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentRole: UserRole;
  onNavigateToProduct?: (productId: string) => void;
  onNavigateToInventory?: (filter?: string) => void;
  onNavigateToPurchases?: (productId?: string) => void;
  onOpenStockAdjustment?: (item: InventoryItem) => void;
}

export const LowStockAlertModal: React.FC<LowStockAlertModalProps> = ({
  isOpen,
  onClose,
  currentRole,
  onNavigateToProduct,
  onNavigateToInventory,
  onNavigateToPurchases,
  onOpenStockAdjustment,
}) => {
  const isAdmin = currentRole === 'admin';

  const [items, setItems] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters within modal
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'out_of_stock' | 'low_stock'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [isExporting, setIsExporting] = useState<boolean>(false);

  // Fetch all inventory items and filter for stock alerts
  const loadAlertItems = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Fetch up to 100 items with low_stock and out_of_stock
      const res = await inventoryService.getInventory(
        { page: 1, limit: 100, sortBy: 'stock', sortOrder: 'asc' },
        currentRole
      );

      // Filter only items that are Low Stock or Out of Stock
      const alertItems = (res.data || []).filter(
        (item) => item.stockStatus === 'Low Stock' || item.stockStatus === 'Out of Stock' || item.currentStock <= item.reorderLevel
      );
      setItems(alertItems);
    } catch (err: any) {
      setError(err?.message || 'Failed to load stock alerts.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadAlertItems();
      // Handle ESC key
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose();
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen]);

  // Categories list derived from alert items
  const categories = useMemo(() => {
    const set = new Set<string>();
    items.forEach((i) => {
      if (i.category) set.add(i.category);
    });
    return ['All', ...Array.from(set)];
  }, [items]);

  // Counts
  const outOfStockItems = useMemo(() => items.filter((i) => i.currentStock === 0), [items]);
  const lowStockItems = useMemo(() => items.filter((i) => i.currentStock > 0 && i.currentStock <= i.reorderLevel), [items]);

  // Filtered items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // Tab filter
      if (activeTab === 'out_of_stock' && item.currentStock !== 0) return false;
      if (activeTab === 'low_stock' && (item.currentStock === 0 || item.currentStock > item.reorderLevel)) return false;

      // Category filter
      if (selectedCategory !== 'All' && item.category !== selectedCategory) return false;

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = item.productName.toLowerCase().includes(q);
        const matchesGeneric = item.genericName.toLowerCase().includes(q);
        const matchesCompany = item.companyName.toLowerCase().includes(q);
        const matchesBarcode = item.barcode?.toLowerCase().includes(q);
        if (!matchesName && !matchesGeneric && !matchesCompany && !matchesBarcode) {
          return false;
        }
      }

      return true;
    });
  }, [items, activeTab, selectedCategory, searchQuery]);

  // PDF Export
  const handleExportPDF = () => {
    setIsExporting(true);
    try {
      const headers = [
        'Product Name',
        'Model / Specification',
        'Brand / Supplier',
        'Category',
        'Stock',
        'Reorder',
        'Status',
        'Shortfall (To Reorder)',
        ...(isAdmin ? ['Unit Cost (₦)'] : []),
        'Price (₦)',
        'Barcode',
      ];

      const rows = filteredItems.map((item) => {
        const shortfall = Math.max(0, item.reorderLevel * 2 - item.currentStock);
        return [
          item.productName,
          item.genericName,
          item.companyName,
          item.category,
          item.currentStock,
          item.reorderLevel,
          item.stockStatus,
          shortfall,
          ...(isAdmin ? [item.basePrice.toLocaleString()] : []),
          item.sellingPrice.toLocaleString(),
          item.barcode,
        ];
      });

      exportTableToPDF('yarotech_low_stock_requisition', headers, rows, {
        title: 'Emergency Stock Requisition & Low Stock Alert List',
        subtitle: `Total Depleted/Low Items: ${filteredItems.length} | Category: ${selectedCategory}`,
        orientation: 'landscape',
        includeSignatures: true,
        footerNote: 'Confidential - Yarotech Group Requisition Sheet',
      });
    } finally {
      setIsExporting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      id="low-stock-alert-modal-overlay"
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 md:p-6 animate-in fade-in duration-200"
    >
      <div 
        id="low-stock-alert-modal-container"
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden text-slate-900 dark:text-slate-100"
      >
        {/* ======================================================== */}
        {/* MODAL HEADER */}
        {/* ======================================================== */}
        <div className="p-4 sm:p-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                  Low Stock & Reorder Alert Center
                </h2>
                <span className="px-2 py-0.5 text-xs font-bold bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300 rounded-full">
                  {items.length} Attention Required
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Real-time stock monitoring: products at or below minimum buffer levels
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadAlertItems}
              disabled={isLoading}
              className="p-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 rounded-lg hover:bg-slate-200/60 dark:hover:bg-slate-700 transition-colors"
              title="Refresh Alert List"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <button
              id="close-low-stock-modal-btn"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-200/60 dark:hover:bg-slate-700 transition-colors"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ======================================================== */}
        {/* STATS OVERVIEW CARDS */}
        {/* ======================================================== */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 sm:p-6 bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800">
          {/* Total Alerts */}
          <div 
            onClick={() => setActiveTab('all')}
            className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
              activeTab === 'all'
                ? 'bg-amber-500/10 border-amber-500/50 ring-2 ring-amber-500/20'
                : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Total Stock Alerts
              </span>
              <Boxes className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-2xl font-black font-mono mt-1 text-slate-900 dark:text-white">
              {items.length}
            </div>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              Needs procurement or count adjustment
            </span>
          </div>

          {/* Out of Stock (Critical) */}
          <div 
            onClick={() => setActiveTab('out_of_stock')}
            className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
              activeTab === 'out_of_stock'
                ? 'bg-rose-500/10 border-rose-500/50 ring-2 ring-rose-500/20'
                : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 hover:border-rose-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
                Critical Out of Stock
              </span>
              <XCircle className="w-4 h-4 text-rose-500" />
            </div>
            <div className="text-2xl font-black font-mono mt-1 text-rose-600 dark:text-rose-400">
              {outOfStockItems.length}
            </div>
            <span className="text-[11px] text-rose-600/80 dark:text-rose-400/80">
              0 units on shelf • Sales fulfillment at risk
            </span>
          </div>

          {/* Low Stock (Warning) */}
          <div 
            onClick={() => setActiveTab('low_stock')}
            className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
              activeTab === 'low_stock'
                ? 'bg-amber-500/10 border-amber-500/50 ring-2 ring-amber-500/20'
                : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 hover:border-amber-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                Low Stock Warnings
              </span>
              <AlertTriangle className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-2xl font-black font-mono mt-1 text-amber-600 dark:text-amber-400">
              {lowStockItems.length}
            </div>
            <span className="text-[11px] text-amber-600/80 dark:text-amber-400/80">
              At or below minimum reorder level
            </span>
          </div>
        </div>

        {/* ======================================================== */}
        {/* CONTROLS BAR: SEARCH, CATEGORY, ACTIONS */}
        {/* ======================================================== */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex flex-1 items-center gap-2">
            {/* Search Input */}
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search product, brand, supplier, barcode..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Category Filter */}
            <div className="shrink-0">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="py-1.5 px-3 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat === 'All' ? 'All Categories' : cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            {/* Export PDF */}
            <button
              onClick={handleExportPDF}
              disabled={filteredItems.length === 0 || isExporting}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-xs font-semibold rounded-lg transition-colors disabled:opacity-50"
              title="Export low stock items to PDF"
            >
              <Download className="w-3.5 h-3.5 text-rose-600" />
              <span>Export Requisition (PDF)</span>
            </button>

            {/* View Full Inventory */}
            {onNavigateToInventory && (
              <button
                onClick={() => {
                  onNavigateToInventory('low_stock');
                  onClose();
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg shadow-xs transition-colors"
              >
                <span>Full Inventory</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* ======================================================== */}
        {/* ALERTS LIST / TABLE */}
        {/* ======================================================== */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3">
          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-3">
              <RefreshCw className="w-8 h-8 animate-spin text-amber-500" />
              <p className="text-sm font-medium">Scanning inventory for low stock items...</p>
            </div>
          ) : error ? (
            <div className="py-12 text-center text-rose-600">
              <AlertTriangle className="w-8 h-8 mx-auto mb-2" />
              <p className="text-sm font-bold">{error}</p>
              <button
                onClick={loadAlertItems}
                className="mt-3 px-4 py-1.5 bg-rose-100 hover:bg-rose-200 text-rose-800 rounded-lg text-xs font-bold transition-colors"
              >
                Retry
              </button>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              <CheckCircle2 className="w-12 h-12 mx-auto text-emerald-500 mb-3" />
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
                {items.length === 0 ? 'All Stock Levels are Healthy' : 'No items match your active filters'}
              </h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                {items.length === 0
                  ? 'There are currently no products at or below their configured minimum reorder threshold.'
                  : 'Try changing your search keywords or switching category filters.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {filteredItems.map((item) => {
                const isOutOfStock = item.currentStock === 0;
                const shortfall = Math.max(0, item.reorderLevel * 2 - item.currentStock);
                const stockPct = item.reorderLevel > 0 
                  ? Math.min(100, Math.round((item.currentStock / item.reorderLevel) * 100)) 
                  : 0;

                return (
                  <div
                    key={item.id}
                    className={`p-4 rounded-xl border transition-all ${
                      isOutOfStock
                        ? 'bg-rose-50/40 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/60 hover:border-rose-300'
                        : 'bg-white dark:bg-slate-800/90 border-amber-200 dark:border-amber-900/50 hover:border-amber-300 shadow-2xs'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      {/* Left: Medicine details */}
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold ${
                              isOutOfStock
                                ? 'bg-rose-600 text-white'
                                : 'bg-amber-100 text-amber-900 dark:bg-amber-900/60 dark:text-amber-200 border border-amber-300 dark:border-amber-700'
                            }`}
                          >
                            {isOutOfStock ? (
                              <>
                                <XCircle className="w-3 h-3" />
                                <span>OUT OF STOCK</span>
                              </>
                            ) : (
                              <>
                                <AlertTriangle className="w-3 h-3 text-amber-700 dark:text-amber-300" />
                                <span>LOW STOCK ({stockPct}% of buffer)</span>
                              </>
                            )}
                          </span>

                          <span className="text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium">
                            {item.category}
                          </span>

                          <span className="text-xs font-mono text-slate-400">
                            #{item.barcode}
                          </span>
                        </div>

                        <div className="pt-0.5">
                          <h4 
                            onClick={() => {
                              if (onNavigateToProduct) {
                                onNavigateToProduct(item.productId);
                                onClose();
                              }
                            }}
                            className="text-base font-bold text-slate-900 dark:text-white hover:text-amber-600 dark:hover:text-amber-400 cursor-pointer inline-flex items-center gap-1.5"
                          >
                            <span>{item.productName}</span>
                            <ExternalLink className="w-3.5 h-3.5 opacity-60" />
                          </h4>
                          <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2 flex-wrap mt-0.5">
                            <span>Generic: <strong className="text-slate-700 dark:text-slate-200">{item.genericName}</strong></span>
                            <span>•</span>
                            <span className="flex items-center gap-1 font-semibold text-blue-600 dark:text-blue-400">
                              <Building2 className="w-3 h-3" />
                              <span>{item.companyName}</span>
                            </span>
                            {item.dosage && (
                              <>
                                <span>•</span>
                                <span>{item.dosage} {item.form}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Middle: Stock Level Meter */}
                      <div className="w-full sm:w-56 shrink-0 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
                        <div className="flex items-center justify-between text-xs mb-1.5">
                          <span className="text-slate-500 font-medium">On-Hand Stock:</span>
                          <span className={`font-mono font-black ${isOutOfStock ? 'text-rose-600' : 'text-amber-700 dark:text-amber-400'}`}>
                            {formatNumber(item.currentStock)} / {item.reorderLevel} units
                          </span>
                        </div>

                        {/* Progress bar */}
                        <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              isOutOfStock
                                ? 'w-0'
                                : stockPct < 30
                                ? 'bg-rose-500'
                                : 'bg-amber-500'
                            }`}
                            style={{ width: `${Math.max(4, Math.min(100, stockPct))}%` }}
                          />
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1.5">
                          <span>Reorder Level: <strong>{item.reorderLevel}</strong></span>
                          <span className="text-amber-700 dark:text-amber-300 font-bold">
                            +Rec: {shortfall} units
                          </span>
                        </div>
                      </div>

                      {/* Right: Quick Actions */}
                      <div className="flex items-center gap-2 self-stretch sm:self-center shrink-0">
                        {/* Stock Adjustment Action */}
                        {onOpenStockAdjustment && (
                          <button
                            type="button"
                            onClick={() => {
                              onOpenStockAdjustment(item);
                              onClose();
                            }}
                            className="flex-1 sm:flex-initial px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5"
                            title="Adjust physical count"
                          >
                            <Sliders className="w-3.5 h-3.5" />
                            <span>Adjust</span>
                          </button>
                        )}

                        {/* Reorder / Stock Purchase */}
                        {onNavigateToPurchases && (
                          <button
                            type="button"
                            onClick={() => {
                              onNavigateToPurchases(item.productId);
                              onClose();
                            }}
                            className="flex-1 sm:flex-initial px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg shadow-xs transition-colors flex items-center justify-center gap-1.5"
                            title="Create Procurement Order"
                          >
                            <ShoppingCart className="w-3.5 h-3.5" />
                            <span>Reorder</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ======================================================== */}
        {/* MODAL FOOTER */}
        {/* ======================================================== */}
        <div className="p-4 sm:p-5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-amber-500 shrink-0" />
            <span>
              Thresholds are defined per product variant. Reorder suggestions calculate the safety stock buffer.
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-bold transition-colors"
            >
              Close Alert Center
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
