import React, { useState, useEffect } from 'react';
import {
  X,
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
  Camera,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  Tag,
  ScanBarcode,
  Plus,
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
import { useAuth } from '../../hooks/useAuth';
import { BarcodeScannerModal } from '../common/BarcodeScannerModal';
import { PhotoSearchModal } from '../common/PhotoSearchModal';
import { useHardwareBarcodeScanner } from '../../hooks/useHardwareBarcodeScanner';
import { scannerAudio } from '../../utils/scannerAudio';
import { ApiError } from '../../services/apiClient';

function localToday(): string {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

interface CreatePurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newPurchase: StockPurchase) => void;
  role: UserRole;
  onCreateProductWithBarcode?: (barcode: string) => void;
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
  batchNumber: string;
  serialNumbers?: string;
  newSellingPrice: number;
  newMinSellingPrice?: number;
  newMaxSellingPrice?: number;
  showPriceRange?: boolean;
  updateCatalogPrices?: boolean;
}

export const CreatePurchaseModal: React.FC<CreatePurchaseModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  role,
  onCreateProductWithBarcode,
}) => {
  const { user } = useAuth();
  // Selected items draft
  const [items, setItems] = useState<PurchaseDraftItem[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [availableProducts, setAvailableProducts] = useState<Product[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [productSearchError, setProductSearchError] = useState<string | null>(null);

  // Purchase metadata
  const [purchaseDate, setPurchaseDate] = useState(localToday);
  const [paymentMethod, setPaymentMethod] = useState<PurchasePaymentMethod>('TRANSFER');
  const [amountPaid, setAmountPaid] = useState('');
  const [note, setNote] = useState('');
  const [supplierName, setSupplierName] = useState('');
  const recordedBy = user?.fullName || 'Current administrator';

  // Form states & submission
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Camera & hardware scanner states
  const [scannerOpen, setScannerOpen] = useState(false);
  const [photoOpen, setPhotoOpen] = useState(false);
  const [scannerInitialProduct, setScannerInitialProduct] = useState<Product | undefined>(undefined);
  const [unrecognizedBarcode, setUnrecognizedBarcode] = useState<string | null>(null);
  const [scanSuccessMessage, setScanSuccessMessage] = useState<string | null>(null);
  const [serialScanBuffers, setSerialScanBuffers] = useState<Record<string, string>>({});

  // Reset the purchase draft whenever the modal opens. Products are searched
  // on demand so results are not restricted to the first catalogue page.
  useEffect(() => {
    if (!isOpen) return;
    setItems([]);
    setProductSearch('');
    setAvailableProducts([]);
    setProductSearchError(null);
    setPurchaseDate(localToday());
    setPaymentMethod('TRANSFER');
    setAmountPaid('');
    setNote('');
    setSupplierName('');
    setFormError(null);
      setScannerOpen(false);
      setPhotoOpen(false);
      setScannerInitialProduct(undefined);
      setUnrecognizedBarcode(null);
      setScanSuccessMessage(null);
      setSerialScanBuffers({});
  }, [role, isOpen]);

  // Search Django after a short pause in typing and collect every matching
  // page. Cleanup prevents an older request from replacing a newer query.
  useEffect(() => {
    const query = productSearch.trim();
    if (!isOpen || !query) {
      setAvailableProducts([]);
      setIsLoadingProducts(false);
      setProductSearchError(null);
      return;
    }

    let cancelled = false;
    setIsLoadingProducts(true);
    setProductSearchError(null);

    const timerId = window.setTimeout(async () => {
      try {
        const matches: Product[] = [];
        let page = 1;
        let lastPage = 1;

        do {
          const response = await productService.searchProducts(
            query,
            {
              page,
              limit: 100,
              sortBy: 'name',
              sortOrder: 'asc',
            },
            role
          );

          if (cancelled) return;
          matches.push(...(response.data || []));
          lastPage = response.meta?.lastPage || 1;
          page += 1;
        } while (page <= lastPage);

        if (!cancelled) setAvailableProducts(matches);
      } catch {
        if (!cancelled) {
          setAvailableProducts([]);
          setProductSearchError('Product search failed. Check the API connection and try again.');
        }
      } finally {
        if (!cancelled) setIsLoadingProducts(false);
      }
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timerId);
    };
  }, [isOpen, productSearch, role]);

  // Handle hardware barcode or serial lookup (1 unit per scan during restock)
  const handleHardwareBarcodeScan = async (rawCode: string) => {
    const code = rawCode.trim();
    if (!code || !isOpen) return;

    setUnrecognizedBarcode(null);
    setFormError(null);

    try {
      const response = await productService.getProductByBarcodeExact(code);
      if (!response.success || !response.data) {
        throw new Error('Product lookup failed.');
      }
      const found = response.data;
      if (found.status !== 'Active') {
        scannerAudio.playError();
        setFormError(`${found.name} is inactive. Activate it in the catalogue first.`);
        return;
      }

      const activeVariants = (found.variants || []).filter((v) => v.status === 'Available');
      if (activeVariants.length === 0) {
        scannerAudio.playError();
        setFormError(`${found.name} has no active manufacturer variants available.`);
        return;
      }

      // If matched via a specific variant's serial number or has a single active variant, auto-add 1 unit
      const matchedVariant = found.matchedVariantId
        ? activeVariants.find((v) => String(v.id) === String(found.matchedVariantId))
        : activeVariants.length === 1
          ? activeVariants[0]
          : undefined;

      if (matchedVariant) {
        scannerAudio.playSuccess();
        handleAddVariant(found, matchedVariant, 1);
        setScanSuccessMessage(`Scanned: ${found.name} (${matchedVariant.companyName}) +1 unit`);
        setTimeout(() => setScanSuccessMessage(null), 3000);
      } else {
        // Multiple active variants: open quick variant picker modal
        scannerAudio.playSuccess();
        setScannerInitialProduct(found);
        setScannerOpen(true);
        setProductSearch('');
      }
    } catch (err) {
      scannerAudio.playError();
      if (err instanceof ApiError && err.status === 404) {
        setUnrecognizedBarcode(code);
        setFormError(`No product in the catalog matches barcode "${code}".`);
      } else {
        setFormError(`Could not find product for barcode "${code}".`);
      }
    }
  };

  const { isScannerReady } = useHardwareBarcodeScanner({
    enabled: isOpen && !scannerOpen && !photoOpen,
    onScan: handleHardwareBarcodeScan,
  });

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
    const q = productSearch.toLowerCase().trim();
    return (
      product.name.toLowerCase().includes(q) ||
      product.genericName.toLowerCase().includes(q) ||
      product.barcode.toLowerCase().includes(q) ||
      variant.companyName.toLowerCase().includes(q)
    );
  });

  // Add a variant into the purchase draft (defaults to 1 unit per scan/click)
  const handleAddVariant = (product: Product, variant: CompanyVariant, quantity = 1) => {
    setItems(previous => {
      const existing = previous.find(item => item.variantId === variant.id);
      if (existing) {
        return previous.map(item => item.variantId === variant.id
          ? { ...item, quantity: item.quantity + quantity } : item);
      }
      const initialSellingPrice = variant.defaultSellingPrice || (variant as any).sellingPrice || (variant.basePrice ? Math.round(variant.basePrice * 1.25) : 0);
      const initialMinPrice = variant.minSellingPrice || (variant.basePrice ? Math.round(variant.basePrice * 1.05) : 0);
      const initialMaxPrice = variant.maxSellingPrice || (variant.basePrice ? Math.round(variant.basePrice * 1.4) : 0);

      return [...previous, {
        variantId: variant.id,
        productId: product.id,
        productName: product.name,
        genericName: product.genericName,
        companyName: variant.companyName,
        dosage: product.dosage,
        form: product.form,
        currentStock: variant.currentStock,
        currentBasePrice: variant.basePrice || 0,
        quantity,
        unitPurchasePrice: variant.basePrice || 0,
        batchNumber: '',
        newSellingPrice: initialSellingPrice,
        newMinSellingPrice: initialMinPrice,
        newMaxSellingPrice: initialMaxPrice,
        showPriceRange: false,
        updateCatalogPrices: true,
      }];
    });
    setProductSearch('');
    setFormError(null);
  };

  const handleUpdateSellingPrice = (index: number, val: number) => {
    const updated = [...items];
    const price = Math.max(0, val || 0);
    updated[index].newSellingPrice = price;
    setItems(updated);
  };

  const handleUpdateMinPrice = (index: number, val: number) => {
    const updated = [...items];
    updated[index].newMinSellingPrice = Math.max(0, val || 0);
    setItems(updated);
  };

  const handleUpdateMaxPrice = (index: number, val: number) => {
    const updated = [...items];
    updated[index].newMaxSellingPrice = Math.max(0, val || 0);
    setItems(updated);
  };

  const handleTogglePriceRange = (index: number) => {
    const updated = [...items];
    updated[index].showPriceRange = !updated[index].showPriceRange;
    setItems(updated);
  };

  const handleToggleCatalogUpdate = (index: number) => {
    const updated = [...items];
    updated[index].updateCatalogPrices = !(updated[index].updateCatalogPrices ?? true);
    setItems(updated);
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

  const handleUpdateBatch = (index: number, field: 'batchNumber' | 'serialNumbers', value: string) => {
    const updated = [...items];
    updated[index][field] = value;
    setItems(updated);
  };

  // Append a scanned serial sticker from the carton into the line item's serialNumbers list
  // and auto-sync quantity if the count of scanned serials exceeds current quantity.
  const handleAppendScannedSerial = (index: number, rawSerial: string) => {
    const cleanSerial = rawSerial.trim();
    if (!cleanSerial) return;

    setItems((prev) => {
      const updated = [...prev];
      const item = { ...updated[index] };
      const existingList = (item.serialNumbers || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      if (existingList.some((s) => s.toLowerCase() === cleanSerial.toLowerCase())) {
        scannerAudio.playError();
        setFormError(`Serial / MAC "${cleanSerial}" is already scanned on ${item.productName}.`);
        return prev;
      }

      const nextList = [...existingList, cleanSerial];
      item.serialNumbers = nextList.join(', ');
      if (nextList.length > item.quantity) {
        item.quantity = nextList.length;
      }
      updated[index] = item;
      scannerAudio.playSuccess();
      setFormError(null);
      setScanSuccessMessage(`Serial "${cleanSerial}" added to ${item.productName} (${nextList.length} total)`);
      setTimeout(() => setScanSuccessMessage(null), 2500);
      return updated;
    });
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
  const effectiveAmountPaid = amountPaid === '' ? grandTotal : Number(amountPaid);
  const outstandingAmount = Math.max(0, grandTotal - (Number.isFinite(effectiveAmountPaid) ? effectiveAmountPaid : 0));
  const paymentStatus = outstandingAmount === 0 ? 'Paid' : effectiveAmountPaid > 0 ? 'Partially paid' : 'Unpaid';

  // Submit stock purchase
  const handleSubmit = async () => {
    if (isSubmitting) return;

    if (items.length === 0) {
      setFormError('Please add at least one product item to this purchase order.');
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
      if (it.updateCatalogPrices && it.newSellingPrice !== undefined && it.newSellingPrice > 0) {
        if (it.newSellingPrice <= it.unitPurchasePrice) {
          setFormError(`Item #${i + 1} (${it.productName}): Selling price must be greater than unit purchase cost.`);
          return;
        }
        if (it.newMinSellingPrice !== undefined && it.newMinSellingPrice > 0) {
          if (it.newMinSellingPrice <= it.unitPurchasePrice) {
            setFormError(`Item #${i + 1} (${it.productName}): Minimum selling price must be greater than unit cost.`);
            return;
          }
          if (it.newMinSellingPrice > it.newSellingPrice) {
            setFormError(`Item #${i + 1} (${it.productName}): Minimum selling price cannot exceed default selling price.`);
            return;
          }
        }
        if (it.newMaxSellingPrice !== undefined && it.newMaxSellingPrice > 0 && it.newMaxSellingPrice < it.newSellingPrice) {
          setFormError(`Item #${i + 1} (${it.productName}): Maximum selling price cannot be less than default selling price.`);
          return;
        }
      }
    }
    if (!Number.isFinite(effectiveAmountPaid) || effectiveAmountPaid < 0 || effectiveAmountPaid > grandTotal) {
      setFormError('Amount paid must be between zero and the purchase total.');
      return;
    }

    setFormError(null);
    setIsSubmitting(true);

    try {
      const payload: CreatePurchaseInput = {
        purchaseDate,
        paymentMethod: effectiveAmountPaid > 0 ? paymentMethod : null,
        amountPaid: effectiveAmountPaid,
        supplierName: supplierName.trim() || undefined,
        note: note.trim() || undefined,
        items: items.map((it) => ({
          productVariantId: it.variantId,
          quantity: it.quantity,
          unitPurchasePrice: it.unitPurchasePrice,
          batchNumber: it.batchNumber.trim() || undefined,
          serialNumbers: it.serialNumbers?.trim() || undefined,
          newSellingPrice: it.newSellingPrice || undefined,
          newMinSellingPrice: it.newMinSellingPrice || undefined,
          newMaxSellingPrice: it.newMaxSellingPrice || undefined,
          updateCatalogPrices: it.updateCatalogPrices ?? true,
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
                Log product procurement, increment live inventory, and post the capital outflow.
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
          {/* Error Banner & Unrecognized Barcode Quick Action */}
          {formError && (
            <div
              id="create-purchase-error-alert"
              className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-semibold flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
            >
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{formError}</span>
              </div>
              {unrecognizedBarcode && role === 'admin' && onCreateProductWithBarcode && (
                <button
                  type="button"
                  onClick={() => {
                    const code = unrecognizedBarcode;
                    onClose();
                    onCreateProductWithBarcode(code);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-700 hover:bg-rose-800 text-white rounded-lg text-xs font-bold shrink-0 transition-colors shadow-2xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create New Product with Barcode "{unrecognizedBarcode}"</span>
                </button>
              )}
            </div>
          )}

          {/* Live Hardware Scan Success Toast Banner */}
          {scanSuccessMessage && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2 animate-in fade-in duration-150">
              <ScanBarcode className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{scanSuccessMessage}</span>
            </div>
          )}

          {/* Top Configuration Strip: Date, Payment Method, Recorded By */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
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

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-slate-500" />
                <span>Supplier / Distributor (Optional)</span>
              </label>
              <input
                id="purchase-input-supplier"
                type="text"
                value={supplierName}
                onChange={(event) => setSupplierName(event.target.value)}
                maxLength={200}
                placeholder="e.g. Trusted Medical Supplies"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <p className="mt-1 text-[10px] text-slate-500">
                Not required for batch or expiry tracking. Use only when you want to record who supplied this shipment.
              </p>
            </div>

            {/* Payment Method */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Amount Paid Now
              </label>
              <input
                id="purchase-input-amount-paid"
                type="number"
                min="0"
                max={grandTotal}
                step="0.01"
                value={amountPaid}
                onChange={(event) => setAmountPaid(event.target.value)}
                placeholder={grandTotal.toFixed(2)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <p className="mt-1 text-[10px] text-slate-500">Blank means fully paid.</p>
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
                disabled={effectiveAmountPaid === 0}
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
                readOnly
                className="w-full px-3 py-2 bg-slate-100 border border-slate-300 rounded-lg text-xs font-medium text-slate-700"
              />
            </div>
          </div>

          {/* Medicine Search & Variant Selector */}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Search & Add Products to Restock Order
              </label>
              {isScannerReady && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <ScanBarcode className="w-3.5 h-3.5" />
                  <span>Hardware Scanner Ready</span>
                </span>
              )}
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Search className="w-4 h-4" />
              </div>
              <input
                id="purchase-product-search"
                type="text"
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && productSearch.trim()) {
                    e.preventDefault();
                    e.stopPropagation();
                    const q = productSearch.trim();
                    const exactMatch = filteredVariants.find(
                      ({ product }) => product.barcode.toLowerCase() === q.toLowerCase()
                    );
                    if (exactMatch && filteredVariants.length === 1) {
                      scannerAudio.playSuccess();
                      handleAddVariant(exactMatch.product, exactMatch.variant, 1);
                    } else {
                      void handleHardwareBarcodeScan(q);
                    }
                  }
                }}
                placeholder="Scan barcode with USB/Wireless scanner or type product, model, brand..."
                autoComplete="off"
                aria-autocomplete="list"
                className="w-full pl-9.5 pr-12 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
              />
              <button
                type="button"
                onClick={() => {
                  setScannerInitialProduct(undefined);
                  setScannerOpen(true);
                }}
                title="Scan barcode with camera"
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-indigo-600 transition-colors"
              >
                <Camera className="w-4 h-4" />
              </button>
            </div>

            <button type="button" onClick={() => setPhotoOpen(true)} className="mt-2 text-sm font-semibold text-indigo-700 flex items-center gap-2">
              <Camera className="w-4 h-4" /> Find by photo
            </button>

            {/* Live Search Results Dropdown */}
            {productSearch.trim() && (
              <div
                id="purchase-search-results"
                className="bg-white border border-slate-200 rounded-xl shadow-lg max-h-56 overflow-y-auto p-1 divide-y divide-slate-100 animate-in fade-in duration-100"
              >
                {isLoadingProducts ? (
                  <div className="p-4 flex items-center justify-center gap-2 text-xs text-slate-500">
                    <RotateCw className="w-4 h-4 animate-spin text-indigo-600" />
                    <span>Searching the complete product catalogue...</span>
                  </div>
                ) : productSearchError ? (
                  <div className="p-3 text-center text-xs text-rose-600">
                    {productSearchError}
                  </div>
                ) : filteredVariants.length === 0 ? (
                  <div className="p-3 text-center text-xs text-slate-500">
                    No matching product, manufacturer, or barcode found.
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
                  No products added to this restock order yet.
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Use the search box above to add products with their respective manufacturers.
                </p>
              </div>
            ) : (
              <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
                {items.map((item, index) => {
                  const lineSubtotal = item.quantity * item.unitPurchasePrice;
                  const marginPct = item.newSellingPrice > item.unitPurchasePrice && item.newSellingPrice > 0
                    ? (((item.newSellingPrice - item.unitPurchasePrice) / item.newSellingPrice) * 100).toFixed(1)
                    : null;
                  const isSellingPriceInvalid = (item.updateCatalogPrices ?? true) && item.newSellingPrice > 0 && item.newSellingPrice <= item.unitPurchasePrice;

                  return (
                    <div
                      key={item.variantId}
                      id={`purchase-item-row-${index}`}
                      className="p-3.5 bg-white hover:bg-slate-50/50 transition-colors space-y-3"
                    >
                      {/* Top: Product details & remove button */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-xs sm:text-sm text-slate-900">
                              {item.productName}
                            </span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                              {item.companyName}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              Current Base Cost: {formatNaira(item.currentBasePrice)}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            {item.genericName} • {item.dosage} {item.form} • Current Live Stock:{' '}
                            <strong className="text-slate-700">{item.currentStock}</strong>
                          </div>
                        </div>

                        {/* Remove button */}
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(index)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors shrink-0"
                          title="Remove item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Middle: Simultaneous Cost and Selling Price Setting Grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50/70 p-3 rounded-xl border border-slate-200/80 items-start">
                        {/* Quantity */}
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-600 uppercase mb-1">
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
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900 text-center focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>

                        {/* Unit Purchase Cost (Base Price) */}
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-600 uppercase mb-1">
                            Unit Purchase Cost (Base Price ₦)
                          </label>
                          <input
                            type="number"
                            min="0.01"
                            step="0.01"
                            value={item.unitPurchasePrice}
                            onChange={(e) =>
                              handleUpdatePrice(index, parseFloat(e.target.value))
                            }
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900 text-right focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>

                        {/* Catalog Selling Price */}
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="block text-[10px] font-semibold text-slate-600 uppercase">
                              Catalog Selling Price (₦)
                            </label>
                            {marginPct && (
                              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200 flex items-center gap-0.5">
                                <TrendingUp className="w-2.5 h-2.5" />
                                {marginPct}%
                              </span>
                            )}
                          </div>
                          <input
                            type="number"
                            min="0.01"
                            step="0.01"
                            value={item.newSellingPrice}
                            onChange={(e) =>
                              handleUpdateSellingPrice(index, parseFloat(e.target.value))
                            }
                            className={`w-full px-2.5 py-1.5 bg-white border rounded-lg text-xs font-bold text-slate-900 text-right focus:outline-none focus:ring-2 ${
                              isSellingPriceInvalid
                                ? 'border-rose-400 focus:ring-rose-500 bg-rose-50/30'
                                : 'border-slate-300 focus:ring-indigo-500'
                            }`}
                          />
                        </div>

                        {/* Line Subtotal */}
                        <div className="text-right">
                          <label className="block text-[10px] font-semibold text-slate-600 uppercase mb-1">
                            Line Subtotal
                          </label>
                          <div className="text-sm font-black text-indigo-950 py-1">
                            {formatNaira(lineSubtotal)}
                          </div>
                        </div>
                      </div>

                      {/* Selling price error if invalid */}
                      {isSellingPriceInvalid && (
                        <div className="flex items-center gap-1.5 text-[11px] text-rose-600 font-medium bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          <span>Catalog selling price must be higher than the unit purchase cost ({formatNaira(item.unitPurchasePrice)})</span>
                        </div>
                      )}

                      {/* Bottom Options Strip: Batch/Serial, Price Range expander, Catalog sync checkbox */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 text-xs">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 flex-1 max-w-xl">
                          <input
                            type="text"
                            value={item.batchNumber}
                            onChange={(event) => handleUpdateBatch(index, 'batchNumber', event.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                e.stopPropagation();
                              }
                            }}
                            placeholder="Batch / lot number (optional)"
                            className="px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                          <div className="flex flex-col gap-1">
                            <div className="relative flex items-center">
                              <input
                                type="text"
                                data-serial-scanner-input="true"
                                value={serialScanBuffers[item.variantId] || ''}
                                onChange={(e) =>
                                  setSerialScanBuffers((prev) => ({
                                    ...prev,
                                    [item.variantId]: e.target.value,
                                  }))
                                }
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    const scanned = (serialScanBuffers[item.variantId] || '').trim();
                                    if (scanned) {
                                      handleAppendScannedSerial(index, scanned);
                                      setSerialScanBuffers((prev) => ({
                                        ...prev,
                                        [item.variantId]: '',
                                      }));
                                    }
                                  }
                                }}
                                placeholder="Scan carton Serial/MAC sticker here..."
                                className="w-full pl-2.5 pr-7 py-1.5 bg-indigo-50/40 border border-indigo-300 rounded-lg text-xs font-mono text-slate-900 placeholder:text-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                              />
                              <ScanBarcode className="w-3.5 h-3.5 text-indigo-500 absolute right-2.5 pointer-events-none" />
                            </div>
                            <input
                              type="text"
                              data-serial-scanner-input="true"
                              value={item.serialNumbers || ''}
                              onChange={(event) => handleUpdateBatch(index, 'serialNumbers', event.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  e.stopPropagation();
                                }
                              }}
                              placeholder="Serial / MAC list (comma-separated)"
                              className="px-2.5 py-1 bg-slate-50 border border-slate-300 rounded-lg text-[11px] font-mono text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0 flex-wrap">
                          <label className="inline-flex items-center gap-1.5 cursor-pointer text-[11px] text-slate-600 select-none">
                            <input
                              type="checkbox"
                              checked={item.updateCatalogPrices ?? true}
                              onChange={() => handleToggleCatalogUpdate(index)}
                              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5"
                            />
                            <span>Sync to Catalog</span>
                          </label>

                          <button
                            type="button"
                            onClick={() => handleTogglePriceRange(index)}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 transition-colors"
                          >
                            <Tag className="w-3 h-3" />
                            <span>Price Range</span>
                            {item.showPriceRange ? (
                              <ChevronUp className="w-3 h-3" />
                            ) : (
                              <ChevronDown className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Expandable Price Range (Min/Max thresholds) */}
                      {item.showPriceRange && (
                        <div className="grid grid-cols-2 gap-3 p-3 bg-indigo-50/50 rounded-xl border border-indigo-100 text-xs animate-in fade-in duration-150">
                          <div>
                            <label className="block text-[10px] font-semibold text-indigo-900 uppercase mb-1">
                              Minimum Allowed Selling Price (₦)
                            </label>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.newMinSellingPrice || ''}
                              onChange={(e) => handleUpdateMinPrice(index, parseFloat(e.target.value))}
                              placeholder="Auto-calculated (5% below selling)"
                              className="w-full px-2.5 py-1.5 bg-white border border-indigo-200 rounded-lg text-xs font-semibold text-slate-900 text-right focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                            <p className="text-[10px] text-indigo-600/80 mt-0.5">Floor for discounting</p>
                          </div>
                          <div>
                            <label className="block text-[10px] font-semibold text-indigo-900 uppercase mb-1">
                              Maximum Allowed Selling Price (₦)
                            </label>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.newMaxSellingPrice || ''}
                              onChange={(e) => handleUpdateMaxPrice(index, parseFloat(e.target.value))}
                              placeholder="Auto-calculated (15% above selling)"
                              className="w-full px-2.5 py-1.5 bg-white border border-indigo-200 rounded-lg text-xs font-semibold text-slate-900 text-right focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                            <p className="text-[10px] text-indigo-600/80 mt-0.5">Ceiling price limit</p>
                          </div>
                        </div>
                      )}
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
                Saving this order will immediately update live stock and create the matching accountability entry.
              </p>
            </div>

            <div className="text-right">
              <div className="text-xs text-indigo-300 font-medium uppercase tracking-wider">
                Paid Now · {paymentStatus}
              </div>
              <div className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                {formatNaira(effectiveAmountPaid)}
              </div>
              <div className="text-xs text-amber-300">Outstanding: {formatNaira(outstandingAmount)}</div>
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

      <PhotoSearchModal isOpen={photoOpen} mode="purchase" onClose={() => setPhotoOpen(false)}
        onAdd={handleAddVariant} />
      <BarcodeScannerModal
        isOpen={scannerOpen}
        mode="purchase"
        initialProduct={scannerInitialProduct}
        onClose={() => {
          setScannerOpen(false);
          setScannerInitialProduct(undefined);
        }}
        onAdd={handleAddVariant}
      />

    </div>
  );
};
