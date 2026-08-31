import React, { useState } from 'react';
import { X, WalletCards } from 'lucide-react';
import { BusinessFundMovementType, CreateBusinessFundMovementInput } from '../../types';

interface Props {
  isOpen: boolean;
  openingBalanceRecorded: boolean;
  availableFunds: number;
  onClose: () => void;
  onSubmit: (input: CreateBusinessFundMovementInput) => Promise<{ success: boolean; error?: string }>;
}

export const BusinessFundsModal: React.FC<Props> = ({ isOpen, openingBalanceRecorded, availableFunds, onClose, onSubmit }) => {
  const [movementType, setMovementType] = useState<BusinessFundMovementType>(openingBalanceRecorded ? 'OWNER_CAPITAL' : 'OPENING_BALANCE');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  if (!isOpen) return null;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) return setError('Enter an amount greater than zero.');
    if (movementType === 'OWNER_WITHDRAWAL' && value > availableFunds) return setError('Withdrawal cannot exceed current business funds.');
    setSubmitting(true); setError('');
    try {
      const result = await onSubmit({ movementType, amount: value, note });
      if (result.success) onClose(); else setError(result.error || 'Could not update business funds.');
    } finally { setSubmitting(false); }
  };

  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
    <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
      <div className="flex items-center justify-between border-b border-slate-200 p-5">
        <div className="flex items-center gap-3"><WalletCards className="h-5 w-5 text-emerald-700" /><div><h2 className="font-bold text-slate-900">Manage Business Funds</h2><p className="text-xs text-slate-500">Combined shop account • Available: ₦{availableFunds.toLocaleString()}</p></div></div>
        <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X className="h-5 w-5" /></button>
      </div>
      <form onSubmit={submit} className="space-y-4 p-5">
        <label className="block text-sm font-semibold text-slate-700">Movement type
          <select value={movementType} onChange={e => setMovementType(e.target.value as BusinessFundMovementType)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900">
            {!openingBalanceRecorded && <option value="OPENING_BALANCE">Opening business balance</option>}
            <option value="OWNER_CAPITAL">Owner adds capital</option>
            <option value="OWNER_WITHDRAWAL">Owner withdraws money</option>
          </select>
        </label>
        <label className="block text-sm font-semibold text-slate-700">Amount (₦)<input type="number" min="0.01" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900" /></label>
        <label className="block text-sm font-semibold text-slate-700">Note <span className="font-normal text-slate-400">(optional)</span><textarea value={note} onChange={e => setNote(e.target.value)} maxLength={500} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900" rows={3} /></label>
        {error && <p className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
        <div className="flex justify-end gap-3"><button type="button" onClick={onClose} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700">Cancel</button><button disabled={submitting} className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{submitting ? 'Saving…' : 'Record movement'}</button></div>
      </form>
    </div>
  </div>;
};
