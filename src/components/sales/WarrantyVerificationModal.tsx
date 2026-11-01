import React, { useState } from 'react';
import { X, Search, ShieldCheck, ShieldAlert, RotateCw } from 'lucide-react';
import { WarrantyVerificationRecord } from '../../types';
import { warrantyService } from '../../services/warrantyService';

interface WarrantyVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WarrantyVerificationModal: React.FC<WarrantyVerificationModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<WarrantyVerificationRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) {
      setError('Please enter a serial number, MAC address, or invoice number.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setHasSearched(true);

    try {
      const response = await warrantyService.verifyWarranty(query.trim());
      if (response.success) {
        setResults(response.data || []);
      } else {
        setError('No warranty records found.');
        setResults([]);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to verify warranty. Please try again.');
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSearch();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150 max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600/20 text-emerald-400 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold">Warranty Verification</h2>
              <p className="text-xs text-slate-400">Search by serial number, MAC address, or invoice number</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 text-white/70 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-4 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Enter serial number, MAC address, or invoice number..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                autoFocus
                className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
              />
            </div>
            <button
              onClick={handleSearch}
              disabled={isLoading}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold transition-all disabled:opacity-50"
            >
              {isLoading ? <RotateCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              Verify
            </button>
          </div>
          {error && (
            <div className="mt-2 p-2 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 font-medium">
              {error}
            </div>
          )}
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {isLoading && (
            <div className="flex items-center justify-center py-12 text-slate-400">
              <RotateCw className="w-6 h-6 animate-spin mr-2" />
              <span className="text-sm font-medium">Searching warranty records...</span>
            </div>
          )}

          {!isLoading && hasSearched && results.length === 0 && (
            <div className="text-center py-12">
              <ShieldAlert className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-sm font-bold text-slate-500">No warranty records found</p>
              <p className="text-xs text-slate-400 mt-1">
                Try searching with a different serial number, MAC address, or invoice number.
              </p>
            </div>
          )}

          {!isLoading && results.map((record, index) => {
            const isValid = record.is_warranty_valid;
            const daysRemaining = record.days_remaining || 0;

            return (
              <div
                key={`${record.sale_item_id}-${index}`}
                className={`border rounded-xl p-4 space-y-3 ${
                  isValid
                    ? 'border-emerald-200 bg-emerald-50/50'
                    : 'border-rose-200 bg-rose-50/50'
                }`}
              >
                {/* Warranty Status Badge */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {isValid ? (
                      <ShieldCheck className="w-5 h-5 text-emerald-600" />
                    ) : (
                      <ShieldAlert className="w-5 h-5 text-rose-600" />
                    )}
                    <span className={`text-sm font-bold ${isValid ? 'text-emerald-700' : 'text-rose-700'}`}>
                      {isValid ? 'WARRANTY ACTIVE' : 'WARRANTY EXPIRED'}
                    </span>
                  </div>
                  {isValid && (
                    <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs font-bold">
                      {daysRemaining} days remaining
                    </span>
                  )}
                </div>

                {/* Product Info */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-500 font-medium block">Product</span>
                    <span className="font-bold text-slate-900">{record.product_name}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-medium block">Brand</span>
                    <span className="font-bold text-slate-900">{record.brand_name || '—'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-medium block">Model / Specs</span>
                    <span className="font-semibold text-slate-800">
                      {record.model_number || record.technical_specs || '—'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-medium block">Invoice</span>
                    <span className="font-mono font-bold text-slate-900">{record.invoice_number}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-medium block">Sale Date</span>
                    <span className="font-semibold text-slate-800">
                      {new Date(record.sale_date).toLocaleDateString('en-NG', {
                        day: 'numeric', month: 'short', year: 'numeric',
                      })}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-medium block">Warranty Period</span>
                    <span className="font-semibold text-slate-800">{record.warranty_months} months</span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-medium block">Warranty Expiry</span>
                    <span className={`font-bold ${isValid ? 'text-emerald-700' : 'text-rose-700'}`}>
                      {record.warranty_expiry_date
                        ? new Date(record.warranty_expiry_date).toLocaleDateString('en-NG', {
                            day: 'numeric', month: 'short', year: 'numeric',
                          })
                        : '—'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-medium block">Quantity</span>
                    <span className="font-semibold text-slate-800">
                      {record.quantity} {record.unit_of_measure || 'PCS'}
                    </span>
                  </div>
                </div>

                {/* Serial Numbers */}
                {record.serial_numbers && String(record.serial_numbers).trim() !== '' && (
                  <div className="border-t border-slate-200 pt-2">
                    <span className="text-[10px] text-slate-500 font-bold uppercase block mb-1">Serial Numbers</span>
                    <p className="text-xs font-mono text-slate-800 bg-white px-2 py-1.5 rounded border border-slate-200">
                      {String(record.serial_numbers)}
                    </p>
                  </div>
                )}

                {/* Customer Info */}
                {(record.customer_name || record.customer_phone) && (
                  <div className="border-t border-slate-200 pt-2 flex items-center gap-4 text-xs">
                    <div>
                      <span className="text-slate-500 font-medium">Customer: </span>
                      <span className="font-bold text-slate-900">{record.customer_name || 'Walk-in'}</span>
                    </div>
                    {record.customer_phone && (
                      <div>
                        <span className="text-slate-500 font-medium">Phone: </span>
                        <span className="font-semibold text-slate-800">{record.customer_phone}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-semibold transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
