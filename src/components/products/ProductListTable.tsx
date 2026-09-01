import React, { useState } from 'react';
import { 
  Eye, 
  Edit3, 
  MoreVertical, 
  Power, 
  PlusCircle,
  Pill,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  FileSpreadsheet,
  CheckCircle2,
  Download,
} from 'lucide-react';
import { Product, UserRole } from '../../types';
import { 
  formatNumber, 
  getPriceRange, 
  getTotalStock, 
  getCompanyCount, 
  getProductStockStatus 
} from '../../utils/formatters';
import { downloadProductCsvTemplate } from '../../utils/productCsvTemplate';
import { ProductImage } from './ProductImage';
import { ProductStatusBadge } from './ProductStatusBadge';
import { StockStatusBadge } from './StockStatusBadge';
import { StockLevelHeatmap } from './StockLevelHeatmap';

interface ProductListTableProps {
  products: Product[];
  currentRole: UserRole;
  totalProductsCount: number;
  currentPage: number;
  totalPages: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  isLoading?: boolean;
  onSortChange?: (field: 'name' | 'stock' | 'price' | 'date') => void;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
  onViewProduct: (product: Product) => void;
  onEditProduct: (product: Product) => void;
  onDeactivateRequest: (product: Product) => void;
  onActivateProduct: (product: Product) => void;
  onAddVariantQuick: (product: Product) => void;
  onOpenExportAudit?: () => void;
  onDownloadCsvTemplate?: () => void;
}

