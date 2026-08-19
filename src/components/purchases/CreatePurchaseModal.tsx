import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Trash2,
  Search,
  PackageCheck,
  DollarSign,
  AlertCircle,
  RotateCw,
  Calendar,
  Layers,
  Building2,
  FileText,
} from 'lucide-react';
import {
  Product,
  CompanyVariant,
  CreatePurchaseInput,
  CreatePurchaseItemInput,
  PurchasePaymentMethod,
  UserRole,
  StockPurchase,
} from '../../types';
import { productService } from '../../services/productService';
import { purchaseService } from '../../services/purchaseService';
import { formatNaira, formatNumber } from '../../utils/formatters';

interface CreatePurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newPurchase: StockPurchase) => void;
  role: UserRole;
}

interface PurchaseDraftItem {
  variantId: string;
  productId: string;
  productName: string;
  genericName: string;
  companyName: string;
  dosage: string;
  form: string;
  currentStock: number;
  currentBasePrice: number;
  quantity: number;
  unitPurchasePrice: number;
}

export const CreatePurchaseModal: React.FC<CreatePurchaseModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  role,
}) => {
  // Selected items draft
  const [items, setItems] = useState<PurchaseDraftItem[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [availableProducts, setAvailableProducts] = useState<Product[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);

  // Purchase metadata
  const [purchaseDate, setPurchaseDate] = useState('2026-08-19');
  const [paymentMethod, setPaymentMethod] = useState<PurchasePaymentMethod>('TRANSFER');
  const [note, setNote] = useState('');
  const [recordedBy, setRecordedBy] = useState('Pharm. Abdullahi (Admin)');

  // Form states & submission
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Fetch available products and their company variants on mount / when open
  useEffect(() => {
    if (!isOpen) return;
    async function loadProducts() {
      setIsLoadingProducts(true);
      try {
        const res = await productService.getProducts({ page: 1, limit: 100 }, role);
        setAvailableProducts(res.data);
      } catch (err: any) {
        setFormError('Failed to load products list.');
      } finally {
        setIsLoadingProducts(false);
      }
    }
    loadProducts();
  }, [role, isOpen]);

  if (!isOpen) return null;

  // Flatten all variants from products
  const flatVariants = availableProducts.flatMap((p) =>
    (p.variants || []).map((v) => ({
      variant: v,
      product: p,
    }))
  );

  // Filtered variant search
  const filteredVariants = flatVariants.filter(({ product, variant }) => {
    if (!productSearch.trim()) return false;
    const q = productSearch.toLowerCase();
    return (
      product.name.toLowerCase().includes(q) ||
      product.genericName.toLowerCase().includes(q) ||
      variant.companyName.toLowerCase().includes(q)
    );
  });

  // Add a variant into the purchase draft
  const handleAddVariant = (product: Product, variant: CompanyVariant) => {
    const existingIndex = items.findIndex((it) => it.variantId === variant.id);
    if (existingIndex >= 0) {
      // Increase quantity of existing item
      const updated = [...items];
      updated[existingIndex].quantity += 50;
      setItems(updated);
    } else {
      // Add new line item
      const newItem: PurchaseDraftItem = {
        variantId: variant.id,
        productId: product.id,
        productName: product.name,
        genericName: product.genericName,
        companyName: variant.companyName,
        dosage: product.dosage,
        form: product.form,
        currentStock: variant.currentStock,
        currentBasePrice: variant.basePrice || 0,
        quantity: 50,
        unitPurchasePrice: variant.basePrice || 500,
      };
      setItems([...items, newItem]);
    }
    setProductSearch('');
  };

  // Update item quantity
  const handleUpdateQuantity = (index: number, val: number) => {
    const updated = [...items];
    const qty = Math.max(1, Math.round(val || 1));
    updated[index].quantity = qty;
    setItems(updated);
  };

  // Update item unit purchase price
  const handleUpdatePrice = (index: number, val: number) => {
    const updated = [...items];
    const price = Math.max(0, val || 0);
    updated[index].unitPurchasePrice = price;
    setItems(updated);
  };

  // Remove line item
  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  // Calculations
  const grandTotal = items.reduce(
    (sum, item) => sum + item.quantity * item.unitPurchasePrice,
    0
  );
  const totalUnits = items.reduce((sum, item) => sum + item.quantity, 0);

  // Submit stock purchase
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (items.length === 0) {
      setFormError('Please add at least one medicine item to this purchase order.');
      return;
    }

    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (!it.quantity || it.quantity <= 0) {
        setFormError(`Item #${i + 1} (${it.productName}) has an invalid quantity.`);
        return;
      }
      if (!it.unitPurchasePrice || it.unitPurchasePrice <= 0) {
        setFormError(`Item #${i + 1} (${it.productName}) has an invalid purchase price.`);
        return;
      }
    }

    setFormError(null);
    setIsSubmitting(true);

    try {
      const payload: CreatePurchaseInput = {
        purchaseDate,
        paymentMethod,
        note: note.trim() || undefined,
        recordedBy,
        items: items.map((it) => ({
          productVariantId: it.variantId,
          quantity: it.quantity,
          unitPurchasePrice: it.unitPurchasePrice,
        })),
      };

      const res = await purchaseService.createPurchase(payload, role);
      if (res.success && res.data) {
        onSuccess(res.data);
      } else {
        setFormError(res.message || 'Failed to record stock purchase.');
      }
    } catch (err: any) {
      setFormError(err.message || 'Error occurred while recording stock purchase.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      id="create-purchase-modal"
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150"
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-xs">
              <PackageCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold tracking-tight">
                Record Stock Purchase (Restock)
              </h2>
              <p className="text-xs text-slate-300">
                Log procurement of medicines, increment live inventory, and update unit base costs.
              </p>
            </div>
          </div>

          <button
            id="close-create-purchase-modal-btn"
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1">
          {/* Error Banner */}
          {formError && (
            <div
              id="create-purchase-error-alert"
              className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-semibold flex items-center gap-2"
            >
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {/* Top Configuration Strip: Date, Payment Method, Recorded By */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
            {/* Purchase Date */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                <span>Purchase Date</span>
              </label>
              <input
                id="purchase-input-date"
                type="date"
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Payment Method */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-slate-500" />
                <span>Payment Method</span>
              </label>
              <select
                id="purchase-input-payment-method"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as PurchasePaymentMethod)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="TRANSFER">Bank Transfer</option>
                <option value="CASH">Cash</option>
                <option value="POS">POS / Card</option>
              </select>
            </div>

            {/* Recorded By */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-slate-500" />
                <span>Recorded By</span>
              </label>
              <input
                id="purchase-input-recorded-by"
                type="text"
                value={recordedBy}
                onChange={(e) => setRecordedBy(e.target.value)}
                placeholder="Staff / Pharmacist Name"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Medicine Search & Variant Selector */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Search & Add Medicines to Restock Order
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Search className="w-4 h-4" />
              </div>
              <input
                id="purchase-product-search"
                type="text"
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                placeholder="Type medicine name or manufacturer (e.g. Paracetamol, Amoxicillin, Emzor, Swipha)..."
                className="w-full pl-9.5 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
              />
            </div>

            {/* Live Search Results Dropdown */}
            {productSearch.trim() && (
              <div
                id="purchase-search-results"
                className="bg-white border border-slate-200 rounded-xl shadow-lg max-h-56 overflow-y-auto p-1 divide-y divide-slate-100 animate-in fade-in duration-100"
              >
                {filteredVariants.length === 0 ? (
                  <div className="p-3 text-center text-xs text-slate-500">
                    No matching medicine or manufacturer found.
                  </div>
                ) : (
                  filteredVariants.map(({ product, variant }) => (
                    <button
                      key={variant.id}
                      type="button"
                      onClick={() => handleAddVariant(product, variant)}
                      className="w-full text-left p-2.5 hover:bg-indigo-50/70 rounded-lg transition-colors flex items-center justify-between group"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs sm:text-sm text-slate-900">
                            {product.name}
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                            {variant.companyName}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {product.genericName} • {product.dosage} {product.form}
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="text-xs font-semibold text-slate-800">
                          Base Cost: {formatNaira(variant.basePrice || 0)}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          Live Stock: {variant.currentStock} units
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Selected Purchase Line Items List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-indigo-600" />
                <span>Restock Order Items ({items.length})</span>
              </h3>
              {items.length > 0 && (
                <button
                  type="button"
                  onClick={() => setItems([])}
                  className="text-xs text-rose-600 hover:text-rose-800 font-medium"
                >
                  Clear All
                </button>
              )}
            </div>

            {items.length === 0 ? (
              <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center text-slate-400">
                <PackageCheck className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                <p className="text-xs font-medium text-slate-500">
                  No medicines added to this restock order yet.
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Use the search box above to add products with their respective manufacturers.
                </p>
              </div>
            ) : (
              <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
                {items.map((item, index) => {
                  const lineSubtotal = item.quantity * item.unitPurchasePrice;

                  return (
                    <div
                      key={item.variantId}
                      id={`purchase-item-row-${index}`}
                      className="p-3.5 bg-white hover:bg-slate-50/50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      {/* Product details */}
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs sm:text-sm text-slate-900">
                            {item.productName}
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                            {item.companyName}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {item.genericName} • {item.dosage} {item.form} • Current Live Stock:{' '}
                          <strong className="text-slate-700">{item.currentStock}</strong>
                        </div>
                      </div>

                      {/* Inputs: Quantity & Unit Price */}
                      <div className="flex items-center gap-3 shrink-0">
                        {/* Quantity */}
                        <div className="w-24">
                          <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-0.5">
                            Quantity
                          </label>
                          <input
                            type="number"
                            min="1"
                            step="1"
                            value={item.quantity}
                            onChange={(e) =>
                              handleUpdateQuantity(index, parseInt(e.target.value, 10))
                            }
                            className="w-full px-2 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-900 text-center focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>

                        {/* Unit Purchase Price */}
                        <div className="w-32">
                          <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-0.5">
                            Unit Price (₦)
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={item.unitPurchasePrice}
                            onChange={(e) =>
                              handleUpdatePrice(index, parseFloat(e.target.value))
                            }
                            className="w-full px-2 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-900 text-right focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>

                        {/* Line Subtotal */}
                        <div className="w-28 text-right">
                          <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-0.5">
                            Subtotal
                          </label>
                          <div className="text-xs font-black text-indigo-950 py-1.5">
                            {formatNaira(lineSubtotal)}
                          </div>
                        </div>

                        {/* Remove button */}
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(index)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors mt-3 sm:mt-0"
                          title="Remove item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Accountability Note */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-slate-500" />
              <span>Accountability Notes / Reason for Purchase</span>
            </label>
            <textarea
              id="purchase-input-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g., Weekly wholesale market restock from distributor, emergency antibiotic stock-in, direct manufacturer delivery..."
              rows={2}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
            />
          </div>

          {/* Live Order Summary & Inventory Callout Box */}
          <div className="bg-indigo-950 text-white rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs text-indigo-300 font-medium">Total Items:</span>
                <strong className="text-sm font-bold text-white">{items.length} line(s)</strong>
                <span className="text-indigo-400">•</span>
                <span className="text-xs text-indigo-300 font-medium">Total Units:</span>
                <strong className="text-sm font-bold text-emerald-400">
                  {formatNumber(totalUnits)} units
                </strong>
              </div>
              <p className="text-[11px] text-indigo-200">
                Saving this order will immediately update the live stock count and reset variant base cost.
              </p>
            </div>

            <div className="text-right">
              <div className="text-xs text-indigo-300 font-medium uppercase tracking-wider">
                Total Capital Outflow
              </div>
              <div className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                {formatNaira(grandTotal)}
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 border-t border-slate-200 px-5 py-4 flex items-center justify-end gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 rounded-xl transition-colors disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            id="submit-create-purchase-btn"
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || items.length === 0}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs sm:text-sm font-bold rounded-xl shadow-xs hover:shadow-md transition-all"
          >
            {isSubmitting ? (
              <>
                <RotateCw className="w-4 h-4 animate-spin" />
                <span>Processing Restock...</span>
              </>
            ) : (
              <>
                <PackageCheck className="w-4 h-4" />
                <span>Complete Purchase Order</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
