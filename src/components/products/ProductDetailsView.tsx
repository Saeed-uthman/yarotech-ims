import React, { useState } from 'react';
import { 
  ArrowLeft, 
  Edit3, 
  MoreHorizontal, 
  Pill, 
  Plus, 
  Trash2, 
  Building2, 
  DollarSign, 
  Boxes, 
  Barcode, 
  Calendar, 
  Clock, 
  ShieldAlert, 
  CheckCircle2, 
  AlertCircle,
  TrendingUp,
  Image as ImageIcon,
  Check,
  QrCode
} from 'lucide-react';
import { Product, UserRole, CompanyVariant } from '../../types';
import { formatNaira, formatNumber } from '../../utils/formatters';
import { ProductPriceHistoryTab } from './ProductPriceHistoryTab';
import { ProductLowStockBanner } from './ProductLowStockBanner';
import { ProductQRCodeModal } from './ProductQRCodeModal';

interface ProductDetailsViewProps {
  product: Product;
  currentRole: UserRole;
  onBack: () => void;
  onEdit: () => void;
  onToggleStatus: (id: string) => void;
  onAddVariant: (productId: string, variant: {
    companyName: string;
    basePrice: number;
    sellingPrice: number;
    currentStock: number;
    reorderLevel: number;
    status: 'Available' | 'Inactive';
  }) => void;
  onUpdateVariant: (productId: string, variantId: string, updates: Partial<CompanyVariant>) => void;
  onDeleteVariant: (productId: string, variantId: string) => void;
  onUpdateImage?: (productId: string, newImageUrl: string) => void;
  onNavigateToPurchases?: (productId?: string) => void;
}