export const ProductListTable: React.FC<ProductListTableProps> = ({
  products,
  currentRole,
  totalProductsCount,
  currentPage,
  totalPages,
  limit,
  sortBy = 'name',
  sortOrder = 'asc',
  isLoading = false,
  onSortChange,
  onPageChange,
  onLimitChange,
  onViewProduct,
  onEditProduct,
  onDeactivateRequest,
  onActivateProduct,
  onAddVariantQuick,
  onOpenExportAudit,
  onDownloadCsvTemplate,
}) => {
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [isDownloadedRecently, setIsDownloadedRecently] = useState(false);
  const isAdmin = currentRole === 'admin';

  const handleDownloadCsvTemplate = () => {
    if (onDownloadCsvTemplate) {
      onDownloadCsvTemplate();
    } else {
      downloadProductCsvTemplate('yarotech_product_import_template');
    }
    setIsDownloadedRecently(true);
    setTimeout(() => {
      setIsDownloadedRecently(false);
    }, 3000);
  };

  const startRecord = (currentPage - 1) * limit + 1;
  const endRecord = Math.min(currentPage * limit, totalProductsCount);

  const handleHeaderSort = (field: 'name' | 'stock' | 'price' | 'date') => {
    if (onSortChange) {
      onSortChange(field);
    }
  };

  const getCategoryBadgeClass = (category: string) => {
    switch (category.toLowerCase()) {
      case 'analgesics':
        return 'bg-blue-100 text-blue-800';
      case 'antibiotics':
        return 'bg-purple-100 text-purple-800';
      case 'antimalarials':
        return 'bg-yellow-100 text-yellow-800';
      case 'vitamins & supplements':
      case 'vitamins':
        return 'bg-emerald-100 text-emerald-800';
      case 'antihypertensive':
        return 'bg-rose-100 text-rose-800';
      case 'antidiabetic':
        return 'bg-cyan-100 text-cyan-800';
      case 'respiratory':
        return 'bg-indigo-100 text-indigo-800';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
      {/* Product List Table Toolbar */}
      <div className="px-4 sm:px-6 py-3 border-b border-slate-200 bg-slate-50/80 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="text-xs font-bold text-slate-800 tracking-tight uppercase">Product Catalog</span>
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-200/80 text-slate-700">
            {formatNumber(totalProductsCount)} products
          </span>
        </div>

        {/* Toolbar Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Download CSV Template Button */}
          <button
            id="download-csv-template-btn"
            type="button"
            onClick={handleDownloadCsvTemplate}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border shadow-2xs transition-all cursor-pointer ${
              isDownloadedRecently
                ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                : 'bg-white hover:bg-blue-50/80 active:bg-blue-100 text-blue-700 border-blue-200 hover:border-blue-300'
            }`}
            title="Download formatted CSV spreadsheet template with all required and optional fields for bulk product creation"
          >
            {isDownloadedRecently ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 animate-in zoom-in-50 duration-200" />
                <span>Template Downloaded!</span>
              </>
            ) : (
              <>
                <FileSpreadsheet className="w-3.5 h-3.5 text-blue-600" />
                <span>Download CSV Template</span>
              </>
            )}
          </button>

          {/* Stock Audit Export Button */}
          {onOpenExportAudit && (
            <button
              id="product-list-stock-audit-export-btn"
              type="button"
              onClick={onOpenExportAudit}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:text-emerald-800 bg-white hover:bg-emerald-50/80 active:bg-emerald-100 border border-emerald-200 hover:border-emerald-300 rounded-lg shadow-2xs transition-all cursor-pointer"
              title="Export filtered product list for physical stock count audit (PDF / CSV)"
            >
              <ClipboardCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Stock Audit Export</span>
            </button>
          )}
        </div>
      </div>

      {/* Table Container */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse" aria-label="Technology and Solar Products Table">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider select-none">
              <th 
                className="py-3.5 px-4 sm:px-6 font-semibold cursor-pointer hover:text-slate-900 transition-colors"
                onClick={() => handleHeaderSort('name')}
              >
                <div className="flex items-center gap-1.5">
                  <span>Product & Model</span>
                  {sortBy === 'name' && (
                    <span className="text-blue-600 font-bold">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                  )}
                </div>
              </th>
              <th className="py-3.5 px-4 font-semibold hidden md:table-cell">Category</th>
              <th className="py-3.5 px-4 font-semibold text-center hidden sm:table-cell">Companies</th>
              <th className="py-3.5 px-4 font-semibold text-center hidden lg:table-cell">Variants</th>
              <th 
                className="py-3.5 px-4 sm:px-6 font-semibold text-right cursor-pointer hover:text-slate-900 transition-colors"
                onClick={() => handleHeaderSort('stock')}
              >
                <div className="flex items-center justify-end gap-1.5">
                  <span>Total Stock</span>
                  {sortBy === 'stock' && (
                    <span className="text-blue-600 font-bold">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                  )}
                </div>
              </th>
              <th 
                className="py-3.5 px-4 sm:px-6 font-semibold text-right cursor-pointer hover:text-slate-900 transition-colors"
                onClick={() => handleHeaderSort('price')}
              >
                <div className="flex items-center justify-end gap-1.5">
                  <span>Price Range</span>
                  {sortBy === 'price' && (
                    <span className="text-blue-600 font-bold">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                  )}
                </div>
              </th>
              <th className="py-3.5 px-4 font-semibold text-center">Status</th>
              <th className="py-3.5 px-4 sm:px-6 font-semibold text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {isLoading ? (
              // Loading Skeleton Rows
              Array.from({ length: Math.min(limit, 6) }).map((_, i) => (
                <tr key={`skeleton-${i}`} className="animate-pulse">
                  <td className="py-4 px-4 sm:px-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-md bg-slate-200"></div>
                      <div className="space-y-2">
                        <div className="h-3.5 w-32 bg-slate-200 rounded"></div>
                        <div className="h-2.5 w-24 bg-slate-100 rounded"></div>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-4 hidden md:table-cell">
                    <div className="h-4 w-16 bg-slate-200 rounded"></div>
                  </td>
                  <td className="py-4 px-4 text-center hidden sm:table-cell">
                    <div className="h-3.5 w-6 bg-slate-200 rounded mx-auto"></div>
                  </td>
                  <td className="py-4 px-4 text-center hidden lg:table-cell">
                    <div className="h-3.5 w-6 bg-slate-200 rounded mx-auto"></div>
                  </td>
                  <td className="py-4 px-4 sm:px-6 text-right">
                    <div className="h-3.5 w-12 bg-slate-200 rounded ml-auto"></div>
                  </td>
                  <td className="py-4 px-4 sm:px-6 text-right">
                    <div className="h-3.5 w-16 bg-slate-200 rounded ml-auto"></div>
                  </td>
                  <td className="py-4 px-4 text-center">
                    <div className="w-16 h-5 bg-slate-200 rounded-full mx-auto"></div>
                  </td>
                  <td className="py-4 px-4 sm:px-6 text-center">
                    <div className="h-5 w-16 bg-slate-200 rounded mx-auto"></div>
                  </td>
                </tr>
              ))
            ) : products.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-slate-400">
                  <Pill className="w-8 h-8 mx-auto mb-2 text-slate-300 stroke-1" />
                  <p className="font-semibold text-slate-600">No products found</p>
                  <p className="text-xs text-slate-400 mt-0.5">Try adjusting your search query or filters</p>
                </td>
              </tr>
            ) : (
              products.map((product) => {
                const totalStock = getTotalStock(product.variants);
                const companiesCount = getCompanyCount(product.variants);
                const variantsCount = product.variants.length;
                const priceRangeStr = getPriceRange(product.variants, true);
                const stockStatus = getProductStockStatus(product.variants);
                const isMenuOpen = activeMenuId === product.id;

                return (
                  <tr 
                    key={product.id}
                    className={`hover:bg-slate-50/80 transition-colors group ${
                      product.status === 'Inactive' ? 'opacity-70 bg-slate-50/30' : ''
                    }`}
                  >
                    {/* 1. Product Name & Thumb */}
                    <td className="py-3.5 px-4 sm:px-6">
                      <div className="flex items-center gap-3">
                        <ProductImage
                          src={product.image}
                          alt={`${product.name} product image`}
                          size="sm"
                        />
                        <div className="min-w-0">
                          <button
                            onClick={() => onViewProduct(product)}
                            className="font-bold text-slate-900 text-sm hover:text-blue-600 text-left truncate block max-w-xs transition-colors"
                          >
                            {product.name}
                          </button>
                          <p className="text-xs text-slate-500 truncate max-w-xs">
                            {product.subtitle || `${product.genericName} (${product.dosage})`}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* 2. Category */}
                    <td className="py-3.5 px-4 hidden md:table-cell">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getCategoryBadgeClass(product.category)}`}>
                        {product.category}
                      </span>
                    </td>

                    {/* 3. Companies */}
                    <td className="py-3.5 px-4 text-center font-mono font-medium text-slate-700 hidden sm:table-cell">
                      {companiesCount}
                    </td>

                    {/* 4. Variants */}
                    <td className="py-3.5 px-4 text-center font-mono font-medium text-slate-700 hidden lg:table-cell">
                      {variantsCount}
                    </td>

                    {/* 5. Total Stock */}
                    <td className="py-3.5 px-4 sm:px-6 text-right">
                      <div className="flex flex-col items-end gap-1">
                        <div className="flex items-center justify-end gap-1.5 font-mono font-bold text-slate-900">
                          <span className={stockStatus === 'Low Stock' ? 'text-amber-600' : stockStatus === 'Out of Stock' ? 'text-rose-600' : 'text-slate-900'}>
                            {formatNumber(totalStock)}
                          </span>
                          {stockStatus === 'Low Stock' && (
                            <span 
                              title="Low stock threshold reached" 
                              className="w-2 h-2 rounded-full bg-amber-500 inline-block"
                            />
                          )}
                        </div>
                        {/* Stock Level Heatmap Density Visual */}
                        <StockLevelHeatmap
                          variants={product.variants}
                          totalStock={totalStock}
                          compact={true}
                        />
                      </div>
                    </td>

                    {/* 6. Price Range */}
                    <td className="py-3.5 px-4 sm:px-6 text-right font-mono font-bold text-slate-900">
                      {priceRangeStr}
                    </td>

                    {/* 7. Status */}
                    <td className="py-3.5 px-4 text-center">
                      <ProductStatusBadge status={product.status} />
                    </td>

                    {/* 8. Actions */}
                    <td className="py-3.5 px-4 sm:px-6 text-center relative">
                      <div className="flex items-center justify-center gap-1">
                        {/* View Details Eye */}
                        <button
                          id={`btn-view-${product.id}`}
                          onClick={() => onViewProduct(product)}
                          title="View Product Details"
                          aria-label={`View details for ${product.name}`}
                          className="p-1.5 rounded-md text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {/* Edit Pencil (Admin only) */}
                        {isAdmin ? (
                          <button
                            id={`btn-edit-${product.id}`}
                            onClick={() => onEditProduct(product)}
                            title="Edit Product"
                            aria-label={`Edit ${product.name}`}
                            className="p-1.5 rounded-md text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                        ) : (
                          <button
                            disabled
                            title="Admin privileges required to edit"
                            aria-label="Admin privileges required to edit"
                            className="p-1.5 rounded-md text-slate-300 cursor-not-allowed"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                        )}

                        {/* Three dots menu */}
                        <div className="relative">
                          <button
                            id={`btn-more-${product.id}`}
                            onClick={() => setActiveMenuId(isMenuOpen ? null : product.id)}
                            aria-label={`More options for ${product.name}`}
                            aria-expanded={isMenuOpen}
                            className="p-1.5 rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>

                          {isMenuOpen && (
                            <>
                              <div 
                                className="fixed inset-0 z-20"
                                onClick={() => setActiveMenuId(null)}
                              />
                              <div className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-30 text-left animate-in fade-in zoom-in-95 duration-100">
                                <button
                                  onClick={() => {
                                    setActiveMenuId(null);
                                    onViewProduct(product);
                                  }}
                                  className="w-full px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                                >
                                  <Eye className="w-3.5 h-3.5 text-slate-400" />
                                  <span>View Details</span>
                                </button>

                                {isAdmin && (
                                  <>
                                    <button
                                      onClick={() => {
                                        setActiveMenuId(null);
                                        onEditProduct(product);
                                      }}
                                      className="w-full px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                                    >
                                      <Edit3 className="w-3.5 h-3.5 text-slate-400" />
                                      <span>Edit Product</span>
                                    </button>

                                    <button
                                      onClick={() => {
                                        setActiveMenuId(null);
                                        onAddVariantQuick(product);
                                      }}
                                      className="w-full px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                                    >
                                      <PlusCircle className="w-3.5 h-3.5 text-blue-600" />
                                      <span>Add Manufacturer</span>
                                    </button>

                                    <div className="border-t border-slate-100 my-1"></div>

                                    {product.status === 'Active' ? (
                                      <button
                                        onClick={() => {
                                          setActiveMenuId(null);
                                          onDeactivateRequest(product);
                                        }}
                                        className="w-full px-3 py-2 text-xs font-medium flex items-center gap-2 text-amber-600 hover:bg-amber-50"
                                      >
                                        <Power className="w-3.5 h-3.5" />
                                        <span>Deactivate Product</span>
                                      </button>
                                    ) : (
                                      <button
                                        onClick={() => {
                                          setActiveMenuId(null);
                                          onActivateProduct(product);
                                        }}
                                        className="w-full px-3 py-2 text-xs font-medium flex items-center gap-2 text-emerald-600 hover:bg-emerald-50"
                                      >
                                        <Power className="w-3.5 h-3.5" />
                                        <span>Activate Product</span>
                                      </button>
                                    )}
                                  </>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer matching design */}
      <div className="mt-auto border-t border-slate-100 px-4 sm:px-6 py-3.5 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 font-medium">
        <div className="flex items-center gap-2.5 flex-wrap">
          <div>
            Showing <span className="font-semibold text-slate-900">{totalProductsCount > 0 ? startRecord : 0}</span> -{' '}
            <span className="font-semibold text-slate-900">{endRecord}</span> of{' '}
            <span className="font-semibold text-slate-900">{formatNumber(totalProductsCount)}</span> products
          </div>
          <button
            id="table-footer-download-csv-template-btn"
            onClick={handleDownloadCsvTemplate}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-blue-700 hover:text-blue-800 bg-blue-100/70 hover:bg-blue-100 rounded-md border border-blue-200 transition-colors cursor-pointer"
            title="Download CSV Template with required fields for bulk product import"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-blue-600" />
            <span>CSV Template</span>
          </button>
          {onOpenExportAudit && (
            <button
              id="table-footer-export-audit-btn"
              onClick={onOpenExportAudit}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-100/70 hover:bg-emerald-100 rounded-md border border-emerald-200 transition-colors cursor-pointer"
              title="Export filtered product list for physical audit (CSV / PDF)"
            >
              <ClipboardCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Stock Audit Export</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-3 sm:gap-4">
          {/* Rows per page selector */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 text-xs">Rows:</span>
            <select
              id="rows-per-page-select"
              value={limit}
              onChange={(e) => onLimitChange(Number(e.target.value))}
              className="bg-white border border-slate-200 rounded-md px-2 py-1 font-semibold text-slate-700 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </div>

          {/* Page numbers navigation */}
          <div className="flex items-center gap-1">
            <button
              id="pagination-prev-btn"
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage <= 1}
              className="w-7 h-7 sm:w-8 sm:h-8 rounded border border-slate-200 bg-white flex items-center justify-center text-slate-400 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>

            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const pageNum = i + 1;
              const isSelected = pageNum === currentPage;
              return (
                <button
                  key={pageNum}
                  onClick={() => onPageChange(pageNum)}
                  className={`w-7 h-7 sm:w-8 sm:h-8 rounded border flex items-center justify-center text-xs transition-colors ${
                    isSelected
                      ? 'border-blue-600 bg-blue-600 text-white font-bold'
                      : 'border-slate-200 bg-white text-slate-900 font-bold hover:bg-slate-50'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}

            {totalPages > 5 && (
              <>
                <span className="px-1 text-slate-400 text-xs font-bold">...</span>
                <button
                  onClick={() => onPageChange(totalPages)}
                  className={`w-7 h-7 sm:w-8 sm:h-8 rounded border flex items-center justify-center text-xs font-bold ${
                    currentPage === totalPages
                      ? 'border-blue-600 bg-blue-600 text-white'
                      : 'border-slate-200 bg-white text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  {totalPages}
                </button>
              </>
            )}

            <button
              id="pagination-next-btn"
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage >= totalPages}
              className="w-7 h-7 sm:w-8 sm:h-8 rounded border border-slate-200 bg-white flex items-center justify-center text-slate-900 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
            >
              <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
