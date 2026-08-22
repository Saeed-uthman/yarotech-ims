import React, { useState, useEffect, useMemo } from 'react';
import {
  FileSpreadsheet,
  Printer,
  Download,
  X,
  ClipboardCheck,
  Filter,
  Layers,
  Building,
  DollarSign,
  AlertCircle,
  FileText,
  CheckCircle2,
  Boxes,
  Eye,
  Sliders,
  Calendar,
  UserCheck,
  Store,
  RefreshCw,
} from 'lucide-react';
import { Product, ProductFilterParams, UserRole } from '../../types';
import { productService } from '../../services/productService';
import {
  StockAuditExportOptions,
  exportStockAuditCSV,
  exportStockAuditPDF,
  flattenProductsForAudit,
} from '../../utils/stockAuditExport';
import { formatNaira, formatNumber } from '../../utils/formatters';

interface ProductStockAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPageProducts: Product[];
  currentFilters: ProductFilterParams;
  totalFilteredCount: number;
  currentRole: UserRole;
}

export const ProductStockAuditModal: React.FC<ProductStockAuditModalProps> = ({
  isOpen,
  onClose,
  currentPageProducts,
  currentFilters,
  totalFilteredCount,
  currentRole,
}) => {
  const isAdmin = currentRole === 'admin';

  // Modal Configuration Options
  const [scope, setScope] = useState<'filtered' | 'current_page'>('filtered');
  const [granularity, setGranularity] = useState<'variant_detail' | 'product_summary'>('variant_detail');
  const [includeFinancials, setIncludeFinancials] = useState<boolean>(isAdmin);
  const [includeBlankRows, setIncludeBlankRows] = useState<boolean>(true);
  const [auditorName, setAuditorName] = useState<string>('');
  const [auditLocation, setAuditLocation] = useState<string>('Main Pharmacy Floor');
  const [activeTab, setActiveTab] = useState<'options' | 'preview'>('options');

  // Loading state for fetching all filtered items
  const [allFilteredProducts, setAllFilteredProducts] = useState<Product[]>([]);
  const [isLoadingAll, setIsLoadingAll] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  // Fetch all filtered items when modal opens with scope 'filtered'
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    const fetchAllFiltered = async () => {
      setIsLoadingAll(true);
      try {
        // Fetch matching products up to 1000 items
        const res = await productService.getProducts(
          {
            ...currentFilters,
            page: 1,
            limit: 1000,
          },
          currentRole
        );
        if (isMounted) {
          setAllFilteredProducts(res.data || []);
        }
      } catch (err) {
        console.error('Failed to load all filtered products for export', err);
        if (isMounted) {
          setAllFilteredProducts(currentPageProducts);
        }
      } finally {
        if (isMounted) {
          setIsLoadingAll(false);
        }
      }
    };

    fetchAllFiltered();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      isMounted = false;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, currentFilters, currentRole]);

  // Target products dataset based on scope
  const targetProducts = useMemo(() => {
    if (scope === 'current_page') {
      return currentPageProducts;
    }
    return allFilteredProducts.length > 0 ? allFilteredProducts : currentPageProducts;
  }, [scope, currentPageProducts, allFilteredProducts]);

  // Active filter summary text
  const filterSummary = useMemo(() => {
    const parts: string[] = [];
    if (currentFilters.search) parts.push(`Search: "${currentFilters.search}"`);
    if (currentFilters.category && currentFilters.category !== 'All Categories') parts.push(`Category: ${currentFilters.category}`);
    if (currentFilters.status && currentFilters.status !== 'All Status') parts.push(`Status: ${currentFilters.status}`);
    if (currentFilters.company && currentFilters.company !== 'All') parts.push(`Brand: ${currentFilters.company}`);
    if (currentFilters.stockStatus && currentFilters.stockStatus !== 'all') parts.push(`Stock: ${currentFilters.stockStatus}`);
    return parts.length > 0 ? parts.join(' | ') : 'All Active Catalog Products (No search filters applied)';
  }, [currentFilters]);

  // Flattened preview items
  const auditItems = useMemo(() => {
    return flattenProductsForAudit(targetProducts, currentRole, granularity);
  }, [targetProducts, currentRole, granularity]);

  // Calculated metrics
  const totalStockUnits = useMemo(() => {
    return auditItems.reduce((sum, item) => sum + item.systemStock, 0);
  }, [auditItems]);

  const totalCostValuation = useMemo(() => {
    if (!isAdmin) return 0;
    return auditItems.reduce((sum, item) => sum + (item.totalCostValue || 0), 0);
  }, [auditItems, isAdmin]);

  const totalSalesValuation = useMemo(() => {
    return auditItems.reduce((sum, item) => sum + (item.totalSalesValue || 0), 0);
  }, [auditItems]);

  const exportOptions: StockAuditExportOptions = {
    scope,
    granularity,
    includeFinancials: isAdmin && includeFinancials,
    includeBlankRows,
    auditorName: auditorName.trim() || 'Staff Auditor',
    auditLocation: auditLocation.trim() || 'Main Dispensary',
    activeFilterSummary: filterSummary,
  };

  const handleExportCSV = () => {
    setIsExporting(true);
    try {
      exportStockAuditCSV(targetProducts, exportOptions, currentRole);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportPDF = () => {
    setIsExporting(true);
    try {
      exportStockAuditPDF(targetProducts, exportOptions, currentRole);
    } finally {
      setIsExporting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      id="product-stock-audit-modal-overlay"
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 md:p-6 animate-in fade-in duration-200"
    >
      <div
        id="product-stock-audit-modal-container"
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden text-slate-900 dark:text-slate-100"
      >
        {/* ======================================================== */}
        {/* MODAL HEADER */}
        {/* ======================================================== */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/60 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <ClipboardCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  Export Stock Audit & Count Sheet
                </h2>
                <span className="px-2 py-0.5 text-xs font-bold bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300 rounded-full">
                  CSV / PDF Audit Sheet
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Generate printable worksheets & spreadsheet exports for physical stocktaking
              </p>
            </div>
          </div>

          <button
            id="close-stock-audit-modal-btn"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-200/60 dark:hover:bg-slate-700 transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ======================================================== */}
        {/* ACTIVE FILTER SUMMARY STRIP */}
        {/* ======================================================== */}
        <div className="px-4 py-2.5 bg-blue-50/70 dark:bg-blue-950/30 border-b border-blue-100 dark:border-blue-900/40 flex items-center justify-between text-xs text-blue-900 dark:text-blue-200">
          <div className="flex items-center gap-2 min-w-0 overflow-hidden">
            <Filter className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
            <span className="font-semibold shrink-0">Active Filter Scope:</span>
            <span className="truncate opacity-90">{filterSummary}</span>
          </div>
          <span className="shrink-0 font-mono font-bold bg-blue-200/70 dark:bg-blue-800/60 px-2 py-0.5 rounded text-[11px]">
            {totalFilteredCount} matching products
          </span>
        </div>

        {/* ======================================================== */}
        {/* AUDIT SUMMARY STATS BAR */}
        {/* ======================================================== */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-slate-50 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 text-xs">
          <div className="p-2.5 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
            <span className="text-slate-500 dark:text-slate-400 font-medium block text-[11px]">
              Audit Line Items
            </span>
            <span className="text-lg font-bold font-mono text-slate-900 dark:text-white">
              {isLoadingAll ? '...' : auditItems.length} lines
            </span>
          </div>

          <div className="p-2.5 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
            <span className="text-slate-500 dark:text-slate-400 font-medium block text-[11px]">
              System Stock Units
            </span>
            <span className="text-lg font-bold font-mono text-blue-600 dark:text-blue-400">
              {isLoadingAll ? '...' : formatNumber(totalStockUnits)}
            </span>
          </div>

          <div className="p-2.5 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
            <span className="text-slate-500 dark:text-slate-400 font-medium block text-[11px]">
              Sales Valuation
            </span>
            <span className="text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400 truncate block">
              {isLoadingAll ? '...' : formatNaira(totalSalesValuation)}
            </span>
          </div>

          {isAdmin ? (
            <div className="p-2.5 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
              <span className="text-slate-500 dark:text-slate-400 font-medium block text-[11px]">
                Cost Valuation (Admin)
              </span>
              <span className="text-lg font-bold font-mono text-purple-600 dark:text-purple-400 truncate block">
                {isLoadingAll ? '...' : formatNaira(totalCostValuation)}
              </span>
            </div>
          ) : (
            <div className="p-2.5 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
              <span className="text-slate-500 dark:text-slate-400 font-medium block text-[11px]">
                Format Mode
              </span>
              <span className="text-sm font-bold text-slate-700 dark:text-slate-300 mt-1 block">
                Audit Ready Worksheet
              </span>
            </div>
          )}
        </div>

        {/* ======================================================== */}
        {/* TAB CONTROLS (OPTIONS VS LIVE DATA PREVIEW) */}
        {/* ======================================================== */}
        <div className="flex items-center gap-2 px-4 pt-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <button
            onClick={() => setActiveTab('options')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'options'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Audit Configuration & Settings</span>
          </button>

          <button
            onClick={() => setActiveTab('preview')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'preview'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Live Audit Sheet Preview ({auditItems.length})</span>
          </button>
        </div>

        {/* ======================================================== */}
        {/* MODAL BODY */}
        {/* ======================================================== */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {activeTab === 'options' ? (
            <div className="space-y-5">
              {/* 1. Export Scope Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                  1. Choose Export Scope
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div
                    onClick={() => setScope('filtered')}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                      scope === 'filtered'
                        ? 'bg-blue-50/70 dark:bg-blue-950/30 border-blue-500 ring-2 ring-blue-500/20'
                        : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-slate-900 dark:text-white">
                        All Filtered Products ({totalFilteredCount})
                      </span>
                      <span
                        className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                          scope === 'filtered' ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300'
                        }`}
                      >
                        {scope === 'filtered' && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                      Exports every product matching the active search query, category, and status filters across all pages.
                    </p>
                  </div>

                  <div
                    onClick={() => setScope('current_page')}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                      scope === 'current_page'
                        ? 'bg-blue-50/70 dark:bg-blue-950/30 border-blue-500 ring-2 ring-blue-500/20'
                        : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-slate-900 dark:text-white">
                        Current Page Only ({currentPageProducts.length})
                      </span>
                      <span
                        className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                          scope === 'current_page' ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300'
                        }`}
                      >
                        {scope === 'current_page' && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                      Exports only the items currently displayed on the active table page.
                    </p>
                  </div>
                </div>
              </div>

              {/* 2. Granularity / Layout */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                  2. Audit Sheet Granularity
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div
                    onClick={() => setGranularity('variant_detail')}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                      granularity === 'variant_detail'
                        ? 'bg-blue-50/70 dark:bg-blue-950/30 border-blue-500 ring-2 ring-blue-500/20'
                        : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                        <Boxes className="w-3.5 h-3.5 text-blue-600" />
                        <span>Brand / Variant Detail (Recommended)</span>
                      </span>
                      <span
                        className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                          granularity === 'variant_detail' ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300'
                        }`}
                      >
                        {granularity === 'variant_detail' && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                      1 row per manufacturer brand variant with exact Barcode, on-hand count, and tally box. Ideal for physical pharmacy shelf audits.
                    </p>
                  </div>

                  <div
                    onClick={() => setGranularity('product_summary')}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                      granularity === 'product_summary'
                        ? 'bg-blue-50/70 dark:bg-blue-950/30 border-blue-500 ring-2 ring-blue-500/20'
                        : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-slate-600" />
                        <span>Aggregated Product Summary</span>
                      </span>
                      <span
                        className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                          granularity === 'product_summary' ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300'
                        }`}
                      >
                        {granularity === 'product_summary' && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                      1 row per high-level medicine concept summing all brand variants together. Best for managerial review.
                    </p>
                  </div>
                </div>
              </div>

              {/* 3. Physical Audit Worksheet Details & Options */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 space-y-4">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  3. Stocktaking Metadata & Print Customization
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Auditor / Pharmacist Name
                    </label>
                    <div className="relative">
                      <UserCheck className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={auditorName}
                        onChange={(e) => setAuditorName(e.target.value)}
                        placeholder="e.g. Pharm. Adaeze Okonjo"
                        className="w-full pl-9 pr-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Pharmacy Store / Ward Location
                    </label>
                    <div className="relative">
                      <Store className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={auditLocation}
                        onChange={(e) => setAuditLocation(e.target.value)}
                        placeholder="e.g. Main Dispensary - Bay 4"
                        className="w-full pl-9 pr-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200 dark:border-slate-700 space-y-2.5">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeBlankRows}
                      onChange={(e) => setIncludeBlankRows(e.target.checked)}
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-xs text-slate-700 dark:text-slate-300">
                      Include 5 blank write-in rows at end of audit sheet (for newly discovered unlisted shelf items)
                    </span>
                  </label>

                  {isAdmin && (
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={includeFinancials}
                        onChange={(e) => setIncludeFinancials(e.target.checked)}
                        className="rounded text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-xs text-slate-700 dark:text-slate-300">
                        Include Unit Cost Price & Total Stock Valuation columns (Admin confidential)
                      </span>
                    </label>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* Live Audit Sheet Preview Table */
            <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden shadow-2xs">
              <div className="p-2.5 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs">
                <span className="font-bold text-slate-700 dark:text-slate-300">
                  Worksheet Preview ({auditItems.length} lines)
                </span>
                <span className="text-[11px] text-slate-500">
                  Showing first 25 lines of {auditItems.length}
                </span>
              </div>
              <div className="max-h-[360px] overflow-x-auto overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50 dark:bg-slate-800/90 text-slate-700 dark:text-slate-300 sticky top-0 border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="p-2 text-center w-10">S/N</th>
                      <th className="p-2">Barcode</th>
                      <th className="p-2">Product & Generic</th>
                      <th className="p-2">Brand / Mfr</th>
                      <th className="p-2 text-right">System Qty</th>
                      <th className="p-2 text-center w-24 bg-blue-50 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200">
                        Physical Count
                      </th>
                      <th className="p-2 text-right">Selling Price</th>
                      {isAdmin && includeFinancials && <th className="p-2 text-right">Cost Value</th>}
                      <th className="p-2">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-sans">
                    {auditItems.slice(0, 25).map((item) => (
                      <tr key={`${item.productId}-${item.variantId || item.sn}`} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                        <td className="p-2 text-center text-slate-400 font-mono text-[11px]">{item.sn}</td>
                        <td className="p-2 font-mono text-[11px] text-slate-500">{item.barcode || '—'}</td>
                        <td className="p-2">
                          <strong className="text-slate-900 dark:text-white">{item.productName}</strong>
                          <div className="text-[10px] text-slate-500">{item.genericName}</div>
                        </td>
                        <td className="p-2 text-slate-600 dark:text-slate-300">{item.companyName}</td>
                        <td className="p-2 text-right font-mono font-bold text-slate-900 dark:text-white">
                          {formatNumber(item.systemStock)}
                        </td>
                        <td className="p-2 text-center bg-blue-50/40 dark:bg-blue-950/20">
                          <div className="h-5 border border-dashed border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-800"></div>
                        </td>
                        <td className="p-2 text-right font-mono">{formatNaira(item.sellingPrice)}</td>
                        {isAdmin && includeFinancials && (
                          <td className="p-2 text-right font-mono text-purple-600 dark:text-purple-400">
                            {formatNaira(item.totalCostValue || 0)}
                          </td>
                        )}
                        <td className="p-2">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              item.stockStatus === 'Out of Stock'
                                ? 'bg-rose-100 text-rose-800'
                                : item.stockStatus === 'Low Stock'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {item.stockStatus}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* ======================================================== */}
        {/* MODAL FOOTER & EXPORT BUTTONS */}
        {/* ======================================================== */}
        <div className="p-4 sm:p-5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/60 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 self-start sm:self-center">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>
              Targeting <strong>{auditItems.length} lines</strong> ({formatNumber(totalStockUnits)} total units)
            </span>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            {/* Download CSV Button */}
            <button
              id="export-stock-audit-csv-btn"
              type="button"
              onClick={handleExportCSV}
              disabled={isExporting || isLoadingAll || auditItems.length === 0}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Export CSV (.csv)</span>
            </button>

            {/* Print / Save PDF Button */}
            <button
              id="export-stock-audit-pdf-btn"
              type="button"
              onClick={handleExportPDF}
              disabled={isExporting || isLoadingAll || auditItems.length === 0}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print / Save PDF</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