export const ProductDetailsView: React.FC<ProductDetailsViewProps> = ({
  product,
  currentRole,
  onBack,
  onEdit,
  onToggleStatus,
  onAddVariant,
  onUpdateVariant,
  onDeleteVariant,
  onUpdateImage,
  onNavigateToPurchases,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'variants' | 'pricing' | 'stock' | 'price-history'>('overview');
  const [showAddVariantModal, setShowAddVariantModal] = useState(false);
  const [editingVariant, setEditingVariant] = useState<CompanyVariant | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [newImageInput, setNewImageInput] = useState(product.image || '');
  const [showQRCodeModal, setShowQRCodeModal] = useState(false);
  const [selectedQRVariant, setSelectedQRVariant] = useState<CompanyVariant | null>(null);

  const handleOpenQRCode = (variant?: CompanyVariant) => {
    setSelectedQRVariant(variant || null);
    setShowQRCodeModal(true);
  };

  // Add Variant Form State
  const [variantForm, setVariantForm] = useState({
    companyName: '',
    basePrice: 0,
    minSellingPrice: 0,
    defaultSellingPrice: 0,
    maxSellingPrice: 0,
    sellingPrice: 0,
    currentStock: 100,
    reorderLevel: 50,
    status: 'Available' as 'Available' | 'Inactive',
  });

  const isAdmin = currentRole === 'admin';

  const handleAddVariantSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!variantForm.companyName.trim()) return;

    const basePrice = Number(variantForm.basePrice);
    const defaultSellingPrice = Number(variantForm.defaultSellingPrice) || Number(variantForm.sellingPrice);
    const minSellingPrice = Number(variantForm.minSellingPrice) || (basePrice > 0 ? Math.max(basePrice + 10, Math.round(basePrice * 1.15)) : defaultSellingPrice);
    const maxSellingPrice = Number(variantForm.maxSellingPrice) || Math.max(defaultSellingPrice, Math.round(defaultSellingPrice * 1.25));

    onAddVariant(product.id, {
      companyName: variantForm.companyName.trim().toUpperCase(),
      basePrice,
      minSellingPrice,
      defaultSellingPrice,
      maxSellingPrice,
      sellingPrice: defaultSellingPrice,
      currentStock: Number(variantForm.currentStock),
      reorderLevel: Number(variantForm.reorderLevel),
      status: variantForm.status,
    } as any);

    setVariantForm({
      companyName: '',
      basePrice: 0,
      minSellingPrice: 0,
      defaultSellingPrice: 0,
      maxSellingPrice: 0,
      sellingPrice: 0,
      currentStock: 100,
      reorderLevel: 50,
      status: 'Available',
    });
    setShowAddVariantModal(false);
  };

  const handleSaveEditedVariant = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingVariant) return;

    const basePrice = Number(editingVariant.basePrice);
    const defaultSellingPrice = Number(editingVariant.defaultSellingPrice) || Number(editingVariant.sellingPrice);
    const minSellingPrice = Number(editingVariant.minSellingPrice) || (basePrice > 0 ? Math.max(basePrice + 10, Math.round(basePrice * 1.15)) : defaultSellingPrice);
    const maxSellingPrice = Number(editingVariant.maxSellingPrice) || Math.max(defaultSellingPrice, Math.round(defaultSellingPrice * 1.25));

    onUpdateVariant(product.id, editingVariant.id, {
      companyName: editingVariant.companyName,
      basePrice,
      minSellingPrice,
      defaultSellingPrice,
      maxSellingPrice,
      sellingPrice: defaultSellingPrice,
      currentStock: Number(editingVariant.currentStock),
      reorderLevel: Number(editingVariant.reorderLevel),
      status: editingVariant.status,
    });
    setEditingVariant(null);
  };

  const totalStock = product.variants.reduce((acc, v) => acc + v.currentStock, 0);
  const totalSellingValue = product.variants.reduce((acc, v) => acc + (v.currentStock * v.sellingPrice), 0);
  const totalCostValue = product.variants.reduce((acc, v) => acc + (v.currentStock * v.basePrice), 0);
  const estimatedProfit = totalSellingValue - totalCostValue;

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
        <button
          id="product-details-back-crumb"
          onClick={onBack}
          className="flex items-center gap-1 text-slate-600 hover:text-blue-600 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Products</span>
        </button>
        <span className="text-slate-300">/</span>
        <span className="text-slate-900 font-bold">Product Details</span>
      </div>

      {/* Header Bar matching Geometric Balance */}
      <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {product.name}
            </h1>
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-bold ${
                product.status === 'Active'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-slate-100 text-slate-500 border border-slate-200'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${product.status === 'Active' ? 'bg-emerald-500' : 'bg-slate-400'}`} />
              {product.status}
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            {product.subtitle || `${product.genericName} • ${product.category}`}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Generate QR Code Action Button */}
          <button
            id="details-generate-qr-btn"
            onClick={() => handleOpenQRCode()}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white rounded-md text-sm font-semibold shadow-xs transition-colors cursor-pointer"
            title="Generate, download and print QR code sticker with barcode info"
          >
            <QrCode className="w-4 h-4 text-blue-400" />
            <span className="hidden sm:inline">Generate QR Code</span>
            <span className="sm:hidden">QR Code</span>
          </button>

          {isAdmin ? (
            <button
              id="details-edit-product-btn"
              onClick={onEdit}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-md text-sm font-semibold shadow-xs transition-colors"
            >
              <Edit3 className="w-4 h-4" />
              <span>Edit Product</span>
            </button>
          ) : (
            <div className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 text-slate-400 rounded-md text-xs font-medium">
              <ShieldAlert className="w-4 h-4" />
              <span>View-Only Cashier</span>
            </div>
          )}

          <div className="relative">
            <button
              id="details-more-menu-btn"
              onClick={() => setShowMenu(!showMenu)}
              className="p-2 rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
            >
              <MoreHorizontal className="w-5 h-5" />
            </button>

            {showMenu && (
              <>
                <div className="fixed inset-0 z-20" onClick={() => setShowMenu(false)} />
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-30 animate-in fade-in zoom-in-95 duration-100">
                  <button
                    id="details-menu-qr-btn"
                    onClick={() => {
                      setShowMenu(false);
                      handleOpenQRCode();
                    }}
                    className="w-full px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                  >
                    <QrCode className="w-3.5 h-3.5 text-blue-600" />
                    <span>Generate QR Code</span>
                  </button>

                  {isAdmin && (
                    <>
                      <button
                        onClick={() => {
                          setShowMenu(false);
                          setShowAddVariantModal(true);
                        }}
                        className="w-full px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                      >
                        <Plus className="w-3.5 h-3.5 text-blue-600" />
                        <span>Add Company Variant</span>
                      </button>
                      <button
                        onClick={() => {
                          setShowMenu(false);
                          onToggleStatus(product.id);
                        }}
                        className="w-full px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                      >
                        <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                        <span>{product.status === 'Active' ? 'Deactivate Product' : 'Activate Product'}</span>
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      window.print();
                    }}
                    className="w-full px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                  >
                    <Barcode className="w-3.5 h-3.5 text-slate-400" />
                    <span>Print Product Barcode</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Main Body Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Side Subnav Tabs (Desktop) */}
        <div className="lg:col-span-1 space-y-1 bg-white p-3 rounded-lg border border-slate-200 shadow-xs h-fit">
          <button
            onClick={() => setActiveTab('overview')}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-sm font-semibold transition-colors ${
              activeTab === 'overview'
                ? 'bg-blue-50 text-blue-700'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <span>Overview</span>
          </button>

          <button
            onClick={() => setActiveTab('variants')}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-sm font-semibold transition-colors ${
              activeTab === 'variants'
                ? 'bg-blue-50 text-blue-700'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <span>Company Variants</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-bold font-mono">
              {product.variants.length}
            </span>
          </button>

          <button
            id="tab-price-history-btn"
            onClick={() => setActiveTab('price-history')}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-sm font-semibold transition-colors ${
              activeTab === 'price-history'
                ? 'bg-blue-50 text-blue-700'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-600" />
              <span>Price History</span>
            </div>
            <span className="text-[10px] px-1.5 py-0.2 font-bold rounded bg-blue-100/70 text-blue-700">
              Chart
            </span>
          </button>

          {isAdmin && (
            <>
              <button
                onClick={() => setActiveTab('pricing')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-sm font-semibold transition-colors ${
                  activeTab === 'pricing'
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span>Pricing Summary</span>
                <DollarSign className="w-4 h-4 text-slate-400" />
              </button>

              <button
                onClick={() => setActiveTab('stock')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-sm font-semibold transition-colors ${
                  activeTab === 'stock'
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span>Stock Levels</span>
                <Boxes className="w-4 h-4 text-slate-400" />
              </button>
            </>
          )}

          {isAdmin && (
            <button
              onClick={onEdit}
              className="w-full flex items-center justify-between px-3 py-2 rounded-md text-sm font-semibold text-slate-600 hover:bg-slate-50 border-t border-slate-100 mt-2"
            >
              <span>Edit Product</span>
              <Edit3 className="w-4 h-4 text-slate-400" />
            </button>
          )}
        </div>

        {/* Right Content Area */}
        <div className="lg:col-span-3 space-y-6">
          {/* Low Stock Warning Alert Banner */}
          <ProductLowStockBanner
            product={product}
            currentRole={currentRole}
            onReorderStock={onNavigateToPurchases ? () => onNavigateToPurchases(product.id) : undefined}
          />

          {/* 1. Overview Tab */}
          {(activeTab === 'overview' || activeTab === 'variants') && (
            <>
              {/* Product Information Card */}
              <div className="bg-white p-5 sm:p-6 rounded-lg border border-slate-200 shadow-xs">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Product Image on Left */}
                  <div className="md:col-span-1 flex flex-col items-center">
                    <div className="w-full aspect-square max-w-[240px] rounded-lg bg-slate-50 border border-slate-200 overflow-hidden relative group">
                      {product.image ? (
                        <img
                          src={product.image}
                          alt={product.name}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                          <Pill className="w-12 h-12 text-slate-300 mb-2" />
                          <span className="text-xs">No image provided</span>
                        </div>
                      )}

                      {isAdmin && (
                        <button
                          onClick={() => setShowImageModal(true)}
                          className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs font-semibold transition-opacity gap-1.5"
                        >
                          <ImageIcon className="w-4 h-4" />
                          <span>Replace Image</span>
                        </button>
                      )}
                    </div>
                    <span className="text-[11px] text-slate-400 mt-2 text-center">
                      Shared across all company variants
                    </span>
                  </div>

                  {/* Product Attributes Grid on Right */}
                  <div className="md:col-span-2 space-y-3.5 text-sm">
                    <div className="grid grid-cols-2 gap-4 pb-3 border-b border-slate-100">
                      <div>
                        <span className="text-xs text-slate-400 font-medium block">Generic Name</span>
                        <span className="font-bold text-slate-800 text-sm">{product.genericName}</span>
                      </div>
                      <div>
                        <span className="text-xs text-slate-400 font-medium block">Category</span>
                        <span className="font-bold text-slate-800 text-sm">{product.category}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pb-3 border-b border-slate-100">
                      <div>
                        <span className="text-xs text-slate-400 font-medium block">Dosage</span>
                        <span className="font-bold text-slate-800 text-sm">{product.dosage}</span>
                      </div>
                      <div>
                        <span className="text-xs text-slate-400 font-medium block">Form</span>
                        <span className="font-bold text-slate-800 text-sm">{product.form}</span>
                      </div>
                    </div>

                    <div className="pb-3 border-b border-slate-100">
                      <span className="text-xs text-slate-400 font-medium block mb-1">Barcode & QR Code</span>
                      <div className="flex flex-wrap items-center gap-3">
                        <div className="bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-md flex items-center gap-2">
                          <Barcode className="w-5 h-5 text-slate-700" />
                          <span className="font-mono font-bold text-slate-900 tracking-wider text-sm">
                            {product.barcode}
                          </span>
                        </div>
                        <button
                          id="overview-generate-qr-btn"
                          type="button"
                          onClick={() => handleOpenQRCode()}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-blue-50 hover:bg-blue-100/80 text-blue-700 border border-blue-200 text-xs font-bold transition-colors cursor-pointer shadow-2xs"
                          title="Generate downloadable 2D QR code label"
                        >
                          <QrCode className="w-3.5 h-3.5 text-blue-600" />
                          <span>Generate QR Code</span>
                        </button>
                      </div>
                    </div>

                    <div className="pb-3 border-b border-slate-100">
                      <span className="text-xs text-slate-400 font-medium block">Description</span>
                      <p className="text-slate-600 text-xs sm:text-sm mt-0.5 leading-relaxed">
                        {product.description || 'No detailed clinical description available.'}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-xs text-slate-400 pt-1">
                      <div>
                        <span className="block font-medium">Created At</span>
                        <span className="text-slate-600">{product.createdAt}</span>
                      </div>
                      <div>
                        <span className="block font-medium">Updated At</span>
                        <span className="text-slate-600">{product.updatedAt}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Company Variants Table matching Geometric Balance */}
              <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
                <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-bold text-slate-900">
                      Company Variants ({product.variants.length})
                    </h2>
                    <p className="text-xs text-slate-500">
                      Manufacturers producing this medicine with independent pricing and stock
                    </p>
                  </div>

                  {isAdmin && (
                    <button
                      id="details-add-variant-btn"
                      onClick={() => setShowAddVariantModal(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-md text-xs font-bold transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Variant</span>
                    </button>
                  )}
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        <th className="py-3 px-4 font-semibold">Company</th>
                        {isAdmin && <th className="py-3 px-4 font-semibold text-right">Base Cost (₦)</th>}
                        <th className="py-3 px-4 font-semibold text-right">Price Range (₦)</th>
                        <th className="py-3 px-4 font-semibold text-right">Default Price (₦)</th>
                        <th className="py-3 px-4 font-semibold text-right">Current Stock</th>
                        {isAdmin && <th className="py-3 px-4 font-semibold text-right">Reorder Level</th>}
                        <th className="py-3 px-4 font-semibold text-center">Status</th>
                        {isAdmin && <th className="py-3 px-4 font-semibold text-center">Actions</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                      {product.variants.map((v) => {
                        const isLow = v.currentStock <= v.reorderLevel;
                        const minP = v.minSellingPrice !== undefined && v.minSellingPrice > 0 ? v.minSellingPrice : (v.basePrice > 0 ? Math.max(v.basePrice + 10, Math.round(v.basePrice * 1.15)) : v.sellingPrice);
                        const maxP = v.maxSellingPrice !== undefined && v.maxSellingPrice > 0 ? v.maxSellingPrice : Math.max(v.sellingPrice, Math.round(v.sellingPrice * 1.25));
                        const defP = v.defaultSellingPrice !== undefined && v.defaultSellingPrice > 0 ? v.defaultSellingPrice : v.sellingPrice;

                        return (
                          <tr key={v.id} className="hover:bg-slate-50 transition-colors">
                            <td className="py-3.5 px-4 font-bold text-slate-900 flex items-center gap-2">
                              <Building2 className="w-4 h-4 text-blue-600" />
                              <span>{v.companyName}</span>
                            </td>

                            {isAdmin && (
                              <td className="py-3.5 px-4 text-right font-mono font-medium text-slate-600">
                                {formatNaira(v.basePrice)}
                              </td>
                            )}

                            <td className="py-3.5 px-4 text-right font-mono font-semibold text-amber-900">
                              <span className="bg-amber-50 px-2 py-0.5 rounded border border-amber-200 text-xs">
                                {formatNaira(minP)} – {formatNaira(maxP)}
                              </span>
                            </td>

                            <td className="py-3.5 px-4 text-right font-mono font-bold text-blue-900">
                              {formatNaira(defP)}
                            </td>

                            <td className="py-3.5 px-4 text-right font-mono font-semibold text-slate-800">
                              <div className="flex items-center justify-end gap-1.5">
                                {isLow && (
                                  <span className="w-2 h-2 rounded-full bg-orange-500 inline-block" title="Low stock" />
                                )}
                                <span>{formatNumber(v.currentStock)}</span>
                              </div>
                            </td>

                            {isAdmin && (
                              <td className="py-3.5 px-4 text-right font-mono text-slate-500 font-medium">
                                {v.reorderLevel}
                              </td>
                            )}

                            <td className="py-3.5 px-4 text-center">
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                                  v.status === 'Available'
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : 'bg-slate-100 text-slate-500'
                                }`}
                              >
                                {v.status}
                              </span>
                            </td>

                            {isAdmin && (
                              <td className="py-3.5 px-4 text-center">
                                <div className="flex items-center justify-center gap-1.5">
                                  <button
                                    onClick={() => handleOpenQRCode(v)}
                                    title="Generate QR Code Label for this variant"
                                    className="p-1 rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                                  >
                                    <QrCode className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => setEditingVariant({
                                      ...v,
                                      minSellingPrice: minP,
                                      defaultSellingPrice: defP,
                                      maxSellingPrice: maxP,
                                    })}
                                    title="Edit Variant"
                                    className="p-1 rounded text-slate-400 hover:text-blue-600 hover:bg-slate-100 transition-colors"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => onDeleteVariant(product.id, v.id)}
                                    disabled={product.variants.length <= 1}
                                    title={product.variants.length <= 1 ? 'A product must have at least one variant' : 'Delete Variant'}
                                    className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {/* 2. Pricing Summary Tab (Admin only) */}
          {activeTab === 'pricing' && isAdmin && (
            <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-xs space-y-6 animate-in fade-in duration-150">
              <div>
                <h2 className="text-base font-bold text-slate-900">Commercial & Pricing Summary</h2>
                <p className="text-xs text-slate-500">Margin analysis and variant pricing comparisons</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-slate-50 p-4 rounded-md border border-slate-200">
                  <span className="text-xs text-slate-500 font-medium">Total Cost Value</span>
                  <div className="text-lg font-bold font-mono text-slate-900 mt-1">{formatNaira(totalCostValue)}</div>
                  <span className="text-[11px] text-slate-400">Sum of Base Price × Stock</span>
                </div>

                <div className="bg-slate-50 p-4 rounded-md border border-slate-200">
                  <span className="text-xs text-slate-500 font-medium">Total Selling Value</span>
                  <div className="text-lg font-bold font-mono text-slate-900 mt-1">{formatNaira(totalSellingValue)}</div>
                  <span className="text-[11px] text-slate-400">Sum of Selling Price × Stock</span>
                </div>

                <div className="bg-emerald-50 p-4 rounded-md border border-emerald-200">
                  <span className="text-xs text-emerald-700 font-medium">Projected Gross Profit</span>
                  <div className="text-lg font-bold font-mono text-emerald-800 mt-1">{formatNaira(estimatedProfit)}</div>
                  <span className="text-[11px] text-emerald-600 font-semibold font-mono">
                    {totalCostValue > 0 ? `${((estimatedProfit / totalCostValue) * 100).toFixed(1)}% Markup` : '0%'}
                  </span>
                </div>
              </div>

              {/* Pricing breakdown list */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Manufacturer Margins</h3>
                <div className="space-y-2">
                  {product.variants.map(v => {
                    const margin = v.sellingPrice - v.basePrice;
                    const marginPct = v.basePrice > 0 ? ((margin / v.basePrice) * 100).toFixed(1) : '0';
                    return (
                      <div key={v.id} className="p-3 bg-slate-50 rounded-md border border-slate-200 flex items-center justify-between">
                        <div>
                          <span className="font-bold text-slate-900 text-sm">{v.companyName}</span>
                          <span className="text-xs text-slate-500 ml-2 font-mono">Cost: {formatNaira(v.basePrice)} → Selling: {formatNaira(v.sellingPrice)}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-bold font-mono text-emerald-700 bg-emerald-100/60 px-2 py-0.5 rounded">
                            +{formatNaira(margin)} ({marginPct}%)
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* 3. Stock History / Summary Tab (Admin only) */}
          {activeTab === 'stock' && isAdmin && (
            <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-xs space-y-6 animate-in fade-in duration-150">
              <div>
                <h2 className="text-base font-bold text-slate-900">Inventory Stock Status</h2>
                <p className="text-xs text-slate-500">Current on-hand inventory across all active brands</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-blue-50/50 p-4 rounded-md border border-blue-100">
                  <span className="text-xs text-blue-700 font-medium">Total On-Hand Units</span>
                  <div className="text-2xl font-black font-mono text-blue-900 mt-1">{formatNumber(totalStock)} Units</div>
                  <span className="text-[11px] text-blue-600">Across {product.variants.length} company variants</span>
                </div>

                <div className="bg-amber-50/50 p-4 rounded-md border border-amber-100">
                  <span className="text-xs text-amber-700 font-medium">Reorder Alert Status</span>
                  <div className="text-base font-bold text-amber-900 mt-1">
                    {product.variants.some(v => v.currentStock <= v.reorderLevel) 
                      ? '⚠️ Reorder Needed on Some Variants' 
                      : '✅ Stock Levels Healthy'}
                  </div>
                  <span className="text-[11px] text-amber-600">Configured per manufacturer</span>
                </div>
              </div>
            </div>
          )}

          {/* 4. Price History Tab */}
          {activeTab === 'price-history' && (
            <ProductPriceHistoryTab
              product={product}
              currentRole={currentRole}
              onPriceAdjusted={() => {
                // If variant was adjusted, we can optionally notify or reload
              }}
            />
          )}
        </div>
      </div>

      {/* Modal: Add Variant Modal */}
      {showAddVariantModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-md rounded-lg shadow-xl border border-slate-200 overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Add Company Variant</h3>
                <p className="text-xs text-slate-500">Add another manufacturer for {product.name}</p>
              </div>
              <button
                onClick={() => setShowAddVariantModal(false)}
                className="text-slate-400 hover:text-slate-600 text-xs font-semibold p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddVariantSubmit} className="p-5 space-y-4 text-xs sm:text-sm">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Company / Manufacturer *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. FIDSON, SWIPHA, CHI"
                  value={variantForm.companyName}
                  onChange={(e) => setVariantForm({ ...variantForm, companyName: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-slate-900 font-medium focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Base Price (₦) *</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={variantForm.basePrice}
                    onChange={(e) => setVariantForm({ ...variantForm, basePrice: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-slate-900 font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Default Selling (₦) *</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={variantForm.defaultSellingPrice || variantForm.sellingPrice}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      setVariantForm({ ...variantForm, defaultSellingPrice: val, sellingPrice: val });
                    }}
                    className="w-full px-3 py-2 bg-slate-50 border border-blue-200 rounded-md text-slate-900 font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Min Selling Price (₦)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Auto (Margin protected)"
                    value={variantForm.minSellingPrice || ''}
                    onChange={(e) => setVariantForm({ ...variantForm, minSellingPrice: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-slate-50 border border-amber-200 rounded-md text-amber-900 font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Max Selling Price (₦)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Auto (Ceiling price)"
                    value={variantForm.maxSellingPrice || ''}
                    onChange={(e) => setVariantForm({ ...variantForm, maxSellingPrice: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-slate-50 border border-emerald-200 rounded-md text-emerald-900 font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Current Stock *</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={variantForm.currentStock}
                    onChange={(e) => setVariantForm({ ...variantForm, currentStock: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-slate-900 font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Reorder Level *</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={variantForm.reorderLevel}
                    onChange={(e) => setVariantForm({ ...variantForm, reorderLevel: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-slate-900 font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Status</label>
                <select
                  value={variantForm.status}
                  onChange={(e) => setVariantForm({ ...variantForm, status: e.target.value as any })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-slate-900 font-medium"
                >
                  <option value="Available">Available</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddVariantModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-md text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs font-semibold shadow-xs"
                >
                  Save Variant
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Variant */}
      {editingVariant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-md rounded-lg shadow-xl border border-slate-200 overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Edit Variant: {editingVariant.companyName}</h3>
                <p className="text-xs text-slate-500">Update pricing and stock for this brand</p>
              </div>
              <button
                onClick={() => setEditingVariant(null)}
                className="text-slate-400 hover:text-slate-600 text-xs font-semibold p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEditedVariant} className="p-5 space-y-4 text-xs sm:text-sm">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Company / Manufacturer *</label>
                <input
                  type="text"
                  required
                  value={editingVariant.companyName}
                  onChange={(e) => setEditingVariant({ ...editingVariant, companyName: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-slate-900 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Base Price (₦) *</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={editingVariant.basePrice}
                    onChange={(e) => setEditingVariant({ ...editingVariant, basePrice: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-slate-900 font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Default Selling (₦) *</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={editingVariant.defaultSellingPrice || editingVariant.sellingPrice}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      setEditingVariant({ ...editingVariant, defaultSellingPrice: val, sellingPrice: val });
                    }}
                    className="w-full px-3 py-2 bg-slate-50 border border-blue-200 rounded-md text-slate-900 font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Min Selling Price (₦)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={editingVariant.minSellingPrice || ''}
                    onChange={(e) => setEditingVariant({ ...editingVariant, minSellingPrice: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-slate-50 border border-amber-200 rounded-md text-amber-900 font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Max Selling Price (₦)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={editingVariant.maxSellingPrice || ''}
                    onChange={(e) => setEditingVariant({ ...editingVariant, maxSellingPrice: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-slate-50 border border-emerald-200 rounded-md text-emerald-900 font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Current Stock *</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={editingVariant.currentStock}
                    onChange={(e) => setEditingVariant({ ...editingVariant, currentStock: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-slate-900 font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Reorder Level *</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={editingVariant.reorderLevel}
                    onChange={(e) => setEditingVariant({ ...editingVariant, reorderLevel: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-slate-900 font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Status</label>
                <select
                  value={editingVariant.status}
                  onChange={(e) => setEditingVariant({ ...editingVariant, status: e.target.value as any })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-slate-900 font-medium"
                >
                  <option value="Available">Available</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingVariant(null)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-md text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs font-semibold shadow-xs"
                >
                  Update Variant
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Replace Image */}
      {showImageModal && onUpdateImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white w-full max-w-md rounded-lg shadow-xl border border-slate-200 p-5 space-y-4">
            <h3 className="font-bold text-slate-900 text-base">Update Product Image</h3>
            <p className="text-xs text-slate-500">Provide an image URL or choose from medication samples</p>
            
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Image URL</label>
              <input
                type="text"
                placeholder="https://..."
                value={newImageInput}
                onChange={(e) => setNewImageInput(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-xs"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowImageModal(false)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-md text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onUpdateImage(product.id, newImageInput);
                  setShowImageModal(false);
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs font-semibold"
              >
                Save Image
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: QR Code Generator */}
      {showQRCodeModal && (
        <ProductQRCodeModal
          isOpen={showQRCodeModal}
          onClose={() => {
            setShowQRCodeModal(false);
            setSelectedQRVariant(null);
          }}
          product={product}
          selectedVariant={selectedQRVariant}
        />
      )}
    </div>
  );
};
