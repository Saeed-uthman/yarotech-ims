import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Trash2,
  Search,
  ShoppingCart,
  DollarSign,
  User,
  AlertCircle,
  CheckCircle2,
  Clock,
  RotateCw,
  Percent,
  Receipt,
  CreditCard,
} from 'lucide-react';
import {
  Product,
  CompanyVariant,
  Customer,
  CreateSaleInput,
  SalePaymentMethod,
  UserRole,
  Sale,
} from '../../types';
import { productService } from '../../services/productService';
import { customerService } from '../../services/customerService';
import { formatNaira } from '../../utils/formatters';

interface NewSaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newSale: Sale) => void;
  role: UserRole;
}

interface CartItem {
  variantId: string;
  productId: string;
  productName: string;
  genericName: string;
  companyName: string;
  sellingPrice: number;
  basePrice: number;
  availableStock: number;
  quantity: number;
}

export const NewSaleModal: React.FC<NewSaleModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  role,
}) => {
  if (!isOpen) return null;

  // Cart & items
  const [cart, setCart] = useState<CartItem[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [availableProducts, setAvailableProducts] = useState<Product[]>([]);
  const [allCustomers, setAllCustomers] = useState<Customer[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);

  // Customer choice
  const [customerType, setCustomerType] = useState<'walking' | 'registered'>('walking');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [customerSearch, setCustomerSearch] = useState('');

  // Payment details
  const [discount, setDiscount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<SalePaymentMethod>('CASH');
  const [amountPaid, setAmountPaid] = useState<string>('');
  const [notes, setNotes] = useState('');

  // Form states & submission
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Fetch products and registered customers on mount
  useEffect(() => {
    async function loadData() {
      setIsLoadingProducts(true);
      try {
        const [prodRes, custRes] = await Promise.all([
          productService.getProducts({ page: 1, limit: 100 }, role),
          customerService.getCustomers({ page: 1, limit: 100, status: 'active' }, role),
        ]);
        setAvailableProducts(prodRes.data);
        setAllCustomers(custRes.data);
      } catch (err: any) {
        setFormError('Failed to load products or customer list.');
      } finally {
        setIsLoadingProducts(false);
      }
    }
    loadData();
  }, [role]);

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

  // Calculations
  const subtotal = cart.reduce((sum, item) => sum + item.sellingPrice * item.quantity, 0);
  const numericDiscount = Math.max(0, Number(discount) || 0);
  const grandTotal = Math.max(0, subtotal - numericDiscount);

  // Set default amountPaid when grandTotal changes if not edited
  useEffect(() => {
    if (amountPaid === '' || Number(amountPaid) === 0) {
      setAmountPaid(String(grandTotal));
    }
  }, [grandTotal]);

  const numericAmountPaid = amountPaid === '' ? grandTotal : Number(amountPaid);
  const outstandingBalance = Math.max(0, grandTotal - numericAmountPaid);

  // Add item to cart
  const handleAddToCart = (product: Product, variant: CompanyVariant) => {
    if (variant.currentStock <= 0) return;

    setCart((prev) => {
      const existing = prev.find((item) => item.variantId === variant.id);
      if (existing) {
        if (existing.quantity >= variant.currentStock) {
          setFormError(`Cannot add more than available stock (${variant.currentStock}).`);
          return prev;
        }
        return prev.map((item) =>
          item.variantId === variant.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      } else {
        return [
          ...prev,
          {
            variantId: variant.id,
            productId: product.id,
            productName: product.name,
            genericName: product.genericName,
            companyName: variant.companyName,
            sellingPrice: variant.sellingPrice,
            basePrice: variant.basePrice,
            availableStock: variant.currentStock,
            quantity: 1,
          },
        ];
      }
    });
    setProductSearch('');
    setFormError(null);
  };

  // Update item quantity
  const handleUpdateQuantity = (variantId: string, newQty: number) => {
    if (newQty <= 0) {
      handleRemoveItem(variantId);
      return;
    }
    setCart((prev) =>
      prev.map((item) => {
        if (item.variantId === variantId) {
          const clamped = Math.min(newQty, item.availableStock);
          if (newQty > item.availableStock) {
            setFormError(`Stock limit reached for ${item.productName} (${item.availableStock}).`);
          } else {
            setFormError(null);
          }
          return { ...item, quantity: clamped };
        }
        return item;
      })
    );
  };

  // Remove item from cart
  const handleRemoveItem = (variantId: string) => {
    setCart((prev) => prev.filter((item) => item.variantId !== variantId));
  };

  // Handle Complete Sale Submission
  const handleSubmitSale = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // 1. Validation: Cart not empty
    if (cart.length === 0) {
      setFormError('Please add at least one product to the sale.');
      return;
    }

    // 2. Validation: Customer selection & walking customer credit rule
    if (customerType === 'registered' && !selectedCustomerId) {
      setFormError('Please select a registered customer from the list.');
      return;
    }

    if (customerType === 'walking' && outstandingBalance > 0) {
      setFormError(
        'Walking Customers cannot be given credit. Please record full payment or select a Registered Customer.'
      );
      return;
    }

    if (numericAmountPaid > grandTotal) {
      setFormError(`Amount paid cannot exceed the grand total (₦${grandTotal.toLocaleString()}).`);
      return;
    }

    // 3. Prepare payload
    const payload: CreateSaleInput = {
      customerId: customerType === 'registered' ? selectedCustomerId : null,
      items: cart.map((c) => ({
        productVariantId: c.variantId,
        quantity: c.quantity,
      })),
      discount: numericDiscount,
      amountPaid: numericAmountPaid,
      paymentMethod,
      notes: notes.trim() || undefined,
      servedBy: role === 'admin' ? 'Pharm. Abdullahi (Admin)' : 'Cashier Zainab',
    };

    setIsSubmitting(true);

    try {
      const { salesService } = await import('../../services/salesService');
      const response = await salesService.createSale(payload, role);
      if (response.success && response.data) {
        onSuccess(response.data);
      } else {
        setFormError(response.message || 'Failed to complete sale transaction.');
      }
    } catch (err: any) {
      setFormError(err.message || 'An unexpected error occurred while processing the sale.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedCustomer = allCustomers.find((c) => c.id === selectedCustomerId);

  return (
    <div
      id="new-sale-modal"
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4"
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-4xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center">
              <ShoppingCart className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight text-white">
                Record New Sale / Dispense Prescription
              </h2>
              <p className="text-xs text-slate-400">
                Point-of-Sale with automatic stock deduction and debt sync
              </p>
            </div>
          </div>

          <button
            id="close-new-sale-modal-btn"
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form Scroll Area */}
        <form onSubmit={handleSubmitSale} className="flex-1 overflow-y-auto p-6 space-y-6">
          {formError && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {/* Section 1: Add Products & Cart */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                1. Select Products to Dispense
              </h3>
              <span className="text-xs text-slate-500 font-medium">
                {cart.length} item(s) in checkout
              </span>
            </div>

            {/* Product Autocomplete Input */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Search className="w-4 h-4" />
              </div>
              <input
                id="sale-product-search-input"
                type="text"
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                placeholder="Search drug by brand name, generic name, or manufacturer..."
                className="w-full pl-9.5 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
              />

              {/* Autocomplete Dropdown List */}
              {productSearch.trim() && (
                <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-56 overflow-y-auto divide-y divide-slate-100">
                  {filteredVariants.length > 0 ? (
                    filteredVariants.map(({ product, variant }) => {
                      const isOutOfStock = variant.currentStock <= 0;
                      return (
                        <button
                          key={variant.id}
                          id={`select-variant-${variant.id}`}
                          type="button"
                          disabled={isOutOfStock}
                          onClick={() => handleAddToCart(product, variant)}
                          className={`w-full text-left p-3 flex items-center justify-between transition-colors ${
                            isOutOfStock
                              ? 'opacity-50 cursor-not-allowed bg-slate-50'
                              : 'hover:bg-blue-50/60'
                          }`}
                        >
                          <div>
                            <div className="font-semibold text-xs text-slate-900">
                              {product.name}{' '}
                              <span className="font-normal text-slate-500">
                                ({variant.companyName})
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-400 italic">
                              {product.genericName} • {product.dosage} • {product.form}
                            </div>
                          </div>

                          <div className="text-right">
                            <div className="font-bold text-xs text-slate-900">
                              {formatNaira(variant.sellingPrice)}
                            </div>
                            <div
                              className={`text-[10px] font-semibold ${
                                isOutOfStock ? 'text-rose-600' : 'text-emerald-700'
                              }`}
                            >
                              {isOutOfStock
                                ? 'Out of Stock'
                                : `In Stock: ${variant.currentStock} units`}
                            </div>
                          </div>
                        </button>
                      );
                    })
                  ) : (
                    <div className="p-4 text-center text-xs text-slate-400">
                      No matching products in inventory.
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Cart Table */}
            {cart.length > 0 ? (
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase">
                    <tr>
                      <th className="py-2.5 px-3">Item</th>
                      <th className="py-2.5 px-3">Company</th>
                      <th className="py-2.5 px-3 text-center">Quantity</th>
                      <th className="py-2.5 px-3 text-right">Unit Price</th>
                      <th className="py-2.5 px-3 text-right">Subtotal</th>
                      <th className="py-2.5 px-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {cart.map((item) => (
                      <tr key={item.variantId} className="hover:bg-slate-50/50">
                        <td className="py-2.5 px-3">
                          <div className="font-bold text-slate-900">{item.productName}</div>
                          <div className="text-[10px] text-slate-400">{item.genericName}</div>
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="px-1.5 py-0.5 rounded-sm bg-slate-100 text-[10px] font-semibold text-slate-700">
                            {item.companyName}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <div className="inline-flex items-center gap-1.5 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                            <button
                              type="button"
                              onClick={() => handleUpdateQuantity(item.variantId, item.quantity - 1)}
                              className="font-bold text-slate-600 hover:text-slate-900 px-1"
                            >
                              -
                            </button>
                            <span className="font-bold text-slate-900 w-6 text-center">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleUpdateQuantity(item.variantId, item.quantity + 1)}
                              className="font-bold text-slate-600 hover:text-slate-900 px-1"
                            >
                              +
                            </button>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-right font-medium text-slate-700">
                          {formatNaira(item.sellingPrice)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                          {formatNaira(item.sellingPrice * item.quantity)}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(item.variantId)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded-md transition-colors"
                            title="Remove Item"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-6 border border-dashed border-slate-200 rounded-xl text-center text-xs text-slate-400">
                Cart is empty. Search and add products above.
              </div>
            )}
          </div>

          {/* Section 2: Customer Selection */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              2. Customer Type & Assignment
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Walking Customer Option */}
              <label
                id="select-walking-customer-option"
                className={`p-3.5 rounded-xl border cursor-pointer flex items-start gap-3 transition-all ${
                  customerType === 'walking'
                    ? 'border-blue-500 bg-blue-50/50 shadow-xs ring-1 ring-blue-500'
                    : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}
              >
                <input
                  type="radio"
                  name="customerType"
                  checked={customerType === 'walking'}
                  onChange={() => {
                    setCustomerType('walking');
                    setSelectedCustomerId('');
                  }}
                  className="mt-0.5 text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <div className="font-bold text-xs text-slate-900">Walking Customer</div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Anonymous counter customer. Requires 100% payment at checkout.
                  </p>
                </div>
              </label>

              {/* Registered Customer Option */}
              <label
                id="select-registered-customer-option"
                className={`p-3.5 rounded-xl border cursor-pointer flex items-start gap-3 transition-all ${
                  customerType === 'registered'
                    ? 'border-blue-500 bg-blue-50/50 shadow-xs ring-1 ring-blue-500'
                    : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}
              >
                <input
                  type="radio"
                  name="customerType"
                  checked={customerType === 'registered'}
                  onChange={() => setCustomerType('registered')}
                  className="mt-0.5 text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <div className="font-bold text-xs text-slate-900">Registered Customer</div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Linked to customer profile. Supports credit sales and debt tracking.
                  </p>
                </div>
              </label>
            </div>

            {/* Registered Customer Dropdown Selector */}
            {customerType === 'registered' && (
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2 animate-in fade-in duration-150">
                <label className="text-xs font-semibold text-slate-700 block">
                  Select Registered Customer:
                </label>
                <select
                  id="registered-customer-select"
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Choose Customer --</option>
                  {allCustomers.map((cust) => (
                    <option key={cust.id} value={cust.id}>
                      {cust.name} ({cust.phone}) • Current Debt: {formatNaira(cust.outstandingDebt)}
                    </option>
                  ))}
                </select>

                {selectedCustomer && (
                  <div className="flex items-center justify-between text-[11px] text-slate-600 bg-white p-2 rounded-md border border-slate-200 mt-1">
                    <span>
                      Selected: <strong>{selectedCustomer.name}</strong> ({selectedCustomer.phone})
                    </span>
                    <span className="font-semibold text-amber-700">
                      Existing Balance: {formatNaira(selectedCustomer.outstandingDebt)}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Section 3: Payment & Summary */}
          <div className="space-y-4 pt-2 border-t border-slate-100">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              3. Payment & Settlement
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Left: Payment Method & Notes */}
              <div className="space-y-3 text-xs">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Payment Method:
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {(['CASH', 'TRANSFER', 'POS', 'CREDIT'] as SalePaymentMethod[]).map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => {
                          setPaymentMethod(m);
                          if (m === 'CREDIT') {
                            setAmountPaid('0');
                          } else if (Number(amountPaid) === 0) {
                            setAmountPaid(String(grandTotal));
                          }
                        }}
                        className={`px-3 py-2 rounded-lg text-xs font-semibold border transition-all text-center ${
                          paymentMethod === m
                            ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Notes / Prescription Memo (Optional):
                  </label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g. Dr. Adamu prescription, take 1 tab BD"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                  />
                </div>
              </div>

              {/* Right: Amounts & Totals Card */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Items Subtotal:</span>
                  <span className="font-bold text-slate-800">{formatNaira(subtotal)}</span>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-600">Discount (₦):</span>
                  <input
                    type="number"
                    min="0"
                    max={subtotal}
                    value={discount || ''}
                    onChange={(e) => setDiscount(Math.max(0, Number(e.target.value)))}
                    placeholder="0"
                    className="w-28 px-2 py-1 bg-white border border-slate-300 rounded text-right text-xs font-semibold text-slate-800"
                  />
                </div>

                <div className="flex justify-between font-extrabold text-sm text-slate-900 pt-2 border-t border-slate-200">
                  <span>Grand Total:</span>
                  <span className="text-base text-blue-700">{formatNaira(grandTotal)}</span>
                </div>

                <div className="pt-2 border-t border-slate-200 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-slate-700">Amount Paid (₦):</span>
                    <input
                      id="sale-amount-paid-input"
                      type="number"
                      min="0"
                      max={grandTotal}
                      value={amountPaid}
                      onChange={(e) => setAmountPaid(e.target.value)}
                      className="w-32 px-2 py-1 bg-white border border-slate-300 rounded text-right text-xs font-bold text-emerald-700 focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  {/* Quick amount helper buttons */}
                  <div className="flex items-center justify-end gap-1.5 pt-1">
                    <button
                      type="button"
                      onClick={() => setAmountPaid(String(grandTotal))}
                      className="px-2 py-0.5 bg-slate-200 hover:bg-slate-300 rounded text-[10px] font-semibold text-slate-700"
                    >
                      Full Amount
                    </button>
                    {customerType === 'registered' && (
                      <>
                        <button
                          type="button"
                          onClick={() => setAmountPaid(String(Math.round(grandTotal / 2)))}
                          className="px-2 py-0.5 bg-slate-200 hover:bg-slate-300 rounded text-[10px] font-semibold text-slate-700"
                        >
                          50% Deposit
                        </button>
                        <button
                          type="button"
                          onClick={() => setAmountPaid('0')}
                          className="px-2 py-0.5 bg-rose-100 hover:bg-rose-200 text-rose-800 rounded text-[10px] font-semibold"
                        >
                          ₦0 (Credit)
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {outstandingBalance > 0 && (
                  <div className="pt-2 border-t border-dashed border-amber-300 flex justify-between text-amber-800 font-bold">
                    <span>Balance to Credit:</span>
                    <span>{formatNaira(outstandingBalance)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-semibold transition-colors disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              id="confirm-complete-sale-btn"
              type="submit"
              disabled={isSubmitting || cart.length === 0}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <RotateCw className="w-4 h-4 animate-spin" />
                  <span>Processing Sale...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Complete Sale ({formatNaira(grandTotal)})</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
