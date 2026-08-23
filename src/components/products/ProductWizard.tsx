import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  UploadCloud, 
  Trash2, 
  Plus, 
  Check, 
  Building2, 
  Info, 
  ScanBarcode, 
  Pill, 
  X,
  Sparkles,
  AlertCircle
} from 'lucide-react';
import { Product, ProductCategory, Company, ProductCreateInput, ProductDosageForm } from '../../types';
import { formatNaira, formatNumber } from '../../utils/formatters';

interface ProductWizardProps {
  initialProduct?: Product | null;
  categories: ProductCategory[];
  companies: Company[];
  onSave: (productData: ProductCreateInput) => void;
  onCancel: () => void;
}

const DOSAGE_FORMS: ProductDosageForm[] = [
  'Tablet',
  'Capsule',
  'Syrup',
  'Suspension',
  'Injection',
  'Cream',
  'Ointment',
  'Drops',
  'Inhaler',
  'Gel',
  'Infusion',
  'Powder',
];

const SAMPLE_MED_IMAGES = [
  'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=600&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1471864190281-a93a3070b6de?w=600&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1550572017-ed200f5e6343?w=600&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1577401239170-897942555fb3?w=600&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1628771065518-0d82f1938462?w=600&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1585435557343-3b092031a831?w=600&auto=format&fit=crop&q=80',
];

