import React, { useEffect, useState } from 'react';
import { ReportFilterParams } from '../../types';
import { api } from '../../services/apiClient';
import { formatNaira } from '../../utils/formatters';

interface VatReport {
  vat_billed: string;
  vat_collected: string;
  vat_awaiting_payment: string;
  daily: Array<{ date: string; vat_billed: string; vat_collected: string }>;
}

export function VatReportView({ filters, revision }: { filters: ReportFilterParams; revision: number }) {
  const [data, setData] = useState<VatReport | null>(null);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let current = true;
    setData(null); setError('');
    api.get<{ success: boolean; data: VatReport }>('/reports/vat/', { date_range: filters.dateRange,
      start_date: filters.startDate, end_date: filters.endDate }).then(response => {
      if (!response.success || !response.data) throw new Error('Invalid VAT report response');
      if (current) setData(response.data);
    }).catch(() => { if (current) setError('Unable to load VAT report.'); });
    return () => { current = false; };
  }, [filters.dateRange, filters.startDate, filters.endDate, revision, retry]);

  if (error) return <div role="alert">{error} <button type="button" onClick={() => setRetry(value => value + 1)} className="underline">Retry</button></div>;
  if (!data) return <p role="status">Loading VAT report…</p>;
  return <section className="space-y-4">
    <h2 className="text-lg font-semibold">VAT billed and collected</h2>
    <p className="text-sm text-slate-600">All products. Billed and collected figures use the selected dates. Collections are proportional to payments; returns, cancellations and reversed payments appear as adjustments on their event dates.</p>
    <div className="grid gap-3 sm:grid-cols-3">
      {[
        ['Net VAT billed in period', data.vat_billed],
        ['Net VAT collected in period', data.vat_collected],
        ['VAT awaiting payment — all dates', data.vat_awaiting_payment],
      ].map(([label, value]) => <div key={label} className="bg-white border rounded-xl p-4">
        <p className="text-xs text-slate-500">{label}</p><p className="text-xl font-bold">{formatNaira(Number(value), true)}</p>
      </div>)}
    </div>
    <div className="overflow-x-auto border rounded-lg">
      <table className="w-full text-sm text-left"><thead><tr className="bg-slate-50">
        <th className="p-3">Date</th><th className="p-3 text-right">VAT billed / adjusted</th><th className="p-3 text-right">VAT collected / adjusted</th>
      </tr></thead><tbody>{data.daily.map(day => <tr key={day.date} className="border-t">
        <td className="p-3">{day.date}</td><td className="p-3 text-right">{formatNaira(Number(day.vat_billed), true)}</td>
        <td className="p-3 text-right">{formatNaira(Number(day.vat_collected), true)}</td>
      </tr>)}</tbody></table>
      {!data.daily.length && <p className="p-4 text-slate-500">No VAT activity in this period.</p>}
    </div>
  </section>;
}
