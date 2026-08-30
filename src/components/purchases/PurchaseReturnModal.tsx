import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Loader2, RotateCcw, X } from 'lucide-react';
import { StockPurchase } from '../../types';
import { purchaseService } from '../../services/purchaseService';
import { formatNaira } from '../../utils/formatters';

interface Props {
  purchase: StockPurchase | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const PurchaseReturnModal: React.FC<Props> = ({ purchase, isOpen, onClose, onSuccess }) => {
  const [detail, setDetail] = useState<StockPurchase | null>(null);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [refundMethod, setRefundMethod] = useState<'CASH' | 'TRANSFER' | 'POS'>('CASH');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen || !purchase) return;
    setLoading(true);
    setError('');
    setQuantities({});
    setReason('');
    purchaseService.getPurchaseById(purchase.id, 'admin')
      .then((response) => setDetail(response.data || null))
      .catch((err) => setError(err instanceof Error ? err.message : 'Unable to load purchase items.'))
      .finally(() => setLoading(false));
  }, [isOpen, purchase]);

  const selected = useMemo(() => (detail?.items || [])
    .map((item) => ({ purchaseItemId: item.id, quantity: quantities[item.id] || 0 }))
    .filter((item) => item.quantity > 0), [detail, quantities]);

  if (!isOpen || !purchase) return null;

  const submit = async () => {
    if (!selected.length) return setError('Select at least one quantity to return.');
    if (!reason.trim()) return setError('Enter the reason for this return.');
    setSubmitting(true);
    setError('');
    try {
      await purchaseService.returnPurchase(purchase.id, { items: selected, refundMethod, reason });
      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to record the purchase return.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] bg-slate-900/60 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between bg-slate-900 px-5 py-4 text-white">
          <div><h2 className="font-bold">Return purchased stock</h2><p className="text-xs text-slate-300">{purchase.purchaseNumber}</p></div>
          <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-white/10"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          {error && <div className="flex gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700"><AlertCircle className="w-4 h-4 shrink-0" />{error}</div>}
          {loading ? <div className="py-10 flex justify-center"><Loader2 className="w-6 h-6 animate-spin" /></div> : (
            <div className="space-y-2">
              {(detail?.items || []).map((item) => (
                <div key={item.id} className="grid grid-cols-[1fr_auto] items-center gap-4 rounded-xl border border-slate-200 p-3">
                  <div><div className="text-sm font-semibold text-slate-900">{item.productName}</div><div className="text-xs text-slate-500">{item.companyName} · Batch {item.batchNumber || 'not specified'} · Bought {item.quantity} · {formatNaira(item.unitPurchasePrice)}</div></div>
                  <input type="number" min={0} max={item.quantity} value={quantities[item.id] || 0}
                    onChange={(e) => setQuantities((old) => ({ ...old, [item.id]: Math.max(0, Math.min(item.quantity, Number(e.target.value) || 0)) }))}
                    className="w-20 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900" />
                </div>
              ))}
            </div>
          )}
          <div className="grid sm:grid-cols-2 gap-3">
            <select value={refundMethod} onChange={(e) => setRefundMethod(e.target.value as typeof refundMethod)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900">
              <option value="CASH">Cash received</option><option value="TRANSFER">Bank transfer received</option><option value="POS">POS reversal</option>
            </select>
            <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Required return reason" maxLength={500} className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900" />
          </div>
          <p className="text-xs text-amber-700">Only units still available in the original batch can be returned. Already sold units are protected.</p>
        </div>
        <div className="flex justify-end gap-3 border-t bg-slate-50 px-5 py-4">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-semibold">Close</button>
          <button type="button" onClick={submit} disabled={loading || submitting} className="inline-flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />} Record return
          </button>
        </div>
      </div>
    </div>
  );
};