export const ProductWizard: React.FC<ProductWizardProps> = ({
  initialProduct,
  categories,
  companies,
  onSave,
  onCancel,
}) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const isEditing = Boolean(initialProduct);

  // Step 1: Product Information State
  const [name, setName] = useState('');
  const [genericName, setGenericName] = useState('');
  const [category, setCategory] = useState('');
  const [dosage, setDosage] = useState('');
  const [form, setForm] = useState('Tablet');
  const [barcode, setBarcode] = useState('');
  const [description, setDescription] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [image, setImage] = useState('');
  const [status, setStatus] = useState<'Active' | 'Inactive'>('Active');

  // Step 2: Company Variants State
  const [variants, setVariants] = useState<Array<{
    companyName: string;
    basePrice: number;
    minSellingPrice: number;
    defaultSellingPrice: number;
    maxSellingPrice: number;
    sellingPrice: number;
    currentStock: number;
    reorderLevel: number;
    status: 'Available' | 'Inactive';
  }>>([
    {
      companyName: 'DANA',
      basePrice: 350,
      minSellingPrice: 400,
      defaultSellingPrice: 500,
      maxSellingPrice: 570,
      sellingPrice: 500,
      currentStock: 100,
      reorderLevel: 50,
      status: 'Available',
    },
  ]);

  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Initialize from initialProduct if editing
  useEffect(() => {
    if (initialProduct) {
      setName(initialProduct.name);
      setGenericName(initialProduct.genericName);
      setCategory(initialProduct.category);
      setDosage(initialProduct.dosage);
      setForm(initialProduct.form);
      setBarcode(initialProduct.barcode);
      setDescription(initialProduct.description || '');
      setSubtitle(initialProduct.subtitle || '');
      setImage(initialProduct.image || '');
      setStatus(initialProduct.status);

      if (initialProduct.variants && initialProduct.variants.length > 0) {
        setVariants(
          initialProduct.variants.map((v) => {
            const basePrice = Number(v.basePrice) || 0;
            const defaultSellingPrice = Number(v.defaultSellingPrice) || Number(v.sellingPrice) || 0;
            const minSellingPrice = Number(v.minSellingPrice) || (basePrice > 0 ? Math.max(basePrice + 10, Math.round((basePrice + (defaultSellingPrice - basePrice) * 0.4) / 10) * 10) : defaultSellingPrice);
            const maxSellingPrice = Number(v.maxSellingPrice) || Math.max(defaultSellingPrice, Math.round((defaultSellingPrice * 1.2) / 10) * 10);
            return {
              companyName: v.companyName,
              basePrice,
              minSellingPrice,
              defaultSellingPrice,
              maxSellingPrice,
              sellingPrice: defaultSellingPrice,
              currentStock: v.currentStock,
              reorderLevel: v.reorderLevel,
              status: v.status,
            };
          })
        );
      }
    } else {
      // Default initial values
      setCategory(categories[0]?.name || 'Analgesics');
      setBarcode(`${Math.floor(1000000000000 + Math.random() * 9000000000000)}`);
    }
  }, [initialProduct, categories]);

  const handleGenerateBarcode = () => {
    const generated = `${Math.floor(1000000000000 + Math.random() * 9000000000000)}`;
    setBarcode(generated);
  };

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setImage(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Variant operations
  const addVariantRow = () => {
    // Find next company name not in current variants (preferring Active companies)
    const usedCompanies = new Set(variants.map(v => v.companyName));
    const activeCompanies = companies.filter(c => c.status === 'Active');
    const availableCompany = activeCompanies.find(c => !usedCompanies.has(c.name))?.name 
      || activeCompanies[0]?.name 
      || 'EMZOR';

    setVariants([
      ...variants,
      {
        companyName: availableCompany,
        basePrice: 400,
        minSellingPrice: 480,
        defaultSellingPrice: 600,
        maxSellingPrice: 680,
        sellingPrice: 600,
        currentStock: 100,
        reorderLevel: 50,
        status: 'Available',
      },
    ]);
  };

  const removeVariantRow = (index: number) => {
    if (variants.length <= 1) {
      setValidationErrors(['A product must contain at least one company variant.']);
      return;
    }
    setVariants(variants.filter((_, i) => i !== index));
  };

  const updateVariantRow = (index: number, field: string, value: any) => {
    const updated = [...variants];
    const current = { ...updated[index], [field]: value };
    if (field === 'defaultSellingPrice') {
      current.sellingPrice = value;
    }
    updated[index] = current;
    setVariants(updated);
  };

  // Validation
  const validateStep1 = () => {
    const errors: string[] = [];
    if (!name.trim()) errors.push('Product Name is required.');
    if (!genericName.trim()) errors.push('Generic Name is required.');
    if (!category.trim()) errors.push('Category is required.');
    if (!dosage.trim()) errors.push('Dosage is required.');
    if (!form.trim()) errors.push('Dosage Form is required.');

    setValidationErrors(errors);
    return errors.length === 0;
  };

  const validateStep2 = () => {
    const errors: string[] = [];
    if (variants.length === 0) {
      errors.push('At least one Company Variant is required.');
    }

    const companySet = new Set<string>();

    variants.forEach((v, i) => {
      const cleanCompany = v.companyName.trim();
      const variantLabel = `Variant #${i + 1} (${v.companyName || 'Unnamed'})`;

      if (!cleanCompany) {
        errors.push(`Variant #${i + 1} requires a company name.`);
      } else if (companySet.has(cleanCompany.toLowerCase())) {
        errors.push(`Duplicate variant detected: "${cleanCompany}" is added multiple times.`);
      } else {
        companySet.add(cleanCompany.toLowerCase());
      }

      if (v.basePrice < 0) {
        errors.push(`${variantLabel} Base Price cannot be negative.`);
      }
      if (v.minSellingPrice <= v.basePrice && v.basePrice > 0) {
        errors.push(`${variantLabel} Minimum Selling Price (₦${v.minSellingPrice}) must be greater than Base Price (₦${v.basePrice}).`);
      }
      if (v.defaultSellingPrice < v.minSellingPrice) {
        errors.push(`${variantLabel} Default Selling Price (₦${v.defaultSellingPrice}) cannot be less than Minimum Selling Price (₦${v.minSellingPrice}).`);
      }
      if (v.maxSellingPrice < v.defaultSellingPrice) {
        errors.push(`${variantLabel} Maximum Selling Price (₦${v.maxSellingPrice}) cannot be less than Default Selling Price (₦${v.defaultSellingPrice}).`);
      }
      if (v.currentStock < 0) {
        errors.push(`${variantLabel} Current Stock cannot be negative.`);
      }
      if (v.reorderLevel < 0) {
        errors.push(`${variantLabel} Reorder Level cannot be negative.`);
      }
    });

    setValidationErrors(errors);
    return errors.length === 0;
  };

  const handleNext = () => {
    if (step === 1) {
      if (validateStep1()) {
        setStep(2);
      }
    } else if (step === 2) {
      if (validateStep2()) {
        setStep(3);
      }
    }
  };

  const handleFinalSave = () => {
    if (!validateStep1() || !validateStep2()) return;

    onSave({
      name: name.trim(),
      genericName: genericName.trim(),
      category: category.trim(),
      dosage: dosage.trim(),
      form: form.trim(),
      barcode: barcode.trim() || `${Math.floor(1000000000000 + Math.random() * 9000000000000)}`,
      description: description.trim(),
      subtitle: subtitle.trim() || `${genericName} (${dosage})`,
      image: image || SAMPLE_MED_IMAGES[0],
      status,
      variants,
    });
  };

  const totalStock = variants.reduce((sum, v) => sum + (Number(v.currentStock) || 0), 0);
  const totalCostValue = variants.reduce((sum, v) => sum + ((Number(v.currentStock) || 0) * (Number(v.basePrice) || 0)), 0);
  const totalSellingValue = variants.reduce((sum, v) => sum + ((Number(v.currentStock) || 0) * (Number(v.sellingPrice) || 0)), 0);

  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
      {/* Top Header */}
      <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            id="wizard-cancel-back-btn"
            onClick={onCancel}
            className="p-1.5 rounded-md text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900">
              {isEditing ? `Edit Product: ${initialProduct?.name}` : 'Add New Product'}
            </h2>
            <p className="text-xs text-slate-500">
              {step === 1 && 'Step 1: General product attributes and image'}
              {step === 2 && 'Step 2: Add manufacturer company variants & pricing'}
              {step === 3 && 'Step 3: Review summary and finalize'}
            </p>
          </div>
        </div>

        <button
          onClick={onCancel}
          className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* 3-Step Indicator matching Geometric Balance */}
      <div className="bg-slate-50 border-b border-slate-200 px-6 py-3 flex items-center justify-center gap-4 sm:gap-8 text-xs font-bold">
        {/* Step 1 */}
        <button
          onClick={() => setStep(1)}
          className={`flex items-center gap-2 transition-colors ${
            step === 1 ? 'text-blue-600' : step > 1 ? 'text-slate-700' : 'text-slate-400'
          }`}
        >
          <div
            className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold ${
              step === 1
                ? 'bg-blue-600 text-white'
                : step > 1
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-200 text-slate-600'
            }`}
          >
            {step > 1 ? <Check className="w-3 h-3" /> : '1'}
          </div>
          <span className="hidden sm:inline">Product Information</span>
        </button>

        <div className="w-8 sm:w-12 h-0.5 bg-slate-200"></div>

        {/* Step 2 */}
        <button
          onClick={() => {
            if (validateStep1()) setStep(2);
          }}
          className={`flex items-center gap-2 transition-colors ${
            step === 2 ? 'text-blue-600' : step > 2 ? 'text-slate-700' : 'text-slate-400'
          }`}
        >
          <div
            className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold ${
              step === 2
                ? 'bg-blue-600 text-white'
                : step > 2
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-200 text-slate-600'
            }`}
          >
            {step > 2 ? <Check className="w-3 h-3" /> : '2'}
          </div>
          <span className="hidden sm:inline">Company Variants</span>
        </button>

        <div className="w-8 sm:w-12 h-0.5 bg-slate-200"></div>

        {/* Step 3 */}
        <button
          onClick={() => {
            if (validateStep1() && validateStep2()) setStep(3);
          }}
          className={`flex items-center gap-2 transition-colors ${
            step === 3 ? 'text-blue-600' : 'text-slate-400'
          }`}
        >
          <div
            className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold ${
              step === 3 ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'
            }`}
          >
            3
          </div>
          <span className="hidden sm:inline">Review & Save</span>
        </button>
      </div>

      {/* Validation Errors Notice */}
      {validationErrors.length > 0 && (
        <div className="mx-6 mt-4 p-3 rounded-md bg-rose-50 border border-rose-200 text-rose-700 text-xs space-y-1">
          <div className="font-bold flex items-center gap-1.5">
            <AlertCircle className="w-4 h-4 text-rose-600" />
            <span>Please correct the following:</span>
          </div>
          <ul className="list-disc list-inside pl-1 text-[11px]">
            {validationErrors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Wizard Step Content */}
      <div className="p-5 sm:p-6 max-h-[70vh] overflow-y-auto">
        {/* STEP 1: Product Information */}
        {step === 1 && (
          <div className="space-y-5 max-w-2xl mx-auto">
            {/* Image Upload Box */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Product Image
              </label>
              <div className="border border-dashed border-slate-300 hover:border-blue-400 rounded-lg p-5 text-center bg-slate-50/60 transition-colors relative">
                {image ? (
                  <div className="flex flex-col items-center">
                    <img
                      src={image}
                      alt="Product preview"
                      className="w-24 h-24 object-cover rounded-md border border-slate-200 shadow-xs mb-3"
                    />
                    <div className="flex items-center gap-2">
                      <label className="cursor-pointer px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-md text-xs font-semibold shadow-xs">
                        Replace File
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          className="hidden"
                          onChange={handleImageFileChange}
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => setImage('')}
                        className="px-3 py-1.5 bg-rose-50 text-rose-600 rounded-md text-xs font-semibold hover:bg-rose-100"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <label className="cursor-pointer flex flex-col items-center justify-center space-y-1.5">
                    <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                      <UploadCloud className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-blue-600 hover:underline">
                        Click to upload image
                      </span>
                      <p className="text-[11px] text-slate-400 mt-0.5">PNG, JPG, WEBP (Max 2MB)</p>
                    </div>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="hidden"
                      onChange={handleImageFileChange}
                    />
                  </label>
                )}

                {/* Sample Images Quick Picker */}
                <div className="mt-3 pt-3 border-t border-slate-200 flex items-center justify-center gap-2">
                  <span className="text-[11px] text-slate-400 font-medium">Or choose sample:</span>
                  <div className="flex gap-1.5">
                    {SAMPLE_MED_IMAGES.map((imgUrl, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setImage(imgUrl)}
                        className={`w-7 h-7 rounded overflow-hidden border-2 transition-all ${
                          image === imgUrl ? 'border-blue-600 scale-105' : 'border-slate-200 opacity-70 hover:opacity-100'
                        }`}
                      >
                        <img src={imgUrl} alt="sample" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Name and Generic Name */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Product Name <span className="text-rose-500">*</span>
                </label>
                <input
                  id="wizard-product-name-input"
                  type="text"
                  required
                  placeholder="e.g. Paracetamol 500mg"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-sm font-medium focus:ring-1 focus:ring-blue-500 focus:bg-white transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Generic Name <span className="text-rose-500">*</span>
                </label>
                <input
                  id="wizard-generic-name-input"
                  type="text"
                  required
                  placeholder="e.g. Paracetamol"
                  value={genericName}
                  onChange={(e) => setGenericName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-sm font-medium focus:ring-1 focus:ring-blue-500 focus:bg-white transition-all"
                />
              </div>
            </div>

            {/* Category, Dosage, Form */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Category <span className="text-rose-500">*</span>
                </label>
                <select
                  id="wizard-category-select"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-sm font-medium focus:ring-1 focus:ring-blue-500"
                >
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.name}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Dosage <span className="text-rose-500">*</span>
                </label>
                <input
                  id="wizard-dosage-input"
                  type="text"
                  required
                  placeholder="e.g. 500mg, 10ml, 1%"
                  value={dosage}
                  onChange={(e) => setDosage(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-sm font-medium focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Form <span className="text-rose-500">*</span>
                </label>
                <select
                  id="wizard-form-select"
                  value={form}
                  onChange={(e) => setForm(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-sm font-medium focus:ring-1 focus:ring-blue-500"
                >
                  {DOSAGE_FORMS.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Barcode & Subtitle */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700">Barcode</label>
                  <button
                    type="button"
                    onClick={handleGenerateBarcode}
                    className="text-[11px] font-bold text-blue-600 hover:underline flex items-center gap-1"
                  >
                    <ScanBarcode className="w-3.5 h-3.5" />
                    <span>Generate</span>
                  </button>
                </div>
                <input
                  id="wizard-barcode-input"
                  type="text"
                  placeholder="e.g. 8901234567890"
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-sm font-mono focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Subtitle / Indication
                </label>
                <input
                  type="text"
                  placeholder="e.g. Pain reliever / Fever reducer"
                  value={subtitle}
                  onChange={(e) => setSubtitle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-sm font-medium focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Description</label>
              <textarea
                rows={3}
                placeholder="Enter product description, uses, and instructions..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-sm focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {/* Status Toggle */}
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-md border border-slate-200">
              <div>
                <span className="text-xs font-bold text-slate-900 block">Product Status</span>
                <span className="text-[11px] text-slate-500">
                  {status === 'Active' ? 'Active in system and inventory' : 'Inactive (Hidden in POS)'}
                </span>
              </div>
              <button
                type="button"
                id="wizard-status-toggle-btn"
                onClick={() => setStatus(status === 'Active' ? 'Inactive' : 'Active')}
                className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                  status === 'Active' ? 'bg-emerald-600 justify-end' : 'bg-slate-300 justify-start'
                }`}
              >
                <div className="w-4 h-4 rounded-full bg-white shadow-xs"></div>
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: Company Variants */}
        {step === 2 && (
          <div className="space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Company Variants & Price Ranges</h3>
                <p className="text-xs text-slate-500">
                  Configure manufacturers, wholesale cost (Base Price), and controlled selling price ranges (Min, Default, Max)
                </p>
              </div>

              <button
                type="button"
                id="wizard-add-variant-row-btn"
                onClick={addVariantRow}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-md text-xs font-bold transition-colors w-fit"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Company Variant</span>
              </button>
            </div>

            {/* Variants Table */}
            <div className="border border-slate-200 rounded-lg overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      <th className="py-2.5 px-3 font-semibold min-w-[140px]">Company *</th>
                      <th className="py-2.5 px-3 font-semibold min-w-[105px]">Base Price (₦) *</th>
                      <th className="py-2.5 px-3 font-semibold min-w-[105px]">Min Selling (₦) *</th>
                      <th className="py-2.5 px-3 font-semibold min-w-[110px]">Default Price (₦) *</th>
                      <th className="py-2.5 px-3 font-semibold min-w-[105px]">Max Selling (₦) *</th>
                      <th className="py-2.5 px-3 font-semibold min-w-[85px]">Stock *</th>
                      <th className="py-2.5 px-3 font-semibold min-w-[85px]">Reorder *</th>
                      <th className="py-2.5 px-3 font-semibold text-center min-w-[65px]">Status</th>
                      <th className="py-2.5 px-3 font-semibold text-center w-10">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
                    {variants.map((v, index) => (
                      <tr key={index} className="hover:bg-slate-50">
                        {/* Company select */}
                        <td className="py-2 px-3">
                          <select
                            value={v.companyName}
                            onChange={(e) => updateVariantRow(index, 'companyName', e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-xs font-bold text-slate-900 focus:ring-1 focus:ring-blue-500"
                          >
                            {companies.map((c) => (
                              <option key={c.id} value={c.name}>
                                {c.name}
                              </option>
                            ))}
                          </select>
                        </td>

                        {/* Base Price */}
                        <td className="py-2 px-3">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={v.basePrice}
                            onChange={(e) => updateVariantRow(index, 'basePrice', parseFloat(e.target.value) || 0)}
                            className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-xs font-mono font-medium focus:ring-1 focus:ring-blue-500"
                          />
                        </td>

                        {/* Min Selling Price */}
                        <td className="py-2 px-3">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={v.minSellingPrice}
                            onChange={(e) => updateVariantRow(index, 'minSellingPrice', parseFloat(e.target.value) || 0)}
                            className="w-full px-2 py-1.5 bg-slate-50 border border-amber-200 rounded-md text-xs font-mono font-semibold text-amber-900 focus:ring-1 focus:ring-amber-500"
                          />
                        </td>

                        {/* Default Selling Price */}
                        <td className="py-2 px-3">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={v.defaultSellingPrice}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value) || 0;
                              updateVariantRow(index, 'defaultSellingPrice', val);
                            }}
                            className="w-full px-2 py-1.5 bg-slate-50 border border-blue-200 rounded-md text-xs font-mono font-bold text-blue-900 focus:ring-1 focus:ring-blue-500"
                          />
                        </td>

                        {/* Max Selling Price */}
                        <td className="py-2 px-3">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={v.maxSellingPrice}
                            onChange={(e) => updateVariantRow(index, 'maxSellingPrice', parseFloat(e.target.value) || 0)}
                            className="w-full px-2 py-1.5 bg-slate-50 border border-emerald-200 rounded-md text-xs font-mono font-semibold text-emerald-900 focus:ring-1 focus:ring-emerald-500"
                          />
                        </td>

                        {/* Current Stock */}
                        <td className="py-2 px-3">
                          <input
                            type="number"
                            min="0"
                            value={v.currentStock}
                            onChange={(e) => updateVariantRow(index, 'currentStock', parseInt(e.target.value) || 0)}
                            className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-xs font-mono font-medium focus:ring-1 focus:ring-blue-500"
                          />
                        </td>

                        {/* Reorder Level */}
                        <td className="py-2 px-3">
                          <input
                            type="number"
                            min="0"
                            value={v.reorderLevel}
                            onChange={(e) => updateVariantRow(index, 'reorderLevel', parseInt(e.target.value) || 0)}
                            className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-xs font-mono font-medium focus:ring-1 focus:ring-blue-500"
                          />
                        </td>

                        {/* Status Switch */}
                        <td className="py-2 px-3 text-center">
                          <button
                            type="button"
                            onClick={() =>
                              updateVariantRow(
                                index,
                                'status',
                                v.status === 'Available' ? 'Inactive' : 'Available'
                              )
                            }
                            className={`w-8 h-4.5 inline-flex items-center rounded-full p-0.5 transition-colors ${
                              v.status === 'Available' ? 'bg-emerald-600 justify-end' : 'bg-slate-300 justify-start'
                            }`}
                          >
                            <div className="w-3.5 h-3.5 rounded-full bg-white shadow-xs"></div>
                          </button>
                        </td>

                        {/* Delete row */}
                        <td className="py-2 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => removeVariantRow(index)}
                            disabled={variants.length <= 1}
                            className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: Review & Save */}
        {step === 3 && (
          <div className="space-y-5 max-w-2xl mx-auto">
            <div className="bg-slate-50 p-5 rounded-lg border border-slate-200 space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-md bg-white border border-slate-200 overflow-hidden flex-shrink-0">
                  {image ? (
                    <img src={image} alt={name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-400">
                      <Pill className="w-6 h-6" />
                    </div>
                  )}
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">{name}</h3>
                  <p className="text-xs text-slate-500">{genericName} • {category} • {dosage} ({form})</p>
                  <span className="inline-block mt-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[11px] font-bold rounded border border-emerald-200">
                    Status: {status}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 pt-3 border-t border-slate-200 text-center">
                <div className="bg-white p-3 rounded-md border border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Stock</span>
                  <span className="text-sm font-bold font-mono text-slate-900">{formatNumber(totalStock)} Units</span>
                </div>
                <div className="bg-white p-3 rounded-md border border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Inventory Cost (Base)</span>
                  <span className="text-sm font-bold font-mono text-slate-900">{formatNaira(totalCostValue)}</span>
                </div>
                <div className="bg-white p-3 rounded-md border border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Retail Value (Default)</span>
                  <span className="text-sm font-bold font-mono text-emerald-700">{formatNaira(totalSellingValue)}</span>
                </div>
              </div>
            </div>

            {/* List of configured variants */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                Configured Variants & Price Ranges ({variants.length})
              </h4>
              <div className="space-y-2">
                {variants.map((v, i) => (
                  <div key={i} className="p-3 bg-white border border-slate-200 rounded-md flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-blue-600" />
                      <span className="font-bold text-slate-900">{v.companyName}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 font-mono text-[11px]">
                      <span>Base: <strong>{formatNaira(v.basePrice)}</strong></span>
                      <span className="text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                        Range: <strong>{formatNaira(v.minSellingPrice)} - {formatNaira(v.maxSellingPrice)}</strong>
                      </span>
                      <span>Default: <strong className="text-blue-600">{formatNaira(v.defaultSellingPrice)}</strong></span>
                      <span>Stock: <strong>{v.currentStock}</strong></span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Wizard Footer Controls */}
      <div className="p-4 sm:p-5 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
        {step > 1 ? (
          <button
            type="button"
            onClick={() => setStep((step - 1) as any)}
            className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-md text-xs sm:text-sm font-semibold transition-colors"
          >
            Back
          </button>
        ) : (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-md text-xs sm:text-sm font-semibold transition-colors"
          >
            Cancel
          </button>
        )}

        {step < 3 ? (
          <button
            type="button"
            id="wizard-next-step-btn"
            onClick={handleNext}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-md text-xs sm:text-sm font-semibold shadow-xs transition-colors"
          >
            Next Step
          </button>
        ) : (
          <button
            type="button"
            id="wizard-save-product-btn"
            onClick={handleFinalSave}
            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-md text-xs sm:text-sm font-bold shadow-xs transition-colors flex items-center gap-2"
          >
            <Check className="w-4 h-4" />
            <span>{isEditing ? 'Update Product' : 'Save Product'}</span>
          </button>
        )}
      </div>
    </div>
  );
};
